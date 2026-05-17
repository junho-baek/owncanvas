package generation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"
)

type providerFunc func(context.Context, GenerationJob) (GenerationResult, error)

func (f providerFunc) Generate(ctx context.Context, job GenerationJob) (GenerationResult, error) {
	return f(ctx, job)
}

func validGenerationBatch(fanOutCount int, jobs []GenerationJob) GenerationBatch {
	return GenerationBatch{
		BatchID:      "batch_valid",
		CampaignID:   "campaign_valid",
		SourceNodeID: "source_image",
		FanOutCount:  fanOutCount,
		Jobs:         jobs,
	}
}

func validGenerationJob(jobID string, nodeID string) GenerationJob {
	return GenerationJob{
		JobID:       jobID,
		NodeID:      nodeID,
		Prompt:      "coral product shot",
		Provider:    "mock",
		Model:       "mock-image",
		AspectRatio: "1:1",
		Parameters:  map[string]interface{}{},
	}
}

func validGenerationJobs(count int) []GenerationJob {
	jobs := make([]GenerationJob, 0, count)
	for index := 1; index <= count; index++ {
		jobs = append(jobs, validGenerationJob(
			fmt.Sprintf("job_%02d", index),
			fmt.Sprintf("node_%02d", index),
		))
	}
	return jobs
}

func TestExecuteBatchRunsConcurrentlyAndPreservesInputOrder(t *testing.T) {
	var mu sync.Mutex
	inFlight := 0
	maxInFlight := 0
	delays := map[string]time.Duration{
		"job_1": 40 * time.Millisecond,
		"job_2": 20 * time.Millisecond,
		"job_3": 5 * time.Millisecond,
	}

	provider := providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		mu.Lock()
		inFlight++
		if inFlight > maxInFlight {
			maxInFlight = inFlight
		}
		mu.Unlock()

		select {
		case <-ctx.Done():
			return GenerationResult{}, ctx.Err()
		case <-time.After(delays[job.JobID]):
		}

		mu.Lock()
		inFlight--
		mu.Unlock()

		return GenerationResult{
			Status:            JobStatusSucceeded,
			ProviderRequestID: fmt.Sprintf("request_%s", job.JobID),
			ProviderURL:       fmt.Sprintf("https://provider.example.test/%s.png", job.JobID),
			MimeType:          "image/png",
			Width:             1024,
			Height:            1024,
			GeneratedAt:       "2026-05-17T00:00:00Z",
		}, nil
	})

	service := NewService(provider, ServiceOptions{MaxConcurrency: 3})
	response, err := service.ExecuteBatch(context.Background(), validGenerationBatch(3, []GenerationJob{
		validGenerationJob("job_1", "node_1"),
		validGenerationJob("job_2", "node_2"),
		validGenerationJob("job_3", "node_3"),
	}))
	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}

	if maxInFlight < 2 {
		t.Fatalf("expected concurrent execution, max in-flight jobs = %d", maxInFlight)
	}

	wantJobIDs := []string{"job_1", "job_2", "job_3"}
	for index, wantJobID := range wantJobIDs {
		result := response.Results[index]
		if result.JobID != wantJobID {
			t.Fatalf("result %d job ID = %q, want %q", index, result.JobID, wantJobID)
		}
		if result.NodeID != fmt.Sprintf("node_%d", index+1) {
			t.Fatalf("result %d node ID = %q", index, result.NodeID)
		}
		if result.Status != JobStatusSucceeded {
			t.Fatalf("result %d status = %q, want %q", index, result.Status, JobStatusSucceeded)
		}
	}
}

