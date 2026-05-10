# 로그 | Log

위키 ingest, query, lint, 유지보수, 구현 결과를 시간순으로 남기는 append-only 기록이다.

## [2026-05-10] scaffold | llm-wiki 초기화

- `llm-wiki` 스킬을 OwnCanvas 스킬 레지스트리에 추가했다.
- `python3 /Users/baekjunho/.codex/skills/llm-wiki/scripts/init_wiki.py .`로 `raw/`와 `wiki/` 구조를 생성했다.
- OwnCanvas 루트 운영 원칙을 `wiki-first`로 조정했다.
- 앞으로 의미 있는 작업 결과는 기본적으로 `wiki/log.md`와 관련 wiki page에 남긴다.
