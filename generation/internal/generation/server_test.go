package generation

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
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

	firstResponse := executeBatchRequest(t, server, body)
	secondResponse := executeBatchRequest(t, server, body)

	if firstResponse.BatchID != "batch_http" {
		t.Fatalf("unexpected batch id: %s", firstResponse.BatchID)
	}
	if len(firstResponse.Results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(firstResponse.Results))
	}
	if len(secondResponse.Results) != len(firstResponse.Results) {
		t.Fatalf("second response results = %d, want %d", len(secondResponse.Results), len(firstResponse.Results))
	}
	for index, result := range firstResponse.Results {
		if result.Status != JobStatusSucceeded {
			t.Fatalf("expected success result, got %#v", result)
		}
		if result.ProviderRequestID == "" {
			t.Fatalf("expected provider request ID, got %#v", result)
		}
		if result.ProviderURL == "" {
			t.Fatalf("expected provider URL, got %#v", result)
		}
		if result.MimeType != "image/png" {
			t.Fatalf("expected image/png result, got %#v", result)
		}
		if result.Width != 1024 || result.Height != 1024 {
			t.Fatalf("expected 1024x1024 result, got %#v", result)
		}
		if result.GeneratedAt != mockGeneratedAt {
			t.Fatalf("generatedAt = %q, want %q", result.GeneratedAt, mockGeneratedAt)
		}
		if secondResponse.Results[index].GeneratedAt != result.GeneratedAt {
			t.Fatalf("second generatedAt = %q, want repeated value %q", secondResponse.Results[index].GeneratedAt, result.GeneratedAt)
		}
		if _, err := time.Parse(time.RFC3339, result.GeneratedAt); err != nil {
			t.Fatalf("generatedAt = %q, want RFC3339 string: %v", result.GeneratedAt, err)
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
	if recorder.Header().Get("allow") != http.MethodPost {
		t.Fatalf("Allow header = %q, want POST", recorder.Header().Get("allow"))
	}
	assertJSONError(t, recorder.Body.Bytes(), "method_not_allowed", "generation batches require POST")
}

func TestServerRejectsUnknownPath(t *testing.T) {
	server := NewServer(NewService(MockProvider{}, ServiceOptions{}))
	request := httptest.NewRequest(http.MethodPost, "/v1/generation/unknown", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
	assertJSONError(t, recorder.Body.Bytes(), "not_found", "generation endpoint was not found")
}

func TestServerRejectsInvalidJSON(t *testing.T) {
	server := NewServer(NewService(MockProvider{}, ServiceOptions{}))
	request := httptest.NewRequest(http.MethodPost, "/v1/generation/batches", bytes.NewBufferString("{"))
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
	assertJSONError(t, recorder.Body.Bytes(), "invalid_json", "request body must be valid JSON")
}

func TestServerRejectsTrailingJSONTokens(t *testing.T) {
	server := NewServer(NewService(MockProvider{}, ServiceOptions{}))
	body := []byte(`{
		"batchId": "batch_trailing",
		"campaignId": "campaign_trailing",
		"sourceNodeId": "source_image",
		"fanOutCount": 1,
		"jobs": [
			{"jobId":"job_1","nodeId":"node_1","prompt":"same prompt","provider":"mock","model":"mock-image","aspectRatio":"9:16","parameters":{}}
		]
	} {}`)
	request := httptest.NewRequest(http.MethodPost, "/v1/generation/batches", bytes.NewReader(body))
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
	assertJSONError(t, recorder.Body.Bytes(), "invalid_json", "request body must be valid JSON")
}

func TestServerRejectsInvalidBatch(t *testing.T) {
	server := NewServer(NewService(MockProvider{}, ServiceOptions{}))
	body := []byte(`{
		"batchId": "batch_invalid",
		"campaignId": "campaign_invalid",
		"sourceNodeId": "source_image",
		"fanOutCount": 2,
		"jobs": [
			{"jobId":"job_1","nodeId":"node_1","prompt":"same prompt","provider":"mock","model":"mock-image","aspectRatio":"9:16","parameters":{}}
		]
	}`)
	request := httptest.NewRequest(http.MethodPost, "/v1/generation/batches", bytes.NewReader(body))
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
	assertJSONError(t, recorder.Body.Bytes(), "invalid_batch", "jobs length 1 must match fanOutCount 2")
}

func executeBatchRequest(t *testing.T, server *Server, body []byte) GenerationBatchResponse {
	t.Helper()

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
	return response
}

func assertJSONError(t *testing.T, body []byte, wantCode string, wantMessage string) {
	t.Helper()

	var response map[string]string
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("response was not JSON: %v", err)
	}
	if response["code"] != wantCode {
		t.Fatalf("error code = %q, want %q", response["code"], wantCode)
	}
	if response["message"] != wantMessage {
		t.Fatalf("error message = %q, want %q", response["message"], wantMessage)
	}
}
