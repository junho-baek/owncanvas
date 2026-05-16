# Go-Backed Parallel Generation Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable slice for Go-backed Image Block xN fan-out: a local Go generation service, a React Router bridge, and a visible canvas fan-out path that creates queued same-type Image Blocks before generation results arrive.

**Architecture:** Use a contract-first boundary. The browser owns canvas fan-out and creates N Image Blocks with stable node/job IDs; React Router receives the batch request and forwards it to a local Go service; the Go service executes jobs concurrently through a provider interface. The first implementation uses a deterministic mock provider by default so UI/contract QA is reliable, while keeping a Replicate adapter seam ready for the next provider-key smoke.

**Tech Stack:** Go standard library HTTP server/tests, React Router v7 route action, TypeScript `node:test`, existing `@xyflow/react` canvas, existing OwnCanvas Campaign/Image Block model.

---

## Scope Boundary

This plan covers the first execution slice for GitHub issues `#20`, `#21`, and the first half of `#22`.

It intentionally produces a **mock-provider vertical slice first** because the UX being tested is the xN fan-out and per-node lifecycle. A real Replicate smoke can be a follow-up task after the contract, bridge, and UI are stable. The Go service still owns the provider interface and secret lookup boundary from the start.

This plan does not implement full graph execution, Electron packaging, percent progress, cancellation, local blob download, or multi-provider routing.

## File Structure

Create:

- `generation/go.mod`: Go module for the local generation service.
- `generation/cmd/owncanvas-generation/main.go`: process entrypoint.
- `generation/internal/generation/types.go`: `GenerationSpec`, `GenerationBatch`, `GenerationJob`, status/result/error types.
- `generation/internal/generation/service.go`: concurrency runner and provider interface.
- `generation/internal/generation/server.go`: HTTP API.
- `generation/internal/generation/service_test.go`: concurrency, partial failure, x10 cap tests.
- `generation/internal/generation/server_test.go`: HTTP contract tests.
- `app/features/creative-canvas/model/generation-batch.ts`: TypeScript mirror of the batch contract plus validation helpers.
- `app/features/creative-canvas/model/generation-batch.test.ts`: TypeScript contract tests.
- `app/routes/api.campaign-generation.ts`: React Router API bridge to Go service.
- `app/routes/campaign-generation-api.test.ts`: route tests using a fake Go service.
- `app/features/creative-canvas/adapters/image-generation-fanout.ts`: pure fan-out planner for N Image Blocks and one batch payload.
- `app/features/creative-canvas/adapters/image-generation-fanout.test.ts`: pure fan-out tests.

Modify:

- `app/routes.ts`: add `api/campaigns/:campaignId/generation/batches`.
- `app/features/creative-canvas/model/image-generation-node.ts`: extend `batchCount` to x10.
- `app/features/creative-canvas/components/creative-canvas-screen.tsx`: wire run buttons to the fan-out planner and route bridge, leaving UI styling mostly unchanged.
- `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`: assert x10 cap and run handler wiring.

## Contract Decisions

- Client-created duplicated Image Blocks are the source of truth for the visible fan-out.
- Each duplicated node has one `GenerationJob`.
- One xN action creates one `GenerationBatch`.
- The UI submits `GenerationBatchRequest` after queued nodes are already visible.
- Go returns one result per accepted job. Partial failure is represented per job.
- Status mapping:
  - Go `queued` -> Image Block `queued`
  - Go `running` -> Image Block `running`
  - Go `succeeded` -> Image Block `succeeded`
  - Go `failed` -> Image Block `failed`
- Initial max fan-out is `10`.

---

### Task 1: Create the Go Generation Contract and Runner

**Files:**
- Create: `generation/go.mod`
- Create: `generation/internal/generation/types.go`
- Create: `generation/internal/generation/service.go`
- Create: `generation/internal/generation/service_test.go`

- [ ] **Step 1: Create the Go module**

Create `generation/go.mod`:

```go
module github.com/junho-baek/owncanvas/generation

go 1.22
```

- [ ] **Step 2: Write the failing service tests**

Create `generation/internal/generation/service_test.go`:

