# Issue #38 Instagram DM Gate Comment Keyword Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit and, only if needed, tighten the offline fixture/tests proving that an Instagram comment keyword selects exactly one DM Gate response/resource variant and that non-matching comments return `no_match`.

**Architecture:** Keep the Direct Message plugin model as the canonical source of truth. Use the existing `InstagramDmActionConfiguration.responseMappings` array to map comment matcher IDs to a single DM Gate resource variant; do not add node types, a campaign-only schema, or a second quick-reply mapping system.

**Tech Stack:** TypeScript model fixtures/tests under `app/features/plugins/model`, Node's built-in test runner with `--experimental-strip-types`, Markdown docs/wiki notes.

---

## Scope Guard

- Work only on issue #38: comment keyword to DM Gate response fixtures.
- Do not inspect or implement #39, #40, or #41 except where existing files mention them as context.
- Do not implement live Meta OAuth, webhook receiver, Graph API transport, encrypted token storage, token UI, real DM sending, or real follow verification.
- Do not create new node types or n8n-like workflow surfaces.
- Do not stage, commit, push, or close issues.
- Preserve unrelated untracked file `docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-usability.md`.
- If no UI files change, record that no screenshot is required.

## Files

- Create: `docs/superpowers/plans/2026-05-19-issue-38-instagram-dm-gate-comment-keyword-fixtures.md`
- Audit/Modify only if required: `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`
- Audit/Modify only if required: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Audit only: `app/features/plugins/model/plugin-representation.ts`
- Audit only: `app/features/plugins/model/plugin-representation.test.ts`
- Audit only: `app/features/plugins/model/README.md`
- Append outcome: `wiki/log.md`

## Task 1: Verify Existing Fixture Contract

**Files:**
- Audit: `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`
- Audit: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Audit: `app/features/plugins/model/plugin-representation.ts`

- [x] **Step 1: Confirm the fixture maps one comment matcher to one DM Gate resource variant**

Expected fixture shape in `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`:

```ts
export const instagramDmGateActionConfigurationFixture = {
  schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
  capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
  triggerConfiguration: commentToDmActionConfigurationFixture.triggerConfiguration,
  message: {
    templateId: "template.follow-prompt",
    text: "Follow @owncanvas.fixture, then tap I follow to get the private launch guide.",
  },
  resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
  responseMappings: [
    {
      id: "mapping.drop-guide",
      triggerMatcherId: "condition.drop-link",
      message: {
        templateId: "template.drop-guide",
        text: "Your private launch guide is ready: {{resourceUrl}}",
      },
      resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
      attributionTermTemplate: "{{commentText}}",
      metadata: {
        route: "dm-gate-private-guide",
      },
    },
  ],
};
```

Acceptance check:

```ts
assert.equal(
  instagramDmGateActionConfigurationFixture.responseMappings.length,
  1,
);
```

- [x] **Step 2: Confirm the matching comment test selects the expected response/resource variant**

Expected assertion in `app/features/plugins/model/instagram-comment-dm-flow.test.ts`:

```ts
assert.deepEqual(
  selectInstagramDmResponseForCommentEvent(
    instagramDmGateActionConfigurationFixture,
    matchingCommentEventFixture,
  ),
  {
    matched: true,
    matcherId: "condition.drop-link",
    mappingId: "mapping.drop-guide",
    message: {
      templateId: "template.drop-guide",
      text: "Your private launch guide is ready: {{resourceUrl}}",
    },
    landingUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
    resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      content: "ig.media.fixture",
      term: "Please send the DROP link",
    },
  },
);
```

- [x] **Step 3: Confirm the no-match test covers non-matching comments**

Expected assertion in `app/features/plugins/model/instagram-comment-dm-flow.test.ts`:

```ts
assert.deepEqual(
  resolveInstagramDmGateActionOutcome(
    instagramDmGateActionConfigurationFixture,
    nonMatchingCommentEventFixture,
  ),
  {
    matched: false,
    reason: "no_matching_response_mapping",
    events: ["no_match"],
  },
);
```

- [x] **Step 4: Decide whether implementation changes are required**

