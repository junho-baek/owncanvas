# Instagram DM Gate Seed Process Correction Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Correct the previous unattended Instagram DM Gate closure by applying an explicit `Using Superpowers.` issue-scoped plan/execution/QA loop to the MCP-generated seed, starting with reopened issue #41.

**Architecture:** Treat `docs/seeds/instagram-dm-gate.mcp.seed.yaml` and GitHub issues #36-#41 as the source of truth. Preserve the existing commit `170a959` unless the audit finds scope or design violations. Use #41 as the final scope/design gate before considering the first slice complete again.

**Tech Stack:** OwnCanvas TypeScript model/tests, Node test runner, GitHub CLI, DESIGN.md lint, Codex CLI with Superpowers prompts.

---

## Task 1: Audit the previous closure against the MCP seed

**Objective:** Determine exactly which seed acceptance criteria are satisfied by `170a959` and which were only assumed.

**Files:**
- Read: `docs/seeds/instagram-dm-gate.mcp.seed.yaml`
- Read: `app/features/plugins/model/plugin-representation.ts`
- Read: `app/features/plugins/model/plugin-representation.test.ts`
- Read: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Read: `app/features/plugins/model/README.md`
- Read: `wiki/concepts/plugin-extension-representation.md`
- Comment: GitHub issue `#41`

**Step 1: Produce an AC checklist**

For each acceptance criterion in the seed, record one of:
- `PASS` with file/line evidence
- `PARTIAL` with missing detail
- `FAIL` with required correction

**Step 2: Verify the product-facing surface claim**

Explicitly decide whether the current implementation satisfies this constraint:

> Campaign canvas must adapt/render one product-facing Instagram DM Gate action from the plugin model.

If the current implementation only pins the plugin model contract and fixtures, mark this as `PARTIAL` and open/prepare a follow-up slice instead of pretending it is done.

**Step 3: Comment findings on #41**

The comment must include:
- AC checklist summary
- tests run
- DESIGN.md lint result
- whether any UI/canvas files changed
- whether a follow-up issue is needed

---

## Task 2: Run focused verification commands

**Objective:** Reproduce verification with explicit commands and expected results.

**Files:**
- No source edits expected.

**Step 1: Run model/canvas focused tests**

```bash
node --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts app/features/creative-canvas/model/creative-canvas.test.ts
```

Expected: pass, with no failing tests.

**Step 2: Run DESIGN.md lint**

```bash
npx -y @google/design.md lint DESIGN.md
```

Expected: zero errors. Existing warnings are acceptable only if unrelated to this slice.

**Step 3: Inspect diff scope**

```bash
git show --name-only --format='' 170a959
```

Expected: model/tests/docs/wiki/seed only. If UI files changed, perform browser/screenshot QA before closing #41.

---

## Task 3: Correct documentation or issue state if the audit finds overclaiming

**Objective:** Ensure GitHub state matches what was actually built.

**Files:**
- Potentially modify: `app/features/plugins/model/README.md`
- Potentially modify: `wiki/concepts/plugin-extension-representation.md`
- Potentially create: a new GitHub issue for campaign canvas surface slice

**Step 1: If product-facing canvas surface is not implemented, do not claim it is**

Add/keep language that this slice is a model/tests/docs contract only.

**Step 2: Create a follow-up issue if needed**

Suggested title:

```txt
[Task] Surface Instagram DM Gate as one campaign canvas action
```

Required body points:
- Uses canonical Direct Message plugin model
- No node explosion
- DESIGN.md strict UI QA
- browser/screenshot evidence required before close
- no live Meta OAuth/webhook/Graph transport in this UI slice unless separately seeded

**Step 3: Close #41 only after evidence is recorded**

Do not close #41 unless the comment includes evidence for every relevant gate.

---

## Task 4: Commit only intentional process documentation changes

**Objective:** Preserve the correction plan and any necessary docs fixes.

**Files:**
- Add: `docs/superpowers/plans/2026-05-19-instagram-dm-gate-seed-process-correction.md`
- Do not stage unrelated: `docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-usability.md` unless intentionally needed.

**Step 1: Check status**

```bash
git status --short
```

**Step 2: Stage only intentional files**

```bash
git add docs/superpowers/plans/2026-05-19-instagram-dm-gate-seed-process-correction.md
```

**Step 3: Commit**

```bash
git commit -m "docs: add instagram dm gate process correction plan"
```

**Step 4: Push**

```bash
git push origin codex/cli-agent-usability
```
