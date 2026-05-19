# Issue 39 Instagram DM Gate Follow-Gate Outcomes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit and verify GitHub issue #39 only: offline Instagram DM Gate follow-gate dispatch outcomes.

**Architecture:** The Direct Message plugin Instagram DM action configuration remains the canonical model. `resolveInstagramDmGateActionOutcome()` is the offline dispatcher contract; it derives deterministic outcome events from comment fixture selection, the optional `followGate`, a quick reply payload, and fixture-only `simulatedFollowStatus`.

**Tech Stack:** TypeScript model code, Node test runner with `--experimental-strip-types`, Markdown wiki/log, no live Meta transport.

---

## Scope Guard

- Selected issue: `#39` only, "[Task] Offline follow-gate dispatch outcomes".
- Do not inspect, implement, comment on, stage, commit, push, or close issues `#40`, `#41`, or `#36`.
- Do not schedule cron jobs.
- Preserve unrelated untracked file `docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-usability.md`.
- Do not implement live Meta OAuth, webhook receiver, Graph API transport, encrypted token storage, token UI, real DM sending, or real follow verification.
- Do not create new node types.
- Do not introduce n8n-like workflow complexity.
- Do not duplicate a Campaign-only schema; `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA` is canonical.
- If no #39 source/test gap is found, do not invent production code changes.
- UI/product-facing source changes are out of scope for this audit. If no UI changes occur, screenshot evidence is not required.

## Source Status

- `gh issue view 39 -R junho-baek/owncanvas --comments` was attempted before this plan and failed with `error connecting to api.github.com`; network access is unavailable in this sandbox.
- The audit source of truth for #39 is therefore the user-provided issue scope/acceptance criteria, `docs/seeds/instagram-dm-gate.mcp.seed.yaml`, `DESIGN.md`, wiki memory, and the listed plugin model/fixture/test files.
- `npm run skills:check` reports missing DDD/marketing external skills; use `CONTEXT.md`, `.agents/product-marketing-context.md`, `DESIGN.md`, and `wiki/` fallback per project rules.

## Files

- Read/audit: `docs/seeds/instagram-dm-gate.mcp.seed.yaml`
- Read/audit: `app/features/plugins/model/plugin-representation.ts`
- Read/audit: `app/features/plugins/model/plugin-representation.test.ts`
- Read/audit: `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`
- Read/audit: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Read if needed: `app/features/plugins/model/README.md`
- Modify after verification: `wiki/log.md`
- Do not modify: `docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-usability.md`

## Acceptance Criteria Audit Map

- Dispatch output can include Quick Reply prompt:
  - Expected code evidence: `resolveInstagramDmGateActionOutcome()` returns `events: ["prompt_sent"]` with `quickReplies` when `followGate.enabled === true` and no `FOLLOW_CHECK` quick reply payload is supplied.
  - Expected test evidence: `plugin-representation.test.ts` and/or `instagram-comment-dm-flow.test.ts` assert the `prompt_sent` outcome with quick replies.
- Modeled outcomes include following success/resource-link dispatch and not-following retry prompt:
  - Expected code evidence: `simulatedFollowStatus === true` returns `follow_check_requested`, `resource_link_ready`, and `resource_link_sent`; `simulatedFollowStatus === false` returns `follow_check_requested` and `not_following_retry_prompted`.
  - Expected test evidence: focused assertions cover both true and false simulated follow status paths.
- Dispatch/outcome event names are derived around `prompt_sent`, `follow_check_requested`, `resource_link_ready`, `resource_link_sent`, `not_following_retry_prompted`, and `no_match`:
  - Expected code evidence: `InstagramDmGateActionEventName` union includes only those names for this slice.
  - Expected test evidence: assertions cover the named events.
- Tests use deterministic fixture/mock `simulatedFollowStatus` only:
  - Expected code evidence: `followGate.simulatedFollowStatus` is a boolean validation requirement for enabled follow gates.
  - Expected test evidence: fixtures set `simulatedFollowStatus` directly; no Meta API, webhook, OAuth, token storage, or real follow check appears in the #39 paths.
- All behavior is verified offline with fixtures/tests only:
  - Expected command evidence: the required Node test command passes locally.
  - Expected scope evidence: no live Meta or network transport code is added.

### Task 1: Audit Existing #39 Model And Tests

