# Issue 42 Instagram DM Gate Meta Runbook Env Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the docs-only Meta operator runbook and environment contract for the Direct Message plugin's Instagram DM Gate action without adding live Instagram automation.

**Architecture:** Keep this slice limited to Markdown documentation, `.env.example` comments, one README link, and one wiki log entry. The runbook explains hosted versus self-host ownership, local HTTPS setup, Meta dashboard URLs, staging/production separation, and secret handling while preserving OwnCanvas language: Campaign, Creative Canvas, Direct Message plugin, and Instagram DM Gate action.

**Tech Stack:** Markdown, `.env.example` comments, GitHub CLI for issue context when available, `npm run skills:check`, `rg`, `git diff --check`, and `git status --short --branch`.

---

## Source Context

- Approved slice plan: `docs/superpowers/plans/2026-05-19-instagram-dm-gate-live-meta-integration-plan.md`
- Seed: `docs/seeds/instagram-dm-gate.mcp.seed.yaml`
- Plugin model docs: `app/features/plugins/model/README.md`
- Product language: `CONTEXT.md`, `.agents/product-marketing-context.md`, and `DESIGN.md`
- Persistent memory: `wiki/index.md` and `wiki/log.md`
- Issue context command attempted before editing: `gh issue view 42 -R junho-baek/owncanvas --comments`
- If GitHub CLI cannot reach `api.github.com`, use the user-provided issue #42 scope and acceptance criteria as the source of truth, and record the failure in final evidence.

## Scope Guard

- Do not stage, commit, push, post GitHub comments, create issues, or close issues.
- Do not implement live Meta OAuth, webhook receiver routes, Graph API transport, token exchange, token storage, Private Reply or DM sending, Quick Reply webhook handling, real follow verification, or Campaign canvas UI.
- Do not add secrets, real tokens, real app secrets, real verify tokens, or raw credentials anywhere.
- Do not introduce n8n-like node explosion or provider/debug jargon as product copy.
- State explicitly that this slice does not make Instagram automation run.

## Files

- Create: `docs/meta/instagram-dm-gate-operator-runbook.md`
- Create: `.env.example`
- Modify: `app/features/plugins/model/README.md`
- Modify: `wiki/log.md`

---

### Task 1: Create Meta Operator Runbook

**Files:**
- Create: `docs/meta/instagram-dm-gate-operator-runbook.md`

- [ ] **Step 1: Create `docs/meta/` and add the runbook**

Write `docs/meta/instagram-dm-gate-operator-runbook.md` with these sections:

```markdown
# Instagram DM Gate Operator Runbook

This runbook is for operators preparing Meta app settings for the OwnCanvas Direct Message plugin and its Instagram DM Gate action. It is a docs/env-contract slice only; it does not make Instagram automation run.

## What This Slice Does

- Documents the safe setup path for a Meta app that may later connect to an OwnCanvas Campaign.
- Defines the environment variable names OwnCanvas expects for hosted, self-hosted, local, staging, and production paths.
- Keeps the Creative Canvas product model simple: one Direct Message plugin action, the Instagram DM Gate action, not a workflow made of many Meta-specific nodes.

## What This Slice Does Not Do

- No live Meta OAuth.
- No webhook receiver route.
- No Graph API transport.
- No token exchange or token storage.
- No Private Reply or DM sending.
- No Quick Reply webhook handling.
- No real follow verification.
- No Campaign canvas UI.

## Ownership Model

Hosted OwnCanvas can use OwnCanvas-owned Meta apps in the OwnCanvas Business Portfolio when that hosted product path exists. Hosted secrets belong in the hosted secret store and must not appear in chats, docs, issues, test fixtures, or Campaign JSON.

Self-hosted OwnCanvas uses the operator's own Meta developer account, Business Portfolio, app, Facebook Page, and Instagram Professional account. Self-hosted secrets belong in local environment files such as `.env.local`, deployment environment variables, or the operator's secret store.

The App ID is not a secret and may be shared when needed for debugging. The App Secret, access token values, webhook verify token, long-lived tokens, authorization codes, and callback query values must go into env or a secret store, not chat, docs, issues, fixtures, browser storage, or Campaign JSON.

## Required Meta Dashboard Setup

1. Create or choose a Meta developer account and Business Portfolio that should own the app.
2. Create separate Meta apps for local/development, staging, and production, or explicitly keep a single development app limited to local experiments.
3. Confirm the Instagram account is a Professional account and confirm whether the selected Meta API path requires a linked Facebook Page.
4. Record non-secret account metadata outside committed fixtures: Meta App ID, Facebook Page ID, and Instagram account ID.
5. Set `PUBLIC_BASE_URL` to the public HTTPS origin for the current environment.
6. Register the OAuth redirect URL derived from `PUBLIC_BASE_URL`: `https://<public-host>/api/meta/instagram/oauth/callback`.
7. Register the webhook callback URL derived from `PUBLIC_BASE_URL`: `https://<public-host>/api/meta/instagram/webhooks`.
8. Generate a webhook verify token locally and store it as `OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN`. Do not reuse the App Secret as the webhook verify token.
9. Store `OWNCANVAS_META_APP_SECRET` and any manual test access token only in env or a secret store.

