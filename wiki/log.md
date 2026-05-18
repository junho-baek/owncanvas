# 로그 | Log

위키 ingest, query, lint, 유지보수, 구현 결과를 시간순으로 남기는 append-only 기록이다.

## [2026-05-19] instagram-dm-gate-issue-37-schema-audit | Issue #37

- Superpowers process-correction plan을 [Issue #37 Instagram DM Gate Schema Audit Implementation Plan](../docs/superpowers/plans/2026-05-19-issue-37-instagram-dm-gate-schema-audit.md)에 먼저 작성한 뒤 #37 범위만 감사했다.
- Codex 실행 중에는 `gh issue view 37 -R junho-baek/owncanvas --comments`가 일시적으로 `api.github.com` 연결 실패를 보고했지만, Hermes가 후속 확인에서 #37 조회 가능 상태를 검증했다. 감사 기준은 #37 scope와 `docs/seeds/instagram-dm-gate.mcp.seed.yaml`이다.
- commit `170a959`의 Direct Message plugin `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA`/`InstagramDmActionConfiguration`/fixture/test/README를 대조한 결과 #37 schema AC는 PASS로 판단했다.
- canonical source는 기존 direct-message Instagram DM action configuration이며 별도 Campaign-only DM Gate schema, 새 node type, live Meta OAuth/webhook/Graph API/token storage/token UI/real DM sending/real follow verification은 추가되지 않았다.
- 구체 코드 gap이 없어 source code는 수정하지 않았다. 이번 변경은 #37 audit plan과 wiki log만 포함한다.
- 검증: `node --test app/features/plugins/model/plugin-representation.test.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts` 통과(91 tests, 0 failures).

## [2026-05-19] instagram-dm-gate-final-qa | Issue #41

- read-only Codex QA가 `mapping.resourceUrl`에 invalid URL이 있어도 valid `landingUrl` 때문에 검증을 통과하고 outcome에서 invalid resource를 선택할 수 있는 blocker를 발견했다.
- `validateInstagramDmActionConfiguration()`이 제공된 top-level `landingUrl`/`resourceUrl`과 mapping-level `landingUrl`/`resourceUrl`을 각각 독립적으로 http(s) 검증하도록 보완했다.
- `plugin-representation.test.ts`에 valid landing + invalid resource URL regression을 추가해 `instagram-dm-config.response_mapping_resource_url_invalid`를 고정했다.
- UI 파일 변경은 없으며, diff scope는 plugin model/tests/docs/wiki/seed로 제한된다. live Meta OAuth/webhook/Graph API/token storage/token UI/real DM sending/real follow verification은 추가하지 않았다.
- 검증: focused plugin tests 91개 통과, `npm run typecheck` 통과, `git diff --check` 통과, creative-canvas 포함 targeted suite 204개 통과, `npx -y @google/design.md lint DESIGN.md` errors 0/warnings 12/infos 1.

## [2026-05-19] instagram-dm-gate-meta-credentials-docs | Issue #40

- 기존 #37 미커밋 문서 변경이 #40의 hosted/self-host Meta credentials 및 Docker URL 문서 범위를 이미 충족함을 확인했다.
- `app/features/plugins/model/README.md`는 Hosted OwnCanvas가 OwnCanvas-owned Meta apps for Business Portfolio connections를 사용하고, self-host 설치는 Meta app credentials를 environment variables 또는 deployment secret store로 가져와야 한다고 설명한다.
- 같은 문서는 Docker/cloud 배포에서 `PUBLIC_BASE_URL`을 환경별 public HTTPS origin으로 두고, Meta OAuth redirect URL과 webhook callback URL을 staging/production 등 환경별 HTTPS callback URL로 등록해야 한다고 명시한다.
- first slice에는 Meta OAuth, webhook receiving, Graph API transport, token storage/token UI, real DM sending, real follow-state checks가 없다는 scope boundary도 문서화되어 있다. Direct Message plugin / `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA`가 계속 canonical source이며 별도 Campaign-only schema는 만들지 않는다.
- 추가 code/docs/model/test 변경은 하지 않았다. 이번 변경은 누락된 wiki log entry뿐이다.

## [2026-05-19] instagram-dm-gate-dispatch-outcomes | Issue #39

- 기존 #37/#38 미커밋 변경이 #39의 Offline follow-gate dispatch outcome 범위를 이미 충족함을 확인했다.
- `resolveInstagramDmGateActionOutcome()`는 Quick Reply prompt(`prompt_sent`), follow check request(`follow_check_requested`), following success/resource-link dispatch(`resource_link_ready`, `resource_link_sent`), not-following retry prompt(`not_following_retry_prompted`), unmatched comment(`no_match`) outcome을 fixture-only `simulatedFollowStatus`로 모델링한다.
- canonical source는 계속 Direct Message plugin의 `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA`이며, 별도 Campaign-only schema, node explosion, live Meta OAuth/webhook/Graph API/token storage/token UI/real DM sending/real follow verification 변경은 없다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts` 90개 테스트 통과.

## [2026-05-19] instagram-dm-gate-response-variant-fixture | Issue #38

- 기존 #37 변경은 DM Gate match/follow-gate outcome을 대부분 포함했지만, DM Gate fixture 자체의 `no_match` 경로 검증이 비어 있었다.
- `instagram-comment-dm-flow.test.ts`에만 focused assertion을 추가해 `instagramDmGateActionConfigurationFixture.responseMappings`가 하나의 `mapping.drop-guide` resource variant를 선택하고, non-matching comment는 `resolveInstagramDmGateActionOutcome()`에서 `events: ["no_match"]`를 반환하는 계약을 고정했다.
- production model, live Meta OAuth/webhook/Graph API/token storage/token UI/real DM sending/follow verification 변경은 없다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts` 90개 테스트 통과.

## [2026-05-19] instagram-dm-gate-schema | Issue #37

- 기존 Direct Message plugin의 `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA`를 DM Gate v1 canonical source로 확장했다. 별도 Campaign-only schema나 새 seed 파일은 만들지 않았다.
- `InstagramDmActionConfiguration`에 `resourceUrl`, optional `followGate`, text quick reply(`title`/`payload`) 모델을 추가했고, response mapping은 `landingUrl` 또는 `resourceUrl`을 받을 수 있게 했다.
- `followGate.enabled === true`일 때 `checkQuickReply`, `successMessage`, `notFollowingMessage`, `quickReplies`, fixture 전용 `simulatedFollowStatus`를 검증한다. `INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD`는 `FOLLOW_CHECK`이며 `resolveInstagramDmGateActionOutcome()`의 follow branch를 소유한다.
- `instagram-comment-dm-flow` fixture에 canonical Instagram DM Gate action 예시를 추가했고, README에 hosted/self-host Meta app credential ownership, `PUBLIC_BASE_URL`, 환경별 HTTPS OAuth redirect/webhook callback URL 계약, first-slice 제외 범위를 문서화했다.
- `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts app/features/creative-canvas/model/creative-canvas.test.ts` 203개 테스트 통과, `npm run typecheck` 통과, `git diff --check` 통과.

## [2026-05-18] cli-image-video-canvas-qa | CLI authoring to web canvas

- `feature/video-generation-provider`를 `main`에 fast-forward merge하고 `origin/main`으로 push했다.
- CLI로 `/tmp/owncanvas-cli-ui-demo` 워크스페이스에 `cli-image-video-demo` Campaign을 만들고, Image Block `image_hero`와 Video Block `video_hero`를 생성했다. 생성 실행은 하지 않았다.
- CLI `edge connect`로 `image_hero:outputs.generated_image_asset -> video_hero:inputs.frame` 연결을 만들고 `validate --run-ready`를 통과했다.
- 웹 UI는 현재 Campaign을 `owncanvas.campaigns.v1` localStorage에서 읽으므로 CLI export JSON을 깨끗한 브라우저 세션에 주입해 `/campaigns/cli-image-video-demo/canvas`에서 렌더링을 확인했다.
- 증거: `output/playwright/cli-image-video-demo/.playwright-cli/page-2026-05-18T09-05-10-820Z.png`, `output/playwright/cli-image-video-demo/.playwright-cli/page-2026-05-18T09-07-01-460Z.png`. 접근성 스냅샷에서 `Edge from image_hero to video_hero`와 label `video source`가 확인됐다.

## [2026-05-18] owncanvas-cli-agent-contracts | Issues #31-#33

- Superpowers 계획 문서 [OwnCanvas CLI Agent Contracts Implementation Plan](../docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-contracts.md)을 작성하고, 남은 CLI 이슈 `#33`, `#31`, `#32`를 순서대로 이행했다.
- `#33`: `validate`, `diff`, `apply --dry-run`, `campaign inspect` summary, stable JSON envelope failure path를 추가했다. `validate --run-ready`/`--strict`는 draft warning을 error로 승격하며 validation failure는 exit code `2`를 반환한다.
- `#31`: mock generation을 기본값으로 유지하고, `--provider real|replicate|fake-*`는 credential과 `--allow-cost`/`--max-cost-usd` 없이는 실행되지 않게 했다. Budget guard는 exit code `4`, provider/generation failure는 exit code `5`로 분리했고, provider run manifest/status/response/pricing/events 파일은 secret redaction 후 저장한다.
- `#32`: write-capable CLI update는 변경 직전 snapshot을 남기고, `--expect-revision` mismatch는 conflict exit code `3`으로 실패한다. `snapshot list`, `snapshot restore --yes --expect-revision`, destructive `--yes` guard, explicit no-op `migrate` 명령을 추가했다.
- 검증: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고했으며 `llm-wiki`/Superpowers/gstack skill은 사용 가능했다. `node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts app/features/owncanvas-cli/model/authoring-commands.test.ts app/features/owncanvas-cli/model/mock-generation.test.ts app/features/owncanvas-cli/model/validation.test.ts app/features/owncanvas-cli/model/diff.test.ts app/features/owncanvas-cli/model/provider-runs.test.ts app/features/owncanvas-cli/model/snapshots.test.ts app/features/owncanvas-cli/cli.test.ts`는 54개 테스트 통과, `npm run typecheck` 통과, `git diff --check` 통과.

## [2026-05-17] actual-ui-image-to-video-generation-qa | UI provider flow

- Image Block generated-output next-node menu에서 `Video Block source` 액션을 실제 영상 provider 연결 상태에 맞게 available로 열었다.
- 실제 UI 플로우로 새 Campaign 생성, Image Block 드롭, Nano Banana 이미지 생성, generated output handle 드래그, Video Block 생성, Seedance 1 Pro Fast 2초 영상 생성을 완료했다.
- 생성 결과는 Campaign state에서 `Image Block -> Video Block` edge(`outputs.generated_image_asset` -> `inputs.frame`)와 Video Block `sourceOutputAssetId`로 연결되어 있으며, image/video Campaign Asset이 모두 `ready` 상태로 저장됐다.
- 증거: `output/screenshots/canvas-ui-actual-image-to-video-flow.png`, `output/screenshots/canvas-ui-actual-image-to-video-flow-state.json`, `output/replicate/ui-flow-generated-image.jpeg`, `output/replicate/ui-flow-generated-video.mp4`.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `git diff --check`.

## [2026-05-17] provider-image-output-asset-url-persistence-test | Sub-AC 3.4.1

- Campaign Asset/Creative Output persistence model에 focused provider image generation regression을 추가했다.
- 새 테스트는 Replicate-compatible provider result URL이 `saveCampaignAssetGenerationExecutionResult()` 이후 persisted Creative Output asset의 `uri`, `outputLocations.primaryUri`, `generatedMetadata.outputUri`, workflow output `uri`에 보존되는지 검증한다.
- Provider request id도 asset generated metadata와 workflow output에 함께 남는 계약을 확인했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `npm run typecheck`.

## [2026-05-17] image-model-vs-model-service-boundary | UI/domain correction

- Image Block의 사용자-facing 선택 단위를 Replicate 같은 모델 서빙 서비스가 아니라 `Nano Banana` 같은 실제 이미지 생성 모델로 정리했다.
- 인스펙터 요약은 `Model`을 먼저 보여주고 Replicate는 `Served by` 서비스 계층으로만 보조 표시한다.
- 내부 Go generation service routing은 기존 `provider: "replicate"` 계약을 유지하되, README와 위키에 이 값이 사용자-facing Provider 이름이 아니라 transport/service route임을 명시했다.
- 실제 Replicate token이 설정된 로컬 환경에서 `google/nano-banana` x3 Image Block fan-out을 실행했고, 생성 노드 3개가 `succeeded`, Campaign Asset 3개가 저장되며 reload 후 preview image 3개가 복원되는 것을 확인했다.
- 같은 QA campaign에서 한 duplicated node를 `failed` 상태로 만들어 retry affordance를 확인한 뒤 해당 node만 재실행했고, retry 후 다시 `succeeded` 및 persisted Creative Output 참조가 복원되는 것을 확인했다.
- 증거: `output/playwright/real-generation-x3-model-service.png`, `output/playwright/real-generation-x3-reload-persisted.png`, `output/playwright/real-generation-x3-canvas-clean.png`, `output/playwright/real-generation-x3-one-failed-retry-affordance.png`, `output/playwright/real-generation-x3-retry-succeeded.png`.
- Durable note: [모델 서비스와 생성 모델 | Model Service vs Generation Model](concepts/model-service-vs-generation-model.md).

## [2026-05-17] duplicated-fanout-output-render-coverage | Sub-AC 3.4.2

- duplicated Image Block x3 completion contract test를 추가해 각 duplicated node result가 deterministic persisted Creative Output asset id와 provider URL을 유지하고 request/job/node mapping 검증을 통과하는지 확인했다.
- Creative Canvas screen authoring regression을 추가해 batch results가 node id 기준으로 resolve되고, `persistedCreativeOutputAssetId`가 Image Block `latestResultRefs.generatedAssetIds`로 바인딩되며, selected persisted Creative Output이 `campaignImageAssets`에서 찾아져 preview `<img>`의 source로 렌더링되는 계약을 고정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts`, `git diff --check`.

## [2026-05-17] mixed-fanout-failure-retry-output-isolation | Sub-AC 3.3.4

- React Router generation persistence route에 mixed x3 fan-out regression을 추가했다.
- 새 테스트는 `node_1` 성공, `node_2` 실패, `node_3` 성공 응답에서 성공 Image Block만 deterministic Creative Output asset id를 받고, 실패 Image Block에는 `persistedCreativeOutputAssetId`/`assetIds`/`outputLocations`가 생기지 않는지 검증한다.
- 이어서 실패한 `node_2`만 같은 job id로 retry 성공시키며, `node_1`/`node_3`의 기존 persisted output 참조와 provider URL이 유지되고 retry node만 새 `asset_node_2_creative_output`을 받는 계약을 고정했다.
- 검증: `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-17] persisted-creative-output-reference-ack | Sub-AC 3.3.1

- React Router generation route가 Go service 응답의 provider success를 Campaign Asset/Creative Output으로 실제 저장한 뒤에만 `persistedCreativeOutputAssetId`를 API batch result에 붙이도록 했다.
- Go service나 fake service가 `persistedCreativeOutputAssetId`를 보내도 route boundary에서 제거하고, persisted Campaign record의 `assets[]`에 존재하는 completed job asset id만 다시 첨부한다.
- Creative Canvas UI는 successful provider result라도 persistence acknowledgement가 없으면 `latestResultRefs.generatedAssetIds`를 붙이지 않고 `GenerationPersistenceMissing` 실패 상태로 전환한다.
- 검증: `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-17] replicate-provider-sibling-failure-isolation-test | Sub-AC 2.5

- Go generation service에 Replicate-compatible provider call failure isolation regression을 추가했다.
- 새 테스트는 x3 batch에서 한 prediction만 HTTP 500 `GenerationProviderUnavailable`로 실패해도 두 sibling Image Block job이 각각 성공 상태, provider request id, provider URL, Creative Output metadata를 유지하는지 검증한다.
- 실패 job은 succeeded sibling 결과를 오염시키지 않고, success-only provider fields 없이 retryable typed error로 반환되는 계약을 고정했다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `git diff --check`.

## [2026-05-17] duplicated-image-block-creative-output-reference | Sub-AC 3.2

- duplicated Image Block completion handling now stores the deterministic persisted Creative Output/Campaign Asset id in each successful node's `latestResultRefs.generatedAssetIds`.
- `applyImageGenerationJobResult()` uses the shared `createGeneratedCreativeOutputAssetId(result.nodeId)` helper, so the UI-selected generated asset reference matches the asset id persisted by the React Router generation route.
- The generation route now uses the same helper when building `CampaignAssetGenerationResultMetadata.assetId`, avoiding drift between visible Image Block state and `campaign.assets[]`.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts app/routes/campaign-generation-api.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-17] go-generation-creative-output-persistence-path | Sub-AC 3.1.1

- 기존 Campaign Asset/Creative Output persistence model을 추적해 Go-backed image generation 결과의 저장 경로를 확정했다.
- Provider URL은 새 storage가 아니라 `CampaignAssetGenerationResultMetadata.uri`에서 `campaign.assets[].uri`, `campaign.assets[].outputLocations.primaryUri`, `campaign.assets[].generatedMetadata.outputUri`로 이어지는 기존 Campaign record에 저장해야 한다.
- 실행 상태와 reload 복원 정보는 `campaign.campaignSpec.assetGenerationJobs[].resultMetadata[]`, `campaign.campaignSpec.assetGenerationExecutions[]`, `campaign.campaignSpec.assetGenerationWorkflowState`, `canvasState/campaignSpec.nodes[].properties.assetGeneration`에 함께 반영하는 기존 `saveCampaignAssetGenerationExecutionResult()`/`saveCampaignImageAssetGenerationExecutionResult()` 경로를 사용한다.
- 현재 `POST /api/campaigns/:campaignId/generation/batches`는 Go service bridge만 수행하므로, 다음 구현 단계에서는 `GenerationBatchResponse`를 `CampaignAssetGenerationExecutionResult`로 변환해 같은 Campaign record에 저장해야 한다.
- Durable note: [Go 생성 Creative Output 저장 경로 | Go Generation Creative Output Persistence Path](analyses/go-generation-creative-output-persistence-path.md).

## [2026-05-17] go-generation-provider-url-persistence-coverage | Sub-AC 3.1.3

- React Router generation route에 x3 Go-backed success response 회귀 테스트를 추가했다.
- 테스트는 bridge request body가 그대로 Go service로 전달되고 response `providerUrl` 배열이 그대로 API response에 남는지 확인한다.
- 각 duplicated Image Block별 provider URL이 `campaign.assets[].uri`, `campaign.assets[].outputLocations.primaryUri`, `campaign.campaignSpec.assetGenerationExecutions[].outputs[].uri`, `canvasState.nodes[].properties.assetGeneration.outputLocations[].primaryUri`에 저장되는지 검증한다.
- 기존 x10 cap/fan-out adapter behavior는 변경하지 않고 `image-generation-fanout.test.ts`, `generation-batch.test.ts`, `campaign-generation-api.test.ts`로 재검증했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/adapters/image-generation-fanout.test.ts app/features/creative-canvas/model/generation-batch.test.ts app/routes/campaign-generation-api.test.ts`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `git diff --check`.

## [2026-05-17] generation-typed-execution-failure-categories | Sub-AC 1.4.1

- Go generation service에 `GenerationErrorCategory`와 `ExecutionError`를 추가해 provider configuration, provider rejection, invalid provider response, transport error, generic provider execution failure를 typed category로 구분하도록 했다.
- Replicate provider adapter와 routing/missing-credential provider가 plain error 대신 typed execution error를 반환하도록 바꿨고, service batch response의 per-job `error.category`에 매핑했다.
- React Router generation batch contract는 `provider_configuration`, `provider_rejected`, `provider_response_invalid`, `transport_error`, `provider_execution` category를 보존하고 알 수 없는 category를 거부한다. Image Block failure details에도 category를 전달한다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts app/routes/campaign-generation-api.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-17] provider-success-metadata-result-mapping | Sub-AC 1.3

- Go generation service의 typed `GenerationResult`에 optional `thumbnailUri`, `sizeBytes` 필드를 추가해 Replicate-compatible provider success metadata가 service response boundary에서 유실되지 않도록 했다.
- Replicate adapter가 이미 정규화한 Creative Output metadata의 thumbnail URL과 size bytes를 `GenerationResult`로 매핑하도록 연결했다.
- React Router generation batch 타입/validator가 optional `thumbnailUri`, `sizeBytes`를 받아 보존하도록 갱신했고, invalid thumbnail URL과 음수 size를 거부하는 회귀 테스트를 추가했다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts app/routes/campaign-generation-api.test.ts`.

## [2026-05-17] go-generation-service-env-docs | Sub-AC 1.2.2

- README의 Go-backed Image Block generation service 설정에 환경 변수 표를 추가했다.
- 실제 Replicate-compatible provider 실행 secret은 Go service process 환경의 `OWNCANVAS_REPLICATE_API_TOKEN`으로 문서화했고, 기존 `REPLICATE_API_TOKEN` 값은 실행 시 이 이름으로 export/prefix해서 쓰도록 명시했다.
- 선택 설정으로 `OWNCANVAS_GENERATION_ADDR`, `OWNCANVAS_REPLICATE_BASE_URL`, `OWNCANVAS_REPLICATE_WAIT_SECONDS`, React Router bridge용 `OWNCANVAS_GENERATION_SERVICE_URL`의 역할과 기본값을 정리했다.
- Secret value는 Campaign JSON, browser state, committed file에 두지 않는다는 boundary를 문서에 명시했다.

## [2026-05-17] go-replicate-provider-adapter | Sub-AC 1.1.1

- Go generation service에 `RoutingProvider`와 `ReplicateProvider`를 추가해 `provider: "replicate"` Image Block jobs를 Replicate HTTP prediction request로 실행할 수 있게 했다.
- Replicate secret은 Go service process 환경의 `OWNCANVAS_REPLICATE_API_TOKEN`에서만 읽고, 토큰이 없으면 해당 node job만 missing-credential provider error로 실패하도록 했다. 기존 `mock` provider는 routing provider 아래에서 계속 사용 가능하다.
- Replicate request는 `POST /v1/models/{owner}/{model}/predictions`, `Authorization: Bearer ...`, `Prefer: wait=N`, `{"input": ...}` envelope를 사용하며, prompt/aspect ratio와 `parameters` 또는 nested `replicate.input`을 provider input으로 합친다.
- Replicate successful output URL은 `providerUrl`, prediction id는 `providerRequestId`, MIME type과 aspect-ratio 기반 best-effort dimensions는 generation result로 반환한다.
- README에 generation service 실행 방법과 real Replicate smoke `curl` command를 추가했다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts`.

## [2026-05-17] creative-canvas-replicate-payload-mapping | Sub-AC 1.1.2

- Image Block fan-out batch creation이 더 이상 빈 `parameters`를 보내지 않고, 기존 `createImageGenerationNodeProviderRequest()` 결과의 `replicate` envelope를 `GenerationSpec`과 각 `GenerationJob`에 저장하도록 연결했다.
- Replicate payload는 Creative Canvas 입력의 prompt, mapped/native aspect ratio, reference image field, frame-derived provider size 같은 provider input을 `parameters.replicate.input` 아래에 보존한다. Go adapter는 이 nested input만 provider request body의 `input`으로 사용하고 credential/model/aspect-ratio metadata는 provider input으로 누출하지 않는 계약을 테스트로 고정했다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `npm ci --ignore-scripts`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/image-generation-fanout.test.ts app/features/creative-canvas/model/generation-batch.test.ts app/features/creative-canvas/model/image-generation-node.test.ts app/routes/campaign-generation-api.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-17] replicate-creative-output-response-parser | Sub-AC 1.1.3

- Replicate prediction response parsing을 단순 첫 URL 추출에서 내부 `creativeOutputResult` 모델로 분리했다. Go adapter는 string output, URL 배열, object output, nested image/file 배열을 Creative Output URI, MIME type, dimensions로 정규화한 뒤 기존 `GenerationResult` 계약의 `providerUrl`, `mimeType`, `width`, `height`에 매핑한다.
- Provider가 `mime_type`/`content_type`, `width`, `height`, size metadata를 주면 우선 사용하고, 누락된 경우 기존처럼 output URL extension과 aspect ratio 기반 best-effort dimensions를 채운다.
- 성공 상태인데 유효한 Creative Output URL이 없는 Replicate 응답은 해당 node job의 provider error로 실패하게 유지해 sibling job 성공과 terminal lifecycle을 방해하지 않도록 했다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`.

## [2026-05-16] non-image-generation-node-shell | UI unification

- Seed `seed_bbc7409474c7`를 GitHub 이슈 `#14`-`#18`로 발행한 뒤, Image Block은 기준 UI로 유지하고 비이미지 생성 노드만 같은 shell 문법으로 정리했다.
- Copy, Prompt, Video, Voice, Operator, DM, Landing, Plugin은 top label, floating toolbar, left/right port stack, central preview surface, bottom prompt field, compact controls, run button 구조를 공유한다.
- Image Block의 기존 이미지 프리뷰/프롬프트/컨트롤 구성은 변경하지 않았고, 비이미지 노드의 legacy `GENERATION BLOCK`, `Ready to create`, `Run block` UI를 제거했다.
- Subagent review 후 legacy generic node dead code/CSS를 제거했고, 비이미지 노드의 bottom prompt는 `properties.prompt`에 저장해 reload 후에도 유지되도록 했다.
- 검증: `node --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, Playwright QA screenshot `output/playwright/non-image-generation-node-shell-evidence.png`, Ouroboros QA score `0.93`.

## [2026-05-16] github-issue-empty-backlog-triage | Issue triage

- `gh issue list --state open --limit 100 --json ...` 기준 현재 `junho-baek/owncanvas`의 open GitHub issue는 0개다.
- `gh issue list --state all --limit 100` 기준 `#1`부터 `#13`까지는 모두 closed 상태다. 완료된 이슈를 추가로 닫을 대상은 없었다.
- 다음 작업은 기존 GitHub backlog 처리보다 새 이슈를 만드는 방식이 적합하다. 후보는 Image Block prompt persistence/UX follow-up, Palette drag affordance QA, canvas pan/zoom interaction QA, provider API key가 들어온 뒤 실제 generation run smoke test 순서다.

## [2026-05-16] image-node-bottom-prompt-palette-drag-pan | UI interaction pass

- Image Block prompt 입력을 노드 하단 컨트롤 바로 위로 이동하고, 생성 이미지가 카드 전체를 채우는 상태에서도 반투명 `over-image` 입력층으로 남도록 했다. 입력값은 `ImageGenerationNodeProperties.prompt`에 저장되어 local-first campaign state와 함께 유지된다.
- Image Block control tower는 한 줄 compact chip row로 줄였고, run button과 설정 chip이 prompt 아래에 붙도록 정리했다. 생성 결과 preview는 계속 Image Block 카드 전체를 `object-fit: cover`로 채운다.
- Generation Palette는 `DESIGN.md`의 불필요한 설명/라벨 제거 원칙에 맞춰 visible description과 `CREATE` kicker를 제거하고, 클릭 추가 대신 draggable palette item을 React Flow canvas drop 위치에 생성하도록 변경했다.
- Trackpad/two-finger wheel은 `panOnScroll` + `PanOnScrollMode.Free` + `zoomOnScroll={false}`로 캔버스 pan 동작에 연결했다.
- 검증: `node --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck` 통과. Playwright QA에서 palette Image drag-to-canvas 생성, generated asset seeded 상태에서 image full-card render, prompt 입력/저장, wheel pan transform 변경을 확인했다. Evidence는 `output/node-prompt-overlay-generated-evidence.png`에 남겼다.

## [2026-05-16] image-node-remove-redundant-output-preview | UI cleanup

- Image Block 내부의 작은 `space-primary-output-preview` 박스, top-right `space-node-status` 상태 pill, 해당 클릭 기반 next-node contextual menu를 제거했다. 생성 결과는 Image Block 전체 출력 영역에 반영되는 방향이므로, 별도 초록 preview box와 `Ready`/`Selected` label은 중복 UI로 판단했다.
- 생성 완료 상태에서는 `selectedResultAssetId`가 가리키는 image asset을 `space-generated-image-preview`로 Image Block 카드 전체에 `object-fit: cover` 렌더링하도록 했다. 생성 결과가 있으면 prompt placeholder는 숨긴다.
- 후속 블록 생성 경로는 Image Block의 `outputs.generated_image_asset` handle 드래그와 canvas-level line-end menu로 유지했다. Prompt 영역은 오른쪽 reserved gap을 제거해 `right: 22px`까지 넓혔다.
- 검증: `creative-canvas-screen-authoring-controls.test.ts`, Image model/adapter/component 통합 node test 91개, `npm run typecheck`, `git diff --check`가 통과했다. Browser QA에서는 새 Image Block 생성 후 `.space-primary-output-preview`, `.space-output-next-node-anchor`, `.space-output-next-node-menu`, `.space-node-status`가 없고 output handle이 유지되는 것을 확인했다. Mock generated asset QA에서는 `.space-generated-image-preview`가 있고 prompt placeholder가 사라지며 image `object-fit: cover`로 카드 전체를 채우는 것을 확인했다.

## [2026-05-16] de-console-creative-campaign-canvas-pass | Issues #9-#12

- `#9` 팔레트 카피를 Creative Operator가 바로 이해할 수 있는 Campaign block 언어로 줄이고, primary palette의 기술 배지를 숨겼다.
- `#10` 오른쪽 패널을 `Campaign brief` / `Campaign basics` 표면으로 재구성하고, readiness 요약과 Audience, Offer product, Offer, Channels, Assets, Goals 섹션을 우선 배치했다.
- `#11` Image Block 설정 패널은 Model summary, Inputs, Creative controls를 먼저 보여주고 provider diagnostics, adapter mapping, model limits는 `Developer details` disclosure 아래로 이동했다.
- `#12` overlay panel radius를 10px, field radius를 6px로 맞추고 내부 row/card 중첩감을 border/background card 대신 divider/typography 중심으로 낮췄다.
- Spec review follow-up: `#10` Source JSON Developer details를 오른쪽 패널 끝으로 이동해 Assets와 Goals 뒤에만 나타나게 했고, `#12` `.metadata-asset-row`/`.metadata-asset-details`를 border/background/radius card 처리 없이 divider/transparent row로 평평하게 조정했다.
- Quality follow-up: 실제 생성되는 Generation Block 정의의 `LLM Block`/`Agent Block`/`Custom Block`, `MODEL`/`PLUGIN`, `BYO provider` 계열 노출을 Creative Operator용 Copy, Prompt, Image Block, Video, Voice, Operator, DM, Landing, Plugin 카피로 교체했고, Channel routing/attribution 및 Landing behavior 내부 필드는 primary Campaign brief가 아니라 마지막 `Developer details`로 이동했다.
- 검증: focused source regressions 4개(`campaign blocks palette`, `right panel reads as a campaign brief`, `Image generation docs panel`, `creative canvas primary surfaces avoid console language`) 통과.
- 추가 검증: focused right-panel test, focused de-console containment test, full `creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, allowed-file `git diff --check`.

## [2026-05-16] project-structure-github-issue-skill-triage | Structure review

- OwnCanvas 루트(`/Users/junho/project/owncanvas`)에서 현재 구조를 확인했다. 앱은 React Router v7 기반이며 `app/features/creative-canvas/{model,adapters,components}`, `app/features/plugins/model`, `app/routes`, `wiki`, `.agents/skills`, `docs/seeds`가 주요 경계다.
- 현재 GitHub 원격은 `junho-baek/owncanvas`이고 `gh issue list --state all` 기준 open issue는 `#1`, `#6`, `#7`, `#8`, `#9`, `#10`, `#11`, `#12`, `#13`이다. `#2`-`#5`는 closed 상태다.
- 작업트리에는 이미 Image Block output drop menu와 Seedream provider-size/frame sync 관련 미커밋 변경이 있어 `#6`, `#7` 선행 버그의 완료 여부를 검증한 뒤 이슈 업데이트/closure를 판단하는 것이 좋다.
- 구조 파악용 Ouroboros 후보는 `ooo-brownfield`(repo/worktree/default context scan), `ooo-interview`(불명확한 요구사항 정리), `ooo-qa`(문서/구조 산출물 빠른 품질 판정), `ooo-publish`(Seed를 GitHub Issues로 변환) 순서가 적합하다. `ooo-evaluate`는 구조 탐색보다는 실행 결과나 artifact의 3-stage 검증용이다.
- `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고했으므로 이번 구조 판단은 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/`, 실제 코드/이슈 상태를 fallback source로 사용했다.

## [2026-05-16] image-output-drop-to-empty-next-node-menu | Task 0

- 원인: React Flow가 `nodesConnectable={false}`로 연결 제스처를 전역 비활성화하고 있었고, parent `ReactFlow`에 `onConnectStart`/`onConnectEnd` 경로가 없어 Image Block의 `outputs.generated_image_asset` 핸들을 빈 Creative Canvas에 드롭해도 output choices 메뉴를 열 수 없었다.
- 수정: Image Block 출력 핸들에서 시작한 연결이 `outputConnectionReady` 및 `selectedResultAssetId` 조건을 만족할 때만 pending source를 저장하고, invalid connect end 좌표에 parent-level `canvas-output-drop-menu`를 열도록 했다. 메뉴는 기존 `resolveImageGenerationOutputNextNodeActions()`와 `handleImageOutputNextNodeAction()`을 재사용해 클릭/키보드 메뉴와 같은 downstream generation block/edge 생성 경로를 유지한다.
- 품질 보강: Image Block의 generated image output handle만 `canOpenNextNodeMenu` 상태에서 connectable이 되도록 좁혔다. Generic Generation Block source/target handle과 Image Block prompt/reference target handle은 `isConnectable={false}`로 고정해, 유효해 보이지만 edge/menu가 생기지 않는 드롭 경로를 막았다. Empty canvas 드롭 메뉴 좌표도 viewport 안으로 clamp한다.
- 후속 UI 보강: 사용자가 제시한 manual QA 목표에 맞춰 메뉴를 선 끝점 기준 command-list surface로 키우고, `DESIGN.md`의 `canvas`, `ink`, `hairline`, `surface-soft`, `rounded.md/sm` 계열 토큰에 맞췄다. 드롭 직후 이어지는 pane click이 메뉴를 즉시 닫지 않도록 한 번만 suppress하는 guard도 추가했다.
- 검증: 새 회귀 테스트 `Image output drag to empty canvas opens the next-node menu`가 실패 후 통과했고, `node --experimental-strip-types --test --test-name-pattern "Image output drag to empty canvas opens the next-node menu" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `git diff --check -- app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/components/creative-canvas-screen.tsx app/app.css wiki/log.md`가 통과했다. Browser QA는 seeded output-ready campaign에서 output handle을 빈 캔버스 좌표 `(480, 530)`에 드롭했고, 메뉴가 `(488, 538)`에 열리는 evidence를 `output/image-output-drop-menu-evidence.png`와 `output/browser-qa-summary.json`에 남겼다.

## [2026-05-16] image-generation-seedream-provider-size-frame-sync | Issue #6

- Seedream-like `replicate:bytedance/seedream-3` provider requests now derive `input.size` from manual Image Block frame dimensions when the user has resized the compact canvas node and has not supplied an explicit provider size.
- Explicit provider `size`, `guidance_scale`, and `seed` controls still win over frame-derived defaults.
- GPT Image ratio mapping/rejection behavior remains unchanged.
- 검증: focused Seedream provider-size test, full `image-generation-node.test.ts`.

## [2026-05-16] github-issue-closure-and-remaining-plan | Issues #2-#13

- GitHub issue `#2`, `#3`, `#4`, `#5`를 기존 위키/테스트 완료 근거에 따라 `completed` reason으로 닫았다. 각 이슈에는 관련 `wiki/log.md` evidence entry를 요약한 closure comment를 남겼다.
- `#6`은 GPT Image compatibility 쪽 완료 근거는 충분하지만 Seedream-like custom size/frame reconciliation 근거가 부족해 열린 상태로 유지했다.
- 현재 open issue는 `#1`, `#6`, `#7`, `#8`, `#9`, `#10`, `#11`, `#12`, `#13`이다.
- 남은 작업 실행 계획을 [OwnCanvas Remaining Issues Implementation Plan](../docs/superpowers/plans/2026-05-16-owncanvas-remaining-issues.md)에 작성했다. 계획은 `#6` Seedream provider size contract, `#7`/`#13` browser evidence, `#9`-`#12` de-console UI pass, 그리고 epic closure 순서를 포함한다.
- 참고: 이번 계획 문서는 사용자가 `superpowers:writing-plans`를 직접 지정해 스킬 기본 경로인 `docs/superpowers/plans/`에 생성했다. 평소 기본 작업 기억은 계속 `wiki/`에 남긴다.

## [2026-05-16] github-open-issue-triage | GitHub Issues

- `junho-baek/owncanvas` GitHub 이슈를 `gh issue list`로 확인했다. 현재 open issue는 13개(`#1`-`#13`)이고 closed issue와 open PR은 없다.
- `#1` Image Generation Node v2 epic 아래 task `#2`-`#7`, `#8` De-console creative campaign canvas epic 아래 task `#9`-`#13`가 모두 GitHub에서는 open/unchecked 상태다.
- 위키 로그 기준으로 `#2`-`#6`에 해당하는 Image Generation Node v2 작업은 상당 부분 구현/검증 기록이 있으나, GitHub 체크박스와 이슈 상태는 아직 동기화되지 않았다. `#7`은 실제 browser screenshot/console evidence가 sandbox 제약으로 남은 검증 리스크다.
- `#8`-`#13`은 2026-05-15에 생성된 de-console UI/design backlog로, 아직 구현 기록이나 체크박스 완료 표시가 없다.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고했고, 이번 확인은 `github` skill + `llm-wiki` workflow와 `gh` CLI로 수행했다.

## [2026-05-15] image-generation-provider-payload-mapping-rejection-tests | Sub-AC 5.4 retry 2

- Provider payload creation regression을 보강해 같은 aspect-ratio compatibility path가 mapping과 rejection 모두에 적용되는지 명시했다.
- GPT Image-like `replicate:openai/gpt-image-1`는 configured compatibility mapping을 통해 OwnCanvas `9:16 -> 2:3`, `16:9 -> 3:2` provider payload를 만들고 `image_generation.aspect_ratio_mapped` warning을 유지한다.
- Seedream 3의 unsupported `4:5`는 `resolveImageGenerationAspectRatioCompatibilityRule()`에서 `disable` rule로 해석되고, `validateImageGenerationNodeModelOptions()`가 `image_generation.aspect_ratio_unsupported` error/feedback을 만든 뒤 provider request creation이 payload assembly 전에 reject한다.
- 검증: `npm run skills:check`, focused provider payload tests, full `image-generation-node.test.ts` 44개, `react-flow-canvas.test.ts` 17개, `creative-canvas-screen-authoring-controls.test.ts` 26개, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. production code 변경과 browser UI 변경은 없어서 screenshot은 새로 생성하지 않았다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-ratio-selector-provider-aware-options | Sub-AC 5.2.2

- Image Generation Node v2 compact ratio selector가 active provider/model capability를 기준으로 OwnCanvas ratio option의 provider availability를 렌더링하도록 갱신했다.
- 새 `resolveImageGenerationAspectRatioSelectorOptions()` helper는 native option, `map_nearest` mapped option, hard-disabled option을 구분한다. GPT Image-like model에서는 `9:16 -> 2:3`, `16:9 -> 3:2`가 enabled mapped option으로 표시되고, native `1:1`은 그대로 표시된다.
- `<option>`에 `data-provider-ratio`, `data-provider-ratio-availability`, `disabled`, compatibility title을 함께 노출해 browser/DOM QA에서 provider mapping 상태를 확인할 수 있게 했다. Compact node UI와 inspector/docs/tray boundary는 유지했다.
- 검증: focused ratio selector tests 3개, model/component/adapter suite 83개, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 증거 시도: `HOST=127.0.0.1 PORT=4173 npm start`는 sandbox에서 `listen EPERM: operation not permitted 127.0.0.1:4173`로 실패해 실제 screenshot은 남기지 못했다.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-gpt-ratio-capability-metadata | Sub-AC 5.2.1

- GPT Image-like Replicate model capability metadata를 재검증했다. `replicate:openai/gpt-image-1`은 provider-native `supportedAspectRatios: ["1:1", "2:3", "3:2"]`, `defaultAspectRatio: "2:3"`, `schemaAdapter.unsupportedRatioBehavior: "map_nearest"`를 유지한다.
- `imageGenerationAspectRatioCompatibilityMapping`에 GPT Image `16:9 -> 3:2` explicit mapping을 추가했다. 기존 `9:16 -> 2:3` mapping은 유지한다.
- generic `map_nearest` fallback이 모든 unsupported ratio를 model default로 보내지 않도록 numeric nearest-ratio helper를 추가했다. numeric parsing이 불가능한 ratio는 model default로 fallback한다.
- provider request regression을 보강해 GPT Image OwnCanvas `16:9` state가 validation warning을 유지하면서 Replicate payload `aspect_ratio: "3:2"`로 조립되는지 검증했다. `9:16`은 계속 `2:3`으로 매핑된다.
- Durable note 갱신: [GPT Image 비율 호환성 규칙 | GPT Image Ratio Compatibility Rules](analyses/image-generation-gpt-ratio-compatibility-rules.md).
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, project docs/wiki fallback 사용), focused provider mapping tests 3개, full `image-generation-node.test.ts` 41개, `npm run typecheck`, `npm run build`, `git diff --check`.
- commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-reference-provider-scenarios | Sub-AC 3.4.4

- Image Generation Node v2 reference attachment tray의 provider/model scenario 회귀 테스트를 추가했다.
- 새 focused test는 Seedream 3 unsupported reference rejection/empty state, GPT Image single-reference provider binding/replacement/count validation, Nano Banana multi-reference provider binding/tray validation/reorder affordance를 한 번에 검증한다.
- TypeScript gate를 막던 checkpoint 상태의 reference tray state 선언 순서와 adapter test fixture shape를 함께 정리했다.
- 검증: focused provider scenario test, full `image-generation-node.test.ts` 38개, component source suite 24개, `npm run typecheck`, `git diff --check`.
- 참고: `react-flow-canvas.test.ts`는 output next-node action의 downstream image reference attachment expectation 2개가 현재 실패한다. 원인은 fallback Freepik-compatible target Image Block이 capability registry에 없어 `attachImageGenerationNodeReferenceTransition()`이 recent-output reference를 거부하는 흐름이다. `npm run build`는 sandbox에서 출력 없이 장시간 대기해 완료 여부를 확인하지 못했다. `npm run skills:check`도 동일하게 반환되지 않아 project docs/wiki fallback을 사용했다.

## [2026-05-15] image-generation-gpt-ratio-compatibility-rules | Sub-AC 5.1.1

- 기존 seed/config/test를 기준으로 GPT Image-like ratio 제약을 확인했다. Replicate `openai/gpt-image-1`의 provider-native ratios는 `1:1`, `2:3`, `3:2`이며 OwnCanvas 기본 `9:16`은 native provider input으로 보내면 안 된다.
- Canonical rule은 `map_nearest`다. OwnCanvas state는 `9:16`을 보존할 수 있지만, GPT Image-like provider payload 생성 전 model default `2:3`으로 매핑하고 `image_generation.aspect_ratio_mapped` warning 및 `9:16 is not native to GPT Image.` compatibility message를 inspector/docs에 표시해야 한다.
- GPT Image-like reference support는 single reference로 기록했다. Multi-reference tray/action은 추가 attachment를 disabled/rejected reason으로 설명해야 한다.
- Durable note: [GPT Image 비율 호환성 규칙 | GPT Image Ratio Compatibility Rules](analyses/image-generation-gpt-ratio-compatibility-rules.md).
- 검증: `npm run skills:check`, source/config/test review, `git diff --check`.

## [2026-05-15] image-generation-node-provider-panel-browser-matrix-qa | Sub-AC 2.4.2 retry 2

- Image Generation Node v2 provider-aware inspector/docs panel content를 `output/provider-panel-browser-qa.mjs` QA artifact로 검증했다. Artifact는 provider preset 3개(OpenAI Image, Replicate, Freepik-style)와 resolved Replicate model 3개(Nano Banana, GPT Image, Seedream 3)를 모두 렌더링한다.
- 각 case는 Provider settings, Provider model docs, Required inputs, Optional controls, Schema adapter, Compatibility 섹션을 포함하고 provider/model name, supported ratios, schema key, optional controls, compatibility warnings, credential env var name-only rendering을 검사한다.
- GPT Image case는 `9:16 is not native to GPT Image.` 및 single-reference warning을 표시하고, Seedream 3 case는 reference unsupported warning을 표시한다. OpenAI Image/Freepik-style preset fallback은 capability metadata missing warning과 provider env var name만 표시한다.
- Compact node UI를 page-like generator로 확장하지 않았고, raw JSON/provider debug/secret value 노출도 검사에서 제외했다. 새 product source 변경은 하지 않고 QA artifact만 갱신했다.
- 검증: `npm run skills:check`, `node --experimental-strip-types output/provider-panel-browser-qa.mjs`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 증거 시도: Playwright CLI wrapper는 `open`/`snapshot` 모두 출력 없이 장시간 대기했고, headless Chrome screenshot도 repo-local profile에서 종료되지 않았다. Computer Use Chrome access는 MCP approval denied로 막혔다. 대신 `output/provider-panel-browser-qa.html` 정적 artifact와 deterministic DOM/content checks를 남겼다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-output-next-node-handler-wiring | Sub-AC 4.3.2

- Output-to-next-node contextual menu handler wiring을 검증했다. `FreepikReferenceImageNode`의 menu item click은 `action.kind`와 `selectedResultAssetId`를 상위 handler로 전달하고, screen-level handler는 `applyImageOutputNextNodeActionToCanvas()`를 호출해 실제 downstream node/edge creation 경로로 연결한다.
- Adapter helper는 `image-edit`, `style-variant`, `upscale`을 Image Block, `video`를 Video Block, `output-card`를 Creative Output card, `landing-asset`을 Landing Block으로 생성하며 selected output asset id, source node id, action kind, default config, selected payload fields를 node/edge/campaign spec에 유지한다.
- 새 코드 변경은 필요하지 않았고, 기존 checkpoint 구현이 Sub-AC 4.3.2 acceptance를 충족함을 focused 및 integration regression으로 확인했다. compact Image Block 중심 UX, generic circular border handle 금지, secret value 비노출 제약은 유지했다.
- 검증: `npm run skills:check`, focused next-node handler tests 2개, model/adapter/component 관련 suite 72개, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-output-next-node-flow | Sub-AC 4.2.4

- Image Generation Node v2 output contextual menu action을 `applyImageOutputNextNodeActionToCanvas()` adapter helper로 정리해 component event handler가 기존 React Flow nodes/edges와 Campaign JSON sync 경로를 그대로 사용하도록 연결했다.
- Helper는 image edit, style variant, upscale, video, output/result card, landing asset action별 downstream node kind, target port, edge label, source output asset metadata를 생성하고 새 node를 선택 상태로 만든다.
- 단일 Image Block처럼 기존 id suffix와 node 배열 길이가 어긋난 canvas에서도 downstream node id가 중복되지 않도록 다음 unused id index를 찾는 guard를 추가했다.
- Focused adapter regression은 6개 menu action 전체가 node, edge, ports, metadata, selection, persisted `campaignSpec`/`canvasState`로 동기화되는지 검증한다. Component source regression은 output preview menu trigger/action handler가 adapter helper를 호출하는 wiring을 확인한다.
- 검증: focused next-node tests, model/adapter/component 관련 suite 71개, focused strict adapter `tsc`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 증거 시도: `npm run start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패해 screenshot은 생성하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-inspector-docs-browser-qa | Sub-AC 2.4.1

- Compact Image Block의 inspector/docs trigger와 외부 panel 배치 경로를 QA했다. Source review에서 `ImageGenerationInspectorPanel`은 `canvas-overlays` sibling overlay로 렌더링되어 compact node 내부에 settings/docs surface를 넣지 않는 구조임을 확인했다.
- QA 중 panel wrapper class의 positioning/layout CSS가 비어 있어 실제 browser placement가 불안정할 수 있는 gap을 발견했고, `image-generation-inspector-panel` fixed overlay, scroll bounds, two-column inspector/docs grid, responsive single-column fallback을 추가했다.
- 회귀 테스트는 compact node 안에 inspector/docs panel class가 없는지, panel이 fixed external overlay로 배치되는지, provider schema/docs/required inputs/optional controls/credential env var name만 표시하는지 검증한다.
- 검증: focused inspector/docs tests 3개, model/adapter/component 관련 suite 69개, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 서버 시도: `npm run dev -- --host 127.0.0.1 --port 5173`는 watcher `EMFILE`, `HOST=127.0.0.1 PORT=4173 npm run start`는 sandbox `listen EPERM: operation not permitted 127.0.0.1:4173`로 실패해 실제 browser screenshot은 생성하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-credential-status-display | Sub-AC 3

- Image Generation Node v2 inspector/docs metadata에 `credentialStatus`를 추가해 selected provider/model의 credential 상태를 env var binding 기준으로 표현하도록 했다.
- Inspector panel의 provider settings 영역은 `Credential status` row에서 상태 label과 관련 env var name만 렌더링하며, credential value/API key/token 형태의 필드는 사용하지 않는다.
- UI 스타일은 inspector panel 내부의 compact status row에 한정했고, compact Image Block surface에는 credential/debug copy를 추가하지 않았다.
- 검증: focused docs panel metadata/component tests, focused strict model `tsc`, relevant model/component/adapter test suite 67개, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 증거 시도: `npm run start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-docs-required-inputs | Sub-AC 2.2.3 retry 1

- Image Generation Node v2 inspector/docs panel이 selected provider/model의 `resolveImageGenerationDocsPanelMetadata()` 결과를 사용해 documentation section에 required input rows를 렌더링하고 있음을 확인했다.
- Required inputs section은 각 required control의 label, provider schema key, control kind를 표시하며 required input이 없을 때는 provider schema 확인 fallback row를 표시한다.
- 검증: focused docs panel tests, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: `npm run start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패했다.
- 참고: `node scripts/check-skills.mjs`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-resize-policy-focused-tests | Sub-AC 1.4

- Image Generation Node v2 manual resize policy에 focused model regression을 추가했다.
- 추가 테스트는 automatic aspect-ratio frame sync, `frame.source = "user-resize"` manual override precedence, explicit reset/clear 후 automatic sync 복귀를 각각 독립적으로 검증한다.
- 기존 browser-verifiable DOM state coverage(`data-image-aspect-ratio`, `data-image-frame-source`, `data-image-frame-width`, `data-image-frame-height`)와 React Flow persistence coverage를 함께 재검증했다.
- 검증: focused resize-policy tests, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 smoke check는 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox에서 `listen EPERM: operation not permitted 0.0.0.0:3000`으로 막혀 수행하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-manual-resize-explicit-reset | Sub-AC 1.3

- Image Generation Node v2 manual resize policy를 보강해 `frame.source = "user-resize"` 상태에서는 이후 automatic aspect-ratio frame sync가 manual dimensions를 덮어쓰지 않도록 명시했다.
- `resetImageGenerationNodeFrameToAspectRatioTransition()`을 추가해 manual frame을 selected `aspectRatio`의 canonical compact frame으로 되돌리는 유일한 explicit reset 경로를 분리했다.
- Model 회귀 테스트는 ratio 변경과 automatic sync가 manual `388x640` frame을 보존하고, explicit reset만 `createImageGenerationFrame("1:1")`와 `source: "aspect-ratio"`로 복원하는 계약을 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-resize-precedence-coverage | Sub-AC 2.4

- Compact Image Block wrapper에 `data-image-aspect-ratio`, `data-image-frame-source`, `data-image-frame-width`, `data-image-frame-height`를 추가해 브라우저에서 automatic aspect-ratio frame과 manual resize precedence 상태를 직접 확인할 수 있게 했다.
- `creative-canvas-screen-authoring-controls.test.ts`에 browser-verifiable resize precedence 회귀 테스트를 추가해 compact node, `NodeResizer` ratio lock, ratio selector frame sync 경로가 유지되는지 확인한다.
- 기존 model/adapter 테스트로 automatic aspect-ratio 변경, manual resize 기록, manual frame이 subsequent ratio selection에 의해 덮이지 않는 precedence를 재검증했다.
- 검증: focused failing-first UI test, focused resize precedence model/adapter tests, full relevant model/adapter/component tests, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-15] image-generation-node-inspector-dimension-stability | Sub-AC 2.1.4

- Compact Image Block dimensions are verified to remain derived only from the stored/clamped image generation frame while the external inspector/docs panel opens, closes, and refreshes metadata.
- Existing regression coverage confirms inspector open/close transitions mutate `uiState` without changing `frame`, and the `GenerationBlockNode` render style uses `frameWidth`/`frameHeight` without coupling dimensions to `inspectorOpen` or `docsPanelOpen`.
- 검증: focused compact-dimension stability test, focused inspector tests, full component/model/adapter suites, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: `npm run start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패했다.

## [2026-05-15] image-generation-node-manual-resize-precedence | Sub-AC 2.3 retry 2

- Manual resize precedence 경로를 재검증하고, `resizeImageGenerationNodeFrameTransition()`이 `frame.source = "user-resize"`를 기록한 뒤 `selectImageGenerationNodeAspectRatioTransition()`의 자동 aspect-ratio frame sync가 manual frame dimensions를 덮어쓰지 않는 계약을 확인했다.
- React Flow canvas sync는 node width/height가 저장된 frame과 달라질 때만 manual resize transition을 호출해 Campaign spec에 user resize source를 남긴다.
- Typecheck를 막던 reference attachment metadata clone helper 누락을 같은 model 파일에서 보완해 기존 reference tray 변경의 nested metadata cloning 의도를 유지했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-15] image-generation-node-reference-attachment-metadata | Sub-AC 3.1.3

- Reference attachment draft validation now normalizes upload, URL, existing campaign asset, and recent generated output references into `ImageGenerationNodeReferenceInput` with safe provider-aware `attachmentMetadata`.
- Metadata records the source kind, provider/model, env var name, schema key/input control id, reference mode, accepted reference types, max reference count, and non-secret file/URL/asset/output details.
- Compact tray UI now validates upload/URL drafts against the selected model capability while preserving the existing compact tray affordance and `accept="image/*"` control.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, focused component/adapter tests, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-15] image-generation-node-frame-source-state-retry2 | Sub-AC 2.1 retry 2

- 현재 공유 작업공간에 `ImageGenerationFrameSource = "aspect-ratio" | "user-resize"`와 `ImageGenerationFrame.source`가 이미 적용되어 있음을 확인했다.
- Ratio automation 경로(`createImageGenerationFrame()`, `selectImageGenerationNodeAspectRatioTransition()`)는 `"aspect-ratio"` source를 기록하고, manual resize 경로(`resizeImageGenerationNodeFrameTransition()`, React Flow canvas sync)는 `"user-resize"` source를 Campaign spec에 보존한다.
- 추가 구현 변경 없이 Sub-AC 2.1의 explicit frame resize source/state model acceptance를 재검증했다.
- 검증: focused frame-source tests, focused strict `tsc`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`.

## [2026-05-15] image-generation-node-reference-tray-controls | Sub-AC 3.1.1 retry 1

- Compact Image Block에 selected/reference tray 상태에서 보이는 `space-reference-tray`를 추가하고, 카드 바깥의 tray에 reference image file upload control과 image URL attachment input을 배치했다.
- Tray는 `reference_image` asset port가 있을 때만 렌더링되며, compact node card/primary output preview 구조를 유지하고 page-like generator surface를 만들지 않는다.
- Regression은 reference tray visibility guard, `type="file"` + `accept="image/*"`, `type="url"` + URL placeholder, tray CSS 위치/크기를 확인한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "reference tray upload and URL" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-15] image-generation-node-ratio-frame-sync | Sub-AC 3.2 retry 2

- Image Generation Node v2의 ratio selector 변경이 `selectImageGenerationNodeAspectRatioTransition()`을 통해 `aspectRatio`와 `frame`을 함께 갱신하도록 확인했다.
- `createImageGenerationFrame()` 기준으로 `9:16`, `1:1`, `16:9` frame dimensions가 각각 compact node 크기에 반영되고, React Flow node `width`/`height` 및 campaign JSON persistence가 같은 frame 값을 유지한다.
- Compact Image Block UI는 ratio `<select>` 변경 시 node data properties와 React Flow dimensions를 동시에 업데이트하며, node 내부 렌더링은 저장된 frame을 compact frame limits 안에서 사용한다.
- 검증: focused ratio tests, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: `npm run start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패했다.
- 참고: `npm run skills:check`는 sandbox에서 출력 없이 반환되지 않아 `node scripts/check-skills.mjs`로 확인했고, 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다.

## [2026-05-15] image-generation-node-inspector-trigger | Sub-AC 2.1.1 retry 1

- Compact Image Block의 기존 bottom settings chip을 `Open image inspector and docs` trigger로 연결해 node body layout을 바꾸지 않고 inspector/docs panel state를 열도록 했다.
- `openImageGenerationNodeInspectorTransition()`은 `viewMode: compact`를 유지하면서 `inspectorOpen`과 `docsPanelOpen`만 true로 전환하고, reference tray와 frame은 건드리지 않는다.
- Creative Canvas React Flow node renderer는 trigger click을 node id 기준으로 persisted node properties에 반영하고 campaign canvas sync를 유지한다.
- 검증: focused inspector trigger tests, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: `npm run start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패했다.
- 참고: `npm run skills:check`는 sandbox에서 출력 없이 반환되지 않아 `node scripts/check-skills.mjs`로 확인했고, 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 project-local fallback을 사용했다.

## [2026-05-15] image-generation-node-manual-resize-policy | Sub-AC 1.1

- Image Generation Node v2의 manual resize precedence를 `ImageGenerationFrame` model comment와 `selectImageGenerationNodeAspectRatioTransition()` inline comment에 명시했다.
- 명시한 규칙: explicit aspect-ratio 선택은 해당 ratio의 canonical compact frame으로 `frame`을 reset하지만, 사용자 manual resize는 다음 `frame`을 기록하고 다음 explicit ratio 변경 전까지 우선한다.
- Render/persistence 경로는 `aspectRatio`에서 매번 frame을 재계산하지 않고 저장된 `frame` dimensions를 소비해야 한다는 계약을 남겼다.

## [2026-05-14] image-generation-node-level1-conflict-review | Level coordinator

- Level 1 parallel AC 결과의 공통 수정 파일 `creative-canvas-screen-authoring-controls.test.ts`, `wiki/log.md`를 검토했다.
- AC1의 9:16 기본 ratio regression, AC10의 compact node regression, AC14 계열 status/error feedback fixture 기록이 모두 보존되어 있고 conflict marker나 whitespace 오류가 없음을 확인했다.
- 별도 병합 수정은 필요하지 않았으며, authoring controls regression suite가 통과했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `git diff --check -- app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts wiki/log.md`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다.

## [2026-05-14] image-generation-node-error-recovery-feedback-fixtures | Sub-AC 14.4.3

- Image Generation Node v2 상태 feedback fixture에 retryable provider error, non-retryable provider error, recovery queued, recovery succeeded 시나리오를 추가했다.
- Error/recovery fixture는 compact status badge와 single primary output preview만 렌더링하며, `button`, `form`, retry/generate action, fullscreen/page-like class를 포함하지 않는다는 회귀 assertion을 추가했다.
- Recovery queued는 이전 error reason을 지우고 output을 `empty-output`으로 유지하며, recovery succeeded는 selected output과 `success` output state를 통해 다음 노드 연결 가능 상태를 표현한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "error and recovery fixtures|status feedback story fixtures" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/components/image-generation-node-status-feedback.fixtures.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: `npm start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패했다.

## [2026-05-14] image-generation-node-model-capability-fixtures | Sub-AC 4.4.1 retry 2

- Image Generation Node v2 model capability fixture를 `app/features/creative-canvas/model/image-generation-node.fixtures.ts` 기준으로 테스트에 연결했다.
- fixture coverage는 Replicate `google/nano-banana`의 9:16 default와 Replicate `openai/gpt-image-1`의 제한된 aspect ratio/control surface를 함께 고정한다.
- `model capability fixtures cover vertical defaults and restricted unsupported options` regression은 fixture count, default aspect ratio, supported/unsupported aspect ratios, unsupported control kinds, unsupported ratio behavior, reference image limit을 검증한다.
- 공유 작업공간에 있던 `completeImageGenerationNodeTransition` test/import와 model export 간 불일치를 같은 model state contract 안에서 정리해 model suite가 다시 실행되도록 했다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "model capability fixtures" app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/image-generation-node.ts app/features/creative-canvas/model/image-generation-node.fixtures.ts app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-14] image-generation-node-output-area-states | Sub-AC 14.2.3 retry 2

- Image Generation Node v2 output area가 `success`, `error`, `cancelled`, `empty-output` 상태를 `resolveImageGenerationNodeOutputView()` 계약으로 렌더링하도록 공유 작업공간에 반영되어 있음을 확인했다.
- Compact Image Block UI는 단일 `space-primary-output-preview`에서 `data-output-state`, 상태별 class, aria label, 짧은 label을 사용해 output area feedback을 표시한다.
- `cancelled`는 node lifecycle status에도 포함되어 cancelled output area와 compact lifecycle badge가 같은 상태 어휘를 공유한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "output area states" app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: `npm start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패했다.

## [2026-05-14] image-generation-node-status-model | Sub-AC 14.1 retry 2

- Image Generation Node v2의 상태 모델이 `idle`, `selected`, `running`, `completed`, `error`를 포함하도록 공유 작업공간에 이미 반영되어 있음을 확인했다.
- `ImageGenerationNodeUiState.status`, `createImageGenerationNodeUiState()`, `resolveImageGenerationNodeStatus()`가 compact node의 selected override, 실행 중 진행률, 완료 후 output readiness, error reason을 표현한다.
- Compact Image Block UI는 `role="status"`와 `data-status`를 통해 상태 feedback을 렌더링하고, selected/running/completed/error tone을 CSS로 구분한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "status model|status feedback" app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 출력 없이 반환되지 않아 `node scripts/check-skills.mjs`로 직접 확인했고, 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다.

## [2026-05-14] image-generation-node-status-view-mapping | Sub-AC 14.2.1 retry 2

- Image Generation Node v2의 상태-to-view mapping layer를 compact status feedback 계약으로 고정했다.
- `resolveImageGenerationNodeStatusView()`는 `idle`, `selected`, `running`, `completed`, `error`를 label/className/ariaLabel/status metadata로만 변환하며 generation invoke/retry/run action metadata를 포함하지 않는다.
- Compact Image Block UI regression은 inline status label 조건문 대신 `nodeStatusView`의 `className`, `status`, `ariaLabel`, `label`을 사용하도록 정렬했다.
- 이 작업은 generation action invocation 또는 실행 로직을 변경하지 않았다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "status" app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-14] image-generation-node-initial-model-capability-entries | Sub-AC 4.2.2

- Image Generation Node v2 registry의 초기 Replicate model capability entries가 Nano Banana, GPT Image, Seedream 3를 포함하고 각 entry가 `defaultAspectRatio`, `supportedAspectRatios`, `inputControls`, `schemaAdapter`, `referenceSupport`, `outputConstraints`를 함께 드러내도록 회귀 테스트를 보강했다.
- GPT Image Replicate schema mapping은 seed reference의 `input_images` 표현에 맞춰 reference input schema/control id를 `input_images`로 정렬했다.
- Nano Banana와 Seedream 3는 9:16을 직접 기본 ratio로 유지하고, GPT Image는 지원 ratio 제한 때문에 2:3 default와 `map_nearest` unsupported-ratio behavior를 명시한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "initial image model registry entries" app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/image-generation-node.ts app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-14] image-generation-node-compact-primary-preview | Sub-AC 10.2 retry 1

- Compact Image Generation Node 표면에서 preview grid UI가 제외되어 있고, 단일 `space-primary-output-preview`만 남아 있음을 확인했다.
- 회귀 테스트는 `FreepikReferenceImageNode` 범위에 `freepik-preview-grid`, `freepik-preview-panel`, preview image asset, `outputs/generatedAssetIds.map(...)`, inline `<img>`가 없는지 검증한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "single primary output preview|compact and not page-like" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`.
- 브라우저 스크린샷 시도: `npm start -- --host 127.0.0.1 --port 5173`는 sandbox `listen EPERM`, `npm run dev -- --host 127.0.0.1 --port 5173`는 watcher `EMFILE: too many open files`로 실패해 실제 screenshot은 생성하지 못했다.

## [2026-05-14] image-generation-node-provider-capability-registry | Sub-AC 4.2.1 retry 1

- Image Generation Node v2 방향의 provider-aware model capability registry shape를 `app/features/creative-canvas/model/image-generation-node.ts`에 명시했다.
- registry는 provider/model key(`providerId:modelSlug`), default model, provider별 model slug 목록, keyed lookup map을 포함하며, 각 model capability는 provider/model/capabilities/schemaAdapter 경계를 함께 가진다.
- 공개 lookup API로 `createImageGenerationModelCapabilityKey()`, `getImageGenerationModelCapability()`, `getDefaultImageGenerationModelCapability()`, `listImageGenerationModelCapabilities()`를 추가했다.
- Nano Banana, GPT Image, Seedream 3 기존 capability metadata에 Replicate schema adapter field mapping slot을 추가했다. credential value는 저장하지 않고 env var name만 유지한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "capability registry lookup" app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/image-generation-node.ts app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: 이 Sub-AC는 model/API 계약만 변경했으므로 browser screenshot은 별도 UI Sub-AC에서 검증한다.

## [2026-05-14] image-generation-node-compact-resize-bounds | Sub-AC 10.1 retry 1

- Spaces-style Image Block이 page-like generator surface로 커지지 않도록 `GenerationBlockNode`의 image-generation render path에 compact frame clamp를 추가했다.
- React Flow `NodeResizer`도 `IMAGE_GENERATION_COMPACT_FRAME_LIMITS`의 min/max width/height를 사용하게 바꿔, 9:16 기본 프레임과 사용자 resize 모두 compact canvas-node 범위 안에 남게 했다.
- 정적 UI 회귀 테스트는 min bound뿐 아니라 max resize bound, render-time clamp, fullscreen/page/preview-grid class 부재를 함께 확인한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: `npm run dev -- --host 127.0.0.1 --port 5173`는 watcher `EMFILE: too many open files`, `npm start -- --host 127.0.0.1 --port 5173`와 minimal `http.createServer(...).listen(5173, "127.0.0.1")`는 sandbox `listen EPERM`으로 실패해 실제 browser screenshot은 생성하지 못했다.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다.

## [2026-05-14] image-generation-node-v2-default-aspect-ratio | Sub-AC 1.1 retry 2

- 새 Image Block 생성 경로가 `createImageGenerationNodeProperties()`를 통해 `aspectRatio: "9:16"`와 세로형 locked frame `{ width: 360, height: 640 }`를 초기화하도록 확인했다.
- `createCampaignBlock("image")` 기본 properties와 이미지 노드 팩토리 기본값을 회귀 테스트로 고정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: start gate의 `npm run skills:check`는 sandbox에서 출력 없이 장시간 실행 상태로 남았고, `ps`/`pkill`도 process-list 권한 제한으로 사용할 수 없었다.

## [2026-05-15] image-generation-node-provider-ux-v2-checkpoint | Hermes

- 사용자 요청으로 Ouroboros job `job_30d549f26eb6` / execution `exec_3492c58e75cb`를 안전하게 취소했다. 취소 시점은 `Deliver | AC 3/18 | Sub-AC 18/44`였고 job result는 `Status: cancelled`로 확인했다.
- 취소 전까지의 검증 가능한 구현은 checkpoint로 보존했다: 9:16/default frame 기반, capability registry/schema metadata foundations, compact lifecycle/status feedback, unsupported option contract tests.
- focused gate 47개 테스트, `npm run typecheck`, `npm run build`, `git diff --check`가 통과했다.
- 완료 checkpoint는 `docs/seeds/image-generation-node-provider-ux-v2-completed.md`, 남은 작업 publish용 seed는 `docs/seeds/image-generation-node-provider-ux-v2-remaining.seed.yaml`로 분리했다.

## [2026-05-14] image-generation-node-final-port-affordance-cleanup | Hermes

- 사용자 레퍼런스 UI 기준으로 Image Generation Node의 남은 `style_template_vars` border handle과 우측 하단 원형 NodeResizer dot을 제거했다.
- 실제 연결 가능한 React Flow handles는 visible floating affordance 내부의 투명 hit target으로 유지하고, 파란 selection outline은 순수 선택 피드백으로 정리했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`, browser screenshot `browser_screenshot_ba713287a2f34c85b4d818a647c59019.png`.

## [2026-05-14] image-generation-node-level2-log-conflict-review | Level coordinator

- Level 2 parallel AC 결과의 공통 수정 파일 `wiki/log.md`를 검토했다.
- AC14 build verification, AC17 browser console guard, AC18 diff review PASS 기록이 모두 보존되어 있고 conflict marker나 whitespace 오류가 없음을 확인했다.
- 별도 병합 수정은 필요하지 않았으며, 다음 단계는 AC17의 실제 browser console 검증 sandbox 한계를 재검증 가능한 환경에서 해소하는 것이다.
- 검증: `rg -n '<<<<<<<|=======|>>>>>>>|image-generation-node-(build-verification|browser-console-guard|connection-affordance-review)' wiki/log.md`, `git diff --check`.

## [2026-05-14] image-generation-node-ac-conflict-coordination | Level coordinator

- Level 1 parallel AC 결과의 충돌 파일 `app/app.css`, `creative-canvas-screen.tsx`, `creative-canvas-screen-authoring-controls.test.ts`, `wiki/log.md`를 검토했다.
- `reference_image` handle이 visible image affordance와 분리된 보조 위치 계산으로 남아 있던 통합 충돌을 해소해, prompt/reference/output connection affordance가 모두 각 visible floating control 내부의 투명 `Handle`을 사용하도록 정렬했다.
- `style_template_vars` input은 visible affordance가 없으므로 투명 generic hit target으로만 유지해 선택 outline 위의 원형 dot이 보이지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `git diff --check`.

## [2026-05-14] image-generation-node-diff-check | AC16

- Spaces-style Image Generation Node 연결 affordance 수정 작업의 현재 combined diff에 대해 whitespace/error marker 검사를 수행했다.
- 검증: `git diff --check`.

## [2026-05-14] image-generation-node-preview-grid-removal | AC11

- Spaces-style Image Generation Node 안에 preview grid가 다시 보이지 않도록 회귀 테스트를 추가했다.
- `FreepikReferenceImageNode` 소스 범위에 old `freepik-preview-grid`, `freepik-preview-panel`, preview image asset, inline `<img>` preview가 없는지 확인하고, CSS에도 `.freepik-preview-grid`가 남아 있지 않음을 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-14] image-generation-node-toolbar-retry-verification | AC6 retry 1

- Spaces-style Image Generation Node의 top-right floating action toolbar가 현재 구현에 유지되어 있음을 재확인했다.
- `space-node-toolbar nodrag`, `Node actions` 접근성 레이블, run/connect/delete/more 버튼, absolute top-right 배치가 기존 회귀 테스트로 보호된다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "top-right floating action toolbar" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`.

## [2026-05-14] image-generation-node-run-button-preservation | AC9

- Spaces-style Image Generation Node의 bottom-right circular run button 보존을 회귀 테스트로 고정했다.
- `space-run-button nodrag`, `Generate image` 접근성 레이블, Play 아이콘, absolute bottom-right 배치, 34px 원형 크기를 `creative-canvas-screen-authoring-controls.test.ts`에서 확인한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-14] image-generation-node-action-toolbar-preservation | AC6

- Spaces-style Image Generation Node의 top-right floating action toolbar 보존을 회귀 테스트로 고정했다.
- `space-node-toolbar nodrag`와 `Node actions` 접근성 레이블, run/connect/delete/more 버튼, absolute top-right 배치를 `creative-canvas-screen-authoring-controls.test.ts`에서 확인한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-14] image-generation-node-border-handle-removal | AC 1

- Image Generation Node의 선택 파란 outline 위에 보이던 기본 원형 React Flow handle을 제거했다.
- 실제 연결 가능한 `Handle`은 유지하되 `.image-port-handle`을 투명한 36px hit target으로 바꾸고, reference/image input 및 generated output handle 위치를 floating affordance 근처로 옮겨 border dot처럼 보이지 않게 했다.
- prompt input handle은 floating T/text affordance 내부의 투명 embedded handle로 유지되어 selection outline과 시각적으로 분리된다.
- 검증: `npm run typecheck`, `npm run build`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `git diff --check`.
- 참고: sandbox에서 `npm run dev`는 `EMFILE: too many open files, watch`, `npm run start -- --host 127.0.0.1 --port 3000`는 `EPERM: operation not permitted 0.0.0.0:3000`, Playwright CLI wrapper는 network-disabled `ENOTFOUND registry.npmjs.org`로 막혀 실제 브라우저 screenshot 생성은 수행하지 못했다.

## [2026-05-11] campaign-core-plugin-history-separation | Sub-AC 3.4.3

- Campaign commit history에서 `campaign-core:` 계약 커밋과 `plugin:` 변경 커밋이 별도 커밋으로 드러나는지 검증하는 `assertCampaignCorePluginCommitHistoryIsSeparated()`를 추가했다.
- 이 검증은 Campaign model contract 파일과 plugin adapter/provider/automation/extension 파일이 같은 커밋에 섞이면 실패하고, plugin 변경이 prior core 계약 커밋 뒤에 별도 `plugin:` 커밋으로 오는지 확인한다.
- `docs/commit-scope-policy.md`에 커밋 히스토리 스캔만으로 core 계약 커밋과 plugin 커밋의 분리가 보여야 한다는 규칙을 보강했다.
- 실제 `.git` index는 건드리지 않고 임시 index/object store에서 plugin 후보 커밋 `62c08562534bfec2ae26b639c1d7177779b52b9f`를 만들었고, 포함 파일이 plugin policy 파일 두 개뿐임을 확인했다. docs 보강은 별도 후보 커밋 `7f5677d5cbe3c9513a6b31ec9c77d8a218e08003`로 `docs/commit-scope-policy.md`만 포함함을 확인했다.
- 검증: failing-first `node --experimental-strip-types --test app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, passing same command, all scope-policy `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts app/routes/campaign-core-route-scope-policy.test.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts app/features/creative-canvas/client/campaign-storage-commit-scope-policy.test.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts app/features/creative-canvas/model/campaign-core-verification-policy.ts`, `node --test scripts/check-commit-title.test.mjs`, `npm run commit:title -- "plugin: verify campaign core plugin history"`, `git diff --check`, temp index `git diff-tree --no-commit-id --name-only -r 62c08562534bfec2ae26b639c1d7177779b52b9f`, temp index `git diff-tree --no-commit-id --name-only -r 7f5677d5cbe3c9513a6b31ec9c77d8a218e08003`.

## [2026-05-11] campaign-plugin-after-core-contract-commit | Sub-AC 3.4.2

- Campaign plugin 관련 파일 변경이 prior `campaign-core:` 계약 커밋 뒤의 별도 `plugin:` 커밋에만 포함되도록 plugin adapter scope regression을 보강했다.
- Creative-canvas adapter glue 중 `plugin` 문자열이 없는 provider, automation, extension adapter 파일도 plugin 변경으로 판정해 core 계약 커밋이나 선행 커밋에 섞이지 않게 했다.
- `docs/commit-scope-policy.md`에 external provider, automation, extension, agent/plugin route adapter 변경은 core 계약 이후 별도 `plugin:` 커밋이어야 한다고 명시했다.
- 실제 `.git` index는 건드리지 않고 임시 index/object store에서 core 계약 커밋 `5fe8e8d0dcaf6850d305f5fa36ae9d8050ba6acf` 뒤에 `plugin: adapt campaign provider contract` 후보 커밋 `9c8d6a31837874f7f8b8fe398e59bbc79657aa61`를 만들었고, 포함 파일이 plugin 정책 파일 두 개뿐이며 Campaign model 파일 매칭이 비어 있음을 확인했다.
- 검증: failing-first `node --experimental-strip-types --test --test-name-pattern "provider automation and extension" app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, passing same command, `node --experimental-strip-types --test app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, all scope-policy `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts app/routes/campaign-core-route-scope-policy.test.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts app/features/creative-canvas/client/campaign-storage-commit-scope-policy.test.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts app/features/creative-canvas/model/campaign-core-verification-policy.ts`, `node --test scripts/check-commit-title.test.mjs`, `npm run commit:title -- "plugin: adapt campaign provider contract"`, `git diff --check`, temp index `git diff-tree --no-commit-id --name-only -r 9c8d6a31837874f7f8b8fe398e59bbc79657aa61`.

## [2026-05-11] campaign-explainable-intermediate-states | AC 6

- Campaign commit sequence가 giant one-shot diff 없이 각 중간 상태를 설명할 수 있도록 `assertCampaignCommitSequenceHasExplainableIntermediateStates()` regression을 추가했다.
- 각 state는 단일 boundary, 독립 review 설명, 검증 명령, 다음 boundary를 반환하며 mixed Campaign areas는 “no explainable intermediate state” 오류로 거부한다.
- `docs/commit-scope-policy.md`에 intermediate Campaign commit이 diff 없이 설명해야 하는 항목을 명시했다.
- 검증: failing-first `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, passing same command.

## [2026-05-11] campaign-core-leading-contract-files-only | Sub-AC 3.4.1

- `createCampaignCoreContractCommitPlan()`과 `isCampaignCoreContractPath()`를 추가해 선행 `campaign-core:` 계약 커밋이 `app/features/creative-canvas/model/` Campaign model contract 파일과 focused model test만 포함하도록 명시했다.
- `assertCampaignCoreContractCommitExistsFirst()`가 이제 같은 core-only 계약을 사용해 API route, UI component/page/style, storage/client, plugin adapter 파일이 섞인 core 계약 커밋을 거부한다.
- `docs/commit-scope-policy.md`에 첫 Campaign contract commit에서 API/UI/storage/plugin/docs/tooling 파일을 제외한다고 보강했다.
- 실제 `.git` index는 건드리지 않고 임시 index/object store에서 `campaign-core: keep leading contract files core-only` 후보 커밋 `de909e25789c8c44de3913db7b03c10bfedd5531`를 만들었고, 포함 파일이 model policy 파일 두 개뿐임을 확인했다.
- 검증: failing-first `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, passing same command, all scope-policy `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts app/routes/campaign-core-route-scope-policy.test.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts app/features/creative-canvas/client/campaign-storage-commit-scope-policy.test.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/campaign-core-verification-policy.ts app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, `node --test scripts/check-commit-title.test.mjs`, `npm run commit:title -- "campaign-core: keep leading contract files core-only"`, `git diff --check`, temp index `git diff-tree --no-commit-id --name-only -r de909e25789c8c44de3913db7b03c10bfedd5531`.

## [2026-05-11] campaign-storage-after-core-contract-commit | Sub-AC 3.3

- Campaign storage 변경 커밋이 prior `campaign-core:` 계약 커밋 뒤에 별도 `storage:` 커밋으로 와야 한다는 전용 정책을 확인했다.
- Storage scope는 creative-canvas client persistence surface, model persistence mapping, route storage/compatibility 파일만 허용하고, UI component/page, Campaign core model, plugin adapter 파일이 섞이면 실패한다.
- `assertCampaignStorageCommitsFollowCoreContract()`가 storage-before-core, storage title 누락, mixed storage/plugin 파일을 거부해 storage 변경이 core 계약 이후의 별도 커밋에만 포함되도록 검증한다.
- 실제 `.git` index는 건드리지 않고 임시 index/object store에서 `storage: persist campaign core contract mapping` 후보 커밋 `8d5ad55f30fa20fa5602b4d71f11ea3e37e033d9`를 만들었고, 포함 파일은 storage policy 파일 두 개뿐임을 확인했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-storage-commit-scope-policy.test.ts`, `npm run commit:title -- "storage: persist campaign core contract mapping"`, temp index `git diff-tree --no-commit-id --name-only -r 8d5ad55f30fa20fa5602b4d71f11ea3e37e033d9`.

## [2026-05-11] campaign-plugin-adapter-separated-commit | Sub-AC 4.5

- Campaign plugin adapter 변경은 `plugin:` 커밋으로만 분리하고 Campaign core model 변경을 포함하지 않는지 재검증했다.
- Plugin adapter 정책 파일은 core 정책을 재정의하지 않고 `campaign-core-verification-policy`의 경로 분류 계약을 소비한다.
- 실제 브랜치 index는 건드리지 않고 임시 index/object store에서 core 계약 커밋 `56a105eb7597a391901de8a8a99474ebb001d384` 뒤에 `plugin: separate campaign provider adapters` 커밋 객체 `6ecae2bd0022b5eb5baa1c96fcaa1d0a16a03783`를 만들었다.
- `git diff-tree --no-commit-id --name-only -r 6ecae2bd0022b5eb5baa1c96fcaa1d0a16a03783` 결과가 plugin 정책 파일 두 개뿐이고 `app/features/creative-canvas/model/` 매칭이 비어 있음을 확인했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts app/features/creative-canvas/model/campaign-core-verification-policy.ts`, `node --test scripts/check-commit-title.test.mjs`, `node scripts/check-commit-title.mjs "plugin: separate campaign provider adapters"`, `git diff --check`.

## [2026-05-11] campaign-ui-after-core-contract-commit | Sub-AC 3.2.2

- Campaign UI 변경 커밋이 prior `campaign-core:` 계약 커밋 뒤에 별도 `ui:` 커밋으로 와야 한다는 전용 regression을 확장했다.
- UI scope는 creative-canvas component뿐 아니라 Campaign page route rendering surface와 stylesheet 파일을 포함하고, API route contract, core model, storage, plugin 파일은 계속 거부한다.
- `docs/commit-scope-policy.md`에 UI work가 core 계약 커밋 이후 별도 `ui:` 커밋이어야 한다는 규칙을 명시했다.
- 실제 `.git` index는 건드리지 않고 임시 index/object store에서 `campaign-core: add first contract commit sequence` 후보 커밋 `eef856697461243629755adff01459c869acdf42` 뒤에 `ui: render campaign contract surfaces` 후보 커밋 `167d2f32c89f65b2ab787642155641149fb4b08d`를 만들었고, UI 후보 커밋에는 component policy 파일 두 개만 포함됨을 확인했다.
- 검증: failing-first `node --experimental-strip-types --test app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts`, passing same command, all scope-policy `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts app/routes/campaign-core-route-scope-policy.test.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts app/features/creative-canvas/client/campaign-storage-commit-scope-policy.test.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/components/campaign-ui-commit-scope-policy.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts app/features/creative-canvas/model/campaign-core-verification-policy.ts`, `npm run commit:title -- "ui: render campaign contract surfaces"`, temp index `git diff-tree --no-commit-id --name-only -r 167d2f32c89f65b2ab787642155641149fb4b08d`, `git diff --check`.

## [2026-05-11] campaign-core-ui-free-contract-commit | Sub-AC 3.2.1

- Campaign core 계약 커밋에 UI 관련 파일이 섞이지 않도록 `assertCampaignCoreContractCommitsAreUiFree()` regression coverage를 확장했다.
- React component/UI page route뿐 아니라 stylesheet 파일도 `ui` 영역으로 분류해 `campaign-core:` 커밋에 `app/app.css` 같은 UI 파일이 포함되면 실패한다.
- `docs/commit-scope-policy.md`에 core contract commit이 React surface, page layout route, stylesheet 파일을 포함하지 않는다는 규칙을 명시했다.
- 검증: failing-first `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, passing same command, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/campaign-core-verification-policy.ts app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, all scope-policy `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts app/routes/campaign-core-route-scope-policy.test.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts app/features/creative-canvas/client/campaign-storage-commit-scope-policy.test.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, `npm run commit:title -- "campaign-core: reject presentation files in contract commits"`, temp index `git diff --cached --name-only` showed only the two model policy files, `git diff --check`.

## [2026-05-11] campaign-api-route-commit-scope-policy | Sub-AC 4.2

- Campaign route/API 변경을 `api:` 커밋으로 분리하기 위한 `campaign-core-route-scope-policy`를 정렬했다.
- API scope는 `app/routes/api.campaign*.ts`와 focused Campaign API route contract test만 허용하고, page/UI route, Campaign core model, storage persistence/client, plugin adapter 파일이 섞이면 실패한다.
- Regression coverage가 `campaign-reporting.tsx` 같은 UI page route와 `api.agent-plugins.ts` 같은 plugin adapter route를 API commit scope에서 제외한다.
- 실제 `.git` index는 `index.lock` 권한 문제로 갱신하지 못해 브랜치 커밋은 만들지 못했다. 대신 임시 index/object directory에서 `api: separate campaign route contract scope` 커밋 객체 `edeb0c6112ddc840664d9d8292de722fdd815c62`를 생성했고, 포함 파일은 `app/routes/campaign-core-route-scope-policy.ts`, `app/routes/campaign-core-route-scope-policy.test.ts` 두 개뿐임을 확인했다.
- 검증: `node --experimental-strip-types --test app/routes/campaign-core-route-scope-policy.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/routes/campaign-core-route-scope-policy.ts app/routes/campaign-core-route-scope-policy.test.ts`, `node --test scripts/check-commit-title.test.mjs`, `npm run commit:title -- "api: expose campaign completion blockers"`.

## [2026-05-11] campaign-core-first-contract-commit-sequence | Sub-AC 3.1

- `assertCampaignCoreContractCommitExistsFirst()`를 추가해 Campaign core 계약 커밋이 UI, storage, route/API, plugin consumer 커밋보다 먼저 존재해야 함을 model policy에서 검증한다.
- Campaign core 계약 커밋은 `campaign-core:` 제목과 `app/features/creative-canvas/model/` 파일만 허용하며, consumer 파일이 섞이면 독립 커밋 위반으로 실패한다.
- `docs/commit-scope-policy.md`에 첫 Campaign contract commit의 독립성과 downstream consumer 순서 규칙을 명시했다.
- 실제 `.git` index 업데이트는 이전 실행과 같은 권한 제약을 피하기 위해 수행하지 않았고, 임시 index/object store로 `campaign-core: add first contract commit sequence` 후보 커밋 객체 `9f5a3605a6d614f73127d132d0a76ec0395089cb`가 두 model 파일만 포함함을 확인했다.
- 검증: failing-first `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, passing same command, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/campaign-core-verification-policy.ts app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, all scope-policy `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts app/routes/campaign-core-route-scope-policy.test.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts app/features/creative-canvas/client/campaign-storage-commit-scope-policy.test.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, `npm run commit:title -- "campaign-core: add first contract commit sequence"`, temp index `git diff --cached --name-only`, temp object `git show --name-only 9f5a3605a6d614f73127d132d0a76ec0395089cb`.

## [2026-05-11] campaign-core-focused-model-test-policy | AC 2

- Campaign core 변경은 `campaign_core` model slice로 분류되고, 첫 검증 증거가 focused model test여야 한다는 정책을 `app/features/creative-canvas/model/campaign-core-verification-policy.ts`에 추가했다.
- 정책 테스트는 core model path만 허용하고 route/UI/storage/plugin path가 섞이면 거부해 Campaign core 계약 변경이 다른 영역 변경과 같은 검증 단위로 섞이지 않게 한다.
- 검증: failing-first `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, passing same command, focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/campaign-core-verification-policy.ts app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`.

## [2026-05-11] commit-title-scope-policy | AC 1

- Campaign core, UI, storage, plugin, API, tests, docs, tooling 변경 범위가 커밋 제목 첫 토큰에 드러나도록 `docs/commit-scope-policy.md` 정책을 추가했다.
- `scripts/check-commit-title.mjs`와 `npm run commit:title`을 추가해 `<scope>: <summary>` 형식, 단일 scope, 72자 제한을 검증하게 했다.
- 검증: `npm run commit:title:test`; `npm run commit:title -- "campaign-core: add completion transition guard"`; `npm run commit:title -- "update campaign completion"` 실패 확인.

## [2026-05-11] campaign-ui-commit-scope-policy | Sub-AC 4.2

- Campaign UI 변경을 `ui:` 커밋으로 분리하기 위한 `campaign-ui-commit-scope-policy`를 추가했다.
- UI scope는 creative-canvas 컴포넌트와 캠페인 page route 렌더링 표면만 허용하고, Campaign core model, API/core route contract, storage, plugin, docs 파일이 섞이면 실패한다.
- Regression coverage가 component/UI 변경이 core model/route 변경과 같은 커밋에 들어가지 못하도록 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts app/routes/campaign-core-route-scope-policy.test.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts`, `node --test scripts/check-commit-title.test.mjs`, `npm run commit:title -- "ui: separate campaign page rendering"`.

## [2026-05-11] campaign-plugin-adapter-commit-scope-policy | Sub-AC 4.4

- Campaign plugin adapter 변경을 `plugin:` 커밋으로 분리하기 위한 `campaign-plugin-adapter-commit-scope-policy`를 추가했다.
- Plugin scope는 `app/features/plugins/`, creative-canvas plugin adapter glue, agent/plugin API route만 허용하고 Campaign core model, UI, storage, campaign API route, docs 파일이 섞이면 실패한다.
- Regression coverage가 plugin adapter 변경이 core, UI, storage, API 변경과 같은 커밋에 들어가지 못하도록 검증한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts app/routes/campaign-core-route-scope-policy.test.ts app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts app/features/creative-canvas/client/campaign-storage-commit-scope-policy.test.ts app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, `node --test scripts/check-commit-title.test.mjs`, `npm run commit:title -- "plugin: separate campaign provider adapters"`.

## [2026-05-11] campaign-core-commit-scope-verification | Sub-AC 3.1

- Campaign core 계약 변경을 `app/features/creative-canvas/model/` 아래 정책 파일과 focused model test로만 구성했다.
- core verification policy는 Campaign core 변경 경로가 UI, storage, route, plugin, other 경로와 섞이면 실패하도록 분류한다.
- 실제 `.git` 디렉터리는 macOS `com.apple.provenance` 권한으로 `index.lock` 생성이 막혀 브랜치 ref 업데이트는 수행하지 못했다.
- 같은 index/object 흐름을 임시 object directory로 검증해 `campaign-core: add verification scope policy` 커밋 객체 `428093a346e805ce9318f6aa6401306e664ae864`가 두 model 파일만 포함함을 확인했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, temp index `git diff --cached --name-only`, temp object `git show --name-only 428093a346e805ce9318f6aa6401306e664ae864`.

## [2026-05-11] campaign-completion-action-structured-failure-reasons | Sub-AC 11.3.3

- `updatePersistedCampaignRecord()` now throws `CampaignCompletionActionError` when a campaign completion action fails eligibility validation, preserving the existing error message while exposing structured `reasons` and `completionState`.
- Direct human/agent model callers can inspect the same blocker codes used by the API, including measurement eligibility and measurement-based improvement eligibility failures, without relying on string parsing.
- 검증: failing-first `node --experimental-strip-types --test --test-name-pattern "structured completion action failure reasons" app/features/creative-canvas/model/creative-canvas.test.ts`, then passing same command; `node --experimental-strip-types --test --test-name-pattern "completion|structured completion action failure reasons" app/features/creative-canvas/model/creative-canvas.test.ts`; `node --experimental-strip-types --test --test-name-pattern "completion|gating reasons" app/routes/campaign-api.test.ts`; `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/routes/campaign-api.test.ts`; focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts app/routes/api.campaign.ts app/routes/campaign-api.test.ts`; `npm run build`.
- 참고: `npm run build` still prints the known nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning but exits 0.

## [2026-05-11] campaign-completion-improvement-record-validation | Sub-AC 11.3.2

- `validateCampaignCompletion()` now rejects `completed` campaigns that have completed measurement cycles but no completed measurement-based improvement record.
- The API PATCH path returns `campaign_completion.improvement_record_required` for attempted completion before the conversion improvement loop is closed, preserving the previous measurement-record guard for blank campaigns.
- 검증: `node --experimental-strip-types --test --test-name-pattern "without improvement records|without improvement record|without measurement records" app/features/creative-canvas/model/creative-canvas.test.ts`; `node --experimental-strip-types --test --test-name-pattern "without improvement records|without measurement results" app/routes/campaign-api.test.ts`; `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/routes/campaign-api.test.ts`; focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts app/routes/api.campaign.ts app/routes/campaign-api.test.ts`.

## [2026-05-11] measurement-result-used-improvement-completion | Sub-AC 11.2.2

- Improvement cycle completion now requires a completed improvement action to include `owncanvas.campaign-measurement-result-usage.v1` metadata that references metric ids from the source completed measurement cycle.
- `getCampaignMeasurementBasedImprovementStatus()` no longer marks a campaign complete from action status alone; it stays `proposed` until the measurement result usage records the applied change and valid usage timestamp.
- 검증: failing-first `node --experimental-strip-types --test --test-name-pattern "campaign improvement status waits" app/features/creative-canvas/model/creative-canvas.test.ts`, then passing same command; `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts app/features/creative-canvas/model/creative-canvas.test.ts app/routes/campaign-api.test.ts`; focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts app/routes/api.campaign.ts app/routes/campaign-api.test.ts`; `npm run build`.
- 참고: `npm run build` still prints the known nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning but exits 0.

## [2026-05-11] measurement-derived-improvement-actions | Sub-AC 11.2

- Campaign tracking JSON now records `owncanvas.campaign-improvement-action.v1` proposed actions derived from completed measurement cycles.
- New measurement metrics regenerate measurement-cycle derivatives and create a deterministic improvement action from the primary purchase-conversion result: missed targets propose conversion-path optimization, while met targets propose scaling the winning path.
- `GET/PATCH /api/campaigns/:campaignId` includes the recorded improvement actions in `measurementResults`, preserving the source measurement cycle, goal ids, observed value, target, recommendation, and rationale.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts app/routes/campaign-api.test.ts`; focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts app/routes/api.campaign.ts app/routes/campaign-api.test.ts`.

## [2026-05-11] post-publication-measurement-results-api | Sub-AC 11.1

- `PATCH /api/campaigns/:campaignId` can now record post-publication measurement results and regenerate completed measurement cycles when new metrics are submitted without an explicit cycle list.
- `GET/PATCH /api/campaigns/:campaignId` exposes a `measurementResults` read model only after a campaign has published links, including publication context, metric/result counts, primary purchase-conversion result, recorded timestamp, and latest completed cycle.
- 검증: failing-first then passing `node --experimental-strip-types --test app/routes/campaign-api.test.ts`; `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts`.
- 참고: `npm run typecheck` remains blocked by existing nested `dndnFE` missing package/path issues (`expo/tsconfig.base`, `radix-ui`, `class-variance-authority`, aliases, Supabase, etc.).

## [2026-05-11] campaign-measurement-cycle-completion | Sub-AC 11.1

- Campaign tracking JSON에 `owncanvas.campaign-measurement-cycle.v1` completed cycle records를 추가해 performance metrics가 저장될 때 goal scope, started/completed timestamps, result count, primary result, full performance results를 함께 보존한다.
- `getCampaignMeasurementCycleCompletion()` / `hasCampaignCompletedMeasurementCycle()` helper를 추가해 blank campaign은 미완료로, recorded performance results가 있는 campaign은 at least one completed measurement cycle로 판정할 수 있게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts`; `node --experimental-strip-types --test app/routes/campaign-api.test.ts`; focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts app/routes/api.campaign.ts app/routes/campaign-api.test.ts`; `npm run build`.
- 참고: `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다. Full `npm run typecheck`는 owncanvas/plugin fixture 호환성 확인 후에도 기존 nested `dndnFE/` missing dependency/path alias 오류들로 실패한다.

## [2026-05-11] campaign-comparison-primary-purchase-conversion | Sub-AC 10.3.2

- Campaign comparison view model을 추가해 비교 컬럼의 첫 번째이자 `primarySuccessMetric`을 `purchase_conversion_rate` / `Purchase conversion`으로 고정했다.
- 비교 row는 동일한 reporting formatter를 재사용해 campaign별 purchase conversion 표시값과 help text를 만들고, purchase conversion rate 기준으로 정렬해 conversion-first KPI가 비교 화면의 기본 판단 기준이 되게 했다.
- 기존 single-campaign reporting summary section 기대값도 보존해 `primary_purchase_conversion` 섹션이 purchase conversion metric을 먼저 노출한다.
- 검증: failing-first `node --experimental-strip-types --test --test-name-pattern "campaign comparison view model" app/routes/campaign-reporting-view.test.ts`, then passing same command; `node --experimental-strip-types --test app/routes/campaign-reporting-view.test.ts`; focused `npx tsc --noEmit ... app/routes/campaign-reporting-view-model.ts app/routes/campaign-reporting-view.test.ts`; `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 누락을 보고해 repo fallback 문서(`CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, wiki)를 사용했다. `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] campaign-conversion-metrics-reporting | Sub-AC 10.2.4

- `GET /api/campaigns/:campaignId/tracking/metrics` 응답에 `owncanvas.campaign-conversion-metrics.v1` reporting block을 추가해 exposure/click/conversion/purchase funnel counts, session counts, CTR, purchase conversion rate, total value, AOV, revenue per click, currency breakdown을 한 번에 노출한다.
- Conversion KPI reporting은 기존 Campaign analytics event store와 동일한 filter contract(`campaignId`, `pageId`, channel/product/offer/time 등)를 사용하므로 canvas JSON tracking source of truth와 reporting output이 분리되지 않는다.
- 검증: failing-first `node --experimental-strip-types --test --test-name-pattern "conversion reporting metrics" app/routes/campaign-metric-query-contracts-api.test.ts`, then passing same command; `node --experimental-strip-types --test app/routes/campaign-metric-query-contracts-api.test.ts`; `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`; focused `npx tsc --noEmit ...`; `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 누락을 보고해 repo fallback 문서(`CONTEXT.md`, wiki)를 사용했다. `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] campaign-evaluation-primary-purchase-conversion | Sub-AC 10.1

- Campaign evaluation model의 기본 `primarySuccessMetric`이 `purchase_conversion_rate` / `purchase` event / `final_conversion` attribution role을 가진 primary metric으로 정의되어 있음을 확인했다.
- `createCampaignTrackingConfiguration()`의 기본 tracking에도 `owncanvas.campaign-evaluation.v1` evaluation model이 포함되어 blank campaign과 API 노출 경로가 purchase conversion을 campaign success 기준으로 보존한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "campaign evaluation model defines purchase conversion|blank campaign starts" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/routes/campaign-api.test.ts app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts`, `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 누락을 보고해 repo fallback 문서(`CONTEXT.md`, `.agents/product-marketing-context.md`, wiki)를 사용했다. `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] revisit-measurement-query-report-output | Sub-AC 9.5.4

- `GET /api/campaigns/:campaignId/tracking/metrics?metric=revisit&groupBy=matchedBy` now includes a detailed `report` payload using the existing `owncanvas.campaign-metric-report.v1` shape.
- The metric query route parses `groupBy` dimensions and passes them through to `getCampaignMetricReport()`, so canonical measurement queries can return grouped revisit rows as well as aggregate metric counts.
- 검증: failing-first `node --experimental-strip-types --test --test-name-pattern "grouped revisit reporting output" app/routes/campaign-metric-query-contracts-api.test.ts`, then passing same command; `node --experimental-strip-types --test --test-name-pattern "reports filtered revisit metrics" app/routes/campaign-tracking-events-api.test.ts`; focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/routes/api.campaign-tracking-metrics.ts app/routes/campaign-metric-query-contracts-api.test.ts app/features/creative-canvas/model/creative-canvas.ts`; `npm run build`.
- 참고: full `app/routes/campaign-metric-query-contracts-api.test.ts` still has existing assertion drift in the mixed metrics time-range test: the fixture contains two matching click events in the inclusive range, while the assertion expects one. `npm run build` still prints the known nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning but exits 0.

## [2026-05-11] conversion-revisit-metric-reporting | Sub-AC 9.5.3

- 공통 metric report loader를 conversion/revisit까지 확장해 필터링된 count, unique session, conversion total value, grouped rows를 반환한다.
- `GET /api/campaigns/:campaignId/tracking/conversions`는 기존 attributed conversion analytics를 유지하면서 `metric=conversion`, `groupBy`, conversion filter가 있을 때 metric report query를 제공한다.
- `GET /api/campaigns/:campaignId/tracking/revisits`에 revisit metric report loader를 연결해 `matchedBy` 필터와 그룹 reporting을 지원한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "reports filtered conversion metrics|reports filtered revisit metrics" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/routes/campaign-metric-query-contracts-api.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] click-metric-reporting-href-query | Sub-AC 9.5.2

- Click metric query contract now advertises `href` as a supported `groupBy` dimension, matching the existing `href` filter and direct click metric report behavior.
- `GET /api/campaigns/:campaignId/tracking/clicks` regression now verifies grouped click reporting by `destination` and `href`, returning count and unique-session rows for each clicked link.
- 검증: `node --experimental-strip-types --test --test-name-pattern "metric query contracts" app/routes/campaign-metric-query-contracts-api.test.ts`, `node --experimental-strip-types --test --test-name-pattern "reports filtered click metrics" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/routes/campaign-metric-query-contracts-api.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] exposure-metric-reporting-api | Sub-AC 9.5.1

- `GET /api/campaigns/:campaignId/tracking/exposures`에 metric report loader를 연결해 exposure metric reporting output을 제공한다.
- 공통 `createCampaignTrackingMetricReportLoader()`와 `getCampaignMetricReport()`를 추가해 exposure/click route가 campaign, channel, page 등 필터와 `groupBy` 차원으로 count/unique session rows를 반환할 수 있게 했다.
- 회귀 테스트는 exposure reporting이 `groupBy=placement`로 hero/offer placement 노출 수와 unique session을 반환하는지 검증한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "reports filtered exposure metrics|reports filtered click metrics" app/routes/campaign-tracking-events-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/routes/api.campaign-tracking-exposures.ts app/routes/api.campaign-tracking-clicks.ts app/routes/api.campaign-tracking-metric-report.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/creative-canvas.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/routes/campaign-metric-query-contracts-api.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `npm run build`.
- 참고: `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] visit-history-focused-regressions | Sub-AC 9.4.4

- 첫 방문 표면 추적 테스트를 추가해 first-time visit이 revisit 이벤트를 만들지 않고 `tracking.sessions`에 campaign/session/user/channel/touchpoint/UTM/attribution history를 저장하는지 검증했다.
- returning user 재진입 테스트에 campaign history association assertion을 보강해 `oc_user_id`가 returning visit의 `tracking.sessions` record에 유지되는지 확인했다.
- inbound session parser/model 테스트를 추가하고 `oc_user_id`/`user_id`를 reserved attribution parameter가 아닌 `CampaignTrackedSession.userId`로 저장하도록 수정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/features/creative-canvas/model/campaign-inbound-session-url.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 `app/routes/campaign-metric-query-contracts-api.test.ts` missing `./api.campaign-tracking-metrics.ts`와 기존 nested `dndnFE/` dependency/path alias 오류로 실패한다. `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] nonblocking-surface-delivery-retry | Sub-AC 8.4.4

- Campaign landing surface tracking delivery now retries transient network or non-2xx POST failures while keeping interaction handlers non-blocking and local Campaign JSON tracking as the source of truth.
- Conversion event delivery can recover from an initial offline/network failure without interrupting the purchase flow; retries reuse the same tracked event payload and endpoint.
- Asset generation execution now supports `maxAttempts`, retrying transient provider failures as continued `running` progress rather than surfacing an intermediate failed state before the final attempt.
- 검증: `node --experimental-strip-types --test --test-name-pattern "retries failed conversion delivery|buffers playback" app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing external skills 8개 누락을 보고해 repo fallback 문서(`CONTEXT.md`, `.agents/product-marketing-context.md`, wiki)를 사용했다. `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] surface-conversion-event-attribution | Sub-AC 8.4.3

- landing surface tracking client에 `emitConversion()`과 `createCampaignSurfaceConversionInput()`을 추가해 purchase conversion 이벤트를 campaign/session/content/UTM/node/input port/channel/product/offer metadata와 함께 생성한다.
- conversion 이벤트가 로컬 Campaign JSON source of truth의 `tracking.eventLog`, `tracking.conversionRecords`, analytics attribution record에 저장되고 `/api/campaigns/:campaignId/tracking/conversions`로 전송되도록 client endpoint routing을 확장했다.
- 회귀 테스트는 surface conversion payload가 `checkout` content, `inputs.purchase`, session UTM, product/offer attribution, order/value/currency metadata를 보존하는지 검증한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "conversion events with campaign and content attribution" app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] short-form-immersion-analytics-normalization | Sub-AC 8.3.3

- Campaign tracking events now support normalized `pageId` metadata on content and target records, allowing short-form landing analytics to preserve campaign, page, asset, and session identifiers together.
- Campaign analytics persistence now indexes page and asset dimensions (`byPageId`, `byAssetId`, campaign-scoped page/asset indexes) and `getPersistedCampaignAnalyticsEvents()` can query by page and asset together with campaign/session/type filters.
- Short-form playback engagement analytics now include a normalized `immersion` attribution payload for watch depth, completion, replay, and control events that have page and asset context.
- Campaign surface tracking helpers emit `pageId` defaults for landing-page module exposure, playback, and scroll engagement, and preserve explicit `oc_user_id` session identity for returning-user revisit attribution.
- 검증: `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/client/campaign-surface-tracking.ts app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/features/creative-canvas/model/creative-canvas.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails in the unrelated nested `dndnFE` tree due missing package/path aliases and Expo dependencies; `npm run build` exits 0 while printing the existing `dndnFE/expo-webview` missing `expo/tsconfig.base` warning.

## [2026-05-11] returning-campaign-workflow-revisit-events | Sub-AC 9.4.2

- Campaign landing surface sessions now preserve an explicit `oc_user_id`/`user_id` identity alongside the session id, UTM, channel, touchpoint, and attribution parameters.
- Returning attribution detection for landing re-entry now matches either the persisted session/attribution parameters or a known prior user id from campaign tracking events, then emits a `revisit` event with `outputs.revisit` attribution.
- Revisit events are persisted in Campaign tracking JSON and delivered to `/api/campaigns/:campaignId/tracking/revisits` through the same buffered tracking client as exposure, click, engagement, and conversion events.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts app/features/creative-canvas/model/campaign-inbound-session-url.test.ts app/routes/campaign-tracking-events-api.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-short-form-control-interaction-tracking | Sub-AC 8.3.2

- Landing native short-form video controls now emit playback engagement events for play, pause, mute, and unmute interactions through the campaign surface tracking client.
- Control interaction events use stable `control:*` playback action names with count units and preserve current time, duration, landing node, output port, asset, product, offer, URL, session, UTM, and channel attribution.
- Landing renderer wires native video `onPlay`, `onPause`, and `onVolumeChange` handlers while existing conversion, commerce, and continuation CTAs continue to use the shared tracked click capture path.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --test app/features/creative-canvas/components/landing-page-responsive-layout.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts app/routes/campaign-tracking-events-api.test.ts`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] attributed-conversion-reporting-api | Sub-AC 9.3.4

- conversion tracking route에 `GET /api/campaigns/:campaignId/tracking/conversions` loader를 추가해 downstream reporting/analytics가 사용할 수 있는 attributed conversion projection을 노출했다.
- `getAttributedCampaignConversionAnalytics()`는 Campaign tracking conversion records와 persisted analytics event store를 결합해 summary, flattened reporting rows, 원본 conversion record/event, attribution match, matched prior interaction을 반환한다.
- reporting row는 conversion id/session/time/event/value/currency/order, UTM source/medium/campaign/content/term, node/channel/product/offer/target, attribution rule, prior interaction event/type/time/window를 포함한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "exposes attributed conversion rows" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 missing을 보고해 repo fallback 문서를 사용했다. `npm run build`는 기존 nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-navigation-conversion-playback-options | Sub-AC 8.2.1

- `owncanvas.landing-page-template.v1`에 `navigation`과 `conversionElements` 설정을 추가해 landing page navigation/CTA가 visibility, placement, timing, playback interruption behavior를 JSON source-of-truth로 표현한다.
- Landing render model은 navigation 설정과 conversion element 배열을 normalized contract로 노출하며, template validation은 잘못된 placement/timing/destination URL을 structured error로 거부한다.
- `CampaignLandingPageRenderer`는 visible navigation/conversion elements를 data attribute로 렌더링해 short-form playback 중 non-blocking/pause/block 정책을 UI/runtime이 읽을 수 있게 했다.
- 기존 analytics event persistence helper를 복원하고 event record key를 campaign/session/event 단위로 맞춰 tracking attribution regression도 통과시켰다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "navigation and conversion element playback policies" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 nested `dndnFE/` dependency/path alias 누락과 `dndnFE/expo-webview` missing `expo/tsconfig.base` 문제로 실패한다. `npm run build`는 같은 warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-template-supported-embed-preview-validation | Sub-AC 8.1.4

- Landing template render model에 embedded short-form `preview` metadata를 추가해 Instagram oEmbed, TikTok/YouTube iframe, OwnCanvas native/generated asset, custom iframe preview surface를 구분해 노출한다.
- Template validation은 short-form preview가 지원하는 platform/source type/embed mode 조합을 검사하고, platform URL mismatch, unsupported source/embed 조합, unsupported platform을 structured error로 거부한다.
- 기존 short-form content control test fixture의 direct-message publishing channel에 required `placement` 값을 보강해 focused TypeScript 검증이 현재 model contract를 통과하도록 맞췄다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "preview and validation cover supported short-form embed sources" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test --test-name-pattern "landing page template|landing page render model|landing page renderer" app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 기존 untracked `dndnFE/` tree의 missing package/path alias와 `expo/tsconfig.base` 문제로 실패한다. `npm run build`도 같은 Expo tsconfig warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-layout-breakpoint-visual-contract | Sub-AC 8.2.4

- landing responsive layout test에 desktop/tablet/mobile 시각 계약을 추가해 content visibility, playback access, action presentation을 정적 CSS/renderer contract로 검증한다.
- tablet breakpoint는 copy와 media 영역을 세로로 분리하면서 playback과 commerce panel은 인접하게 유지해 좁은 two-column 압축을 피한다.
- mobile breakpoint는 media height budget을 유지하고 signup input/button 및 primary offer action을 full-width tap target으로 표현한다.
- 검증: `node --test app/features/creative-canvas/components/landing-page-responsive-layout.test.ts`.
- 참고: broader `node --experimental-strip-types --test app/features/creative-canvas/components/landing-page-responsive-layout.test.ts app/features/creative-canvas/model/creative-canvas.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts`와 `npm run build`는 기존 `creative-canvas.ts` duplicate analytics helper declarations에서 실패한다. `npm run skills:check`는 기존 DDD/marketing 외부 skill 8개 missing을 보고해 repo fallback 문서를 사용했다.

## [2026-05-11] exposure-click-event-payload-schema | Sub-AC 9.2.1

- `CampaignExposureTrackingEvent` and `CampaignClickTrackingEvent` now require first-class `content` metadata and `utm` metadata alongside campaign/session/context/target fields.
- Exposure and click event schema descriptors list `content` and `utm` as required payload sections, preserving campaign, content, and UTM attribution in the JSON source of truth.
- Tracking-event validation rejects missing content type/id and missing UTM source/medium/campaign, and ingestion responses include content and UTM snapshots in returned attribution metadata.
- Verification: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts app/routes/campaign-tracking-events-api.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- Note: `npm run typecheck` remains blocked by existing unrelated `creative-canvas.test.ts` channel placement drift, missing `getSupportedShortFormEmbedConfiguration`, and nested `dndnFE/` dependency/path errors.

## [2026-05-11] published-link-url-utm-normalization | Sub-AC 9.1.3

- `saveCampaignPublishingConfiguration()` now normalizes persisted published campaign link URLs by appending generated UTM parameters, OwnCanvas campaign/channel/responder/message parameters, conversion event, and configured attribution parameters before storage validation.
- `createCampaignDestinationUrl()` and published-link save normalization share the same tracking query append helper, keeping destination URL generation and saved `publishedUrl` output aligned.
- Regression covers a publish flow that returns a bare published URL and verifies the saved Campaign JSON contains the tracked published URL.
- Verification: `node --experimental-strip-types --test --test-name-pattern "appends generated UTM parameters" app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- Note: `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] immersive-landing-responsive-requirements | Sub-AC 8.1.4

- immersive landing render model에 `responsiveLayoutRequirements`와 `interactionRequirements`를 추가해 mobile/tablet/desktop별 block layout, media sizing, continuation placement, CTA placement, input mode, playback activation, scroll behavior를 JSON render contract로 표현했다.
- embedded short-form module과 inline continuation module이 같은 responsive/interaction requirement를 공유하며, continuation block은 source embedded short의 aspect ratio와 max inline size를 상속한다.
- source embed의 interaction scroll behavior는 연결된 inline continuation transition style을 따른다. continuation이 없으면 native scroll behavior가 기본값이다.
- 검증: `node --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`.
- 참고: `npm run typecheck`는 기존 nested `dndnFE/` tree의 missing Expo/Radix/Supabase/path alias dependency와 `expo/tsconfig.base` 문제로 실패한다.

## [2026-05-11] deterministic-campaign-publish-utm | Sub-AC 9.1.2

- `generateDeterministicCampaignUtmParameters()`를 추가해 campaign id/title/objective, publishing channel platform/type/placement/id, responder/message publish context에서 stable slug 기반 UTM source/medium/campaign/content/term을 생성한다.
- `createCampaignDestinationUrl()`와 `createCampaignPublishedLink()`가 같은 deterministic UTM resolver를 사용하게 해 destination URL query string과 persisted published link UTM snapshot이 일치하도록 했다.
- 명시된 channel/campaign UTM 값은 그대로 우선 사용하고, blank draft publish context에서만 deterministic fallback을 생성한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-inbound-session-url.test.ts app/features/creative-canvas/model/campaign-tracking-configuration-save-flow.test.ts app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run typecheck`는 기존 nested `dndnFE/` dependency/path drift로 실패한다.

## [2026-05-11] published-campaign-link-utm-model | Sub-AC 9.1.1

- published campaign link persistence를 `CampaignPublishingChannel.publishedLinks`로 추가하고, 각 link가 `destinationUrl`, 최종 `publishedUrl`, 정규화된 `utm`, OwnCanvas campaign/channel/responder/message/conversion parameters, 외부 attribution parameters, `publishedAt`을 보존하게 했다.
- `createCampaignPublishedLink()`를 추가해 기존 destination URL 생성과 같은 UTM/attribution 값을 persisted link model로 만들 수 있게 했다.
- publishing validation은 published link id 중복, channel mismatch, URL validity, 필수 UTM, publish timestamp를 검사한다.
- 기존 comment-to-DM fixture와 inbound session helper drift를 현재 domain contract에 맞춰 정리했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-inbound-session-url.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run typecheck`는 기존처럼 nested `dndnFE/` tree의 Expo/Radix/path dependency errors로 실패한다.

## [2026-05-11] inbound-campaign-session-record-utm-association | Sub-AC 9.1.2

- `CampaignTracking.sessions`에 optional `CampaignTrackedSession` record를 추가해 captured inbound UTM attribution이 Campaign tracking state 안의 session record와 연결되도록 했다.
- `trackInboundCampaignSession()`는 inbound URL을 campaign id 기준으로 parse/validate하고, normalized UTM, channel/touchpoint id, URL attribution parameters를 tracked session record로 upsert한 뒤 persisted Campaign record에 저장한다.
- 같은 session id를 다시 capture하면 최초 `firstSeenAt`은 유지하고 `lastSeenAt`과 attribution payload를 갱신할 수 있는 upsert path를 마련했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-inbound-session-url.test.ts app/features/creative-canvas/model/campaign-tracking-configuration-save-flow.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-inbound-session-url.test.ts`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 missing을 보고해 repo fallback 문서를 사용했다.

## [2026-05-11] landing-renderer-responsive-short-form-modules | Sub-AC 8.1.2

- Added a campaign landing render model that turns landing template modules into ordered renderable modules with explicit CSS aspect-ratio values and mobile/tablet/desktop breakpoint requirements.
- Added a React landing page renderer and `/campaigns/:campaignId/landing` route that renders embedded short-form modules as native video or iframe surfaces while preserving each module's configured aspect ratio.
- Added responsive landing CSS using `aspect-ratio` plus module max-width variables so vertical, square, and horizontal short-form embeds retain native proportions across breakpoints.
- Verification: `node --experimental-strip-types --test --test-name-pattern "landing page template|immersive landing|landing page renderer" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- Note: `npm run typecheck` still fails on pre-existing nested `dndnFE/` missing dependencies/path aliases, after the local renderer type mismatch was resolved.

## [2026-05-11] immersive-landing-block-content-schema | Sub-AC 8.1.2

- immersive landing page block type definition에 `contentSchema`와 `configurationOptions`를 추가해 block별 content shape와 renderer/operator 설정값을 명시했다.
- `short-form-embed`는 source asset, embed mode, poster, tracking event schema와 aspect ratio/autoplay/attribution touchpoint 설정을 선언한다.
- `short-form-continuation`은 sequence, CTA, offer asset schema와 max segment, transition style, conversion event 설정을 선언한다.
- 기존 embedded short-form landing template module validation도 함께 유지되어 provider metadata와 configurable playback settings를 검사한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "immersive landing page block types|landing page template schema" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`.
- 참고: focused `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`는 현재 작업 범위 밖의 기존 `createCampaignTrackedSession`/`upsertCampaignTrackedSession` missing symbol drift로 실패한다.

## [2026-05-11] inbound-campaign-session-utm-parse-validation | Sub-AC 9.1.1

- `parseInboundCampaignSessionUrl()`와 `validateInboundCampaignSession()`를 추가해 inbound campaign session URL에서 `utm_source`, `utm_medium`, `utm_campaign`, optional `utm_content`/`utm_term`, OwnCanvas campaign/session/channel/touchpoint id, extra click/affiliate attribution parameters를 정규화한다.
- Parser는 http(s)가 아닌 URL, 필수 UTM 누락, expected campaign id mismatch를 structured error로 반환해 landing/conversion tracking ingestion이 throw 없이 실패 사유를 기록할 수 있게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-inbound-session-url.test.ts app/features/creative-canvas/model/campaign-tracking-configuration-save-flow.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-inbound-session-url.test.ts`.
- 참고: `npm run typecheck`는 기존 untracked `dndnFE/` tree의 missing Expo/Radix/Supabase/path alias dependency 문제로 실패한다. `npm run skills:check`는 exit 0이지만 기존 DDD/marketing 외부 skill 8개 missing을 보고해 repo fallback 문서를 사용했다.

## [2026-05-11] asset-generation-workflow-state-aggregation | Sub-AC 3.4.4

- parallel image/video asset generation now aggregates individual job snapshots and result metadata into `campaignSpec.assetGenerationWorkflowState`.
- The workflow-level state records total/running/completed/failed/skipped counts, percent complete, job/result/asset/provider request ids, generated output locations, and provider errors.
- `applyCampaignAssetGenerationExecutionResult()` plus image/video-specific apply paths persist the aggregate alongside job records and execution records, preserving JSON as the source of truth.
- Verification: `node --experimental-strip-types --test --test-name-pattern "parallel media generation aggregation|immersive landing" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, focused `npx tsc --noEmit ... creative-canvas.ts creative-canvas.test.ts`, `npm run build`.
- Note: `npm run typecheck` remains blocked by the existing untracked `dndnFE/` tree and missing Expo/Radix/path dependencies.

## [2026-05-11] comment-to-dm-example-flow-load-interpretation-test | Sub-AC 7.4.4

- `app/features/plugins/model/instagram-comment-dm-flow.test.ts`에 focused validation을 추가해 comment-to-DM-to-landing fixture가 serialized JSON에서 로드되고, canvas/spec explicit ports, activated plugin runtime, DM dispatch, landing destination mapping까지 end-to-end로 해석되는지 검증했다.
- 구현 변경은 필요하지 않았다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "sample workflow fixture loads from JSON" app/features/plugins/model/instagram-comment-dm-flow.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 missing을 보고해 repo fallback 문서를 사용했다.

## [2026-05-11] immersive-landing-short-form-block-types | Sub-AC 8.1.1

- immersive landing page가 원본 short-form을 landing 안에 보존하는 `short-form-embed`와 이어지는 landing-native short-form sequence를 표현하는 `short-form-continuation` block type을 명시했다.
- 각 block type은 content mode, 설명, accepted input ports, output ports, media types, attribution role을 가진 domain contract로 정의되어 DM-to-landing attribution과 conversion loop에서 재사용할 수 있다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "immersive landing page block types" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 missing을 보고해 repo fallback 문서를 사용했다.

## [2026-05-11] plugin-example-workflow-run-docs | Sub-AC 7.5.3

- comment-to-DM-to-landing example workflow를 plugin system을 통해 실행/검사하는 문서를 추가했다.
- `app/features/plugins/model/README.md`에 focused regression 실행 명령, fixture inspection 경로, 주요 fixture export, plugin API curl inspection flow를 정리했다.
- root `README.md`에 plugin workflow example 섹션을 추가해 기본 진입점에서 focused test와 API inspection route를 찾을 수 있게 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-registration-template-routing.test.ts`, `npm run build`.

## [2026-05-11] asset-generation-status-event-tracking | Sub-AC 3.4.1

- `CampaignAssetGenerationExecutionRecord.statusEvents`를 추가해 backend workflow execution record가 각 job의 `running` 시작, 진행률 update, `completed`, `failed` 상태 변화를 순서대로 보존하게 했다.
- 실패 상태는 `failureDetails`를 job status snapshot, execution record, status event에 함께 남겨 agent/human runtime이 sibling job 성공과 provider failure를 분리해서 읽을 수 있게 했다.
- 기존 final job status/progress/result metadata persistence와 함께 campaign spec JSON에 execution status history가 저장되도록 clone/normalize 경로를 확장했다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "parallel asset generation persists an independent execution record" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`, `npm run skills:check`.
- 참고: `npm run typecheck`는 기존 범위 밖의 `app/features/plugins/model/instagram-comment-dm-flow.test.ts` fixture export drift와 `dndnFE` dependency/path alias 누락으로 실패한다. `npm run build`는 기존 `dndnFE/expo-webview` Expo tsconfig warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] persisted-generated-asset-workflow-state | Sub-AC 3.3.4

- parallel media generation persistence가 Campaign workflow node state까지 generated asset reference를 반영하도록 확장했다.
- `applyCampaignAssetGenerationExecutionResult()`와 image/video 전용 apply 경로가 `canvasState.nodes`와 `campaignSpec.nodes`의 `properties.assetGeneration`에 completion status, generated `assetIds`, `resultIds`, `outputLocations`를 함께 저장한다.
- image/video 전용 apply 경로도 공통 generated asset merge helper를 사용해 기존 asset 갱신과 신규 asset append 동작을 일관화했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 기존 unrelated drift로 실패한다. 현재 주요 원인은 `app/features/plugins/model/plugin-registration-template-routing.test.ts`의 missing fixture export와 untracked nested `dndnFE/` dependency/path errors다.

## [2026-05-11] spec-to-canvas-create-update-test-coverage | Sub-AC 4.4.3

- spec-to-canvas synchronization create/update coverage를 확인했다. `app/features/creative-canvas/adapters/react-flow-canvas.test.ts`는 blank campaign에 JSON spec edit로 node/edge를 생성해 rendered canvas와 `campaign.canvasState`가 함께 갱신되는 경로를 검증한다.
- 같은 파일의 update regression은 기존 campaign JSON spec이 text/image 연결에서 text/video 연결로 교체될 때 rendered React Flow nodes/edges, `campaign.canvasState`, canonical `campaignSpec`가 함께 갱신되고 기존 `assetGenerationJobs`가 보존되는지 검증한다.
- 추가 구현 변경은 필요하지 않았다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing 계열 외부 Codex skill 8개 missing을 보고해 repo fallback 문서를 사용했다.

## [2026-05-11] generated-image-asset-persistence-check | Sub-AC 3.3.2

- completed image generation result persistence를 확인했다. `applyCampaignImageAssetGenerationExecutionResult()`는 completed image job의 `resultMetadata`를 campaign spec에 병합하고, generated image `CampaignAsset`에 `outputLocations.primaryUri`와 `generatedMetadata`를 저장한다.
- `saveCampaignImageAssetGenerationExecutionResult()`는 동일한 결과를 persisted campaign record에 기록하며 `asset_generation.image_assets.persisted` audit log를 남긴다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`.
- 참고: `npm run typecheck`는 기존처럼 untracked nested `dndnFE/` dependency/path errors와 unrelated plugin/react-flow type drift로 실패한다.

## [2026-05-11] json-spec-canvas-state-sync-regression | Sub-AC 4.4.2

- React Flow adapter regression에 `campaign spec JSON changes commit to canvas state and rendered canvas together`를 추가했다.
- 테스트는 JSON spec edit가 기존 image node/edge를 video node/edge로 교체하고 explicit port 연결을 바꿀 때, `campaign.canvasState`, rendered React Flow nodes/edges, canonical `campaignSpec`가 함께 갱신되는지 검증한다.
- `assetGenerationJobs`가 JSON edit payload에서 생략되어도 기존 generation job 선언이 보존되는지도 함께 확인한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 unrelated existing drift로 실패한다. 현재 주요 원인은 `app/features/plugins/model/plugin-representation.test.ts`의 missing landing conversion exports와 untracked nested `dndnFE/` app의 dependency/path errors다.

## [2026-05-11] invalid-campaign-spec-json-sync-guard | Sub-AC 4.3.1

- Campaign spec JSON sync의 invalid JSON 경로를 확인했다. `parseCampaignSpecJsonEdit()`는 `JSON.parse` 실패 시 `campaign_spec.json_invalid`를 반환하고 기존 Campaign/canvas state를 그대로 돌려준다.
- React Flow adapter sync regression은 invalid JSON과 incomplete frame이 rendered canvas snapshot을 바꾸지 않고, 이후 valid JSON 입력에서 정상 복구되는 것을 검증한다.
- 기존 creative-canvas model drift 중 aggregate asset generation apply/save export와 generated image asset metadata persistence를 회복해 focused model suite를 통과시켰다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test --test-concurrency=1 $(find app -name '*test.ts' -type f | sort | grep -v 'plugin-representation.type-test.ts')`, `npm run build`.
- 참고: `npm run typecheck`는 기존처럼 root 아래 untracked `dndnFE/`의 Expo/radix/motion dependency 및 alias resolution error로 실패한다.
- 참고: `npm run typecheck`는 unrelated `dndnFE/` dependency/path errors와 plugin landing-flow export drift로 실패한다. `npm run skills:check`는 기존 DDD/marketing 외부 skill 8개 missing을 보고해 repo fallback 문서를 사용했다.

## [2026-05-11] comment-to-dm-focused-fixtures | Sub-AC 7.2.5

- comment ingestion, response rule matching, DM dispatch를 한 번에 재사용할 수 있는 `instagram-comment-dm-flow.fixtures.ts`를 추가했다.
- 새 focused regression은 Instagram comment event가 Campaign workflow event와 attribution touchpoint로 ingest되는지, `all_keywords` matcher가 tracked DM response mapping을 선택하고 unmatched comment를 skip하는지, 선택된 response가 configured Instagram account로 dispatch되는지 검증한다.
- verification 중 creative-canvas model에 남아 있던 duplicate generic asset-generation persistence export drift를 정리하고, generated video asset도 image asset과 동일하게 output location/generated metadata를 보존하도록 맞췄다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types app/features/creative-canvas/model/creative-canvas.test.ts`.
- 참고: `npm run typecheck`는 repo root 아래 untracked nested `dndnFE/` app이 `tsconfig.json`의 `**/*` include에 잡히면서 Expo/radix/motion 등 별도 dependency와 alias resolution error로 실패한다. `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 missing을 보고한다.

## [2026-05-11] concurrent-video-asset-generation-execution | Sub-AC 3.3.1

- `executeCampaignVideoAssetGenerationJobs()`를 추가해 loaded campaign asset generation workflow에서 ready/queued video jobs만 provider executor로 병렬 실행할 수 있게 했다.
- video execution result는 completed/failed/skipped job snapshots와 workflow-order `jobStatuses`를 반환하며 image jobs는 video-only execution에서 skipped로 보존한다.
- image workflow helper drift와 asset generation lifecycle validation narrowing을 정리해 campaign model typecheck를 회복했다.
- concurrent video execution regression은 video jobs가 동시에 실행되고 원본 Campaign job declarations가 mutate되지 않는지 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: plugin model에 남아 있던 DM automation/dispatch merge drift도 현재 테스트 계약에 맞춰 정리했다.

## [2026-05-11] dm-generated-reply-landing-routing | Sub-AC 7.3.3

- `generateDmAutomationReply()`를 추가해 DM automation configuration의 `landingUrlRoutes`에서 조건에 맞는 landing route를 선택하고, `{{campaignId}}`/personalization placeholder를 URL template에 렌더링한다.
- 선택된 landing URL은 route 설정의 `appendAttribution`에 따라 UTM attribution을 붙인 뒤 `landingUrl` personalization variable로 주입되어 최종 DM reply text와 함께 반환된다.
- route가 없거나 URL 렌더링이 실패하면 generation result가 명시적 error code로 실패해 unsafe DM reply publish를 막는다.
- 기존 Instagram DM dispatch adapter drift와 invalid execution request test fixture typing을 정리해 plugin model suite와 project typecheck를 회복했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] parallel-image-generation-workflow | Sub-AC 3.2.2

- `executeCampaignImageAssetGenerationWorkflow()`를 추가해 Campaign JSON source-of-truth에서 asset generation workflow를 로드하고, ready/queued image jobs를 병렬 실행한 뒤, 생성 결과를 Campaign asset list와 `campaignSpec.assetGenerationJobs`에 한 번에 반영할 수 있게 했다.
- regression test는 두 image job이 `maxConcurrency: 2`에서 실제로 동시에 실행되고, 각 generated image asset URI/rights/actor metadata가 workflow campaign에 persist되며 원본 Campaign draft는 mutate되지 않는지 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어 `CONTEXT.md`와 wiki fallback을 사용했다.

## [2026-05-11] dm-templated-reply-rendering | Sub-AC 7.3.2

- `renderDmAutomationReply()`를 추가해 DM automation reply template의 `{{variable}}` placeholder를 configured personalization variables로 렌더링한다.
- renderer는 automation configuration validation을 선행하고, 선언되지 않은 personalization input 또는 template placeholder를 `dm-reply-render.variable_not_supported`로 거부한다.
- configured fallback value를 적용해 optional profile-derived personalization을 안전하게 채우고, required variable이 unresolved이면 `dm-reply-render.variable_required`로 실패한다.
- 기존 Instagram comment-to-DM response mapping selector와 함께 plugin model suite가 mapped DM reply selection과 rendering contract를 검증한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 unrelated `app/features/creative-canvas/model/creative-canvas.ts`/`.test.ts` image-generation job lifecycle drift로 실패한다. `app/features/plugins/model/plugin-representation.type-test.ts`는 직접 node 실행 시 repo alias `~` 해석이 없어 실패하므로 project typecheck 대상이다.

## [2026-05-11] dm-automation-plugin-interface | Sub-AC 7.3.1

- direct-message plugin detail에 `automationConfigurationSchemas`를 추가해 DM 자동화 설정 스키마를 manifest에서 광고할 수 있게 했다.
- `DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION`, `DM_AUTOMATION_CONFIGURATION_SCHEMA`, `DmAutomationConfiguration`, `validateDmAutomationConfiguration()`를 추가해 템플릿 reply, personalization variable, tracked landing URL routing을 channel-neutral contract로 표현했다.
- direct-message configuration field type에 `personalization`과 `landing-routing`을 추가하고, plugin validation이 automation schema channel/trigger mismatch를 거부하도록 확장했다.
- `app/features/plugins/model/README.md`와 type-level fixture에 DM automation contract를 반영했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`.
- 참고: `npm run typecheck`와 `npm run build`는 현재 unrelated `app/features/creative-canvas/model/creative-canvas.ts` duplicate `ingestInstagramCommentEventIntoCampaignWorkflow` 및 missing `appendUnique` drift로 실패한다. `npm run skills:check`는 exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어 `CONTEXT.md`와 wiki fallback을 사용했다.

## [2026-05-11] instagram-comment-event-workflow-ingestion | Sub-AC 7.2.2

- `CampaignWorkflowEvent`와 optional `campaignSpec.workflowEvents`를 추가해 Instagram comment trigger event를 Campaign JSON source-of-truth 안의 normalized workflow event로 보존할 수 있게 했다.
- `ingestInstagramCommentEventIntoCampaignWorkflow()`가 plugin-layer Instagram comment event validation을 재사용하고 campaign id mismatch를 거부한 뒤, source/plugin/capability, subject/commenter, workflow port, attribution touchpoint, payload snapshot을 정규화한다.
- ingestion 결과는 원본 Campaign을 mutate하지 않고 workflow event를 append하며 `tracking.events`, `tracking.attribution.touchpoints`, logs/versions에 comment touchpoint를 남긴다.
- regression 중 기존 parser/execution drift도 정리되어 `jobStatuses`와 JSON structural edit reporting 계약이 focused suite에서 통과한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 DDD/marketing 계열 외부 Codex skill 8개 missing을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, wiki fallback을 사용했다.

## [2026-05-11] concurrent-image-job-status-tracking | Sub-AC 3.2.3

- concurrent image generation execution result에 `jobStatuses` projection을 추가해 completed/failed/skipped 상태, 원래 job status, actor, attempt, progress, started/completed/failed timestamp, error를 workflow order로 추적한다.
- image generation result persistence가 `campaignSpec.assetGenerationJobs` 상태 병합과 함께 `asset_generation.image_job_statuses` audit log/version을 남기도록 했다.
- mixed concurrent result regression은 image job 성공/실패와 video skipped job이 함께 있을 때 status tracking과 campaign JSON source-of-truth merge가 보존되는지 검증한다.
- 중복되어 있던 Instagram comment ingestion export와 누락되어 있던 campaign spec structural edit helper drift를 정리해 model test/typecheck/build를 회복했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] instagram-commenter-identity-reference-model | Sub-AC 7.2.3

- Instagram comment trigger event의 `commenter`를 legacy `id`만 가진 객체에서 `InstagramCommenterIdentityReference`로 확장했다.
- platform user id, username, profile URL/profile picture URL, normalized identity id, namespace, external/anonymous id, email/phone hash, link source/confidence/linkedAt을 Campaign attribution에 연결 가능한 선택 필드로 표현했다.
- `INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA.identityFields`를 추가해 direct-message plugin manifest가 commenter identity linkage 필드를 광고할 수 있게 했다.
- `validateInstagramCommentTriggerEvent()`가 제공된 commenter platform/profile/linkage 필드를 검증하고 malformed identity reference를 명시적 error code로 거부하도록 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`.
- 참고: `npm run typecheck`와 `npm run build`는 현재 unrelated `app/features/creative-canvas/model/creative-canvas.ts` duplicate `ingestInstagramCommentEventIntoCampaignWorkflow` 및 `CampaignSpecStructuralEdit`/`structuralEdits` drift로 실패한다.

## [2026-05-11] concurrent-image-asset-generation-execution | Sub-AC 3.2.1

- `executeCampaignImageAssetGenerationJobs()`를 추가해 loaded asset generation workflow의 ready/queued image jobs를 provider executor로 병렬 실행할 수 있게 했다.
- 실행 결과는 원본 Campaign/workflow를 직접 mutate하지 않고 completed/failed/skipped job snapshot과 전체 job projection을 반환한다.
- 각 image job 실행은 actor, attempt, started/completed/failed timestamp, progress, error/result metadata를 lifecycle에 반영하고 video 또는 실행 불가 상태 job은 skipped로 보존한다.
- canvas node normalization에서 legacy `kind` node는 기존 canonical JSON처럼 `label`을 제거하고, plugin-style `type` node만 label/properties를 보존하도록 정리했다.
- 이전 로그에 남아 있던 `executeCampaignImageAssetGenerationJobs` 중복 선언 drift는 현재 정리되어 typecheck/build를 통과한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] stable-campaign-spec-serialization | Sub-AC 4.1.3

- `serializeCampaignSpecJson()`를 추가해 Campaign JSON spec을 nodes, edges, assetGenerationJobs 순서와 각 domain object의 canonical field order로 직렬화하도록 했다.
- Canvas JSON editor도 raw `JSON.stringify` 대신 canonical serializer를 사용해 같은 canvas edit sequence가 같은 JSON 문자열을 만든다.
- provider parameter처럼 arbitrary object가 들어갈 수 있는 generation job nested value는 key sort를 적용해 insertion order drift를 줄였다.
- regression test는 동일한 canvas edit action sequence를 두 번 실행한 Campaign이 byte-for-byte 동일한 serialized campaign spec을 생성하는지 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] image-asset-generation-input-result-metadata | Sub-AC 3.1.2

- image asset generation job에 provider-ready `imageInputs`를 추가해 prompt, negative prompt, reference/product asset ids, output count, aspect ratio, size, style, seed, provider parameters를 Campaign JSON source-of-truth에 보존한다.
- generated image 결과를 `resultMetadata`로 기록해 result id, linked asset id, URI, mime type, dimensions, size, model, seed, prompt hash, provider request id, generated timestamp, duration, cost, finish reason을 추적할 수 있게 했다.
- `createCampaignAssetGenerationJob()`와 `loadCampaignAssetGenerationWorkflow()`가 image input/result metadata를 clone해 loaded executor projection이 원본 Campaign spec을 직접 오염시키지 않게 했다.
- JSON spec serialization helper, readonly canvas action contract, node-definition normalization drift를 보강해 agent/human action replay test fixture가 typecheck 가능한 source-of-truth contract를 갖도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어 `CONTEXT.md`, `.agents/product-marketing-context.md`, wiki fallback을 사용했다.

## [2026-05-11] asset-generation-job-lifecycle | Sub-AC 3.1.1

- Asset generation job status를 `draft`, `ready`, `queued`, `running`, `completed`, `failed`, `canceled` 공용 상태 집합으로 명시했다.
- `CampaignAssetGenerationJobLifecycle`에 created/updated/queued/started/completed/failed/canceled timestamp, actor, attempt, progress, error metadata를 정의하고 job factory가 기본 lifecycle object를 생성하도록 했다.
- job validation에 status, lifecycle attempt/progress/timestamp, failed-job error metadata 검증을 추가했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] instagram-dm-action-execution-schema | Sub-AC 7.1.2

- Follow-up: `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION`과 `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA`를 추가해 campaign-time Instagram DM action setup이 campaign id, capability id, trigger configuration, message template/text, tracked landing URL, attribution field를 명시하도록 했다.
- `InstagramDmActionConfiguration`과 `validateInstagramDmActionConfiguration()`를 추가해 실행 payload 이전의 comment-to-DM action 설정을 검증하고, `DirectMessagePluginDetails.actionConfigurationSchemas`로 manifest에서 광고할 수 있게 했다.
- `INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION`과 `INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA`를 추가해 Instagram DM send action execution request가 campaign id, capability id, trigger event, recipient, message, tracked landing URL, attribution field를 명시하도록 했다.
- `InstagramDmActionExecutionRequest`, `InstagramDmActionExecutionResponse`, `InstagramDmActionExecutor` 타입을 추가해 external/built-in direct-message plugin 구현체가 동일한 실행 인터페이스를 만족할 수 있게 했다.
- `validateInstagramDmActionExecutionRequest()`를 추가해 schema version, human/agent requester, timestamp, recipient id, rendered message text, http(s) landing URL, trigger campaign mismatch를 실행 전에 검증한다.
- type-level contract와 runtime regression으로 attribution-ready action configuration/execution payload와 unsafe payload rejection을 검증했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`.

## [2026-05-11] deterministic-canvas-action-mapping | Sub-AC 4.1.1

- `CampaignCanvasEditAction` union을 추가해 `canvas.node.create`, `canvas.node.update`, `canvas.node.delete`, `canvas.edge.connect`, `canvas.edge.disconnect`를 명시적 action contract로 정의했다.
- `applyCampaignCanvasEditAction()`을 추가해 각 action이 Campaign `canvasState`와 `campaignSpec.nodes/edges`에 동일한 deterministic mutation을 적용하고, 기존 `campaignSpec.assetGenerationJobs`는 보존하도록 했다.
- `canvas.edge.connect`는 `sourcePort`와 `targetPort`를 요구하고, edge normalization이 explicit port metadata를 JSON source-of-truth에 보존하도록 확장했다.
- asset generation lifecycle의 `system` actor type drift를 `CampaignExecutionActor`로 명시해 현재 factory contract와 typecheck를 맞췄다.
- regression test는 create/update/connect/create/disconnect/delete action sequence가 최종 canvas/spec 구조를 동일하게 만들고 원본 Campaign을 mutation하지 않는지 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 command exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, wiki fallback을 사용했다.

## [2026-05-11] instagram-comment-trigger-schema | Sub-AC 7.1.1

- Follow-up: direct-message plugin detail에 optional `triggerConfigurationSchemas`를 추가해 channel-specific trigger setup contract도 manifest에서 광고할 수 있게 했다.
- `INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION`, `INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA`, `InstagramCommentTriggerConfiguration`, `validateInstagramCommentTriggerConfiguration()`를 추가해 Instagram comment trigger 설정이 monitored account, optional media scope, keyword matcher, attribution template를 갖도록 정의했다.
- direct-message plugin detail에 optional `triggerEventSchemas`를 추가해 channel-specific trigger event contract를 manifest에서 광고할 수 있게 했다.
- `INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION`, `INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA`, `InstagramCommentTriggerEvent`, `validateInstagramCommentTriggerEvent()`를 추가해 Instagram comment event가 campaign id, account/media/comment id, commenter, text, timestamp, UTM-ready attribution field를 갖도록 정의했다.
- `validateDirectMessagePluginConfiguration()`이 advertised trigger configuration/event schema의 channel/trigger가 direct-message plugin 설정과 맞는지 검증하도록 확장했다.
- stale creative-canvas test fixture 2곳에 현재 `assetGenerationJobs` canvas/spec 필드를 보강해 repo-wide typecheck를 통과시켰다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 command exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`, `.agents/product-marketing-context.md`, wiki fallback을 사용했다.

## [2026-05-11] canvas-edit-json-sync | Sub-AC 4.1.1

- React Flow node/edge edit handler가 local UI state만 바꾸지 않고 `createCampaignCanvasEdit()`를 통해 Campaign `canvasState`와 `campaignSpec`을 즉시 갱신하도록 연결했다.
- Generation Palette에서 block을 추가할 때도 같은 sync 경로를 사용해 blank canvas에서 만든 node가 JSON source-of-truth에 바로 반영된다.
- React Flow adapter에 canvas block/edge 역변환 helper를 추가해 UI node position과 edge source/target/label을 Campaign JSON 형태로 보존한다.
- `campaignSpec.assetGenerationJobs`는 canvas node/edge 편집 중에도 유지되도록 sync helper에서 기존 spec 확장 필드를 보존한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 command exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, wiki fallback을 사용했다.

## [2026-05-11] campaign-measurement-tracking-api-validation | Sub-AC 2.5.3

- `GET /api/campaigns/:campaignId` route를 추가해 Campaign read API가 `tracking.measurementGoals`와 tracking configuration을 함께 노출하도록 했다.
- `PATCH /api/campaigns/:campaignId` route를 추가해 measurement goals와 tracking configuration을 병합 후 저장 전에 검증하고, invalid payload는 `campaign.validation_failed` 400 응답으로 거부하며 기존 persisted Campaign을 덮어쓰지 않게 했다.
- route 등록에 `api/campaigns/:campaignId`를 추가했고, 기존 measurement-goals API route의 `MapBackedStorage` 선언 순서를 정리해 typecheck를 통과시켰다.
- 검증: `node --experimental-strip-types --test app/routes/campaign-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-api.test.ts app/routes/campaign-measurement-goals-api.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts app/features/creative-canvas/model/campaign-tracking-configuration-save-flow.test.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/routes/plugin-kind-api.test.ts app/routes/agent-plugin-api.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 command exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`와 wiki fallback을 사용했다.

## [2026-05-11] campaign-measurement-metrics-schema | Sub-AC 2.5.1

- Campaign `tracking.metrics`를 추가해 실제 관측된 metric name, value/unit, source, attribution touchpoint, observed timestamp를 JSON source-of-truth에 저장한다.
- `createCampaignMeasurementMetric()`, `validateCampaignMeasurementMetrics()`, `saveCampaignMeasurementMetrics()`를 연결해 measurement goals와 별도로 실측 metric 저장/검증/재조회가 가능해졌다.
- invalid metric은 persisted campaign을 덮어쓰지 않고 `measurement_metric.*` validation code로 거부한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-tracking-configuration-save-flow.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-state-durable-api | Sub-AC 6.4.1

- agent plugin API route가 durable storage에서 persisted plugin catalog를 먼저 읽고, 없을 때만 default catalog를 fallback으로 쓰도록 연결했다.
- agent install, activate, deactivate 요청이 성공하면 `owncanvas.plugin-catalog.v1` storage에 lifecycle state와 timestamp를 저장하도록 route-level storage path를 추가했다.
- 같은 storage를 사용해 installed view를 다시 조회하면 방금 설치한 plugin과 활성화 state가 유지되는 regression을 추가했다.
- 참고: `npm run skills:check`는 command exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`와 wiki fallback을 사용했다.

## [2026-05-10] scaffold | llm-wiki 초기화

- `llm-wiki` 스킬을 OwnCanvas 스킬 레지스트리에 추가했다.
- `python3 /Users/baekjunho/.codex/skills/llm-wiki/scripts/init_wiki.py .`로 `raw/`와 `wiki/` 구조를 생성했다.
- OwnCanvas 루트 운영 원칙을 `wiki-first`로 조정했다.
- 앞으로 의미 있는 작업 결과는 기본적으로 `wiki/log.md`와 관련 wiki page에 남긴다.

## [2026-05-11] responsive-canvas | mobile preview

- Creative Canvas shell을 모바일 반응형으로 조정했다.
- 데스크톱에서는 고정 사이드바/팔레트/툴바를 유지하고, 모바일에서는 세로 스택으로 재배치되도록 CSS media query를 추가했다.
- `README.md`에 `npm run dev -- --host 0.0.0.0`로 폰에서 미리보기 하는 방법을 적었다.

## [2026-05-11] blank-campaign-entry | Sub-AC 1.1

- Campaign dashboard에 `New blank campaign` 생성 진입점을 추가했다.
- `createBlankCampaign()`이 `campaignSpec`과 `canvasState`를 모두 빈 nodes/edges로 시작하게 해 JSON source와 canvas state의 초기 동기화를 명시했다.
- 생성 후 Creative Canvas는 0 blocks 상태로 열리고, Generation Palette에서 사용자가 첫 Generation Block을 추가할 수 있다.
- `CreativeCanvasScreen`의 campaign 미전달 fallback도 빈 nodes/edges로 맞춰 direct canvas entry가 데모 템플릿을 자동 주입하지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-schema | shared plugin representation

- `app/features/plugins/model/plugin-representation.ts`에 공통 플러그인 manifest 타입을 추가했다.
- identity, metadata, origin, lifecycle, capability, port, permission mode, actor install/configure 권한, configuration field를 한 스키마로 묶었다.
- built-in provider와 external provider, parallel bulk image/video generation, conversion tracking capability를 type-level contract로 검증했다.

## [2026-05-11] blank-campaign-metadata | Sub-AC 1.2

- blank Campaign 생성 후 Creative Canvas 안에서 필수 campaign metadata를 입력할 수 있는 우측 setup 패널을 추가했다.
- metadata는 `CampaignDraft` JSON 상태의 `title`, `objective`, `targetAudience`, `productOffer`에 즉시 반영되며, 빈 canvas nodes/edges 상태는 유지된다.
- `targetAudience`는 age, gender, interests, behavior, region, platform을 명시하고, `productOffer`는 name, description, pricePoint, destinationUrl을 명시한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-lifecycle | Sub-AC 5.1.2

- 플러그인 manifest에 `type` 필드를 추가해 provider, commission, agent, dashboard, direct-message, landing, tracking, custom 플러그인 범주를 명시했다.
- `lifecycle`을 단일 문자열에서 `state`, installed/configured/activated/deactivated timestamp, error, updatedAt을 가진 구조화 필드로 확장했다.
- allowed lifecycle state를 available, installed, configured, active, inactive, error, uninstalled로 정의하고 transition table 및 `isPluginLifecycleTransitionAllowed()` 헬퍼를 추가했다.
- type-level contract와 Node 런타임 테스트로 전이 허용/거부 동작을 검증했다.

## [2026-05-11] blank-campaign-persistence | Sub-AC 1.3.1

- blank Campaign 생성 시 `owncanvas.campaigns.v1` localStorage 레코드에 즉시 저장되는 `createBlankCampaignRecord()` 경로를 추가했다.
- 저장 레코드는 schema version, id, createdAt/updatedAt, 기본 title/objective/status, 빈 `campaignSpec`/`canvasState`, audience/offer/tracking 기본값을 포함한다.
- Campaign dashboard의 `New blank campaign` 버튼이 persistence helper를 사용해 저장 후 Creative Canvas를 열도록 연결했다.
- repo-wide typecheck를 막던 plugin manifest literal widening을 `definePluginManifest()` generic helper에서 보정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] empty-workspace-state | Sub-AC 1.3.2

- blank Campaign 생성 시 `owncanvas.workspace.v1` localStorage 레코드도 함께 초기화하도록 추가했다.
- workspace state는 campaign id, basic mode, select tool, 빈 canvas nodes/edges, 기본 viewport, 빈 selection, initializedAt/updatedAt을 포함한다.
- workspace canvas는 Campaign의 빈 `canvasState`에서 파생되어 JSON source와 UI workspace 초기 상태가 같은 빈 구조로 시작한다.
- repo-wide 검증 중 발견된 provider/commission plugin validation 타입 정합성도 정리해 `tsc`가 전체 model/type-test를 통과하도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-data-model | Sub-AC 1.2.1

- Campaign data model에 `schemaVersion`, required field registry, attribution-ready tracking defaults를 명시했다.
- blank campaign 기본값은 빈 canvas/spec nodes/edges를 유지하면서 target audience, product offer, plugins, assets, channels, logs, versions, status를 모두 초기화한다.
- `createBlankCampaignRecord()`와 `CAMPAIGN_STORAGE_KEY`를 추가해 blank campaign record가 생성/수정 timestamp와 함께 storage에 저장되도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-creation-defaults | Sub-AC 1.2.2

- Campaign 생성 flow에서 persisted record에 creation audit log와 initial draft version을 기본 적용하도록 했다.
- blank draft factory는 템플릿 없는 빈 canvas/spec 상태를 유지하고, storage record 생성 시점에 `campaign.created`와 `draft.created` 기본값을 붙인다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-record-retrieval | Sub-AC 1.2.3

- `getPersistedCampaignRecord()`를 추가해 `owncanvas.campaigns.v1` storage에서 새로 생성된 Campaign record를 id로 다시 조회할 수 있게 했다.
- blank Campaign 생성 직후 같은 storage에서 조회하면 createdAt/updatedAt, audit log, version, 빈 `campaignSpec`/`canvasState`가 보존된 동일 레코드가 반환되는 테스트를 추가했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 기존 `app/features/plugins/model/plugin-representation.test.ts`의 `validateProviderPluginConfiguration` export/typing 오류로 실패했다.

## [2026-05-11] provider-plugin-config | Sub-AC 5.2.1

- provider 플러그인을 일반 플러그인 manifest와 구분하는 `ProviderPluginManifest`를 추가했다.
- provider metadata에는 built-in/external kind, 지원 media type, 실행 위치, advanced 여부를 명시한다.
- provider configuration field는 credential, model, endpoint, budget, webhook, rate-limit, safety 전용 타입으로 세분화했다.
- built-in provider와 advanced external provider를 type-level contract로 검증했다.
- 검증: `npm run typecheck`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run build`.

## [2026-05-11] plugin-extension-representation | Sub-AC 5.1.3

- `app/features/plugins/model/README.md`에 plugin type별 Campaign 역할과 공통 manifest 확장 방식을 문서화했다.
- provider, commission, agent, dashboard, direct-message, landing, tracking, custom이 top-level 공통 필드를 복제하지 않고 capability, port, concurrency, configuration, permission으로 차이를 표현하도록 정리했다.
- `wiki/concepts/plugin-extension-representation.md`와 `wiki/index.md`에 durable concept 기록을 추가했다.

## [2026-05-11] provider-plugin-type-contract | Sub-AC 5.2.1

- provider plugin manifest를 built-in provider와 external provider의 discriminated union으로 강화했다.
- provider plugin은 하나 이상의 generation capability(`generate.text`, `generate.image`, `generate.video`, `generate.voice`)와 하나 이상의 provider configuration field를 요구한다.
- built-in provider configuration은 credential, model, rate-limit, safety field만 허용하고, external provider configuration은 endpoint, budget, webhook field까지 허용한다.
- origin kind와 provider kind가 일치하도록 type-level contract를 추가했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] commission-plugin-config | Sub-AC 5.2.2

- `CommissionPluginManifest`와 `CommissionPluginDetails`를 추가해 commission model, offer source, payout currency, attribution requirement를 공통 plugin manifest 위에 표현했다.
- commission configuration field를 network, offer, payout, attribution-window, approval 타입으로 세분화했다.
- type-level contract와 Node 런타임 테스트로 affiliate commission plugin 예시가 type-specific configuration을 보존하는지 검증했다.

## [2026-05-11] provider-plugin-config-validation | Sub-AC 5.2.3

- provider 플러그인 configuration에 대한 런타임 validation API를 추가했다.
- `PROVIDER_CONFIGURATION_RULES`와 `validateProviderPluginConfiguration()`이 origin/provider kind 일치, generation capability 존재, configuration field 존재, 중복 key, built-in provider의 external-only field 금지, providerConfigType별 field type, numeric default 양수를 검증한다.
- provider configuration schema를 non-empty typed field 계약으로 유지해 built-in provider와 advanced external provider 모두 activation 전 검증할 수 있게 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] agent-plugin-representation | Sub-AC 5.3.1

- `AgentPluginManifest`와 `AgentPluginDetails`를 추가해 autonomy, supported canvas actions, safety mode, human approval requirement를 공통 plugin manifest 위에 표현했다.
- agent plugin은 하나 이상의 `agent.action` capability와 하나 이상의 typed agent configuration field를 요구한다.
- agent configuration field를 instruction, model, action-policy, approval-policy, memory 타입으로 세분화했다.
- `validateAgentPluginConfiguration()`이 agent action capability, configuration field 존재, duplicate key, unknown agent config type, field type mismatch를 검증한다.

## [2026-05-11] commission-plugin-config-validation | Sub-AC 5.2.4

- commission 플러그인 configuration validation rule에 unknown `commissionConfigType` 거부를 추가했다.
- `COMMISSION_CONFIG_FIELD_TYPES`를 export해 runtime schema contract를 provider validation처럼 명시적으로 참조할 수 있게 했다.
- `app/features/plugins/model/README.md`에 commission configuration schema/rule 목록을 문서화했다.
- 검증: focused inline Node assertion으로 unknown commission configuration type이 `commission.unknown_config_type`을 반환함을 확인했고, 이후 전체 plugin test suite, `npm run typecheck`, `npm run build`가 통과했다.

## [2026-05-11] dashboard-plugin-representation | Sub-AC 5.3.2

- `DashboardPluginManifest`와 `DashboardPluginDetails`를 추가해 report type, visualization, realtime/export 지원 여부를 공통 plugin manifest 위에 표현했다.
- dashboard plugin은 하나 이상의 `dashboard.report` capability와 하나 이상의 typed dashboard configuration field를 요구한다.
- dashboard configuration field를 metric, attribution-window, filter, visualization, export 타입으로 세분화했다.
- `DASHBOARD_CONFIGURATION_RULES`와 `validateDashboardPluginConfiguration()`이 dashboard report capability, configuration field 존재, duplicate key, unknown dashboard config type, unsupported metric/visualization, field type mismatch, numeric default 양수를 검증한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-workspace-link | Sub-AC 1.3.3

- persisted Campaign record에 `workspaceState` 링크를 추가해 workspace storage key, workspace id, initializedAt을 함께 저장하도록 했다.
- workspace state에 stable `id`를 추가하고 `owncanvas.workspace.v1` storage를 배열형 record로 저장해 여러 Campaign workspace를 이후 campaign id로 조회할 수 있게 했다.
- `getPersistedCampaignWorkspaceState()`를 추가해 persisted Campaign의 workspace link를 따라 초기화된 workspace state를 복원한다.
- agent plugin 타입/validation export 누락으로 `npm run typecheck`가 막히던 drift도 기존 테스트 계약에 맞춰 보정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-canvas-navigation | Sub-AC 1.4

- blank Campaign 생성 후 index route의 local state 전환이 아니라 `/campaigns/:campaignId/canvas` 경로로 이동하도록 연결했다.
- `getCampaignCanvasPath()`를 추가해 새 Campaign id에서 canvas URL을 안정적으로 생성하고, 생성 직후 route path contract를 테스트로 고정했다.
- 새 `campaign-canvas` route는 localStorage에서 Campaign record를 id로 복원해 Creative Canvas를 렌더링하며, 상단 back action은 Campaign dashboard로 돌아간다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 기존 `app/features/plugins/model/plugin-representation.test.ts`의 `validateDashboardPluginConfiguration` export 누락과 implicit any 오류로 실패했다.

## [2026-05-11] agent-plugin-port-validation | Sub-AC 5.3.1

- agent 플러그인 표현에서 `AgentPluginManifest`, `AgentPluginDetails`, typed `AgentConfigurationField` 계약을 유지했다.
- `validateAgentPluginConfiguration()`에 `agent.action` capability의 explicit port 검증을 추가했다.
- agent action capability는 `action` JSON input port와 `result` event output port를 가져야 하며, 이는 사람/에이전트 canvas action을 같은 port 기반 실행 모델로 표현하기 위한 최소 계약이다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] dm-landing-plugin-representation | Sub-AC 5.4

- `DirectMessagePluginManifest`와 `DirectMessagePluginDetails`를 추가해 DM channel, trigger, delivery mode, compliance review requirement를 공통 plugin manifest 위에 표현했다.
- direct-message plugin은 하나 이상의 `channel.dm` capability, `delivery` event output port, 하나 이상의 typed direct-message configuration field를 요구한다.
- `LandingPluginManifest`와 `LandingPluginDetails`를 추가해 page type, publish target, checkout support, immersion preservation을 공통 plugin manifest 위에 표현했다.
- landing plugin은 하나 이상의 `landing.page` capability, `url` output port, 하나 이상의 typed landing configuration field를 요구한다.
- `validateDirectMessagePluginConfiguration()`과 `validateLandingPluginConfiguration()`이 activation 전 required capability, explicit output port, duplicate key, unknown config type, incompatible field type, channel/page/publish mismatch, compliance/checkout/immersion requirements를 검증한다.

## [2026-05-11] direct-message-plugin-validation | Sub-AC 5.3.3

- DM plugin representation이 `DirectMessagePluginManifest`, `DirectMessagePluginDetails`, `DirectMessageConfigurationField` type contract로 고정되어 있음을 확인했다.
- `validateDirectMessagePluginConfiguration()`이 `channel.dm` capability, `delivery` event output port, duplicate key, unknown `directMessageConfigType`, channel mismatch, field type mismatch, compliance requirement, numeric default 양수를 검증한다.
- type-level contract는 invalid direct-message capability/configuration manifest를 `@ts-expect-error`로 막고, runtime test는 valid Instagram comment-to-DM plugin과 invalid rule violation sequence를 검증한다.
- 검증: `node --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-kind-all-types-test-coverage | Sub-AC 5.4.4

- plugin kind registration이 provider, commission, agent, dashboard, direct-message, landing, tracking, custom 전체 supported type을 빠짐없이 등록하고 각 kind title/capability/detail key를 구분하는 regression을 추가했다.
- agent discovery fixture를 전체 supported plugin type별로 구성해 `listDiscoverablePluginsForAgent()`가 각 manifest를 고유한 `kind` metadata와 capability kind로 노출하는지 검증했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types --test app/routes/plugin-kind-api.test.ts`, `npm run typecheck`.
- 참고: `npm run skills:check`는 command exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`와 wiki fallback을 사용했다.

## [2026-05-11] landing-plugin-validation | Sub-AC 5.3.4

- landing plugin representation이 `LandingPluginManifest`, `LandingPluginDetails`, `LandingConfigurationField` type contract로 고정되어 있음을 확인했다.
- `validateLandingPluginConfiguration()`에 `landing.page` capability의 explicit port 검증을 보강했다.
- landing page capability는 `creative` JSON input port와 `url` URL output port를 가져야 하며, 이는 canvas JSON source에서 만든 creative/content-commerce state를 landing destination으로 publish하고 conversion URL을 downstream DM/tracking flow에 연결하기 위한 최소 계약이다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 command exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`와 wiki fallback을 사용했다.

## [2026-05-11] campaign-target-audience-fields | Sub-AC 2.1.1

- Campaign data model에 `CAMPAIGN_TARGET_AUDIENCE_FIELDS`와 `CampaignTargetAudienceField`를 추가해 audience profile의 `age`, `gender`, `interests`, `behavior`, `region`, `platform` 필드 목록을 명시했다.
- `createCampaignTargetAudience()` factory를 추가하고 blank Campaign 생성이 같은 factory를 사용하도록 연결해 JSON source-of-truth의 target audience 기본값과 typed field registry가 분리되지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] agent-plugin-catalog-discovery | Sub-AC 6.1.1

- `PluginCatalog`와 `AgentDiscoverablePlugin` summary contract를 추가해 registry/catalog에 있는 plugin manifest를 agent가 탐색할 수 있게 했다.
- `listDiscoverablePluginsForAgent()`는 lifecycle이 `available`이고 `installableBy`에 `agent`가 포함된 plugin만 반환한다.
- agent discovery summary는 identity, type, origin, metadata, permission mode, approval requirements, capability kinds, parallel/bulk 지원 여부만 노출하고 configuration secret/value는 노출하지 않는다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-kind-registry-api | Sub-AC 5.4.1

- `PluginKindDefinition`, `PluginKindRegistry`, `CompletePluginKindRegistry`를 추가해 OwnCanvas가 지원하는 plugin kind/type을 독립 API로 표현하게 했다.
- `registerPluginKind()`와 `createPluginKindRegistry()`가 immutable registry를 만들고 중복 kind 등록을 거부한다.
- `DEFAULT_PLUGIN_KIND_REGISTRY`가 provider, commission, agent, dashboard, direct-message, landing, tracking, custom 전체 supported kind를 등록하며, `listPluginKindDefinitions()`, `getPluginKindDefinition()`, `isSupportedPluginType()`로 canvas/installer/agent가 조회할 수 있게 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`.

## [2026-05-11] campaign-target-audience-editing-ui | Sub-AC 2.1.2

- Campaign canvas metadata panel의 Target audience 입력 UI를 `CAMPAIGN_TARGET_AUDIENCE_FIELDS` registry에서 렌더링하도록 연결했다.
- `age`, `gender`, `interests`, `behavior`, `region`, `platform` 입력값이 Campaign JSON source-of-truth의 `targetAudience`에 반영되도록 유지했다.
- `updatePersistedCampaignRecord()`를 추가해 canvas route에서 audience metadata edit을 `owncanvas.campaigns.v1` localStorage record에 저장하고 `updatedAt`을 갱신한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-target-audience-persistence | Sub-AC 2.1.3

- persisted Campaign을 다시 조회해 viewing state로 열 때 `targetAudience`의 `age`, `gender`, `interests`, `behavior`, `region`, `platform` details가 그대로 반환되는 round-trip regression을 추가했다.
- campaign title처럼 audience와 무관한 field를 edit/save하는 흐름에서도 기존 target audience details가 유지되는 것을 검증했다.
- project-wide validation을 막던 plugin kind registry `capabilityKinds` literal inference를 `as const`로 고정해 `CompletePluginKindRegistry` contract와 type tests가 다시 통과하도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-offer-details-editing | Sub-AC 2.2.2

- Campaign product offer 모델에 명시적인 `offer.terms` 필드를 추가해 pricing, discount, terms를 같은 JSON source-of-truth 안에서 저장할 수 있게 했다.
- Creative Canvas metadata panel의 Offer 섹션에 Terms 입력 영역을 추가해 사용자가 가격/할인과 함께 조건, 만료일, 사용 제한을 편집할 수 있게 했다.
- `campaign-product-offer-save-flow.test.ts`를 추가해 offer pricing, discount, terms가 localStorage 저장/조회 흐름에서 보존되는지 검증했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/creative-canvas/model/campaign-product-offer-save-flow.test.ts app/features/creative-canvas/model/campaign-target-audience-save-flow.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 command exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, wiki fallback을 사용했다.

## [2026-05-11] plugin-kind-discovery-api | Sub-AC 5.4.2

- `GET /api/plugin-kinds` resource route를 추가해 등록된 plugin kind 전체를 discovery schema, count, metadata와 함께 반환하도록 했다.
- `GET /api/plugin-kinds/:pluginType` resource route를 추가해 특정 plugin kind metadata를 조회하고, 미등록 kind는 `plugin_kind.not_found` 404 JSON으로 반환하도록 했다.
- API payload는 registry definition을 직접 노출하지 않고 `title`, `description`, `campaignRole`, `capabilityKinds`, origin 지원 여부, 기본 permission mode, required detail key만 안정적으로 직렬화한다.
- 검증: `node --experimental-strip-types --test app/routes/plugin-kind-api.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`는 기존 `productOffer` 구조 기대값과 현재 기본값이 달라 실패했다.

## [2026-05-11] agent-plugin-install-usability | Sub-AC 6.1.2

- `installSelectedPluginForAgent()`를 추가해 agent가 catalog에서 선택한 `available` plugin을 immutable catalog update로 `installed` 상태로 전환할 수 있게 했다.
- install flow는 plugin 존재 여부, `available -> installed` lifecycle 전환, `permissions.installableBy`의 agent 권한을 검증하고 `installedAt`/`updatedAt`을 기록한다.
- `verifyAgentInstalledPluginUsable()`를 추가해 설치된 plugin이 agent configuration 권한, explicit input/output ports, type-specific configuration validation을 만족하는지 확인하고 usable capability summary를 반환한다.
- default plugin kind registry는 frozen object를 유지하면서 literal type precision을 보존하도록 정리했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] agent-plugin-discovery-api | Sub-AC 6.1.1

- `GET /api/agent/plugins` resource route를 추가해 agents가 설치 후보 plugin catalog를 query할 수 있게 했다.
- endpoint는 `listDiscoverablePluginsForAgent()`를 사용해 `available` 상태이고 `agent` 설치 권한이 있는 plugin만 반환한다.
- discovery payload는 plugin identity, kind metadata, origin, permission mode, approval requirement, capability kinds, parallel/bulk 지원 여부를 포함하고 configuration field/secret 및 human-only plugin은 노출하지 않는다.
- 검증: `node --experimental-strip-types --test app/routes/agent-plugin-api.test.ts app/routes/plugin-kind-api.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-product-structure | Sub-AC 2.2.1

- Campaign `productOffer`를 flat string fields에서 `product`, `offer`, `attribution` 구조로 확장했다.
- product detail은 id/title/brand/category/description/tags/canonicalUrl/media/variants를 담고, offer detail은 price amount/currency/display, discount, destination URL, CTA를 담는다.

## [2026-05-11] agent-plugin-deactivation-api | Sub-AC 6.2.3

- agent가 active installed plugin을 검증된 service/API 경로로 `inactive` 상태로 전환할 수 있게 했다.
- `deactivateInstalledPluginForAgent()`는 plugin 존재 여부, active lifecycle 상태, agent deactivation 권한, `active -> inactive` lifecycle transition을 검증하고 `deactivatedAt`/`updatedAt`을 기록한다.
- `POST /api/agent/plugins`는 `{ action: "deactivate", pluginId }` 요청을 받아 deactivation 전용 schema response를 반환하며 configuration/secret field를 노출하지 않는다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types --test app/routes/agent-plugin-api.test.ts`, `npm run typecheck`, `npm run build`.
- attribution detail은 source/external id/affiliate network/commission rate/tracking URL을 포함해 이후 commission plugin과 conversion attribution 흐름에 연결할 수 있게 했다.
- Creative Canvas metadata panel의 product offer inputs를 nested Campaign JSON source-of-truth에 맞춰 갱신했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] agent-installed-workflow-capabilities | Sub-AC 6.2.1

- `AgentSelectableWorkflowCapability`와 `listSelectableWorkflowCapabilitiesForAgent()`를 추가해 설치된 plugin capability를 agent가 workflow node 후보로 선택할 수 있게 했다.
- selectable capability는 `installed`, `configured`, `active` lifecycle만 허용하고, agent configuration 권한, explicit input/output ports, type-specific validation을 통과한 plugin만 노출한다.
- basic mode는 basic plugin만 반환하고 advanced mode는 advanced external tracking/provider 같은 고권한 capability도 선택 가능하게 해 permission/safety control을 유지했다.
- agent selection payload는 `canvas.node.create`와 plugin/capability id를 포함해 사람의 canvas node 생성 UX와 같은 action surface로 연결된다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] agent-installed-plugin-inventory | Sub-AC 6.2.1

- `AgentInstalledPlugin`과 `listInstalledPluginsForAgent()`를 추가해 agent가 설치된 plugin inventory를 조회하고 각 plugin의 현재 activation/lifecycle state를 읽을 수 있게 했다.
- installed inventory는 `installed`, `configured`, `active`, `inactive`, `error` 상태만 포함하고 `available`/`uninstalled` catalog 항목은 제외한다.
- summary는 plugin identity, type, origin, permission mode, approval requirements, capability kinds, installed/configured/activated/deactivated timestamp, agent configuration 가능 여부를 노출한다.
- `GET /api/agent/plugins?view=installed`가 `owncanvas.agent-installed-plugins.v1` 응답으로 설치된 plugin과 activation state를 반환하도록 연결했다.
- configuration schema/value와 secret field는 agent inventory 응답에서 제외해 상태 조회와 credential 접근을 분리했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types --test app/routes/agent-plugin-api.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-structured-offer-fields | Sub-AC 2.2.2

- Campaign data model에 `CAMPAIGN_PRODUCT_OFFER_FIELDS` registry를 추가해 `product`, `offer`, `attribution` section별 structured offer field 목록을 source-of-truth로 노출했다.
- `CampaignProductOfferSection`, `CampaignProductOfferField`, `CampaignProductOfferInput` type을 추가해 humans/agents/UI가 부분 structured offer input을 제공해도 완성된 `CampaignProductOffer`로 정규화되게 했다.
- `createCampaignProductOffer()`가 nested partial product, price, offer, attribution input을 default structure와 merge하도록 type contract를 완화했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-product-offer-editing-ui | Sub-AC 2.2.3

- Campaign metadata panel이 product details, offer, commerce attribution section으로 나뉘어 `productOffer.product`, `productOffer.offer`, `productOffer.attribution` nested JSON을 직접 edit하도록 확장했다.
- UI는 product id/title/brand/category/description/tags/canonical URL, offer headline/summary/discount/destination URL/CTA/price amount/display/currency, attribution source/external ID/network/commission rate/tracking URL을 capture한다.
- product/offer/attribution details가 localStorage campaign record에 저장되고 이후 title/objective 같은 다른 campaign edit 후에도 보존되는 round-trip regression을 추가했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] workflow-plugin-activation-persistence | Sub-AC 6.2.2

- Campaign workflow `plugins`를 plain ID 목록에서 `CampaignWorkflowPluginConfiguration` 목록으로 확장해 plugin id/type, permission mode, capability IDs, scoped configuration values, secret refs, lifecycle activation state, actor, timestamps를 함께 저장한다.
- `createCampaignWorkflowPluginConfiguration()`와 `setCampaignWorkflowPluginActivation()`를 추가해 human/agent activation/deactivation이 Campaign JSON source-of-truth에 기록되고 audit log/version entry로 남도록 했다.
- persisted campaign round-trip test를 추가해 active plugin state와 configuration/secret refs가 campaign edit 이후에도 유지되는지 검증했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-product-offer-validation | Sub-AC 2.2.4

- `validateCampaignProductOffer()`를 추가해 product title, canonical/media/tracking URL, variant/offer price, currency, CTA, destination URL, commission rate를 runtime validation result로 검사한다.
- `updatePersistedCampaignRecord()`가 invalid `productOffer`를 localStorage campaign record에 저장하지 않고 validation code 목록과 함께 reject하도록 해 product/offer source-of-truth가 검증된 상태로 유지되게 했다.
- blank campaign의 default empty `productOffer`는 draft creation/edit flow를 막지 않도록 valid empty state로 유지했다.
- agent plugin discovery fixture의 landing plugin sample을 current landing schema(`hosted`, `domain`, `string`)에 맞춰 정리해 project-wide typecheck를 복구했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/routes/agent-plugin-api.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-target-audience-form-verification | Sub-AC 2.1.2

- Campaign creation/edit metadata panel이 `CAMPAIGN_TARGET_AUDIENCE_FIELDS` registry 기반으로 age, gender, interests, behavior, region, platform 입력을 모두 렌더링하고 `targetAudience` JSON source-of-truth에 저장하는 상태를 재검증했다.
- `updatePersistedCampaignRecord()` 기반 저장/재조회 regression이 target audience details를 보존함을 확인했다.
- project-wide typecheck를 막던 agent plugin discovery fixture의 landing sample을 current landing schema(`hosted`, `domain`, `checkout`, `string`/`select`)에 맞춰 보정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/routes/agent-plugin-api.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] agent-workflow-runtime-plugin-loading | Sub-AC 6.2.3

- `loadActivatedPluginsIntoAgentWorkflowRuntime()`를 추가해 Campaign JSON source-of-truth의 active workflow plugin configuration과 catalog manifest를 결합해 agent runtime plugin 목록을 만든다.
- runtime loader는 inactive plugin을 제외하고 manifest 누락, type mismatch, basic/advanced mode 차단, agent usability failure, missing capability ID를 구조화된 error로 반환한다.
- loaded runtime plugin은 activation actor/time, scoped configuration values, secret refs, approval requirement, explicit input/output port, parallel/bulk capability metadata를 보존한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-activation-permission-validation | Sub-AC 6.2.4

- `setCampaignWorkflowPluginActivation()`가 선택적으로 catalog manifest를 받아 activation 전에 manifest 존재, plugin type 일치, installed/configured/active lifecycle, actor activation permission을 검증하도록 보강했다.
- agent/human actor 권한은 manifest의 `permissions.configurableBy`를 기준으로 확인하며, missing/available/uninstalled catalog plugin은 Campaign JSON source-of-truth를 active 상태로 바꾸기 전에 명확한 error로 거부한다.
- workflow plugin은 campaign configuration이 `configured`, `inactive`, `active` 상태일 때만 활성화할 수 있어 installed-only campaign plugin을 바로 active로 올리는 흐름을 막는다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-default-configuration-schema | Sub-AC 6.3.1

- `createPluginDefaultConfigurationSchema()`를 추가해 plugin manifest의 `configuration.fields`에서 installer/agent용 default configuration metadata를 파생한다.
- schema는 plugin id/type, permission mode, configurable actors, field metadata, required keys, non-secret default values, secret refs를 분리해 제공한다.
- secret field의 `defaultValue`는 반환하지 않고 `secretRef`만 `defaults.secretRefs`에 보존해 configuration discovery 중 credential value가 노출되지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] agent-plugin-activation-api | Sub-AC 6.2.2

- `activateInstalledPluginForAgent()`를 추가해 agent가 설치된 catalog plugin을 검증된 service path로 `active` 상태로 전환할 수 있게 했다.
- activation은 plugin 존재 여부, installed/configured/active 계열 lifecycle, agent activation 권한, lifecycle transition, agent usability를 확인한 뒤 `activatedAt`/`updatedAt`을 기록한다.
- install service가 plugin default configuration을 적용해 required 기본값/secret ref가 모두 충족된 plugin은 `configured` 상태로 설치하고, 누락된 required key는 `appliedConfiguration.missingRequiredKeys`에 남기도록 보강했다.
- `POST /api/agent/plugins`에서 `{ action: "activate", pluginId }` 요청을 받아 `owncanvas.agent-plugin-activation-request.v1` 응답을 반환하도록 연결했다.
- API activation 응답은 request id, actor, plugin id, approval requirement, lifecycle state/timestamp만 노출하고 configuration/secret field는 숨긴다.
- 검증: `node --experimental-strip-types --test app/routes/agent-plugin-api.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-asset-metadata | Sub-AC 2.3.1

- Campaign `assets`를 문자열 목록에서 typed asset metadata 목록으로 확장했다.
- linked asset과 uploaded asset 모두 `source`, `mediaType`, `title`, `uri`, `usage`, rights owner/license/source, file metadata, created actor/time을 보존한다.
- `createCampaignAsset()`, `addCampaignAsset()`, `validateCampaignAssets()`를 추가해 required metadata를 검증하고 Campaign logs/versions에 asset addition audit trail을 남긴다.
- Creative Canvas metadata panel에 Campaign assets 섹션을 추가해 사람 사용자가 asset link를 추가하거나 파일을 선택해 Campaign JSON source-of-truth에 저장할 수 있게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-asset-list-and-detail-view | Sub-AC 2.3.2

- `listCampaignAssets()`와 `getCampaignAssetDetails()`를 추가해 Campaign source-of-truth의 asset 목록을 요약 조회하고 asset id로 전체 metadata를 볼 수 있게 했다.
- Creative Canvas metadata panel의 Campaign assets 영역을 selectable list와 selected asset detail view로 나눠 URI, rights, file metadata, alt text, 생성 actor/time을 확인할 수 있게 했다.
- TDD red/green 검증으로 campaign asset summary/detail lookup regression을 추가했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts` 통과, `npm run build` 통과.
- 참고: 당시에는 plugin install-flow drift(`installed` vs `configured`, `appliedConfiguration` test type) 때문에 plugin test와 typecheck가 실패했으나, 이후 `agent-plugin-activation-api` 작업에서 default configuration 적용 경로를 정리해 해소했다.

## [2026-05-11] plugin-install-default-configuration | Sub-AC 6.3.2

- agent plugin installation이 manifest의 default configuration schema를 `appliedConfiguration`으로 적용하도록 추가했다.
- non-secret `defaultValue`는 `values`에 저장하고, secret field는 실제 default 값을 복사하지 않고 `secretRefs`만 저장한다.
- required configuration field가 default value 또는 secret ref로 모두 충족되면 설치 직후 lifecycle을 `configured`로 전환하고 `configuredAt`을 기록한다.
- required default가 없는 field는 `missingRequiredKeys`에 남겨 후속 human/agent configuration flow가 이어받을 수 있게 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts app/routes/agent-plugin-api.test.ts app/routes/plugin-kind-api.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`, `.agents/product-marketing-context.md`, wiki fallback을 사용했다.

## [2026-05-11] agent-plugin-state-api | Sub-AC 6.4.3

- agent-facing plugin API에 설치/활성화 상태와 함께 sanitized `configurationState`를 노출했다.
- `configurationState`는 `configured`, `needs_configuration`, `not_configured` 상태와 required/configured/missing field count만 제공하고, raw configuration field, secret value, secret ref key, missing key 이름은 노출하지 않는다.
- `POST /api/agent/plugins` 설치 응답과 `GET /api/agent/plugins?view=installed` 조회 응답에서 agent가 다음 action을 결정할 수 있게 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts app/routes/agent-plugin-api.test.ts app/routes/plugin-kind-api.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`, wiki fallback을 사용했다.

## [2026-05-11] campaign-asset-list-and-detail-view-verification | Sub-AC 2.3.2

- Campaign asset list/detail behavior가 이미 `listCampaignAssets()`와 `getCampaignAssetDetails()` 및 Creative Canvas metadata panel selectable list/detail view로 구현되어 있음을 재검증했다.
- asset edit/replace/remove regression fixture의 empty `logs`/`versions` inference를 `string[]`으로 명시해 repo-wide typecheck가 asset tests를 통과하도록 정리했다.
- plugin lifecycle test에서 필요한 `deactivateInstalledPluginForAgent` import가 유지되도록 보정해 기존 plugin verification drift를 제거했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.
- 참고: `npm run skills:check`는 exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`, `DESIGN.md`, wiki fallback을 사용했다.

## [2026-05-11] campaign-asset-edit-replace-remove | Sub-AC 2.3.3

- `editCampaignAsset()`, `replaceCampaignAsset()`, `removeCampaignAsset()`를 추가해 Campaign JSON source-of-truth의 associated asset metadata, backing URI/source/file metadata, association removal을 asset id 기준으로 변경할 수 있게 했다.
- 각 asset mutation은 Campaign `logs`와 `versions`에 `asset.edited`, `asset.replaced`, `asset.removed` audit entry를 남겨 이후 attribution/agent action replay가 추적할 수 있게 했다.
- Creative Canvas metadata panel에 selected asset load/save edit, replace link, replace file, remove controls를 연결해 사람이 기존 asset을 추가뿐 아니라 수정/교체/삭제할 수 있게 했다.
- plugin catalog storage test drift를 함께 정리해 secret default value가 persisted catalog JSON에 저장되지 않는 regression도 통과하도록 유지했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-installed-configuration-storage | Sub-AC 6.3.3

- `PLUGIN_CATALOG_STORAGE_KEY`, `persistPluginCatalog()`, `getPersistedPluginCatalog()`, `installSelectedPluginForAgentInStorage()`를 추가해 설치 결과 catalog를 plugin storage layer에 저장하고 다시 읽을 수 있게 했다.
- agent installation에서 생성되는 `appliedConfiguration`의 values, secretRefs, missingRequiredKeys가 persisted catalog에 남도록 regression test를 추가했다.
- storage serialization은 secret configuration field의 `defaultValue`를 제거해 manifest에 실수로 들어간 secret 기본값이 plugin storage에 복사되지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts app/routes/agent-plugin-api.test.ts app/routes/plugin-kind-api.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] agent-plugin-deactivation-api-final | Sub-AC 6.2.3

- agent active plugin deactivation 경로를 최종 검증했다.
- `deactivateInstalledPluginForAgent()`와 `POST /api/agent/plugins`의 `{ action: "deactivate" }` API가 active installed plugin을 `inactive`으로 전환하고 `deactivatedAt`을 기록한다.
- API response는 deactivation request metadata와 lifecycle state만 반환하며 configuration/secret field를 노출하지 않는다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts app/routes/agent-plugin-api.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-defaults-reload-regression | Sub-AC 6.3.4

- persisted plugin catalog를 fresh storage에서 다시 읽었을 때 agent install default configuration이 유지되는 regression test를 추가했다.
- test는 non-secret defaults(`model`, `maxParallel`)와 secret ref(`apiKey`)가 `appliedConfiguration`에 남고, plugin lifecycle이 `configured`로 reload되며, installed-plugin projection에서도 configured metadata가 보존되는지 확인한다.
- secret field의 실제 `defaultValue`는 persisted JSON에 저장되지 않는다는 기존 보안 경계도 reload fixture에서 함께 검증했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts` 통과, `npm run build` 통과.
- 참고: `npm run typecheck`는 `app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`의 기존 `saveCampaignPublishingConfiguration` missing export로 실패했다.

## [2026-05-11] campaign-publishing-configuration-capture | Sub-AC 2.4

- Campaign `channels`를 typed publishing configuration 목록으로 확장해 social, direct-message, landing, email, paid-ad, custom channel을 JSON source-of-truth에 저장할 수 있게 했다.
- publishing channel은 provider plugin id, account id/handle, placement, destination URL, landing page id, schedule, UTM fields, conversion event, status를 보존한다.
- `createCampaignPublishingChannel()`, `validateCampaignPublishingConfiguration()`, `saveCampaignPublishingConfiguration()` save flow를 추가하고 persisted campaign update validation에 publishing validation을 연결했다.
- Creative Canvas metadata panel에 Publishing configuration 섹션을 추가해 사람이 channel destination, schedule, attribution, conversion event를 캡처하고 channel list에서 제거할 수 있게 했다.
- plugin activation defaults fixture의 optional `appliedConfiguration` type annotation drift를 정리해 repo-wide typecheck가 통과하도록 했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-publishing-create-update-persistence | Sub-AC 2.4.2

- Campaign create workflow가 blank campaign에 empty publishing `channels`를 저장하고 다시 읽을 수 있음을 regression test로 고정했다.
- generic `updatePersistedCampaignRecord()` 경로가 configured publishing channel 변경을 Campaign JSON source-of-truth에 저장하는 regression test를 추가했다.
- draft publishing channel은 provider/account/landing/UTM/conversion readiness가 비어 있어도 저장 가능하게 하되, configured/scheduled/published/paused 상태에서는 기존 strict readiness validation을 유지했다.
- `creative-canvas.test.ts`의 publishing validation fixture를 configured channel 기준으로 명시하고, blank campaign tracking 기대값에 기존 `measurementGoals: []` 필드를 반영했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`, `npm run skills:check`.
- 참고: `npm run skills:check`는 exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, wiki fallback을 사용했다.

## [2026-05-11] campaign-measurement-goals-persistence | Sub-AC 2.5.1

- Campaign `tracking`에 `measurementGoals`를 추가해 target metric, target value/unit, success criteria, reporting timeframe(start/end/timezone)을 JSON source-of-truth에 저장한다.
- `createCampaignMeasurementGoal()`, `validateCampaignMeasurementGoals()`, `saveCampaignMeasurementGoals()`를 추가해 measurement goal save flow가 persisted campaign record를 갱신하고 invalid goal은 overwrite 없이 reject하도록 했다.
- Creative Canvas metadata panel에 Measurement goals 섹션을 추가해 사람이 campaign edit flow에서 target metrics, success criteria, reporting window를 정의하고 제거할 수 있게 했다.
- regression은 blank campaign default, validation error codes, save/reload, later campaign edit 이후 measurement goals 보존을 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-publishing-retrieval | Sub-AC 2.4.3

- `listCampaignPublishingChannels()`와 `getCampaignPublishingChannelDetails()`를 추가해 persisted Campaign 조회 후 publishing configuration을 list/detail API 형태로 노출한다.
- summary 조회는 channel type, platform, provider plugin, account handle, placement, destination URL, landing page id, schedule, UTM, conversion event, status를 포함한다.
- regression은 persisted campaign read 이후 publishing summary와 full channel detail이 손실 없이 반환되는지 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] plugin-configuration-separate-storage | Sub-AC 6.4.2

- plugin catalog persistence에서 `appliedConfiguration`을 catalog JSON에 직접 저장하지 않고 `PLUGIN_CONFIGURATION_STORAGE_KEY`에 plugin id별 설정으로 분리 저장하도록 변경했다.
- `getPersistedPluginCatalog()`는 catalog storage와 configuration storage를 함께 읽어 caller에게는 기존 manifest view의 `appliedConfiguration`을 재구성한다.
- regression test는 catalog storage에 `appliedConfiguration`이 남지 않고, configuration storage에는 lifecycle/runtime metadata 없이 설정 값과 secret ref만 남으며, reload 후 설정이 보존되는지 확인한다.

## [2026-05-11] campaign-tracking-configuration-persistence | Sub-AC 2.5.2

- Campaign `tracking`을 attribution parameter, pixel event, analytics destination까지 포함하는 구조화 configuration으로 확장했다.
- `createCampaignTrackingConfiguration()`, `validateCampaignTrackingConfiguration()`, `saveCampaignTrackingConfiguration()`를 추가해 UTM, attribution parameters, pixel/event identifiers, analytics destinations, conversion events, attribution model/touchpoints를 persisted Campaign record에 저장한다.
- invalid tracking configuration은 overwrite 없이 reject하며, conversion event가 있으면 attribution touchpoint를 요구하도록 해 conversion-first measurement loop의 최소 attribution context를 보존한다.
- concurrent measurement metric test drift와 맞춰 `saveCampaignMeasurementMetrics()` 경로도 보존해 tracking metrics persistence가 typecheck를 막지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts app/features/creative-canvas/model/campaign-tracking-configuration-save-flow.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-asset-generation-job-schema | Sub-AC 3.1.1

- Campaign `campaignSpec`에 `assetGenerationJobs`를 추가해 JSON source-of-truth가 image/video 생성 작업을 여러 개 선언할 수 있게 했다.
- 각 asset generation job은 media type, provider plugin id, capability id, required input 목록, output target asset field 목록, execution status를 보존한다.
- `createCampaignAssetGenerationJob()`와 `validateCampaignAssetGenerationJobs()`를 추가하고 persisted campaign update validation에 연결해 빈 input/output target 또는 중복 job id를 거부한다.
- canvas node/edge edit flow는 기존 `assetGenerationJobs`를 유지하면서 `campaignSpec`과 `canvasState`의 nodes/edges 동기화를 보존한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-canvas-edit-json-validation | Sub-AC 4.1.2

- Canvas edit JSON에 대한 `validateCampaignCanvasEdit()`를 추가해 node/edge 배열, node id/kind/position, duplicate id, dangling edge reference를 저장 전 검증한다.
- `createCampaignCanvasEdit()`가 validated edit payload를 정규화해 partial JSON node/edge 입력도 canonical `CampaignCanvasBlock`/`CampaignCanvasEdge` 구조로 되돌리고, 기존 `assetGenerationJobs`를 유지한 채 `campaignSpec`과 `canvasState`를 동기화한다.
- `applyCampaignCanvasEditAction()`을 추가해 node create/update/delete와 explicit port edge connect/disconnect 같은 human/agent canvas actions가 동일한 validation/normalization 경로를 사용하게 했다.
- asset generation job lifecycle metadata는 optional schema field로 보존하되, 입력이 없으면 `undefined`로 남겨 기존 campaign spec 구조를 변형하지 않는다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] asset-generation-required-io-validation | Sub-AC 3.1.2

- `validateCampaignAssetGenerationJobs()`가 raw JSON에서 `requiredInputs` 또는 `outputTargets` 배열 자체가 누락된 asset generation job도 crash 없이 validation error로 거부하도록 보강했다.
- required input key/source와 output target asset id/field도 string 여부를 확인해 malformed workflow JSON이 persistence boundary를 통과하지 못하게 했다.
- regression은 validator error payload와 `updatePersistedCampaignRecord()` overwrite 방지를 함께 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] landing-page-handoff-plugin-schema | Sub-AC 7.1.3

- landing plugin manifest에 optional `handoffEventSchemas` interface를 추가해 landing plugin이 지원하는 handoff event contract를 광고할 수 있게 했다.
- canonical `LANDING_PAGE_HANDOFF_EVENT_SCHEMA`와 `owncanvas.landing-page-handoff-event.v1` payload를 정의해 campaign id, source plugin/capability, destination URL, checkout URL, visitor/offer context, attribution fields를 landing handoff event로 표현한다.
- `validateLandingPageHandoffEvent()`를 추가해 schema version, actor, source ids, http(s) landing/checkout URL, attribution campaign consistency를 검증한다.
- landing plugin validation은 handoff schema가 광고하는 page type이 plugin의 supported page types에 포함되는지 확인한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] asset-generation-workflow-loading | Sub-AC 3.1.3

- `loadCampaignAssetGenerationWorkflow()`를 추가해 Campaign `campaignSpec.assetGenerationJobs`를 downstream execution용 projection으로 로드한다.
- 로드 결과는 원본 순서의 `jobs`와 별도 `imageJobs`/`videoJobs` 배열을 함께 제공해 image/video generation 선언이 하나의 bulk queue로 섞이지 않게 했다.
- projection은 job, input/output target, image input, result metadata, lifecycle 객체를 clone해 executor가 loaded workflow를 변경해도 Campaign JSON source-of-truth를 직접 오염시키지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`, `npm run skills:check`.
- 참고: `npm run skills:check`는 exit 0이지만 DDD/marketing 계열 외부 Codex skill 8개가 missing으로 보고되어, `CONTEXT.md`와 wiki fallback을 사용했다.

## [2026-05-11] campaign-spec-live-json-edit-validation | Sub-AC 4.2.1

- `parseCampaignSpecJsonEdit()`를 추가해 Campaign spec JSON editor 입력을 매 변경마다 parse하고, syntax/validation error가 있으면 기존 Campaign `canvasState`와 `campaignSpec`을 그대로 반환하게 했다.
- valid JSON spec edit은 `nodes`/`edges`를 canonical canvas edit 경로로 정규화하고 `assetGenerationJobs`를 JSON source-of-truth에서 반영해 canvas와 spec을 함께 동기화한다.
- Creative Canvas metadata panel에 canonical Campaign JSON spec editor와 validation error surface를 추가해 invalid JSON/invalid spec 상태에서는 canvas를 갱신하지 않게 했다.
- `validateCampaignAssetGenerationJobs()`는 non-array raw JSON도 validation error로 처리해 live spec editing 중 crash 없이 오류를 노출한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] instagram-comment-trigger-condition-schema | Sub-AC 7.2.1

- Instagram comment trigger configuration schema에 `conditionMatchers`를 추가해 comment text, commenter username, mentions, metadata 기반 조건 매칭을 표현하게 했다.
- `INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS`는 `equals`, `contains`, `starts_with`, `ends_with`, `regex`, `any_keyword`, `all_keywords`를 canonical operator로 광고한다.
- canonical condition fields는 `text`, `commenter.username`, `mentions`, `metadata`이고, metadata condition은 `sourceNodeId`, `creativeAssetId`, `productOfferId`, `attributionTerm`만 허용한다.
- 기존 campaign spec과 DM action fixture가 깨지지 않도록 legacy `keywordMatchers`도 계속 허용하되, 새 schema의 required field는 `conditionMatchers`로 전환했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts` 통과.
- 참고: `npm run typecheck`와 `npm run build`는 현재 creative-canvas 쪽 기존 drift로 실패한다. `creative-canvas-screen.tsx`의 block icon mapping 누락과 `creative-canvas.ts`의 `executeCampaignImageAssetGenerationJobs` 중복 선언이 원인이다.

## [2026-05-11] instagram-comment-to-dm-response-mapping | Sub-AC 7.2.1

- Instagram DM action configuration schema에 `responseMappings` 계약을 추가해 comment trigger matcher id를 DM response template/text와 tracked landing URL에 연결할 수 있게 했다.
- `INSTAGRAM_COMMENT_TO_DM_RESPONSE_MAPPING_SCHEMA_VERSION`와 action schema의 `responseMappingSchemaVersion`, `mappingFields`를 추가해 plugin이 comment-to-DM mapping contract를 광고한다.
- `validateInstagramDmActionConfiguration()`은 새 mapping 형태에서는 top-level legacy `message`/`landingUrl` 없이도 통과시키고, 각 mapping의 id, trigger matcher reference, message text, http(s) landing URL을 검증한다.
- 기존 single-message DM action fixture는 legacy fallback으로 계속 허용한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-spec-node-definition-mapping | Sub-AC 4.2.2

- Campaign spec JSON node가 `kind`뿐 아니라 `type`으로도 canvas node type을 선언할 수 있게 하고, `llm`, `agent`, `dm`, `landing`, `custom` campaign node type을 canonical canvas block definitions에 추가했다.
- valid JSON spec node definitions에서 `id`, `label`, `position`, `type`, `properties`를 normalized `canvasState`와 `campaignSpec`에 보존하도록 regression을 추가했다.
- React Flow adapter가 explicit `sourcePort`/`targetPort`를 `sourceHandle`/`targetHandle`로 round-trip해 JSON spec과 canvas edge state가 port 정보를 잃지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] instagram-comment-trigger-post-reference-schema | Sub-AC 7.2.2

- Instagram comment trigger configuration schema에 `matchedPosts`와 `postSelection`을 추가해 trigger가 대상 Instagram post를 명시적으로 모델링할 수 있게 했다.
- matched post reference는 `mediaId`, `postId`, `shortcode`, `permalink`, caption text/source node/asset reference, per-post selection criteria를 보존한다.
- post selection filter는 include/exclude mode, media id allowlist, permalink URL, caption keyword, hashtag, publishedAfter/publishedBefore window를 표현한다.
- validator는 matched post identifier, http(s) permalink, caption reference, include/exclude mode, filter string, filter URL, timestamp를 검증한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-spec-edge-definition-mapping | Sub-AC 4.2.3

- Campaign spec JSON edge definitions now preserve semantic `type` and edge-specific `properties` alongside explicit `source`, `sourcePort`, `target`, `targetPort`, and `label`.
- `normalizeCampaignCanvasEdge()` maps valid JSON spec edges into both `canvasState.edges` and `campaignSpec.edges` without dropping campaign attribution or generation metadata.
- React Flow canvas edges keep the visual renderer as `smoothstep` while storing campaign edge type/properties in edge data so UI round-trips do not overwrite source-of-truth semantics.
- Verification: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] image-generation-output-persistence | Sub-AC 3.2.2

- Added `applyCampaignImageAssetGenerationExecutionResult()` to merge completed image generation job snapshots back into `campaignSpec.assetGenerationJobs`, preserving result metadata and provider output references in the Campaign JSON source of truth.
- Added `saveCampaignImageAssetGenerationExecutionResult()` to persist the merged workflow through the existing campaign storage boundary.
- Completed image result metadata now upserts generated image assets with URI, file name, MIME type, size, rights, actor, and generated timestamp metadata.
- Verification: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] concurrent-asset-generation-orchestration | Sub-AC 3.2.1

- `executeCampaignAssetGenerationJobs()` now runs executable image and video asset generation jobs through one shared bounded-concurrency scheduler while preserving Campaign workflow order in result snapshots.
- `executeCampaignImageAssetGenerationJobs()` and `executeCampaignVideoAssetGenerationJobs()` use the same scheduler with media filters, so image-only and video-only provider flows keep their existing semantics.
- Regression coverage verifies mixed image/video concurrent execution, video-only concurrent execution, skipped non-executable jobs, lifecycle/result metadata cloning, and unchanged original job declarations.
- Verification: `node --test app/features/creative-canvas/model/creative-canvas.test.ts` and route API tests passed. `npm run typecheck` is still blocked by existing plugin DM test/type drift around `renderDmAutomationReply` and `InstagramDmResponseSelectionResult`.

## [2026-05-11] campaign-spec-json-live-canvas-sync | Sub-AC 4.2.4

- Added a React Flow adapter sync result that parses valid Campaign JSON spec edits and immediately projects the synced `canvasState` into rendered node/edge snapshots, including explicit source/target port handles.
- Wired the campaign JSON editor through the top-level canvas component so valid JSON edits update local React Flow nodes and edges before waiting for parent campaign prop refresh.
- Connected valid JSON parses to structural node/edge edit detection while preserving invalid JSON behavior that leaves the canvas unchanged.
- Restored the existing parallel image/video generation executor exports needed by the creative canvas model test suite.
- Verification: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- Note: `npm run typecheck` is still blocked by existing `app/features/plugins/model/plugin-representation.test.ts` DM automation drift (`renderDmAutomationReply`, `mappingId` narrowing, and one implicit `any`).

## [2026-05-11] campaign-spec-json-schema-invalid-rejection | Sub-AC 4.3.1

- `validateCampaignAssetGenerationJobs()`를 raw JSON 입력에 대해 더 방어적으로 만들어 non-object job, non-string id/provider/capability, primitive required input/output target을 throw 대신 validation error로 반환하게 했다.
- `parseCampaignSpecJsonEdit()` 경로에 schema-invalid asset generation jobs regression을 추가해 invalid JSON spec edit이 기존 `canvasState`와 `campaignSpec`을 변경하지 않는 것을 검증했다.
- 이전 작업에서 남아 있던 duplicate `executeCampaignImageAssetGenerationWorkflow` 선언을 정리해 creative canvas model test와 typecheck가 다시 실행 가능하게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] parallel-video-generation-workflow-persistence | Sub-AC 3.2.3

- `executeCampaignVideoAssetGenerationWorkflow()`를 추가해 video-only workflow 실행이 기존 병렬 scheduler를 사용하고 완료 결과를 Campaign JSON source-of-truth에 바로 반영하게 했다.
- `applyCampaignVideoAssetGenerationExecutionResult()`와 `saveCampaignVideoAssetGenerationExecutionResult()`를 추가해 completed video job snapshots, provider result metadata, generated video assets, audit logs, versions를 persisted Campaign에 저장한다.
- generated video assets는 `mediaType: "video"`, 원본 URI 기반 file name, MIME type, size, rights, actor, generated timestamp를 보존하며 기존 asset id가 있으면 generated output metadata로 upsert한다.
- regression은 video jobs의 병렬 실행, workflow-level persistence, video duration/frame/codec result metadata, storage reload 후 asset reference 보존을 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types --test app/routes/campaign-api.test.ts app/routes/campaign-measurement-goals-api.test.ts app/routes/agent-plugin-api.test.ts app/routes/plugin-kind-api.test.ts`, `node --experimental-strip-types --test --test-concurrency=1 $(rg --files -g '*test.ts' app | rg -v 'plugin-representation.type-test.ts' | sort)`, `npm run typecheck`, `npm run build`, `npm run skills:check`.
- 참고: `npm run skills:check`는 exit 0이지만 기존처럼 DDD/marketing 계열 외부 skill 8개가 missing으로 보고되어 `CONTEXT.md`와 wiki fallback을 사용했다. `plugin-representation.type-test.ts`는 Node 직접 실행 시 `~` alias를 resolve하지 못해 full Node test command에서 제외했고, typecheck 경로로 검증했다.

## [2026-05-11] campaign-spec-json-incomplete-input-preservation | Sub-AC 4.3.2

- React Flow sync adapter regression을 추가해 syntactically valid but incomplete Campaign spec JSON input이 들어와도 기존 rendered `nodes`/`edges` snapshot과 Campaign `canvasState`를 그대로 반환하는 것을 검증했다.
- incomplete JSON spec이 새 node만 포함하고 required `edges` contract를 생략하는 경우, canvas projection이 partial input으로 덮어써지지 않고 기존 prompt-to-image graph와 explicit port handles를 유지한다.

- 검증: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run build`.
- Note: `npm run typecheck`는 현재 creative canvas video persistence helper lookup/implicit any drift와 plugin DM automation export drift로 실패한다.

## [2026-05-11] video-asset-storage-reference-persistence | Sub-AC 3.3.3

- Completed video generation results now preserve object storage references alongside provider metadata, including provider, bucket, object key, public URI, and optional content hash.
- Generated video campaign assets copy those storage references into both the top-level asset record and `generatedMetadata`, so agents can resolve persisted storage objects without rehydrating provider responses.
- Job result serialization keeps `storageReferences` in `campaignSpec.assetGenerationJobs[].resultMetadata`, preserving the JSON source of truth through campaign storage reloads.
- 검증: `node --experimental-strip-types --test --test-name-pattern "completed video generation persists asset metadata" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run skills:check`.
- 참고: `npm run typecheck`는 기존 범위 밖의 `dndnFE` missing dependency/path alias 문제와 `app/features/plugins/model/plugin-registration-template-routing.test.ts` fixture export drift로 실패한다.

## [2026-05-11] instagram-dm-dispatch-adapter | Sub-AC 7.2.4

- `createInstagramDmDispatchAdapter()`가 validated `InstagramDmActionExecutionRequest`를 Instagram DM transport payload로 변환해 account id, recipient id, message text, tracked landing URL, campaign/capability/execution metadata를 전달하도록 검증했다.
- dispatch 성공 시 `delivered` execution response에 Instagram message id, landing URL, attribution, provider metadata를 보존한다.
- request validation 실패와 Instagram provider/transport 예외는 throw하지 않고 `failed` execution response와 구조화된 error code/message로 반환해 audit trail과 canvas execution 상태가 끊기지 않게 했다.
- 기존 DM reply generation drift도 함께 정리되어 mapped response가 tracked landing URL과 UTM attribution을 포함한 executable message로 생성된다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npm run typecheck`, `npm run skills:check`.
- 참고: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.type-test.ts`는 raw Node 실행에서 기존 `~` import alias를 해석하지 못해 `ERR_MODULE_NOT_FOUND`로 실패한다. `npm run skills:check`는 기존처럼 DDD/marketing 외부 skill 8개 missing을 보고하지만 exit 0이다.

## [2026-05-11] plugin-registration-template-routing-fixtures | Sub-AC 7.3.4

- comment-to-DM-to-landing workflow regression용 `plugin-workflow-fixtures.ts`를 추가해 direct-message, landing, tracking plugin kind registration fixture와 DM template personalization/landing route fixture를 재사용 가능하게 했다.
- 새 `plugin-registration-template-routing.test.ts`가 plugin registration fixture, personalized DM reply rendering, tracked URL routing, 그리고 React Router route table의 plugin API/campaign canvas entry를 함께 검증한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-registration-template-routing.test.ts app/features/plugins/model/plugin-representation.test.ts app/routes/plugin-kind-api.test.ts app/routes/agent-plugin-api.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] campaign-spec-json-streaming-partial-preservation | Sub-AC 4.3.3

- `parseCampaignSpecJsonEdit()`에 `commit: false` 옵션을 추가해 streaming/incremental caller가 syntactically valid intermediate JSON frame을 검증 경로에 태우더라도 Campaign `campaignSpec`/`canvasState`를 커밋하지 않게 했다.
- non-committed streaming frame은 `campaign_spec.json_incomplete` error로 반환되어 caller가 기존 Campaign snapshot을 유지하면서 final complete payload를 기다릴 수 있다.
- React Flow sync adapter도 같은 commit option을 전달해 parseable partial frame이 rendered canvas nodes/edges를 빈 graph 등 corrupted intermediate state로 덮어쓰지 않도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`.

## [2026-05-11] landing-dm-referral-context-contract | Sub-AC 7.4.1

- `LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION`, `LANDING_DM_REFERRAL_CONTEXT_SCHEMA`, `LandingDmReferralContext`, and `validateLandingDmReferralContext()`를 추가해 DM delivery에서 landing plugin으로 전달되는 referral context를 versioned contract로 정의했다.
- Landing plugin registration은 `dmReferralContextSchemas`를 광고할 수 있고, 이 경우 `landing.page` capability가 `dmReferralContext` JSON input port를 함께 선언해야 한다.
- Validator는 source DM plugin/capability/delivery event, tracked landing URL, visitor identity linkage, offer context, campaign-matched UTM attribution을 landing conversion flow 전에 검증한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`.

## [2026-05-11] campaign-spec-json-last-valid-restore | Sub-AC 4.3.3

- React Flow sync adapter now accepts an explicit `lastValidCanvasSnapshot` and returns that rendered node/edge snapshot when Campaign spec JSON synchronization fails.
- Creative Canvas JSON editing passes the current valid rendered canvas snapshot into the adapter and reapplies returned nodes/edges on invalid sync, so failed JSON synchronization restores the last valid canvas view without committing corrupted Campaign state.
- Regression verifies invalid Campaign spec JSON restores a previous prompt-to-image canvas with explicit port handles even when the current Campaign object is blank.
- 검증: `node --experimental-strip-types --test --test-name-pattern "restores the last valid rendered canvas" app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 기존 `app/features/plugins/model/plugin-representation.test.ts` export drift와 `dndnFE` dependency/path alias 문제로 실패한다. `npm run build`도 같은 `dndnFE/expo-webview` missing Expo tsconfig warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] inline-short-form-continuation-template | Sub-AC 8.1.3

- `CampaignInlineShortFormContinuationLandingPageTemplateModule`와 `createInlineShortFormContinuationLandingPageTemplateModule()`를 추가해 immersive landing template이 short-form source 뒤의 continuation을 별도 페이지 이동 없이 same-page inline surface로 표현할 수 있게 했다.
- Inline continuation module은 `continuationBehavior.consumptionSurface: "same-page"`, `navigationPolicy: "inline-only"`, `requiresSeparatePage: false`, source embedded module id, continuation segments, CTA, conversion event, inline context preservation configuration을 JSON source-of-truth로 보존한다.
- Landing template validator는 inline continuation이 같은 template 안의 source embed module을 참조하는지, same-page behavior를 유지하는지, segment와 CTA URL/conversion metadata가 유효한지 검증한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "inline continuation modules" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test --test-name-pattern "landing page template schema|immersive landing page block types" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview`의 missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다. `npm run skills:check`는 기존 8개 external DDD/marketing skill 누락을 계속 보고해 repo fallback docs를 사용했다.

## [2026-05-11] video-asset-output-location-persistence | Sub-AC 3.3.2

- Generated video assets now persist explicit `outputLocations` on the Campaign asset record, including primary video URI and optional thumbnail URI, so output locations are readable from the workflow asset model without rehydrating provider responses.
- Generated video assets also persist `generatedMetadata` with job id, result id, provider plugin/capability, provider request id, model, prompt hash, seed, dimensions, duration, frame rate, codec, generation time, latency, cost, and finish reason.
- `validateCampaignAssets()` now rejects invalid optional asset output-location URLs before a persisted Campaign update crosses the storage boundary.
- Regression coverage verifies completed video generation writes provider result metadata to `campaignSpec.assetGenerationJobs`, upserts a generated video asset with output locations and metadata, and preserves those fields after storage reload.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts` 통과, `npm run build` 통과.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 drift로 실패한다. 대표 원인은 `dndnFE` dependency/path alias 누락과 `app/features/plugins/model/plugin-representation.test.ts`의 landing mapping export drift다.

## [2026-05-11] campaign-spec-sync-validation-preservation | Sub-AC 4.3.2

- `parseCampaignSpecJsonEdit()`와 React Flow sync adapter의 기존 regression을 재검증해 invalid JSON, schema-invalid asset generation jobs, canvas validation errors가 모두 `valid: false`와 구조화된 error로 반환되는 것을 확인했다.
- invalid spec sync 결과는 기존 Campaign `canvasState`/`campaignSpec`와 rendered React Flow `nodes`/`edges` snapshot을 그대로 유지하므로 schema 또는 validation error가 canvas state에 적용되지 않는다.
- 이번 sub-AC에는 추가 production 변경이 필요하지 않았다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`.

## [2026-05-11] canvas-interaction-json-spec-sync-tests | Sub-AC 4.4.1

- Added a React Flow adapter regression that simulates a moved canvas node plus an explicit source/target port connection, then verifies the resulting Campaign `canvasState` and canonical `campaignSpec` stay synchronized.
- Added `syncCampaignFromCreativeCanvasInteraction()` as the shared adapter boundary for converting rendered React Flow node/edge snapshots back into Campaign JSON, and routed the canvas component's drag/edge-change updates through it.
- Verification: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts` passed, `npm run build` passed.
- Note: broader `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts` is currently blocked by unrelated media generation drift, and `npm run typecheck` is blocked by existing root drift in `dndnFE`, plugin helper symbols, and media generation typing.

## [2026-05-11] landing-dm-referral-context-parsing | Sub-AC 7.4.2

- `parseLandingDmReferralContext()`를 추가해 landing-flow plugin이 DM referral landing URL/query aliases와 optional payload fields를 canonical `LandingDmReferralContext`로 정규화할 수 있게 했다.
- Parser는 `utm_*`, `oc_dm_*`, visitor identity, touchpoint, product/offer query fields를 읽고 channel/source/medium casing, campaign id, username, source DM ids를 landing attribution contract에 맞게 normalizes 한 뒤 기존 validator를 통과시킨다.
- 누락되거나 unsafe한 referral context는 normalized draft와 `validateLandingDmReferralContext()` error list를 함께 반환해 landing plugin이 publish 전에 실패 사유를 audit할 수 있다.
- 기존 landing-flow destination mapping export drift도 정리해 delivered DM response에서 landing destination metadata를 검증/매핑하는 plugin model tests가 다시 실행된다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/plugins/model/plugin-representation.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 누락과 creative-canvas type drift로 실패한다.

## [2026-05-11] concurrent-video-generation-status-progress | Sub-AC 3.3.3

- `CampaignAssetGenerationExecutorContext.reportProgress()`를 추가해 concurrent video generation executor가 running 중간 진행률을 workflow 실행 결과에 반영할 수 있게 했다.
- `CampaignAssetGenerationExecutionResult.progressUpdates`는 running/progress/completed/failed snapshots를 발생 순서대로 보존하고, 최종 `jobStatuses`는 workflow order 기준 completed/failed 상태와 마지막 progress/error를 유지한다.
- Regression은 병렬 video job 2개가 동시에 실행되는 동안 한 job은 35→82→completed, 다른 job은 35→60→failed로 기록되는지 검증한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "concurrent video generation reports running progress completion and failures" app/features/creative-canvas/model/creative-canvas.test.ts`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 누락으로 실패한다.

## [2026-05-11] landing-above-fold-responsive-regions | Sub-AC 8.2.1

- Campaign landing CSS에 `copy`/`media` grid region을 명시하고 desktop에서는 copy+media two-column, mobile에서는 media-first single-column 구조로 전환했다.
- Short-form embed는 `100svh` 기반 block-size cap과 module aspect-ratio 기반 width cap을 사용해 mobile/desktop 첫 viewport 안에 source short-form content가 먼저 보이도록 했다.
- Source-level regression test를 추가해 landing region mapping, mobile media-first ordering, viewport-bound embed sizing contract를 고정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/landing-page-responsive-layout.test.ts`, `node --experimental-strip-types --test --test-name-pattern "landing page render model|landing page renderer preserves" app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 8개 external DDD/marketing skills 누락을 보고해 repo fallback 문서를 사용했다. `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] repeated-canvas-json-sync-idempotence | Sub-AC 4.4.3

- Canvas action으로 만든 explicit port edge 이후 JSON spec edit을 적용하고, canonical JSON을 다시 replay해도 `canvasState`와 `campaignSpec`가 같은 graph로 유지되는 regression을 추가했다.
- `parseCampaignSpecJsonEdit()`는 normalized canvas/spec가 이미 현재 Campaign과 같으면 기존 Campaign object를 그대로 반환해 parent update loop나 stale replay를 만들지 않는다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "repeated canvas and JSON edits converge" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test --test-name-pattern "canvas|campaign spec JSON|repeated canvas" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run build`.
- 참고: 전체 `creative-canvas.test.ts`는 기존 `createAssetGenerationExecutionRecords` runtime drift로 media generation 관련 11개 테스트가 실패한다. `npm run typecheck`도 기존 `dndnFE` dependency/path alias 누락과 media generation type drift로 실패한다.

## [2026-05-11] landing-conversion-event-api | Sub-AC 7.4.3

- `LANDING_CONVERSION_EVENT_SCHEMA_VERSION`, `LANDING_CONVERSION_EVENT_SCHEMA`, `LandingConversionEvent`, `createLandingConversionEventFromFlow()`, and `validateLandingConversionEvent()`를 추가해 landing-flow plugin이 final conversion event를 versioned API로 노출할 수 있게 했다.
- Conversion event validation은 landing plugin/capability/page/url, conversion event name/value/currency, campaign-matched UTM attribution, conversion KPI, attribution window, optional tracking destination metadata를 요구한다.
- Landing plugin registration은 `conversionEventSchemas`를 광고할 수 있고, 이 경우 `landing.page` capability가 `conversionEvent` event output port를 함께 선언해야 한다.
- 기본 agent plugin catalog의 Immersive Landing plugin도 conversion event schema와 `conversionEvent` output port를 노출한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts app/routes/agent-plugin-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE/expo-webview` Expo tsconfig resolution 문제, `dndnFE` dependency/path alias 누락, `app/features/creative-canvas/model/creative-canvas.ts`의 `executionRecords` type drift로 실패한다.

## [2026-05-11] parallel-asset-generation-execution-records | Sub-AC 3.4.1

- `CampaignAssetGenerationExecutionRecord`와 `campaignSpec.assetGenerationExecutions`를 추가해 parallel image/video job execution 결과를 job definition/lifecycle과 독립된 실행 기록으로 보존한다.
- Parallel runner는 실행된 각 asset job마다 deterministic execution record id, campaign/job/provider/capability ids, final status, actor, attempt, progress, timestamps, error, result ids, asset ids, provider request ids를 생성한다.
- `apply/saveCampaignAssetGenerationExecutionResult()` 및 image/video 전용 save path가 execution records를 campaign spec에 append/replace merge해 storage reload 후에도 각 parallel job의 실행 기록이 유지된다.
- Regression은 image success와 video failure가 동시에 실행된 뒤 두 execution record가 `executionResult`와 persisted Campaign JSON에 독립적으로 남는지 검증한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "parallel asset generation persists an independent execution record" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE/expo-webview` Expo tsconfig resolution 문제와 `dndnFE` dependency/path alias 누락으로 실패한다.

## [2026-05-11] plugin-referral-conversion-fixtures | Sub-AC 7.4.4

- `COMMENT_TO_DM_REFERRAL_CONVERSION_FIXTURE`를 추가해 comment-to-DM commerce workflow의 plugin registration kinds, DM referral context handoff parse input, landing mapping, and conversion event emission input을 한 fixture로 묶었다.
- Regression은 fixture에서 direct-message/landing/tracking plugin registration을 재구성하고, referral landing URL을 canonical `LandingDmReferralContext`로 parse/validate한 뒤, landing mapping에서 final purchase conversion event를 생성/validate한다.
- 기존 Instagram comment-to-DM fixture tests도 함께 실행해 plugin metadata, referral URL, DM dispatch, and landing destination mapping coverage가 깨지지 않는지 확인했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-registration-template-routing.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `app/features/creative-canvas/model/creative-canvas.test.ts` `canvas.node.reorder` type drift와 `dndnFE` dependency/path alias 누락으로 실패한다.

## [2026-05-11] asset-generation-failure-details | Sub-AC 3.4.2

- Parallel asset generation now captures structured `failureDetails` for failed jobs, including error name/message/stack, job id, media type, provider plugin, capability, attempt, and failure timestamp.
- Failure details are exposed on job status snapshots, execution status events, persisted execution records, and the failed job lifecycle while sibling jobs continue to complete and report statuses independently.
- Regression verifies a failed video job records structured failure details without blocking a parallel image job from completing.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `app/features/plugins/model/instagram-comment-dm-flow.test.ts` fixture export drift와 `dndnFE` dependency/path alias 누락으로 실패한다.

## [2026-05-11] comment-dm-landing-workflow-configuration-fixture | Sub-AC 7.5.1

- `commentToDmLandingWorkflowConfigurationFixture`를 추가해 Instagram comment trigger -> DM response -> immersive landing page -> purchase conversion tracking orchestration을 full Campaign workflow fixture로 제공한다.
- Fixture는 canvas nodes/edges와 canonical `campaignSpec`을 동일한 explicit port graph로 유지하고, target audience, product offer, plugin activation/configuration, publishing channel, UTM, attribution touchpoints, conversion KPI를 포함한다.
- Regression은 fixture canvas validation, explicit port edges, human/agent plugin install-activate metadata, conversion tracking, and campaign spec JSON round-trip sync를 검증한다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-registration-template-routing.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-workflow-fixtures.ts app/features/plugins/model/plugin-registration-template-routing.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `app/features/creative-canvas/model/creative-canvas.test.ts` `statusEvents` drift와 `dndnFE` dependency/path alias 누락으로 계속 실패한다.

## [2026-05-11] workflow-plugin-definition-fixtures | Sub-AC 7.5.2

- `commentToDmLandingWorkflowPluginCatalogFixture`를 추가해 comment-to-DM workflow configuration이 참조하는 direct-message, landing, tracking plugin manifests를 함께 제공한다.
- Landing example plugin은 DM referral context schema와 conversion event schema를 선언하고, tracking example plugin은 final purchase conversion capability를 제공해 workflow plugin configuration의 `pluginId`/`capabilityIds`가 agent runtime에서 해석된다.
- Regression은 workflow configured plugins와 catalog manifests의 id/type/capability match를 검증하고 `loadActivatedPluginsIntoAgentWorkflowRuntime()`이 errors 없이 active plugins를 로드하는지 확인한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "plugin definitions required" app/features/plugins/model/instagram-comment-dm-flow.test.ts`, `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-registration-template-routing.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 및 missing package 문제로 실패한다. `npm run build`는 같은 Expo tsconfig warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] campaign-api-asset-generation-progress-contract | Sub-AC 3.4.2

- `GET /api/campaigns/:campaignId` 응답에 persisted workflow asset generation 상태를 노출하는 `assetGeneration` contract를 추가했다.
- Contract는 summary(total/pending/running/completed/failed/percent/state), per-job progress/completion/error state, compact execution status events를 포함해 agents와 UI가 같은 API 응답으로 생성 진행률과 완료 상태를 읽을 수 있다.
- Raw runtime stack trace는 API 응답에서 제외해 provider failure는 error/progress/status 중심으로 노출한다.
- 검증: `node --experimental-strip-types --test app/routes/campaign-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign.ts app/routes/campaign-api.test.ts`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview`의 missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] asset-generation-completion-outputs | Sub-AC 3.4.3

- `CampaignAssetGenerationExecutionRecord.outputs`를 추가해 completed image/video job의 provider result metadata를 각 job execution record에 독립적으로 저장한다.
- Execution record 생성, clone, serialization path가 result id/asset id 요약뿐 아니라 URI, MIME, dimensions, video duration/thumbnail, provider request id, storage reference 등 completion output payload를 보존한다.
- Regression은 parallel image/video generation 완료 후 각 job record와 persisted `campaignSpec.assetGenerationExecutions`에 서로 섞이지 않은 completion outputs가 남는지 검증한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "parallel asset generation stores completion outputs" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 누락과 `dndnFE/expo-webview` missing Expo tsconfig 문제로 실패한다.

## [2026-05-11] landing-template-embedded-short-form-schema | Sub-AC 8.1.1

- `owncanvas.landing-page-template.v1` schema contract를 추가해 immersive landing template이 embedded short-form content module을 JSON source-of-truth로 표현한다.
- Embedded short-form module은 source asset/input/output ports, attribution role, configurable playback options, provider plugin kind/id, source platform/type/content id/source URL/embed mode metadata를 포함한다.
- Existing immersive landing block definitions now expose content schema and configuration option metadata for both source short-form embeds and landing-native continuations.
- 검증: `node --experimental-strip-types --test --test-name-pattern "landing page template schema" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-inbound-session-url.test.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts app/features/creative-canvas/model/campaign-inbound-session-url.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 누락과 `dndnFE/expo-webview` missing Expo tsconfig 문제로 실패한다. `npm run build`는 같은 warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] embedded-content-playback-interactions | Sub-AC 8.1.3

- Embedded short-form landing render modules now expose `playbackControls` metadata for native controls, keyboard accessibility, captions, fullscreen, and picture-in-picture expectations.
- Render modules also expose a `pageInteractionPolicy` that keeps native video controls interactive while requiring iframe embeds to activate on hover/focus so page-level scroll remains available.
- `CampaignLandingPageRenderer` maps the policy into video controls, accessible labels, iframe focusability, and data attributes; landing CSS preserves page scroll by disabling iframe pointer capture until hover/focus and adds focus-visible outlines for embedded media.
- 검증: `node --experimental-strip-types --test --test-name-pattern "playback controls" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test --test-name-pattern "landing page" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 누락 및 `dndnFE/expo-webview` missing Expo tsconfig 문제로 실패한다.

## [2026-05-11] published-link-utm-persistence | Sub-AC 9.1.4

- `saveCampaignPublishedLink()`를 추가해 campaign/channel/context에서 UTM-enriched published link를 생성하고 channel `publishedLinks`에 persist하며 channel status를 `published`로 전환한다.
- `listCampaignPublishedLinks()`를 추가해 persisted Campaign record에서 all-channel 또는 channel-filtered published links를 clone된 read model로 retrieve할 수 있게 했다.
- `GET /api/campaigns/:campaignId` 응답에 `publishing.channels[].publishedLinks`를 포함해 UI/agent clients가 persisted UTM, Owncanvas attribution params, affiliate attribution params, and final published URL을 읽을 수 있다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts`, `node --experimental-strip-types --test app/routes/campaign-api.test.ts`, `npx tsc --noEmit --skipLibCheck --allowImportingTsExtensions --module nodenext --moduleResolution nodenext --target es2022 --jsx react-jsx --types node app/features/creative-canvas/model/campaign-publishing-configuration-save-flow.test.ts app/routes/campaign-api.test.ts app/routes/api.campaign.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `app/routes/campaign-tracking-events-api.test.ts` missing route/eventLog drift와 `dndnFE` dependency/path alias 및 Expo tsconfig 문제로 실패한다.

## [2026-05-11] campaign-tracking-event-ingestion-api | Sub-AC 9.2.2

- `POST /api/campaigns/:campaignId/tracking/exposures`와 `POST /api/campaigns/:campaignId/tracking/clicks` endpoint를 추가해 server-side exposure/click tracking event ingestion을 지원한다.
- Endpoint는 method, JSON body, persisted campaign existence, route campaign id match, endpoint-specific event type, existing tracking event schema validation을 수행하고, target metadata와 click destination에서 attribution summary를 반환한다.
- `CampaignTracking.eventLog`와 `saveCampaignTrackingEvent()`를 추가해 ingested exposure/click events를 Campaign tracking state에 append하고 `tracking.events`에도 event type을 unique하게 반영한다.
- 검증: `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts app/routes/campaign-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing external skills 8개 누락을 보고해 repo fallback 문서(`CONTEXT.md`, wiki)를 사용했다. `npm run build`는 기존 `dndnFE/expo-webview`의 missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-render-exposure-capture | Sub-AC 9.2.2

- Landing render modules now expose explicit `data-exposure-surface`/`data-exposure-placement` impression markers and emit exposure events through the campaign surface tracking client on render.
- Added `createCampaignLandingPageExposureEvent()` to construct validated landing module exposure events with session, UTM, channel, explicit `outputs.exposure` port, asset, product, offer, URL, and touchpoint attribution.
- Campaign tracking persistence now writes queryable analytics event records/indexes so captured exposure/click events can be retrieved by campaign/session for attribution reporting.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 누락과 `dndnFE/expo-webview` missing Expo tsconfig 문제로 실패한다. `npm run build`는 같은 Expo tsconfig warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-behavior-mode-schema | Sub-AC 8.3.1

- `owncanvas.landing-page-template.v1`에 `behavior` 설정을 추가해 landing destination이 `immersion-preserving` 또는 `traditional` behavior를 JSON source-of-truth에서 선택할 수 있게 했다.
- Behavior schema는 `preserveInlineContext`와 `allowTraditionalRedirect`를 함께 검증해 immersion-preserving mode는 same-page context를 유지하고, traditional mode는 redirect-first landing behavior를 명시한다.
- Render model은 normalized behavior를 항상 노출하며, 기존 template에는 `immersion-preserving` 기본값을 적용한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "landing page template schema selects" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview`의 missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-click-capture | Sub-AC 9.2.3

- `captureCampaignSurfaceTrackedClick()`를 추가해 `data-campaign-track-click`가 붙은 landing 링크/CTA 클릭을 element metadata에서 campaign tracking click event로 변환한다.
- Capture path는 session, UTM, channel, product, offer, explicit `outputs.click` port, CTA label, destination, content id/type attribution을 보존하고 local campaign tracking event log에 persist한다.
- Landing renderer의 conversion element, commerce panel CTA, continuation CTA가 shared click capture path를 사용하도록 metadata attributes를 추가했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --experimental-strip-types --test --test-name-pattern "click" app/routes/campaign-tracking-events-api.test.ts`, `npm run build`.
- 참고: 전체 `app/routes/campaign-tracking-events-api.test.ts`는 현재 작업 범위 밖의 conversion endpoint expectation에서 실패한다. `npm run typecheck`는 기존 conversion tracking symbol drift와 `dndnFE` dependency/path alias 및 Expo tsconfig 문제로 실패한다. `npm run build`는 same Expo tsconfig warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] tracking-event-contextual-metadata-validation | Sub-AC 9.2.4

- `validateCampaignTrackingEventCampaignMetadata()`를 추가해 captured tracking event가 persisted campaign의 channel, asset, product, offer attribution id, and configured UTM metadata와 맞는지 저장 전에 검증한다.
- Tracking ingestion API는 shape validation과 route campaign id validation 이후 contextual campaign metadata validation을 수행하며, 실패 시 campaign `tracking.eventLog`와 analytics event store를 mutation하지 않는다.
- Blank/default campaign ingestion은 기존처럼 허용하되, configured campaign metadata가 존재할 때만 mismatch를 거부해 기존 exposure/click/conversion ingestion path와 호환되게 했다.
- 검증: `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`.

## [2026-05-11] landing-playback-safe-chrome | Sub-AC 8.2.2

- Landing renderer에 `createCampaignLandingChromeRenderPolicy()`를 추가해 template navigation/conversion 설정을 active short-form consumption을 방해하지 않는 render policy로 변환한다.
- Immersion-preserving landing에서는 overlay navigation을 inline/manual/non-blocking으로, sticky/pause-on-activate conversion elements를 side-panel/after-playback-complete/non-blocking으로 demote하고 conversion activation은 `_blank`/`noopener noreferrer`로 현재 playback context를 유지한다.
- Landing CSS는 playback-safe navigation/conversion chrome을 static in-flow media/copy regions에 배치해 short-form embed 위를 덮지 않도록 한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/landing-page-responsive-layout.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 누락과 `dndnFE/expo-webview` missing Expo tsconfig 문제로 실패한다. `npm run build`는 같은 Expo tsconfig warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] deterministic-conversion-attribution | Sub-AC 9.3.3

- Conversion ingestion now selects one deterministic `attributionMatch` from prior campaign interactions instead of only returning the candidate history.
- Rule order prioritizes latest click over exposure, same-session over same-user, and offer/product matches before broader identity matches, with a persisted compact match on each conversion record.
- Analytics storage now indexes optional click ids through `byClickId`, so click-derived attribution identifiers can be queried directly by campaign agents and reporting surfaces.
- 검증: `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/creative-canvas.ts`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing external skills 8개 누락을 보고해 repo fallback 문서(`CONTEXT.md`, `.agents/product-marketing-context.md`, wiki)를 사용했다.

## [2026-05-11] conversion-event-record-persistence | Sub-AC 9.3.1

- Conversion tracking ingestion now persists dedicated `CampaignConversionEventRecord` entries in `tracking.conversionRecords` in addition to the generic `eventLog`.
- Each conversion record preserves required attribution and commerce metadata: event/session/campaign ids, timestamps, actor/user/permission context, conversion name/value/currency/order/quantity, content, UTM, target metadata, and normalized analytics attribution.
- Conversion records are upserted by source event id so retried ingestion replaces the same conversion record instead of duplicating it.
- 검증: `node --experimental-strip-types --test --test-name-pattern "captures and persists conversion metadata" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing external skills 8개 누락을 보고해 repo fallback 문서를 사용했다. `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] agent-landing-behavior-action | Sub-AC 8.3.3

- Agent campaign edit surface에 `campaign.landing.behavior.set` action을 추가해 agent-generated/agent-edited workflow가 human authoring control과 동일한 `immersion-preserving`/`traditional` landing behavior option을 설정할 수 있게 했다.
- Action implementation은 기존 `setCampaignLandingPageBehaviorMode()`를 재사용해 campaign-level JSON spec과 existing landing template `behavior`를 같은 방식으로 동기화한다.
- Agent plugin manifest action vocabulary에 `campaign.landing.behavior.set`을 추가해 agent plugins가 해당 landing behavior capability를 명시적으로 광고할 수 있게 했다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "agent canvas edit actions can set" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test --test-name-pattern "agent canvas edit actions can set|definePluginManifest preserves agent detail" app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts app/features/plugins/model/plugin-representation.ts app/features/plugins/model/plugin-representation.test.ts`, `npm run build`.
- 참고: `npm run skills:check`는 기존처럼 DDD/marketing external skills 8개 누락을 보고해 repo fallback 문서(`CONTEXT.md`, `.agents/product-marketing-context.md`, wiki)를 사용했다. `npm run build`는 기존 `dndnFE/expo-webview`의 missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-behavior-render-application | Sub-AC 8.3.4

- Landing page rendering now applies the selected campaign behavior mode when generating a default landing template and when rendering an existing template that omits its own behavior configuration.
- Commerce panel conversion links now use the same behavior-derived render policy as landing chrome: immersion-preserving mode opens in an isolated new context, while traditional mode keeps the direct redirect behavior available.
- Regression coverage in the landing renderer contract verifies generated template behavior resolution, existing-template fallback, and explicit commerce-panel render policy wiring.
- 검증: `node --test app/features/creative-canvas/components/landing-page-responsive-layout.test.ts`, `node --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npx tsc` targeted 직접 실행은 `~` path alias를 해석하지 못해 실패했다. `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-authoring-controls | Sub-AC 8.2.3

- Campaign JSON spec에 `landingPageNavigation`과 `landingPageConversionElements` authoring state를 추가해 landing template 없이도 non-interruptive navigation/conversion behavior를 저장할 수 있게 했다.
- `setCampaignLandingPageAuthoringControls()`와 getter helpers를 추가해 campaign-level controls와 existing landing template navigation/conversion configuration을 동기화한다.
- Campaign editor의 Landing behavior section에 navigation visibility/placement/timing/interruption 및 conversion label/URL/placement/timing/interruption controls를 추가했고, default landing renderer가 campaign-level controls를 사용하도록 연결했다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "campaign landing page authoring controls|landing page render model defines navigation" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/components/landing-page-responsive-layout.test.ts`, `npm run build`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 `dndnFE` dependency/path alias 누락과 `dndnFE/expo-webview` missing Expo tsconfig 문제로 실패한다. `npm run build`는 같은 warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] click-session-attribution-identifiers | Sub-AC 9.3.2

- Campaign click tracking events now carry a stable `click.id` generated by the landing surface tracking client and returned in API attribution summaries as `clickId`.
- Campaign analytics persistence stores normalized `clickId` attribution and maintains a `byClickId` index alongside campaign, session, and campaign-session indexes.
- `getPersistedCampaignAnalyticsEvents()` can query by `clickId` alone or scoped with `campaignId`, allowing conversion attribution jobs to retrieve the exact click/session path needed for funnel attribution.
- Existing engagement tracking client helpers were completed to keep the shared surface tracking client tests and typecheck aligned with the current tracking event model.
- 검증: `node --experimental-strip-types --test --test-name-pattern "campaign, session, and click attribution|surface tracking emits" app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-conversions.ts app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/client/campaign-surface-tracking.ts app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/features/creative-canvas/model/creative-canvas.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] exposure-click-metric-reporting-queries | Sub-AC 9.5.2

- Added concrete GET metric reporting coverage for exposure and click tracking endpoints, including filtered summaries and grouped rows for placement/destination attribution.
- `GET /api/campaigns/:campaignId/tracking/exposures` and `GET /api/campaigns/:campaignId/tracking/clicks` now return `owncanvas.campaign-metric-report.v1` payloads with count and unique-session rollups that agents or dashboards can query directly.
- 검증: `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/routes/campaign-metric-query-contracts-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-clicks.ts app/routes/api.campaign-tracking-exposures.ts app/routes/api.campaign-tracking-metric-report.ts app/routes/campaign-tracking-events-api.test.ts app/routes/campaign-metric-query-contracts-api.test.ts app/features/creative-canvas/model/creative-canvas.ts`, `npm run build`.
- 참고: `npm run build` still emits the known nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] landing-preview-accessibility-validation | Sub-AC 8.2.4

- `validateCampaignLandingPagePreviewAccessibility()`를 추가해 landing preview의 active short-form module, visible navigation, visible conversion elements가 접근 가능하고 playback-disruptive하지 않은지 검증한다.
- Immersion-preserving landing에서는 overlay navigation을 preview `inline`/manual로, sticky conversion action을 `side-panel`/new-context activation으로 평가해 short-form consumption context를 유지한다.
- 검증: `node --experimental-strip-types --test --test-name-pattern "landing page preview validation" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-short-form-media-player-tracking | Sub-AC 8.3.1

- Landing native short-form video players now emit playback engagement events for watch-depth milestones, completion, and replay through the campaign surface tracking client.
- Watch depth emits stable `watch_depth` actions at 25/50/75 percent; completion emits `complete` at ended or near-complete playback; replay emits `replay` when looping or seeking from near-end back to the start.
- Playback engagement events preserve landing node, output port, asset, product, offer, URL, session, UTM, and channel attribution and post to `/tracking/engagement` while retaining local campaign tracking persistence.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/landing-page-responsive-layout.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `npm run build`.
- 참고: targeted `npx tsc` direct-file 실행은 `~` path alias를 해석하지 못해 실패했다. `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] returning-attribution-identification | Sub-AC 9.4.1

- `identifyReturningCampaignAttribution()`를 추가해 existing tracked session records와 persisted analytics event identifiers만으로 returning attribution subject를 판별한다.
- Returning match는 `sessionId`, `userId`, `clickId`, URL attribution parameter(`click_id` 등)를 지원하며 각 match에 first/last seen timestamp를 반환한다.
- Regression은 inbound `oc_session_id`/`click_id` 기반 returning session 및 tracking event `context.userId`/click id 기반 returning user detection을 검증한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-inbound-session-url.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-inbound-session-url.test.ts`.

## [2026-05-11] session-fallback-conversion-attribution | Sub-AC 9.3.3

- Conversion attribution now falls back to a tracked inbound campaign session when no prior click or exposure qualifies in the attribution window.
- Session fallback preserves click/exposure priority, matches only the same campaign and session id, and records a deterministic `last-session-same-session` attribution match on the conversion record.
- Reporting rows can identify session-attributed conversions through `attributedInteractionType: "session"` while retaining the session id as the attributed interaction identifier.
- 검증: `node --experimental-strip-types --test --test-name-pattern "attributes a conversion to its prior campaign session" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/creative-canvas.ts`.

## [2026-05-11] attributed-conversion-export | Sub-AC 9.3.4

- Conversion analytics now include a normalized `owncanvas.attributed-conversion-export.v1` payload beside the existing reporting rows.
- The export payload carries enabled analytics destinations, campaign measurement goals, conversion commerce metadata, and the attributed click/exposure/session fields needed by dashboard/reporting plugins or downstream measurement jobs.
- Regression coverage verifies that disabled analytics destinations are excluded and attributed click identifiers, UTM, target, port, product, and offer metadata remain available in export events.
- 검증: `node --experimental-strip-types --test --test-name-pattern "downstream attributed conversion export" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-conversions.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/creative-canvas.ts`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] returning-attribution-identification-verification | Sub-AC 9.4.1

- Returning attribution identification remains backed by tracked campaign sessions plus persisted analytics event history for `sessionId`, `userId`, `clickId`, and URL attribution parameter matches.
- Campaign surface tracking client type inference was tightened so revisit emission methods stay covered by the declared tracking client contract.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-inbound-session-url.test.ts app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/routes/campaign-tracking-events-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck` no longer reports errors in the OwnCanvas returning-session files, but still fails in the unrelated nested `dndnFE` tree due missing aliases/packages and Expo dependencies.

## [2026-05-11] revisit-event-generation | Sub-AC 9.4.2

- Campaign surface tracking now emits a first-class `revisit` tracking event when a returning session or known returning user is detected before the current visit updates the tracked session record.
- Revisit events preserve campaign/session/user, UTM, landing node, channel, product, offer, URL, and matched returning attribution details, then post to `/tracking/revisits`.
- Tracking ingestion validates and persists revisit events through the shared event API, and analytics storage continues to support campaign/session plus page/asset-scoped attribution queries.
- 검증: `node --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/routes/campaign-tracking-events-api.test.ts`.
- 참고: `npm run typecheck`는 현재 작업 범위 밖의 기존 nested `dndnFE` dependency/path alias 누락(`expo/tsconfig.base`, `radix-ui`, `@ssgoi/react`, Supabase, `~/...` aliases 등)으로 실패한다.

## [2026-05-11] revisit-event-record-persistence | Sub-AC 9.4.3

- Revisit ingestion now persists normalized `owncanvas.campaign-revisit-record.v1` records on `campaign.tracking.revisitRecords` in addition to the raw tracking event log.
- Each revisit record preserves campaign id, session id, human/agent context including `userId`, event occurrence time, persistence time, UTM/content/target details, returning match timestamps, and normalized attribution metadata.
- Analytics attribution for revisit events now carries `revisitFirstSeenAt`, `revisitLastSeenAt`, and `revisitMatchedBy`, so campaign/session queries retain the returning attribution metadata needed for downstream analysis.
- Revisit batch ingestion now validates revisit payloads instead of falling through to engagement validation.
- 검증: `node --experimental-strip-types --test --test-name-pattern "revisits ingests returning session attribution events" app/routes/campaign-tracking-events-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/model/creative-canvas.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/features/creative-canvas/model/campaign-inbound-session-url.test.ts`, `npm run build`.
- 참고: `npm run build`는 기존 `dndnFE/expo-webview` missing `expo/tsconfig.base` warning을 출력하지만 exit 0으로 완료된다.

## [2026-05-11] landing-immersion-analytics | Sub-AC 8.3.4

- Added campaign landing immersion analytics aggregation over persisted engagement events, grouped by landing page and asset.
- The aggregate exposes watch depth samples/average/max, completion rate, replay rate/count, total interaction count, per-action interaction counts, and playback/scroll interaction counts.
- Added `GET /api/campaigns/:campaignId/tracking/immersion` for reporting surfaces, dashboards, and agents to retrieve the aggregated payload.
- Regression coverage ingests watch-depth, completion, replay, control, and scroll engagement events, then verifies the landing page aggregate response.
- 검증: `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/features/creative-canvas/model/creative-canvas.ts app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck` no longer reports errors in the changed OwnCanvas files, but still fails in the unrelated nested `dndnFE` tree due missing aliases/packages and Expo dependencies.

## [2026-05-11] publishing-preview-short-form-immersion-rules | Sub-AC 8.4.1

- Added a first-class publishing preview validation rule catalog for short-form landing immersion: source context, inline behavior, non-blocking page chrome, same-page continuation, and accessible conversion path.
- Added `validateCampaignLandingPagePublishingPreview()` to compose existing preview accessibility checks with stricter publish-time immersion rules that reject traditional redirects and blocking navigation/conversion controls.
- Regression coverage verifies the rule ids, a valid immersive preview, and a failing preview that breaks inline context or blocks active short-form playback.
- 검증: `node --experimental-strip-types --test --test-name-pattern "publishing preview validation|landing page preview validation|landing page render model defines navigation" app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] publishing-preview-mobile-immersion-validation | Sub-AC 8.4.2

- Added a `mobile-immersive-layout` publishing preview rule so mobile landing previews must preserve short-form immersion with a touch-first single-column layout, inline context, and reachable sticky conversion actions.
- `validateCampaignLandingPagePublishingPreview()` now inspects each rendered short-form module's mobile responsive layout and interaction requirements, returning `landing-preview.mobile_layout_not_immersive` for previews that drop the mobile contract.
- Tightened campaign metric grouping for `currency` to read normalized `conversionCurrency`, clearing the focused model TypeScript check after nearby analytics drift.
- 검증: `node --experimental-strip-types --test --test-name-pattern "publishing preview validation validates mobile short-form immersion layout|publishing preview validation defines short-form landing immersion rules" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC on duplicate `loader` declarations in `app/routes/api.campaign-tracking-clicks.ts` and the existing nested `dndnFE` missing aliases/packages and Expo dependencies. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] publishing-preview-desktop-immersion-validation | Sub-AC 8.4.3

- Added a `desktop-immersive-layout` publishing preview rule so desktop landing previews must keep short-form playback in the primary media region with adjacent continuation and side-panel conversion actions.
- `validateCampaignLandingPagePublishingPreview()` now inspects each rendered short-form module's desktop responsive layout and interaction requirements, returning `landing-preview.desktop_layout_not_immersive` when previews collapse into non-immersive desktop layouts.
- Regression coverage verifies a valid desktop immersive publishing preview and a failing desktop preview that drops adjacent continuation, side-panel conversion, pointer playback, and inline context requirements.
- 검증: `node --experimental-strip-types --test --test-name-pattern "publishing preview validation" app/features/creative-canvas/model/creative-canvas.test.ts`, `node --test app/features/creative-canvas/components/landing-page-responsive-layout.test.ts`, `node --experimental-strip-types --test --test-name-pattern "landing page render model|landing page preview validation|publishing preview validation" app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC in the nested `dndnFE` tree due missing aliases/packages and Expo dependencies. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] publishing-preview-immersion-failure-guidance | Sub-AC 8.4.4

- Publishing preview validation errors now include actionable `guidance` with a layout scope, summary, and concrete repair actions for immersion failures.
- Desktop and mobile layout failures return layout-specific recommendations for restoring immersive-desktop side-panel/adjacent-rail behavior or touch-first single-column sticky conversion behavior.
- Non-layout immersion failures also receive guidance for source context, inline behavior, non-blocking page chrome, same-page continuation, and conversion path repair.
- Regression coverage verifies that desktop and mobile immersion failures report their layout-specific guidance in the publishing preview report.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC on missing `loader` export in `app/routes/api.campaign-tracking-revisits.ts` plus the existing nested `dndnFE` dependency/path alias and Expo dependency issues. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] conversion-metric-reporting-output | Sub-AC 9.5.3

- `GET /api/campaigns/:campaignId/tracking/conversions?metric=conversion` now returns a metric report payload for conversion dashboards instead of only the attributed conversion analytics payload.
- Conversion reports support the shared metric filters and grouping dimensions, including `conversionEventName`, `orderId`, `currency`, campaign/channel/product/offer/page/asset, and date ranges.
- Conversion report summaries and grouped rows now include `totalValue` alongside `count` and `uniqueSessions`, so reporting surfaces can query purchase conversion volume and value in one response.
- The default `GET /tracking/conversions` response remains the attributed conversion analytics/export payload for existing reporting consumers.
- 검증: `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts app/routes/campaign-metric-query-contracts-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/routes/api.campaign-tracking-conversions.ts app/routes/api.campaign-tracking-metric-report.ts app/routes/campaign-tracking-events-api.test.ts app/routes/campaign-metric-query-contracts-api.test.ts app/features/creative-canvas/model/creative-canvas.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC in the nested `dndnFE` tree due missing aliases/packages and Expo dependencies. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] campaign-evaluation-primary-success-metric | Sub-AC 10.1

- Added `CampaignEvaluationModel` to campaign tracking with `purchase_conversion_rate` on the `purchase` event as the primary success metric.
- Blank campaigns and tracking configuration defaults now carry the evaluation model in JSON, keeping conversion-first campaign evaluation explicit for humans and agents.
- Regression coverage verifies the default evaluation model and blank campaign tracking state.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-measurement-goals-save-flow.test.ts app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-tracking-configuration-save-flow.test.ts app/routes/campaign-api.test.ts app/routes/campaign-measurement-goals-api.test.ts`, focused `npx tsc --noEmit` checks for the changed model and API files.
- 참고: `npm run skills:check` still reports the known 8 missing external DDD/marketing skills, so the repo fallback docs were used.

## [2026-05-11] purchase-conversion-required-attribution | Sub-AC 10.2.1

- Purchase conversion validation now requires purchaser user id, session id, event timestamp, order id, canvas node id, purchase input port id, channel id, product id, and offer id before ingestion can persist the event.
- The validator accepts normalized identifiers from either event content or target metadata where appropriate, preserving the existing content/target attribution model.
- Regression coverage verifies missing purchase metadata and attribution identifiers are rejected while existing conversion ingestion and reporting flows continue to pass.
- Route coverage confirms successful purchase capture persists event log entries, normalized conversion records, analytics attribution, order id, user id, session id, event timestamp, and persistence timestamp.
- 검증: `node --test app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts`, `node --test app/routes/campaign-tracking-events-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts app/routes/api.campaign-tracking-events.ts app/routes/campaign-tracking-events-api.test.ts`.
- 참고: `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] persisted-checkout-attribution-identifiers | Sub-AC 10.2.2

- Campaign surface tracking now persists the active landing attribution session in campaign storage as well as browser `sessionStorage`, so a later browser session can recover `sessionId`, `userId`, channel, touchpoint, UTM, and custom attribution parameters.
- Checkout/conversion-bound clicks now carry attribution identifiers forward in the destination URL, including `oc_campaign_id`, `oc_session_id`, optional `oc_user_id`, channel/touchpoint ids, UTM parameters, and non-reserved custom parameters such as coupons.
- Recovered sessions keep their original `firstSeenAt` and update `lastSeenAt`, preserving returning-session attribution while allowing checkout success or webhook flows to correlate the purchase to the campaign session.
- 검증: `node --experimental-strip-types --test --test-name-pattern "persists attribution identifiers" app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/client/campaign-surface-tracking.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/features/creative-canvas/client/campaign-surface-tracking.ts app/features/creative-canvas/client/campaign-surface-tracking.test.ts app/features/creative-canvas/model/creative-canvas.ts`.

## [2026-05-11] purchase-conversion-analytics-projection | Sub-AC 10.2.2

- Analytics storage now persists a dedicated `owncanvas.campaign-purchase-conversion-event.v1` projection for purchase conversion events alongside the generic tracking event records.
- Purchase projection rows preserve order id, value, currency, quantity, purchaser user id, UTM fields, canvas node/input port, channel, product, offer, target URL/label, conversion metadata, target metadata, and deterministic attribution-match metadata when available.
- Added `getPersistedCampaignPurchaseConversionEvents()` so dashboards, agents, and export jobs can query purchase conversions by campaign, session, order id, event name, and time range without re-normalizing raw events.
- Regression coverage verifies the `/tracking/conversions` ingestion path writes the purchase projection and keeps the existing campaign conversion record and analytics attribution intact.
- 검증: `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC on existing plugin fixture `tracking.evaluation` drift and nested `dndnFE` missing aliases/packages/Expo dependencies. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] purchase-conversion-campaign-attribution-rules | Sub-AC 10.2.3

- Purchase conversion ingestion now resolves the attributed campaign before persistence when an existing prior click/exposure/session touchpoint in another campaign has a stronger attribution-rule match than the posted route campaign.
- Added `linkPurchaseConversionEventToAttributedCampaign()` to evaluate persisted campaigns with the same last-click, last-exposure, and last-session rule priority used for conversion attribution, then rewrite the purchase event campaign id to the selected campaign.
- The conversion route permits this campaign reroute only for purchase conversions with a computed attribution match; ordinary type and campaign mismatch validation remains unchanged.
- Regression coverage verifies a purchase posted to the wrong campaign route is persisted under the campaign with the prior same-session offer click and that the dedicated purchase conversion projection carries the selected campaign id and attribution rule.
- 검증: `node --experimental-strip-types --test --test-name-pattern "links purchase events to the campaign selected by attribution rules" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test --test-name-pattern "associates the conversion|links purchase events|attributes a conversion|rejects invalid payloads" app/routes/campaign-tracking-events-api.test.ts`.
- 참고: full `app/routes/campaign-tracking-events-api.test.ts` still has existing expectation drift for `contentId`/`contentType` and `origin` analytics fields outside this Sub-AC. `npm run typecheck` still fails outside this Sub-AC on existing plugin fixture `tracking.evaluation` drift and nested `dndnFE` missing aliases/packages/Expo dependencies; no changed-file type errors were reported after the route narrowing fix.

## [2026-05-11] purchase-conversion-origin-projection | Sub-AC 10.2.3

- Attributed conversion analytics rows and downstream export events now include a normalized `origin` object linking each purchase conversion to campaign id, workflow id, content id/type, content variant id, canvas node/port, page/asset, product/offer, source conversion event, and attributed interaction event when present.
- Tracking attribution now reads optional `workflowId` and `contentVariantId` from first-class content/target fields or nested metadata, while leaving generic attribution records stable for existing consumers.
- Regression coverage verifies a purchase conversion from a short-form content variant resolves to the originating campaign workflow and content variant, and existing conversion reporting/export expectations include the origin projection.
- 검증: `node --experimental-strip-types --test --test-name-pattern "resolves purchase conversion origin" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test --test-name-pattern "conversion" app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-tracking-events-api.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-tracking-event-schema.test.ts app/routes/campaign-metric-query-contracts-api.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC on existing plugin fixture `tracking.evaluation` drift and nested `dndnFE` missing aliases/packages/Expo dependencies. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] purchase-conversion-reporting-metrics-api | Sub-AC 10.2.4

- `GET /api/campaigns/:campaignId/tracking/metrics` now exposes a `conversionMetrics` report alongside metric contracts and rows, so dashboards and agents can read purchase conversion KPI data directly from the analytics API.
- The report includes exposure/click/conversion/purchase funnel counts, unique session counts, click-through rates, purchase conversion rates, total purchase value, average order value, revenue per click, revenue per click session, and currency breakdowns.
- Conversion metrics honor the same metric query filters as the existing reporting API, including campaign, page, asset, channel, product, offer, conversion event, order, currency, and time-range filters.
- Regression coverage verifies the conversion reporting payload and updates the metric contract response shape to include the new KPI block.
- 검증: `node --experimental-strip-types --test app/routes/campaign-metric-query-contracts-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC on existing plugin fixture `tracking.evaluation` drift plus nested `dndnFE` missing aliases/packages/Expo dependencies. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] campaign-reporting-primary-purchase-conversion | Sub-AC 10.3.1

- Added a campaign reporting route at `/campaigns/:campaignId/reporting` that reads the existing conversion metrics report from local campaign storage.
- The reporting view displays purchase conversion as the primary success metric, with purchases, purchase value, revenue per click, and click-through rate as secondary metrics.
- Added a canvas top-bar Reporting action so operators can move from canvas editing to KPI review for the same campaign.
- Updated the Instagram comment-to-DM fixture to include the current campaign evaluation model required by the tracking schema.
- 검증: `node --experimental-strip-types --test app/routes/campaign-reporting-view.test.ts`, `node --experimental-strip-types --test app/routes/campaign-metric-query-contracts-api.test.ts app/routes/campaign-reporting-view.test.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC in the nested `dndnFE` tree due missing packages/path aliases and Expo dependencies. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] campaign-reporting-summary-purchase-conversion | Sub-AC 10.4.2

- Campaign reporting view models now expose ordered summary sections with purchase conversion first as the primary success metric.
- The reporting route renders summary sections for purchase conversion, purchase value, and traffic quality instead of a flat secondary metric strip, keeping conversion-first reporting explicit.
- Regression coverage verifies summary section ordering and that the first section carries `purchase_conversion_rate`.
- 검증: `node --experimental-strip-types --test app/routes/campaign-reporting-view.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/routes/campaign-reporting-view-model.ts app/routes/campaign-reporting-view.test.ts`, `npm run build`.
- 참고: `npm run skills:check` still reports the known 8 missing external DDD/marketing skills, so the repo fallback docs were used. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] measurement-based-improvement-status | Sub-AC 11.2.1

- Added `CampaignMeasurementBasedImprovementStatus` and `getCampaignMeasurementBasedImprovementStatus()` so campaigns expose whether a completed measurement cycle has led to at least one completed measurement-based improvement action.
- `GET`/`PATCH /api/campaigns/:campaignId` now include top-level `improvementStatus`, giving humans and agents a campaign-level conversion-loop state without re-deriving it from tracking internals.
- Regression coverage verifies completed improvement status derivation and the API projection alongside measurement results.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/routes/campaign-api.test.ts`, focused `npx tsc --noEmit ...` for the changed model/API files, `npm run build`.
- 참고: `npm run skills:check` still reports the known 8 missing external DDD/marketing skills, so the repo fallback docs were used. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] campaign-measurement-cycle-completion-response | Sub-AC 11.2.3

- `GET`/`PATCH /api/campaigns/:campaignId` now include top-level `measurementCycleCompletion`, exposing the existing measurement-cycle completion contract in campaign read/query responses.
- The response reports whether any completed measurement cycle exists, the completed cycle count, and the latest completed measurement cycle when present.
- Regression coverage verifies campaign reads expose the completed measurement cycle status after post-publication measurement and updates full campaign API response contract assertions.
- 검증: `node --experimental-strip-types --test app/routes/campaign-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC in the nested `dndnFE` tree due missing packages/path aliases and Expo dependencies; no OwnCanvas campaign API type errors remained after the test expectation fix.

## [2026-05-11] completion-gating-reasons-api | Sub-AC 11.3.3

- Campaign completion 400 responses now include `completionGatingReasons`, so humans and agents can see whether completion is blocked by a missing measurement cycle or by a missing measurement-based improvement cycle.
- The same error response includes `completionState.measurementCycleCompletion` and `completionState.improvementStatus`, preserving the underlying gate state that explains the blocker.
- Regression coverage verifies the improvement-gate response exposes a machine-readable gate, required action, and current measurement/improvement state.
- 검증: `node --experimental-strip-types --test --test-name-pattern "surfaces completion gating reasons" app/routes/campaign-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-api.test.ts`, `npx tsc --noEmit --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --strict app/routes/api.campaign.ts app/routes/campaign-api.test.ts`, `npm run build`.
- 참고: `npm run skills:check` still reports the known 8 missing external DDD/marketing skills, so the repo fallback docs were used. `npm run build` still prints the existing nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] campaign-measurement-improvement-lifecycle-tests | Sub-AC 11.2.4

- Added campaign API regression coverage for the three measurement-loop states required by the acceptance criterion: before measurement, after measurement only, and after a completed measurement-based improvement cycle.
- The before-measurement case verifies `measurementCycleCompletion` is incomplete, `improvementStatus` is `pending`, and no measurement results block is exposed.
- The measurement-only case verifies completed measurement cycles produce a `proposed` improvement status without marking the improvement loop complete.
- The completed-cycle case verifies a campaign can move to `completed` only after an improvement action uses the source measurement result, and the API reports the completed measurement-based improvement status.
- Updated existing completion-gating assertions to include the current `completionGatingReasons` and `completionState` response contract.
- 검증: `node --experimental-strip-types --test app/routes/campaign-api.test.ts`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC in the nested `dndnFE` tree due missing packages/path aliases and Expo dependencies; no OwnCanvas campaign API test type errors remained after the test typing fix.

## [2026-05-11] campaign-completion-measurement-criteria-eligibility | Sub-AC 11.3.1

- Campaign completion validation now requires completed measurement evidence to be tied to configured measurement goals, preventing unscoped measurement cycles from making a campaign completion-eligible.
- Added `hasCampaignCompletedMeasurementCycleWithCriteria()` and the `campaign_completion.measurement_criteria_required` validation error for humans and agents that need to inspect the exact completion blocker.
- `PATCH /api/campaigns/:campaignId` now maps the new blocker to `completionGatingReasons` with the `measurement_criteria` gate and `configure_required_measurement_criteria` action.
- Regression coverage verifies both model validation and API completion rejection keep the campaign in draft when measurement cycles are not tied to required criteria.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/routes/campaign-api.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run typecheck` still fails outside this Sub-AC in the nested `dndnFE` tree due missing packages/path aliases and Expo dependencies.

## [2026-05-11] campaign-completion-improvement-criteria-eligibility | Sub-AC 11.3.2

- Campaign completion validation now requires a completed improvement action to be tied to the same configured measurement criteria as its completed source measurement cycle.
- Added `hasCampaignCompletedImprovementWithCriteria()` and the `campaign_completion.improvement_criteria_required` validation error so humans and agents can distinguish missing improvement records from improvement records that do not satisfy required loop criteria.
- `PATCH /api/campaigns/:campaignId` maps the new blocker to `completionGatingReasons` with the `improvement_criteria` gate and `complete_required_improvement_criteria` action.
- Regression coverage verifies model validation and API completion rejection keep the campaign in draft when a completed improvement uses measurement results but omits the required criteria link.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts`, `node --experimental-strip-types --test app/routes/campaign-api.test.ts`, focused `npx tsc --noEmit ...`, `npm run build`.
- 참고: `npm run build` still prints the known nested `dndnFE/expo-webview` missing `expo/tsconfig.base` warning, but exits 0.

## [2026-05-11] campaign-ui-core-contract-commit-order | Sub-AC 2.2

- Campaign UI commit scope policy now consumes the Campaign core verification policy when validating commit sequences.
- UI commits must use `ui:`, remain limited to UI surfaces, and appear after a prior `campaign-core:` contract commit without mixing Campaign core model files.
- The sequence check also rejects later Campaign core contract commits after UI commits in the same review sequence, keeping Campaign core first.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/campaign-ui-commit-scope-policy.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, focused `npx tsc --noEmit ...`.

## [2026-05-11] campaign-plugin-core-contract-commit-order | Sub-AC 3.4

- Campaign plugin adapter commit scope policy now validates commit sequence as well as file scope.
- Plugin commits must use `plugin:`, remain limited to provider/automation/plugin glue, and appear after a prior independent `campaign-core:` contract commit.
- The sequence check rejects plugin commits before core and mixed Campaign core/plugin commits, preserving the Campaign core contract boundary.
- 실제 `.git` index는 건드리지 않고 임시 index/object store에서 `campaign-core: add first contract sequence` 커밋 객체 `c962d3c9497da44621d5ca1c8eb4b4a60c794d1b`를 부모로 하는 `plugin: enforce campaign adapter commit order` 커밋 객체 `3363745ae50d13bcf471f78a8748441d8eaa31a5`를 생성했다. Plugin commit diff는 plugin 정책 파일 두 개뿐임을 `git show --name-only`로 확인했다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/campaign-plugin-adapter-commit-scope-policy.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, `npm run commit:title:test`.

## [2026-05-11] campaign-revertible-commit-units | AC 5

- Campaign commit sequence policy now exposes `createRevertibleCampaignCommitPlan()` so each Campaign-related commit maps to exactly one revert unit: `campaign_core`, `route`, `ui`, `storage`, or `plugin`.
- The revert plan rejects commits that mix Campaign boundaries and rejects title scopes that do not match the changed area, preserving `git revert <commit>` as a one-boundary operation.
- Commit scope docs now state the revert rule explicitly for reviewers.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts`, `git diff --check`.
## [2026-05-14] image-generation-node-mvp | Seed seed_a979f7e4b39e

- 이미지 생성 노드 MVP 범위를 `/docs/seeds/image-generation-node-mvp.seed.yaml`로 복원했다. 핵심 목표는 Campaign JSON spec을 source of truth로 하는 연결 가능한 Image Generation Block이다.
- Image Block 기본 계약에 prompt, reference_image, style_template_vars 입력 포트와 generated_image_asset, metadata, cost_usage 출력 포트를 명시했다.
- OpenAI Image, Replicate, Freepik-style provider preset을 provider-agnostic core 위의 adapter metadata로 두고, API key 값은 저장하지 않으며 env/local secret store 이름만 노출하도록 했다.
- UI는 Freepik-style 이미지 생성 노드처럼 provider, 포트, x1~x5 batch, canvas.json/assets/runs 저장 계약을 카드 안에 보여주는 방향으로 구현했다.

## [2026-05-14] image-generation-node-reference-affordance | AC3

- Spaces-style Image Block의 `reference_image` React Flow target handle을 왼쪽 플로팅 이미지 아이콘 중심으로 이동하고, 실제 handle은 투명하게 처리했다.
- 왼쪽 이미지 아이콘은 `Reference image connection` affordance로 노출되어, 선택 파란 outline 위의 generic circular border dot 대신 reference image 연결 지점을 시각적으로 대표한다.
- 검증: `npm run typecheck`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: dev server는 `EMFILE` watcher 오류, production server는 sandbox `EPERM` listen 오류, Playwright CLI는 npm registry 네트워크 차단, Chrome/QuickLook/Computer Use screenshot 경로는 sandbox/approval 제한으로 완료하지 못했다. 대신 `output/playwright/ac3-reference-affordance.html`에 동일 클래스 기반 검증 fixture를 남겼다.

## [2026-05-14] image-generation-node-output-affordance | AC4

- Spaces-style Image Block의 `generated_image_asset` React Flow source handle을 오른쪽 플로팅 `space-output-port` 안으로 이동해, 실제 연결 지점이 visible output affordance와 같은 위치를 쓰도록 했다.
- 기존 별도 `image-port-handle-output` 렌더링을 제거해 파란 selected outline 또는 임의 border 위치가 출력 연결점처럼 보이지 않게 했다.
- 검증: `npm run typecheck`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: production server는 sandbox `EPERM` listen 오류, Browser Use는 Node REPL tool 미노출, Chrome headless는 sandbox 종료, QuickLook은 sandbox 초기화 오류, Safari Computer Use는 approval denied로 완료하지 못했다. 대신 `output/playwright/ac4-output-affordance-check.html`에 동일 클래스 기반 검증 fixture를 남겼다.

## [2026-05-14] image-generation-node-label-preservation | AC5

- Spaces-style Image Block의 상단 라벨 `이미지 생성기 #1`이 계속 렌더링되는지 정적 컴포넌트 회귀 테스트로 고정했다.
- 라벨은 `.space-image-node-label` 안의 사용자-visible 텍스트로 유지되며, 노드를 page-like generator로 되돌리거나 preview/debug UI를 추가하지 않았다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-14] image-generation-node-prompt-affordance | AC2

- Spaces-style Image Block의 `prompt` React Flow target handle을 왼쪽 플로팅 T/text affordance 내부로 이동하고, 실제 handle은 투명한 전체 크기 overlay로 처리했다.
- `.prompt-input-affordance`와 `.prompt-input-handle`을 추가해 prompt/text 입력 연결 지점이 선택 파란 outline 위의 원형 dot이 아니라 왼쪽 T 컨트롤로 보이도록 했다.
- 검증: `npm run typecheck`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: dev server는 `EMFILE` watcher 오류, production server는 sandbox `EPERM` listen 오류, Playwright Chromium/Chrome은 macOS sandbox 권한 오류, Playwright WebKit/Firefox는 브라우저 바이너리 미설치, Chrome/Safari/QuickLook/Computer Use 경로도 sandbox 또는 approval 제한으로 완료하지 못했다. 대신 `output/playwright/ac2-image-node-affordance.html`에 동일 클래스 기반 검증 fixture를 남겼다.

## [2026-05-14] image-generation-node-large-prompt-area | AC7

- Spaces-style Image Block의 `.space-node-prompt`가 노드 본문 상단부터 하단 칩 위까지 차지하도록 `top`, `bottom`, `min-height`를 지정해 큰 prompt area를 유지했다.
- prompt placeholder `어떤 이미지를 생성하고 싶은지 설명해주세요...`와 `aria-label="Prompt"`를 정적 회귀 테스트로 고정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-14] image-generation-node-lower-right-resize-handle | AC10

- Spaces-style Image Block의 resize affordance를 lower-right 전용으로 고정해 selection outline 위의 여러 원형 resize controls가 연결점처럼 보이지 않도록 했다.
- `.space-node-resize-corner`와 React Flow `NodeResizer`의 bottom-right handle은 유지되어, resize affordance가 connection affordance와 분리된 상태로 남는다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 브라우저 스크린샷 시도: `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패해 실제 browser screenshot은 생성하지 못했다.

## [2026-05-14] image-generation-node-bottom-setting-chips | AC8

- Spaces-style Image Block의 하단 설정 칩 row가 `x1`, model, `16:9`, `1K`, settings affordance를 계속 렌더링하는지 확인했다.
- 현재 구현은 `.space-node-controls` 아래 `count`, `model`, `ratio`, `quality`, `icon` 칩을 유지하며, `details.batchCount`, `modelLabel`, `details.aspectRatio` source-of-truth 필드를 visible UI에 연결한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고했고, 이번 AC는 `DESIGN.md`와 기존 컴포넌트 회귀 테스트 기준으로 확인했다.

## [2026-05-15] image-generation-node-reference-tray-recent-output-picker | Sub-AC 3.2.2

- Reference tray에 최근 생성된 Creative Output 후보를 고르는 compact picker를 추가하고, `latestResultRefs.generatedAssetIds`를 `recentGeneratedAssetIds` prop으로 전달해 visible node 내부에서는 run metadata를 노출하지 않도록 했다.
- Picker의 `Attach` 동작은 기존 provider-aware `validateImageGenerationReferenceAttachmentDraft({ kind: "recent_output" })`와 `attachImageGenerationNodeReferenceTransition()`을 통해 `referenceImages`에 recent output reference를 저장한다.
- Tray는 upload, URL, recent generated asset attachment를 같은 compact 외부 tray에 유지하며 page-like generator surface나 generic circular handles를 추가하지 않았다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 증거는 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox 권한 제한으로 `listen EPERM: operation not permitted 0.0.0.0:3000`을 반환해 완료하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-docs-panel-metadata | Sub-AC 2.2.1

- Image Block v2 docs/inspector panel이 재사용할 수 있는 `resolveImageGenerationDocsPanelMetadata()` 모델 resolver를 추가했다.
- resolver는 provider name, selected model, supported ratios, required inputs, optional controls, compatibility warnings를 한 객체로 노출하고, 환경 변수 이름만 포함하며 secret 값은 포함하지 않는다.
- 기존 inspector panel은 provider/model/control/warning 표시를 새 docs metadata resolver에서 읽도록 연결했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-14] image-generation-node-visible-debug-copy-guard | AC12

- Spaces-style Image Block의 visible node UI에 JSON, schema, storage, secret, token, API key, debug, metadata, cost copy가 다시 노출되지 않도록 정적 회귀 테스트를 추가했다.
- 테스트 범위는 `FreepikReferenceImageNode` 렌더 경계로 제한해 Campaign metadata sidebar와 Image Block source-of-truth model 필드를 혼동하지 않게 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고했고, `llm-wiki`, `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md` fallback을 사용했다.

## [2026-05-14] image-generation-node-model-test-verification | AC15

- Spaces-style Image Block 연결 affordance 수정 흐름에서 모델 계약 회귀 테스트가 계속 통과하는지 확인했다.
- `aspectRatio`, `frame`, provider-agnostic ports, storage secret policy, Campaign image block default contract를 변경하지 않았다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다.

## [2026-05-14] image-generation-node-typecheck-verification | AC13

- Spaces-style Image Block 연결 affordance 수정 흐름에서 TypeScript 계약이 계속 통과하는지 확인했다.
- UI 구현 파일은 수정하지 않았고, selected outline, floating prompt/reference/output affordance, resize affordance의 개념 경계를 그대로 보존했다.
- 검증: `npm run typecheck`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다.

## [2026-05-14] image-generation-node-connection-affordance-review | AC18

- Codex read-only diff review 기준으로 Spaces-style Image Block 연결 affordance 변경은 PASS로 판정했다.
- `prompt`와 `reference_image` target Handle은 왼쪽 플로팅 T/text 및 image/reference affordance 내부에 embedded/transparent handle로 정렬되어 있고, `generated_image_asset` source Handle은 오른쪽 output affordance 내부에 정렬되어 있다.
- `.image-port-handle`은 투명 처리되어 파란 selected outline 위에 generic circular connection dot을 렌더링하지 않으며, lower-right resize affordance는 connection affordance와 별도로 유지된다.
- 검증: `git diff --check`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`.
- 참고: gstack review preamble의 session 상태 기록은 sandbox 권한 제한으로 실패했지만 리뷰 판정에는 영향이 없었다. commit/push는 수행하지 않았다.

## [2026-05-14] image-generation-node-build-verification | AC14

- Spaces-style Image Block 연결 affordance 수정 흐름에서 production build가 계속 통과하는지 확인했다.
- UI 구현 파일은 수정하지 않았고, selected outline, floating prompt/reference/output affordance, resize affordance의 개념 경계를 그대로 보존했다.
- 검증: `npm run build`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다.

## [2026-05-14] image-generation-node-browser-console-guard | AC17

- Spaces-style Image Block의 floating prompt/reference/output affordance wrapper를 `span`에서 `div`로 바꿔 React Flow `Handle`이 만드는 DOM이 inline `span` 안에 들어가며 발생할 수 있는 React `validateDOMNesting` warning을 제거했다.
- visible connection affordance 구조는 유지했다. `prompt`, `reference_image`, `generated_image_asset` Handle은 여전히 각각 왼쪽 T/text, 왼쪽 image/reference, 오른쪽 output affordance 내부에 embedded/transparent handle로 정렬된다.
- 정적 회귀 테스트에 embedded Handle container가 `div`인지 확인하는 guard를 추가했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `git diff --check`.
- 브라우저 console 직접 검증 시도: `npm run dev -- --host 127.0.0.1 --port 5173`는 `EMFILE: too many open files, watch`, `npm run start -- --host 127.0.0.1 --port 4173`는 sandbox `listen EPERM`, gstack browse는 helper server port bind 실패, Playwright+Chrome headless는 macOS sandbox `SIGABRT`로 실패했다. commit/push는 수행하지 않았다.

## [2026-05-14] image-generation-node-visible-ratio-chip | Sub-AC 1.2

- New Image Block UI의 visible ratio chip이 기본 `aspectRatio` state에서 `9:16`을 받는 계약을 정적 회귀 테스트로 명시했다.
- `FreepikReferenceImageNode` 범위 안에서 ratio chip이 `{details.aspectRatio}`에 바인딩되어 있고 이전 기본값 `16:9`를 하드코딩하지 않는지 확인한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `node scripts/check-skills.mjs`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 스크린샷은 production server가 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`으로 실패해 완료하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-14] image-generation-node-compact-debug-surface-guard | Sub-AC 10.3

- Compact Image Block UI가 `prompt`, `reference_image` asset, `generated_image_asset` asset 포트만 명시적으로 렌더링하도록 정리해 `style_template_vars`, `metadata`, `cost_usage` 같은 JSON/currency/provider diagnostic 포트가 fallback으로 노출되지 않게 했다.
- `FreepikReferenceImageNode` 범위의 정적 회귀 테스트를 강화해 raw JSON, schema/storage/debug/secret/token/API key, payload/request/response/trace, metadata/cost copy와 임의 `details.inputs/outputs` fallback을 금지했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 스크린샷은 production server가 sandbox `listen EPERM: operation not permitted 0.0.0.0:3000`으로 실패해 완료하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-14] image-generation-node-start-transition | Sub-AC 14.3.1

- `startImageGenerationNodeTransition()` 경로를 모델 테스트로 고정해 generation start 시 `uiState.status`가 `running`이 되고 `progressPercent`가 `0`으로 초기화되는지 확인했다.
- 이전 완료/오류 상태의 `latestResultRefs`, `errorReason`, `outputConnectionReady`는 새 실행 시작 시 비워지고, `viewMode`, inspector, docs panel, reference tray 같은 상호작용 표면 상태는 유지되도록 명시했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 이번 sandbox에서 출력 없이 장시간 종료되지 않았고, process inspection도 권한 제한으로 실패해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-14] image-generation-node-failure-transition | Sub-AC 14.3.3

- `failImageGenerationNodeTransition()`을 추가해 generation failure 시 `uiState.status`가 `error`가 되고 `statusMessage`, `errorReason`, `failureDetails`가 함께 갱신되도록 했다.
- 실패 전환은 stale `latestResultRefs`를 비우고 `outputConnectionReady`를 `false`로 내려 실패한 Creative Output이 다음 Image Block으로 연결 가능한 상태처럼 보이지 않게 한다.
- `viewMode`, inspector, docs panel, reference tray 상태는 start/success 전환과 동일하게 보존해 failure feedback이 node 내부 interaction surface에 머물도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-14] image-generation-node-selected-result-sync | Sub-AC 14.3.4

- Image Block v2 status model에 `selectedResultAssetId`를 추가해 현재 선택된 Creative Output을 `uiState`에서 추적하도록 했다.
- `completeImageGenerationNodeTransition()`은 성공 시 첫 output을 자동 선택하고, start/failure 전환은 stale 선택과 output connection readiness를 함께 초기화한다.
- `syncImageGenerationNodeSelectedResultTransition()`을 추가해 output 선택 변경 또는 output 목록 변경으로 선택 결과가 사라진 경우 `selectedResultAssetId`, `statusMessage`, `outputConnectionReady`, output area view가 동기화되도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-14] image-generation-node-status-feedback-fixtures | Sub-AC 14.4.2

- Image Block v2 lifecycle status별 visible feedback을 검증할 수 있도록 `image-generation-node-status-feedback.fixtures.ts` story fixture를 추가했다.
- fixture는 `idle`, `queued`, `running`, `succeeded`, `failed`, `canceled` 상태마다 실제 compact badge가 쓰는 `role`, `data-status`, class, aria label, label text, rendered HTML을 제공한다.
- authoring controls 테스트에 fixture 기반 검증을 추가해 각 상태가 `.space-node-status.<status>` CSS color 스타일과 연결되어 node 내부 compact status badge로 렌더링되는지 확인했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: 브라우저 스크린샷 검증은 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox 권한 제한으로 `listen EPERM: operation not permitted 0.0.0.0:3000`을 반환해 완료하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-default-frame-source | Sub-AC 2.1

- New Image Block의 source-of-truth 기본 비율과 프레임을 `IMAGE_GENERATION_DEFAULT_ASPECT_RATIO = "9:16"` 및 `IMAGE_GENERATION_DEFAULT_FRAME = { width: 360, height: 640, resizeMode: "locked-aspect-ratio" }`로 명명했다.
- `createImageGenerationNodeProperties()`와 `createImageGenerationFrame("9:16")`가 같은 기본 프레임 상수를 사용하도록 정리해 React Flow node width/height와 Campaign Image Block properties가 같은 9:16 세로 기본값에서 출발한다.
- 회귀 테스트는 Image Block model contract와 React Flow projection 모두 기본 상수를 참조하도록 갱신했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: 브라우저 스크린샷 검증은 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox 권한 제한으로 `listen EPERM: operation not permitted 0.0.0.0:3000`을 반환해 완료하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-rendered-frame-source | Sub-AC 2.2

- `GenerationBlockNode`의 Image Block wrapper가 React Flow 측정값 fallback이 아니라 `imageGeneration.frame.width`와 `imageGeneration.frame.height`를 직접 clamp해서 렌더링하도록 바꿨다.
- 기본 `IMAGE_GENERATION_DEFAULT_FRAME`의 `360x640` 저장 프레임이 visible node frame에도 그대로 연결되어 New Image Block의 시각 비율이 9:16 세로로 시작한다.
- authoring controls 회귀 테스트에 stored frame width/height source 사용과 이전 `width ?? imageGeneration.frame.width` fallback 금지를 추가했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 스크린샷 검증은 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox 권한 제한으로 `listen EPERM: operation not permitted 0.0.0.0:3000`을 반환해 완료하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-ratio-selector-state | Sub-AC 3.1.1

- Image Block ratio selector 변경이 `selectImageGenerationNodeAspectRatioTransition()`을 거쳐 선택된 output `aspectRatio`와 matching `frame`을 Campaign spec의 Image Block properties에 유지하는지 adapter 회귀 테스트로 고정했다.
- 테스트는 selector handler와 같은 상태 변경 형태를 시뮬레이션해 `"1:1"` 선택 후 persisted `properties.aspectRatio`와 `createImageGenerationFrame("1:1")`가 함께 저장되는지 확인한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 검증은 `npm run start -- --host 127.0.0.1 --port 4173` 이후 `127.0.0.1:3000` 및 `127.0.0.1:4173` 접속이 실패했고, sandbox가 `ps`/`kill`을 `operation not permitted`로 막아 스크린샷을 완료하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-frame-source-state | Sub-AC 2.1

- Image Block v2 frame model에 `ImageGenerationFrameSource = "aspect-ratio" | "user-resize"`와 `frame.source`를 추가해 현재 frame size의 출처를 명시적으로 저장하도록 했다.
- `createImageGenerationFrame()` 및 ratio selector transition은 `"aspect-ratio"` source를 기록하고, 새 `resizeImageGenerationNodeFrameTransition()`은 manual resize 결과를 `"user-resize"` source로 기록한다.
- React Flow canvas sync는 node width/height가 stored frame과 달라진 경우에만 manual resize transition을 사용해 persisted Campaign spec에 user resize source를 남긴다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 이번 sandbox에서 출력 없이 장시간 종료되지 않아 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. UI 직접 변경이 아닌 model/adapter state contract 작업이라 브라우저 스크린샷은 수행하지 않았다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-docs-panel-provider-model-render | Sub-AC 2.2.2

- Image Block v2 외부 inspector/docs panel의 `Provider schema and docs` 섹션에 provider name, selected model, supported ratios를 렌더링하는 `Provider model docs` 블록을 추가했다.
- 값은 기존 `resolveImageGenerationDocsPanelMetadata()`의 `provider.name`, `selectedModel.name`, `supportedRatios`에서 읽으며 compact node body에는 새 문서 UI를 추가하지 않았다.
- authoring controls 회귀 테스트에 docs panel 렌더 바인딩을 추가했고, primary output preview guard는 reference tray thumbnail `<img>`를 오탐하지 않도록 preview block 범위로 좁혔다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 smoke check는 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox에서 `listen EPERM: operation not permitted 0.0.0.0:3000`으로 막혀 수행하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-reference-tray-shared-attachments | Sub-AC 3.2.3

- Image Block v2 reference tray에 Campaign image asset selector를 추가해 upload, URL, recent generated output과 같은 `validateImageGenerationReferenceAttachmentDraft()` 및 `attachImageGenerationNodeReferenceTransition()` 경로로 정규화되도록 했다.
- Campaign asset과 recent generated output 모두 `listImageGenerationReferenceTrayAttachments()`가 만드는 shared tray attachment item을 통해 preview state, label/detail, remove aria label을 렌더링한다.
- compact node body는 유지하고 deeper reference controls를 tray 안에만 배치했다. output-to-next-node menu의 provider-aware 항목 테스트도 현재 구현(`image-edit`, `style-variant`, `upscale`, `video`, `output-card`, `landing-asset`)과 맞췄다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 이번 sandbox에서 출력 없이 장시간 종료되지 않았고, process cleanup도 `sysmond service not found`/`Cannot get process list` 제한으로 실패해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-provider-payload-compatibility-consumption | Sub-AC 5.1.3 retry 1

- `createImageGenerationNodeProviderRequest()`가 request payload assembly 전에 `resolveImageGenerationAspectRatioCompatibilityRule()`을 호출해 shared `imageGenerationAspectRatioCompatibilityMapping`을 소비하는 현재 계약을 확인했다.
- GPT Image-like `replicate:openai/gpt-image-1`에서 OwnCanvas `9:16` state는 request metadata의 `requested`로 보존되고, provider payload `input.aspect_ratio`에는 mapped provider value `2:3`만 들어간다. 이 경로는 `image_generation.aspect_ratio_mapped` warning을 남기며 invalid provider payload를 만들지 않는다.
- Native ratio 경로는 mapping 없이 selected ratio를 그대로 provider payload에 전달하고, secret value는 노출하지 않고 `OWNCANVAS_REPLICATE_API_TOKEN` env var name만 유지한다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`.
- 참고: 이번 retry 시작 시점의 shared workspace에는 해당 model/request coverage가 이미 적용되어 있어 불필요한 production churn은 만들지 않았다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-output-next-node-menu-options | Sub-AC 4.1 retry 1

- compact Image Block의 primary Creative Output affordance가 `outputConnectionReady` 및 `selectedResultAssetId` 조건을 만족할 때 next-node contextual menu를 열도록 유지했다.
- 메뉴 옵션을 AC6_remaining 범위에 맞춰 `image-edit`, `style-variant`, `upscale`, `video`, `output-card`, `landing-asset`로 확장했다. 메뉴는 compact node에 붙는 contextual surface로 남기고 page-like generator UI는 추가하지 않았다.
- authoring controls 회귀 테스트에 여섯 downstream option과 menu trigger 계약을 고정했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 스크린샷과 commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-docs-panel-optional-controls | Sub-AC 2.2.4

- Image Block v2 외부 `Provider schema and docs` 섹션에 선택된 provider/model의 `docsMetadata.optionalControls`를 렌더링하는 `Optional controls` 블록을 추가했다.
- optional control 행은 label, provider schema key, options 또는 default value, compact/inspector visibility를 보여주며 compact node UI에는 새 control surface를 추가하지 않았다.
- authoring controls 회귀 테스트에 optional controls binding, fallback state, shared docs-list CSS grid를 고정했고, 현재 next-node menu의 guarded toggle/close 구현과 맞지 않던 stale source assertion도 현 구현에 맞췄다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 smoke check는 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox에서 `listen EPERM: operation not permitted 0.0.0.0:3000`으로 막혀 수행하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-output-next-node-menu-trigger | Sub-AC 4.2.1

- compact Image Block의 primary Creative Output affordance에 next-node contextual menu anchor를 추가해 menu placement가 output affordance에 묶이도록 정리했다.
- `nextNodeMenuTriggerRef`, `nextNodeMenuRef`, pending focus ref를 추가해 trigger click, ArrowDown/ArrowUp open, Escape close, menu item Arrow/Home/End 이동, blur/outside pointer close, trigger focus restore를 처리한다.
- menu는 `outputConnectionReady`와 `selectedResultAssetId`가 있을 때만 열리고, 조건이 깨지면 닫히도록 state wiring을 유지했다. compact node UI를 유지했고 page-like image generator UI나 generic circular border handle은 추가하지 않았다.
- reference tray attachment remove typing에서 `id` 기반 removal과 기존 `type/ref` contract가 함께 통과하도록 좁은 타입 보정을 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 smoke check는 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox에서 `listen EPERM: operation not permitted 0.0.0.0:3000`으로 막혀 수행하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-reference-tray-stable-order | Sub-AC 3.3.1

- Reference attachment state에 deterministic `image-reference-*` id를 추가하고, 기존 id 없는 reference는 `createImageGenerationNodeProperties()` 및 tray projection에서 같은 규칙으로 보정되도록 했다.
- `attachImageGenerationNodeReferenceTransition()`은 같은 `type/ref` reference를 다시 attach할 때 기존 stable id와 insertion index를 유지하면서 metadata만 갱신한다. 새 reference는 capability `maxImages` 안에서 뒤에 추가되며, tray item은 `insertionOrder`를 노출한다.
- Reference tray remove flow는 tray item의 stable id를 우선 사용하고, legacy `type/ref` removal contract도 유지한다. compact node UI, provider env var name-only policy, page-like generator 금지는 그대로 유지했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-output-next-node-menu-actions | Sub-AC 4.2.2

- Image Block v2 output-to-next-node menu에 `resolveImageGenerationOutputNextNodeActions()` projection을 추가해 `image-edit`, `style-variant`, `upscale`, `video`, `output-card`, `landing-asset` action의 provider-aware availability와 disabled reason을 model layer에서 계산하도록 했다.
- compact output affordance의 contextual menu는 해당 projection을 렌더링하며 `data-provider-availability`, `aria-disabled`, `disabled`, `title`을 통해 provider/model 제한을 노출한다. page-like generator UI, generic circular border handle, secret value 노출은 추가하지 않았다.
- 현재 capability registry 기준으로 image edit/style variant는 image-to-image/reference support에 묶고, upscale은 provider size control에 묶으며, video는 연결된 video provider가 없다는 disabled state로 표시한다. Output card와 landing asset은 Creative Output 후속 사용이라 계속 enabled로 둔다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 smoke check는 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox에서 `listen EPERM: operation not permitted 0.0.0.0:3000`으로 막혀 수행하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-reference-removal-empty-state | Sub-AC 3.3.3

- Reference attachment 제거 흐름에 마지막 reference 제거 상태를 명시했다. `removeImageGenerationNodeReferenceTransition()`은 마지막 attachment가 사라지면 `statusMessage`를 `Reference tray empty`로 바꾸고 stale error/failure details를 정리한다.
- `resolveImageGenerationReferenceTrayEmptyState()` projection을 추가해 attachment가 없을 때 compact reference tray가 provider/model support에 맞는 empty-state fallback을 렌더링할 수 있게 했다.
- compact Image Block reference tray는 attachment list가 비었을 때 `space-reference-empty-state`를 표시하고, campaign asset/recent output 옵션이 사라진 경우 local selection draft를 비워 stale selection을 재사용하지 않도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 기존과 동일하게 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 smoke check는 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox에서 `listen EPERM: operation not permitted 0.0.0.0:3000`으로 막혀 수행하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-output-next-node-menu-selection | Sub-AC 4.2.3

- Output-to-next-node contextual menu의 enabled action selection을 실제 canvas state 변경에 연결했다. 선택 시 source Image Block의 `outputs.generated_image_asset`에서 새 downstream node로 edge를 만들고, 기존 선택을 해제한 뒤 새 node를 선택한다.
- `Output / result card` label을 명시하고, 해당 action은 `custom` 기반 Creative Output card node를 만들어 selected output asset id, source image node id, action kind를 properties에 저장한다.
- `Landing asset` action은 Landing Block을 생성하고 `inputs.landing_asset` edge target으로 연결한다. Image edit/style variant/upscale/video action도 같은 handler를 공유하되, compact Image Block UI를 확장하거나 page-like generator surface를 추가하지 않았다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 브라우저 evidence 시도는 `npm run start -- --host 127.0.0.1 --port 4173`가 sandbox에서 `listen EPERM: operation not permitted 0.0.0.0:3000`로 실패해 screenshot을 생성하지 못했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-node-output-next-node-mapping-contract | Sub-AC 4.3.1 retry 2

- Output-to-next-node contextual menu mapping contract를 focused regression으로 보강했다. 각 option은 `requiredNodeType`, downstream node kind, target input port, edge label, full default config, selected output payload fields를 명시한다.
- Adapter regression은 menu action으로 생성된 downstream node properties가 `nextNodeDefaultConfig`와 `selectedOutputPayloadFields`를 저장하고, edge/campaign spec properties가 mapping의 `connectionPurpose`를 유지하는지 확인하도록 갱신했다.
- Compact Image Block 중심 UX를 유지했고 page-like generator UI, generic circular border handle, secret value 노출은 추가하지 않았다.
- 검증: `npm run skills:check`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-provider-aspect-ratio-compatibility-mapping | Sub-AC 5.1.2 retry 2

- 현재 workspace에는 provider/config layer의 `imageGenerationAspectRatioCompatibilityMapping`와 `resolveImageGenerationAspectRatioCompatibilityRule()`이 이미 적용되어 있었다. GPT Image-like `replicate:openai/gpt-image-1`의 `9:16 -> 2:3` nearest mapping을 shared mapping으로 노출하고, native ratio는 provider value를 그대로 반환한다.
- 이 mapping은 `validateImageGenerationNodeModelOptions()`와 docs panel compatibility warning에서만 사용되며, Campaign asset generation job의 `providerParameters` 복사/생성 경로는 변경하지 않았다. secret 값은 노출하지 않고 env var name만 유지했다.
- 검증 통과: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락 보고, fallback 사용), `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run build`.
- 검증 이슈: `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`는 기존 output-to-next-node reference attachment expectation 2건에서 실패했다. `npm run typecheck`는 같은 adapter test fixture의 `latestResultRefs`/`uiState` shape mismatch와 `creative-canvas-screen.tsx` reference attachment state declaration order 문제로 실패했다. 이번 sub-AC 범위인 provider/config mapping은 model test에서 통과했다.
- commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-output-next-node-entrypoint-coverage | Sub-AC 4.4.1 retry 1

- Creative Output action button에 안정적인 `data-output-next-node-entrypoint="creative-output-action"` marker를 추가해 next-node contextual menu의 browser/test entry point를 명시했다.
- focused authoring-controls regression `Image output action is the reliable next-node menu entry point`를 추가했다. 이 테스트는 output action button이 generated image trigger, menu ARIA wiring, `toggleNextNodeMenu` click, keyboard open handler, `canOpenNextNodeMenu` disabled guard를 함께 유지하고 generic `Handle` 기반 affordance로 회귀하지 않는지 확인한다.
- 검증: 새 테스트는 marker 추가 전 실패했고, marker 추가 후 `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`가 25/25 통과했다. `npm run typecheck`, `npm run build`, `git diff --check`도 통과했다.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. 통합 명령 `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`는 기존 adapter reference attachment expectation 2건에서 실패했고, 이번 entrypoint coverage는 component test에서 통과했다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-provider-payload-compatibility-consumption | Sub-AC 5.1.3 retry 2

- `createImageGenerationNodeProviderRequest()`의 현재 request assembly가 payload 생성 전에 `resolveImageGenerationAspectRatioCompatibilityRule()`을 호출하고, `compatibilityRule.providerAspectRatio`만 Replicate `input.aspect_ratio`에 쓰는 것을 검증했다.
- GPT Image-like `replicate:openai/gpt-image-1`에서 OwnCanvas `9:16` state는 request metadata의 `requested`로 보존되고 provider payload는 shared mapping의 `2:3`으로 조립된다. 이 경로는 `image_generation.aspect_ratio_mapped` warning을 유지하며 invalid provider ratio를 보내지 않는다.
- 기존 adapter QA를 막던 stale expectation 2건을 현재 default Replicate/Nano Banana reference binding에 맞췄다. deterministic reference id는 `createImageGenerationReferenceAttachmentId()`로 계산하고, styled edge metadata에는 결합하지 않도록 behavioral edge fields만 검증한다.
- 검증: `npm run skills:check`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. UI production 변경은 없어서 browser screenshot은 새로 만들지 않았다. commit/push는 수행하지 않았다.

## [2026-05-15] image-generation-gpt-ratio-ui-evidence | Sub-AC 5.2.3

- Image Block ratio selector의 browser-verifiable provider ratio state를 focused component regression으로 보강했다.
- GPT Image-like `replicate:openai/gpt-image-1`는 `9:16 -> 2:3`, `16:9 -> 3:2` mapped option을 노출하고, disable-mode capability는 unsupported ratios를 disabled option으로 노출하는 계약을 같은 테스트에서 확인한다.
- 테스트는 compact node `<option>`이 `disabled`, `data-provider-ratio`, `data-provider-ratio-availability`, compatibility title, visible label을 유지하는지도 고정해 browser evidence 없이도 DOM evidence가 남도록 했다.
- 검증: `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts`, `npm run typecheck`, `npm run build`, `git diff --check`.
- 참고: `npm run skills:check`는 DDD/marketing 외부 skill 8개 누락을 보고해 `CONTEXT.md`, `DESIGN.md`, `wiki/` fallback을 사용했다. commit/push는 수행하지 않았다.

## [2026-05-16] non-image-generation-prompt-gating | UI correction

- 비이미지 Generation Block shell에서 직접 프롬프트 입력이 필요한 `Copy`, `Prompt`, `Video`, `Voice`만 하단 textarea를 렌더링하도록 분기했다.
- `Operator`, `DM`, `Landing`, `Plugin`은 입력/출력 handle stack과 설정/실행 컨트롤만 남기고, 하단 prompt box를 제거했다.
- 비이미지 프롬프트 입력에는 `space-generation-node-prompt` 전용 스타일을 추가해 이미지 노드 프롬프트 규격은 유지하면서, 카드 안의 카드처럼 보이던 그림자와 강한 박스감을 제거했다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, `npm run build`, Playwright QA screenshot `output/playwright/non-image-prompt-gating-evidence.png`.

## [2026-05-16] owncanvas-seed-and-ui-qa | QA pass

- GitHub issue inventory는 `#1`-`#18` 모두 CLOSED이고 open issue가 없음을 확인했다. `docs/seeds/`에는 과거 seed 문서 5개가 남아 있지만 현재 GitHub에 열린 seed-derived 작업은 보이지 않는다.
- 전체 테스트 첫 실행에서 오래된 fixture expectation 3건이 실패했다. 현재 model defaults와 route table에 맞춰 `creative-canvas.test.ts`, `plugin-registration-template-routing.test.ts` expectation을 보정했다.
- 검증: focused 실패 3건 재실행 3/3 pass, full `node --experimental-strip-types --test $(rg --files app scripts | rg '\.test\.(ts|tsx|js|mjs)$')` 491/491 pass, `npm run typecheck` pass, `npm run build` pass.
- Browser QA는 팔레트에서 `Copy`, `Prompt`, `Image`, `Video`, `Voice`, `Operator`, `DM`, `Landing`, `Plugin` drag 생성 흐름을 확인했다. DOM evidence는 비이미지 generation card 8개, direct prompt input 4개(`Copy`, `Prompt`, `Video`, `Voice`), promptless card 4개(`Operator`, `DM`, `Landing`, `Plugin`), image prompt 1개, 비이미지 prompt `box-shadow: none`이었다.
- Canvas wheel/trackpad pan은 React Flow viewport transform 변화로 확인했다. Ouroboros QA는 `qa-8e6d7a81`에서 PASS 0.86을 반환했다. Screenshot artifact는 `output/playwright/all-generation-nodes-qa-evidence.png`.

## [2026-05-17] go-backed-parallel-generation-seed-publish | Ouroboros publish

- Ouroboros interview `interview_20260516_130002`에서 Seed `seed_afa105c8af04`를 생성했다. 목표는 Go-backed provider 실행 경로, xN Image Block fan-out, per-node job status, persisted Creative Output을 포함한 첫 병렬 생성 slice다.
- GitHub repo `junho-baek/owncanvas`에 1 Epic + 5 Task 이슈로 publish했다: `#19` Epic, `#20` Go generation service/Replicate adapter, `#21` React Router API bridge, `#22` xN Image Block fan-out canvas UX, `#23` per-node status/Creative Output persistence, `#24` verification/demo path.
- Publish 중 shell quoting으로 task body 일부가 백틱 command substitution을 받은 것을 확인하고 `#20`-`#24` body와 `#19` task-link comment를 즉시 정상 Markdown으로 재작성했다. 해당 과정에서 생긴 빈 untracked 파일 `GenerationBatch`, `GenerationJobs`는 제거했고 worktree를 clean 상태로 복구했다.

## [2026-05-17] go-backed-parallel-generation-superpowers-plan | Planning

- Superpowers `writing-plans`로 첫 실행 액션용 plan `docs/superpowers/plans/2026-05-17-go-backed-parallel-generation-slice.md`를 작성했다.
- 전체 Epic `#19`를 한 번에 실행하지 않고, `#20`/`#21`/`#22` 초반을 contract-first vertical slice로 좁혔다. 범위는 local Go generation service runner, mock provider HTTP server, React Router generation bridge, Image Block xN same-type fan-out planner, run button wiring, focused QA다.
- 계획은 context 오염을 줄이기 위해 Seed/issue 전체가 아니라 plan task 단위로 subagent에 넘기는 구조를 전제로 한다. 실제 Replicate provider smoke, completed-result persistence, failed retry UX는 다음 plan에서 이어가도록 경계를 명시했다.

## [2026-05-17] go-backed-parallel-generation-slice | Superpowers execution

- Superpowers `subagent-driven-development`로 Go-backed Image Block fan-out 첫 vertical slice를 실행했다. 각 task는 구현 subagent 후 spec review, code quality review를 거쳤고, 필요한 경우 같은 subagent에게 수정 지시 후 재리뷰했다.
- Go `generation/` 모듈을 추가해 `GenerationBatch`/`GenerationJob`/`GenerationResult` 계약, bounded concurrency runner, deterministic mock provider HTTP server, `owncanvas-generation` entrypoint를 만들었다. mock provider의 `generatedAt`은 deterministic contract를 위해 고정 RFC3339 문자열을 사용한다.
- React Router API bridge `/api/campaigns/:campaignId/generation/batches`를 추가했다. route는 client batch shape, service response shape, campaignId mismatch, Go 4xx/5xx mapping, blank service URL fallback, 405 `Allow: POST`를 검증한다.
- Image Block `batchCount`를 x10까지 확장하고, run action은 같은 타입의 queued Image Blocks를 즉시 생성한 뒤 generation batch를 제출한다. `existingNodes` 기반 collision guard로 같은 millisecond 중복 실행 시 node/job id가 충돌하지 않게 했다.
- 검증: `go test ./...`, focused TS suite 55개, `npm run typecheck`, `npm run build`, `git diff --check`를 통과했다. Headless browser QA에서는 seeded x3 Image Block 실행이 `fanOutCount: 3` 요청, 200 route 응답, mock result 3개, 캔버스 Image Block 4개(원본 1 + succeeded 3), progress 100, provider request id metadata refs 반영을 확인했다.
- QA evidence: `output/playwright/go-generation-fanout-slice.png`.
- 최종 subagent review에서 batch 제출 실패 시 fan-out으로 생성된 queued Image Block이 영구 queued로 남을 수 있다는 blocker를 확인했다. `submitImageGenerationBatch()`가 `null`을 반환하는 route 400/502/fetch 실패 경로에서 방금 생성한 fan-out node들을 `failed` 상태로 전환하도록 보정했다.
- 장애 경로 browser QA는 Go service를 중지한 뒤 seeded x3 Image Block 실행으로 확인했다. route 502 응답 후 캔버스 Image Block 4개(원본 1 + failed 3), queued 0, 각 failed node의 message `Generation batch did not complete.`를 확인했다.
- 추가 최종 review blocker로 stale route fixture와 service response mismatch 문제가 발견됐다. route fixture에 generation batches API를 반영했고, service response는 요청 batch의 `batchId`, result count, `jobId`, `nodeId`, terminal status와 정확히 일치할 때만 통과하도록 강화했다.
- UI 쪽도 expected fan-out node id를 기준으로 결과를 적용하고, 누락 결과가 있으면 해당 Image Block을 `GenerationServiceResultMissing` failed 상태로 전환하도록 이중 방어를 추가했다. 검증: full TS suite 517/517 pass, `go test ./...`, `npm run typecheck`, `npm run build`, `git diff --check`, browser success smoke 200 + 원본 1/succeeded 3.
- Branch `feature/go-generation-fanout-slice`를 `origin`에 push했다. GitHub open issue는 `#19`-`#24`이며, 이번 slice는 mock Go service/React Router bridge/xN fan-out/terminal lifecycle guard까지 완료했지만 `#20` real Replicate adapter, `#23` Creative Output persistence, `#24` reload/retry demo가 남아 있어 issue는 닫지 않았다.

## [2026-05-17] go-generation-provider-success-mapping-fixtures | Sub-AC 1.1.4

- Replicate-compatible provider adapter의 성공 응답 mapping을 fixture table로 보강했다. string output, explicit metadata object output, nested files output을 모두 `GenerationResult`의 `ProviderURL`, `MimeType`, dimensions, `GeneratedAt`, terminal `succeeded` state로 매핑하는 계약을 검증한다.
- 기존 mock/test provider와 React Router bridge, xN fan-out behavior는 변경하지 않았다. provider secret 값은 테스트 fixture에만 가짜 token을 쓰고 환경 변수 값 노출은 추가하지 않았다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'TestReplicateProvider.*(CreatesPrediction|UsesNested|UsesCreative|Maps)'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...`.

## [2026-05-17] go-replicate-provider-env-runtime | Sub-AC 1.2.1

- Go generation service runtime path가 `NewProviderFromEnvironment()`를 통해 `OWNCANVAS_REPLICATE_API_TOKEN`을 읽고, trimmed token/base URL/wait seconds 값을 `ReplicateProvider` adapter configuration에 전달하는 계약을 focused test로 고정했다.
- 토큰이 없는 환경에서는 `provider: "replicate"` job만 `OWNCANVAS_REPLICATE_API_TOKEN` missing-credential error로 실패하고, 기존 `mock` provider는 계속 사용할 수 있음을 검증했다.
- Sandbox에서 `httptest` listener 생성이 `operation not permitted`로 막혀 network smoke 대신 in-package provider wiring test로 검증했다. 실제 provider smoke는 README의 `OWNCANVAS_REPLICATE_API_TOKEN="$REPLICATE_API_TOKEN" go run ./cmd/owncanvas-generation` 및 `curl /v1/generation/batches` 경로를 사용한다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'Test(NewProviderFromEnvironment|ReplicateProvider|RoutingProvider)'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`.

## [2026-05-17] go-replicate-provider-credential-verification | Sub-AC 1.2.3

- Missing Replicate credential behavior를 service-level regression으로 보강했다. `NewProviderFromEnvironment()`가 token 없이 만든 routing provider를 batch 실행에 사용해도 `mock` sibling job은 `succeeded`로 끝나고, `replicate` job만 `provider_error`/`OWNCANVAS_REPLICATE_API_TOKEN` 메시지를 가진 terminal `failed` result로 반환됨을 검증한다.
- 기존 configured credential loading test는 `OWNCANVAS_REPLICATE_API_TOKEN`, `OWNCANVAS_REPLICATE_BASE_URL`, `OWNCANVAS_REPLICATE_WAIT_SECONDS`가 trimmed/configured provider field로 반영되는 계약을 계속 담당한다. provider secret 값 노출이나 React Router bridge/fan-out behavior 변경은 추가하지 않았다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'Test(NewProviderFromEnvironment|ExecuteBatchFailsReplicateJobSafelyWhenCredentialsAreMissing)'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`.

## [2026-05-17] go-replicate-provider-error-mapping | Sub-AC 1.4.2

- Replicate-compatible provider adapter의 non-2xx API 응답을 `ExecutionError` typed failure model로 정규화했다. `401/403`은 `GenerationProviderAuthenticationFailed`/`provider_configuration`, `429`는 retryable `GenerationProviderRateLimited`, `5xx`는 retryable `GenerationProviderUnavailable`, 그 외 provider rejection은 `GenerationProviderRejectedRequest`로 매핑한다.
- JSON error body의 `detail`, `error`, `message`, `msg`, `title` 값을 우선 추출해 Creative Output 실행 실패 메시지를 안정화하고, malformed body는 trim된 fallback 메시지로 제한했다. HTTP request 실행 실패와 response read 실패는 `transport_error` category의 retryable typed failure로 유지했다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'TestReplicateProvider.*(Transport|ProviderAPI|Rejected|Failure)'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`.

## [2026-05-17] generation-provider-secret-redaction | Sub-AC 1.4.3

- Go generation runtime에 secret redaction helper를 추가해 `Authorization`, `Bearer`, `token`, `secret`, `api key` 형태의 provider error 문자열과 `OWNCANVAS_REPLICATE_API_TOKEN` 값을 `[redacted]`로 치환하도록 했다.
- Replicate adapter의 transport error, provider API error body, terminal prediction failure message가 configured token을 그대로 반환하지 않도록 provider-local redaction을 적용했다.
- Service-level generic provider error normalization도 env token/pattern redaction을 거치게 했고, React Router generation response normalization에도 방어적 per-job error message redaction을 추가했다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-17] generation-provider-error-redaction-tests | Sub-AC 1.4.4

- Go generation runtime에 typed provider failure mapping과 secret-safe log output을 고정하는 focused regression을 추가했다.
- `ExecutionError`가 `GenerationError`로 변환될 때 authentication, rate limit, transport category/retryable 값이 유지되고, `OWNCANVAS_REPLICATE_API_TOKEN` 값과 secret-shaped 문자열이 per-job error message에 남지 않는지 검증한다.
- `log.Logger`가 `ExecutionError`를 출력하는 경로도 token/api key/Authorization 값을 `[redacted]`로 치환하는지 확인해 운영 로그에 provider secret이 노출되지 않도록 했다.
- 검증: `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'Test(GenerationErrorFromExecutionErrorMapsTypedFailuresAndRedactsSecrets|ExecutionErrorOutputIsSafeForLogs|ReplicateProvider.*Error|ExecuteBatch.*Error|ExecuteBatchRedacts)'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts`.

## [2026-05-17] generation-request-required-field-validation | Sub-AC 2.1.1

- Go generation service에 Image Block generation request 필수 필드 검증을 추가했다. `batchId`, `campaignId`, `sourceNodeId`, `fanOutCount`, job별 `jobId`/`nodeId`/`prompt`/`provider`/`model`/`aspectRatio`, optional `spec`의 실행 필드가 비어 있으면 provider 실행 전에 `invalid_batch`로 거절한다.
- Service-level table test와 HTTP endpoint regression을 추가해 누락 필드가 provider adapter까지 전달되지 않고 명확한 오류 메시지로 반환되는 계약을 고정했다.
- 기존 concurrency, partial failure, typed provider error, secret redaction fixture는 full generation request shape로 보정했다. React Router bridge와 xN fan-out behavior는 변경하지 않았다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'TestExecuteBatch(RejectsMissingRequiredRequestFields|RejectsFanOutAboveHardCap|RunsConcurrently|Isolates|FailsReplicate|PreservesTyped|Redacts)'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'Test(ServerRejectsRequestsMissingRequiredGenerationFields|ExecuteBatchRejectsMissingRequiredRequestFields)'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`.

## [2026-05-17] generation-malformed-request-validation-tests | Sub-AC 2.1.2

- Go generation service의 malformed request validation coverage를 보강했다. `fanOutCount` 0/negative, missing/empty/extra `jobs`, blank second job index reporting이 provider 실행 전에 validation error로 끝나는지 검증한다.
- HTTP endpoint regression을 추가해 wrong JSON type(`fanOutCount` string, `jobs` object, `spec` array)은 `invalid_json`으로, JSON decode는 되지만 semantic shape가 잘못된 `jobs: null`, `fanOutCount: 0`, empty job object는 `invalid_batch`로 반환되는 계약을 고정했다.
- malformed request 경로에서는 provider adapter가 호출되지 않도록 test provider가 즉시 실패하게 했다. React Router bridge와 xN fan-out behavior는 변경하지 않았다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'Test(ExecuteBatchRejectsMalformedRequestInputs|ServerRejectsMalformedGenerationRequestInputs)'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `git diff --check`.

## [2026-05-17] generation-provider-boundary-fanout-cap-tests | Sub-AC 2.2

- Go generation service의 x10 fan-out cap을 provider request boundary에서 검증하는 regression을 추가했다. `fanOutCount: 11`과 11개 job을 가진 요청은 `fanOutCount must be between 1 and 10`으로 거절되고 provider adapter가 한 번도 호출되지 않는다.
- `fanOutCount: 10`은 유효한 최대 batch로 provider boundary까지 정확히 10개 generation job이 전달되고, `MaxConcurrency`가 더 크게 설정되어도 service가 cap 안에서 결과 10개를 보존하는지 검증한다.
- 기존 React Router bridge, xN Image Block fan-out behavior, Replicate/mock provider runtime은 변경하지 않았다.

## [2026-05-17] go-generation-creative-output-server-persistence | Sub-AC 3.1.2

- React Router generation bridge가 Go-backed terminal batch response를 반환하기 전에 기존 Campaign persistence model에 저장하도록 연결했다. `GenerationJobResult.providerUrl`은 `CampaignAssetGenerationResultMetadata.uri`와 generated `CampaignAsset.uri`/`outputLocations.primaryUri`로 반영된다.
- 성공 job은 deterministic Creative Output asset id(`asset_<nodeId>_creative_output`)로 저장하고, provider request id, mime type, dimensions, thumbnail, size, generatedAt, prompt hash를 기존 result metadata와 `generatedMetadata`에 남긴다.
- route는 request의 job-to-node mapping을 사용해 persisted canvas/spec node에 `assetGenerationJobId`를 연결하고, 기존 `applyCampaignAssetGenerationExecutionResult()` 경로가 node `assetGeneration.outputLocations`까지 집계하도록 했다. 실패 job은 asset을 만들지 않고 typed failure details/execution record만 저장한다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-17] generation-missing-provider-secret-unit-test | Sub-AC 2.3

- Replicate adapter boundary에 missing provider secret regression을 추가했다. `APIToken`이 blank일 때 `ReplicateProvider.Generate()`는 `GenerationProviderMissingCredential` / `provider_configuration` / non-retryable error를 즉시 반환하고, configured HTTP transport를 호출하지 않는다.
- 기존 environment routing/service-level missing credential tests와 함께, 실제 provider token이 없을 때도 mock sibling execution은 유지되고 Replicate job만 명확한 terminal failure로 끝나는 계약을 보강했다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./internal/generation -run 'TestReplicateProviderFailsClearlyWithoutTokenBeforeProviderExecution|TestNewProviderFromEnvironmentKeepsMockAndFailsReplicateWithoutToken|TestExecuteBatchFailsReplicateJobSafelyWhenCredentialsAreMissing'`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`.

## [2026-05-17] provider-success-creative-output-result-unit-test | Sub-AC 2.4

- Replicate-compatible provider success response를 내부 `creativeOutputResult` 구조로 매핑하는 Go unit test를 추가했다.
- 새 regression은 string URL output, explicit object metadata, nested files output을 각각 검증하며 Creative Output URI, MIME type, dimensions, thumbnail URI, size bytes가 보존되는지 확인한다.
- 기존 HTTP provider success fixture와 함께 provider response parser 자체의 성공 mapping 계약을 고정했다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`.

## [2026-05-17] failed-image-block-output-reference-preservation | Sub-AC 3.3.2

- 실패한 Image Block이 이전 성공 Creative Output 참조를 지우지 않도록 lifecycle transition을 보강했다. queued/running/failure 전환은 `latestResultRefs`를 복제해 유지하고, 실패 상태는 `failureDetails`를 기록하면서 기존 selected output과 output connection readiness를 복원한다.
- React Router generation persistence path에서 같은 job의 retry가 실패해도 기존 `resultMetadata`를 빈 배열로 대체하지 않도록 했다. 실패 execution record와 canvas `assetGeneration` 상태는 failed로 남되, 이전 성공 asset id/result id/output location은 계속 보존된다.
- focused regression으로 성공 저장 후 같은 Image Block retry 실패 시 Campaign asset, job result metadata, failed execution output, canvas output references가 유지되는지 검증했다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, `git diff --check`.

## [2026-05-17] retry-job-ownership-idempotency | Sub-AC 3.3.3

- React Router generation persistence path에 job ownership guard를 추가했다. 기존 Campaign에 저장된 `assetGenerationJobId`나 job output target이 다른 Image Block을 가리키는 경우, 같은 `jobId`를 다른 `nodeId`로 재사용하는 retry/failure 요청은 provider 실행 전에 `generation.invalid_batch`로 거절된다.
- execution result 생성도 기존 job의 output target/result metadata가 현재 `nodeId`의 deterministic Creative Output asset id와 일치할 때만 이전 lifecycle/result metadata를 재사용하도록 보강했다. 이로써 실패한 fan-out/retry 시도가 sibling Image Block의 성공 Creative Output asset을 상속하거나 덮어쓰지 않는다.
- focused regression으로 `node_1` 성공 저장 후 `node_2`가 `node_1`의 job id를 재사용하는 retry를 시도해도 provider가 호출되지 않고, `asset_node_1_creative_output`과 `node_1` canvas link가 유지되며 `node_2`에는 잘못된 job link가 생기지 않음을 검증했다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts`, `node --experimental-strip-types --test app/routes/campaign-generation-api.test.ts app/features/creative-canvas/model/generation-batch.test.ts app/features/creative-canvas/model/image-generation-node.test.ts`, `npm run typecheck`, `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`.

## [2026-05-17] owncanvas-ouroboros-monitor | execution status

- Ouroboros monitor checked Job `job_d578be26d4d3` for Session `orch_0f2df407c770` / Execution `exec_e9d09f70b7d9`.
- The execution remains `running` in `Deliver`, with acceptance criteria progress `3/12` and sub-acceptance criteria `35/35`.
- Latest completed status item: Sub-AC 4 verifying persisted provider URLs and duplicated Image Blocks resolve to persisted outputs.

## [2026-05-17] owncanvas-ouroboros-recovery | stuck run recovery

- Ouroboros Job `job_d578be26d4d3`가 `Deliver` 단계 `AC 3/12`, `Sub-AC 35/35` 상태에서 장시간 진행되지 않아 수동 recovery로 전환했다.
- MCP job cancel을 요청했고, CLI session cancel 확인에서 Session `orch_0f2df407c770`는 `cancelled` 상태로 재구성됐다. hourly monitor automation은 `PAUSED`로 전환했다.
- Ouroboros worktree `ooo/orch_0f2df407c770`의 변경분을 임시 커밋 `af2e55f`로 고정한 뒤 feature branch `feature/go-generation-fanout-slice`에 cherry-pick해 `5f0ebee`로 회수했다.
- Recovery 후 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, focused generation TS suite 116/116 pass, full TS suite 530/530 pass, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-17] go-generation-local-first-reload-retry | seed finish

- Superpowers plan으로 Go generation 남은 seed gap을 마무리했다. route-local generation response persistence를 `persistGenerationBatchResponseToCampaign()` pure helper로 추출해 server route와 browser client가 같은 Campaign Asset/Creative Output mapping을 공유한다.
- React Router v7 `ssr: true` route가 브라우저 `window.localStorage`를 직접 갱신하지 못하는 점을 반영해, `CreativeCanvasScreen`이 route response 수신 후 Campaign/Creative Output asset을 local-first Campaign state에 먼저 저장하고 persisted response로 Image Block preview refs를 적용하도록 했다.
- 실패한 duplicated Image Block retry는 기존 node id 하나만 `fanOutCount: 1` batch로 재시도하고, source Image Block rerun은 기존 seed처럼 새 xN visual batch를 append하도록 분리했다. 새 fan-out output nodes는 duplicated node 자체가 결과물이므로 `batchCount: 1`로 초기화한다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...` in `generation`, full TS suite 532/532 pass, `npm run typecheck`, `npm run build`, `git diff --check`.
- GitHub triage: 구현 완료된 #20, #21, #22, #23을 close했다. 실제 브라우저 수동 demo artifact가 필요한 #24와 parent epic #19는 open 유지하고 남은 체크리스트를 comment로 남겼다.

## [2026-05-17] image-block-reference-fanout-catalog-seed | seed publish

- Ouroboros interview `interview_20260517_071611` 결정사항을 바탕으로 Seed `seed_f02200db0442`를 생성했다. 범위는 Image Block xN fan-out 시 참조 이미지 edge를 각 독립 output node로 복제하고, Replicate 같은 실행 서비스를 user-facing model/provider로 노출하지 않는 catalog/adapter layer를 추가하는 첫 slice다.
- Seed 사본을 `docs/seeds/image-block-reference-fanout-catalog.seed.yaml`에 저장했다. 표준 Ouroboros seed 위치에도 `~/.ouroboros/seeds/seed_f02200db0442.yaml`로 보관했다.
- GitHub publish 결과: parent epic #25, fan-out reference edge task #26, model catalog/adapter task #27, incompatible reference fan-out blocking task #28을 생성했다.

## [2026-05-17] image-block-reference-fanout-catalog | seed execution

- Seed `seed_f02200db0442`의 첫 Superpowers subagent-driven execution slice를 구현했다. Image Block xN fan-out은 source Image Block으로 들어오는 prompt/reference React Flow edge를 각 독립 output Image Block으로 복제하고, 기존 edge metadata를 보존한다.
- compact model selector는 Replicate 같은 실행 서비스를 user-facing model로 노출하지 않고 catalog model entry(Nano Banana, GPT Image, Seedream 3)를 표시한다. 현재 reference count와 맞지 않는 model은 disabled reason을 가진 option으로 표시한다.
- fan-out 실행 전 `validateImageGenerationFanOutReadiness()`가 model/reference compatibility를 검사해 incompatible reference count에서는 output node/edge를 만들지 않고 source Image Block에 inline compatibility error를 남긴다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), focused TS tests 118/118 pass, `npm run typecheck`, `git diff --check`.

## [2026-05-17] video-generation-provider-slice | Superpowers execution

- Superpowers plan `docs/superpowers/plans/2026-05-17-video-generation-provider-slice.md` 기준으로 Video Block에 provider-backed generation slice를 연결했다. Replicate는 service adapter로만 유지하고, 사용자-facing model catalog는 Seedance/Kling 모델명 중심으로 노출한다.
- `mediaType: "video"` generation batch contract, Go provider polling, video MIME detection, video Creative Output persistence, Video Block run planner/UI controls를 추가했다. 기본 smoke 설정은 `bytedance/seedance-1-lite`, 2초, 480p, 16:9이며 `bytedance/seedance-1-pro-fast`와 `kwaivgi/kling-v2.1`도 catalog에 포함했다.
- 실제 provider smoke에서 `bytedance/seedance-1-lite`는 장시간 처리되어 cancel했고, `bytedance/seedance-1-pro-fast`로 2초 480p MP4 생성에 성공했다. 산출물은 `output/replicate/owncanvas-ai-native-ceo-seedance-pro-fast.mp4`에 보관했다.
- 검증: focused TS tests 77/77 pass, `go test ./...` in `generation`, `npm run typecheck`, `npm run build`, `git diff --check`.

## [2026-05-18] video-node-preview-and-x1-in-place | UI correction

- Image Block `batchCount: 1` 실행은 더 이상 fan-out output node를 만들지 않고 원본 Image Block을 queued/succeeded 대상으로 사용하도록 변경했다. `batchCount >= 2`일 때만 기존처럼 독립 output Image Block들을 생성하고 참조 edge를 복제한다.
- Video Block 기본 Seedance 계열 aspect ratio를 `9:16`으로 바꾸고, Video Block frame을 360x640 세로형 표면으로 고정했다. 생성된 video Creative Output이 있으면 별도 좌하단 플레이어가 아니라 Video Block 내부 `<video>` preview가 노드 전체를 채운다.
- 캔버스 좌하단 `PersistentShortFormPlayer` 렌더링을 제거했다. 영상 확인은 생성 블록 표면에서 이루어지는 것이 기준이다.
- 검증: focused TS tests 54/54 pass, React Flow canvas tests 17/17 pass, `npm run typecheck`, `npm run build`, `git diff --check`, headless Chrome QA에서 Video Block 9:16/360x640, 내부 video preview, prompt overlay, 좌하단 플레이어 0개를 확인했다.

## [2026-05-18] owncanvas-agent-cli-seed | Ouroboros interview

- OwnCanvas agent/CI용 CLI 방향을 Ouroboros interview로 고정하고 Seed `seed_44c68272afba`를 생성했다. Seed 원본은 `~/.ouroboros/seeds/seed_44c68272afba.yaml`에 있다.
- CLI v1은 `.owncanvas/campaigns/<campaign_id>/` 아래 file-backed Campaign workspace를 canonical source of truth로 삼고, UI `localStorage`는 runtime/cache로만 취급한다. SQLite/NoSQL index, Git sync, multi-user collaboration, full visual layout editing은 v2로 미뤘다.
- Agent가 겁먹지 않도록 non-destructive Campaign/Block/Edge authoring은 빠르게 적용하되, revision check, snapshot, validation, atomic write, structured JSON envelope, stable exit code로 안전장치를 둔다.
- 핵심 범위는 Campaign workspace 생성/열기, Generation Block 추가/수정, prompt/model/reference/edge 연결, validate/inspect/diff/apply, deterministic mock generation, opt-in real provider generation, graph/canvas run, 비용 추적이다.
- Workflow execution은 아직 시작하지 않았다. 생성된 seed가 고정 산출물이며, 다음 단계는 publish 또는 implementation run이다.
- Publish 결과: GitHub Epic #29와 하위 Task #30, #31, #32, #33, #34, #35를 생성했다. Seed 사본은 `docs/seeds/owncanvas-agent-cli.seed.yaml`에 저장했다.

## [2026-05-18] owncanvas-cli-foundation | Issue #35

- Superpowers plan `docs/superpowers/plans/2026-05-18-owncanvas-cli-foundation.md` 기준으로 OwnCanvas CLI 첫 slice를 구현했다. 범위는 file-backed `.owncanvas` workspace, Campaign directory layout, Campaign document revision metadata, deterministic JSON, basic CLI JSON envelope다.
- 새 feature folder `app/features/owncanvas-cli/`를 만들고, 기존 Creative Canvas `createBlankCampaignRecord()`를 사용해 UI-compatible Campaign record를 생성한 뒤 file-backed `revision` metadata를 얹도록 했다. Campaign document mutation은 helper를 통해 unknown field를 보존한다.
- `npm run owncanvas:cli -- workspace init/status --json`, `campaign create/list/open/inspect/export --json` 경로를 추가했다. Campaign directory는 `.owncanvas/campaigns/<campaign_id>/campaign.json`과 `assets/`, `outputs/`, `runs/`, `snapshots/`를 만든다.
- 검증: `node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts app/features/owncanvas-cli/cli.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-18] owncanvas-cli-authoring | Issue #30

- Superpowers plan `docs/superpowers/plans/2026-05-18-owncanvas-cli-authoring.md` 기준으로 CLI authoring slice를 구현했다. 범위는 Generation Block add/set/remove/restore, domain edge connect/disconnect, reference asset import/list, multi-command `apply`다.
- `authoring-commands.ts`를 추가해 CLI 명령을 Campaign domain helper(`createCampaignBlock`, `applyCampaignCanvasEditAction`, `createCampaignAsset`, `addCampaignAsset`)로 통과시키도록 했다. 삭제된 Block은 `extensions.owncanvasCli.deletedBlocks`에 보관해 restore할 수 있게 했다.
- `updateCampaignInWorkspace()`와 `reviseFileBackedCampaignDocument()`를 추가해 변경이 있을 때만 `campaign.json`을 쓰고 revision hash/previousHash/lastCommand를 갱신한다. 반복 edge connect, duplicate add with `--if-not-exists`, missing disconnect with `--if-exists`는 idempotent no-op으로 처리된다.
- CLI 표면은 `block add/set/remove/restore`, `edge connect/disconnect`, `asset import/list`, `apply --plan`을 지원하며 `--json` envelope에 created/updated/deleted id를 포함한다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts app/features/owncanvas-cli/model/authoring-commands.test.ts app/features/owncanvas-cli/cli.test.ts`, `npm run typecheck`, `git diff --check`.

## [2026-05-18] owncanvas-cli-mock-generation | Issue #34

- Superpowers plan `docs/superpowers/plans/2026-05-18-owncanvas-cli-mock-generation.md` 기준으로 deterministic mock generation slice를 구현했다. 범위는 block/canvas/range/selection target planning, dependency-aware graph order, mock output persistence, Campaign output refs, run lifecycle commands다.
- `mock-generation.ts`를 추가해 Text/Image/Video Block을 provider credential 없이 실행한다. 실행 결과는 `.owncanvas/campaigns/<campaign_id>/runs/<run_id>/` 아래 `request.json`, `response.json`, `status.json`, `events.jsonl`, `pricing.json`에 남기고, output file은 `outputs/<run_id>/`에 저장한다.
- Mock run은 Campaign Asset을 생성하고 Image/Video Block `latestResultRefs`와 `uiState.outputConnectionReady`를 갱신한다. `mockFailure: true`가 있는 block은 partial failure injection으로 처리해 성공 output은 보존하고 run status를 `partial_failed`로 남긴다.
- CLI 표면은 `generate run`, `generate status`, `generate logs`, `generate outputs`, `generate cancel`, `generate retry`를 지원한다. `generate run`은 block target, `--canvas`, `--from/--to`, `--selection`, `--run-id`를 받는다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), `node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts app/features/owncanvas-cli/model/authoring-commands.test.ts app/features/owncanvas-cli/model/mock-generation.test.ts app/features/owncanvas-cli/cli.test.ts`, `npm run typecheck`, `git diff --check`.