Implementation is required only if any of the three checks above are missing or fail. If present and passing, do not touch the fixture/model files.

## Task 2: Add Minimal Fixture/Test Patch Only If Audit Fails

**Files:**
- Modify only if required: `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`
- Modify only if required: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`

- [x] **Step 1: If `responseMappings` does not contain a single DM Gate resource variant, replace only that fixture mapping**

Patch target in `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`:

```ts
responseMappings: [
  {
    id: "mapping.drop-guide",
    triggerMatcherId: "condition.drop-link",
    message: {
      templateId: "template.drop-guide",
      text: "Your private launch guide is ready: {{resourceUrl}}",
    },
    resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
    attributionTermTemplate: "{{commentText}}",
    metadata: {
      route: "dm-gate-private-guide",
    },
  },
],
```

- [x] **Step 2: If the matching assertion is missing, add it to the existing DM Gate fixture test**

Use the exact assertion from Task 1, Step 2.

- [x] **Step 3: If the no-match assertion is missing, add it to the existing DM Gate fixture test**

Use the exact assertion from Task 1, Step 3.

- [x] **Step 4: Do not add a second quick-reply mapping system**

Confirm no new structure parallel to `responseMappings` was introduced. `followGate.quickReplies` remains only the follow-check prompt/retry mechanism, not a keyword-to-response mapping system.

## Task 3: Verify Offline Model and Diff Hygiene

**Files:**
- Test: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Test: `app/features/plugins/model/plugin-representation.test.ts`

- [x] **Step 1: Run focused plugin tests**

Run:

```bash
node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts
```

Expected: exit code `0`, all tests pass.

- [x] **Step 2: Run whitespace/diff check**

Run:

```bash
git diff --check
```

Expected: exit code `0`, no whitespace errors.

- [x] **Step 3: Confirm no UI screenshot is required**

No UI files should change. If only model/test/docs/wiki files change, record that screenshots are not required.

## Task 4: Record Outcome and Evidence

**Files:**
- Modify: `wiki/log.md`

- [x] **Step 1: Append a Korean wiki log entry after verification**

Append this outcome shape with the actual verification result:

```md
## [2026-05-19] issue-38-dm-gate-comment-keyword-fixture-audit | Issue #38

- Superpowers plan `docs/superpowers/plans/2026-05-19-issue-38-instagram-dm-gate-comment-keyword-fixtures.md`에 따라 #38 범위만 감사했다.
- `instagramDmGateActionConfigurationFixture.responseMappings`가 comment keyword matcher `condition.drop-link`를 단일 DM Gate resource variant `mapping.drop-guide` / `COMMENT_TO_DM_GATE_RESOURCE_URL`로 매핑함을 확인했다.
- matching comment와 non-matching comment의 `selectInstagramDmResponseForCommentEvent()` / `resolveInstagramDmGateActionOutcome()` fixture coverage를 확인했다. non-matching comment는 `events: ["no_match"]`를 반환한다.
- 새 node type, 별도 quick-reply mapping system, live Meta OAuth/webhook/Graph API/token storage/token UI/real DM sending/real follow verification은 추가하지 않았다.
- UI 변경은 없으며 screenshot은 필요하지 않았다.
- 검증: `node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts` 통과, `git diff --check` 통과.
```

- [x] **Step 2: Re-check worktree status**

Run:

```bash
git status --short
```

Expected: changed plan file and `wiki/log.md` only unless Task 2 was necessary. The unrelated untracked file `docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-usability.md` remains unmodified and untracked.

## Acceptance Checklist

- [x] Existing comment keyword matching can select a DM Gate response/resource variant.
- [x] `responseMappings` map comment keywords to a single DM Gate response/resource variant.
- [x] Fixture covers a matching comment keyword selecting the expected DM Gate response/resource variant.
- [x] Fixture covers `no_match` for non-matching comments.
- [x] Existing comment-to-DM-to-landing tests remain passing.
- [x] `responseMappings` map comment keywords to one DM Gate response/resource variant without adding a second quick-reply mapping system.
- [x] No live Meta integration work was added.
- [x] No UI changed; screenshots were not required.
