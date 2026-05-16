package generation

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const mockGeneratedAt = "2026-05-17T00:00:00Z"

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
		response.Header().Set("allow", http.MethodPost)
		writeJSON(response, http.StatusMethodNotAllowed, map[string]string{
			"code":    "method_not_allowed",
			"message": "generation batches require POST",
		})
		return
	}

	decoder := json.NewDecoder(request.Body)
	var batch GenerationBatch
	if err := decoder.Decode(&batch); err != nil {
		writeJSON(response, http.StatusBadRequest, map[string]string{
			"code":    "invalid_json",
			"message": "request body must be valid JSON",
		})
		return
	}
	var trailingToken any
	if err := decoder.Decode(&trailingToken); err != io.EOF {
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
		GeneratedAt:       mockGeneratedAt,
	}, nil
}
