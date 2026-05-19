# Issue #40 Instagram DM Gate Meta Credentials Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce issue-specific audit evidence that the Instagram DM Gate docs explain hosted/self-host Meta credential ownership and Docker/cloud callback URL contracts.

**Architecture:** This is a documentation audit, not a product/runtime change. The canonical source remains `app/features/plugins/model/README.md` under the Direct Message plugin model; `docs/seeds/instagram-dm-gate.mcp.seed.yaml`, issue #40, and `wiki/log.md` are evidence inputs. If the canonical README already satisfies #40, leave product docs untouched and add only this plan plus a fresh wiki log outcome.

**Tech Stack:** Markdown docs, GitHub issue context through `gh` or GitHub connector, Node test runner for focused plugin model tests, `rg`/`sed` readback, `git diff --check`.

---

## Scope Controls

- Process GitHub issue #40 only.
- Do not inspect or process #39 or #41 except unavoidable read-only references already present in local `wiki/log.md`.
- Do not stage, commit, push, close issues, or post GitHub comments.
- Do not edit or stage `docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-usability.md`.
- Do not implement live Meta OAuth, webhook receiver, Graph API transport, encrypted token storage, token UI, real DM sending, real follow verification, new node types, or n8n-like workflow complexity.
- No UI change is planned; screenshot evidence is not required unless a later step unexpectedly changes UI files.

## Files

- Create: `docs/superpowers/plans/2026-05-19-issue-40-instagram-dm-gate-meta-credentials-docs.md`
- Read: `docs/seeds/instagram-dm-gate.mcp.seed.yaml`
- Read/audit: `app/features/plugins/model/README.md`
- Modify: `wiki/log.md`
- Verify with tests: `app/features/plugins/model/instagram-comment-dm-flow.test.ts`
- Verify with tests: `app/features/plugins/model/plugin-representation.test.ts`

### Task 1: Confirm Issue #40 Context

- [ ] **Step 1: Capture GitHub issue #40 body and comments**

Run:

```bash
gh issue view 40 -R junho-baek/owncanvas --comments
```

Expected: issue title is `[Task] Hosted/self-host Meta credentials and Docker URL docs`; acceptance criteria require hosted vs self-host Meta credential ownership and Docker/cloud `PUBLIC_BASE_URL` plus env-specific OAuth redirect/webhook callback HTTPS URL contracts. If `gh` cannot reach GitHub, use the GitHub connector for issue #40 only and record that fallback in the final report.

- [ ] **Step 2: Re-read seed constraints for #40**

Run:

```bash
sed -n '1,220p' docs/seeds/instagram-dm-gate.mcp.seed.yaml
```

Expected: seed includes hosted SaaS OwnCanvas Business Portfolio Meta apps, self-host BYO Meta app credentials via env/secrets, Docker/cloud `PUBLIC_BASE_URL`, env-specific OAuth redirect/webhook callback HTTPS URLs, and first-slice exclusions.

### Task 2: Audit Canonical Plugin Docs

- [ ] **Step 1: Read the Direct Message plugin docs section**

Run:

```bash
sed -n '222,280p' app/features/plugins/model/README.md
```

Expected: the Direct Message plugin section names `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA`, states the first-slice exclusions, and documents hosted/self-host credential ownership plus Docker/cloud callback URL contracts.

- [ ] **Step 2: Run focused phrase readback for #40 acceptance**

Run:

```bash
rg -n "Hosted OwnCanvas|Self-hosted installations|OwnCanvas-owned Meta apps|Business Portfolio|Meta app credentials|environment variables|deployment secret store|PUBLIC_BASE_URL|public HTTPS origin|Meta OAuth redirect URLs|webhook callback URLs|HTTPS tunnel|Meta OAuth|webhook receiving|Graph API transport|token storage|token UI|real DM sending|real follow-state checks" app/features/plugins/model/README.md docs/seeds/instagram-dm-gate.mcp.seed.yaml
```

Expected: matches appear in `app/features/plugins/model/README.md` and the seed for every #40 acceptance phrase.

- [ ] **Step 3: Decide whether product docs need edits**