## Self-Host Local Path

1. Start OwnCanvas locally.
2. Start an HTTPS tunnel such as ngrok, Cloudflare Tunnel, Tailscale Funnel, or localtunnel.
3. Set `PUBLIC_BASE_URL` to the tunnel's HTTPS origin.
4. Register the environment-specific OAuth redirect URL in the Meta dashboard.
5. Register the environment-specific webhook callback URL in the Meta dashboard.
6. Put secret values in `.env.local` or another local secret store, never in `.env.example`.
7. Restart the local app after changing env values.

Local `localhost` URLs are not enough for Meta callbacks. The callback origin must be reachable by Meta over HTTPS.

## Staging And Production Separation

Use separate Meta apps or clearly separated app settings for staging and production. Each environment needs its own `PUBLIC_BASE_URL`, OAuth redirect URL, webhook callback URL, webhook verify token, and secret-store entries. Staging test tokens must not be copied into production, and production secrets must not be copied into docs, chats, issues, fixtures, or local demo Campaigns.

## Environment Contract

Non-secret names:

- `PUBLIC_BASE_URL`
- `OWNCANVAS_META_APP_ID`
- `OWNCANVAS_META_GRAPH_API_VERSION`
- `OWNCANVAS_META_PAGE_ID`
- `OWNCANVAS_META_INSTAGRAM_ACCOUNT_ID`

Secret names:

- `OWNCANVAS_META_APP_SECRET`
- `OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN`
- `OWNCANVAS_META_MANUAL_TEST_ACCESS_TOKEN`
- `OWNCANVAS_META_MANUAL_TEST_LONG_LIVED_ACCESS_TOKEN`

`.env.example` lists names and comments only. It must not contain example secret values. App ID may be shared, but App Secret, access token values, webhook verify token, long-lived tokens, authorization codes, and callback query values must go into env or a secret store, not chat, docs, issues, fixtures, browser storage, or Campaign JSON.

## Current Automation Status

This slice does not make Instagram automation run. A completed setup checklist only means the operator knows which Meta settings and environment variables will be required by future slices. Instagram DM Gate remains an offline Direct Message plugin contract until OAuth, webhook verification, Graph API transport, token storage, queueing, idempotency, rate limits, compliance guardrails, and live staging verification are implemented separately.
```

- [ ] **Step 2: Review runbook wording**

Confirm the runbook includes:

- Hosted versus self-host ownership.
- Self-host local HTTPS tunnel path.
- Meta dashboard setup.
- OAuth redirect URL and webhook callback URL.
- Staging and production separation.
- App ID shareability and secret handling.
- Exact sentence: `This slice does not make Instagram automation run.`

---

### Task 2: Create `.env.example` Env Contract

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Add env names with comments only**

Create `.env.example` with this content:

```dotenv
# OwnCanvas public origin used to derive external callback URLs.
# Local Meta callback testing needs an HTTPS tunnel origin.
PUBLIC_BASE_URL=

# Meta App ID is non-secret account metadata and may be shared for debugging.
OWNCANVAS_META_APP_ID=

# Meta Graph API version to use when future live integration slices add transport.
OWNCANVAS_META_GRAPH_API_VERSION=

# Optional non-secret Facebook Page ID selected for the Direct Message plugin.
OWNCANVAS_META_PAGE_ID=

# Optional non-secret Instagram Professional account ID selected for the Instagram DM Gate action.
OWNCANVAS_META_INSTAGRAM_ACCOUNT_ID=

# Secret: Meta App Secret. Store the value in local env or a deployment secret store only.
OWNCANVAS_META_APP_SECRET=

# Secret: webhook verify token. Generate a unique value per environment; do not reuse the App Secret.
OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN=

