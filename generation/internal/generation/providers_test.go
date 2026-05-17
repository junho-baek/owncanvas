package generation

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func TestReplicateProviderCreatesPredictionAndMapsSuccessfulImageOutput(t *testing.T) {
	var gotPath string
	var gotAuthorization string
	var gotPrefer string
	var gotBody map[string]any

	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		gotPath = request.URL.Path
		gotAuthorization = request.Header.Get("authorization")
		gotPrefer = request.Header.Get("prefer")
		if err := json.NewDecoder(request.Body).Decode(&gotBody); err != nil {
			return nil, err
		}

		return jsonResponse(200, `{
			"id": "replicate_prediction_123",
			"status": "succeeded",
			"output": ["https://replicate.delivery/pbxt/generated-output.webp"],
			"completed_at": "2026-05-17T01:02:03.456Z"
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:    "test-token",
		BaseURL:     "https://api.test.replicate.local",
		HTTPClient:  httpClient,
		WaitSeconds: 7,
		Now: func() time.Time {
			return time.Date(2026, 5, 17, 3, 4, 5, 0, time.UTC)
		},
	})

	result, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_1",
		NodeID:      "node_1",
		Prompt:      "coral product shot",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "9:16",
		Parameters: map[string]any{
			"output_format": "webp",
			"seed":          float64(123),
		},
	})
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}

	if gotPath != "/v1/models/google/nano-banana/predictions" {
		t.Fatalf("path = %q, want Replicate model prediction endpoint", gotPath)
	}
	if gotAuthorization != "Bearer test-token" {
		t.Fatalf("authorization header = %q", gotAuthorization)
	}
	if gotPrefer != "wait=7" {
		t.Fatalf("prefer header = %q", gotPrefer)
	}

	input, ok := gotBody["input"].(map[string]any)
	if !ok {
		t.Fatalf("request input = %#v", gotBody["input"])
	}
	if input["prompt"] != "coral product shot" {
		t.Fatalf("prompt input = %#v", input["prompt"])
	}
	if input["aspect_ratio"] != "9:16" {
		t.Fatalf("aspect_ratio input = %#v", input["aspect_ratio"])
	}
	if input["output_format"] != "webp" {
		t.Fatalf("output_format input = %#v", input["output_format"])
	}
	if input["seed"] != float64(123) {
		t.Fatalf("seed input = %#v", input["seed"])
	}

	if result.JobID != "job_1" || result.NodeID != "node_1" {
		t.Fatalf("result ids = %q/%q", result.JobID, result.NodeID)
	}
	if result.Status != JobStatusSucceeded {
		t.Fatalf("status = %q", result.Status)
	}
	if result.ProviderRequestID != "replicate_prediction_123" {
		t.Fatalf("providerRequestId = %q", result.ProviderRequestID)
	}
	if result.ProviderURL != "https://replicate.delivery/pbxt/generated-output.webp" {
		t.Fatalf("providerUrl = %q", result.ProviderURL)
	}
	if result.MimeType != "image/webp" {
		t.Fatalf("mimeType = %q", result.MimeType)
	}
	if result.Width != 576 || result.Height != 1024 {
		t.Fatalf("dimensions = %dx%d", result.Width, result.Height)
	}
	if result.GeneratedAt != "2026-05-17T01:02:03Z" {
		t.Fatalf("generatedAt = %q", result.GeneratedAt)
	}
}

func TestReplicateProviderClampsSyncWaitHeaderButKeepsPollingBudget(t *testing.T) {
	var gotPrefer string

	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		gotPrefer = request.Header.Get("prefer")
		return jsonResponse(200, `{
			"id": "replicate_prediction_wait",
			"status": "succeeded",
			"output": "https://replicate.delivery/pbxt/generated-output.png"
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:    "test-token",
		BaseURL:     "https://api.test.replicate.local",
		HTTPClient:  httpClient,
		WaitSeconds: 300,
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_wait",
		NodeID:      "node_wait",
		Prompt:      "coral product shot",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "1:1",
		Parameters:  map[string]any{},
	})
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}

	if gotPrefer != "wait=60" {
		t.Fatalf("Prefer = %q, want wait=60", gotPrefer)
	}
}

