# OwnCanvas CLI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the first OwnCanvas CLI slice for issue #35: a file-backed `.owncanvas` workspace, canonical Campaign directory layout, basic Campaign commands, and stable JSON output.

**Architecture:** Keep the first CLI slice in a focused `app/features/owncanvas-cli/` feature folder so it can mature without adding more weight to the existing large Creative Canvas model file. Reuse `createBlankCampaignRecord()` from the Creative Canvas domain model to create UI-compatible Campaign records, then wrap the file-backed version with CLI revision metadata and deterministic JSON persistence. Expose a small Node CLI entrypoint that delegates to domain/repository helpers rather than editing JSON directly.

**Tech Stack:** TypeScript, Node `fs/promises`, Node `crypto`, `node:test`, existing React Router TypeScript config, existing Creative Canvas Campaign model.

---

## File Structure

- Create `app/features/owncanvas-cli/model/stable-json.ts`: deterministic JSON stringify/parse helpers and content hash support.
- Create `app/features/owncanvas-cli/model/campaign-document.ts`: file-backed Campaign document types, revision metadata, create/rename domain helpers, unknown field preservation.
- Create `app/features/owncanvas-cli/model/workspace-repository.ts`: `.owncanvas` discovery, workspace init/status, Campaign directory layout, atomic JSON reads/writes, create/list/inspect/export.
- Create `app/features/owncanvas-cli/model/workspace-repository.test.ts`: tmpdir tests for workspace layout, campaign creation, deterministic JSON, unknown field preservation, unsupported schema handling.
- Create `app/features/owncanvas-cli/cli.ts`: minimal CLI parser for `workspace init/status` and `campaign create/list/open/inspect/export` with `--json`.
- Create `app/features/owncanvas-cli/cli.test.ts`: child-process tests for the public CLI commands and JSON envelope.
- Modify `package.json`: add `owncanvas:cli` script using Node's TypeScript stripping.
- Modify `wiki/log.md`: record the implementation outcome and verification.

## Task 1: Campaign Document and Stable JSON

**Files:**
- Create: `app/features/owncanvas-cli/model/stable-json.ts`
- Create: `app/features/owncanvas-cli/model/campaign-document.ts`
- Test: `app/features/owncanvas-cli/model/workspace-repository.test.ts`

- [ ] **Step 1: Write the failing document tests**

Add tests that assert:
- `createFileBackedCampaignDocument()` returns a UI-compatible Campaign with `schemaVersion: "owncanvas.campaign.v1"`.
- The document has a `revision` object with number, hash, updatedAt, lastCommand, and lastActor.
- `renameFileBackedCampaignDocument()` preserves unknown fields and increments the revision.
- `stableStringify()` sorts keys and writes a trailing newline.

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts
```

Expected: fail because files do not exist.

- [ ] **Step 2: Implement stable JSON and document helpers**

Implement:
- `stableStringify(value: unknown): string`
- `parseJsonObject(value: string): Record<string, unknown>`
- `hashStableJson(value: unknown): string`
- `createFileBackedCampaignDocument(input)`
- `renameFileBackedCampaignDocument(document, input)`
- `assertSupportedCampaignDocument(document)`

Use `createBlankCampaignRecord()` with an in-memory storage shim so the file-backed document starts from the existing Campaign domain model. Compute hashes from the document without its `revision` field.

- [ ] **Step 3: Run the focused document tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts
```

Expected: document-related tests pass or reveal only repository tests that are not written yet.

## Task 2: Workspace Repository

**Files:**
- Modify: `app/features/owncanvas-cli/model/workspace-repository.ts`
- Modify: `app/features/owncanvas-cli/model/workspace-repository.test.ts`

- [ ] **Step 1: Add failing workspace repository tests**

