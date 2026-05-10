# 20260510 Skill Registry And Remote Setup

## 배경

OwnCanvas 작업에는 DDD, marketing, gstack, superpowers 계열 스킬을 자주 사용한다. 하지만 원격 clone 환경에서는 전역 `~/.codex/skills`, `~/.codex/superpowers`, `~/.gstack` 스킬이 없을 수 있다.

## 목표

- 프로젝트가 기대하는 외부 스킬 목록을 repo 안에서 확인 가능하게 만든다.
- 원격 clone에서 누락 스킬을 바로 확인할 수 있는 명령을 추가한다.
- 누락 시 전체 스킬 본문을 vendoring하지 않고, fallback 문서와 설치/복구 경로를 명시한다.

## 범위

- 프로젝트 루트 `AGENTS.md`
- `.agents/skills/` 레지스트리와 안내 문서
- `scripts/` 스킬 체크 명령
- `package.json` script
- `README.md` 원격 setup 안내

## 변경 파일

- `AGENTS.md`
- `.agents/skills/README.md`
- `.agents/skills/registry.json`
- `scripts/check-skills.mjs`
- `package.json`
- `README.md`
- `context/context_20260510_skill_registry_and_remote_setup.md`

## 테스트

- `npm run skills:check`
- `npm run skills:check:strict`
- `npm run typecheck`
- `git diff --check`

## 롤백

- 추가된 스킬 레지스트리/스크립트/문서 변경을 되돌린다.
- `package.json`의 `skills:*` script를 제거한다.

## 리스크

- 외부 스킬 pack의 정확한 설치 URL은 환경마다 다를 수 있다.
- 체크 명령은 스킬 존재 여부를 확인할 뿐, 스킬 내용의 최신성이나 품질까지 보장하지 않는다.

## 결과

- OwnCanvas 루트에 `AGENTS.md`를 추가해 프로젝트-local agent 지침을 고정했다.
- `.agents/skills/registry.json`에 DDD, marketing, gstack, superpowers 의존 스킬 목록과 fallback을 기록했다.
- `npm run skills:check` / `npm run skills:check:strict` 명령을 추가했다.
- `HOME=/tmp/owncanvas-empty-home npm run skills:check`로 원격 clone처럼 스킬이 없는 환경의 안내 출력을 확인했다.
- 연결 context: `context/context_20260510_skill_registry_and_remote_setup.md`
