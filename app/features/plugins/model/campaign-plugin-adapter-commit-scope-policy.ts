import {
  classifyCampaignChangePath,
  createCampaignCoreContractCommitPlan,
  type CampaignCoreContractCommit,
} from "../../creative-canvas/model/campaign-core-verification-policy.ts";

export type CampaignPluginAdapterChangePlan = {
  scope: "plugin";
  files: string[];
  commitTitlePrefix: "plugin:";
};

export type CampaignPluginAdapterCommitBoundary = {
  coreContractCommitTitle: string;
  pluginCommitTitles: string[];
};

export type CampaignCorePluginCommitHistoryBoundary = {
  coreContractCommitTitles: string[];
  pluginCommitTitles: string[];
};

const PLUGIN_FEATURE_PREFIX = "app/features/plugins/";
const CAMPAIGN_PLUGIN_ADAPTER_PATTERN =
  /^app\/features\/creative-canvas\/adapters\/.*(?:plugin|provider|automation|extension).*\.ts$/;
const PLUGIN_ROUTE_PATTERN = /^app\/routes\/api\.(?:agent-plugins|plugin-[A-Za-z0-9-]+)\.ts$/;

export function isCampaignPluginAdapterChangePath(path: string): boolean {
  const normalizedPath = normalizeCampaignPluginAdapterScopePath(path);

  return (
    normalizedPath.startsWith(PLUGIN_FEATURE_PREFIX) ||
    CAMPAIGN_PLUGIN_ADAPTER_PATTERN.test(normalizedPath) ||
    PLUGIN_ROUTE_PATTERN.test(normalizedPath)
  );
}

export function createCampaignPluginAdapterChangePlan(
  paths: readonly string[],
): CampaignPluginAdapterChangePlan {
  const files = paths.map(normalizeCampaignPluginAdapterScopePath);
  const outOfScopeFiles = files.filter(
    (path) => !isCampaignPluginAdapterChangePath(path),
  );

  if (files.length === 0 || outOfScopeFiles.length > 0) {
    throw new Error(
      `Campaign plugin adapter changes must stay separate from core, UI, storage, and API changes; out of scope: ${
        outOfScopeFiles.join(", ") || "none"
      }.`,
    );
  }

  return {
    scope: "plugin",
    files,
    commitTitlePrefix: "plugin:",
  };
}

export function assertCampaignPluginAdapterCommitsFollowCoreContract(
  commits: readonly CampaignCoreContractCommit[],
): CampaignPluginAdapterCommitBoundary {
  let latestCoreContractCommitTitle: string | undefined;
  const pluginCommitTitles: string[] = [];

  for (const commit of commits) {
    const normalizedFiles = commit.files.map(normalizeCampaignPluginAdapterScopePath);
    const hasCampaignCoreContract = normalizedFiles.some(
      (path) => classifyCampaignChangePath(path) === "campaign_core",
    );
    const hasPluginFiles = normalizedFiles.some(isCampaignPluginAdapterChangePath);

    if (hasCampaignCoreContract) {
      if (!commit.title.startsWith("campaign-core:")) {
        throw new Error(
          `Campaign core contract changes must be in a campaign-core commit: ${commit.title}.`,
        );
      }

      if (hasPluginFiles || pluginCommitTitles.length > 0) {
        throw new Error(
          `Campaign core contract commits must precede campaign plugin commits: ${commit.title}.`,
        );
      }

      latestCoreContractCommitTitle = commit.title;
    }

    if (!hasPluginFiles) {
      continue;
    }

    if (!commit.title.startsWith("plugin:")) {
      throw new Error(
        `Campaign plugin changes must be in a plugin commit after the core contract commit: ${commit.title}.`,
      );
    }

    createCampaignPluginAdapterChangePlan(normalizedFiles);

    if (latestCoreContractCommitTitle === undefined) {
      throw new Error(
        `Campaign plugin commit must follow a prior campaign-core contract commit: ${commit.title}.`,
      );
    }

    pluginCommitTitles.push(commit.title);
  }

  if (latestCoreContractCommitTitle === undefined || pluginCommitTitles.length === 0) {
    throw new Error(
      "Campaign plugin sequence must include a campaign-core contract commit followed by a separate plugin commit.",
    );
  }

  return {
    coreContractCommitTitle: latestCoreContractCommitTitle,
    pluginCommitTitles,
  };
}

export function assertCampaignCorePluginCommitHistoryIsSeparated(
  commits: readonly CampaignCoreContractCommit[],
): CampaignCorePluginCommitHistoryBoundary {
  const coreContractCommitTitles: string[] = [];
  const pluginCommitTitles: string[] = [];

  for (const commit of commits) {
    const normalizedFiles = commit.files.map(normalizeCampaignPluginAdapterScopePath);
    const hasCampaignCoreContract = normalizedFiles.some(
      (path) => classifyCampaignChangePath(path) === "campaign_core",
    );
    const hasPluginFiles = normalizedFiles.some(isCampaignPluginAdapterChangePath);

    if (hasCampaignCoreContract && hasPluginFiles) {
      throw new Error(
        `Campaign commit history must not mix core contract and plugin changes in one commit: ${commit.title}.`,
      );
    }

    if (hasCampaignCoreContract) {
      if (!commit.title.startsWith("campaign-core:")) {
        throw new Error(
          `Campaign core contract changes must be in a campaign-core commit: ${commit.title}.`,
        );
      }

      if (pluginCommitTitles.length > 0) {
        throw new Error(
          `Campaign core contract commits must precede campaign plugin commits in history: ${commit.title}.`,
        );
      }

      createCampaignCoreContractCommitPlan(normalizedFiles);
      coreContractCommitTitles.push(commit.title);
    }

    if (hasPluginFiles) {
      if (!commit.title.startsWith("plugin:")) {
        throw new Error(
          `Campaign plugin changes must be in a plugin commit after the core contract commit: ${commit.title}.`,
        );
      }

      if (coreContractCommitTitles.length === 0) {
        throw new Error(
          `Campaign plugin commit must follow a prior campaign-core contract commit: ${commit.title}.`,
        );
      }

      createCampaignPluginAdapterChangePlan(normalizedFiles);
      pluginCommitTitles.push(commit.title);
    }
  }

  if (coreContractCommitTitles.length === 0 || pluginCommitTitles.length === 0) {
    throw new Error(
      "Campaign commit history must include separated campaign-core and plugin commits.",
    );
  }

  return {
    coreContractCommitTitles,
    pluginCommitTitles,
  };
}

function normalizeCampaignPluginAdapterScopePath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