```go
package generation

import (
	"context"
	"errors"
	"slices"
	"sync"
	"testing"
	"time"
)

type recordingProvider struct {
	mu       sync.Mutex
	active   int
	maxSeen  int
	failNode string
}

func (provider *recordingProvider) Generate(ctx context.Context, job GenerationJob) (GenerationResult, error) {
	provider.mu.Lock()
	provider.active++
	if provider.active > provider.maxSeen {
		provider.maxSeen = provider.active
	}
	provider.mu.Unlock()

	time.Sleep(10 * time.Millisecond)

	provider.mu.Lock()
	provider.active--
	provider.mu.Unlock()

	if job.NodeID == provider.failNode {
		return GenerationResult{}, errors.New("provider rejected prompt")
	}

	return GenerationResult{
		JobID:             job.JobID,
		NodeID:            job.NodeID,
		Status:            JobStatusSucceeded,
		ProviderRequestID: "request_" + job.JobID,
		ProviderURL:       "https://provider.example.test/" + job.JobID + ".png",
		MimeType:          "image/png",
		Width:             1024,
		Height:            1024,
		GeneratedAt:       "2026-05-17T00:00:00Z",
	}, nil
}

func TestExecuteBatchRunsJobsConcurrentlyAndKeepsInputOrder(t *testing.T) {
	provider := &recordingProvider{}
	service := NewService(provider, ServiceOptions{MaxConcurrency: 3})
	batch := GenerationBatch{
		BatchID:      "batch_parallel",
		CampaignID:   "campaign_parallel",
		SourceNodeID: "source_image",
		FanOutCount:  3,
		Jobs: []GenerationJob{
			{JobID: "job_1", NodeID: "node_1", Prompt: "coral product shot", Provider: "mock", Model: "mock-image"},
			{JobID: "job_2", NodeID: "node_2", Prompt: "coral product shot", Provider: "mock", Model: "mock-image"},
			{JobID: "job_3", NodeID: "node_3", Prompt: "coral product shot", Provider: "mock", Model: "mock-image"},
		},
	}

	response, err := service.ExecuteBatch(context.Background(), batch)

	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}
	if provider.maxSeen < 2 {
		t.Fatalf("expected concurrent execution, max active jobs was %d", provider.maxSeen)
	}
	gotNodeIDs := []string{}
	for _, result := range response.Results {
		gotNodeIDs = append(gotNodeIDs, result.NodeID)
	}
	if !slices.Equal(gotNodeIDs, []string{"node_1", "node_2", "node_3"}) {
		t.Fatalf("results not in input order: %v", gotNodeIDs)
	}
}

func TestExecuteBatchIsolatesPartialFailure(t *testing.T) {
	provider := &recordingProvider{failNode: "node_2"}
	service := NewService(provider, ServiceOptions{MaxConcurrency: 3})
	batch := GenerationBatch{
		BatchID:      "batch_partial",
		CampaignID:   "campaign_partial",
		SourceNodeID: "source_image",
		FanOutCount:  3,
		Jobs: []GenerationJob{
			{JobID: "job_1", NodeID: "node_1", Prompt: "same prompt", Provider: "mock", Model: "mock-image"},
			{JobID: "job_2", NodeID: "node_2", Prompt: "same prompt", Provider: "mock", Model: "mock-image"},
			{JobID: "job_3", NodeID: "node_3", Prompt: "same prompt", Provider: "mock", Model: "mock-image"},
		},
	}

	response, err := service.ExecuteBatch(context.Background(), batch)

	if err != nil {
		t.Fatalf("ExecuteBatch returned error: %v", err)
	}
	if response.Results[0].Status != JobStatusSucceeded {
		t.Fatalf("job 1 should succeed: %#v", response.Results[0])
	}
	if response.Results[1].Status != JobStatusFailed {
		t.Fatalf("job 2 should fail: %#v", response.Results[1])
	}
	if response.Results[2].Status != JobStatusSucceeded {
		t.Fatalf("job 3 should succeed: %#v", response.Results[2])
	}
	if response.Results[1].Error == nil || response.Results[1].Error.Message != "provider rejected prompt" {
		t.Fatalf("failed job should preserve provider error: %#v", response.Results[1].Error)
	}
}

func TestExecuteBatchRejectsFanOutAboveHardCap(t *testing.T) {
	provider := &recordingProvider{}
	service := NewService(provider, ServiceOptions{MaxConcurrency: 3})
	batch := GenerationBatch{
		BatchID:      "batch_too_large",
		CampaignID:   "campaign_too_large",
		SourceNodeID: "source_image",
		FanOutCount:  11,
		Jobs:         []GenerationJob{},
	}

	_, err := service.ExecuteBatch(context.Background(), batch)

	if err == nil {
		t.Fatal("expected fan-out cap error")
	}
	if err.Error() != "fanOutCount must be between 1 and 10" {
		t.Fatalf("unexpected error: %v", err)
	}
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
cd generation && go test ./...
```

Expected: FAIL because the `generation` package types and `NewService` are not defined.

- [ ] **Step 4: Implement the contract types**

Create `generation/internal/generation/types.go`:

```go
package generation

type JobStatus string

const (
	JobStatusQueued    JobStatus = "queued"
	JobStatusRunning   JobStatus = "running"
	JobStatusSucceeded JobStatus = "succeeded"
	JobStatusFailed    JobStatus = "failed"
)

type GenerationSpec struct {
	SpecID       string                 `json:"specId"`
	CampaignID   string                 `json:"campaignId"`
	SourceNodeID string                 `json:"sourceNodeId"`
	Prompt       string                 `json:"prompt"`
	Provider     string                 `json:"provider"`
	Model        string                 `json:"model"`
	AspectRatio  string                 `json:"aspectRatio"`
	Parameters   map[string]interface{} `json:"parameters"`
}

type GenerationBatch struct {
	BatchID      string          `json:"batchId"`
	CampaignID   string          `json:"campaignId"`
	SourceNodeID string          `json:"sourceNodeId"`
	FanOutCount  int             `json:"fanOutCount"`
	Spec         *GenerationSpec `json:"spec,omitempty"`
	Jobs         []GenerationJob `json:"jobs"`
}

type GenerationJob struct {
	JobID       string                 `json:"jobId"`
	NodeID      string                 `json:"nodeId"`
	Prompt      string                 `json:"prompt"`
	Provider    string                 `json:"provider"`
	Model       string                 `json:"model"`
	AspectRatio string                 `json:"aspectRatio"`
	Parameters  map[string]interface{} `json:"parameters"`
}

type GenerationError struct {
	Name      string `json:"name"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable"`
}

type GenerationResult struct {
	JobID             string           `json:"jobId"`
	NodeID            string           `json:"nodeId"`
	Status            JobStatus        `json:"status"`
	ProviderRequestID string           `json:"providerRequestId"`
	ProviderURL       string           `json:"providerUrl"`
	MimeType          string           `json:"mimeType"`
	Width             int              `json:"width"`
	Height            int              `json:"height"`
	GeneratedAt       string           `json:"generatedAt"`
	Error             *GenerationError `json:"error,omitempty"`
}

type GenerationBatchResponse struct {
	BatchID string             `json:"batchId"`
	Results []GenerationResult `json:"results"`
}
```

- [ ] **Step 5: Implement the service runner**

Create `generation/internal/generation/service.go`:

```go
package generation

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

const MaxFanOutCount = 10

type Provider interface {
	Generate(ctx context.Context, job GenerationJob) (GenerationResult, error)
}

type ServiceOptions struct {
	MaxConcurrency int
}

type Service struct {
	provider       Provider
	maxConcurrency int
}

func NewService(provider Provider, options ServiceOptions) *Service {
	maxConcurrency := options.MaxConcurrency
	if maxConcurrency <= 0 {
		maxConcurrency = 3
	}
	if maxConcurrency > MaxFanOutCount {
		maxConcurrency = MaxFanOutCount
	}

	return &Service{
		provider:       provider,
		maxConcurrency: maxConcurrency,
	}
}

