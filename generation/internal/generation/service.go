package generation

import (
	"context"
	"errors"
	"fmt"
	"sync"
)

const MaxFanOutCount = 10

type Provider interface {
	Generate(context.Context, GenerationJob) (GenerationResult, error)
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
	if batch.FanOutCount < 1 || batch.FanOutCount > MaxFanOutCount {
		return GenerationBatchResponse{}, errors.New("fanOutCount must be between 1 and 10")
	}
	if len(batch.Jobs) != batch.FanOutCount {
		return GenerationBatchResponse{}, fmt.Errorf("jobs length %d must match fanOutCount %d", len(batch.Jobs), batch.FanOutCount)
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
					response.Results[index] = GenerationResult{
						JobID:  job.JobID,
						NodeID: job.NodeID,
						Status: JobStatusFailed,
						Error: &GenerationError{
							Name:      "provider_error",
							Message:   err.Error(),
							Retryable: true,
						},
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
