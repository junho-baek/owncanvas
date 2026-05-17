package generation

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultReplicateBaseURL       = "https://api.replicate.com"
	DefaultReplicateWaitSeconds   = 60
	DefaultReplicatePollInterval  = 2 * time.Second
	DefaultReplicateOutputMime    = "image/png"
	ReplicateAPITokenEnvName      = "OWNCANVAS_REPLICATE_API_TOKEN"
	ReplicateBaseURLEnvName       = "OWNCANVAS_REPLICATE_BASE_URL"
	ReplicateWaitSecondsEnvName   = "OWNCANVAS_REPLICATE_WAIT_SECONDS"
	defaultGenerationProviderName = "mock"
)

type RoutingProvider struct {
	providers map[string]Provider
}

func NewRoutingProvider(providers map[string]Provider) RoutingProvider {
	copyProviders := make(map[string]Provider, len(providers))
	for name, provider := range providers {
		trimmedName := strings.TrimSpace(strings.ToLower(name))
		if trimmedName == "" || provider == nil {
			continue
		}
		copyProviders[trimmedName] = provider
	}
	return RoutingProvider{providers: copyProviders}
}

func (provider RoutingProvider) Generate(ctx context.Context, job GenerationJob) (GenerationResult, error) {
	providerName := strings.TrimSpace(strings.ToLower(job.Provider))
	if providerName == "" {
		providerName = defaultGenerationProviderName
	}

	delegate, ok := provider.providers[providerName]
	if !ok {
		message := fmt.Sprintf("generation provider %q is not configured", providerName)
		return GenerationResult{}, NewExecutionError(
			"GenerationProviderNotConfigured",
			GenerationErrorCategoryProviderConfiguration,
			message,
			false,
			nil,
		)
	}

	return delegate.Generate(ctx, job)
}

func NewProviderFromEnvironment() Provider {
	providers := map[string]Provider{
		defaultGenerationProviderName: MockProvider{},
	}

	replicateToken := strings.TrimSpace(os.Getenv(ReplicateAPITokenEnvName))
	if replicateToken != "" {
		providers["replicate"] = NewReplicateProvider(ReplicateProviderConfig{
			APIToken:    replicateToken,
			BaseURL:     os.Getenv(ReplicateBaseURLEnvName),
			WaitSeconds: replicateWaitSecondsFromEnvironment(),
		})
	} else {
		providers["replicate"] = MissingCredentialProvider{
			ProviderName: "replicate",
			EnvName:      ReplicateAPITokenEnvName,
		}
	}

	return NewRoutingProvider(providers)
}

func replicateWaitSecondsFromEnvironment() int {
	rawWaitSeconds := strings.TrimSpace(os.Getenv(ReplicateWaitSecondsEnvName))
	if rawWaitSeconds == "" {
		return DefaultReplicateWaitSeconds
	}

	waitSeconds, err := strconv.Atoi(rawWaitSeconds)
	if err != nil || waitSeconds <= 0 {
		return DefaultReplicateWaitSeconds
	}
	return waitSeconds
}

type MissingCredentialProvider struct {
	ProviderName string
	EnvName      string
}

func (provider MissingCredentialProvider) Generate(ctx context.Context, job GenerationJob) (GenerationResult, error) {
	return GenerationResult{}, NewExecutionError(
		"GenerationProviderMissingCredential",
		GenerationErrorCategoryProviderConfiguration,
		fmt.Sprintf("%s provider requires %s", provider.ProviderName, provider.EnvName),
		false,
		nil,
	)
}

type ReplicateProviderConfig struct {
	APIToken     string
	BaseURL      string
	HTTPClient   *http.Client
	WaitSeconds  int
	PollInterval time.Duration
	Now          func() time.Time
}

type ReplicateProvider struct {
	apiToken     string
	baseURL      string
	httpClient   *http.Client
	waitSeconds  int
	pollInterval time.Duration
	now          func() time.Time
}

