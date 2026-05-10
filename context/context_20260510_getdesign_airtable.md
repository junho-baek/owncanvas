# GetDesign Airtable Context

## 작업 요약

- 사용자가 지정한 `npx getdesign@latest add airtable` 명령을 OwnCanvas 루트에서 실행했다.
- CLI가 `getdesign@0.6.17`을 설치 후 Airtable-inspired `DESIGN.md`를 생성했다.
- `README.md`에 앞으로 UI 작업 시 `DESIGN.md`를 기준으로 삼는다고 명시했다.

## 생성/변경 파일

- `DESIGN.md`
- `README.md`
- `plans/20260510_getdesign_airtable.md`
- `context/context_20260510_getdesign_airtable.md`

## 확인한 디자인 방향

- White canvas, dark ink typography, near-black primary CTA
- Hairline borders and restrained shadows
- 10-12px radius hierarchy
- Coral, forest, cream, peach, mint 등 signature surface card palette
- Hover보다 default/active state 중심

## 검증

- `npm run typecheck` 통과

## 남은 리스크

- 현재 Creative Canvas 화면은 아직 `DESIGN.md` 스타일을 완전히 재스킨하지 않았다.
- 다음 UI 변경부터는 `DESIGN.md` 토큰과 컴포넌트 규칙을 우선 기준으로 적용해야 한다.
