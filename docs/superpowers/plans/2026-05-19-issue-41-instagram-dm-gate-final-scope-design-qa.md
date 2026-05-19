# Issue #41 Instagram DM Gate Final Scope Design QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the final issue #41 scope/design QA gate for the Instagram DM Gate first slice, without staging, committing, pushing, commenting on GitHub, or closing issues.

**Architecture:** Treat `docs/seeds/instagram-dm-gate.mcp.seed.yaml` as the seed contract and the Direct Message plugin model as the only canonical implementation surface. Audit the corrected issue-specific evidence for #37-#40 from commits `b7020d8`, `af37c58`, `15d6676`, and `b0fc6ea`, then verify that the current branch remains a model/tests/docs/wiki/seed first slice with no product-facing canvas UI implementation or live Meta integration.

**Tech Stack:** TypeScript model/tests, Node built-in test runner with `--experimental-strip-types`, npm typecheck, Git diff hygiene, `@google/design.md` lint, Markdown wiki/log evidence.

---

## Scope Guard

- Work only on GitHub issue #41.
- Do not work on #36 except to mention whether a final Epic rollup is needed.
- Do not modify #37-#40 artifacts except read-only evidence.
- Do not stage, commit, push, post GitHub comments, or close issues.
- Do not add live Meta OAuth, webhook receiver, Graph API transport, encrypted token storage, token UI, real DM sending, or real follow verification.
- Do not add new node types or n8n-like workflow complexity.
- Do not change UI/product-facing source files in this corrected #41 pass.
- If no UI source files change, explicitly state that browser screenshots are not required.
- If a concrete blocker appears, make the smallest #41-scoped safe fix only. If no safe targeted fix exists, report `PARTIAL` or `FAIL` and leave #41 open.

## Source Status