func TestReplicateProviderPollsProcessingPredictionAndMapsVideoOutput(t *testing.T) {
	var requestedPaths []string

	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		requestedPaths = append(requestedPaths, request.URL.Path)

		switch request.Method + " " + request.URL.Path {
		case "POST /v1/models/bytedance/seedance-1-lite/predictions":
			return jsonResponse(200, `{
				"id": "seedance_processing",
				"status": "processing",
				"output": null,
				"urls": {
					"get": "https://api.test.replicate.local/v1/predictions/seedance_processing"
				}
			}`), nil
		case "GET /v1/predictions/seedance_processing":
			return jsonResponse(200, `{
				"id": "seedance_processing",
				"status": "succeeded",
				"output": "https://replicate.delivery/pbxt/owncanvas-ceo-animation.mp4",
				"completed_at": "2026-05-17T04:05:06Z"
			}`), nil
		default:
			t.Fatalf("unexpected replicate request %s %s", request.Method, request.URL.Path)
		}

		return nil, nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:     "test-token",
		BaseURL:      "https://api.test.replicate.local",
		HTTPClient:   httpClient,
		WaitSeconds:  3,
		PollInterval: time.Millisecond,
		Now: func() time.Time {
			return time.Date(2026, 5, 17, 3, 4, 5, 0, time.UTC)
		},
	})

	result, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_video",
		NodeID:      "video_node",
		MediaType:   "video",
		Prompt:      "educational 3D animation",
		Provider:    "replicate",
		Model:       "bytedance/seedance-1-lite",
		AspectRatio: "16:9",
		Parameters: map[string]any{
			"replicate": map[string]any{
				"input": map[string]any{
					"prompt":       "educational 3D animation",
					"duration":     float64(2),
					"resolution":   "480p",
					"aspect_ratio": "16:9",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}

	if len(requestedPaths) != 2 {
		t.Fatalf("requested paths = %#v, want create and poll", requestedPaths)
	}
	if result.ProviderRequestID != "seedance_processing" {
		t.Fatalf("providerRequestId = %q", result.ProviderRequestID)
	}
	if result.ProviderURL != "https://replicate.delivery/pbxt/owncanvas-ceo-animation.mp4" {
		t.Fatalf("providerUrl = %q", result.ProviderURL)
	}
	if result.MimeType != "video/mp4" {
		t.Fatalf("mimeType = %q, want video/mp4", result.MimeType)
	}
	if result.Width != 1024 || result.Height != 576 {
		t.Fatalf("dimensions = %dx%d, want 1024x576", result.Width, result.Height)
	}
	if result.GeneratedAt != "2026-05-17T04:05:06Z" {
		t.Fatalf("generatedAt = %q", result.GeneratedAt)
	}
}

func TestReplicateProviderUsesNestedReplicateInputParameters(t *testing.T) {
	var gotBody map[string]any
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if err := json.NewDecoder(request.Body).Decode(&gotBody); err != nil {
			return nil, err
		}
		return jsonResponse(200, `{
			"id": "replicate_prediction_nested",
			"status": "succeeded",
			"output": "https://replicate.delivery/pbxt/generated-output.png"
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "test-token",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
		Now: func() time.Time {
			return time.Date(2026, 5, 17, 3, 4, 5, 0, time.UTC)
		},
	})

	result, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_1",
		NodeID:      "node_1",
		Prompt:      "fallback prompt",
		Provider:    "replicate",
		Model:       "bytedance/seedream-3",
		AspectRatio: "1:1",
		Parameters: map[string]any{
			"replicate": map[string]any{
				"input": map[string]any{
					"prompt":         "nested prompt",
					"aspect_ratio":   "16:9",
					"guidance_scale": float64(3.5),
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}

	input := gotBody["input"].(map[string]any)
	if input["prompt"] != "nested prompt" {
		t.Fatalf("prompt input = %#v", input["prompt"])
	}
	if input["aspect_ratio"] != "16:9" {
		t.Fatalf("aspect_ratio input = %#v", input["aspect_ratio"])
	}
	if input["guidance_scale"] != float64(3.5) {
		t.Fatalf("guidance_scale input = %#v", input["guidance_scale"])
	}
	if result.MimeType != "image/png" {
		t.Fatalf("mimeType = %q", result.MimeType)
	}
	if result.GeneratedAt != "2026-05-17T03:04:05Z" {
		t.Fatalf("generatedAt = %q", result.GeneratedAt)
	}
}

func TestReplicateProviderUsesCreativeCanvasReplicatePayloadWithoutMetadata(t *testing.T) {
	var gotBody map[string]any
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if err := json.NewDecoder(request.Body).Decode(&gotBody); err != nil {
			return nil, err
		}
		return jsonResponse(200, `{
			"id": "replicate_prediction_canvas_payload",
			"status": "succeeded",
			"output": {"url": "https://replicate.delivery/pbxt/generated-output.png"}
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "test-token",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
		Now: func() time.Time {
			return time.Date(2026, 5, 17, 3, 4, 5, 0, time.UTC)
		},
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_1",
		NodeID:      "node_1",
		Prompt:      "fallback prompt",
		Provider:    "replicate",
		Model:       "bytedance/seedream-3",
		AspectRatio: "9:16",
		Parameters: map[string]any{
			"replicate": map[string]any{
				"providerId":         "replicate",
				"model":              "bytedance/seedream-3",
				"credentialEnvName":  ReplicateAPITokenEnvName,
				"inputEnvelopeField": "input",
				"input": map[string]any{
					"prompt":       "canvas prompt",
					"aspect_ratio": "9:16",
					"size":         "384x640",
				},
				"aspectRatio": map[string]any{
					"requested":     "9:16",
					"providerValue": "9:16",
					"mapped":        false,
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}

	input := gotBody["input"].(map[string]any)
	if input["prompt"] != "canvas prompt" {
		t.Fatalf("prompt input = %#v", input["prompt"])
	}
	if input["aspect_ratio"] != "9:16" {
		t.Fatalf("aspect_ratio input = %#v", input["aspect_ratio"])
	}
	if input["size"] != "384x640" {
		t.Fatalf("size input = %#v", input["size"])
	}
	for _, metadataKey := range []string{"providerId", "model", "credentialEnvName", "inputEnvelopeField", "aspectRatio", "replicate"} {
		if _, ok := input[metadataKey]; ok {
			t.Fatalf("replicate metadata key %q leaked into input: %#v", metadataKey, input)
		}
	}
}

func TestReplicateProviderMapsObjectOutputMetadataIntoCreativeOutputResult(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return jsonResponse(200, `{
			"id": "replicate_prediction_object",
			"status": "succeeded",
			"output": {
				"url": "https://replicate.delivery/pbxt/generated-output.jpeg",
				"mime_type": "image/jpeg",
				"width": 768,
				"height": 1024,
				"size_bytes": 456789
			},
			"completed_at": "2026-05-17T01:02:03Z"
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "test-token",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})

	result, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_object",
		NodeID:      "node_object",
		Prompt:      "coral product shot",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "1:1",
		Parameters:  map[string]any{},
	})
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}

	if result.ProviderURL != "https://replicate.delivery/pbxt/generated-output.jpeg" {
		t.Fatalf("providerUrl = %q", result.ProviderURL)
	}
	if result.MimeType != "image/jpeg" {
		t.Fatalf("mimeType = %q", result.MimeType)
	}
	if result.Width != 768 || result.Height != 1024 {
		t.Fatalf("dimensions = %dx%d", result.Width, result.Height)
	}
	if result.SizeBytes == nil || *result.SizeBytes != 456789 {
		t.Fatalf("sizeBytes = %#v, want 456789", result.SizeBytes)
	}
}

func TestReplicateProviderMapsNestedArrayOutputIntoCreativeOutputResult(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return jsonResponse(200, `{
			"id": "replicate_prediction_nested_output",
			"status": "succeeded",
			"output": {
				"images": [
					{
						"image": {
							"url": "https://replicate.delivery/pbxt/generated-output.png",
							"content_type": "image/png",
							"width": 640,
							"height": 832
						}
					}
				]
			}
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "test-token",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
		Now: func() time.Time {
			return time.Date(2026, 5, 17, 3, 4, 5, 0, time.UTC)
		},
	})

	result, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_nested",
		NodeID:      "node_nested",
		Prompt:      "coral product shot",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "9:16",
		Parameters:  map[string]any{},
	})
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}

	if result.ProviderRequestID != "replicate_prediction_nested_output" {
		t.Fatalf("providerRequestId = %q", result.ProviderRequestID)
	}
	if result.ProviderURL != "https://replicate.delivery/pbxt/generated-output.png" {
		t.Fatalf("providerUrl = %q", result.ProviderURL)
	}
	if result.MimeType != "image/png" {
		t.Fatalf("mimeType = %q", result.MimeType)
	}
	if result.Width != 640 || result.Height != 832 {
		t.Fatalf("dimensions = %dx%d", result.Width, result.Height)
	}
	if result.GeneratedAt != "2026-05-17T03:04:05Z" {
		t.Fatalf("generatedAt = %q", result.GeneratedAt)
	}
}

func TestParseReplicateCreativeOutputMapsSuccessfulProviderResponsesIntoCreativeOutputResults(t *testing.T) {
	type creativeOutputFixture struct {
		name          string
		output        string
		aspectRatio   string
		wantURI       string
		wantMimeType  string
		wantWidth     int
		wantHeight    int
		wantThumbnail string
		wantSizeBytes *int64
	}

	int64Ptr := func(value int64) *int64 {
		return &value
	}

	fixtures := []creativeOutputFixture{
		{
			name:         "string URL maps to Creative Output defaults",
			output:       `"https://replicate.delivery/pbxt/output.webp"`,
			aspectRatio:  "16:9",
			wantURI:      "https://replicate.delivery/pbxt/output.webp",
			wantMimeType: "image/webp",
			wantWidth:    1024,
			wantHeight:   576,
		},
		{
			name: "object URL preserves explicit Creative Output metadata",
			output: `{
				"url": "https://replicate.delivery/pbxt/output.jpeg",
				"mime_type": "image/jpeg",
				"width": 768,
				"height": 1024,
				"thumbnail_url": "https://replicate.delivery/pbxt/output-thumb.jpeg",
				"size_bytes": 456789
			}`,
			aspectRatio:   "1:1",
			wantURI:       "https://replicate.delivery/pbxt/output.jpeg",
			wantMimeType:  "image/jpeg",
			wantWidth:     768,
			wantHeight:    1024,
			wantThumbnail: "https://replicate.delivery/pbxt/output-thumb.jpeg",
			wantSizeBytes: int64Ptr(456789),
		},
		{
			name: "nested output maps first valid Creative Output",
			output: `{
				"files": [
					{"url": ""},
					{
						"file": {
							"uri": "https://replicate.delivery/pbxt/output.png",
							"contentType": "image/png",
							"width": 640,
							"height": 832,
							"sizeBytes": 3210
						}
					}
				]
			}`,
			aspectRatio:   "9:16",
			wantURI:       "https://replicate.delivery/pbxt/output.png",
			wantMimeType:  "image/png",
			wantWidth:     640,
			wantHeight:    832,
			wantSizeBytes: int64Ptr(3210),
		},
	}

	for _, fixture := range fixtures {
		t.Run(fixture.name, func(t *testing.T) {
			result, ok := parseReplicateCreativeOutput(json.RawMessage(fixture.output), fixture.aspectRatio)
			if !ok {
				t.Fatal("parseReplicateCreativeOutput did not return a Creative Output result")
			}

			if result.URI != fixture.wantURI {
				t.Fatalf("URI = %q, want %q", result.URI, fixture.wantURI)
			}
			if result.MimeType != fixture.wantMimeType {
				t.Fatalf("MimeType = %q, want %q", result.MimeType, fixture.wantMimeType)
			}
			if result.Width != fixture.wantWidth || result.Height != fixture.wantHeight {
				t.Fatalf("dimensions = %dx%d, want %dx%d", result.Width, result.Height, fixture.wantWidth, fixture.wantHeight)
			}
			if result.ThumbnailURI != fixture.wantThumbnail {
				t.Fatalf("ThumbnailURI = %q, want %q", result.ThumbnailURI, fixture.wantThumbnail)
			}
			if fixture.wantSizeBytes == nil {
				if result.SizeBytes != nil {
					t.Fatalf("SizeBytes = %d, want nil", *result.SizeBytes)
				}
			} else if result.SizeBytes == nil || *result.SizeBytes != *fixture.wantSizeBytes {
				t.Fatalf("SizeBytes = %#v, want %d", result.SizeBytes, *fixture.wantSizeBytes)
			}
		})
	}
}

func TestReplicateProviderMapsSuccessfulResponseFixtures(t *testing.T) {
	type successFixture struct {
		name            string
		responseBody    string
		aspectRatio     string
		wantURL         string
		wantMimeType    string
		wantWidth       int
		wantHeight      int
		wantThumbnail   string
		wantGeneratedAt string
	}

	fixtures := []successFixture{
		{
			name: "string output uses URL extension and aspect ratio dimensions",
			responseBody: `{
				"id": "prediction_string_output",
				"status": "succeeded",
				"output": "https://replicate.delivery/pbxt/output.webp"
			}`,
			aspectRatio:     "16:9",
			wantURL:         "https://replicate.delivery/pbxt/output.webp",
			wantMimeType:    "image/webp",
			wantWidth:       1024,
			wantHeight:      576,
			wantGeneratedAt: "2026-05-17T03:04:05Z",
		},
		{
			name: "object output preserves explicit creative output metadata",
			responseBody: `{
				"id": "prediction_object_output",
				"status": "succeeded",
				"output": {
					"uri": "https://replicate.delivery/pbxt/output.png",
					"mimeType": "image/png",
					"width": 896,
					"height": 1152,
					"thumbnailUrl": "https://replicate.delivery/pbxt/output-thumb.png"
				},
				"completed_at": "2026-05-17T01:02:03Z"
			}`,
			aspectRatio:     "1:1",
			wantURL:         "https://replicate.delivery/pbxt/output.png",
			wantMimeType:    "image/png",
			wantWidth:       896,
			wantHeight:      1152,
			wantThumbnail:   "https://replicate.delivery/pbxt/output-thumb.png",
			wantGeneratedAt: "2026-05-17T01:02:03Z",
		},
		{
			name: "nested files output maps first valid creative output",
			responseBody: `{
				"id": "prediction_nested_files_output",
				"status": "succeeded",
				"output": {
					"files": [
						{"url": ""},
						{
							"file": "https://replicate.delivery/pbxt/output.jpeg",
							"contentType": "image/jpeg",
							"width": 768,
							"height": 1024
						}
					]
				}
			}`,
			aspectRatio:     "9:16",
			wantURL:         "https://replicate.delivery/pbxt/output.jpeg",
			wantMimeType:    "image/jpeg",
			wantWidth:       768,
			wantHeight:      1024,
			wantGeneratedAt: "2026-05-17T03:04:05Z",
		},
	}

	for _, fixture := range fixtures {
		t.Run(fixture.name, func(t *testing.T) {
			httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
				return jsonResponse(200, fixture.responseBody), nil
			})}

			provider := NewReplicateProvider(ReplicateProviderConfig{
				APIToken:   "test-token",
				BaseURL:    "https://api.test.replicate.local",
				HTTPClient: httpClient,
				Now: func() time.Time {
					return time.Date(2026, 5, 17, 3, 4, 5, 0, time.UTC)
				},
			})

			result, err := provider.Generate(context.Background(), GenerationJob{
				JobID:       "job_fixture",
				NodeID:      "node_fixture",
				Prompt:      "fixture prompt",
				Provider:    "replicate",
				Model:       "google/nano-banana",
				AspectRatio: fixture.aspectRatio,
				Parameters:  map[string]any{},
			})
			if err != nil {
				t.Fatalf("Generate returned error: %v", err)
			}

			if result.JobID != "job_fixture" || result.NodeID != "node_fixture" {
				t.Fatalf("result ids = %q/%q", result.JobID, result.NodeID)
			}
			if result.Status != JobStatusSucceeded {
				t.Fatalf("status = %q", result.Status)
			}
			if result.ProviderURL != fixture.wantURL {
				t.Fatalf("providerUrl = %q, want %q", result.ProviderURL, fixture.wantURL)
			}
			if result.MimeType != fixture.wantMimeType {
				t.Fatalf("mimeType = %q, want %q", result.MimeType, fixture.wantMimeType)
			}
			if result.Width != fixture.wantWidth || result.Height != fixture.wantHeight {
				t.Fatalf("dimensions = %dx%d, want %dx%d", result.Width, result.Height, fixture.wantWidth, fixture.wantHeight)
			}
			if result.ThumbnailURI != fixture.wantThumbnail {
				t.Fatalf("thumbnailUri = %q, want %q", result.ThumbnailURI, fixture.wantThumbnail)
			}
			if result.GeneratedAt != fixture.wantGeneratedAt {
				t.Fatalf("generatedAt = %q, want %q", result.GeneratedAt, fixture.wantGeneratedAt)
			}
		})
	}
}

