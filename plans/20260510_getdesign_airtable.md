# 20260510 GetDesign Airtable

## 배경

OwnCanvas Creative Canvas UI는 현재 직접 작성한 Tailwind/CSS 기반이다. 사용자가 Airtable 계열 design system을 `getdesign`으로 적용하길 요청했다.

## 목표

- `npx getdesign@latest add airtable` 명령으로 Airtable 디자인 시스템 자산을 추가한다.
- 추가된 파일과 기존 Creative Canvas UI의 충돌 여부를 확인한다.
- 타입체크와 로컬 화면 확인으로 회귀를 검증한다.

## 범위

- `getdesign` 명령 실행으로 생성/수정되는 디자인 시스템 파일
- 필요한 경우 import/style 경로 정리
- 검증 로그 문서화

## 변경 파일

- 명령 실행 후 확인
- `context/context_20260510_getdesign_airtable.md`

## 테스트

- `npm run typecheck`
- `http://127.0.0.1:5173/` 로컬 화면 확인

## 롤백

- `getdesign`이 추가한 파일과 관련 import/style 변경을 되돌린다.

## 리스크

- `getdesign` CLI가 프로젝트 구조를 잘못 추론하면 불필요한 config 또는 component 파일이 생길 수 있다.
- 기존 Tailwind v4/RR7 설정과 생성 파일이 맞지 않을 수 있다.

## 결과

- `npx getdesign@latest add airtable` 실행 완료.
- `DESIGN.md` 생성 확인.
- `README.md`에 디자인 시스템 기준과 설치 명령을 기록했다.
- 연결 context: `context/context_20260510_getdesign_airtable.md`
