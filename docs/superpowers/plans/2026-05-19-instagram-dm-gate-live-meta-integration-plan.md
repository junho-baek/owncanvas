# Instagram DM Gate Live Meta Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Instagram DM Gate from an offline Direct Message plugin contract toward a real Meta-backed integration without claiming production automation before OAuth, webhooks, transport, guardrails, App Review, and operator setup are proven.

**Architecture:** Keep `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA` and `InstagramDmActionConfiguration` as the canonical DM Gate campaign action model. Add Meta-specific OAuth, webhook, transport, follow-check, and queue code behind adapter boundaries, then expose only one product-facing Campaign canvas action instead of many workflow nodes. Live sending must remain behind explicit connection, dry-run, idempotency, rate-limit, and compliance gates.

**Tech Stack:** React Router 7 route modules, TypeScript plugin and Creative Canvas model tests with Node `--experimental-strip-types`, local/server environment variables for self-host secrets, future secret-store references for hosted or durable token storage, Meta Graph/Instagram Messaging APIs.

---

## Source Context

- Previous Epic #36 and #37-#41 are closed and produced model/tests/docs only.
- Current canonical first-slice artifacts:
  - `docs/seeds/instagram-dm-gate.mcp.seed.yaml`
  - `app/features/plugins/model/README.md`
  - `app/features/plugins/model/plugin-representation.ts`
  - `app/features/plugins/model/instagram-comment-dm-flow.fixtures.ts`
  - `wiki/log.md` entries for #37-#41
- Existing hard boundary:
  - No live Meta OAuth.
  - No webhook receiver.
  - No Graph API transport.
  - No token storage.
  - No real private reply or DM sending.
  - No Quick Reply webhook handling.
  - No real follow verification.
  - No product-facing Campaign canvas action.
- External docs to re-check during implementation because Meta changes APIs and permission names:
  - Meta Webhooks verification request docs: `https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests`
  - Meta Messenger webhook payload validation docs: `https://developers.facebook.com/docs/messenger-platform/webhooks#validate-payloads`
  - Instagram Platform overview: `https://developers.facebook.com/docs/instagram-platform/`
  - Instagram API overview and Page linkage notes: `https://developers.facebook.com/docs/instagram-api/overview`
  - Meta-maintained Postman Instagram API with Facebook Login reference: `https://www.postman.com/meta/instagram/folder/3uqmcgi/instagram-api-with-facebook-login`
  - Meta-maintained Postman Instagram Messaging API references, including Private Replies and Quick Replies: `https://www.postman.com/meta/instagram`

## Scope Guard

- Do not add n8n-like node explosion. The Campaign canvas gets one DM Gate action; OAuth, webhook, queue, transport, and follow-check internals stay hidden behind the action.
- Do not ask the user to paste App Secret, access tokens, webhook verify token, or long-lived tokens into chat, Markdown docs, Campaign JSON, plugin manifests, browser localStorage, tests, or fixtures.
- Do not claim automation works until a slice explicitly verifies the relevant live Meta path in a staging app with a test Instagram Professional account.
- Keep user-facing language aligned with OwnCanvas: Creative Canvas, Campaign, Creative Operator, Generation Block, Creative Output, Direct Message plugin, Instagram DM Gate action.
- Follow `DESIGN.md`: sober Airtable-inspired surface, no AI-slop UI, no debug/provider jargon in the primary canvas, no box-in-box sprawl, no duplicate CTAs.
- Keep the first implementation issue non-destructive: docs/runbook plus env contract only.

## Architecture Decisions

- `app/features/plugins/model/plugin-representation.ts` remains the canonical schema and validation home for DM Gate action configuration.
- Meta-specific request/response handling should live outside the canonical model, likely under a new adapter boundary such as `app/features/plugins/adapters/meta-instagram/`.
- React Router route modules should be thin HTTP boundaries that call typed model/adapter functions. They should follow the existing route/test pattern in `app/routes/api.*.ts`.
- Campaign workflow ingestion should reuse `ingestInstagramCommentEventIntoCampaignWorkflow()` after webhook normalization produces `InstagramCommentTriggerEvent`.
- Live delivery should be represented as queued or dry-run outcome first. The transport adapter may later send Private Replies or DMs, but only after idempotency/rate-limit/compliance gates pass.
- Token values should never cross into client-visible plugin discovery responses. Client/UI surfaces may show sanitized connection status and account IDs only.

## Files Likely To Touch

### Documentation And Operator Setup

- Create: `docs/meta/instagram-dm-gate-operator-runbook.md`
- Create or modify: `.env.example`
- Modify: `app/features/plugins/model/README.md`
- Modify: `wiki/log.md`

### Meta Connection And Secret Contract

