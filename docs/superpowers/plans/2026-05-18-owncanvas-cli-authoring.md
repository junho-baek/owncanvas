# OwnCanvas CLI Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement issue #30 so agents can author Generation Blocks, connect domain edges, import reference assets, and apply multi-command plans through the OwnCanvas CLI.

**Architecture:** Keep authoring behavior in `app/features/owncanvas-cli/model/authoring-commands.ts`, separate from CLI parsing and file repository concerns. Authoring commands mutate file-backed Campaign documents through existing Creative Canvas domain helpers (`createCampaignBlock`, `applyCampaignCanvasEditAction`, `createCampaignAsset`, `addCampaignAsset`) and then persist through a repository update helper that recalculates revision metadata. `apply` executes a typed list of domain commands against one in-memory Campaign copy and writes only after all commands succeed.

**Tech Stack:** TypeScript, Node `fs/promises`, Node `node:test`, existing OwnCanvas CLI foundation, existing Creative Canvas Campaign model.

---

## File Structure

- Create `app/features/owncanvas-cli/model/authoring-commands.ts`: domain command types and pure Campaign mutation helpers for block, edge, asset, and apply.
- Create `app/features/owncanvas-cli/model/authoring-commands.test.ts`: focused unit tests for block/edge/asset/apply/idempotency behavior.
- Modify `app/features/owncanvas-cli/model/campaign-document.ts`: export a generic `reviseFileBackedCampaignDocument()` helper for non-create revisions.
- Modify `app/features/owncanvas-cli/model/workspace-repository.ts`: add `updateCampaignInWorkspace()` and export `writeJsonFileAtomic()` for repository-owned persistence.
- Modify `app/features/owncanvas-cli/cli.ts`: add command parsing for `block`, `edge`, `asset`, and `apply`.
- Modify `app/features/owncanvas-cli/cli.test.ts`: add CLI integration coverage for authoring commands and atomic apply.
- Modify `wiki/log.md`: record implementation outcome.

## Task 1: Revision and Repository Update Foundation

**Files:**
- Modify: `app/features/owncanvas-cli/model/campaign-document.ts`
- Modify: `app/features/owncanvas-cli/model/workspace-repository.ts`
- Test: `app/features/owncanvas-cli/model/authoring-commands.test.ts`

- [ ] **Step 1: Add failing tests for repository-backed Campaign update**

Create `authoring-commands.test.ts` with a test that initializes a workspace, creates `campaign_authoring`, calls `updateCampaignInWorkspace()` with a no-op updater, and asserts:
- `changed` is false
- `revisionBefore` equals `revisionAfter`
- persisted `campaign.json` is unchanged

Add a second test that changes the title through the updater and asserts:
- `changed` is true
- revision number increments
- `previousHash` equals the old hash
- `lastCommand` is the command passed to `updateCampaignInWorkspace()`

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/authoring-commands.test.ts
```

Expected: fail because `updateCampaignInWorkspace()` is not exported.

- [ ] **Step 2: Implement revision/update helpers**

Add `reviseFileBackedCampaignDocument(document, { command, actor, now })` that preserves all document fields, updates `updatedAt`, increments `revision.number`, sets `previousHash`, `lastCommand`, `lastActor`, `updatedAt`, and recalculates `hash`.

Add `updateCampaignInWorkspace({ root, id, command, now, actor, update })` that:
- reads the current Campaign
- calls `update(document)`
- compares stable hashes to detect `changed`
- writes only if changed
- returns `revisionBefore`, `revisionAfter`, `changed`, `document`, `paths`, `workspacePath`

- [ ] **Step 3: Run repository update tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/authoring-commands.test.ts
```

Expected: repository update tests pass.

## Task 2: Block, Edge, Asset Domain Commands

**Files:**
- Create: `app/features/owncanvas-cli/model/authoring-commands.ts`
- Modify: `app/features/owncanvas-cli/model/authoring-commands.test.ts`

- [ ] **Step 1: Add failing domain command tests**

