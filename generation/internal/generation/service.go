package generation

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

const MaxFanOutCount = 10

type Provider interface {
	Generate(context.Context, GenerationJob) (GenerationResult, error)
}

type ExecutionError struct {
	Name      string
	Category  GenerationErrorCategory
	Message   string
	Retryable bool
	Err       error
}

func NewExecutionError(name string, category GenerationErrorCategory, message string, retryable bool, err error) ExecutionError {
	return ExecutionError{
		Name:      name,
		Category:  category,
		Message:   redactGenerationSecrets(message),
		Retryable: retryable,
		Err:       err,
	}
}

func (err ExecutionError) Error() string {
	if err.Message != "" {
		return err.Message
	}
	if err.Err != nil {
		return redactGenerationSecrets(err.Err.Error())
	}
	return "generation execution failed"
}

func (err ExecutionError) Unwrap() error {
	return err.Err
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

func (s *Service) ExecuteBatch(ctx context.Context, batch GenerationBatch) (GenerationBatchResponse, error) {
	if err := validateGenerationBatch(batch); err != nil {
		return GenerationBatchResponse{}, err
	}
	if s.provider == nil {
		return GenerationBatchResponse{}, errors.New("generation provider is required")
	}

	response := GenerationBatchResponse{
		BatchID: batch.BatchID,
		Results: make([]GenerationResult, len(batch.Jobs)),
	}

	maxConcurrency := s.maxConcurrency
	if maxConcurrency > len(batch.Jobs) {
		maxConcurrency = len(batch.Jobs)
	}

	var wg sync.WaitGroup
	jobs := make(chan int)

	for worker := 0; worker < maxConcurrency; worker++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for index := range jobs {
				job := batch.Jobs[index]
				result, err := s.provider.Generate(ctx, job)
				if err != nil {
					generationError := generationErrorFromExecutionError(err)
					response.Results[index] = GenerationResult{
						JobID:       job.JobID,
						NodeID:      job.NodeID,
						Status:      JobStatusFailed,
						GeneratedAt: time.Now().UTC().Format(time.RFC3339),
						Error:       &generationError,
					}
					continue
				}

				if result.JobID == "" {
					result.JobID = job.JobID
				}
				if result.NodeID == "" {
					result.NodeID = job.NodeID
				}
				if result.Status == "" {
					result.Status = JobStatusSucceeded
				}
				response.Results[index] = result
			}
		}()
	}

	for index := range batch.Jobs {
		select {
		case <-ctx.Done():
			close(jobs)
			wg.Wait()
			return GenerationBatchResponse{}, ctx.Err()
		case jobs <- index:
		}
	}

	close(jobs)
	wg.Wait()

	return response, nil
}

func validateGenerationBatch(batch GenerationBatch) error {
	if strings.TrimSpace(batch.BatchID) == "" {
		return errors.New("batchId is required")
	}
	if strings.TrimSpace(batch.CampaignID) == "" {
		return errors.New("campaignId is required")
	}
	if strings.TrimSpace(batch.SourceNodeID) == "" {
		return errors.New("sourceNodeId is required")
	}
	if batch.FanOutCount < 1 || batch.FanOutCount > MaxFanOutCount {
		return errors.New("fanOutCount must be between 1 and 10")
	}
	if len(batch.Jobs) != batch.FanOutCount {
		return fmt.Errorf("jobs length %d must match fanOutCount %d", len(batch.Jobs), batch.FanOutCount)
	}
	if batch.Spec != nil {
		if err := validateGenerationSpec(*batch.Spec); err != nil {
			return err
		}
	}
	for index, job := range batch.Jobs {
		if err := validateGenerationJob(index, job); err != nil {
			return err
		}
	}
	return nil
}

func validateGenerationSpec(spec GenerationSpec) error {
	if strings.TrimSpace(spec.SpecID) == "" {
		return errors.New("spec.specId is required")
	}
	if strings.TrimSpace(spec.CampaignID) == "" {
		return errors.New("spec.campaignId is required")
	}
	if strings.TrimSpace(spec.SourceNodeID) == "" {
		return errors.New("spec.sourceNodeId is required")
	}
	if !isValidGenerationMediaType(spec.MediaType) {
		return errors.New("spec.mediaType must be image or video")
	}
	if strings.TrimSpace(spec.Prompt) == "" {
		return errors.New("spec.prompt is required")
	}
	if strings.TrimSpace(spec.Provider) == "" {
		return errors.New("spec.provider is required")
	}
	if strings.TrimSpace(spec.Model) == "" {
		return errors.New("spec.model is required")
	}
	if strings.TrimSpace(spec.AspectRatio) == "" {
		return errors.New("spec.aspectRatio is required")
	}
	return nil
}

func validateGenerationJob(index int, job GenerationJob) error {
	prefix := fmt.Sprintf("jobs[%d]", index)
	if strings.TrimSpace(job.JobID) == "" {
		return fmt.Errorf("%s.jobId is required", prefix)
	}
	if strings.TrimSpace(job.NodeID) == "" {
		return fmt.Errorf("%s.nodeId is required", prefix)
	}
	if !isValidGenerationMediaType(job.MediaType) {
		return fmt.Errorf("%s.mediaType must be image or video", prefix)
	}
	if strings.TrimSpace(job.Prompt) == "" {
		return fmt.Errorf("%s.prompt is required", prefix)
	}
	if strings.TrimSpace(job.Provider) == "" {
		return fmt.Errorf("%s.provider is required", prefix)
	}
	if strings.TrimSpace(job.Model) == "" {
		return fmt.Errorf("%s.model is required", prefix)
	}
	if strings.TrimSpace(job.AspectRatio) == "" {
		return fmt.Errorf("%s.aspectRatio is required", prefix)
	}
	return nil
}

func isValidGenerationMediaType(mediaType string) bool {
	trimmed := strings.TrimSpace(mediaType)
	return trimmed == "" || trimmed == "image" || trimmed == "video"
}

func generationErrorFromExecutionError(err error) GenerationError {
	var executionError ExecutionError
	if errors.As(err, &executionError) {
		name := executionError.Name
		if name == "" {
			name = "provider_error"
		}
		category := executionError.Category
		if category == "" {
			category = GenerationErrorCategoryProviderExecution
		}
		message := executionError.Message
		if message == "" {
			message = redactGenerationSecrets(err.Error())
		}
		return GenerationError{
			Name:      name,
			Category:  category,
			Message:   message,
			Retryable: executionError.Retryable,
		}
	}

	return GenerationError{
		Name:      "provider_error",
		Category:  GenerationErrorCategoryProviderExecution,
		Message:   redactGenerationSecrets(err.Error()),
		Retryable: true,
	}
}