- Create: `app/features/plugins/model/meta-instagram-connection.ts`
- Create: `app/features/plugins/model/meta-instagram-connection.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/env.ts`
- Create: `app/features/plugins/adapters/meta-instagram/env.test.ts`
- Modify: `app/features/plugins/model/plugin-representation.ts` only if a shared secret-ref/account connection schema is needed.

### OAuth Routes

- Create: `app/routes/api.meta-instagram-oauth-start.ts`
- Create: `app/routes/api.meta-instagram-oauth-callback.ts`
- Create: `app/routes/meta-instagram-oauth-api.test.ts`
- Modify: `app/routes.ts`
- Create: `app/features/plugins/adapters/meta-instagram/oauth.ts`
- Create: `app/features/plugins/adapters/meta-instagram/oauth.test.ts`

### Webhooks And Normalization

- Create: `app/routes/api.meta-instagram-webhooks.ts`
- Create: `app/routes/meta-instagram-webhook-api.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/webhook-signature.ts`
- Create: `app/features/plugins/adapters/meta-instagram/webhook-signature.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/webhook-normalization.ts`
- Create: `app/features/plugins/adapters/meta-instagram/webhook-normalization.test.ts`

### Dry-Run Execution And Transport

- Create: `app/features/plugins/adapters/meta-instagram/dm-gate-dry-run.ts`
- Create: `app/features/plugins/adapters/meta-instagram/dm-gate-dry-run.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/private-reply-transport.ts`
- Create: `app/features/plugins/adapters/meta-instagram/private-reply-transport.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/direct-message-transport.ts`
- Create: `app/features/plugins/adapters/meta-instagram/direct-message-transport.test.ts`

### Quick Reply, Follow Check, Guardrails

- Create: `app/features/plugins/adapters/meta-instagram/quick-reply-normalization.ts`
- Create: `app/features/plugins/adapters/meta-instagram/quick-reply-normalization.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/follow-check.ts`
- Create: `app/features/plugins/adapters/meta-instagram/follow-check.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/delivery-queue.ts`
- Create: `app/features/plugins/adapters/meta-instagram/delivery-queue.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/idempotency.ts`
- Create: `app/features/plugins/adapters/meta-instagram/idempotency.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/rate-limit.ts`
- Create: `app/features/plugins/adapters/meta-instagram/rate-limit.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/delivery-log.ts`
- Create: `app/features/plugins/adapters/meta-instagram/delivery-log.test.ts`

### Product-Facing Campaign Canvas Surface

- Modify: `app/features/creative-canvas/model/creative-canvas.ts`
- Modify: `app/features/creative-canvas/model/creative-canvas.test.ts`
- Modify: `app/features/creative-canvas/adapters/react-flow-canvas.ts`
- Modify: `app/features/creative-canvas/adapters/react-flow-canvas.test.ts`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Modify: `app/routes/campaign-canvas.tsx` only if route data wiring is required.

## What The User Must Prepare In Meta Dashboard

Do not paste secrets into chat. App ID can be shared when useful for debugging. App Secret, access tokens, webhook verify token, and long-lived tokens must go into local env or a secret store.

- [ ] Create or choose the Meta developer account and Business Portfolio that should own the app.
- [ ] Create separate Meta apps for development/staging and production, or explicitly accept that a single development app is only for local experiments.
- [ ] Confirm the Instagram account is a Professional account and whether the chosen API path requires it to be linked to a Facebook Page.
- [ ] Confirm the Facebook Page or Instagram Business account IDs that OwnCanvas should connect to. These IDs are not secrets but should still be treated as account metadata, not committed fixtures.
- [ ] Add the public HTTPS base URL for the environment. Local development needs an HTTPS tunnel such as ngrok, Cloudflare Tunnel, Tailscale Funnel, or localtunnel.
- [ ] Register the OAuth redirect URL derived from `PUBLIC_BASE_URL`, for example `https://<public-host>/api/meta/instagram/oauth/callback`.
- [ ] Register the webhook callback URL derived from `PUBLIC_BASE_URL`, for example `https://<public-host>/api/meta/instagram/webhooks`.
- [ ] Generate a webhook verify token locally and store it in env/secret store. Do not reuse the App Secret as the verify token.
- [ ] Put App Secret and any manual test access token into `.env.local` or the selected secret store. Never paste these into issues, chat, docs, or test fixtures.
- [ ] Prepare App Review evidence later: screencast, test account, clear Page/Instagram account selection flow, and exact permission usage. This is not required for the first docs/env issue.

## Sequential Issue Slices

### Slice 1: Meta App Setup And Operator Runbook

**Goal:** Give the operator a safe, exact setup guide and env contract before any live route or transport exists.

**Non-goals:**
- No OAuth route implementation.
- No webhook receiver.
- No Graph API calls.
- No token exchange or token storage.
- No live DM/private reply sending.

