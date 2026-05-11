export type CampaignChangeArea =
  | "campaign_core"
  | "route"
  | "ui"
  | "storage"
  | "plugin"
  | "other";

export type CampaignCoreVerificationPlan = {
  scope: "campaign_core";
  firstEvidence: "focused_model_test";
  commitTitlePrefix: "campaign-core:";
  commands: [string, ...string[]];
};

export type CampaignCoreContractCommitPlan = {
  scope: "campaign_core";
  files: string[];
  commitTitlePrefix: "campaign-core:";
};

export type CampaignCoreContractCommit = {
  title: string;
  files: readonly string[];
};

export type CampaignCoreContractCommitBoundary = {
  coreCommitTitles: string[];
  uiCommitTitles: string[];
};

export type CampaignCoreContractCommitSequenceBoundary = {
  coreContractCommitTitle: string;
  consumerCommitTitles: string[];
};

export type RevertibleCampaignCommitUnit = {
  title: string;
  area: Exclude<CampaignChangeArea, "other">;
};

export type RevertibleCampaignCommitPlan = {
  revertUnits: RevertibleCampaignCommitUnit[];
};

export type CampaignIntermediateReviewState = RevertibleCampaignCommitUnit & {
  explanation: string;
  verification: string;
  nextBoundary: Exclude<CampaignChangeArea, "other"> | null;
};

export const CAMPAIGN_CORE_FOCUSED_MODEL_TEST_COMMAND =
  "node --experimental-strip-types --test app/features/creative-canvas/model/campaign-core-verification-policy.test.ts";

const CAMPAIGN_CORE_CONSUMER_AREAS = new Set<CampaignChangeArea>([
  "route",
  "ui",
  "storage",
  "plugin",
]);

const CAMPAIGN_AREA_COMMIT_TITLE_PREFIXES = {
  campaign_core: "campaign-core:",
  route: "api:",
  ui: "ui:",
  storage: "storage:",
  plugin: "plugin:",
} as const satisfies Record<Exclude<CampaignChangeArea, "other">, string>;

export function isCampaignCoreContractPath(path: string): boolean {
  return classifyCampaignChangePath(path) === "campaign_core";
}

export function isCampaignCoreFocusedModelTestPath(path: string): boolean {
  const normalizedPath = path.replaceAll("\\", "/");

  return (
    normalizedPath.startsWith("app/features/creative-canvas/model/") &&
    normalizedPath.endsWith(".test.ts") &&
    normalizedPath.split("/").at(-1)?.startsWith("campaign-") === true
  );
}

export function classifyCampaignChangePath(path: string): CampaignChangeArea {
  const normalizedPath = path.replaceAll("\\", "/");

  if (normalizedPath.startsWith("app/features/plugins/")) {
    return "plugin";
  }

  if (normalizedPath.startsWith("app/routes/")) {
    return "route";
  }

  if (
    normalizedPath.startsWith("app/features/creative-canvas/components/") ||
    normalizedPath.endsWith(".tsx") ||
    normalizedPath.endsWith(".css")
  ) {
    return "ui";
  }

  if (
    normalizedPath.startsWith("app/features/creative-canvas/client/") ||
    normalizedPath.includes("storage") ||
    normalizedPath.includes("persistence")
  ) {
    return "storage";
  }

  if (normalizedPath.startsWith("app/features/creative-canvas/model/")) {
    return "campaign_core";
  }

  return "other";
}

export function createCampaignCoreVerificationPlan(
  paths: readonly string[],
): CampaignCoreVerificationPlan {
  const areas = new Set(paths.map(classifyCampaignChangePath));
  const nonCoreAreas = [...areas].filter((area) => area !== "campaign_core");
  const focusedModelTestPaths = paths
    .filter(isCampaignCoreFocusedModelTestPath)
    .sort();

  if (!areas.has("campaign_core") || nonCoreAreas.length > 0) {
    throw new Error(
      `Campaign core verification must stay model-focused; found areas: ${
        [...areas].join(", ") || "none"
      }.`,
    );
  }

  if (focusedModelTestPaths.length === 0) {
    throw new Error(
      "Campaign core changes must include a focused model test before UI, storage, route, or plugin work.",
    );
  }

  return {
    scope: "campaign_core",
    firstEvidence: "focused_model_test",
    commitTitlePrefix: "campaign-core:",
    commands: focusedModelTestPaths.map(
      (path) => `node --experimental-strip-types --test ${path}`,
    ) as [string, ...string[]],
  };
}

export function createCampaignCoreContractCommitPlan(
  paths: readonly string[],
): CampaignCoreContractCommitPlan {
  const files = paths.map(normalizeCampaignCorePolicyPath);
  const outOfScopeFiles = files.filter((path) => !isCampaignCoreContractPath(path));

  if (files.length === 0 || outOfScopeFiles.length > 0) {
    throw new Error(
      `Campaign core contract commits must contain only Campaign model contract files and must be independent; out of scope: ${
        outOfScopeFiles.join(", ") || "none"
      }.`,
    );
  }

  return {
    scope: "campaign_core",
    files,
    commitTitlePrefix: "campaign-core:",
  };
}