func TestExecuteBatchIsolatesPartialProviderFailures(t *testing.T) {
	provider := providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		if job.NodeID == "node_2" {
			return GenerationResult{}, errors.New("provider could not generate node_2")
		}

		return GenerationResult{
			JobID:       job.JobID,
			NodeID:      job.NodeID,
			Status:      JobStatusSucceeded,
			GeneratedAt: "2026-05-17T00:00:00Z",
		}, nil
	})

	service := NewService(provider, ServiceOptions{MaxConcurrency: 3})
	response, err := service.ExecuteBatch(context.Background(), validGenerationBatch(3, []GenerationJob{
		validGenerationJob("job_1", "node_1"),
		validGenerationJob("job_2", "node_2"),
		validGenerationJob("job_3", "node_3"),
	}))
	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}

	if response.Results[0].Status != JobStatusSucceeded {
		t.Fatalf("node_1 status = %q, want %q", response.Results[0].Status, JobStatusSucceeded)
	}
	if response.Results[2].Status != JobStatusSucceeded {
		t.Fatalf("node_3 status = %q, want %q", response.Results[2].Status, JobStatusSucceeded)
	}

	failed := response.Results[1]
	if failed.JobID != "job_2" || failed.NodeID != "node_2" {
		t.Fatalf("failed result IDs = %q/%q, want job_2/node_2", failed.JobID, failed.NodeID)
	}
	if failed.Status != JobStatusFailed {
		t.Fatalf("node_2 status = %q, want %q", failed.Status, JobStatusFailed)
	}
	if failed.Error == nil {
		t.Fatal("node_2 error is nil")
	}
	if failed.Error.Name != "provider_error" {
		t.Fatalf("node_2 error name = %q, want provider_error", failed.Error.Name)
	}
	if failed.Error.Category != GenerationErrorCategoryProviderExecution {
		t.Fatalf("node_2 error category = %q, want %q", failed.Error.Category, GenerationErrorCategoryProviderExecution)
	}
	if failed.Error.Message != "provider could not generate node_2" {
		t.Fatalf("node_2 error message = %q", failed.Error.Message)
	}
	if !failed.Error.Retryable {
		t.Fatal("node_2 error retryable = false, want true")
	}
	if _, err := time.Parse(time.RFC3339, failed.GeneratedAt); err != nil {
		t.Fatalf("node_2 generatedAt = %q, want RFC3339 string: %v", failed.GeneratedAt, err)
	}
}