func NewReplicateProvider(config ReplicateProviderConfig) ReplicateProvider {
	baseURL := strings.TrimSpace(config.BaseURL)
	if baseURL == "" {
		baseURL = DefaultReplicateBaseURL
	}

	waitSeconds := config.WaitSeconds
	if waitSeconds <= 0 {
		waitSeconds = DefaultReplicateWaitSeconds
	}

	httpClient := config.HTTPClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	pollInterval := config.PollInterval
	if pollInterval <= 0 {
		pollInterval = DefaultReplicatePollInterval
	}

	now := config.Now
	if now == nil {
		now = time.Now
	}

	return ReplicateProvider{
		apiToken:     strings.TrimSpace(config.APIToken),
		baseURL:      strings.TrimRight(baseURL, "/"),
		httpClient:   httpClient,
		waitSeconds:  waitSeconds,
		pollInterval: pollInterval,
		now:          now,
	}
}

func (provider ReplicateProvider) Generate(ctx context.Context, job GenerationJob) (GenerationResult, error) {
	if provider.apiToken == "" {
		return GenerationResult{}, NewExecutionError(
			"GenerationProviderMissingCredential",
			GenerationErrorCategoryProviderConfiguration,
			fmt.Sprintf("replicate provider requires %s", ReplicateAPITokenEnvName),
			false,
			nil,
		)
	}
	if strings.TrimSpace(job.Model) == "" {
		return GenerationResult{}, NewExecutionError(
			"GenerationProviderInvalidRequest",
			GenerationErrorCategoryProviderConfiguration,
			"replicate model is required",
			false,
			nil,
		)
	}

	requestBody, err := json.Marshal(map[string]any{
		"input": createReplicateInput(job),
	})
	if err != nil {
		return GenerationResult{}, NewExecutionError(
			"GenerationProviderInvalidRequest",
			GenerationErrorCategoryProviderConfiguration,
			provider.redact("marshal replicate prediction request: "+err.Error()),
			false,
			err,
		)
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		provider.predictionURL(job.Model),
		bytes.NewReader(requestBody),
	)
	if err != nil {
		return GenerationResult{}, NewExecutionError(
			"GenerationTransportRequestInvalid",
			GenerationErrorCategoryTransport,
			provider.redact("create replicate prediction request: "+err.Error()),
			false,
			err,
		)
	}

	request.Header.Set("authorization", "Bearer "+provider.apiToken)
	request.Header.Set("content-type", "application/json")
	request.Header.Set("prefer", fmt.Sprintf("wait=%d", provider.syncWaitSeconds()))

	response, err := provider.httpClient.Do(request)
	if err != nil {
		return GenerationResult{}, NewExecutionError(
			"GenerationTransportRequestFailed",
			GenerationErrorCategoryTransport,
			provider.redact("execute replicate prediction request: "+err.Error()),
			true,
			err,
		)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return GenerationResult{}, NewExecutionError(
			"GenerationTransportResponseReadFailed",
			GenerationErrorCategoryTransport,
			provider.redact("read replicate prediction response: "+err.Error()),
			true,
			err,
		)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return GenerationResult{}, provider.replicateAPIError(response.StatusCode, body)
	}

	var prediction replicatePredictionResponse
	if err := json.Unmarshal(body, &prediction); err != nil {
		return GenerationResult{}, NewExecutionError(
			"GenerationProviderInvalidResponse",
			GenerationErrorCategoryProviderResponse,
			provider.redact("decode replicate prediction response: "+err.Error()),
			true,
			err,
		)
	}
	if prediction.ID == "" {
		return GenerationResult{}, NewExecutionError(
			"GenerationProviderInvalidResponse",
			GenerationErrorCategoryProviderResponse,
			"replicate prediction response missing id",
			true,
			nil,
		)
	}
	prediction, err = provider.waitForReplicatePrediction(ctx, prediction)
	if err != nil {
		return GenerationResult{}, err
	}
	if prediction.Status == "failed" || prediction.Status == "canceled" {
		if prediction.Error != nil {
			return GenerationResult{}, NewExecutionError(
				"GenerationProviderTerminalFailure",
				GenerationErrorCategoryProviderRejected,
				provider.redact(fmt.Sprintf("replicate prediction %s: %v", prediction.Status, prediction.Error)),
				prediction.Status != "canceled",
				nil,
			)
		}
		return GenerationResult{}, NewExecutionError(
			"GenerationProviderTerminalFailure",
			GenerationErrorCategoryProviderRejected,
			fmt.Sprintf("replicate prediction %s", prediction.Status),
			prediction.Status != "canceled",
			nil,
		)
	}

	output, ok := parseReplicateCreativeOutput(prediction.Output, job.AspectRatio)
	if !ok {
		return GenerationResult{}, NewExecutionError(
			"GenerationProviderInvalidResponse",
			GenerationErrorCategoryProviderResponse,
			fmt.Sprintf("replicate prediction %q did not return a Creative Output URL", prediction.ID),
			true,
			nil,
		)
	}

	return GenerationResult{
		JobID:             job.JobID,
		NodeID:            job.NodeID,
		Status:            JobStatusSucceeded,
		ProviderRequestID: prediction.ID,
		ProviderURL:       output.URI,
		MimeType:          output.MimeType,
		Width:             output.Width,
		Height:            output.Height,
		ThumbnailURI:      output.ThumbnailURI,
		SizeBytes:         output.SizeBytes,
		GeneratedAt:       generatedAt(provider.now, prediction.CompletedAt),
	}, nil
}