If Step 2 finds all required phrases in `app/features/plugins/model/README.md`, do not edit the README. If any #40 acceptance phrase is absent from the README, add a narrow bullet under the existing Direct Message configuration section using this exact content:

```markdown
- Hosted OwnCanvas can later use OwnCanvas-owned Meta apps for Business Portfolio
  connections, while self-hosted installations bring their own Meta app
  credentials through environment variables or a deployment secret store.
  Docker and cloud deployments must set `PUBLIC_BASE_URL` to the public HTTPS
  origin for each environment, then register matching Meta OAuth redirect URLs
  and webhook callback URLs as environment-specific HTTPS callback URLs. Local
  development that needs Meta callbacks should use an HTTPS tunnel such as
  ngrok, Cloudflare Tunnel, Tailscale Funnel, or localtunnel. This first slice
  still excludes live Meta OAuth, webhook receiving, Graph API transport, token
  storage, token UI, real DM sending, and real follow-state checks.
```

### Task 3: Record Issue-Specific Wiki Evidence

- [ ] **Step 1: Append a fresh #40 outcome to `wiki/log.md`**

Add a new top entry dated `2026-05-19` with the title `issue-40-meta-credentials-docker-url-docs-audit | Issue #40`. It must state:

- the required plan file was created first;
- `gh issue view` failed if that happened, and the GitHub connector was used for #40 body/comments;
- `app/features/plugins/model/README.md` satisfies hosted OwnCanvas Business Portfolio Meta apps;
- self-host BYO Meta credentials via env/secrets are documented;
- `PUBLIC_BASE_URL`, env-specific OAuth redirect URLs, env-specific webhook callback URLs, HTTPS callback origin, and local HTTPS tunnel guidance with examples such as ngrok, Cloudflare Tunnel, Tailscale Funnel, or localtunnel are documented;
- first-slice exclusions remain no live Meta OAuth, webhook receiving, Graph API transport, token storage/token UI, real DM sending, or real follow-state checks;
- no UI changed, so screenshot evidence is not required.

### Task 4: Verify #40

- [ ] **Step 1: Run focused grep/readback**

Run:

```bash
rg -n "Hosted OwnCanvas|OwnCanvas-owned Meta apps|Business Portfolio|Self-hosted installations|Meta app credentials|environment variables|deployment secret store|PUBLIC_BASE_URL|public HTTPS origin|Meta OAuth redirect URLs|webhook callback URLs|HTTPS tunnel|Meta OAuth|webhook receiving|Graph API transport|token storage|token UI|real DM sending|real follow-state checks" app/features/plugins/model/README.md wiki/log.md
```

Expected: README and the fresh wiki log entry contain the relevant phrases.

- [ ] **Step 2: Run focused plugin tests**

Run:

```bash
node --experimental-strip-types --test app/features/plugins/model/instagram-comment-dm-flow.test.ts app/features/plugins/model/plugin-representation.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Run whitespace diff check**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 4: Inspect final scope**

Run:

```bash
git status --short --branch
```

Expected: changed files are limited to this plan and `wiki/log.md`, unless Task 2 required the narrow README bullet. The unrelated untracked `docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-usability.md` remains unmodified and unstaged.

## Acceptance Checklist

- [ ] Docs explain hosted OwnCanvas vs self-host BYO Meta app credential ownership.
- [ ] Docs explain Docker/cloud `PUBLIC_BASE_URL` and env-specific OAuth redirect/webhook callback HTTPS URL contracts.
- [ ] Docs mention hosted OwnCanvas Business Portfolio Meta apps.
- [ ] Docs mention self-host BYO Meta credentials via env/secrets.
- [ ] Docs name `PUBLIC_BASE_URL` and env-specific OAuth redirect/webhook callback HTTPS URLs.
- [ ] Docs explain local tunnel examples for local development callbacks, including ngrok, Cloudflare Tunnel, Tailscale Funnel, or localtunnel.
- [ ] Docs state first-slice exclusions: no live Meta OAuth, webhook receiving, Graph API transport, token storage/token UI, real DM sending, or real follow-state checks.
- [ ] No UI changed; screenshot evidence is not required.
- [ ] No staging, commit, push, GitHub comments, or issue closure performed.
