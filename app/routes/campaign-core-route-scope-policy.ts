export type CampaignCoreRouteChangePlan = {
  scope: "api";
  files: string[];
  commitTitlePrefix: "api:";
};

const CAMPAIGN_ROUTE_FILE_PATTERN =
  /^app\/routes\/(?:api\.campaign(?:[.-][A-Za-z0-9-]+)?|campaign(?:-[A-Za-z0-9-]+)?-api|campaign-core-route-scope-policy)(?:\.test)?\.ts$/;

export function isCampaignCoreRoutePath(path: string): boolean {
  return CAMPAIGN_ROUTE_FILE_PATTERN.test(normalizeRouteScopePath(path));
}

export function createCampaignCoreRouteChangePlan(
  paths: readonly string[],
): CampaignCoreRouteChangePlan {
  const files = paths.map(normalizeRouteScopePath);
  const outOfScopeFiles = files.filter((path) => !isCampaignCoreRoutePath(path));

  if (files.length === 0 || outOfScopeFiles.length > 0) {
    throw new Error(
      `Campaign API route changes must stay separate from persistence and plugin adapter changes; out of scope: ${
        outOfScopeFiles.join(", ") || "none"
      }.`,
    );
  }

  return {
    scope: "api",
    files,
    commitTitlePrefix: "api:",
  };
}

function normalizeRouteScopePath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