func (provider ReplicateProvider) redact(message string) string {
	return redactGenerationSecrets(message, provider.apiToken)
}

func (provider ReplicateProvider) syncWaitSeconds() int {
	if provider.waitSeconds > 60 {
		return 60
	}
	return provider.waitSeconds
}

func (provider ReplicateProvider) predictionURL(model string) string {
	owner, name, ok := strings.Cut(strings.TrimSpace(model), "/")
	if !ok || owner == "" || name == "" {
		return provider.baseURL + "/v1/predictions"
	}

	return fmt.Sprintf(
		"%s/v1/models/%s/%s/predictions",
		provider.baseURL,
		url.PathEscape(owner),
		url.PathEscape(name),
	)
}

func createReplicateInput(job GenerationJob) map[string]any {
	input := map[string]any{}

	if nestedInput, ok := nestedMap(job.Parameters, "input"); ok {
		for key, value := range nestedInput {
			input[key] = value
		}
	} else if replicate, ok := nestedMap(job.Parameters, "replicate"); ok {
		if replicateInput, ok := nestedMap(replicate, "input"); ok {
			for key, value := range replicateInput {
				input[key] = value
			}
		}
	}

	for key, value := range job.Parameters {
		if key == "input" || key == "replicate" || key == "" {
			continue
		}
		input[key] = value
	}

	if _, ok := input["prompt"]; !ok && strings.TrimSpace(job.Prompt) != "" {
		input["prompt"] = job.Prompt
	}
	if _, ok := input["aspect_ratio"]; !ok && strings.TrimSpace(job.AspectRatio) != "" {
		input["aspect_ratio"] = job.AspectRatio
	}

	return input
}

func nestedMap(values map[string]any, key string) (map[string]any, bool) {
	value, ok := values[key]
	if !ok {
		return nil, false
	}
	nested, ok := value.(map[string]any)
	return nested, ok
}

type replicatePredictionResponse struct {
	ID          string          `json:"id"`
	Status      string          `json:"status"`
	Output      json.RawMessage `json:"output"`
	Error       any             `json:"error"`
	CompletedAt string          `json:"completed_at"`
	URLs        struct {
		Cancel string `json:"cancel"`
		Get    string `json:"get"`
	} `json:"urls"`
}