**Acceptance criteria:**
- `docs/meta/instagram-dm-gate-operator-runbook.md` explains hosted vs self-host ownership and the self-host local path.
- The runbook lists required Meta dashboard setup, OAuth redirect URL, webhook callback URL, local HTTPS tunnel, and staging/production separation.
- `.env.example` or equivalent docs list non-secret and secret env names without example secret values.
- Docs say App ID can be shared, while App Secret/access tokens/webhook verify token must live in env or a secret store, not chat.
- Docs clearly say this slice still does not make Instagram automation run.

**Files likely to touch:**
- Create: `docs/meta/instagram-dm-gate-operator-runbook.md`
- Create or modify: `.env.example`
- Modify: `app/features/plugins/model/README.md`
- Modify: `wiki/log.md`

**Tests / verification:**
- `npm run skills:check`
- `rg -n "OWNCANVAS_META|PUBLIC_BASE_URL|App Secret|access token|webhook verify token|not chat|does not make Instagram automation run" docs/meta app/features/plugins/model/README.md .env.example`
- `git diff --check`
- Manual doc review against `DESIGN.md` language guardrails: no provider-debug jargon as product copy, no n8n framing.

**Meta dashboard work:**
- Before: user may create the app shell and collect App ID/account IDs.
- After: user should not provide secrets in chat; they should place secrets only in local env/secret store when implementation reaches the env-contract slice.

**Implementation checklist:**
- [ ] Write the runbook with exact setup steps and secret-handling warnings.
- [ ] Define env names, including `PUBLIC_BASE_URL`, `OWNCANVAS_META_APP_ID`, `OWNCANVAS_META_APP_SECRET`, `OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN`, `OWNCANVAS_META_GRAPH_API_VERSION`, optional `OWNCANVAS_META_PAGE_ID`, optional `OWNCANVAS_META_INSTAGRAM_ACCOUNT_ID`, and optional manual test token names.
- [ ] Link the runbook from the plugin model README.
- [ ] Record the docs-only outcome in `wiki/log.md`.
- [ ] Verify no secret values were added.

### Slice 2: OAuth / Account Connection Contract And Env-Secrets Model

**Goal:** Define the typed account connection contract and env/secrets loading boundary so later OAuth code has a safe target.

**Non-goals:**
- No live OAuth redirect flow yet unless this issue is explicitly split after the contract lands.
- No persistent encrypted token store.
- No Graph API transport.
- No UI account picker.

**Acceptance criteria:**
- A typed `MetaInstagramConnection` model represents app ID, account/page/IG account IDs, connection status, scopes/permissions requested, token secret refs, expiration metadata, and sanitized display fields.
- Env loader validates required server-only values and returns redacted diagnostics.
- Tests prove App Secret and access tokens never appear in serialized client/plugin discovery payloads.
- Docs define how self-host local env differs from hosted secret store refs.
- Permission names are pinned only after checking current Meta docs during the issue. If Meta is mid-transition, the model stores requested capability labels plus raw permission strings.

**Files likely to touch:**
- Create: `app/features/plugins/model/meta-instagram-connection.ts`
- Create: `app/features/plugins/model/meta-instagram-connection.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/env.ts`
- Create: `app/features/plugins/adapters/meta-instagram/env.test.ts`
- Modify: `app/features/plugins/model/plugin-representation.ts`
- Modify: `app/features/plugins/model/plugin-representation.test.ts`
- Modify: `app/features/plugins/model/README.md`
- Modify: `wiki/log.md`

**Tests / verification:**
- `node --experimental-strip-types --test app/features/plugins/model/meta-instagram-connection.test.ts app/features/plugins/adapters/meta-instagram/env.test.ts app/features/plugins/model/plugin-representation.test.ts`
- `npm run typecheck`
- `rg -n "APP_SECRET|ACCESS_TOKEN|WEBHOOK_VERIFY_TOKEN" app docs .env.example`
- `git diff --check`

**Meta dashboard work:**
- Before: user must decide self-host first versus hosted-first assumptions and provide only non-secret App ID/account IDs if needed.
- After: user stores App Secret/access token values in env/secret store, never in chat.

**Implementation checklist:**
- [ ] Add the connection status and secret-ref types.
- [ ] Add redacted env parsing and validation.
- [ ] Add serialization tests that prove secrets are omitted.
- [ ] Document self-host env and hosted secret-store behavior.
- [ ] Keep connection contract independent from the Campaign canvas UI.

### Slice 3: OAuth Start / Callback And Account Connection Handshake

**Goal:** Implement the chosen Meta OAuth/account connection handshake so OwnCanvas can connect a Meta app/account in a sanitized way before receiving webhooks or sending messages.

