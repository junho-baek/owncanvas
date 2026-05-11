import {
  classifyCampaignChangePath,
  type CampaignCoreContractCommit,
} from "../model/campaign-core-verification-policy.ts";

export type CampaignStorageChangePlan = {
  scope: "storage";
  files: string[];
  commitTitlePrefix: "storage:";
};

export type CampaignStorageCommitBoundary = {
  coreContractCommitTitle: string;
  storageCommitTitles: string[];
};

const CAMPAIGN_STORAGE_CLIENT_PREFIX = "app/features/creative-canvas/client/";
const CAMPAIGN_MODEL_STORAGE_PATTERN =
  /^app\/features\/creative-canvas\/model\/.*(?:storage|persistence).*\.ts$/;
const CAMPAIGN_ROUTE_STORAGE_PATTERN =
  /^app\/routes\/.*(?:storage|persistence).*\.ts$/;

export function isCampaignStorageChangePath(path: string): boolean {
  const normalizedPath = normalizeCampaignStorageScopePath(path);

  return (
    normalizedPath.startsWith(CAMPAIGN_STORAGE_CLIENT_PREFIX) ||
    CAMPAIGN_MODEL_STORAGE_PATTERN.test(normalizedPath) ||
    CAMPAIGN_ROUTE_STORAGE_PATTERN.test(normalizedPath)
  );
}

export function createCampaignStorageChangePlan(
  paths: readonly string[],
): CampaignStorageChangePlan {
  const files = paths.map(normalizeCampaignStorageScopePath);
  const outOfScopeFiles = files.filter((path) => !isCampaignStorageChangePath(path));

  if (files.length === 0 || outOfScopeFiles.length > 0) {
    throw new Error(
      `Campaign storage changes must stay separate from UI and plugin adapter changes; out of scope: ${
        outOfScopeFiles.join(", ") || "none"
      }.`,
    );
  }

  return {
    scope: "storage",
    files,
    commitTitlePrefix: "storage:",
  };
}

export function assertCampaignStorageCommitsFollowCoreContract(
  commits: readonly CampaignCoreContractCommit[],
): CampaignStorageCommitBoundary {
  let latestCoreContractCommitTitle: string | undefined;
  const storageCommitTitles: string[] = [];

  for (const commit of commits) {
    const normalizedFiles = commit.files.map(normalizeCampaignStorageScopePath);
    const hasCampaignCoreContract = normalizedFiles.some(
      (path) => classifyCampaignChangePath(path) === "campaign_core",
    );
    const hasStorageFiles = normalizedFiles.some(isCampaignStorageChangePath);

    if (hasCampaignCoreContract) {
      if (!commit.title.startsWith("campaign-core:")) {
        throw new Error(
          `Campaign core contract changes must be in a campaign-core commit: ${commit.title}.`,
        );
      }

      if (hasStorageFiles || storageCommitTitles.length > 0) {
        throw new Error(
          `Campaign core contract commits must precede campaign storage commits: ${commit.title}.`,
        );
      }

      latestCoreContractCommitTitle = commit.title;
    }

    if (!hasStorageFiles) {
      continue;
    }

    if (!commit.title.startsWith("storage:")) {
      throw new Error(
        `Campaign storage changes must be in a storage commit after the core contract commit: ${commit.title}.`,
      );
    }

    createCampaignStorageChangePlan(normalizedFiles);

    if (latestCoreContractCommitTitle === undefined) {
      throw new Error(
        `Campaign storage commit must follow a prior campaign-core contract commit: ${commit.title}.`,
      );
    }

    storageCommitTitles.push(commit.title);
  }

  if (latestCoreContractCommitTitle === undefined || storageCommitTitles.length === 0) {
    throw new Error(
      "Campaign storage sequence must include a campaign-core contract commit followed by a separate storage commit.",
    );
  }

  return {
    coreContractCommitTitle: latestCoreContractCommitTitle,
    storageCommitTitles,
  };
}

function normalizeCampaignStorageScopePath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
