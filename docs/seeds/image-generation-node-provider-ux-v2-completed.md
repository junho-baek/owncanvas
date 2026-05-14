# Image Generation Node Provider UX v2 — Completed Checkpoint

Source seed: `docs/seeds/image-generation-node-provider-ux-v2.seed.yaml`

Ouroboros job: `job_30d549f26eb6`
Session: `orch_50b87b2508dc`
Execution: `exec_3492c58e75cb`
Status: safely cancelled by user request after checkpoint validation.

## Completed / checkpointed scope

The working tree after cancellation contains a validated checkpoint of the v2 direction:

- Default image generation creation now initializes vertical image generation model state.
- Ratio selector transitions persist selected output aspect-ratio state and frame foundations.
- Capability metadata foundations exist for image generation models.
- Initial image model registry entries declare default ratio and supported controls.
- Model capability fixtures cover vertical defaults and restricted unsupported options.
- Unsupported model options are hidden, disabled, or rejected by capability schema at the contract/test level.
- Replicate image model entries expose provider-specific schema metadata aligned with adapter concepts.
- Capability registry exposes keyed lookup API.
- Compact lifecycle/status feedback is modeled and rendered for idle/selected/running/completed/error-like states.
- Output-area states and compact status fixtures are covered without turning the node into a page-like generator.

## Verification at checkpoint

Passed:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts
npm run typecheck
npm run build
git diff --check
```

Focused test result: 47 passing tests.

## Not completed / split to remaining seed

See:

```text
docs/seeds/image-generation-node-provider-ux-v2-remaining.seed.yaml
```

Remaining areas include:

- Manual resize precedence between automatic ratio updates and user resize.
- Inspector/docs panel behavior.
- Reference attachment tray.
- Output-to-next-node contextual menu.
- Full browser screenshot evidence for the remaining interactions.
- Final integration documentation after those items land.
