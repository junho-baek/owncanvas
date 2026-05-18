# Issue #37 Instagram DM Gate Schema Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit GitHub issue #37 only against commit `170a959` and the Instagram DM Gate MCP seed, changing code only if the canonical Direct Message plugin schema is concretely incomplete.

**Architecture:** Treat `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA` and `InstagramDmActionConfiguration` in `app/features/plugins/model/plugin-representation.ts` as the only allowed canonical source. Verify the schema through focused model fixtures/tests and docs; do not add campaign-only schemas, new node types, or live Meta integration.

**Tech Stack:** TypeScript plugin model, Node test runner, GitHub CLI where reachable, OwnCanvas wiki memory.

---

### Task 1: Reconfirm Issue #37 Inputs

**Files:**
- Read: `docs/seeds/instagram-dm-gate.mcp.seed.yaml`
- Read: `DESIGN.md`
- Read: `app/features/plugins/model/plugin-representation.ts`
- Read: `app/features/plugins/model/plugin-representation.test.ts`
- Read: `app/features/plugins/model/README.md`
- Read: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Read: `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`

- [x] Run `gh issue view 37 -R junho-baek/owncanvas --comments`; if unavailable, record the failure and use the seed plus the user-provided #37 scope as the audit source.
- [x] Inspect `git show --stat --oneline 170a959` and the relevant DM Gate diff hunks.

### Task 2: Audit #37 Acceptance Criteria

**Files:**
- Read: same files as Task 1.

- [x] Verify canonical source: Direct Message plugin `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA`, no separate campaign-only DM Gate schema.
- [x] Verify required fields: `schemaVersion`, `campaignId`, `capabilityId`, `triggerConfiguration`, prompt/message template, `landingUrl` or `resourceUrl`, and `responseMappings`.
- [x] Verify `responseMappings` select one DM Gate response/resource variant from existing comment matcher configuration.
- [x] Verify optional `followGate` contract exists only as offline schema/config: `checkQuickReply`, `successMessage`, `notFollowingMessage`, `quickReplies`, and fixture-only `simulatedFollowStatus` when enabled.
- [x] Verify `FOLLOW_CHECK` ownership and modeled events: `prompt_sent`, `follow_check_requested`, `resource_link_ready`, `resource_link_sent`, `not_following_retry_prompted`, and `no_match`.
- [x] Verify no live Meta OAuth, webhook receiver, Graph API transport, encrypted token storage, token UI, or real DM sending was introduced for #37.

### Task 3: Fix Only Concrete #37 Gaps

**Files:**
- Potentially modify: `app/features/plugins/model/plugin-representation.ts`
- Potentially modify: `app/features/plugins/model/plugin-representation.test.ts`
- Potentially modify: `app/features/plugins/model/README.md`

- [x] If every #37 requirement is satisfied, do not edit source code.
- [x] If a requirement is missing, make the smallest model/test/doc change that closes only that #37 gap.

### Task 4: Verify and Record Evidence

**Files:**
- Modify: `wiki/log.md`

- [x] Run `node --test app/features/plugins/model/plugin-representation.test.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts`.
- [x] Append a concise Korean outcome entry to `wiki/log.md`.
- [x] Leave GitHub issue #37 open; do not stage, commit, push, or close issues.
