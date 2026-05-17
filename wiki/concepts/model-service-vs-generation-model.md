# 모델 서비스와 생성 모델 | Model Service vs Generation Model

OwnCanvas Image Block에서 사용자가 선택하는 단위는 **생성 모델**이다.

Replicate 같은 서비스는 여러 이미지 모델을 서빙하는 실행 계층이다. 따라서 사용자-facing 노드, 모델 선택 칩, 인스펙터 요약에서는 `Nano Banana`, `GPT Image`, `Seedream 3` 같은 실제 이미지 모델 이름을 먼저 보여준다.

내부 batch/API 계약에서는 Go generation service routing을 위해 `provider: "replicate"` 같은 transport/service 식별자를 계속 사용할 수 있다. 이 값은 사용자-facing Provider 이름이 아니라 실행 서비스 route다.

## UI 규칙

- Image Block의 기본 선택 표시는 모델 이름을 사용한다.
- 인스펙터의 1차 요약은 `Model`을 먼저 보여주고, 서비스 계층은 `Served by`로만 보조 표시한다.
- `Provider`라는 라벨은 사용자가 이미지 모델 선택으로 오해할 수 있는 위치에서 피한다.

## 구현 규칙

- `providerId`는 기존 Go service adapter/routing 계약을 깨지 않기 위해 내부 필드로 유지한다.
- `modelSlug`와 model capability metadata가 사용자-facing 선택, schema mapping, ratio/control support의 기준이다.
- Replicate credential은 Campaign JSON, browser state, committed file에 저장하지 않는다.
