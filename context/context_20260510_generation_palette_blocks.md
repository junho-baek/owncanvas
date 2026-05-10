# Generation Palette Blocks Context

## 작업 요약

- OwnCanvas 도메인 언어를 Creative Canvas, Creative Operator, Campaign 중심으로 유지했다.
- MVP Generation Palette에 Text Block, Image Block, Video Block, Voice Block을 확정했다.
- `workflow-canvas` 구현을 `creative-canvas` 모듈로 이동했다.
- React Flow 결합은 `adapters/react-flow-canvas.ts`로 분리하고, campaign/generation block 언어는 `model/creative-canvas.ts`에 뒀다.
- `.agents/product-marketing-context.md` V1을 작성해 마케팅/포지셔닝 컨텍스트를 저장했다.

## DDD 판단

- 사용자-facing 용어는 `Workflow Node`가 아니라 `Generation Block`으로 정리했다.
- `LLM Node`는 구현 관점의 말로 두고, UI/문서에서는 `Text Block`으로 표현한다.
- `Campaign`은 1차 저장 단위이고, `Workflow`는 반복 패턴에서 나중에 추출되는 2차 구조다.

## 변경 파일

- `CONTEXT.md`
- `.agents/product-marketing-context.md`
- `README.md`
- `app/routes/home.tsx`
- `app/features/creative-canvas/model/creative-canvas.ts`
- `app/features/creative-canvas/adapters/react-flow-canvas.ts`
- `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- `app/app.css`

## 검증

- `npm run typecheck` 통과.
- `curl -I http://127.0.0.1:5173/` 200 응답 확인.
- Playwright in-app browser에서 `http://127.0.0.1:5173/` 확인.
- Generation Palette에 Text/Image/Video/Voice Block 버튼이 보이는 것 확인.
- Voice Block 클릭 후 status가 `5 blocks`로 증가하는 것 확인.

## 남은 리스크

- 아직 provider 실행, local file persistence, campaign 저장/로드는 mock 상태다.
- 팔레트 블록은 생성 가능하지만 새 블록을 edge에 자동 연결하지 않는다.
- Text/Image/Video/Voice provider binding은 다음 단계에서 별도 Module로 분리해야 한다.
