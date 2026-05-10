# Skill Registry And Remote Setup Context

## 작업 요약

- OwnCanvas 프로젝트 루트에 `AGENTS.md`를 추가했다.
- 외부 스킬 본문을 vendoring하지 않고, `.agents/skills/registry.json`에 기대 스킬, 설치 위치, 복구 명령, fallback을 기록했다.
- `.agents/skills/README.md`에 원격 clone 환경에서 스킬을 확인하고 복구하는 절차를 문서화했다.
- `scripts/check-skills.mjs`와 `package.json` script를 추가해 `npm run skills:check`로 누락 스킬을 확인할 수 있게 했다.

## 변경 파일

- `AGENTS.md`
- `.agents/skills/README.md`
- `.agents/skills/registry.json`
- `scripts/check-skills.mjs`
- `package.json`
- `README.md`
- `plans/20260510_skill_registry_and_remote_setup.md`
- `context/context_20260510_skill_registry_and_remote_setup.md`

## 설계 판단

- 전역 skill 본문을 repo에 통째로 복사하지 않았다. 스킬 원본이 바뀌면 repo 안 vendored copy가 낡기 쉽고, 공개/비공개 출처가 섞일 수 있기 때문이다.
- 대신 OwnCanvas repo 안에는 `skill registry + checker + fallback docs`를 두었다.
- DDD/marketing 스킬은 공개 canonical install URL을 특정하지 않고 `TRUSTED_SKILLS_DIR` 기반 복구 명령으로 안내한다.
- gstack과 superpowers는 현재 로컬에 설정된 git remote를 기준으로 복구 명령을 기록했다.

## 검증

- `npm run skills:check` 통과: 현재 로컬에서 15개 기대 스킬 모두 발견.
- `npm run skills:check:strict` 통과.
- `HOME=/tmp/owncanvas-empty-home npm run skills:check` 통과: 스킬 없는 환경에서 missing 목록, install/restore 명령, fallback 안내 출력 확인.
- `npm run typecheck` 통과.
- `git diff --check` 통과.

## 남은 리스크

- `TRUSTED_SKILLS_DIR`는 팀/개인 환경에서 별도로 제공해야 한다.
- 체크 명령은 `SKILL.md` 파일 존재 여부만 확인하며, 스킬 내용의 버전 호환성까지 검증하지는 않는다.
