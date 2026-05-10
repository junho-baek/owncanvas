# 개요 | Overview

## 범위

이 위키는 OwnCanvas의 장기 프로젝트 기억을 관리한다. 제품 언어, 도메인 판단, 마케팅 포지셔닝, 디자인 시스템, agent 운영 규칙, 반복되는 구현 결론을 다시 파생하지 않도록 압축해서 남긴다.

## 현재 Thesis

- OwnCanvas는 이미 여러 AI 도구와 provider를 쓰는 creative operator를 위한 local-first open creative canvas다.
- 사용자-facing 1차 모델은 Workflow가 아니라 Campaign, Creative Canvas, Generation Block, Creative Output이다.
- 반복되는 생성 흐름은 나중에 Workflow로 추출될 수 있지만, 첫 화면과 초기 제품 가치는 campaign creative output 생산에 둔다.
- 프로젝트 memory는 `plans/`/`context/`보다 `wiki/`를 기본 durable layer로 삼는다.

## 열린 질문

- 기존 `plans/`와 `context/` 파일을 장기적으로 `wiki/`에 요약 편입할지, 아니면 legacy 기록으로만 둘지 결정해야 한다.
- provider 실행, local file persistence, campaign 저장/로드가 구현될 때 어떤 concept/entity page를 먼저 만들지 정해야 한다.

## 핵심 페이지

- [색인 | Index](index.md)
- [로그 | Log](log.md)
- [위키 우선 에이전트 메모리 | Wiki-First Agent Memory](concepts/wiki-first-agent-memory.md)
