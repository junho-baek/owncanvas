# 위키 우선 에이전트 메모리 | Wiki-First Agent Memory

## 결론

OwnCanvas에서는 `wiki/`를 기본 장기 기억 저장소로 사용한다. `plans/`와 `context/`는 기본 경로가 아니라, 명시 요청이나 장기/고위험 실행 작업에서만 쓰는 보조 산출물로 둔다.

## 이유

- `plans/`와 `context/`를 매번 만들면 실행 로그가 흩어지고, 나중에 재사용할 결론을 다시 추려야 한다.
- OwnCanvas는 제품 언어, agent 운영, 마케팅 포지셔닝, 디자인 판단이 계속 누적되는 프로젝트라서 durable note가 더 중요하다.
- `llm-wiki`는 `wiki/index.md`와 `wiki/log.md`를 통해 읽기 시작점과 시간순 기록을 동시에 제공한다.

## 운영 규칙

- 작업자는 먼저 `wiki/index.md`를 읽고 관련 페이지를 최소한으로 읽는다.
- 의미 있는 작업 결과는 `wiki/log.md`에 남긴다.
- 반복 재사용 가능한 판단은 `wiki/concepts/`, `wiki/entities/`, `wiki/analyses/` 중 가장 맞는 위치에 남긴다.
- 새 위키 문서는 한국어 중심으로 쓰고, H1은 가능하면 `한국어 | English` 형식을 사용한다.
- 원본 자료를 저장해야 하면 `raw/`에 두고, 가능한 한 불변으로 취급한다.

## 예외

- 사용자가 plan/context 파일을 명시적으로 원할 때
- 긴 구현을 여러 단계로 나눠야 해서 실행 체크리스트가 따로 필요한 때
- 외부 workflow나 상위 repo 규칙이 `plans/` 또는 `context/` 산출물을 요구할 때

## 관련 페이지

- [색인 | Index](../index.md)
- [로그 | Log](../log.md)
