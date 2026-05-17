import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FileBackedCampaignDocument } from "./campaign-document.ts";
import { parseJsonObject, stableStringify } from "./stable-json.ts";

export type OwnCanvasCampaignSnapshotRecord = {
  schemaVersion: "owncanvas.campaign-snapshot.v1";
  snapshotId: string;
  campaignId: string;
  revisionHash: string;
  createdAt: string;
  reason: string;
  document: FileBackedCampaignDocument;
};

export type OwnCanvasCampaignSnapshotSummary = {
  snapshotId: string;
  campaignId: string;
  revisionHash: string;
  createdAt: string;
  reason: string;
  path: string;
};

export async function createCampaignSnapshot(input: {
  campaignDirectoryPath: string;
  campaignId: string;
  document: FileBackedCampaignDocument;
  reason: string;
  now?: () => string;
}) {
  const createdAt = input.now?.() ?? new Date().toISOString();
  const snapshotId = createSnapshotId(createdAt, input.document.revision.hash);
  const snapshotsDirectoryPath = path.join(
    input.campaignDirectoryPath,
    "snapshots",
  );
  const snapshotPath = path.join(snapshotsDirectoryPath, `${snapshotId}.json`);
  const record: OwnCanvasCampaignSnapshotRecord = {
    schemaVersion: "owncanvas.campaign-snapshot.v1",
    snapshotId,
    campaignId: input.campaignId,
    revisionHash: input.document.revision.hash,
    createdAt,
    reason: input.reason,
    document: input.document,
  };

  await mkdir(snapshotsDirectoryPath, { recursive: true });
  await writeJsonFileAtomic(snapshotPath, record);

  return {
    record,
    path: snapshotPath,
  };
}

export async function listCampaignSnapshots(input: {
  campaignDirectoryPath: string;
}) {
  const snapshotsDirectoryPath = path.join(
    input.campaignDirectoryPath,
    "snapshots",
  );

  try {
    const entries = await readdir(snapshotsDirectoryPath, {
      withFileTypes: true,
    });
    const summaries = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const snapshotPath = path.join(snapshotsDirectoryPath, entry.name);
          const record = await readCampaignSnapshot(snapshotPath);

          return {
            snapshotId: record.snapshotId,
            campaignId: record.campaignId,
            revisionHash: record.revisionHash,
            createdAt: record.createdAt,
            reason: record.reason,
            path: snapshotPath,
          } satisfies OwnCanvasCampaignSnapshotSummary;
        }),
    );

    return summaries.sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  } catch (error) {
    if (isFileNotFound(error)) {
      return [];
    }

    throw error;
  }
}

export async function readCampaignSnapshotById(input: {
  campaignDirectoryPath: string;
  snapshotId: string;
}) {
  return readCampaignSnapshot(
    path.join(input.campaignDirectoryPath, "snapshots", `${input.snapshotId}.json`),
  );
}

export async function restoreCampaignSnapshot(input: {
  campaignJsonPath: string;
  campaignDirectoryPath: string;
  snapshotId: string;
}) {
  const snapshot = await readCampaignSnapshotById({
    campaignDirectoryPath: input.campaignDirectoryPath,
    snapshotId: input.snapshotId,
  });

  await writeJsonFileAtomic(input.campaignJsonPath, snapshot.document);

  return snapshot;
}

async function readCampaignSnapshot(
  snapshotPath: string,
): Promise<OwnCanvasCampaignSnapshotRecord> {
  const parsed = parseJsonObject(await readFile(snapshotPath, "utf8"));

  if (parsed.schemaVersion !== "owncanvas.campaign-snapshot.v1") {
    throw new Error(`Unsupported snapshot schema at ${snapshotPath}.`);
  }

  return parsed as OwnCanvasCampaignSnapshotRecord;
}

function createSnapshotId(createdAt: string, revisionHash: string) {
  return [
    "snapshot",
    createdAt.replace(/[^0-9]+/g, "").slice(0, 14),
    revisionHash.slice(0, 12),
  ].join("_");
}

async function writeJsonFileAtomic(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  await writeFile(temporaryPath, stableStringify(value), "utf8");
  await rename(temporaryPath, filePath);
}

function isFileNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
