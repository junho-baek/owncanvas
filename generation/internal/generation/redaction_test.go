package generation

import (
	"bytes"
	"errors"
	"log"
	"strings"
	"testing"
)

func TestGenerationErrorFromExecutionErrorMapsTypedFailuresAndRedactsSecrets(t *testing.T) {
	const rawToken = "secret-replicate-token-typed"
	t.Setenv(ReplicateAPITokenEnvName, rawToken)

	fixtures := []struct {
		name          string
		err           error
		wantName      string
		wantCategory  GenerationErrorCategory
		wantRetryable bool
	}{
		{
			name: "provider authentication remains non retryable configuration failure",
			err: NewExecutionError(
				"GenerationProviderAuthenticationFailed",
				GenerationErrorCategoryProviderConfiguration,
				"authorization=Bearer "+rawToken,
				false,
				nil,
			),
			wantName:      "GenerationProviderAuthenticationFailed",
			wantCategory:  GenerationErrorCategoryProviderConfiguration,
			wantRetryable: false,
		},
		{
			name: "rate limit remains retryable provider rejection",
			err: NewExecutionError(
				"GenerationProviderRateLimited",
				GenerationErrorCategoryProviderRejected,
				"provider returned token="+rawToken,
				true,
				nil,
			),
			wantName:      "GenerationProviderRateLimited",
			wantCategory:  GenerationErrorCategoryProviderRejected,
			wantRetryable: true,
		},
		{
			name: "transport failure remains retryable transport error",
			err: NewExecutionError(
				"GenerationTransportRequestFailed",
				GenerationErrorCategoryTransport,
				"Bearer "+rawToken,
				true,
				errors.New("dial tcp"),
			),
			wantName:      "GenerationTransportRequestFailed",
			wantCategory:  GenerationErrorCategoryTransport,
			wantRetryable: true,
		},
	}

	for _, fixture := range fixtures {
		t.Run(fixture.name, func(t *testing.T) {
			generationError := generationErrorFromExecutionError(fixture.err)

			if generationError.Name != fixture.wantName {
				t.Fatalf("name = %q, want %q", generationError.Name, fixture.wantName)
			}
			if generationError.Category != fixture.wantCategory {
				t.Fatalf("category = %q, want %q", generationError.Category, fixture.wantCategory)
			}
			if generationError.Retryable != fixture.wantRetryable {
				t.Fatalf("retryable = %v, want %v", generationError.Retryable, fixture.wantRetryable)
			}
			if strings.Contains(generationError.Message, rawToken) {
				t.Fatalf("generation error leaked token: %q", generationError.Message)
			}
			if !strings.Contains(generationError.Message, redactedSecretPlaceholder) {
				t.Fatalf("generation error did not include redaction marker: %q", generationError.Message)
			}
		})
	}
}

func TestExecutionErrorOutputIsSafeForLogs(t *testing.T) {
	const rawToken = "secret-replicate-token-log"
	t.Setenv(ReplicateAPITokenEnvName, rawToken)

	err := NewExecutionError(
		"GenerationTransportRequestFailed",
		GenerationErrorCategoryTransport,
		"",
		true,
		errors.New("upstream failed with api_key="+rawToken+" and Authorization: Bearer "+rawToken),
	)

	var output bytes.Buffer
	logger := log.New(&output, "", 0)
	logger.Print(err)

	logged := output.String()
	if strings.Contains(logged, rawToken) {
		t.Fatalf("log output leaked token: %q", logged)
	}
	if strings.Contains(strings.ToLower(logged), "api_key=secret") {
		t.Fatalf("log output leaked api key assignment: %q", logged)
	}
	if !strings.Contains(logged, redactedSecretPlaceholder) {
		t.Fatalf("log output did not include redaction marker: %q", logged)
	}
}