- `gh issue view 41 -R junho-baek/owncanvas --comments` was attempted before this plan and failed with `error connecting to api.github.com`; the sandbox cannot reach GitHub.
- A second `gh issue view 41 -R junho-baek/owncanvas --json number,title,state,body,comments` attempt also failed with the same connectivity error.
- Because GitHub issue content is unavailable from this sandbox, use the user-provided #41 gate requirements, the MCP seed, local wiki memory, corrected commits, and local source files as the audit source of truth. Do not pretend the GitHub CLI read succeeded.
- `npm run skills:check` reports the DDD/marketing external skills are missing; use project fallbacks `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, and `wiki/` per `AGENTS.md`.

## Files

- Create/execute plan: `docs/superpowers/plans/2026-05-19-issue-41-instagram-dm-gate-final-scope-design-qa.md`
- Read/audit: `docs/seeds/instagram-dm-gate.mcp.seed.yaml`
- Read/audit: `DESIGN.md`
- Read/audit: `wiki/index.md`
- Read/audit: `wiki/log.md`
- Read/audit: `app/features/plugins/model/README.md`
- Read/audit: `app/features/plugins/model/plugin-representation.ts`
- Read/audit: `app/features/plugins/model/plugin-representation.test.ts`
- Read/audit: `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`
- Read/audit: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Read-only evidence: `docs/superpowers/plans/2026-05-19-issue-37-instagram-dm-gate-schema-audit.md`
- Read-only evidence: `docs/superpowers/plans/2026-05-19-issue-38-instagram-dm-gate-comment-keyword-fixtures.md`
- Read-only evidence: `docs/superpowers/plans/2026-05-19-issue-39-instagram-dm-gate-follow-gate-outcomes.md`
- Read-only evidence: `docs/superpowers/plans/2026-05-19-issue-40-instagram-dm-gate-meta-credentials-docs.md`
- Append outcome: `wiki/log.md`

## Task 1: Audit #37-#40 Corrected Evidence

- [ ] **Step 1: Inspect corrected commit scope**

Run:

```bash
git show --name-only --format=fuller b7020d8
git show --name-only --format=fuller af37c58
git show --name-only --format=fuller 15d6676
git show --name-only --format=fuller b0fc6ea
```

Expected:
- #37 commit includes issue-specific plan and wiki evidence.
- #38 commit includes issue-specific plan and wiki evidence.
- #39 commit includes issue-specific plan and wiki evidence.
- #40 commit includes issue-specific plan, wiki evidence, and only the narrow plugin README docs fix if needed.

- [ ] **Step 2: Read issue-specific plan/evidence files**

Run:

```bash
sed -n '1,260p' docs/superpowers/plans/2026-05-19-issue-37-instagram-dm-gate-schema-audit.md
sed -n '1,280p' docs/superpowers/plans/2026-05-19-issue-38-instagram-dm-gate-comment-keyword-fixtures.md
sed -n '1,260p' docs/superpowers/plans/2026-05-19-issue-39-instagram-dm-gate-follow-gate-outcomes.md
sed -n '1,260p' docs/superpowers/plans/2026-05-19-issue-40-instagram-dm-gate-meta-credentials-docs.md
sed -n '1,120p' wiki/log.md
```

Expected: #37-#40 each have a dedicated Superpowers plan/evidence loop and no evidence of forbidden GitHub closure actions in this pass.

## Task 2: Audit Seed Scope Against Current Branch

- [ ] **Step 1: Compare branch diff against `main`**

Run:

```bash
git diff --name-status main..HEAD
git diff --name-only main..HEAD -- app/features/creative-canvas app/routes app/styles app/root.tsx package.json DESIGN.md .agents/product-marketing-context.md CONTEXT.md
git diff --name-only main..HEAD -- ':!app/features/plugins/model/**' ':!docs/seeds/**' ':!docs/superpowers/plans/**' ':!wiki/**'
```

Expected: current branch scope is limited to plugin model/tests/docs, MCP seed, Superpowers plans, and wiki. No UI/product-facing source files are changed by the corrected pass.

- [ ] **Step 2: Confirm first-slice exclusions**

Run:

```bash
rg -n "INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA|InstagramDmActionConfiguration|resolveInstagramDmGateActionOutcome|simulatedFollowStatus|Meta OAuth|webhook receiver|webhook receiving|Graph API|encrypted token|token storage|token UI|real DM|follow-state|FOLLOW_CHECK|prompt_sent|follow_check_requested|resource_link_ready|resource_link_sent|not_following_retry_prompted|no_match" app/features/plugins/model docs/seeds/instagram-dm-gate.mcp.seed.yaml wiki/concepts/plugin-extension-representation.md
```

Expected:
- Direct Message plugin `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA` remains canonical.
- Offline fixtures/tests use `simulatedFollowStatus`.
- Docs explicitly say live Meta OAuth/webhook/Graph/token UI/real DM/real follow-state are excluded.
- No new node type or n8n-like workflow implementation is present.

- [ ] **Step 3: Confirm product-facing canvas surface is not overclaimed**

Manual audit:
- `docs/seeds/instagram-dm-gate.mcp.seed.yaml` includes the future constraint that Campaign canvas must adapt/render one product-facing Instagram DM Gate action.
- Current branch does not modify Creative Canvas UI/routes and does not implement a product-facing campaign canvas action.
- Report this as an intentional first-slice boundary and recommend a separate follow-up issue for the product-facing canvas surface.

## Task 3: Apply Smallest Safe #41 Fix Only If Needed

- [ ] **Step 1: Decide whether any blocker requires a #41-scoped patch**

Patch only if the audit finds a concrete blocker in #41 scope that can be safely fixed without touching #37-#40 evidence files or UI/product-facing source.

Allowed patch examples:
- Append a fresh #41 outcome to `wiki/log.md`.
- Clarify this #41 plan/evidence file if execution details need to be recorded.

Forbidden patch examples:
- Editing #37-#40 plan files.
- Adding live Meta integration.
- Adding UI/product-facing campaign canvas changes.
- Staging, committing, pushing, commenting, or closing issues.

## Task 4: Run Verification Commands

- [ ] **Step 1: Run required focused model/canvas tests**

Run:

```bash
node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts app/features/creative-canvas/model/creative-canvas.test.ts
```

Expected: exit code `0`.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code `0`.

- [ ] **Step 3: Run diff whitespace check**

Run:

```bash
git diff --check
```

Expected: exit code `0`, no whitespace errors.

- [ ] **Step 4: Run DESIGN.md lint**

Run:

```bash
npx -y @google/design.md lint DESIGN.md
```

Expected: exit code `0`. Record warning/info counts if present.

- [ ] **Step 5: Inspect final worktree**

Run:

```bash
git status --short --branch
```

Expected: only allowed unstaged/untracked local files; nothing staged.

## Task 5: Record #41 Outcome

- [ ] **Step 1: Append Korean wiki log entry**

Add a fresh top entry to `wiki/log.md` with:
- plan path created first;
- #41-only scope;
- GitHub CLI issue read failure;
- #37-#40 corrected evidence summary;
- seed/design/scope checklist result;
- verification command results;
- screenshot not required because no UI files changed;
- product-facing campaign canvas surface not implemented and should be a separate follow-up issue;
- recommendation for whether #41 is ready to close.

- [ ] **Step 2: Final report**

Return:
- Plan path created.
- `PASS`/`PARTIAL`/`FAIL` checklist for #41.
- Verification command results.
- Whether any files changed.
- Screenshot required/not required and why.
- Follow-up issue recommendation for product-facing canvas surface.
- Recommendation: ready to close #41 or not.