**Non-goals:**
- No webhook receiver.
- No comment processing.
- No Graph transport for sending messages.
- No production token storage unless Slice 2 explicitly selected a durable store.
- No product-facing Campaign canvas connection UI beyond route/API contract tests.

**Acceptance criteria:**
- OAuth start route builds a redirect URL from server env, requested permission strings, `PUBLIC_BASE_URL`, and a CSRF/state value.
- OAuth callback route validates state before any token exchange.
- Token exchange adapter is tested through fake Meta responses first and does not expose raw tokens to client JSON.
- Account resolver can represent selected Page and Instagram Professional account IDs, or return a typed `account_selection_required` result if multiple accounts exist.
- Connection output stores token secret refs or server-only storage handles, not token values.
- Docs explain whether this slice uses Facebook Login/Page-backed flow or Instagram Login for Business, based on the answer to Open Question 1.

**Files likely to touch:**
- Create: `app/routes/api.meta-instagram-oauth-start.ts`
- Create: `app/routes/api.meta-instagram-oauth-callback.ts`
- Create: `app/routes/meta-instagram-oauth-api.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/oauth.ts`
- Create: `app/features/plugins/adapters/meta-instagram/oauth.test.ts`
- Modify: `app/features/plugins/model/meta-instagram-connection.ts`
- Modify: `app/features/plugins/model/meta-instagram-connection.test.ts`
- Modify: `app/routes.ts`
- Modify: `docs/meta/instagram-dm-gate-operator-runbook.md`
- Modify: `wiki/log.md`

**Tests / verification:**
- `node --experimental-strip-types --test app/routes/meta-instagram-oauth-api.test.ts app/features/plugins/adapters/meta-instagram/oauth.test.ts app/features/plugins/model/meta-instagram-connection.test.ts`
- `npm run typecheck`
- `git diff --check`
- Manual OAuth smoke may be run only with local env/secret store values and a test Meta app. A successful OAuth callback means "connected", not "automation enabled."

**Meta dashboard work:**
- Before: user registers the OAuth redirect URL in the Meta app and stores App Secret in local env/secret store.
- After: user may complete a test OAuth connection and confirm selected Page/Instagram account IDs. User should not paste callback codes, tokens, or App Secret into chat.

**Implementation checklist:**
- [ ] Pick and document the first Meta login path.
- [ ] Add OAuth start route with state generation.
- [ ] Add OAuth callback route with state validation.
- [ ] Add fake-token-exchange tests and redaction tests.
- [ ] Add account selection result handling for zero, one, or multiple eligible accounts.
- [ ] Update docs to distinguish connected state from runnable automation.

### Slice 4: Webhook Receiver, Verify Token, And Signature Handling

**Goal:** Add the HTTP boundary that can pass Meta webhook verification and reject unsigned or invalid POST payloads before any event processing.

**Non-goals:**
- No comment normalization beyond basic payload shape capture.
- No DM sending.
- No queue processing.
- No token exchange.

**Acceptance criteria:**
- `GET /api/meta/instagram/webhooks` handles Meta verification by checking `hub.mode`, `hub.verify_token`, and returning `hub.challenge` only when the token matches env.
- `POST /api/meta/instagram/webhooks` verifies `x-hub-signature-256` against the raw request body and App Secret before parsing JSON.
- Invalid verify token, missing signature, invalid signature, malformed JSON, and unsupported method paths return typed error JSON and never enqueue work.
- Route tests use deterministic fixtures and do not call Meta.
- Raw request body handling is covered by tests so signature verification is not accidentally performed after body mutation.

**Files likely to touch:**
- Create: `app/routes/api.meta-instagram-webhooks.ts`
- Create: `app/routes/meta-instagram-webhook-api.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/webhook-signature.ts`
- Create: `app/features/plugins/adapters/meta-instagram/webhook-signature.test.ts`
- Modify: `app/routes.ts`
- Modify: `docs/meta/instagram-dm-gate-operator-runbook.md`
- Modify: `wiki/log.md`

**Tests / verification:**
- `node --experimental-strip-types --test app/routes/meta-instagram-webhook-api.test.ts app/features/plugins/adapters/meta-instagram/webhook-signature.test.ts`
- `npm run typecheck`
- `git diff --check`
- Manual local tunnel smoke only after this slice: Meta dashboard "Verify and Save" should receive the challenge response. This does not mean automation runs.

**Meta dashboard work:**
- Before: user registers the callback URL and verify token in the Meta app dashboard.
- After: user verifies the webhook callback in Meta dashboard using a local HTTPS tunnel or staging HTTPS URL.

