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