func (provider ReplicateProvider) waitForReplicatePrediction(
	ctx context.Context,
	prediction replicatePredictionResponse,
) (replicatePredictionResponse, error) {
	if !shouldPollReplicatePrediction(prediction) {
		return prediction, nil
	}
	if strings.TrimSpace(prediction.URLs.Get) == "" {
		return prediction, nil
	}

	deadline := time.Now().Add(time.Duration(provider.waitSeconds) * time.Second)
	firstPoll := true

	for shouldPollReplicatePrediction(prediction) {
		if time.Now().After(deadline) {
			provider.cancelReplicatePrediction(ctx, prediction.URLs.Cancel)
			return replicatePredictionResponse{}, NewExecutionError(
				"GenerationProviderPredictionTimeout",
				GenerationErrorCategoryProviderExecution,
				fmt.Sprintf("replicate prediction %q did not complete within %d seconds", prediction.ID, provider.waitSeconds),
				true,
				nil,
			)
		}

		if !firstPoll {
			timer := time.NewTimer(provider.pollInterval)
			select {
			case <-ctx.Done():
				timer.Stop()
				return replicatePredictionResponse{}, ctx.Err()
			case <-timer.C:
			}
		}
		firstPoll = false

		nextPrediction, err := provider.getReplicatePrediction(ctx, prediction.URLs.Get)
		if err != nil {
			return replicatePredictionResponse{}, err
		}
		if nextPrediction.ID == "" {
			return replicatePredictionResponse{}, NewExecutionError(
				"GenerationProviderInvalidResponse",
				GenerationErrorCategoryProviderResponse,
				"replicate prediction response missing id",
				true,
				nil,
			)
		}
		prediction = nextPrediction
	}

	return prediction, nil
}

func (provider ReplicateProvider) cancelReplicatePrediction(
	ctx context.Context,
	cancelURL string,
) {
	if strings.TrimSpace(cancelURL) == "" {
		return
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, cancelURL, nil)
	if err != nil {
		return
	}
	request.Header.Set("authorization", "Bearer "+provider.apiToken)

	response, err := provider.httpClient.Do(request)
	if err != nil {
		return
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 1<<20))
}

func shouldPollReplicatePrediction(prediction replicatePredictionResponse) bool {
	if prediction.Status == "failed" || prediction.Status == "canceled" {
		return false
	}
	if _, ok := parseReplicateCreativeOutput(prediction.Output, "1:1"); ok {
		return false
	}
	return prediction.Status == "starting" || prediction.Status == "processing"
}

func (provider ReplicateProvider) getReplicatePrediction(
	ctx context.Context,
	getURL string,
) (replicatePredictionResponse, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, getURL, nil)
	if err != nil {
		return replicatePredictionResponse{}, NewExecutionError(
			"GenerationTransportRequestInvalid",
			GenerationErrorCategoryTransport,
			provider.redact("create replicate polling request: "+err.Error()),
			false,
			err,
		)
	}
	request.Header.Set("authorization", "Bearer "+provider.apiToken)

	response, err := provider.httpClient.Do(request)
	if err != nil {
		return replicatePredictionResponse{}, NewExecutionError(
			"GenerationTransportRequestFailed",
			GenerationErrorCategoryTransport,
			provider.redact("execute replicate polling request: "+err.Error()),
			true,
			err,
		)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return replicatePredictionResponse{}, NewExecutionError(
			"GenerationTransportResponseReadFailed",
			GenerationErrorCategoryTransport,
			provider.redact("read replicate polling response: "+err.Error()),
			true,
			err,
		)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return replicatePredictionResponse{}, provider.replicateAPIError(response.StatusCode, body)
	}

	var prediction replicatePredictionResponse
	if err := json.Unmarshal(body, &prediction); err != nil {
		return replicatePredictionResponse{}, NewExecutionError(
			"GenerationProviderInvalidResponse",
			GenerationErrorCategoryProviderResponse,
			provider.redact("decode replicate polling response: "+err.Error()),
			true,
			err,
		)
	}

	return prediction, nil
}

func (provider ReplicateProvider) replicateAPIError(statusCode int, body []byte) ExecutionError {
	name := "GenerationProviderRejectedRequest"
	category := GenerationErrorCategoryProviderRejected
	retryable := false

	switch {
	case statusCode == http.StatusUnauthorized || statusCode == http.StatusForbidden:
		name = "GenerationProviderAuthenticationFailed"
		category = GenerationErrorCategoryProviderConfiguration
	case statusCode == http.StatusTooManyRequests:
		name = "GenerationProviderRateLimited"
		retryable = true
	case statusCode >= 500:
		name = "GenerationProviderUnavailable"
		retryable = true
	}

	return NewExecutionError(
		name,
		category,
		provider.redact(replicateAPIErrorMessage(statusCode, body)),
		retryable,
		nil,
	)
}