func TestReplicateProviderRejectsSucceededPredictionWithoutCreativeOutputURL(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return jsonResponse(200, `{
			"id": "replicate_prediction_without_output",
			"status": "succeeded",
			"output": [{"url": ""}, {"image": "not-a-url"}]
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "test-token",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_missing_output",
		NodeID:      "node_missing_output",
		Prompt:      "coral product shot",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "9:16",
		Parameters:  map[string]any{},
	})
	if err == nil {
		t.Fatal("Generate error is nil")
	}
	if err.Error() != `replicate prediction "replicate_prediction_without_output" did not return a Creative Output URL` {
		t.Fatalf("error = %q", err.Error())
	}
	assertExecutionError(t, err, "GenerationProviderInvalidResponse", GenerationErrorCategoryProviderResponse, true)
}

func TestReplicateProviderClassifiesTransportExecutionErrors(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return nil, errors.New("dial tcp: connection refused")
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "test-token",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_transport",
		NodeID:      "node_transport",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "1:1",
		Parameters:  map[string]any{},
	})
	if err == nil {
		t.Fatal("Generate error is nil")
	}
	assertExecutionError(t, err, "GenerationTransportRequestFailed", GenerationErrorCategoryTransport, true)
}

func TestReplicateProviderRedactsConfiguredTokenFromTransportErrors(t *testing.T) {
	const rawToken = "secret-replicate-token-123"
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return nil, errors.New("upstream rejected Authorization: Bearer " + rawToken)
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   rawToken,
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_transport_redaction",
		NodeID:      "node_transport_redaction",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "1:1",
		Parameters:  map[string]any{},
	})
	if err == nil {
		t.Fatal("Generate error is nil")
	}
	if strings.Contains(err.Error(), rawToken) {
		t.Fatalf("transport error leaked token: %q", err.Error())
	}
	if !strings.Contains(err.Error(), "Authorization: [redacted]") {
		t.Fatalf("transport error did not redact authorization header: %q", err.Error())
	}
}

func TestReplicateProviderClassifiesTransportResponseReadErrors(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: 200,
			Header:     http.Header{"content-type": []string{"application/json"}},
			Body:       io.NopCloser(errorReader{}),
		}, nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "test-token",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_transport_read",
		NodeID:      "node_transport_read",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "1:1",
		Parameters:  map[string]any{},
	})
	if err == nil {
		t.Fatal("Generate error is nil")
	}
	assertExecutionError(t, err, "GenerationTransportResponseReadFailed", GenerationErrorCategoryTransport, true)
}

func TestReplicateProviderMapsProviderAPIErrorResponsesIntoTypedFailures(t *testing.T) {
	type providerErrorFixture struct {
		name              string
		statusCode        int
		body              string
		wantName          string
		wantCategory      GenerationErrorCategory
		wantRetryable     bool
		wantMessage       string
		wantRawBodyAbsent string
	}

	fixtures := []providerErrorFixture{
		{
			name:          "unauthorized credential failure is not retryable",
			statusCode:    401,
			body:          `{"detail":"invalid api token"}`,
			wantName:      "GenerationProviderAuthenticationFailed",
			wantCategory:  GenerationErrorCategoryProviderConfiguration,
			wantRetryable: false,
			wantMessage:   "replicate prediction request failed with status 401: invalid api token",
		},
		{
			name:          "validation rejection uses provider detail",
			statusCode:    422,
			body:          `{"detail":"prompt was rejected"}`,
			wantName:      "GenerationProviderRejectedRequest",
			wantCategory:  GenerationErrorCategoryProviderRejected,
			wantRetryable: false,
			wantMessage:   "replicate prediction request failed with status 422: prompt was rejected",
		},
		{
			name:          "validation rejection joins nested detail messages",
			statusCode:    400,
			body:          `{"detail":[{"msg":"prompt is required"},{"message":"model is unsupported"}]}`,
			wantName:      "GenerationProviderRejectedRequest",
			wantCategory:  GenerationErrorCategoryProviderRejected,
			wantRetryable: false,
			wantMessage:   "replicate prediction request failed with status 400: prompt is required; model is unsupported",
		},
		{
			name:          "rate limit is retryable",
			statusCode:    429,
			body:          `{"error":{"message":"too many predictions"}}`,
			wantName:      "GenerationProviderRateLimited",
			wantCategory:  GenerationErrorCategoryProviderRejected,
			wantRetryable: true,
			wantMessage:   "replicate prediction request failed with status 429: too many predictions",
		},
		{
			name:          "provider outage is retryable",
			statusCode:    503,
			body:          `{"title":"provider unavailable"}`,
			wantName:      "GenerationProviderUnavailable",
			wantCategory:  GenerationErrorCategoryProviderRejected,
			wantRetryable: true,
			wantMessage:   "replicate prediction request failed with status 503: provider unavailable",
		},
		{
			name:              "malformed provider error body falls back to trimmed body",
			statusCode:        500,
			body:              `  upstream gateway failed  `,
			wantName:          "GenerationProviderUnavailable",
			wantCategory:      GenerationErrorCategoryProviderRejected,
			wantRetryable:     true,
			wantMessage:       "replicate prediction request failed with status 500: upstream gateway failed",
			wantRawBodyAbsent: "{",
		},
	}

	for _, fixture := range fixtures {
		t.Run(fixture.name, func(t *testing.T) {
			httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
				return jsonResponse(fixture.statusCode, fixture.body), nil
			})}

			provider := NewReplicateProvider(ReplicateProviderConfig{
				APIToken:   "test-token",
				BaseURL:    "https://api.test.replicate.local",
				HTTPClient: httpClient,
			})

			_, err := provider.Generate(context.Background(), GenerationJob{
				JobID:       "job_rejected",
				NodeID:      "node_rejected",
				Provider:    "replicate",
				Model:       "google/nano-banana",
				AspectRatio: "1:1",
				Parameters:  map[string]any{},
			})
			if err == nil {
				t.Fatal("Generate error is nil")
			}
			assertExecutionError(t, err, fixture.wantName, fixture.wantCategory, fixture.wantRetryable)
			if err.Error() != fixture.wantMessage {
				t.Fatalf("error = %q, want %q", err.Error(), fixture.wantMessage)
			}
			if fixture.wantRawBodyAbsent != "" && strings.Contains(err.Error(), fixture.wantRawBodyAbsent) {
				t.Fatalf("error leaked raw provider body: %q", err.Error())
			}
		})
	}
}

func TestReplicateProviderRedactsSecretsFromProviderErrorResponses(t *testing.T) {
	const rawToken = "secret-replicate-token-456"
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return jsonResponse(401, `{
			"detail": "authorization=Bearer secret-replicate-token-456 token=secret-replicate-token-456"
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   rawToken,
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_rejected_redaction",
		NodeID:      "node_rejected_redaction",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "1:1",
		Parameters:  map[string]any{},
	})
	if err == nil {
		t.Fatal("Generate error is nil")
	}
	if strings.Contains(err.Error(), rawToken) {
		t.Fatalf("provider error leaked token: %q", err.Error())
	}
	if strings.Contains(strings.ToLower(err.Error()), "token=secret") {
		t.Fatalf("provider error leaked token assignment: %q", err.Error())
	}
	if !strings.Contains(err.Error(), "[redacted]") {
		t.Fatalf("provider error did not include redaction marker: %q", err.Error())
	}
}