# Secret: optional manual test access token for future staging smoke tests only.
OWNCANVAS_META_MANUAL_TEST_ACCESS_TOKEN=

# Secret: optional manual test long-lived access token for future staging smoke tests only.
OWNCANVAS_META_MANUAL_TEST_LONG_LIVED_ACCESS_TOKEN=
```

- [ ] **Step 2: Confirm no placeholder secret values**

Run:

```bash
rg -n "secret_|token_|app_secret_|changeme|example-secret|example-token" .env.example
```

Expected: no matches.

---

### Task 3: Link Runbook From Plugin Model README

**Files:**
- Modify: `app/features/plugins/model/README.md`

- [ ] **Step 1: Add a runbook link near the Direct Message plugin Meta setup paragraph**

After the existing local HTTPS tunnel paragraph in the Direct Message configuration section, add:

```markdown
- Meta operator setup for the Instagram DM Gate action now lives in
  [`docs/meta/instagram-dm-gate-operator-runbook.md`](../../../../docs/meta/instagram-dm-gate-operator-runbook.md).
  That runbook is an operator checklist and env contract only; it does not make
  Instagram automation run.
```

- [ ] **Step 2: Confirm product language stays aligned**

Run:

```bash
rg -n "Instagram DM Gate action|Direct Message plugin|Campaign|Creative Canvas|workflow nodes|provider debug|n8n" app/features/plugins/model/README.md docs/meta/instagram-dm-gate-operator-runbook.md
```

Expected: OwnCanvas product language appears; no provider/debug jargon is added as product copy.

---

### Task 4: Record Wiki Outcome

**Files:**
- Modify: `wiki/log.md`

- [ ] **Step 1: Append a Korean wiki log entry near the top**

Add this entry immediately after the `# 로그 | Log` intro paragraph and before the existing first dated entry:

```markdown
## [2026-05-19] issue-42-instagram-dm-gate-meta-runbook-env-contract | Issue #42

- #42 전용 Superpowers 계획 문서 `docs/superpowers/plans/2026-05-19-issue-42-instagram-dm-gate-meta-runbook-env-contract.md`를 먼저 만든 뒤 그 계획만 실행했다.
- `docs/meta/instagram-dm-gate-operator-runbook.md`를 추가해 Hosted OwnCanvas와 self-host Meta app ownership, self-host/local HTTPS tunnel path, Meta dashboard setup, OAuth redirect URL, webhook callback URL, staging/production separation을 문서화했다.
- `.env.example`을 새로 만들어 `PUBLIC_BASE_URL`, `OWNCANVAS_META_APP_ID`, `OWNCANVAS_META_GRAPH_API_VERSION`, optional Page/Instagram account IDs, App Secret, webhook verify token, optional manual test access token names를 값 없이 기록했다.
- App ID는 공유 가능하지만 App Secret, access token, webhook verify token, long-lived token, authorization code, callback query value는 env/secret store에만 두고 chat/docs/issues/fixtures/browser storage/Campaign JSON에는 두지 않는다고 명시했다.
- 이 docs/env-contract slice는 live Meta OAuth, webhook receiver, Graph API transport, token exchange/storage, Private Reply/DM sending, Quick Reply webhook handling, real follow verification, Campaign canvas UI를 추가하지 않았고 Instagram automation이 아직 runnable하지 않다.
```

---

### Task 5: Verify Issue #42

**Files:**
- Read-only verification only

- [ ] **Step 1: Run skill availability check**

Run:

```bash
npm run skills:check
```

Expected: command completes. If it reports missing DDD/marketing skills, record the fallback evidence.

- [ ] **Step 2: Run required acceptance grep**

Run:

```bash
rg -n "OWNCANVAS_META|PUBLIC_BASE_URL|App Secret|access token|webhook verify token|not chat|does not make Instagram automation run" docs/meta app/features/plugins/model/README.md .env.example
```

Expected: matches in the runbook, README link, and `.env.example`.

- [ ] **Step 3: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 4: Check worktree**

Run:

```bash
git status --short --branch
```

Expected: only the #42 files plus any pre-existing unrelated untracked files are present. Do not stage anything.

- [ ] **Step 5: Final evidence**

Return PASS/PARTIAL/FAIL evidence with:

- Plan path created.
- Files changed.
- Verification results.
- Any blockers, including the GitHub CLI network failure if it occurred.
- Confirmation that no secrets were added and Instagram automation is not yet runnable.
