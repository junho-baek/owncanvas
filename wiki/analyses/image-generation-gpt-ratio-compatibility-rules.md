# GPT Image 비율 호환성 규칙 | GPT Image Ratio Compatibility Rules

## 범위

이 메모는 Image Generation Node v2 남은 작업의 Sub-AC 5.1.1 결과다. 목적은 GPT Image-like provider/model의 현재 비율 제약을 기존 seed, model capability registry, 회귀 테스트에서 확인하고 OwnCanvas의 canonical compatibility rule을 고정하는 것이다.

## 확인한 소스

- `docs/seeds/image-generation-node-provider-ux-v2.seed.yaml`: Replicate `openai/gpt-image-1` 조사 snapshot은 `aspect_ratio` enum을 `1:1`, `3:2`, `2:3`로 기록하고, OwnCanvas 기본 `9:16`을 그대로 provider input으로 보내면 안 된다고 명시한다.
- `app/features/creative-canvas/model/image-generation-node.ts`: Replicate `openai/gpt-image-1` capability는 `supportedAspectRatios: ["1:1", "2:3", "3:2"]`, `defaultAspectRatio: "2:3"`, `schemaAdapter.unsupportedRatioBehavior: "map_nearest"`로 정의되어 있다.
- `app/features/creative-canvas/model/image-generation-node.test.ts`: 회귀 테스트는 GPT Image가 `9:16`을 지원 목록에 포함하지 않고, `9:16` 요청을 `image_generation.aspect_ratio_mapped` warning으로 처리하며, docs panel warning으로 `9:16 is not native to GPT Image.`를 노출하는 계약을 검증한다. 이후 `16:9` 요청도 `3:2`로 매핑해 landscape 요청을 portrait 기본값으로 보내지 않는 계약을 추가했다.

## 현재 제약

- OwnCanvas Image Block의 product default는 계속 `9:16`이다.
- GPT Image-like Replicate model의 provider-native ratios는 `1:1`, `2:3`, `3:2`뿐이다.
- GPT Image-like model의 OwnCanvas 기본 `9:16` fallback provider ratio는 `2:3`이다.
- GPT Image-like model에서 unsupported numeric ratio는 `map_nearest` 의미에 맞춰 가장 가까운 provider-native numeric ratio로 매핑한다. 현재 명시 규칙은 `9:16 -> 2:3`, `16:9 -> 3:2`다.
- GPT Image-like model은 reference image를 지원하지만 현재 capability상 single reference만 허용한다.
- Credential handling은 env var name `OWNCANVAS_REPLICATE_API_TOKEN`까지만 노출하며 secret value는 docs/registry/UI에 저장하거나 표시하지 않는다.

## Canonical Compatibility Rules

1. `capability.supportedAspectRatios`에 있는 ratio는 provider payload에 그대로 매핑할 수 있다.
2. OwnCanvas node state가 `9:16`이고 selected model이 GPT Image-like이면 invalid provider payload를 만들지 않는다.
3. GPT Image-like unsupported ratio는 hard error가 아니라 compatibility warning이다. 현재 canonical warning code는 `image_generation.aspect_ratio_mapped`, message는 `9:16 is not native to GPT Image.`다.
4. Payload creation 전에 unsupported OwnCanvas ratio를 nearest supported provider ratio로 매핑해야 한다. OwnCanvas 기본 `9:16`의 canonical target은 `2:3`이고, OwnCanvas `16:9`의 canonical target은 `3:2`다.
5. Compact node는 OwnCanvas ratio chip/source-of-truth state를 보존할 수 있지만, inspector/docs panel은 provider-native supported ratios와 compatibility warning을 함께 보여야 한다.
6. Ratio selector UX는 GPT Image-like mode에서 unsupported `9:16`을 provider-native option처럼 노출하지 않는다. 이미 선택된 OwnCanvas default는 compatibility state로 설명하고, provider input은 mapped ratio만 사용한다.
7. Multi-reference UX는 GPT Image-like mode에서 추가 reference attachment를 disabled/rejected 상태로 설명한다. Canonical reason은 single-reference limit이다.

## Verification Gate

Subsequent implementation work should keep these gates passing:

- GPT Image capability registry includes only `["1:1", "2:3", "3:2"]`.
- GPT Image `defaultAspectRatio` stays `2:3` unless provider docs/config change.
- GPT Image `schemaAdapter.unsupportedRatioBehavior` stays `map_nearest` unless a later product decision switches to `disable`.
- Validation returns warning, not error, for OwnCanvas `9:16` and `16:9` on GPT Image-like models.
- Provider request assembly maps OwnCanvas `9:16` to `2:3` and `16:9` to `3:2` before writing Replicate `input.aspect_ratio`.
- Inspector/docs panel shows supported ratios and compatibility warning without secret values.