func TestReplicateProviderRedactsSecretsFromTerminalPredictionFailure(t *testing.T) {
	const rawToken = "secret-replicate-token-789"
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return jsonResponse(200, `{
			"id": "replicate_prediction_failed",
			"status": "failed",
			"error": {
				"message": "provider echoed secret-replicate-token-789"
			}
		}`), nil
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   rawToken,
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_terminal_redaction",
		NodeID:      "node_terminal_redaction",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "1:1",
		Parameters:  map[string]any{},
	})
	if err == nil {
		t.Fatal("Generate error is nil")
	}
	if strings.Contains(err.Error(), rawToken) {
		t.Fatalf("terminal prediction error leaked token: %q", err.Error())
	}
	if !strings.Contains(err.Error(), "[redacted]") {
		t.Fatalf("terminal prediction error did not include redaction marker: %q", err.Error())
	}
}

func TestReplicateProviderFailsClearlyWithoutTokenBeforeProviderExecution(t *testing.T) {
	transportCalled := false
	httpClient := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		transportCalled = true
		t.Fatalf("HTTP transport was called for missing %s", ReplicateAPITokenEnvName)
		return nil, errors.New("unexpected provider execution")
	})}

	provider := NewReplicateProvider(ReplicateProviderConfig{
		APIToken:   "   ",
		BaseURL:    "https://api.test.replicate.local",
		HTTPClient: httpClient,
	})

	_, err := provider.Generate(context.Background(), GenerationJob{
		JobID:       "job_missing_token",
		NodeID:      "node_missing_token",
		Prompt:      "coral product shot",
		Provider:    "replicate",
		Model:       "google/nano-banana",
		AspectRatio: "1:1",
		Parameters:  map[string]any{},
	})
	if err == nil {
		t.Fatal("Generate error is nil")
	}
	if transportCalled {
		t.Fatal("provider attempted HTTP execution before checking the token")
	}
	if err.Error() != "replicate provider requires OWNCANVAS_REPLICATE_API_TOKEN" {
		t.Fatalf("error = %q", err.Error())
	}
	assertExecutionError(t, err, "GenerationProviderMissingCredential", GenerationErrorCategoryProviderConfiguration, false)
}