func TestExecuteBatchIsolatesReplicateProviderCallFailureFromSiblingResults(t *testing.T) {
	var mu sync.Mutex
	requestPrompts := make([]string, 0, 3)

	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		var body map[string]any
		if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
			return nil, err
		}
		input, ok := body["input"].(map[string]any)
		if !ok {
			t.Fatalf("request input = %#v", body["input"])
		}
		prompt, ok := input["prompt"].(string)
		if !ok {
			t.Fatalf("request prompt = %#v", input["prompt"])
		}

		mu.Lock()
		requestPrompts = append(requestPrompts, prompt)
		mu.Unlock()

		if prompt == "fail this sibling" {
			return jsonResponse(500, `{"detail":"replicate worker unavailable for this prediction"}`), nil
		}

		return jsonResponse(200, fmt.Sprintf(`{
			"id": "prediction_%s",
			"status": "succeeded",
			"output": "https://replicate.delivery/pbxt/%s.png",
			"completed_at": "2026-05-17T01:02:03Z"
		}`, strings.ReplaceAll(prompt, " ", "_"), strings.ReplaceAll(prompt, " ", "-"))), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "test-token",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})
	service := NewService(provider, ServiceOptions{MaxConcurrency: 3})
	response, err := service.ExecuteBatch(context.Background(), validGenerationBatch(3, []GenerationJob{
		{
			JobID:       "job_success_1",
			NodeID:      "node_success_1",
			Prompt:      "first success",
			Provider:    "replicate",
			Model:       "google/nano-banana",
			AspectRatio: "1:1",
			Parameters:  map[string]any{},
		},
		{
			JobID:       "job_failure",
			NodeID:      "node_failure",
			Prompt:      "fail this sibling",
			Provider:    "replicate",
			Model:       "google/nano-banana",
			AspectRatio: "1:1",
			Parameters:  map[string]any{},
		},
		{
			JobID:       "job_success_2",
			NodeID:      "node_success_2",
			Prompt:      "second success",
			Provider:    "replicate",
			Model:       "google/nano-banana",
			AspectRatio: "1:1",
			Parameters:  map[string]any{},
		},
	}))
	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}

	if len(requestPrompts) != 3 {
		t.Fatalf("provider calls = %d, want 3", len(requestPrompts))
	}

	successCases := []struct {
		index           int
		wantJobID       string
		wantNodeID      string
		wantRequestID   string
		wantProviderURL string
	}{
		{
			index:           0,
			wantJobID:       "job_success_1",
			wantNodeID:      "node_success_1",
			wantRequestID:   "prediction_first_success",
			wantProviderURL: "https://replicate.delivery/pbxt/first-success.png",
		},
		{
			index:           2,
			wantJobID:       "job_success_2",
			wantNodeID:      "node_success_2",
			wantRequestID:   "prediction_second_success",
			wantProviderURL: "https://replicate.delivery/pbxt/second-success.png",
		},
	}
	for _, test := range successCases {
		result := response.Results[test.index]
		if result.JobID != test.wantJobID || result.NodeID != test.wantNodeID {
			t.Fatalf("result %d IDs = %q/%q, want %q/%q", test.index, result.JobID, result.NodeID, test.wantJobID, test.wantNodeID)
		}
		if result.Status != JobStatusSucceeded {
			t.Fatalf("result %d status = %q, want %q", test.index, result.Status, JobStatusSucceeded)
		}
		if result.Error != nil {
			t.Fatalf("result %d error = %#v, want nil", test.index, result.Error)
		}
		if result.ProviderRequestID != test.wantRequestID {
			t.Fatalf("result %d providerRequestId = %q, want %q", test.index, result.ProviderRequestID, test.wantRequestID)
		}
		if result.ProviderURL != test.wantProviderURL {
			t.Fatalf("result %d providerUrl = %q, want %q", test.index, result.ProviderURL, test.wantProviderURL)
		}
		if result.MimeType != "image/png" || result.Width != 1024 || result.Height != 1024 {
			t.Fatalf("result %d Creative Output metadata = %q %dx%d", test.index, result.MimeType, result.Width, result.Height)
		}
	}

	failed := response.Results[1]
	if failed.JobID != "job_failure" || failed.NodeID != "node_failure" {
		t.Fatalf("failed result IDs = %q/%q, want job_failure/node_failure", failed.JobID, failed.NodeID)
	}
	if failed.Status != JobStatusFailed {
		t.Fatalf("failed status = %q, want %q", failed.Status, JobStatusFailed)
	}
	if failed.ProviderRequestID != "" || failed.ProviderURL != "" {
		t.Fatalf("failed result carried provider success fields: request=%q url=%q", failed.ProviderRequestID, failed.ProviderURL)
	}
	if failed.Error == nil {
		t.Fatal("failed error is nil")
	}
	if failed.Error.Name != "GenerationProviderUnavailable" {
		t.Fatalf("failed error name = %q, want GenerationProviderUnavailable", failed.Error.Name)
	}
	if failed.Error.Category != GenerationErrorCategoryProviderRejected {
		t.Fatalf("failed error category = %q, want %q", failed.Error.Category, GenerationErrorCategoryProviderRejected)
	}
	if !failed.Error.Retryable {
		t.Fatal("failed error retryable = false, want true")
	}
	if !strings.Contains(failed.Error.Message, "replicate worker unavailable for this prediction") {
		t.Fatalf("failed error message = %q", failed.Error.Message)
	}
}

func TestExecuteBatchFailsReplicateJobSafelyWhenCredentialsAreMissing(t *testing.T) {
	t.Setenv(ReplicateAPITokenEnvName, "")
	t.Setenv(ReplicateBaseURLEnvName, "")
	t.Setenv(ReplicateWaitSecondsEnvName, "")

	service := NewService(NewProviderFromEnvironment(), ServiceOptions{MaxConcurrency: 2})
	response, err := service.ExecuteBatch(context.Background(), GenerationBatch{
		BatchID:      "batch_missing_replicate_credentials",
		CampaignID:   "campaign_missing_replicate_credentials",
		SourceNodeID: "source_image",
		FanOutCount:  2,
		Jobs: []GenerationJob{
			{
				JobID:       "job_mock",
				NodeID:      "node_mock",
				Prompt:      "same prompt",
				Provider:    "mock",
				Model:       "mock-image",
				AspectRatio: "1:1",
			},
			{
				JobID:       "job_replicate",
				NodeID:      "node_replicate",
				Prompt:      "same prompt",
				Provider:    "replicate",
				Model:       "owner/model",
				AspectRatio: "1:1",
			},
		},
	})
	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}

	if response.Results[0].Status != JobStatusSucceeded {
		t.Fatalf("mock sibling status = %q, want %q", response.Results[0].Status, JobStatusSucceeded)
	}
	if response.Results[0].ProviderRequestID != "mock_request_job_mock" {
		t.Fatalf("mock sibling providerRequestId = %q", response.Results[0].ProviderRequestID)
	}

	failed := response.Results[1]
	if failed.JobID != "job_replicate" || failed.NodeID != "node_replicate" {
		t.Fatalf("replicate result IDs = %q/%q, want job_replicate/node_replicate", failed.JobID, failed.NodeID)
	}
	if failed.Status != JobStatusFailed {
		t.Fatalf("replicate status = %q, want %q", failed.Status, JobStatusFailed)
	}
	if failed.Error == nil {
		t.Fatal("replicate error is nil")
	}
	if failed.Error.Name != "GenerationProviderMissingCredential" {
		t.Fatalf("replicate error name = %q, want GenerationProviderMissingCredential", failed.Error.Name)
	}
	if failed.Error.Category != GenerationErrorCategoryProviderConfiguration {
		t.Fatalf("replicate error category = %q, want %q", failed.Error.Category, GenerationErrorCategoryProviderConfiguration)
	}
	if failed.Error.Message != "replicate provider requires OWNCANVAS_REPLICATE_API_TOKEN" {
		t.Fatalf("replicate error message = %q", failed.Error.Message)
	}
	if failed.Error.Retryable {
		t.Fatal("replicate error retryable = true, want false")
	}
	if _, err := time.Parse(time.RFC3339, failed.GeneratedAt); err != nil {
		t.Fatalf("replicate generatedAt = %q, want RFC3339 string: %v", failed.GeneratedAt, err)
	}
}

