import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createCampaignCoreRouteChangePlan,
  isCampaignCoreRoutePath,
} from "./campaign-core-route-scope-policy.ts";

test("campaign core route changes are limited to campaign route files", () => {
  const plan = createCampaignCoreRouteChangePlan([
    "app/routes/api.campaign.ts",
    "app/routes/api.campaign-tracking-events.ts",
    "app/routes/campaign-api.test.ts",
  ]);

  assert.equal(plan.scope, "api");
  assert.equal(plan.commitTitlePrefix, "api:");
  assert.deepEqual(plan.files, [
    "app/routes/api.campaign.ts",
    "app/routes/api.campaign-tracking-events.ts",
    "app/routes/campaign-api.test.ts",
  ]);
});

test("campaign core route scope rejects model UI storage and plugin changes", () => {
  assert.throws(
    () =>
      createCampaignCoreRouteChangePlan([
        "app/routes/api.campaign.ts",
        "app/features/creative-canvas/model/creative-canvas.ts",
      ]),
    /Campaign API route changes must stay separate from persistence and plugin adapter changes/,
  );

  assert.throws(
    () =>
      createCampaignCoreRouteChangePlan([
        "app/routes/api.campaign.ts",
        "app/features/creative-canvas/components/creative-canvas-screen.tsx",
      ]),
    /Campaign API route changes must stay separate from persistence and plugin adapter changes/,
  );

  assert.throws(
    () =>
      createCampaignCoreRouteChangePlan([
        "app/routes/api.campaign.ts",
        "app/features/creative-canvas/client/campaign-surface-tracking.ts",
      ]),
    /Campaign API route changes must stay separate from persistence and plugin adapter changes/,
  );

  assert.throws(
    () =>
      createCampaignCoreRouteChangePlan([
        "app/routes/api.campaign.ts",
        "app/features/plugins/model/plugin-representation.ts",
      ]),
    /Campaign API route changes must stay separate from persistence and plugin adapter changes/,
  );
});

test("campaign API route scope excludes unrelated UI routes", () => {
  assert.equal(isCampaignCoreRoutePath("app/routes/api.campaign.ts"), true);
  assert.equal(
    isCampaignCoreRoutePath("app/routes/api.campaign-tracking-clicks.ts"),
    true,
  );
  assert.equal(isCampaignCoreRoutePath("app/routes/campaign-api.test.ts"), true);
  assert.equal(
    isCampaignCoreRoutePath("app/routes/campaign-core-route-scope-policy.test.ts"),
    true,
  );
  assert.equal(isCampaignCoreRoutePath("app/routes/campaign-reporting.tsx"), false);
  assert.equal(isCampaignCoreRoutePath("app/routes/home.tsx"), false);
  assert.equal(isCampaignCoreRoutePath("app/routes/api.agent-plugins.ts"), false);
});
