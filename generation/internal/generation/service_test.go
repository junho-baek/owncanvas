package generation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

type providerFunc func(context.Context, GenerationJob) (GenerationResult, error)

func (f providerFunc) Generate(ctx context.Context, job GenerationJob) (GenerationResult, error) {
	return f(ctx, job)
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
	response, err := service.ExecuteBatch(context.Background(), GenerationBatch{
		BatchID:     "batch_1",
		FanOutCount: 3,
		Jobs: []GenerationJob{
			{JobID: "job_1", NodeID: "node_1"},
			{JobID: "job_2", NodeID: "node_2"},
			{JobID: "job_3", NodeID: "node_3"},
		},
	})
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
	response, err := service.ExecuteBatch(context.Background(), GenerationBatch{
		BatchID:     "batch_1",
		FanOutCount: 3,
		Jobs: []GenerationJob{
			{JobID: "job_1", NodeID: "node_1"},
			{JobID: "job_2", NodeID: "node_2"},
			{JobID: "job_3", NodeID: "node_3"},
		},
	})
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

func TestExecuteBatchRejectsFanOutAboveHardCap(t *testing.T) {
	service := NewService(providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
		return GenerationResult{}, nil
	}), ServiceOptions{})

	_, err := service.ExecuteBatch(context.Background(), GenerationBatch{FanOutCount: 11})
	if err == nil {
		t.Fatal("ExecuteBatch error is nil")
	}
	if err.Error() != "fanOutCount must be between 1 and 10" {
		t.Fatalf("error = %q", err.Error())
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
