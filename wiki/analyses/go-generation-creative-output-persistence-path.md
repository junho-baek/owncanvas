# Go 생성 Creative Output 저장 경로 | Go Generation Creative Output Persistence Path

## 결론

Go-backed Image Block 결과는 새 DB나 blob store가 아니라 기존 Campaign JSON source-of-truth에 저장해야 한다.

정확한 저장 모델은 `CampaignAssetGenerationResultMetadata`를 먼저 만들고, 기존 apply/save 경로인 `applyCampaignAssetGenerationExecutionResult()` 또는 image 전용 `applyCampaignImageAssetGenerationExecutionResult()`를 통해 다음 위치에 반영하는 것이다.

- `campaign.assets[]`: 생성된 Creative Output의 재사용 가능한 Campaign Asset record.
- `campaign.assets[].uri`: provider 결과 URL.
- `campaign.assets[].outputLocations.primaryUri`: provider 결과 URL의 canonical preview/output 위치.
- `campaign.assets[].outputLocations.thumbnailUri`: provider가 thumbnail을 줄 때만 저장.
- `campaign.assets[].generatedMetadata`: job, result, provider request, model, dimensions, cost/duration, output target metadata.
- `campaign.campaignSpec.assetGenerationJobs[].resultMetadata[]`: provider result와 linked asset id를 보존하는 execution-level result metadata.
- `campaign.campaignSpec.assetGenerationExecutions[]`: 실행 record와 per-job terminal status/event history.
- `campaign.campaignSpec.assetGenerationWorkflowState`: workflow summary, output URI, result id, asset id 집계.
- `campaign.canvasState.nodes[].properties.assetGeneration` 및 `campaign.campaignSpec.nodes[].properties.assetGeneration`: Canvas/Image Block reload용 status, asset id, result id, output location 집계.

## API 경로

- 현재 generation bridge는 `POST /api/campaigns/:campaignId/generation/batches`에서 React Router가 Go service의 `/v1/generation/batches`로 batch를 전달하고, `GenerationBatchResponse`를 반환한다.
- Campaign persistence API는 `getPersistedCampaignRecord()` / `updatePersistedCampaignRecord()` 기반이며, `GET /api/campaigns/:campaignId`는 `campaign.assetGeneration` summary/jobs/executions를 노출한다.
- 따라서 다음 구현 단계에서 generation route 또는 그 caller는 Go `GenerationJobResult` success를 `CampaignAssetGenerationExecutionResult`로 변환한 뒤 `saveCampaignAssetGenerationExecutionResult()` 또는 `saveCampaignImageAssetGenerationExecutionResult()`로 같은 Campaign record에 저장해야 한다.

## 매핑 규칙

- `GenerationJobResult.providerUrl` -> `CampaignAssetGenerationResultMetadata.uri` -> `CampaignAsset.uri` and `CampaignAsset.outputLocations.primaryUri`.
- `GenerationJobResult.thumbnailUri` -> `CampaignAssetGenerationResultMetadata.thumbnailUri` -> `CampaignAsset.outputLocations.thumbnailUri`.
- `GenerationJobResult.providerRequestId` -> `CampaignAssetGenerationResultMetadata.providerRequestId` and `CampaignAsset.generatedMetadata.providerRequestId`.
- `GenerationJobResult.mimeType`, `width`, `height`, `sizeBytes`, `generatedAt` -> 같은 이름의 result metadata fields.
- `GenerationJobResult.nodeId`/`jobId` should identify the Image Block generation job whose output target asset id becomes `CampaignAssetGenerationResultMetadata.assetId`.

## 구현상 주의

- `saveCampaignAssetGenerationExecutionResult()` already merges generated assets by asset id, preserves existing assets, records logs/versions, and updates workflow/canvas node state.
- Partial failure should use the same execution result shape: successful jobs include `resultMetadata`, failed jobs carry failed lifecycle/execution records. The asset merge only creates assets from completed jobs.
- The current fan-out UI only marks nodes succeeded with empty `generatedAssetIds`; persistence work should set each succeeded Image Block's selected asset id from the persisted Campaign Asset id so reload can render `campaign.assets[].outputLocations.primaryUri`.