func TestExecuteBatchPreservesTypedExecutionErrorCategory(t *testing.T) {
	provider := providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		return GenerationResult{}, NewExecutionError(
			"GenerationTransportRequestFailed",
			GenerationErrorCategoryTransport,
			"execute replicate prediction request: timeout",
			true,
			context.DeadlineExceeded,
		)
	})

	service := NewService(provider, ServiceOptions{MaxConcurrency: 1})
	response, err := service.ExecuteBatch(context.Background(), validGenerationBatch(1, []GenerationJob{
		validGenerationJob("job_transport", "node_transport"),
	}))
	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}

	failed := response.Results[0]
	if failed.Status != JobStatusFailed {
		t.Fatalf("status = %q, want %q", failed.Status, JobStatusFailed)
	}
	if failed.Error == nil {
		t.Fatal("error is nil")
	}
	if failed.Error.Name != "GenerationTransportRequestFailed" {
		t.Fatalf("error name = %q", failed.Error.Name)
	}
	if failed.Error.Category != GenerationErrorCategoryTransport {
		t.Fatalf("error category = %q, want %q", failed.Error.Category, GenerationErrorCategoryTransport)
	}
	if failed.Error.Message != "execute replicate prediction request: timeout" {
		t.Fatalf("error message = %q", failed.Error.Message)
	}
	if !failed.Error.Retryable {
		t.Fatal("retryable = false, want true")
	}
}

func TestExecuteBatchRedactsSecretsFromReturnedProviderErrors(t *testing.T) {
	const rawToken = "secret-service-token-123"
	t.Setenv(ReplicateAPITokenEnvName, rawToken)

	provider := providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		return GenerationResult{}, errors.New("provider failed with token=" + rawToken)
	})

	service := NewService(provider, ServiceOptions{MaxConcurrency: 1})
	response, err := service.ExecuteBatch(context.Background(), validGenerationBatch(1, []GenerationJob{
		validGenerationJob("job_secret_redaction", "node_secret_redaction"),
	}))
	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}

	failed := response.Results[0]
	if failed.Error == nil {
		t.Fatal("error is nil")
	}
	if strings.Contains(failed.Error.Message, rawToken) {
		t.Fatalf("returned error leaked token: %q", failed.Error.Message)
	}
	if !strings.Contains(failed.Error.Message, "[redacted]") {
		t.Fatalf("returned error did not include redaction marker: %q", failed.Error.Message)
	}
}

func TestExecuteBatchRejectsFanOutAboveHardCap(t *testing.T) {
	var providerCalls int
	service := NewService(providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		providerCalls++
		return GenerationResult{}, nil
	}), ServiceOptions{})

	_, err := service.ExecuteBatch(context.Background(), GenerationBatch{
		BatchID:      "batch_over_cap",
		CampaignID:   "campaign_over_cap",
		SourceNodeID: "source_image",
		FanOutCount:  11,
		Jobs:         validGenerationJobs(11),
	})
	if err == nil {
		t.Fatal("ExecuteBatch error is nil")
	}
	if err.Error() != "fanOutCount must be between 1 and 10" {
		t.Fatalf("error = %q", err.Error())
	}
	if providerCalls != 0 {
		t.Fatalf("provider calls = %d, want 0", providerCalls)
	}
}