**Implementation checklist:**
- [ ] Add route registration in `app/routes.ts`.
- [ ] Implement GET challenge verification.
- [ ] Implement raw-body HMAC signature verification for POST.
- [ ] Add negative-path tests for token/signature/JSON failures.
- [ ] Update runbook with the exact callback URL and expected verification outcome.

### Slice 5: Comment Event Normalization And DM Gate Dry-Run Executor

**Goal:** Convert verified Meta comment webhook payloads into the existing `InstagramCommentTriggerEvent` and run the existing DM Gate selection/outcome logic in dry-run mode.

**Non-goals:**
- No Private Reply or DM send.
- No Quick Reply handling.
- No real follow check.
- No durable queue beyond a dry-run execution record unless Slice 8 is pulled forward.

**Acceptance criteria:**
- Normalizer maps Meta comment webhook payloads into `InstagramCommentTriggerEvent` with campaign/account/media/comment/commenter/text/attribution fields.
- Invalid or unsupported webhook entries are rejected with typed normalization errors and no dry-run output.
- Dry-run executor calls `selectInstagramDmResponseForCommentEvent()` and `resolveInstagramDmGateActionOutcome()` with canonical DM Gate config.
- Dry-run output records `would_prompt`, `would_send_resource`, `would_retry_follow`, or `no_match` without calling Graph APIs.
- Existing offline events remain `prompt_sent`, `follow_check_requested`, `resource_link_ready`, `resource_link_sent`, `not_following_retry_prompted`, and `no_match`.

**Files likely to touch:**
- Create: `app/features/plugins/adapters/meta-instagram/webhook-normalization.ts`
- Create: `app/features/plugins/adapters/meta-instagram/webhook-normalization.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/dm-gate-dry-run.ts`
- Create: `app/features/plugins/adapters/meta-instagram/dm-gate-dry-run.test.ts`
- Modify: `app/features/creative-canvas/model/creative-canvas.ts`
- Modify: `app/features/creative-canvas/model/creative-canvas.test.ts`
- Modify: `app/routes/api.meta-instagram-webhooks.ts`
- Modify: `wiki/log.md`

**Tests / verification:**
- `node --experimental-strip-types --test app/features/plugins/adapters/meta-instagram/webhook-normalization.test.ts app/features/plugins/adapters/meta-instagram/dm-gate-dry-run.test.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/creative-canvas/model/creative-canvas.test.ts`
- `npm run typecheck`
- `git diff --check`
- Manual webhook test event may prove receiver-to-dry-run logging only; it must not send messages.

**Meta dashboard work:**
- Before: webhook callback must already verify.
- After: user may use Meta webhook test payloads or a test Instagram account comment to confirm dry-run logs, but not live delivery.

**Implementation checklist:**
- [ ] Add webhook payload fixtures for comment events.
- [ ] Normalize only the fields OwnCanvas already understands.
- [ ] Route normalized events through existing campaign workflow ingestion.
- [ ] Add dry-run execution result types with redacted logs.
- [ ] Keep dry-run output clearly labeled as not sent.

### Slice 6: Private Reply / DM Transport Adapter Boundary

**Goal:** Add a transport boundary for Meta Private Reply and DM sending, with recording/fake transport tests first and live transport behind explicit configuration.

**Non-goals:**
- No automatic production sending.
- No queue/rate-limit bypass.
- No UI live toggle.
- No App Review bypass claims.

**Acceptance criteria:**
- Transport interface separates `sendPrivateReplyToComment` from `sendDirectMessageToUser` because Meta entry points and limits differ.
- Adapter accepts a token secret ref or server-resolved token, never a token in Campaign JSON.
- Tests cover successful request mapping, Graph error mapping, retryable vs non-retryable failures, and redacted logs.
- Dry-run remains the default mode unless env/config explicitly enables live transport in a staging-safe path.
- Docs explain Private Reply limits and the 24-hour messaging window risk before users try live sends.

**Files likely to touch:**
- Create: `app/features/plugins/adapters/meta-instagram/private-reply-transport.ts`
- Create: `app/features/plugins/adapters/meta-instagram/private-reply-transport.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/direct-message-transport.ts`
- Create: `app/features/plugins/adapters/meta-instagram/direct-message-transport.test.ts`
- Modify: `app/features/plugins/model/plugin-representation.ts` only if execution response types need transport-specific metadata.
- Modify: `app/features/plugins/model/README.md`
- Modify: `docs/meta/instagram-dm-gate-operator-runbook.md`
- Modify: `wiki/log.md`

**Tests / verification:**
- `node --experimental-strip-types --test app/features/plugins/adapters/meta-instagram/private-reply-transport.test.ts app/features/plugins/adapters/meta-instagram/direct-message-transport.test.ts app/features/plugins/model/plugin-representation.test.ts`
- `npm run typecheck`
- `git diff --check`
- Optional manual smoke with a Meta test app and test Instagram account only after queue/idempotency guardrails are present or explicitly stubbed for one message.

