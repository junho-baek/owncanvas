import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  listCampaignSnapshots,
  restoreCampaignSnapshot,
} from "./snapshots.ts";
import {
  createCampaignInWorkspace,
  initializeWorkspace,
  inspectCampaignInWorkspace,
  OwnCanvasCliRepositoryError,
  updateCampaignInWorkspace,
} from "./workspace-repository.ts";

test("write-capable updates create snapshots before campaign changes", async () => {
  const root = await createSnapshotWorkspace();
  const before = await inspectCampaignInWorkspace({
    root,
    id: "safe-edits",
  });

  await updateCampaignInWorkspace({
    root,
    id: "safe-edits",
    command: "test.update",
    now: () => "2026-05-18T00:10:00.000Z",
    update: (document) => ({ ...document, title: "Updated" }),
  });

  const snapshots = await listCampaignSnapshots({
    campaignDirectoryPath: before.paths.campaignDirectoryPath,
  });
  const snapshotRaw = await readFile(snapshots[0]?.path ?? "", "utf8");

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0]?.revisionHash, before.document.revision.hash);
  assert.match(snapshotRaw, /"title": "Safe Edits"/);
});

test("read-only inspection does not create snapshots", async () => {
  const root = await createSnapshotWorkspace();
  const inspected = await inspectCampaignInWorkspace({
    root,
    id: "safe-edits",
  });
  const snapshots = await listCampaignSnapshots({
    campaignDirectoryPath: inspected.paths.campaignDirectoryPath,
  });

  assert.deepEqual(snapshots, []);
});

test("expectRevision mismatch fails with conflict exit code", async () => {
  const root = await createSnapshotWorkspace();

  await assert.rejects(
    () =>
      updateCampaignInWorkspace({
        root,
        id: "safe-edits",
        command: "test.update",
        expectRevision: "stale",
        update: (document) => ({ ...document, title: "Updated" }),
      }),
    (error) =>
      error instanceof OwnCanvasCliRepositoryError &&
      error.code === "revision_conflict" &&
      error.exitCode === 3,
  );
});

test("restoreCampaignSnapshot recovers a previous valid Campaign state", async () => {
  const root = await createSnapshotWorkspace();
  const before = await inspectCampaignInWorkspace({
    root,
    id: "safe-edits",
  });
  await updateCampaignInWorkspace({
    root,
    id: "safe-edits",
    command: "test.update",
    update: (document) => ({ ...document, title: "Updated" }),
  });
  const snapshots = await listCampaignSnapshots({
    campaignDirectoryPath: before.paths.campaignDirectoryPath,
  });

  await restoreCampaignSnapshot({
    campaignDirectoryPath: before.paths.campaignDirectoryPath,
    campaignJsonPath: before.paths.campaignJsonPath,
    snapshotId: snapshots[0]?.snapshotId ?? "",
  });

  const restored = await inspectCampaignInWorkspace({
    root,
    id: "safe-edits",
  });

  assert.equal(restored.document.title, "Safe Edits");
  assert.equal(restored.document.revision.hash, before.document.revision.hash);
});

async function createSnapshotWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-snapshots-"));
  await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });
  await createCampaignInWorkspace({
    root,
    id: "safe-edits",
    title: "Safe Edits",
    now: () => "2026-05-18T00:05:00.000Z",
  });

  return root;
}