func replicateAPIErrorMessage(statusCode int, body []byte) string {
	detail := strings.TrimSpace(replicateAPIErrorDetail(body))
	if detail == "" {
		detail = strings.TrimSpace(string(body))
	}
	if detail == "" {
		return fmt.Sprintf("replicate prediction request failed with status %d", statusCode)
	}
	return fmt.Sprintf("replicate prediction request failed with status %d: %s", statusCode, detail)
}

func replicateAPIErrorDetail(body []byte) string {
	var decoded any
	if err := json.Unmarshal(body, &decoded); err != nil {
		return ""
	}
	return strings.TrimSpace(providerErrorDetailFromValue(decoded))
}

func providerErrorDetailFromValue(value any) string {
	switch typedValue := value.(type) {
	case string:
		return typedValue
	case []any:
		var parts []string
		for _, item := range typedValue {
			part := strings.TrimSpace(providerErrorDetailFromValue(item))
			if part != "" {
				parts = append(parts, part)
			}
		}
		return strings.Join(parts, "; ")
	case map[string]any:
		for _, key := range []string{"detail", "error", "message", "msg", "title"} {
			if detail := strings.TrimSpace(providerErrorDetailFromValue(typedValue[key])); detail != "" {
				return detail
			}
		}
	}
	return ""
}

type creativeOutputResult struct {
	URI          string
	MimeType     string
	Width        int
	Height       int
	ThumbnailURI string
	SizeBytes    *int64
}

func parseReplicateCreativeOutput(output json.RawMessage, aspectRatio string) (creativeOutputResult, bool) {
	if len(output) == 0 || string(output) == "null" {
		return creativeOutputResult{}, false
	}

	var decoded any
	if err := json.Unmarshal(output, &decoded); err != nil {
		return creativeOutputResult{}, false
	}

	result, ok := creativeOutputFromValue(decoded)
	if !ok {
		return creativeOutputResult{}, false
	}

	result = fillCreativeOutputDefaults(result, aspectRatio)
	return result, true
}

func creativeOutputFromValue(value any) (creativeOutputResult, bool) {
	switch typedValue := value.(type) {
	case string:
		return creativeOutputFromURI(typedValue)
	case []any:
		for _, item := range typedValue {
			if result, ok := creativeOutputFromValue(item); ok {
				return result, true
			}
		}
	case map[string]any:
		if result, ok := creativeOutputFromMap(typedValue); ok {
			return result, true
		}
	}

	return creativeOutputResult{}, false
}

func creativeOutputFromMap(value map[string]any) (creativeOutputResult, bool) {
	for _, key := range []string{"url", "uri", "image", "file"} {
		if raw, ok := value[key].(string); ok {
			if result, ok := creativeOutputFromURI(raw); ok {
				applyCreativeOutputMetadata(&result, value)
				return result, true
			}
		}
	}

	for _, key := range []string{"image", "file", "output", "outputs", "images", "files"} {
		if nestedValue, ok := value[key]; ok {
			if result, ok := creativeOutputFromValue(nestedValue); ok {
				return result, true
			}
		}
	}

	return creativeOutputResult{}, false
}

func creativeOutputFromURI(value string) (creativeOutputResult, bool) {
	normalized, ok := normalizeOutputURL(value)
	if !ok {
		return creativeOutputResult{}, false
	}

	return creativeOutputResult{
		URI:      normalized,
		MimeType: mimeTypeForOutputURL(normalized),
	}, true
}

func applyCreativeOutputMetadata(result *creativeOutputResult, metadata map[string]any) {
	if mimeType, ok := firstStringValue(metadata, "mime_type", "mimeType", "content_type", "contentType"); ok {
		result.MimeType = mimeType
	}
	if thumbnailURI, ok := firstStringValue(metadata, "thumbnail_url", "thumbnailUrl", "thumbnail_uri", "thumbnailUri"); ok {
		if normalized, ok := normalizeOutputURL(thumbnailURI); ok {
			result.ThumbnailURI = normalized
		}
	}
	if width, ok := intValue(metadata["width"]); ok {
		result.Width = width
	}
	if height, ok := intValue(metadata["height"]); ok {
		result.Height = height
	}
	if sizeBytes, ok := int64Value(metadata["size_bytes"]); ok {
		result.SizeBytes = &sizeBytes
	} else if sizeBytes, ok := int64Value(metadata["sizeBytes"]); ok {
		result.SizeBytes = &sizeBytes
	} else if sizeBytes, ok := int64Value(metadata["size"]); ok {
		result.SizeBytes = &sizeBytes
	}
}