func TestExecuteBatchAllowsExactlyMaxFanOutAtProviderBoundary(t *testing.T) {
	var mu sync.Mutex
	providerJobs := make([]string, 0, MaxFanOutCount)
	service := NewService(providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		mu.Lock()
		providerJobs = append(providerJobs, job.JobID)
		mu.Unlock()

		return GenerationResult{
			JobID:       job.JobID,
			NodeID:      job.NodeID,
			Status:      JobStatusSucceeded,
			GeneratedAt: "2026-05-17T00:00:00Z",
		}, nil
	}), ServiceOptions{MaxConcurrency: MaxFanOutCount + 5})

	response, err := service.ExecuteBatch(context.Background(), GenerationBatch{
		BatchID:      "batch_at_cap",
		CampaignID:   "campaign_at_cap",
		SourceNodeID: "source_image",
		FanOutCount:  MaxFanOutCount,
		Jobs:         validGenerationJobs(MaxFanOutCount),
	})
	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}
	if len(response.Results) != MaxFanOutCount {
		t.Fatalf("results length = %d, want %d", len(response.Results), MaxFanOutCount)
	}
	if len(providerJobs) != MaxFanOutCount {
		t.Fatalf("provider calls = %d, want %d", len(providerJobs), MaxFanOutCount)
	}
	for index, result := range response.Results {
		wantJobID := fmt.Sprintf("job_%02d", index+1)
		if result.JobID != wantJobID {
			t.Fatalf("result %d job ID = %q, want %q", index, result.JobID, wantJobID)
		}
		if result.Status != JobStatusSucceeded {
			t.Fatalf("result %d status = %q, want %q", index, result.Status, JobStatusSucceeded)
		}
	}
}

func TestExecuteBatchRejectsMalformedRequestInputs(t *testing.T) {
	service := NewService(providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		t.Fatalf("provider should not be called for malformed request: %#v", job)
		return GenerationResult{}, nil
	}), ServiceOptions{})

	validBatch := validGenerationBatch(1, []GenerationJob{
		validGenerationJob("job_1", "node_1"),
	})

	tests := []struct {
		name    string
		mutate  func(*GenerationBatch)
		wantErr string
	}{
		{
			name: "fanOutCount is zero",
			mutate: func(batch *GenerationBatch) {
				batch.FanOutCount = 0
			},
			wantErr: "fanOutCount must be between 1 and 10",
		},
		{
			name: "fanOutCount is negative",
			mutate: func(batch *GenerationBatch) {
				batch.FanOutCount = -1
			},
			wantErr: "fanOutCount must be between 1 and 10",
		},
		{
			name: "jobs are missing",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs = nil
			},
			wantErr: "jobs length 0 must match fanOutCount 1",
		},
		{
			name: "jobs are empty",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs = []GenerationJob{}
			},
			wantErr: "jobs length 0 must match fanOutCount 1",
		},
		{
			name: "extra jobs do not match fanOutCount",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs = append(batch.Jobs, validGenerationJob("job_2", "node_2"))
			},
			wantErr: "jobs length 2 must match fanOutCount 1",
		},
		{
			name: "blank second job is reported with index",
			mutate: func(batch *GenerationBatch) {
				batch.FanOutCount = 2
				batch.Jobs = append(batch.Jobs, GenerationJob{})
			},
			wantErr: "jobs[1].jobId is required",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			batch := validBatch
			batch.Jobs = append([]GenerationJob(nil), validBatch.Jobs...)
			test.mutate(&batch)

			_, err := service.ExecuteBatch(context.Background(), batch)
			if err == nil {
				t.Fatal("ExecuteBatch error is nil")
			}
			if err.Error() != test.wantErr {
				t.Fatalf("error = %q, want %q", err.Error(), test.wantErr)
			}
		})
	}
}