**Meta dashboard work:**
- Before: user must confirm the test app has the required messaging permissions for the chosen API path and a test Instagram Professional account.
- After: user may run one controlled test send only when the issue acceptance criteria explicitly include live smoke and secrets are in env.

**Implementation checklist:**
- [ ] Define transport request/response contracts.
- [ ] Implement fake/recording transport first.
- [ ] Implement Graph request mapping behind an env-guarded adapter.
- [ ] Add typed Graph error mapping.
- [ ] Add docs that this boundary alone still does not make campaigns automatically run.

### Slice 7: Quick Reply Webhook Handling And Real Follow-Check Adapter Boundary

**Goal:** Normalize incoming Quick Reply/FOLLOW_CHECK webhook events and call a follow-check adapter that can return supported, unsupported, unknown, following, or not-following without pretending Meta always exposes follow state.

**Non-goals:**
- No hard-coded `simulatedFollowStatus` in live paths.
- No broad follower scraping.
- No claim that User Profile API proves follow relationship unless the current Meta API path supports it for the connected account and user consent state.
- No UI follow-gate polish beyond model output.

**Acceptance criteria:**
- Quick Reply normalizer recognizes the existing `INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD`.
- Quick Reply events link back to the original campaign/action/comment context using idempotent metadata or stored delivery state.
- Follow-check adapter returns a typed result: `following`, `not_following`, `unknown`, `unsupported`, or `error`.
- If Meta cannot verify follow state, the product behavior is explicit: either retry prompt, manual/self-attested gate, or unsupported follow-gate state.
- Tests cover payload match, unrelated quick reply, missing context, unknown follow status, unsupported API, and successful following/not-following branches.

**Files likely to touch:**
- Create: `app/features/plugins/adapters/meta-instagram/quick-reply-normalization.ts`
- Create: `app/features/plugins/adapters/meta-instagram/quick-reply-normalization.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/follow-check.ts`
- Create: `app/features/plugins/adapters/meta-instagram/follow-check.test.ts`
- Modify: `app/features/plugins/adapters/meta-instagram/dm-gate-dry-run.ts`
- Modify: `app/routes/api.meta-instagram-webhooks.ts`
- Modify: `app/features/plugins/model/plugin-representation.ts` if live outcome types need to distinguish unknown/unsupported.
- Modify: `docs/meta/instagram-dm-gate-operator-runbook.md`
- Modify: `wiki/log.md`