Add tests that assert:
- `applyAuthoringCommand(document, { type: "block.add", ... })` creates a text/image/video block with a caller-provided id.
- duplicate block add throws by default, but returns unchanged with `ifNotExists: true`.
- `block.set` partial-merges prompt/model/aspectRatio/count/duration/resolution/reference asset into node properties without dropping existing properties.
- `block.remove` removes connected edges and stores the deleted block for `block.restore`.
- `edge.connect` accepts `sourceBlock:port` and `targetBlock:port`, creates deterministic edge id, and is idempotent.
- `edge.disconnect` removes an existing edge and is idempotent when missing with `ifExists: true`.
- `asset.import` creates a reference asset; duplicate asset import throws unless `ifNotExists: true`.
- `asset.list` returns existing assets without mutation.

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/authoring-commands.test.ts
```

Expected: fail until authoring commands exist.

- [ ] **Step 2: Implement authoring commands**

Implement typed commands:
- `block.add`, `block.set`, `block.remove`, `block.restore`
- `edge.connect`, `edge.disconnect`
- `asset.import`, `asset.list`

Use existing Creative Canvas helpers where possible. Store removed blocks under `document.extensions.owncanvasCli.deletedBlocks`. Store imported asset files logically in Campaign `assets`; physical file copying is not part of this slice.

- [ ] **Step 3: Run domain command tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/authoring-commands.test.ts
```

Expected: all authoring command tests pass.

## Task 3: Atomic Apply

**Files:**
- Modify: `app/features/owncanvas-cli/model/authoring-commands.ts`
- Modify: `app/features/owncanvas-cli/model/authoring-commands.test.ts`

- [ ] **Step 1: Add failing atomic apply tests**

Add tests that assert:
- `applyAuthoringCommands(document, [block.add, block.set, edge.connect])` returns a fully connected Campaign.
- if a later command fails, the original document object remains unchanged.
- repeated same edge connect returns `changed=false`.

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/authoring-commands.test.ts
```

Expected: fail until batch helper exists.

- [ ] **Step 2: Implement batch apply**

Add `applyAuthoringCommands(document, commands)` that deep-clones the document, applies commands in order to the clone, and returns `{ document, changed, results }`. It must not mutate the input if any command throws.

- [ ] **Step 3: Run authoring tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/authoring-commands.test.ts
```

Expected: all authoring command tests pass.

## Task 4: CLI Authoring Surface

**Files:**
- Modify: `app/features/owncanvas-cli/cli.ts`
- Modify: `app/features/owncanvas-cli/cli.test.ts`

- [ ] **Step 1: Add failing CLI integration tests**

Extend `cli.test.ts` to cover:
- `block add --campaign launch-pack --kind image --id image_hero --title Hero --x 100 --y 200 --json`
- `block set --campaign launch-pack image_hero --prompt "..." --model "gpt-image-1" --aspect-ratio 9:16 --count 3 --json`
- `asset import --campaign launch-pack --id ref_hero --uri file:///tmp/ref.png --media-type image --title Reference --json`
- `edge connect --campaign launch-pack image_hero:generated_image_asset video_hero:reference_image --json`
- `apply --campaign launch-pack --plan <plan.json> --json`

Assert stable JSON envelope, changed values, ids, and persisted Campaign state.

- [ ] **Step 2: Implement CLI parsing and handlers**

Add flags:
- shared: `--campaign`, `--if-not-exists`, `--if-exists`
- block: `--kind`, `--id`, `--title`, `--x`, `--y`, `--prompt`, `--model`, `--aspect-ratio`, `--count`, `--duration`, `--resolution`, `--reference-asset`
- asset: `--uri`, `--media-type`, `--usage`, `--title`
- apply: `--plan`

For now, `--json` remains the contract; human output can stay minimal.

- [ ] **Step 3: Run CLI tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/cli.test.ts
```

Expected: all CLI tests pass.

## Task 5: Verification, Wiki, and Commit

**Files:**
- Modify: `wiki/log.md`

- [ ] **Step 1: Run verification**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts app/features/owncanvas-cli/model/authoring-commands.test.ts app/features/owncanvas-cli/cli.test.ts
npm run typecheck
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Update wiki log**

Append a Korean log entry for issue #30, including command surface and verification commands.

- [ ] **Step 3: Commit, push, and close issue**

Run:

```bash
git add app/features/owncanvas-cli package.json wiki/log.md docs/superpowers/plans/2026-05-18-owncanvas-cli-authoring.md
git commit -m "feat: add owncanvas cli authoring commands"
git push
gh issue comment 30 -R junho-baek/owncanvas --body "<summary and verification>"
gh issue close 30 -R junho-baek/owncanvas --comment "Closing as completed by <commit>."
```

Expected: branch is pushed and issue #30 is closed.

## Self-Review

- Spec coverage: This plan covers all #30 acceptance criteria: block add/set/remove/restore, edge connect/disconnect, asset import/list, atomic apply, and idempotency. It does not implement generation execution or validation strictness beyond the authoring command layer; those remain #34 and #33.
- Placeholder scan: No TBD/TODO/later placeholders are present.
- Type consistency: Command names, file paths, and helper names are consistent across tasks.