func TestExecuteBatchRejectsMissingRequiredRequestFields(t *testing.T) {
	service := NewService(providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		t.Fatalf("provider should not be called for invalid request: %#v", job)
		return GenerationResult{}, nil
	}), ServiceOptions{})

	validBatch := validGenerationBatch(1, []GenerationJob{
		validGenerationJob("job_1", "node_1"),
	})
	validBatch.Spec = &GenerationSpec{
		SpecID:       "spec_1",
		CampaignID:   validBatch.CampaignID,
		SourceNodeID: validBatch.SourceNodeID,
		Prompt:       "coral product shot",
		Provider:     "mock",
		Model:        "mock-image",
		AspectRatio:  "1:1",
		Parameters:   map[string]interface{}{},
	}

	tests := []struct {
		name    string
		mutate  func(*GenerationBatch)
		wantErr string
	}{
		{
			name: "missing batchId",
			mutate: func(batch *GenerationBatch) {
				batch.BatchID = " "
			},
			wantErr: "batchId is required",
		},
		{
			name: "missing campaignId",
			mutate: func(batch *GenerationBatch) {
				batch.CampaignID = ""
			},
			wantErr: "campaignId is required",
		},
		{
			name: "missing sourceNodeId",
			mutate: func(batch *GenerationBatch) {
				batch.SourceNodeID = ""
			},
			wantErr: "sourceNodeId is required",
		},
		{
			name: "missing jobId",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs[0].JobID = ""
			},
			wantErr: "jobs[0].jobId is required",
		},
		{
			name: "missing nodeId",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs[0].NodeID = ""
			},
			wantErr: "jobs[0].nodeId is required",
		},
		{
			name: "missing prompt",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs[0].Prompt = " "
			},
			wantErr: "jobs[0].prompt is required",
		},
		{
			name: "missing provider",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs[0].Provider = ""
			},
			wantErr: "jobs[0].provider is required",
		},
		{
			name: "missing model",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs[0].Model = ""
			},
			wantErr: "jobs[0].model is required",
		},
		{
			name: "missing aspectRatio",
			mutate: func(batch *GenerationBatch) {
				batch.Jobs[0].AspectRatio = ""
			},
			wantErr: "jobs[0].aspectRatio is required",
		},
		{
			name: "missing spec prompt",
			mutate: func(batch *GenerationBatch) {
				batch.Spec.Prompt = ""
			},
			wantErr: "spec.prompt is required",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			batch := validBatch
			batch.Jobs = append([]GenerationJob(nil), validBatch.Jobs...)
			spec := *validBatch.Spec
			batch.Spec = &spec
			test.mutate(&batch)

			_, err := service.ExecuteBatch(context.Background(), batch)
			if err == nil {
				t.Fatal("ExecuteBatch error is nil")
			}
			if err.Error() != test.wantErr {
				t.Fatalf("error = %q, want %q", err.Error(), test.wantErr)
			}
		})
	}
}

