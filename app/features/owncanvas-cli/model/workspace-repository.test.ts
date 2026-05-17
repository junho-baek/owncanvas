import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  createFileBackedCampaignDocument,
  renameFileBackedCampaignDocument,
} from "./campaign-document.ts";
import { hashStableJson, stableStringify } from "./stable-json.ts";
import {
  createCampaignInWorkspace,
  exportCampaignFromWorkspace,
  getWorkspaceStatus,
  initializeWorkspace,
  inspectCampaignInWorkspace,
  listCampaignsInWorkspace,
} from "./workspace-repository.ts";

test("createFileBackedCampaignDocument creates a UI-compatible Campaign record with revision metadata", () => {
  const document = createFileBackedCampaignDocument({
    id: "campaign_launch",
    title: "Launch Pack",
    now: () => "2026-05-18T00:00:00.000Z",
  });

  assert.equal(document.schemaVersion, "owncanvas.campaign.v1");
  assert.equal(document.id, "campaign_launch");
  assert.equal(document.title, "Launch Pack");
  assert.equal(document.workspaceState.workspaceId, "workspace_campaign_launch");
  assert.equal(document.revision.number, 1);
  assert.equal(document.revision.updatedAt, "2026-05-18T00:00:00.000Z");
  assert.equal(document.revision.lastCommand, "campaign.create");
  assert.equal(document.revision.lastActor, "owncanvas-cli");
  assert.equal(document.revision.hash.length, 64);
});

test("renameFileBackedCampaignDocument preserves unknown fields and increments revision", () => {
  const document = createFileBackedCampaignDocument({
    id: "campaign_unknown_fields",
    title: "Initial",
    now: () => "2026-05-18T00:00:00.000Z",
  }) as ReturnType<typeof createFileBackedCampaignDocument> & {
    experimentalFlag: { enabled: boolean };
  };
  document.experimentalFlag = { enabled: true };

  const renamed = renameFileBackedCampaignDocument(document, {
    title: "Renamed",
    now: () => "2026-05-18T00:05:00.000Z",
  });

  assert.equal(renamed.title, "Renamed");
  assert.deepEqual(renamed.experimentalFlag, { enabled: true });
  assert.equal(renamed.revision.number, 2);
  assert.equal(renamed.revision.previousHash, document.revision.hash);
  assert.notEqual(renamed.revision.hash, document.revision.hash);
  assert.equal(renamed.updatedAt, "2026-05-18T00:05:00.000Z");
});

test("stableStringify sorts object keys and adds a trailing newline", () => {
  const serialized = stableStringify({
    zebra: 1,
    alpha: {
      charlie: true,
      bravo: false,
    },
  });

  assert.equal(
    serialized,
    '{\n  "alpha": {\n    "bravo": false,\n    "charlie": true\n  },\n  "zebra": 1\n}\n',
  );
});

test("hashStableJson returns the same digest for equivalent object key order", () => {
  assert.equal(
    hashStableJson({ zebra: 1, alpha: { charlie: true, bravo: false } }),
    hashStableJson({ alpha: { bravo: false, charlie: true }, zebra: 1 }),
  );
});

test("initializeWorkspace creates the .owncanvas workspace layout", async () => {
  const root = await createTemporaryRoot();
  const result = await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });

  assert.equal(result.changed, true);
  assert.equal(result.workspace.schemaVersion, "owncanvas.cli-workspace.v1");
  assert.equal(result.workspacePath, path.join(root, ".owncanvas"));

  const status = await getWorkspaceStatus({ root });

  assert.equal(status.initialized, true);
  assert.equal(status.workspacePath, path.join(root, ".owncanvas"));
  assert.equal(status.workspace?.campaignsPath, "campaigns");
});

test("createCampaignInWorkspace writes canonical Campaign directory layout", async () => {
  const root = await createTemporaryRoot();
  await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });

  const result = await createCampaignInWorkspace({
    root,
    id: "campaign_launch",
    title: "Launch Pack",
    now: () => "2026-05-18T00:05:00.000Z",
  });

  assert.equal(result.changed, true);
  assert.equal(result.document.id, "campaign_launch");
  assert.equal(result.document.title, "Launch Pack");
  assert.deepEqual(
    result.paths.subdirectories.map((directory) => path.basename(directory)),
    ["assets", "outputs", "runs", "snapshots"],
  );

  const persisted = JSON.parse(
    await readFile(result.paths.campaignJsonPath, "utf8"),
  ) as ReturnType<typeof createFileBackedCampaignDocument>;

  assert.equal(persisted.schemaVersion, "owncanvas.campaign.v1");
  assert.equal(persisted.revision.number, 1);
});

test("list and inspect read file-backed Campaign documents", async () => {
  const root = await createTemporaryRoot();
  await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });
  await createCampaignInWorkspace({
    root,
    id: "campaign_launch",
    title: "Launch Pack",
    now: () => "2026-05-18T00:05:00.000Z",
  });

  const campaigns = await listCampaignsInWorkspace({ root });
  const inspected = await inspectCampaignInWorkspace({
    root,
    id: "campaign_launch",
  });

  assert.deepEqual(campaigns.map((campaign) => campaign.id), ["campaign_launch"]);
  assert.equal(campaigns[0]?.title, "Launch Pack");
  assert.equal(campaigns[0]?.revision.number, 1);
  assert.equal(inspected.document.title, "Launch Pack");
  assert.equal(inspected.paths.campaignDirectoryPath, campaigns[0]?.path);
});

test("inspectCampaignInWorkspace rejects unsupported Campaign schema versions", async () => {
  const root = await createTemporaryRoot();
  await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });
  const created = await createCampaignInWorkspace({
    root,
    id: "campaign_legacy",
    title: "Legacy",
    now: () => "2026-05-18T00:05:00.000Z",
  });
  const legacyDocument = {
    ...created.document,
    schemaVersion: "owncanvas.campaign.v0",
  };
  await writeFile(
    created.paths.campaignJsonPath,
    stableStringify(legacyDocument),
    "utf8",
  );

  await assert.rejects(
    inspectCampaignInWorkspace({ root, id: "campaign_legacy" }),
    /Unsupported Campaign schemaVersion/,
  );
});

test("exportCampaignFromWorkspace writes deterministic JSON", async () => {
  const root = await createTemporaryRoot();
  await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });
  await createCampaignInWorkspace({
    root,
    id: "campaign_export",
    title: "Export",
    now: () => "2026-05-18T00:05:00.000Z",
  });
  const out = path.join(root, "exported", "campaign.json");

  const exported = await exportCampaignFromWorkspace({
    root,
    id: "campaign_export",
    out,
  });

  assert.equal(exported.outPath, out);
  assert.equal(await readFile(out, "utf8"), stableStringify(exported.document));
});

async function createTemporaryRoot() {
  return mkdtemp(path.join(tmpdir(), "owncanvas-cli-"));
}