export function assertCampaignCoreContractCommitsAreUiFree(
  commits: readonly CampaignCoreContractCommit[],
): CampaignCoreContractCommitBoundary {
  const coreCommitTitles: string[] = [];
  const uiCommitTitles: string[] = [];

  for (const commit of commits) {
    const areas = new Set(commit.files.map(classifyCampaignChangePath));
    const hasCampaignCore = areas.has("campaign_core");
    const hasUi = areas.has("ui");

    if (hasCampaignCore) {
      coreCommitTitles.push(commit.title);
    }

    if (hasUi) {
      uiCommitTitles.push(commit.title);
    }

    if (hasCampaignCore && !commit.title.startsWith("campaign-core:")) {
      throw new Error(
        `Campaign core contract changes must be in a campaign-core commit: ${commit.title}.`,
      );
    }

    if (hasCampaignCore && hasUi) {
      throw new Error(
        `Campaign core contract commit must not include UI files: ${commit.title}.`,
      );
    }
  }

  return {
    coreCommitTitles,
    uiCommitTitles,
  };
}

export function assertCampaignCoreContractCommitExistsFirst(
  commits: readonly CampaignCoreContractCommit[],
): CampaignCoreContractCommitSequenceBoundary {
  let coreContractCommitTitle: string | undefined;
  const consumerCommitTitles: string[] = [];

  for (const commit of commits) {
    const areas = new Set(commit.files.map(classifyCampaignChangePath));
    const hasCampaignCore = areas.has("campaign_core");
    const consumerAreas = [...areas].filter((area) =>
      CAMPAIGN_CORE_CONSUMER_AREAS.has(area),
    );

    if (hasCampaignCore) {
      if (!commit.title.startsWith("campaign-core:")) {
        throw new Error(
          `Campaign core contract changes must be in a campaign-core commit: ${commit.title}.`,
        );
      }

      createCampaignCoreContractCommitPlan(commit.files);

      coreContractCommitTitle = commit.title;
      continue;
    }

    if (consumerAreas.length === 0) {
      continue;
    }

    if (coreContractCommitTitle === undefined) {
      throw new Error(
        `Campaign consumer commit must follow a prior campaign-core contract commit: ${commit.title}.`,
      );
    }

    consumerCommitTitles.push(commit.title);
  }

  if (coreContractCommitTitle === undefined) {
    throw new Error(
      "Campaign sequence must include an independent campaign-core contract commit first.",
    );
  }

  return {
    coreContractCommitTitle,
    consumerCommitTitles,
  };
}

export function createRevertibleCampaignCommitPlan(
  commits: readonly CampaignCoreContractCommit[],
): RevertibleCampaignCommitPlan {
  const revertUnits: RevertibleCampaignCommitUnit[] = [];

  for (const commit of commits) {
    const campaignAreas = [
      ...new Set(commit.files.map(classifyCampaignChangePath)),
    ].filter((area) => area !== "other");

    if (campaignAreas.length === 0) {
      continue;
    }

    if (campaignAreas.length > 1) {
      throw new Error(
        `Campaign commit must be revertible as one area; split mixed areas (${campaignAreas.join(
          ", ",
        )}): ${commit.title}.`,
      );
    }

    const area = campaignAreas[0] as Exclude<CampaignChangeArea, "other">;
    const expectedPrefix = CAMPAIGN_AREA_COMMIT_TITLE_PREFIXES[area];

    if (!commit.title.startsWith(expectedPrefix)) {
      throw new Error(
        `Campaign commit title must match its revert area ${area} with ${expectedPrefix} ${commit.title}.`,
      );
    }

    revertUnits.push({
      title: commit.title,
      area,
    });
  }

  if (revertUnits.length === 0) {
    throw new Error("PR must include at least one revertible Campaign commit unit.");
  }

  return { revertUnits };
}

function normalizeCampaignCorePolicyPath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function assertCampaignCommitSequenceHasExplainableIntermediateStates(
  commits: readonly CampaignCoreContractCommit[],
): CampaignIntermediateReviewState[] {
  const reviewStates: CampaignIntermediateReviewState[] = [];

  for (const commit of commits) {
    const campaignAreas = [
      ...new Set(commit.files.map(classifyCampaignChangePath)),
    ].filter((area) => area !== "other");

    if (campaignAreas.length === 0) {
      continue;
    }

    if (campaignAreas.length > 1) {
      throw new Error(
        `Giant one-shot Campaign diff has no explainable intermediate state: ${commit.title}.`,
      );
    }

    const area = campaignAreas[0] as Exclude<CampaignChangeArea, "other">;
    const expectedPrefix = CAMPAIGN_AREA_COMMIT_TITLE_PREFIXES[area];

    if (!commit.title.startsWith(expectedPrefix)) {
      throw new Error(
        `Campaign intermediate state title must match ${area} with ${expectedPrefix} ${commit.title}.`,
      );
    }

    reviewStates.push({
      title: commit.title,
      area,
      explanation: describeCampaignIntermediateState(area),
      verification:
        area === "campaign_core"
          ? CAMPAIGN_CORE_FOCUSED_MODEL_TEST_COMMAND
          : `npm run commit:title -- "${commit.title}"`,
      nextBoundary: null,
    });
  }

  if (reviewStates.length === 0) {
    throw new Error(
      "Campaign sequence must include at least one explainable intermediate state.",
    );
  }

  return reviewStates.map((state, index) => ({
    ...state,
    nextBoundary: reviewStates[index + 1]?.area ?? null,
  }));
}

function describeCampaignIntermediateState(
  area: Exclude<CampaignChangeArea, "other">,
): string {
  if (area === "campaign_core") {
    return "Campaign core contract is reviewable with focused model verification before consumers change.";
  }

  const label = campaignAreaReviewLabel(area);

  return `${label} consumer is reviewable separately because it only consumes the prior Campaign core contract.`;
}

function campaignAreaReviewLabel(area: Exclude<CampaignChangeArea, "other">) {
  if (area === "route") {
    return "API route";
  }

  if (area === "ui") {
    return "UI";
  }

  return area
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
