import {
  assertCampaignCoreContractCommitsAreUiFree,
  classifyCampaignChangePath,
  type CampaignCoreContractCommit,
} from "../model/campaign-core-verification-policy.ts";

export type CampaignUiChangePlan = {
  scope: "ui";
  files: string[];
  commitTitlePrefix: "ui:";
};

export type CampaignUiCommitBoundary = {
  coreContractCommitTitle: string;
  uiCommitTitles: string[];
};

const CAMPAIGN_UI_COMPONENT_PREFIX = "app/features/creative-canvas/components/";
const CAMPAIGN_UI_PAGE_ROUTE_PATTERN =
  /^app\/routes\/campaign(?:-[A-Za-z0-9-]+)?\.tsx$/;

export function isCampaignUiChangePath(path: string): boolean {
  const normalizedPath = normalizeCampaignUiScopePath(path);

  return (
    normalizedPath.startsWith(CAMPAIGN_UI_COMPONENT_PREFIX) ||
    CAMPAIGN_UI_PAGE_ROUTE_PATTERN.test(normalizedPath) ||
    normalizedPath.endsWith(".css")
  );
}

export function createCampaignUiChangePlan(
  paths: readonly string[],
): CampaignUiChangePlan {
  const files = paths.map(normalizeCampaignUiScopePath);
  const outOfScopeFiles = files.filter((path) => !isCampaignUiChangePath(path));

  if (files.length === 0 || outOfScopeFiles.length > 0) {
    throw new Error(
      `Campaign UI changes must stay separate from core model and route contracts; out of scope: ${
        outOfScopeFiles.join(", ") || "none"
      }.`,
    );
  }

  return {
    scope: "ui",
    files,
    commitTitlePrefix: "ui:",
  };
}

export function assertCampaignUiCommitsFollowCoreContract(
  commits: readonly CampaignCoreContractCommit[],
): CampaignUiCommitBoundary {
  assertCampaignCoreContractCommitsAreUiFree(commits);

  let latestCoreContractCommitTitle: string | undefined;
  const uiCommitTitles: string[] = [];

  for (const commit of commits) {
    const normalizedFiles = commit.files.map(normalizeCampaignUiScopePath);
    const hasCampaignCoreContract = normalizedFiles.some(
      (path) => classifyCampaignChangePath(path) === "campaign_core",
    );
    const hasUiFiles = normalizedFiles.some(isCampaignUiChangePath);

    if (hasCampaignCoreContract) {
      if (uiCommitTitles.length > 0) {
        throw new Error(
          `Campaign core contract commits must precede campaign UI commits: ${commit.title}.`,
        );
      }

      latestCoreContractCommitTitle = commit.title;
    }

    if (!hasUiFiles) {
      continue;
    }

    if (!commit.title.startsWith("ui:")) {
      throw new Error(
        `Campaign UI changes must be in a ui commit after the core contract commit: ${commit.title}.`,
      );
    }

    createCampaignUiChangePlan(normalizedFiles);

    if (latestCoreContractCommitTitle === undefined) {
      throw new Error(
        `Campaign UI commit must follow a prior campaign-core contract commit: ${commit.title}.`,
      );
    }

    uiCommitTitles.push(commit.title);
  }

  if (latestCoreContractCommitTitle === undefined || uiCommitTitles.length === 0) {
    throw new Error(
      "Campaign UI sequence must include a campaign-core contract commit followed by a separate ui commit.",
    );
  }

  return {
    coreContractCommitTitle: latestCoreContractCommitTitle,
    uiCommitTitles,
  };
}

function normalizeCampaignUiScopePath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
