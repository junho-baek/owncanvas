# 20260510 Generation Palette Blocks

## 배경

OwnCanvas의 도메인 언어가 workflow-first에서 Creative Operator가 Campaign Canvas에서 결과물을 만드는 방향으로 정리됐다. 현재 UI는 DNDN workflow surface를 가져왔지만, 팔레트와 실제 생성 블록이 부족하다.

## 목표

- Creative Canvas 문맥에 맞춰 Text, Image, Video, Voice Block을 MVP 팔레트에 포함한다.
- 사용자-facing 용어는 Workflow Node보다 Generation Block을 우선한다.
- 모듈명을 workflow-canvas에서 creative-canvas로 정렬한다.

## 범위

- 도메인 glossary와 product marketing context 문서 갱신
- Creative Canvas 모델과 React Flow adapter 정리
- Generation Palette UI와 네 가지 generation block 렌더링
- 로컬 타입체크 및 브라우저 확인

## 변경 파일

- `CONTEXT.md`
- `.agents/product-marketing-context.md`
- `README.md`
- `app/routes/home.tsx`
- `app/features/creative-canvas/**`
- `app/app.css`
- `context/context_20260510_generation_palette_blocks.md`

## 테스트

- `npm run typecheck`
- 로컬 dev server에서 `http://127.0.0.1:5173/` 확인
- In-app browser screenshot으로 팔레트와 네 블록 렌더링 확인

## 롤백

- `creative-canvas` 변경을 이전 `workflow-canvas` scaffold로 되돌린다.
- 문서 변경은 `CONTEXT.md`와 `.agents/product-marketing-context.md`에서 해당 용어 섹션을 되돌린다.

## 리스크

- Campaign/Creative Canvas 언어가 코드와 README에 일부만 반영되면 제품 언어가 다시 섞일 수 있다.
- 팔레트가 workflow builder처럼 보이면 1차 사용자 프레임이 흐려질 수 있다.

## 결과

- `CONTEXT.md`에 Text/Image/Video/Voice Block을 MVP Generation Palette로 확정했다.
- `.agents/product-marketing-context.md` V1을 작성했다.
- `workflow-canvas` 모듈을 `creative-canvas`로 이동하고, model/adapter/components 경계를 나눴다.
- 화면에 Generation Palette와 네 가지 block을 표시했다.
- 연결 context: `context/context_20260510_generation_palette_blocks.md`