func TestNewProviderFromEnvironmentConfiguresReplicateWithToken(t *testing.T) {
	t.Setenv(ReplicateAPITokenEnvName, "  env-token  ")
	t.Setenv(ReplicateBaseURLEnvName, "https://replicate.test.local/")
	t.Setenv(ReplicateWaitSecondsEnvName, "11")

	routingProvider, ok := NewProviderFromEnvironment().(RoutingProvider)
	if !ok {
		t.Fatal("NewProviderFromEnvironment did not return RoutingProvider")
	}
	replicateProvider, ok := routingProvider.providers["replicate"].(ReplicateProvider)
	if !ok {
		t.Fatalf("replicate provider = %T, want ReplicateProvider", routingProvider.providers["replicate"])
	}
	if replicateProvider.apiToken != "env-token" {
		t.Fatalf("apiToken = %q", replicateProvider.apiToken)
	}
	if replicateProvider.baseURL != "https://replicate.test.local" {
		t.Fatalf("baseURL = %q", replicateProvider.baseURL)
	}
	if replicateProvider.waitSeconds != 11 {
		t.Fatalf("waitSeconds = %d", replicateProvider.waitSeconds)
	}
}

func TestNewProviderFromEnvironmentKeepsMockAndFailsReplicateWithoutToken(t *testing.T) {
	t.Setenv(ReplicateAPITokenEnvName, "")
	t.Setenv(ReplicateBaseURLEnvName, "")
	t.Setenv(ReplicateWaitSecondsEnvName, "")

	provider := NewProviderFromEnvironment()

	mockResult, err := provider.Generate(context.Background(), GenerationJob{
		JobID:    "job_mock",
		NodeID:   "node_mock",
		Provider: "mock",
	})
	if err != nil {
		t.Fatalf("mock Generate returned error: %v", err)
	}
	if mockResult.ProviderRequestID != "mock_request_job_mock" {
		t.Fatalf("mock providerRequestId = %q", mockResult.ProviderRequestID)
	}

	_, err = provider.Generate(context.Background(), GenerationJob{
		JobID:    "job_replicate",
		NodeID:   "node_replicate",
		Provider: "replicate",
		Model:    "owner/model",
	})
	if err == nil {
		t.Fatal("replicate Generate error is nil")
	}
	if err.Error() != "replicate provider requires OWNCANVAS_REPLICATE_API_TOKEN" {
		t.Fatalf("error = %q", err.Error())
	}
	assertExecutionError(t, err, "GenerationProviderMissingCredential", GenerationErrorCategoryProviderConfiguration, false)
}