Add tests that assert:
- `initializeWorkspace({ root })` creates `.owncanvas/workspace.json` and `campaigns/`.
- `getWorkspaceStatus({ root })` discovers an initialized workspace.
- `createCampaignInWorkspace()` creates `.owncanvas/campaigns/<campaign_id>/campaign.json`, `assets/`, `outputs/`, `runs/`, and `snapshots/`.
- `listCampaignsInWorkspace()` returns id, title, path, revision, createdAt, updatedAt.
- `inspectCampaignInWorkspace()` rejects unsupported Campaign schema versions.
- `exportCampaignFromWorkspace()` writes deterministic JSON to a requested file.

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts
```

Expected: fail until repository helpers exist.

- [ ] **Step 2: Implement repository helpers**

Implement:
- `initializeWorkspace(input)`
- `getWorkspaceStatus(input)`
- `resolveWorkspace(input)`
- `createCampaignInWorkspace(input)`
- `listCampaignsInWorkspace(input)`
- `inspectCampaignInWorkspace(input)`
- `exportCampaignFromWorkspace(input)`

Use `fs.mkdir({ recursive: true })`, deterministic directory names, temp-file-plus-rename JSON writes, and explicit error codes for missing workspace, duplicate Campaign, missing Campaign, invalid JSON, and unsupported schema versions.

- [ ] **Step 3: Run repository tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts
```

Expected: all repository tests pass.

## Task 3: CLI Entrypoint and JSON Envelope

**Files:**
- Create: `app/features/owncanvas-cli/cli.ts`
- Create: `app/features/owncanvas-cli/cli.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add failing CLI tests**

Add child-process tests for:
- `workspace init --root <tmp> --json`
- `workspace status --root <tmp> --json`
- `campaign create --root <tmp> --id launch-pack --title "Launch Pack" --json`
- `campaign list --root <tmp> --json`
- `campaign inspect --root <tmp> launch-pack --json`
- `campaign open --root <tmp> launch-pack --json`
- `campaign export --root <tmp> launch-pack --out <tmp>/campaign-export.json --json`

Assert stdout is valid JSON with:
- `schemaVersion: "owncanvas.cli-result.v1"`
- `ok`
- `command`
- `workspacePath`
- `campaignId` where relevant
- `changed`
- `data`
- `warnings`
- `errors`

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/cli.test.ts
```

Expected: fail because CLI entrypoint does not exist.

- [ ] **Step 2: Implement CLI parser**

Implement a small parser without adding dependencies. Support `--root`, `--json`, `--id`, `--title`, and `--out`. Human output may be concise, but `--json` must print only the JSON envelope to stdout. Map usage errors to exit code `6`, missing workspace/file errors to `7`, unsupported schema/validation errors to `2`, duplicate/conflict errors to `3`, and success to `0`.

- [ ] **Step 3: Add package script**

Add:

```json
"owncanvas:cli": "node --experimental-strip-types app/features/owncanvas-cli/cli.ts"
```

- [ ] **Step 4: Run CLI tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/cli.test.ts
```

Expected: all CLI tests pass.

## Task 4: Verification, Wiki, and Commit

**Files:**
- Modify: `wiki/log.md`

- [ ] **Step 1: Run focused verification**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts app/features/owncanvas-cli/cli.test.ts
npm run typecheck
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Update wiki log**

Append a Korean log entry for the #35 CLI foundation slice. Include implemented command surface and verification commands.

- [ ] **Step 3: Commit and push**

Run:

```bash
git add app/features/owncanvas-cli package.json wiki/log.md docs/superpowers/plans/2026-05-18-owncanvas-cli-foundation.md
git commit -m "feat: add owncanvas cli workspace foundation"
git push
```

Expected: branch `feature/video-generation-provider` is pushed.

## Self-Review

- Spec coverage: This plan covers #35 workspace init/status, Campaign directory layout, campaign create/open/list/inspect/export, revision metadata, deterministic JSON, unsupported schema failures, and domain-helper-based mutation. It does not cover block/edge/asset authoring or generation execution because those are tracked in #30, #34, and #31.
- Placeholder scan: No TBD/TODO/later placeholders are used.
- Type consistency: The plan uses `FileBackedCampaignDocument`, `OwnCanvasCliRevision`, `initializeWorkspace`, `createCampaignInWorkspace`, `inspectCampaignInWorkspace`, and the JSON envelope consistently across tests and CLI.
