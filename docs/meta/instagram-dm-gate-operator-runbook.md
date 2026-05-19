# Instagram DM Gate Operator Runbook

This runbook is for operators preparing Meta app settings for the OwnCanvas
Direct Message plugin and its Instagram DM Gate action. It is a docs/env-contract
slice only; it does not make Instagram automation run.

## What This Slice Does

- Documents the safe setup path for a Meta app that may later connect to an
  OwnCanvas Campaign.
- Defines the environment variable names OwnCanvas expects for hosted,
  self-hosted, local, staging, and production paths.
- Keeps the Creative Canvas product model simple: one Direct Message plugin
  action, the Instagram DM Gate action, not a workflow made of many
  Meta-specific nodes.

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

Hosted OwnCanvas can use OwnCanvas-owned Meta apps in the OwnCanvas Business
Portfolio when that hosted product path exists. Hosted secrets belong in the
hosted secret store and must not appear in chats, docs, issues, test fixtures,
or Campaign JSON.

Self-hosted OwnCanvas uses the operator's own Meta developer account, Business
Portfolio, app, Facebook Page, and Instagram Professional account. Self-hosted
secrets belong in local environment files such as `.env.local`, deployment
environment variables, or the operator's secret store.

The App ID is not a secret and may be shared when needed for debugging. The App
Secret, access token values, webhook verify token, long-lived tokens,
authorization codes, and callback query values must go into env or a secret
store, not chat, docs, issues, fixtures, browser storage, or Campaign JSON.

## Required Meta Dashboard Setup

1. Create or choose a Meta developer account and Business Portfolio that should
   own the app.
2. Create separate Meta apps for local/development, staging, and production, or
   explicitly keep a single development app limited to local experiments.
3. Confirm the Instagram account is a Professional account and confirm whether
   the selected Meta API path requires a linked Facebook Page.
4. Record non-secret account metadata outside committed fixtures: Meta App ID,
   Facebook Page ID, and Instagram account ID.
5. Set `PUBLIC_BASE_URL` to the public HTTPS origin for the current environment.
6. Register the OAuth redirect URL derived from `PUBLIC_BASE_URL`:
   `https://<public-host>/api/meta/instagram/oauth/callback`.
7. Register the webhook callback URL derived from `PUBLIC_BASE_URL`:
   `https://<public-host>/api/meta/instagram/webhooks`.
8. Generate a webhook verify token locally and store it as
   `OWNCANVAS_META_WEBHOOK_VERIFY_TOKEN`. Do not reuse the App Secret as the
   webhook verify token.
9. Store `OWNCANVAS_META_APP_SECRET` and any manual test access token only in
   env or a secret store.

## Self-Host Local Path

1. Start OwnCanvas locally.
2. Start an HTTPS tunnel such as ngrok, Cloudflare Tunnel, Tailscale Funnel, or
   localtunnel.
3. Set `PUBLIC_BASE_URL` to the tunnel's HTTPS origin.
4. Register the environment-specific OAuth redirect URL in the Meta dashboard.
5. Register the environment-specific webhook callback URL in the Meta dashboard.
6. Put secret values in `.env.local` or another local secret store, never in
   `.env.example`.
7. Restart the local app after changing env values.

Local `localhost` URLs are not enough for Meta callbacks. The callback origin
must be reachable by Meta over HTTPS.

## Staging And Production Separation

Use separate Meta apps or clearly separated app settings for staging and
production. Each environment needs its own `PUBLIC_BASE_URL`, OAuth redirect
URL, webhook callback URL, webhook verify token, and secret-store entries.
Staging test tokens must not be copied into production, and production secrets
must not be copied into docs, chats, issues, fixtures, or local demo Campaigns.

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

`.env.example` lists names and comments only. It must not contain example secret
values. App ID may be shared, but App Secret, access token values, webhook
verify token, long-lived tokens, authorization codes, and callback query values
must go into env or a secret store, not chat, docs, issues, fixtures, browser
storage, or Campaign JSON.

## Current Automation Status

This slice does not make Instagram automation run. A completed setup checklist
only means the operator knows which Meta settings and environment variables will
be required by future slices. Instagram DM Gate remains an offline Direct
Message plugin contract until OAuth, webhook verification, Graph API transport,
token storage, queueing, idempotency, rate limits, compliance guardrails, and
live staging verification are implemented separately.