**Files:**
- Read: `app/features/plugins/model/plugin-representation.ts`
- Read: `app/features/plugins/model/plugin-representation.test.ts`
- Read: `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`
- Read: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`

- [ ] **Step 1: Confirm the offline event vocabulary**

Run:

```bash
rg -n "InstagramDmGateActionEventName|prompt_sent|follow_check_requested|resource_link_ready|resource_link_sent|not_following_retry_prompted|no_match" app/features/plugins/model/plugin-representation.ts
```

Expected: the model defines the six #39 event names and the resolver uses them.

- [ ] **Step 2: Confirm Quick Reply prompt and follow-check branches**

Run:

```bash
rg -n "quickReplies|checkQuickReply|simulatedFollowStatus|resolveInstagramDmGateActionOutcome" app/features/plugins/model/plugin-representation.ts app/features/plugins/model/plugin-representation.test.ts app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts
```

Expected: enabled follow gates require quick replies and deterministic `simulatedFollowStatus`; tests assert prompt, following, not-following, and no-match behavior.

- [ ] **Step 3: Confirm no #39 source gap**

Manual audit result expected:

```text
No source code gap: existing model/tests satisfy #39.
```

If a source gap is found, stop and patch only the smallest relevant model/test file from the audited file list, then run the focused test added or changed. Do not add live Meta behavior, new node types, workflow abstractions, or Campaign-only schemas.

### Task 2: Run Required Offline Verification

**Files:**
- Test: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Test: `app/features/plugins/model/plugin-representation.test.ts`

- [ ] **Step 1: Run the required #39 test command**

Run:

```bash
node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run diff whitespace check**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 3: Run focused command if a test/source change was made**

Run only if a model or test was changed:

```bash
node --experimental-strip-types --test app/features/plugins/model/plugin-representation.test.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts
```

Expected: all focused tests pass.

### Task 3: Record Durable Outcome

**Files:**
- Modify: `wiki/log.md`

- [ ] **Step 1: Append the #39 audit outcome to wiki memory**

Add a new Korean wiki log entry for this audit with:

```markdown
## [2026-05-19] issue-39-offline-follow-gate-dispatch-outcomes-audit | Issue #39

- Superpowers plan `docs/superpowers/plans/2026-05-19-issue-39-instagram-dm-gate-follow-gate-outcomes.md`에 따라 #39 범위만 감사했다.
- GitHub CLI issue 조회는 sandbox 네트워크 제한으로 실패했으며, 사용자 제공 #39 AC와 local seed/code/wiki context를 기준으로 감사했다.
- `resolveInstagramDmGateActionOutcome()`와 fixture/test coverage가 `prompt_sent`, `follow_check_requested`, `resource_link_ready`, `resource_link_sent`, `not_following_retry_prompted`, `no_match` offline outcome을 `simulatedFollowStatus`로 검증함을 확인했다.
- live Meta OAuth/webhook/Graph API/token storage/token UI/real DM sending/real follow verification, 새 node type, n8n-like workflow, Campaign-only schema 변경은 없다.
- 검증: required plugin model test command 통과, `git diff --check` 통과.
```

- [ ] **Step 2: Re-run `git diff --check` after the wiki edit**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

### Task 4: Final Evidence Report

**Files:**
- No file modifications.

- [ ] **Step 1: Summarize acceptance criteria**

Return PASS/PARTIAL/FAIL for each #39 acceptance criterion:

```text
Dispatch output can include Quick Reply prompt: PASS/PARTIAL/FAIL
Modeled outcomes include following success/resource-link dispatch and not-following retry prompt: PASS/PARTIAL/FAIL
Dispatch/outcome event names are derived around the six named events: PASS/PARTIAL/FAIL
Tests use deterministic fixture/mock simulatedFollowStatus only: PASS/PARTIAL/FAIL
All behavior is verified offline with fixtures/tests only: PASS/PARTIAL/FAIL
```

- [ ] **Step 2: Include required process evidence**

Report:

```text
Selected issue: #39
Result: PASS/PARTIAL/FAIL
Plan file path: docs/superpowers/plans/2026-05-19-issue-39-instagram-dm-gate-follow-gate-outcomes.md
Files changed: ...
Verification commands and result summaries: ...
Screenshot: required/not required and why
Scope guard statement: no live Meta/new node type/n8n workflow/campaign-only schema
Hermes next action: leave open/commit/comment/close guidance
```

- [ ] **Step 3: Confirm no forbidden git actions**

Run:

```bash
git status --short --branch
```

Expected: branch status shows only allowed unstaged/untracked local files; no staging, commit, push, or issue close/comment occurred.