func TestRoutingProviderSelectsReplicateAndPreservesMockProvider(t *testing.T) {
	provider := NewRoutingProvider(map[string]Provider{
		"mock": providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
			return GenerationResult{ProviderRequestID: "mock_" + job.JobID}, nil
		}),
		"replicate": providerFunc(func(ctx context.Context, job GenerationJob) (GenerationResult, error) {
			return GenerationResult{ProviderRequestID: "replicate_" + job.JobID}, nil
		}),
	})

	mockResult, err := provider.Generate(context.Background(), GenerationJob{
		JobID:    "job_1",
		Provider: "mock",
	})
	if err != nil {
		t.Fatalf("mock Generate returned error: %v", err)
	}
	if mockResult.ProviderRequestID != "mock_job_1" {
		t.Fatalf("mock providerRequestId = %q", mockResult.ProviderRequestID)
	}

	replicateResult, err := provider.Generate(context.Background(), GenerationJob{
		JobID:    "job_2",
		Provider: "replicate",
	})
	if err != nil {
		t.Fatalf("replicate Generate returned error: %v", err)
	}
	if replicateResult.ProviderRequestID != "replicate_job_2" {
		t.Fatalf("replicate providerRequestId = %q", replicateResult.ProviderRequestID)
	}
}

func jsonResponse(statusCode int, body string) *http.Response {
	return &http.Response{
		StatusCode: statusCode,
		Header:     http.Header{"content-type": []string{"application/json"}},
		Body:       io.NopCloser(bytes.NewBufferString(body)),
	}
}

type errorReader struct{}

func (errorReader) Read(p []byte) (int, error) {
	return 0, errors.New("connection reset while reading response")
}

func assertExecutionError(t *testing.T, err error, wantName string, wantCategory GenerationErrorCategory, wantRetryable bool) {
	t.Helper()

	var executionError ExecutionError
	if !errors.As(err, &executionError) {
		t.Fatalf("error type = %T, want ExecutionError", err)
	}
	if executionError.Name != wantName {
		t.Fatalf("execution error name = %q, want %q", executionError.Name, wantName)
	}
	if executionError.Category != wantCategory {
		t.Fatalf("execution error category = %q, want %q", executionError.Category, wantCategory)
	}
	if executionError.Retryable != wantRetryable {
		t.Fatalf("execution error retryable = %v, want %v", executionError.Retryable, wantRetryable)
	}
}