**Tests / verification:**
- `node --experimental-strip-types --test app/features/plugins/adapters/meta-instagram/quick-reply-normalization.test.ts app/features/plugins/adapters/meta-instagram/follow-check.test.ts app/features/plugins/adapters/meta-instagram/dm-gate-dry-run.test.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- `npm run typecheck`
- `git diff --check`
- Manual Meta test only verifies Quick Reply payload receipt unless current permissions and consent allow follow-check confirmation.

**Meta dashboard work:**
- Before: user must confirm messaging webhooks are subscribed and test account can send the configured Quick Reply payload.
- After: user must not expect follow verification unless App Review/API capability has proven it. If Meta cannot support it, product requirements must switch to a softer gate.

**Implementation checklist:**
- [ ] Add Quick Reply webhook fixtures.
- [ ] Normalize `FOLLOW_CHECK` into a live follow-check request.
- [ ] Add follow-check adapter with explicit unsupported/unknown states.
- [ ] Remove live dependence on `simulatedFollowStatus`.
- [ ] Document the follow-check limitation and product fallback.

### Slice 8: Queue, Idempotency, Rate-Limit, And Logging Guardrails

**Goal:** Add the safety layer that prevents duplicate sends, bursts, unredacted logs, and ambiguous delivery states before live campaign execution is allowed.

**Non-goals:**
- No distributed production queue unless a separate hosted-storage decision is made.
- No high-volume automation.
- No UI analytics dashboard.

**Acceptance criteria:**
- Delivery jobs have idempotency keys based on account/campaign/media/comment/mapping/action stage.
- Duplicate comment webhook deliveries do not duplicate private replies or DMs.
- Rate limits are modeled per Instagram account, recipient, campaign, and transport action.
- Logs redact App Secret, access tokens, signatures, and raw Authorization headers.
- Delivery state distinguishes `received`, `normalized`, `dry_run`, `queued`, `sent`, `skipped`, `failed_retryable`, `failed_terminal`, and `rate_limited`.
- Tests cover duplicate webhook replay, duplicate Quick Reply replay, rate-limit block, retryable Graph error, terminal Graph error, and log redaction.

**Files likely to touch:**
- Create: `app/features/plugins/adapters/meta-instagram/delivery-queue.ts`
- Create: `app/features/plugins/adapters/meta-instagram/delivery-queue.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/idempotency.ts`
- Create: `app/features/plugins/adapters/meta-instagram/idempotency.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/rate-limit.ts`
- Create: `app/features/plugins/adapters/meta-instagram/rate-limit.test.ts`
- Create: `app/features/plugins/adapters/meta-instagram/delivery-log.ts`
- Create: `app/features/plugins/adapters/meta-instagram/delivery-log.test.ts`
- Modify: `app/routes/api.meta-instagram-webhooks.ts`
- Modify: `docs/meta/instagram-dm-gate-operator-runbook.md`
- Modify: `wiki/log.md`

**Tests / verification:**
- `node --experimental-strip-types --test app/features/plugins/adapters/meta-instagram/delivery-queue.test.ts app/features/plugins/adapters/meta-instagram/idempotency.test.ts app/features/plugins/adapters/meta-instagram/rate-limit.test.ts app/features/plugins/adapters/meta-instagram/delivery-log.test.ts app/routes/meta-instagram-webhook-api.test.ts`
- `npm run typecheck`
- `git diff --check`
- Redaction check: `rg -n "Bearer |app_secret|access_token|x-hub-signature-256" app docs` and manually verify only safe names/placeholders appear.

**Meta dashboard work:**
- Before: no new dashboard setup beyond existing app/webhook/account connection.
- After: user may perform duplicate webhook replay tests through Meta tools or local fixture replay, but live duplicate sends must remain blocked by idempotency tests.

**Implementation checklist:**
- [ ] Define delivery job state machine.
- [ ] Add idempotency key derivation.
- [ ] Add local rate-limit policy with conservative defaults.
- [ ] Add redacted delivery log writer.
- [ ] Wire webhooks to queue/dry-run without live send by default.

### Slice 9: Product-Facing Campaign Canvas Surface As One DM Gate Action

**Goal:** Surface Instagram DM Gate as one Campaign canvas action that adapts the canonical Direct Message plugin config, shows connection/dry-run/live readiness, and avoids exposing internal integration machinery.

**Non-goals:**
- No separate Campaign-only DM Gate schema.
- No separate nodes for OAuth, webhook, Quick Reply, follow check, queue, or token storage.
- No provider-debug UI as first-screen product copy.
- No visual redesign outside the DM Gate action surface.

**Acceptance criteria:**
- The Generation Palette or relevant action picker can add one `Instagram DM Gate` Campaign action backed by the Direct Message plugin capability.
- The action surface edits/reads canonical `InstagramDmActionConfiguration`.
- The UI shows operator-safe statuses: not connected, webhook not verified, dry-run ready, live guarded, live send disabled, App Review needed, or unsupported follow check.
- The canvas does not create an n8n-like graph for comment trigger, quick reply, follow check, and send internals.
- DESIGN.md anti-slop QA passes: compact work-focused surface, no nested cards, no duplicate CTAs, no debug jargon, responsive text fit, lucide icons where appropriate, Airtable-inspired tokens.

**Files likely to touch:**
- Modify: `app/features/creative-canvas/model/creative-canvas.ts`
- Modify: `app/features/creative-canvas/model/creative-canvas.test.ts`
- Modify: `app/features/creative-canvas/adapters/react-flow-canvas.ts`
- Modify: `app/features/creative-canvas/adapters/react-flow-canvas.test.ts`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Modify: `app/routes/campaign-canvas.tsx` if route data is needed.
- Modify: `DESIGN.md` only if a reusable design rule is missing and must be durable.
- Modify: `wiki/log.md`

**Tests / verification:**
- `node --experimental-strip-types --test app/features/creative-canvas/model/creative-canvas.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- `npm run typecheck`
- `npx -y @google/design.md lint DESIGN.md`
- Browser verification at desktop and mobile widths with screenshots after UI implementation.
- Manual UI checklist: one DM Gate action, no node explosion, no visible secrets, no debug/provider-first copy, connection status is clear without overclaiming live automation.

**Meta dashboard work:**
- Before: user does not need new dashboard work for UI-only implementation.
- After: user can use the surface to see setup readiness once previous connection/webhook slices exist, but should not expect live sending unless transport and guardrails are enabled.

**Implementation checklist:**
- [ ] Add one campaign action representation that adapts the existing direct-message config.
- [ ] Add status mapping from connection/webhook/queue/follow-check states into operator-safe labels.
- [ ] Add settings controls for keyword mappings, prompt, resource URL, follow gate, and dry-run/live guard state.
- [ ] Verify the surface does not expose secrets or internal Graph/webhook details as primary UI.
- [ ] Run DESIGN.md lint and browser screenshot checks.

## Verification Gates Across The Path