func (service *Service) ExecuteBatch(ctx context.Context, batch GenerationBatch) (GenerationBatchResponse, error) {
	if batch.FanOutCount < 1 || batch.FanOutCount > MaxFanOutCount {
		return GenerationBatchResponse{}, errors.New("fanOutCount must be between 1 and 10")
	}
	if len(batch.Jobs) != batch.FanOutCount {
		return GenerationBatchResponse{}, fmt.Errorf("jobs length must match fanOutCount: jobs=%d fanOutCount=%d", len(batch.Jobs), batch.FanOutCount)
	}

	results := make([]GenerationResult, len(batch.Jobs))
	nextIndex := 0
	var mu sync.Mutex
	workerCount := service.maxConcurrency
	if workerCount > len(batch.Jobs) {
		workerCount = len(batch.Jobs)
	}

	runNext := func() {
		for {
			mu.Lock()
			if nextIndex >= len(batch.Jobs) {
				mu.Unlock()
				return
			}
			index := nextIndex
			nextIndex++
			job := batch.Jobs[index]
			mu.Unlock()

			result, err := service.provider.Generate(ctx, job)
			if err != nil {
				result = GenerationResult{
					JobID:       job.JobID,
					NodeID:      job.NodeID,
					Status:      JobStatusFailed,
					GeneratedAt: time.Now().UTC().Format(time.RFC3339),
					Error: &GenerationError{
						Name:      "provider_error",
						Message:   err.Error(),
						Retryable: true,
					},
				}
			}
			if result.JobID == "" {
				result.JobID = job.JobID
			}
			if result.NodeID == "" {
				result.NodeID = job.NodeID
			}
			results[index] = result
		}
	}

	var wg sync.WaitGroup
	for range workerCount {
		wg.Add(1)
		go func() {
			defer wg.Done()
			runNext()
		}()
	}
	wg.Wait()

	return GenerationBatchResponse{
		BatchID: batch.BatchID,
		Results: results,
	}, nil
}
```

- [ ] **Step 6: Run Go tests**

Run:

```bash
cd generation && go test ./...
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add generation/go.mod generation/internal/generation/types.go generation/internal/generation/service.go generation/internal/generation/service_test.go
git commit -m "feat: add generation service runner"
```

---

### Task 2: Add the Go HTTP Server with Deterministic Mock Provider

**Files:**
- Create: `generation/internal/generation/server.go`
- Create: `generation/internal/generation/server_test.go`
- Create: `generation/cmd/owncanvas-generation/main.go`

- [ ] **Step 1: Write the failing HTTP tests**

Create `generation/internal/generation/server_test.go`:

```go
package generation

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestServerExecutesBatchEndpoint(t *testing.T) {
	server := NewServer(NewService(MockProvider{}, ServiceOptions{MaxConcurrency: 3}))
	body := []byte(`{
		"batchId": "batch_http",
		"campaignId": "campaign_http",
		"sourceNodeId": "source_image",
		"fanOutCount": 3,
		"jobs": [
			{"jobId":"job_1","nodeId":"node_1","prompt":"same prompt","provider":"mock","model":"mock-image","aspectRatio":"9:16","parameters":{}},
			{"jobId":"job_2","nodeId":"node_2","prompt":"same prompt","provider":"mock","model":"mock-image","aspectRatio":"9:16","parameters":{}},
			{"jobId":"job_3","nodeId":"node_3","prompt":"same prompt","provider":"mock","model":"mock-image","aspectRatio":"9:16","parameters":{}}
		]
	}`)

	request := httptest.NewRequest(http.MethodPost, "/v1/generation/batches", bytes.NewReader(body))
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var response GenerationBatchResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response was not JSON: %v", err)
	}
	if response.BatchID != "batch_http" {
		t.Fatalf("unexpected batch id: %s", response.BatchID)
	}
	if len(response.Results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(response.Results))
	}
	for _, result := range response.Results {
		if result.Status != JobStatusSucceeded {
			t.Fatalf("expected success result, got %#v", result)
		}
		if result.ProviderURL == "" {
			t.Fatalf("expected provider URL, got %#v", result)
		}
	}
}

