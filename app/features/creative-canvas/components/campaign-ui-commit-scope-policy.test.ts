import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertCampaignUiCommitsFollowCoreContract,
  createCampaignUiChangePlan,
  isCampaignUiChangePath,
} from "./campaign-ui-commit-scope-policy.ts";

test("campaign UI changes are limited to rendering surfaces", () => {
  const plan = createCampaignUiChangePlan([
    "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    "app/features/creative-canvas/components/landing-page-renderer.tsx",
    "app/routes/campaign-landing.tsx",
    "app/app.css",
  ]);

  assert.equal(plan.scope, "ui");
  assert.equal(plan.commitTitlePrefix, "ui:");
  assert.deepEqual(plan.files, [
    "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    "app/features/creative-canvas/components/landing-page-renderer.tsx",
    "app/routes/campaign-landing.tsx",
    "app/app.css",
  ]);
});

test("campaign UI scope rejects Campaign core model and API route contracts", () => {
  assert.throws(
    () =>
      createCampaignUiChangePlan([
        "app/features/creative-canvas/components/creative-canvas-screen.tsx",
        "app/features/creative-canvas/model/creative-canvas.ts",
      ]),
    /Campaign UI changes must stay separate from core model and route contracts/,
  );

  assert.throws(
    () =>
      createCampaignUiChangePlan([
        "app/features/creative-canvas/components/creative-canvas-screen.tsx",
        "app/routes/api.campaign.ts",
      ]),
    /Campaign UI changes must stay separate from core model and route contracts/,
  );
});

test("campaign UI scope rejects storage plugin and unrelated files", () => {
  for (const path of [
    "app/features/creative-canvas/client/campaign-surface-tracking.ts",
    "app/features/plugins/model/plugin-representation.ts",
    "docs/commit-scope-policy.md",
  ]) {
    assert.throws(
      () =>
        createCampaignUiChangePlan([
          "app/features/creative-canvas/components/creative-canvas-screen.tsx",
          path,
        ]),
      /Campaign UI changes must stay separate/,
      path,
    );
  }
});

test("campaign UI path detection keeps route contracts out of UI commits", () => {
  assert.equal(
    isCampaignUiChangePath(
      "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    ),
    true,
  );
  assert.equal(isCampaignUiChangePath("app/routes/campaign-landing.tsx"), true);
  assert.equal(isCampaignUiChangePath("app/app.css"), true);
  assert.equal(isCampaignUiChangePath("app/routes/api.campaign.ts"), false);
  assert.equal(
    isCampaignUiChangePath("app/features/creative-canvas/model/creative-canvas.ts"),
    false,
  );
});

test("campaign UI commits follow a prior core contract commit without editing core files", () => {
  const boundary = assertCampaignUiCommitsFollowCoreContract([
    {
      title: "campaign-core: add completion transition guard",
      files: [
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/model/campaign-completion.test.ts",
      ],
    },
    {
      title: "ui: render completion blockers",
      files: [
        "app/features/creative-canvas/components/creative-canvas-screen.tsx",
        "app/routes/campaign-landing.tsx",
      ],
    },
  ]);

  assert.equal(
    boundary.coreContractCommitTitle,
    "campaign-core: add completion transition guard",
  );
  assert.deepEqual(boundary.uiCommitTitles, [
    "ui: render completion blockers",
  ]);
});

test("campaign UI commits reject work before a core contract commit", () => {
  assert.throws(
    () =>
      assertCampaignUiCommitsFollowCoreContract([
        {
          title: "ui: render completion blockers",
          files: [
            "app/features/creative-canvas/components/creative-canvas-screen.tsx",
          ],
        },
        {
          title: "campaign-core: add completion transition guard",
          files: ["app/features/creative-canvas/model/creative-canvas.ts"],
        },
      ]),
    /must follow a prior campaign-core contract commit/,
  );
});

test("campaign UI commits reject mixed core contract files", () => {
  assert.throws(
    () =>
      assertCampaignUiCommitsFollowCoreContract([
        {
          title: "campaign-core: add completion transition guard",
          files: ["app/features/creative-canvas/model/creative-canvas.ts"],
        },
        {
          title: "ui: render completion blockers",
          files: [
            "app/features/creative-canvas/components/creative-canvas-screen.tsx",
            "app/features/creative-canvas/model/creative-canvas.ts",
          ],
        },
      ]),
    /must be in a campaign-core commit|must not include UI files|must stay separate from core model and route contracts/,
  );
});

test("campaign UI commits reject later core contract commits in the same sequence", () => {
  assert.throws(
    () =>
      assertCampaignUiCommitsFollowCoreContract([
        {
          title: "campaign-core: add completion transition guard",
          files: ["app/features/creative-canvas/model/creative-canvas.ts"],
        },
        {
          title: "ui: render completion blockers",
          files: [
            "app/features/creative-canvas/components/creative-canvas-screen.tsx",
          ],
        },
        {
          title: "campaign-core: revise completion transition guard",
          files: ["app/features/creative-canvas/model/creative-canvas.ts"],
        },
      ]),
    /must precede campaign UI commits/,
  );
});