func fillCreativeOutputDefaults(result creativeOutputResult, aspectRatio string) creativeOutputResult {
	if strings.TrimSpace(result.MimeType) == "" {
		result.MimeType = mimeTypeForOutputURL(result.URI)
	}
	if result.Width <= 0 || result.Height <= 0 {
		result.Width, result.Height = estimatedDimensionsForAspectRatio(aspectRatio)
	}
	return result
}

func firstStringValue(values map[string]any, keys ...string) (string, bool) {
	for _, key := range keys {
		value, ok := values[key].(string)
		if !ok {
			continue
		}
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed, true
		}
	}
	return "", false
}

func intValue(value any) (int, bool) {
	switch typedValue := value.(type) {
	case int:
		return typedValue, typedValue > 0
	case int64:
		return int(typedValue), typedValue > 0
	case float64:
		if typedValue <= 0 || typedValue != float64(int(typedValue)) {
			return 0, false
		}
		return int(typedValue), true
	default:
		return 0, false
	}
}

func int64Value(value any) (int64, bool) {
	switch typedValue := value.(type) {
	case int:
		return int64(typedValue), typedValue >= 0
	case int64:
		return typedValue, typedValue >= 0
	case float64:
		if typedValue < 0 || typedValue != float64(int64(typedValue)) {
			return 0, false
		}
		return int64(typedValue), true
	default:
		return 0, false
	}
}

func normalizeOutputURL(value string) (string, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", false
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", false
	}
	return trimmed, true
}

func mimeTypeForOutputURL(outputURL string) string {
	parsed, err := url.Parse(outputURL)
	if err != nil {
		return DefaultReplicateOutputMime
	}

	path := strings.ToLower(parsed.Path)
	switch {
	case strings.HasSuffix(path, ".jpg"), strings.HasSuffix(path, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(path, ".webp"):
		return "image/webp"
	case strings.HasSuffix(path, ".png"):
		return "image/png"
	case strings.HasSuffix(path, ".mp4"):
		return "video/mp4"
	case strings.HasSuffix(path, ".webm"):
		return "video/webm"
	case strings.HasSuffix(path, ".mov"):
		return "video/quicktime"
	default:
		return DefaultReplicateOutputMime
	}
}

func estimatedWidthForAspectRatio(aspectRatio string) int {
	width, _ := estimatedDimensionsForAspectRatio(aspectRatio)
	return width
}

func estimatedHeightForAspectRatio(aspectRatio string) int {
	_, height := estimatedDimensionsForAspectRatio(aspectRatio)
	return height
}

func estimatedDimensionsForAspectRatio(aspectRatio string) (int, int) {
	widthText, heightText, ok := strings.Cut(strings.TrimSpace(aspectRatio), ":")
	if !ok {
		return 1024, 1024
	}
	widthRatio, widthErr := strconv.Atoi(widthText)
	heightRatio, heightErr := strconv.Atoi(heightText)
	if widthErr != nil || heightErr != nil || widthRatio <= 0 || heightRatio <= 0 {
		return 1024, 1024
	}
	if widthRatio >= heightRatio {
		return 1024, maxInt(1, 1024*heightRatio/widthRatio)
	}
	return maxInt(1, 1024*widthRatio/heightRatio), 1024
}

func maxInt(left int, right int) int {
	if left > right {
		return left
	}
	return right
}

func generatedAt(now func() time.Time, completedAt string) string {
	if completedAt != "" {
		if parsed, err := time.Parse(time.RFC3339, completedAt); err == nil {
			return parsed.UTC().Format(time.RFC3339)
		}
	}
	return now().UTC().Format(time.RFC3339)
}