func TestGenerationJSONContractUsesPlanBodyKeys(t *testing.T) {
	batch := GenerationBatch{
		BatchID:      "batch_json",
		CampaignID:   "campaign_json",
		SourceNodeID: "source_image",
		FanOutCount:  1,
		Spec: &GenerationSpec{
			SpecID:       "spec_1",
			CampaignID:   "campaign_json",
			SourceNodeID: "source_image",
			Prompt:       "coral product shot",
			Provider:     "mock",
			Model:        "mock-image",
			AspectRatio:  "1:1",
			Parameters: map[string]interface{}{
				"seed": float64(123),
			},
		},
		Jobs: []GenerationJob{
			{
				JobID:       "job_1",
				NodeID:      "node_1",
				Prompt:      "coral product shot",
				Provider:    "mock",
				Model:       "mock-image",
				AspectRatio: "1:1",
				Parameters: map[string]interface{}{
					"temperature": float64(0.2),
				},
			},
		},
	}

	body, err := json.Marshal(GenerationBatchResponse{
		BatchID: batch.BatchID,
		Results: []GenerationResult{
			{
				JobID:             "job_1",
				NodeID:            "node_1",
				Status:            JobStatusSucceeded,
				ProviderRequestID: "request_job_1",
				ProviderURL:       "https://provider.example.test/job_1.png",
				MimeType:          "image/png",
				Width:             1024,
				Height:            1024,
				GeneratedAt:       "2026-05-17T00:00:00Z",
			},
		},
	})
	if err != nil {
		t.Fatalf("Marshal response: %v", err)
	}

	var responseJSON map[string]interface{}
	if err := json.Unmarshal(body, &responseJSON); err != nil {
		t.Fatalf("Unmarshal response JSON: %v", err)
	}
	results := responseJSON["results"].([]interface{})
	result := results[0].(map[string]interface{})
	assertKeys(t, result, []string{
		"jobId",
		"nodeId",
		"status",
		"providerRequestId",
		"providerUrl",
		"mimeType",
		"width",
		"height",
		"generatedAt",
	})
	if _, ok := result["generatedAt"].(string); !ok {
		t.Fatalf("generatedAt JSON type = %T, want string", result["generatedAt"])
	}
	if _, ok := result["providerUrl"]; !ok {
		t.Fatal("providerUrl key missing")
	}
	if _, ok := result["outputURL"]; ok {
		t.Fatal("unexpected outputURL key")
	}

	sizeBytes := int64(4096)
	metadataBody, err := json.Marshal(GenerationResult{
		JobID:             "job_with_metadata",
		NodeID:            "node_with_metadata",
		Status:            JobStatusSucceeded,
		ProviderRequestID: "request_with_metadata",
		ProviderURL:       "https://provider.example.test/job_with_metadata.png",
		MimeType:          "image/png",
		Width:             1024,
		Height:            1024,
		ThumbnailURI:      "https://provider.example.test/job_with_metadata_thumb.png",
		SizeBytes:         &sizeBytes,
		GeneratedAt:       "2026-05-17T00:00:00Z",
	})
	if err != nil {
		t.Fatalf("Marshal metadata result: %v", err)
	}
	var metadataResult map[string]interface{}
	if err := json.Unmarshal(metadataBody, &metadataResult); err != nil {
		t.Fatalf("Unmarshal metadata result JSON: %v", err)
	}
	assertKeys(t, metadataResult, []string{
		"jobId",
		"nodeId",
		"status",
		"providerRequestId",
		"providerUrl",
		"mimeType",
		"width",
		"height",
		"thumbnailUri",
		"sizeBytes",
		"generatedAt",
	})

	failureBody, err := json.Marshal(GenerationResult{
		JobID:       "job_failed",
		NodeID:      "node_failed",
		Status:      JobStatusFailed,
		GeneratedAt: "2026-05-17T00:00:00Z",
		Error: &GenerationError{
			Name:      "GenerationProviderRejectedRequest",
			Category:  GenerationErrorCategoryProviderRejected,
			Message:   "provider rejected prompt",
			Retryable: false,
		},
	})
	if err != nil {
		t.Fatalf("Marshal failure result: %v", err)
	}
	var failureResult map[string]interface{}
	if err := json.Unmarshal(failureBody, &failureResult); err != nil {
		t.Fatalf("Unmarshal failure result JSON: %v", err)
	}
	failureError := failureResult["error"].(map[string]interface{})
	assertKeys(t, failureError, []string{
		"name",
		"category",
		"message",
		"retryable",
	})
	if failureError["category"] != string(GenerationErrorCategoryProviderRejected) {
		t.Fatalf("failure category = %q", failureError["category"])
	}

	batchBody, err := json.Marshal(batch)
	if err != nil {
		t.Fatalf("Marshal batch: %v", err)
	}
	var batchJSON map[string]interface{}
	if err := json.Unmarshal(batchBody, &batchJSON); err != nil {
		t.Fatalf("Unmarshal batch JSON: %v", err)
	}
	assertKeys(t, batchJSON, []string{
		"batchId",
		"campaignId",
		"sourceNodeId",
		"fanOutCount",
		"spec",
		"jobs",
	})
	spec := batchJSON["spec"].(map[string]interface{})
	assertKeys(t, spec, []string{
		"specId",
		"campaignId",
		"sourceNodeId",
		"prompt",
		"provider",
		"model",
		"aspectRatio",
		"parameters",
	})
	jobs := batchJSON["jobs"].([]interface{})
	job := jobs[0].(map[string]interface{})
	assertKeys(t, job, []string{
		"jobId",
		"nodeId",
		"prompt",
		"provider",
		"model",
		"aspectRatio",
		"parameters",
	})
}

func assertKeys(t *testing.T, got map[string]interface{}, want []string) {
	t.Helper()

	if len(got) != len(want) {
		t.Fatalf("keys = %v, want exactly %v", mapKeys(got), want)
	}
	for _, key := range want {
		if _, ok := got[key]; !ok {
			t.Fatalf("key %q missing from %v", key, mapKeys(got))
		}
	}
}

func mapKeys(values map[string]interface{}) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	return keys
}