func TestServerRejectsInvalidMethod(t *testing.T) {
	server := NewServer(NewService(MockProvider{}, ServiceOptions{}))
	request := httptest.NewRequest(http.MethodGet, "/v1/generation/batches", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", recorder.Code)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd generation && go test ./...
```

Expected: FAIL because `NewServer` and `MockProvider` are not defined.

- [ ] **Step 3: Implement the HTTP server and mock provider**

Create `generation/internal/generation/server.go`:

```go
package generation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Server struct {
	service *Service
}

func NewServer(service *Service) *Server {
	return &Server{service: service}
}

func (server *Server) ServeHTTP(response http.ResponseWriter, request *http.Request) {
	if request.URL.Path != "/v1/generation/batches" {
		writeJSON(response, http.StatusNotFound, map[string]string{
			"code":    "not_found",
			"message": "generation endpoint was not found",
		})
		return
	}
	if request.Method != http.MethodPost {
		writeJSON(response, http.StatusMethodNotAllowed, map[string]string{
			"code":    "method_not_allowed",
			"message": "generation batches require POST",
		})
		return
	}

	var batch GenerationBatch
	if err := json.NewDecoder(request.Body).Decode(&batch); err != nil {
		writeJSON(response, http.StatusBadRequest, map[string]string{
			"code":    "invalid_json",
			"message": "request body must be valid JSON",
		})
		return
	}

	result, err := server.service.ExecuteBatch(request.Context(), batch)
	if err != nil {
		writeJSON(response, http.StatusBadRequest, map[string]string{
			"code":    "invalid_batch",
			"message": err.Error(),
		})
		return
	}

	writeJSON(response, http.StatusOK, result)
}

func writeJSON(response http.ResponseWriter, status int, body any) {
	response.Header().Set("content-type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(body)
}

type MockProvider struct{}

func (provider MockProvider) Generate(ctx context.Context, job GenerationJob) (GenerationResult, error) {
	select {
	case <-ctx.Done():
		return GenerationResult{}, ctx.Err()
	default:
	}

	return GenerationResult{
		JobID:             job.JobID,
		NodeID:            job.NodeID,
		Status:            JobStatusSucceeded,
		ProviderRequestID: "mock_request_" + job.JobID,
		ProviderURL:       fmt.Sprintf("https://mock.owncanvas.local/%s.png", job.NodeID),
		MimeType:          "image/png",
		Width:             1024,
		Height:            1024,
		GeneratedAt:       time.Now().UTC().Format(time.RFC3339),
	}, nil
}
```

- [ ] **Step 4: Implement the command entrypoint**

Create `generation/cmd/owncanvas-generation/main.go`:

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/junho-baek/owncanvas/generation/internal/generation"
)

func main() {
	addr := os.Getenv("OWNCANVAS_GENERATION_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8787"
	}

	server := generation.NewServer(
		generation.NewService(generation.MockProvider{}, generation.ServiceOptions{
			MaxConcurrency: 3,
		}),
	)

	log.Printf("OwnCanvas generation service listening on http://%s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatal(err)
	}
}
```

- [ ] **Step 5: Run Go tests and formatter**

Run:

```bash
cd generation && gofmt -w ./cmd ./internal && go test ./...
```

Expected: PASS.

- [ ] **Step 6: Smoke the local service manually**

Run in one terminal:

```bash
cd generation && go run ./cmd/owncanvas-generation
```

Run in another terminal:

```bash
curl -sS -X POST http://127.0.0.1:8787/v1/generation/batches \
  -H 'content-type: application/json' \
  --data '{
    "batchId":"batch_curl",
    "campaignId":"campaign_curl",
    "sourceNodeId":"source_image",
    "fanOutCount":3,
    "jobs":[
      {"jobId":"job_1","nodeId":"node_1","prompt":"same prompt","provider":"mock","model":"mock-image","aspectRatio":"9:16","parameters":{}},
      {"jobId":"job_2","nodeId":"node_2","prompt":"same prompt","provider":"mock","model":"mock-image","aspectRatio":"9:16","parameters":{}},
      {"jobId":"job_3","nodeId":"node_3","prompt":"same prompt","provider":"mock","model":"mock-image","aspectRatio":"9:16","parameters":{}}
    ]
  }'
```

Expected: JSON response with `batchId: "batch_curl"` and 3 `succeeded` results.

- [ ] **Step 7: Commit**

```bash
git add generation/internal/generation/server.go generation/internal/generation/server_test.go generation/cmd/owncanvas-generation/main.go
git commit -m "feat: serve local generation batches"
```

---

### Task 3: Add the TypeScript Batch Contract and React Router Bridge

**Files:**
- Create: `app/features/creative-canvas/model/generation-batch.ts`
- Create: `app/features/creative-canvas/model/generation-batch.test.ts`
- Create: `app/routes/api.campaign-generation.ts`
- Create: `app/routes/campaign-generation-api.test.ts`
- Modify: `app/routes.ts`

- [ ] **Step 1: Write the TypeScript contract test**

Create `app/features/creative-canvas/model/generation-batch.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGenerationBatchRequest,
  normalizeGenerationBatchResponse,
} from "./generation-batch.ts";

test("createGenerationBatchRequest caps fan-out at x10 and preserves node job mapping", () => {
  const request = createGenerationBatchRequest({
    batchId: "batch_contract",
    campaignId: "campaign_contract",
    sourceNodeId: "source_image",
    prompt: "same prompt",
    provider: "mock",
    model: "mock-image",
    aspectRatio: "9:16",
    nodeIds: ["node_1", "node_2", "node_3"],
    parameters: { size: "1024x1792" },
  });

  assert.equal(request.fanOutCount, 3);
  assert.deepEqual(
    request.jobs.map((job) => [job.jobId, job.nodeId]),
    [
      ["batch_contract_job_1", "node_1"],
      ["batch_contract_job_2", "node_2"],
      ["batch_contract_job_3", "node_3"],
    ],
  );
  assert.equal(request.jobs[0]?.prompt, "same prompt");
  assert.deepEqual(request.jobs[0]?.parameters, { size: "1024x1792" });
});

test("createGenerationBatchRequest rejects more than ten nodes", () => {
  assert.throws(
    () =>
      createGenerationBatchRequest({
        batchId: "batch_too_large",
        campaignId: "campaign_contract",
        sourceNodeId: "source_image",
        prompt: "same prompt",
        provider: "mock",
        model: "mock-image",
        aspectRatio: "9:16",
        nodeIds: Array.from({ length: 11 }, (_, index) => `node_${index}`),
        parameters: {},
      }),
    /fan-out count must be between 1 and 10/,
  );
});

test("normalizeGenerationBatchResponse keeps partial failures", () => {
  const result = normalizeGenerationBatchResponse({
    batchId: "batch_partial",
    results: [
      {
        jobId: "job_1",
        nodeId: "node_1",
        status: "succeeded",
        providerRequestId: "request_1",
        providerUrl: "https://provider.example.test/1.png",
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        generatedAt: "2026-05-17T00:00:00Z",
      },
      {
        jobId: "job_2",
        nodeId: "node_2",
        status: "failed",
        providerRequestId: "",
        providerUrl: "",
        mimeType: "",
        width: 0,
        height: 0,
        generatedAt: "2026-05-17T00:00:01Z",
        error: {
          name: "provider_error",
          message: "provider rejected prompt",
          retryable: true,
        },
      },
    ],
  });

  assert.equal(result.results[0]?.status, "succeeded");
  assert.equal(result.results[1]?.status, "failed");
  assert.equal(result.results[1]?.error?.message, "provider rejected prompt");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts
```

Expected: FAIL because `generation-batch.ts` does not exist.

- [ ] **Step 3: Implement the TypeScript contract helper**

Create `app/features/creative-canvas/model/generation-batch.ts`:

```ts
export const GENERATION_BATCH_MAX_FAN_OUT = 10;

export type GenerationJobStatus = "queued" | "running" | "succeeded" | "failed";

export type GenerationSpec = {
  specId: string;
  campaignId: string;
  sourceNodeId: string;
  prompt: string;
  provider: string;
  model: string;
  aspectRatio: string;
  parameters: Record<string, unknown>;
};

export type GenerationJobRequest = {
  jobId: string;
  nodeId: string;
  prompt: string;
  provider: string;
  model: string;
  aspectRatio: string;
  parameters: Record<string, unknown>;
};

export type GenerationBatchRequest = {
  batchId: string;
  campaignId: string;
  sourceNodeId: string;
  fanOutCount: number;
  spec: GenerationSpec;
  jobs: GenerationJobRequest[];
};

export type GenerationJobError = {
  name: string;
  message: string;
  retryable: boolean;
};

export type GenerationJobResult = {
  jobId: string;
  nodeId: string;
  status: GenerationJobStatus;
  providerRequestId: string;
  providerUrl: string;
  mimeType: string;
  width: number;
  height: number;
  generatedAt: string;
  error?: GenerationJobError;
};

export type GenerationBatchResponse = {
  batchId: string;
  results: GenerationJobResult[];
};

export function createGenerationBatchRequest(input: {
  batchId: string;
  campaignId: string;
  sourceNodeId: string;
  prompt: string;
  provider: string;
  model: string;
  aspectRatio: string;
  nodeIds: string[];
  parameters: Record<string, unknown>;
}): GenerationBatchRequest {
  const fanOutCount = input.nodeIds.length;

  if (fanOutCount < 1 || fanOutCount > GENERATION_BATCH_MAX_FAN_OUT) {
    throw new Error("fan-out count must be between 1 and 10");
  }

  const spec: GenerationSpec = {
    specId: `${input.batchId}_spec`,
    campaignId: input.campaignId,
    sourceNodeId: input.sourceNodeId,
    prompt: input.prompt,
    provider: input.provider,
    model: input.model,
    aspectRatio: input.aspectRatio,
    parameters: { ...input.parameters },
  };

  return {
    batchId: input.batchId,
    campaignId: input.campaignId,
    sourceNodeId: input.sourceNodeId,
    fanOutCount,
    spec,
    jobs: input.nodeIds.map((nodeId, index) => ({
      jobId: `${input.batchId}_job_${index + 1}`,
      nodeId,
      prompt: input.prompt,
      provider: input.provider,
      model: input.model,
      aspectRatio: input.aspectRatio,
      parameters: { ...input.parameters },
    })),
  };
}

export function normalizeGenerationBatchResponse(
  response: GenerationBatchResponse,
): GenerationBatchResponse {
  return {
    batchId: response.batchId,
    results: response.results.map((result) => ({
      ...result,
      error: result.error === undefined ? undefined : { ...result.error },
    })),
  };
}
```

- [ ] **Step 4: Run the contract test**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing route test**

Create `app/routes/campaign-generation-api.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { action } from "./api.campaign-generation.ts";

test("POST /api/campaigns/:campaignId/generation/batches forwards to Go service", async () => {
  const requestBody = {
    batchId: "batch_route",
    campaignId: "campaign_route",
    sourceNodeId: "source_image",
    fanOutCount: 1,
    spec: {
      specId: "batch_route_spec",
      campaignId: "campaign_route",
      sourceNodeId: "source_image",
      prompt: "same prompt",
      provider: "mock",
      model: "mock-image",
      aspectRatio: "9:16",
      parameters: {},
    },
    jobs: [
      {
        jobId: "batch_route_job_1",
        nodeId: "node_1",
        prompt: "same prompt",
        provider: "mock",
        model: "mock-image",
        aspectRatio: "9:16",
        parameters: {},
      },
    ],
  };
  const calls: Array<{ url: string; body: string }> = [];

  const response = await action({
    request: new Request(
      "http://localhost/api/campaigns/campaign_route/generation/batches",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    ),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async (url, init) => {
      calls.push({ url: String(url), body: String(init?.body) });
      return Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "succeeded",
            providerRequestId: "mock_request",
            providerUrl: "https://mock.owncanvas.local/node_1.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            generatedAt: "2026-05-17T00:00:00Z",
          },
        ],
      });
    },
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "http://127.0.0.1:8787/v1/generation/batches");
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.generation-api.v1",
    batch: {
      batchId: "batch_route",
      results: [
        {
          jobId: "batch_route_job_1",
          nodeId: "node_1",
          status: "succeeded",
          providerRequestId: "mock_request",
          providerUrl: "https://mock.owncanvas.local/node_1.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          generatedAt: "2026-05-17T00:00:00Z",
        },
      ],
    },
  });
});

test("generation route reports Go service unavailable", async () => {
  const response = await action({
    request: new Request(
      "http://localhost/api/campaigns/campaign_route/generation/batches",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          batchId: "batch_route",
          campaignId: "campaign_route",
          sourceNodeId: "source_image",
          fanOutCount: 1,
          spec: {
            specId: "batch_route_spec",
            campaignId: "campaign_route",
            sourceNodeId: "source_image",
            prompt: "same prompt",
            provider: "mock",
            model: "mock-image",
            aspectRatio: "9:16",
            parameters: {},
          },
          jobs: [
            {
              jobId: "batch_route_job_1",
              nodeId: "node_1",
              prompt: "same prompt",
              provider: "mock",
              model: "mock-image",
              aspectRatio: "9:16",
              parameters: {},
            },
          ],
        }),
      },
    ),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:8787");
    },
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "generation.service_unavailable",
      message: "Generation service is unavailable.",
    },
  });
});
```

- [ ] **Step 6: Implement the route and route registration**

Create `app/routes/api.campaign-generation.ts`:

```ts
import {
  normalizeGenerationBatchResponse,
  type GenerationBatchRequest,
  type GenerationBatchResponse,
} from "../features/creative-canvas/model/generation-batch.ts";

export const CAMPAIGN_GENERATION_API_SCHEMA_VERSION =
  "owncanvas.generation-api.v1";

type CampaignGenerationActionArgs = {
  request: Request;
  params: {
    campaignId?: string;
  };
  fetchGenerationService?: typeof fetch;
  generationServiceUrl?: string;
};

export async function action({
  request,
  params,
  fetchGenerationService = fetch,
  generationServiceUrl =
    process.env.OWNCANVAS_GENERATION_SERVICE_URL ?? "http://127.0.0.1:8787",
}: CampaignGenerationActionArgs) {
  if (request.method !== "POST") {
    return generationErrorResponse(
      {
        code: "method_not_allowed",
        message: "Generation batches require POST.",
      },
      405,
    );
  }

  const campaignId = params.campaignId ?? "";
  const body = await readJson<GenerationBatchRequest>(request);

  if (body === null || body.campaignId !== campaignId) {
    return generationErrorResponse(
      {
        code: "generation.invalid_batch",
        message: "Generation batch campaignId must match the route campaignId.",
      },
      400,
    );
  }

  let serviceResponse: Response;

  try {
    serviceResponse = await fetchGenerationService(
      `${generationServiceUrl.replace(/\/$/, "")}/v1/generation/batches`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch {
    return generationErrorResponse(
      {
        code: "generation.service_unavailable",
        message: "Generation service is unavailable.",
      },
      502,
    );
  }

  if (!serviceResponse.ok) {
    return generationErrorResponse(
      {
        code: "generation.service_error",
        message: "Generation service rejected the batch.",
      },
      502,
    );
  }

  const batchResponse = await readJson<GenerationBatchResponse>(serviceResponse);

  if (batchResponse === null) {
    return generationErrorResponse(
      {
        code: "generation.invalid_service_response",
        message: "Generation service response must be valid JSON.",
      },
      502,
    );
  }

  return Response.json({
    schemaVersion: CAMPAIGN_GENERATION_API_SCHEMA_VERSION,
    batch: normalizeGenerationBatchResponse(batchResponse),
  });
}

async function readJson<T>(request: Request | Response): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function generationErrorResponse(
  error: { code: string; message: string },
  status: number,
) {
  return Response.json({ error }, { status });
}
```

Modify `app/routes.ts` by adding this route after `api/campaigns/:campaignId`:

```ts
  route(
    "api/campaigns/:campaignId/generation/batches",
    "./routes/api.campaign-generation.ts",
  ),
```

- [ ] **Step 7: Run route and contract tests**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts app/routes/campaign-generation-api.test.ts
```

Expected: PASS.

- [ ] **Step 8: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/features/creative-canvas/model/generation-batch.ts app/features/creative-canvas/model/generation-batch.test.ts app/routes/api.campaign-generation.ts app/routes/campaign-generation-api.test.ts app/routes.ts
git commit -m "feat: bridge generation batches to go service"
```

---

### Task 4: Plan xN Image Block Fan-Out with a Pure Adapter

**Files:**
- Create: `app/features/creative-canvas/adapters/image-generation-fanout.ts`
- Create: `app/features/creative-canvas/adapters/image-generation-fanout.test.ts`
- Modify: `app/features/creative-canvas/model/image-generation-node.ts`

- [ ] **Step 1: Write the failing fan-out adapter test**

Create `app/features/creative-canvas/adapters/image-generation-fanout.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createImageGenerationNodeProperties,
  isImageGenerationNodeProperties,
} from "../model/image-generation-node.ts";
import type { CreativeFlowNode } from "./react-flow-canvas.ts";
import { createImageGenerationFanOutPlan } from "./image-generation-fanout.ts";

function imageNode(input: {
  id: string;
  x: number;
  y: number;
  batchCount: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
}): CreativeFlowNode {
  return {
    id: input.id,
    type: "creative",
    position: { x: input.x, y: input.y },
    data: {
      id: input.id,
      kind: "image",
      title: "Image Block",
      status: "READY",
      outputs: [],
      inputs: [],
      properties: createImageGenerationNodeProperties({
        prompt: "same prompt",
        batchCount: input.batchCount,
      }),
    },
  };
}

test("createImageGenerationFanOutPlan creates same-type queued image nodes and a matching batch", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 3 });
  const plan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source],
    now: () => "2026-05-17T00:00:00.000Z",
  });

  assert.equal(plan.createdNodes.length, 3);
  assert.equal(plan.batch.fanOutCount, 3);
  assert.deepEqual(
    plan.createdNodes.map((node) => node.id),
    [
      "image_source_batch_20260517000000000_1",
      "image_source_batch_20260517000000000_2",
      "image_source_batch_20260517000000000_3",
    ],
  );
  assert.deepEqual(
    plan.batch.jobs.map((job) => job.nodeId),
    plan.createdNodes.map((node) => node.id),
  );

  for (const node of plan.createdNodes) {
    assert.equal(node.data.kind, "image");
    assert.ok(isImageGenerationNodeProperties(node.data.properties));
    if (!isImageGenerationNodeProperties(node.data.properties)) {
      continue;
    }
    assert.equal(node.data.properties.prompt, "same prompt");
    assert.equal(node.data.properties.uiState.status, "queued");
    assert.equal(node.data.properties.uiState.statusMessage, "Queued");
  }
});

test("createImageGenerationFanOutPlan lays out ten nodes in rows", () => {
  const source = imageNode({ id: "image_source", x: 0, y: 0, batchCount: 10 });
  const plan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source],
    now: () => "2026-05-17T00:00:00.000Z",
  });

  assert.equal(plan.createdNodes.length, 10);
  assert.deepEqual(plan.createdNodes.slice(0, 4).map((node) => node.position), [
    { x: 440, y: 0 },
    { x: 820, y: 0 },
    { x: 1200, y: 0 },
    { x: 1580, y: 0 },
  ]);
  assert.deepEqual(plan.createdNodes.slice(4, 8).map((node) => node.position), [
    { x: 440, y: 700 },
    { x: 820, y: 700 },
    { x: 1200, y: 700 },
    { x: 1580, y: 700 },
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/adapters/image-generation-fanout.test.ts
```

Expected: FAIL because `image-generation-fanout.ts` does not exist and `batchCount` only allows x5.

- [ ] **Step 3: Extend Image Block batch count to x10**

Modify `ImageGenerationNodeProperties["batchCount"]` in `app/features/creative-canvas/model/image-generation-node.ts`:

```ts
  batchCount: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
```

Confirm `createImageGenerationNodeProperties()` accepts the widened type without coercion:

```ts
    batchCount: input.batchCount ?? 1,
```

- [ ] **Step 4: Implement the fan-out adapter**

Create `app/features/creative-canvas/adapters/image-generation-fanout.ts`:

```ts
import {
  createGenerationBatchRequest,
  type GenerationBatchRequest,
} from "../model/generation-batch.ts";
import {
  createImageGenerationNodeProperties,
  isImageGenerationNodeProperties,
  type ImageGenerationNodeProperties,
} from "../model/image-generation-node.ts";
import type { CreativeFlowNode } from "./react-flow-canvas.ts";

export type ImageGenerationFanOutPlan = {
  batchId: string;
  createdNodes: CreativeFlowNode[];
  batch: GenerationBatchRequest;
};

export function createImageGenerationFanOutPlan(input: {
  campaignId: string;
  sourceNode: CreativeFlowNode;
  existingNodes: CreativeFlowNode[];
  now: () => string;
}): ImageGenerationFanOutPlan {
  const properties = input.sourceNode.data.properties;

  if (!isImageGenerationNodeProperties(properties)) {
    throw new Error("source node must be an Image Block");
  }

  const batchId = createStableBatchId(input.sourceNode.id, input.now());
  const count = properties.batchCount;
  const createdNodes = Array.from({ length: count }, (_, index) =>
    createQueuedImageGenerationNode({
      sourceNode: input.sourceNode,
      sourceProperties: properties,
      batchId,
      index,
    }),
  );

  return {
    batchId,
    createdNodes,
    batch: createGenerationBatchRequest({
      batchId,
      campaignId: input.campaignId,
      sourceNodeId: input.sourceNode.id,
      prompt: properties.prompt,
      provider: properties.providerId,
      model: properties.modelSlug,
      aspectRatio: properties.aspectRatio,
      nodeIds: createdNodes.map((node) => node.id),
      parameters: {},
    }),
  };
}

function createQueuedImageGenerationNode(input: {
  sourceNode: CreativeFlowNode;
  sourceProperties: ImageGenerationNodeProperties;
  batchId: string;
  index: number;
}): CreativeFlowNode {
  const column = input.index % 4;
  const row = Math.floor(input.index / 4);
  const id = `${input.batchId}_${input.index + 1}`;
  const properties = createImageGenerationNodeProperties({
    ...input.sourceProperties,
    latestResultRefs: {
      generatedAssetIds: [],
      metadataRunId: null,
      costUsageRunId: null,
    },
    uiState: {
      ...input.sourceProperties.uiState,
      status: "queued",
      progressPercent: null,
      statusMessage: "Queued",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId: null,
      outputConnectionReady: false,
    },
  });

  return {
    ...input.sourceNode,
    id,
    selected: input.index === 0,
    position: {
      x: input.sourceNode.position.x + 340 + column * 380,
      y: input.sourceNode.position.y + row * 700,
    },
    data: {
      ...input.sourceNode.data,
      id,
      status: "DRAFT",
      properties,
    },
  };
}

function createStableBatchId(sourceNodeId: string, isoTimestamp: string): string {
  const timestamp = isoTimestamp.replace(/\D/g, "").slice(0, 17);
  return `${sourceNodeId}_batch_${timestamp}`;
}
```

- [ ] **Step 5: Run fan-out tests**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts app/features/creative-canvas/adapters/image-generation-fanout.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run existing adapter tests**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/features/creative-canvas/model/image-generation-node.ts app/features/creative-canvas/adapters/image-generation-fanout.ts app/features/creative-canvas/adapters/image-generation-fanout.test.ts
git commit -m "feat: plan image generation fan-out batches"
```

---

### Task 5: Wire the Image Block Run Action to the Fan-Out Slice

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`

- [ ] **Step 1: Add a focused component source test for run wiring**

Append this test to `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`:

```ts
test("Image Block run buttons call the fan-out run handler", () => {
  const creativeCanvasScreen = readCreativeCanvasScreenSource();
  const imageNodeSource = getFunctionSource(
    creativeCanvasScreen,
    "function FreepikReferenceImageNode",
  );

  assert.match(creativeCanvasScreen, /createImageGenerationFanOutPlan/);
  assert.match(creativeCanvasScreen, /submitImageGenerationBatch/);
  assert.match(imageNodeSource, /onRunImageGeneration/);
  assert.match(imageNodeSource, /aria-label="Run image node"[\s\S]*onClick=\{onRunImageGeneration\}/);
  assert.match(imageNodeSource, /aria-label="Generate image"[\s\S]*onClick=\{onRunImageGeneration\}/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: FAIL because run wiring does not exist yet.

- [ ] **Step 3: Import the fan-out helpers**

In `app/features/creative-canvas/components/creative-canvas-screen.tsx`, add imports:

```ts
import { createImageGenerationFanOutPlan } from "../adapters/image-generation-fanout";
import type {
  GenerationBatchRequest,
  GenerationBatchResponse,
} from "../model/generation-batch";
```

- [ ] **Step 4: Add a batch submit helper inside `CreativeCanvasScreen`**

Near the other handler functions inside `CreativeCanvasScreen`, add:

```ts
  const submitImageGenerationBatch = async (
    batch: GenerationBatchRequest,
  ): Promise<GenerationBatchResponse | null> => {
    const response = await fetch(
      `/api/campaigns/${encodeURIComponent(campaign.id)}/generation/batches`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(batch),
      },
    );

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as {
      batch?: GenerationBatchResponse;
    };

    return body.batch ?? null;
  };
```

- [ ] **Step 5: Add the run handler**

Inside `CreativeCanvasScreen`, add:

```ts
  const runImageGenerationNode = async (nodeId: string) => {
    const sourceNode = canvasSnapshotRef.current.nodes.find(
      (node) => node.id === nodeId,
    );

    if (!sourceNode || !isImageGenerationNodeProperties(sourceNode.data.properties)) {
      return;
    }

    const plan = createImageGenerationFanOutPlan({
      campaignId: campaign.id,
      sourceNode,
      existingNodes: canvasSnapshotRef.current.nodes,
      now: () => new Date().toISOString(),
    });
    const nextNodes = [
      ...canvasSnapshotRef.current.nodes.map((node) => ({
        ...node,
        selected: false,
      })),
      ...plan.createdNodes,
    ];
    const nextEdges = canvasSnapshotRef.current.edges;
    const nextCampaign = syncCampaignFromCreativeCanvasInteraction(
      campaign,
      nextNodes,
      nextEdges,
    );

    setNodes(nextNodes);
    setEdges(nextEdges);
    onCampaignChange?.(nextCampaign);

    window.setTimeout(() => {
      reactFlowInstanceRef.current?.fitView({
        nodes: plan.createdNodes.map((node) => ({ id: node.id })),
        padding: 0.24,
        duration: 420,
      });
    }, 0);

    const response = await submitImageGenerationBatch(plan.batch);

    if (response === null) {
      return;
    }

    // Result-to-node persistence is implemented in the next plan task.
    // This first wiring step keeps queued fan-out visible and proves the
    // React Router -> Go service bridge with a stable batch contract.
  };
```

If TypeScript rejects the comment-only result section due unused `response`, replace the final block with:

```ts
    if (response !== null && response.results.length === 0) {
      return;
    }
```

- [ ] **Step 6: Pass the handler to Image Block nodes**

Where `FreepikReferenceImageNode` is rendered, add:

```tsx
onRunImageGeneration={() => runImageGenerationNode(data.id)}
```

Add the prop to `FreepikReferenceImageNode`:

```ts
  onRunImageGeneration,
```

and to the prop type:

```ts
  onRunImageGeneration: () => void;
```

- [ ] **Step 7: Attach the handler to both run buttons**

In `FreepikReferenceImageNode`, change the toolbar run button to:

```tsx
<button type="button" aria-label="Run image node" onClick={onRunImageGeneration}>
  <Play className="size-4" fill="currentColor" />
</button>
```

Change the floating run button to:

```tsx
<button
  className="space-run-button nodrag"
  type="button"
  aria-label="Generate image"
  onClick={onRunImageGeneration}
>
  <Play className="size-4" fill="currentColor" />
</button>
```

- [ ] **Step 8: Run focused tests**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/adapters/image-generation-fanout.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add app/features/creative-canvas/components/creative-canvas-screen.tsx app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
git commit -m "feat: fan out image blocks on run"
```

---

### Task 6: Verify the First Slice Manually

**Files:**
- Modify: `wiki/log.md`
- Optional artifact: `output/playwright/go-generation-fanout-slice.png`

- [ ] **Step 1: Run the full focused automated suite**

Run:

```bash
cd generation && go test ./...
```

Expected: PASS.

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts app/features/creative-canvas/adapters/image-generation-fanout.test.ts app/routes/campaign-generation-api.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: PASS.

Run:

```bash
npm run typecheck
```

Expected: PASS.

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 2: Start the local generation service**

Run:

```bash
cd generation && go run ./cmd/owncanvas-generation
```

Expected: Terminal prints `OwnCanvas generation service listening on http://127.0.0.1:8787`.

- [ ] **Step 3: Start the web app**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Expected: React Router dev server starts.

- [ ] **Step 4: Manual browser QA**

Open a campaign canvas.

Use the Image Block count control or temporary test state to set `batchCount` to `3`.

Click the Image Block run button.

Expected:

- Three same-type Image Blocks appear immediately.
- The new blocks show queued state in their properties and visible state.
- The viewport pans or zooms to show the batch.
- The browser calls `/api/campaigns/:campaignId/generation/batches`.
- The React Router route calls `http://127.0.0.1:8787/v1/generation/batches`.
- The Go service returns three successful mock results.

- [ ] **Step 5: Record wiki log**

Append to `wiki/log.md`:

```md
## [2026-05-17] go-backed-generation-first-slice | Superpowers execution

- Go-backed generation first slice added local Go service contract, React Router bridge, and Image Block xN fan-out wiring.
- The first slice uses deterministic mock provider output to verify fan-out UX and service boundary before real provider-key smoke.
- Verification: `go test ./generation/...`, focused TypeScript tests, `npm run typecheck`, `npm run build`, and browser QA screenshot `output/playwright/go-generation-fanout-slice.png`.
```

- [ ] **Step 6: Commit verification log**

```bash
git add wiki/log.md output/playwright/go-generation-fanout-slice.png
git commit -m "docs: log generation fan-out slice qa"
```

---

## Self-Review

**Spec coverage:**

- `#20` is partially covered: Go service, concurrent runner, provider seam, local HTTP server. Real Replicate remote smoke is deliberately left for the next plan after the contract is stable.
- `#21` is covered: React Router route forwards to local Go service and handles unavailable service.
- `#22` is partially covered: xN same-type node fan-out, queued state, layout, viewport fit. The count UI control itself may need a follow-up if the current chip is not interactive.
- `#23` is not fully covered: completed result persistence and failed retry affordance are the next plan after the route returns stable responses.
- `#24` is prepared: focused automated tests and manual QA path are defined for this first slice.

**Placeholder scan:**

- No placeholder markers.
- No undefined function names without a creation step.
- The only intentional non-final piece is result-to-node persistence, explicitly scoped to the next plan because the immediate action is contract plus visible fan-out.

**Type consistency:**

- Go and TypeScript both use `GenerationSpec`, `GenerationBatch`, `GenerationJob`, and statuses `queued`, `running`, `succeeded`, `failed`.
- Image Block `batchCount` is widened to `1..10` before the fan-out adapter uses x10.
- Route path is `api/campaigns/:campaignId/generation/batches` in `app/routes.ts` and `/api/campaigns/${campaign.id}/generation/batches` in the client.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-go-backed-parallel-generation-slice.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, and keep context narrow. Use this if the goal is maximum care around Go/React/UI boundaries.

2. **Inline Execution** - Execute tasks in this session using `superpowers:executing-plans`, with checkpoints after each commit.

Recommended next action: choose Subagent-Driven and start with Task 1 plus Task 3 in parallel only as read-only preparatory review. Implementation should proceed sequentially from Task 1 to avoid contract drift.