- [ ] Gate A: docs/env contract exists and contains no secret values.
- [ ] Gate B: connection model serializes only non-secret account status and secret refs.
- [ ] Gate C: webhook GET verify passes and POST rejects invalid signatures before JSON parsing.
- [ ] Gate D: comment webhook normalization produces existing `InstagramCommentTriggerEvent`.
- [ ] Gate E: dry-run executor produces DM Gate outcomes without Graph calls.
- [ ] Gate F: transport adapter has fake/recording tests before live Graph transport.
- [ ] Gate G: Quick Reply handling does not rely on fixture-only `simulatedFollowStatus`.
- [ ] Gate H: idempotency/rate-limit/log redaction guardrails pass duplicate and replay tests.
- [ ] Gate I: product canvas shows one action and passes DESIGN.md anti-slop QA.
- [ ] Gate J: live smoke, if attempted, is limited to a Meta test/staging app and test Instagram Professional account.

## Risk Notes

- **Meta App Review and permissions:** Live mode may require App Review, business verification, screencast evidence, and permission-specific test calls. Permission names and API families can change, so each implementation issue must re-check current Meta docs before pinning scopes.
- **Instagram Professional account and Page linkage:** The current OwnCanvas docs assume Business Portfolio/Page-backed setup. Some Meta flows require an Instagram Professional account connected to a Facebook Page; newer Instagram Login flows may differ. The runbook must choose one path before coding OAuth.
- **24-hour messaging window:** Instagram messaging policies may restrict when an app can send messages after user interaction. DM Gate should be treated as response-driven automation, not broadcast messaging.
- **Private Reply limits:** Private Reply is not a general DM escape hatch. It is constrained by comment context, entry point, count/window limits, and permissions. Transport must keep Private Reply and DM sends separate.
- **User Profile API consent and follow-check limitations:** Meta may expose profile fields for users who message the account, but that does not guarantee a reliable follower relationship check. Follow gate must support `unknown` and `unsupported` states.
- **Local HTTPS tunnel:** Webhook and OAuth callbacks need a public HTTPS URL. `localhost` is not enough for Meta dashboard verification.
- **Staging vs production app separation:** Use separate Meta apps, callback URLs, verify tokens, App Secrets, and access tokens for staging and production. Do not reuse a local tunnel callback as production configuration.
- **Secret leakage:** Test fixtures, Campaign JSON, plugin discovery responses, logs, Markdown docs, and GitHub issues must never contain token values.
- **Operator confusion:** A connected app plus verified webhook does not mean automation is enabled. UI and docs must distinguish connected, dry-run, queued, live-guarded, and live-send states.

## Open Questions Before Implementation

1. Which Meta login path should OwnCanvas support first: Facebook Login/Page-backed Instagram Graph API, or Instagram Login for Business? Existing OwnCanvas docs lean Page-backed, but this must be pinned before OAuth routes.
2. Is the first runnable path self-host/local only, or should hosted SaaS secret-store assumptions be designed in the same first contract?
3. Where should durable tokens live for the first non-local implementation: server env/manual token, OS keychain/local encrypted store, or hosted secret store? This affects OAuth callback acceptance criteria.
4. Is real follow verification a hard product requirement, or can DM Gate degrade to self-attested/manual follow gating when Meta returns `unknown` or `unsupported`?
5. Should the first live send use Private Reply to the comment, Direct Message after a messaging entry point, or dry-run only until App Review evidence is ready?

## Recommended First Implementation Issue

**Title:** `[Task] Instagram DM Gate Meta app runbook and env contract`

**Why first:** It gives the user a safe way to prepare the Meta dashboard and local secrets without prematurely adding OAuth, webhooks, or live sending. It also forces the project to pin callback URLs, env names, staging/prod separation, and no-secret handling before code can accidentally leak provider credentials.

**Issue scope:**
- Create `docs/meta/instagram-dm-gate-operator-runbook.md`.
- Create or update `.env.example` with Meta env names and comments only.
- Link the runbook from `app/features/plugins/model/README.md`.
- Record outcome in `wiki/log.md`.
- Do not add live OAuth, webhook receiver, Graph transport, token storage, or sending.

**Acceptance criteria:**
- User can create the Meta app shell and know exactly where App ID, callback URLs, verify token, App Secret, and tokens belong.
- Docs explicitly say App ID can be shared but App Secret/access tokens/webhook verify token must go into env/secret store, not chat.
- Docs do not claim Instagram automation can run after this issue.
- Verification passes with `git diff --check` and doc grep for env/secret handling.

## Final Handoff Notes

- This plan is a path to live integration, not a claim that live automation is ready.
- The safest next step after plan review is Slice 1 only.
- After Slice 1, the next issue should be Slice 2 unless the open questions force a login-path or secret-store decision first.
