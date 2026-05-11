import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertCampaignCoreContractCommitsAreUiFree,
  assertCampaignCoreContractCommitExistsFirst,
  assertCampaignCommitSequenceHasExplainableIntermediateStates,
  CAMPAIGN_CORE_FOCUSED_MODEL_TEST_COMMAND,
  classifyCampaignChangePath,
  createCampaignCoreContractCommitPlan,
  createCampaignCoreVerificationPlan,
  createRevertibleCampaignCommitPlan,
  isCampaignCoreContractPath,
  isCampaignCoreFocusedModelTestPath,
} from "./campaign-core-verification-policy.ts";

test("campaign core changes require a focused model test as the first verification step", () => {
  const plan = createCampaignCoreVerificationPlan([
    "app/features/creative-canvas/model/campaign-core-verification-policy.ts",
    "app/features/creative-canvas/model/campaign-core-verification-policy.test.ts",
  ]);

  assert.equal(plan.scope, "campaign_core");
  assert.equal(plan.firstEvidence, "focused_model_test");
  assert.equal(plan.commands[0], CAMPAIGN_CORE_FOCUSED_MODEL_TEST_COMMAND);
  assert.match(plan.commitTitlePrefix, /^campaign-core:/);
});

test("campaign core contract commit plan is limited to model contract files", () => {
  const plan = createCampaignCoreContractCommitPlan([
    "app/features/creative-canvas/model/creative-canvas.ts",
    "app/features/creative-canvas/model/campaign-completion.test.ts",
  ]);

  assert.equal(plan.scope, "campaign_core");
  assert.equal(plan.commitTitlePrefix, "campaign-core:");
  assert.deepEqual(plan.files, [
    "app/features/creative-canvas/model/creative-canvas.ts",
    "app/features/creative-canvas/model/campaign-completion.test.ts",
  ]);
});

test("campaign core contract path detection excludes downstream consumers", () => {
  assert.equal(
    isCampaignCoreContractPath(
      "app/features/creative-canvas/model/creative-canvas.ts",
    ),
    true,
  );
  assert.equal(
    isCampaignCoreContractPath(
      "app/features/creative-canvas/model/campaign-completion.test.ts",
    ),
    true,
  );

  for (const path of [
    "app/routes/api.campaign.ts",
    "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    "app/features/creative-canvas/client/campaign-surface-tracking.ts",
    "app/features/plugins/model/plugin-representation.ts",
    "docs/commit-scope-policy.md",
  ]) {
    assert.equal(isCampaignCoreContractPath(path), false, path);
  }
});

test("campaign core contract commit plan rejects non-core files", () => {
  for (const path of [
    "app/routes/api.campaign.ts",
    "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    "app/features/creative-canvas/client/campaign-surface-tracking.ts",
    "app/features/plugins/model/plugin-representation.ts",
  ]) {
    assert.throws(
      () =>
        createCampaignCoreContractCommitPlan([
          "app/features/creative-canvas/model/creative-canvas.ts",
          "app/features/creative-canvas/model/campaign-completion.test.ts",
          path,
        ]),
      /Campaign core contract commits must contain only Campaign model contract files/,
      path,
    );
  }
});

test("campaign core verification rejects core changes without a focused model test", () => {
  assert.throws(
    () =>
      createCampaignCoreVerificationPlan([
        "app/features/creative-canvas/model/creative-canvas.ts",
      ]),
    /must include a focused model test/,
  );
});

test("campaign core verification plan rejects mixed UI storage route and plugin paths", () => {
  assert.throws(
    () =>
      createCampaignCoreVerificationPlan([
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/components/creative-canvas-screen.tsx",
      ]),
    /Campaign core verification must stay model-focused/,
  );

  assert.throws(
    () =>
      createCampaignCoreVerificationPlan([
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/client/campaign-surface-tracking.ts",
      ]),
    /Campaign core verification must stay model-focused/,
  );

  assert.throws(
    () =>
      createCampaignCoreVerificationPlan([
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/routes/api.campaign.ts",
      ]),
    /Campaign core verification must stay model-focused/,
  );

  assert.throws(
    () =>
      createCampaignCoreVerificationPlan([
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/plugins/model/plugin-representation.ts",
      ]),
    /Campaign core verification must stay model-focused/,
  );

  assert.throws(
    () =>
      createCampaignCoreVerificationPlan([
        "app/features/creative-canvas/model/creative-canvas.ts",
        "README.md",
      ]),
    /Campaign core verification must stay model-focused/,
  );
});

test("campaign change path classification keeps commit areas explicit", () => {
  assert.equal(
    classifyCampaignChangePath(
      "app/features/creative-canvas/model/creative-canvas.ts",
    ),
    "campaign_core",
  );
  assert.equal(classifyCampaignChangePath("app/routes/campaign-canvas.tsx"), "route");
  assert.equal(
    classifyCampaignChangePath(
      "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    ),
    "ui",
  );
  assert.equal(
    classifyCampaignChangePath(
      "app/features/creative-canvas/client/campaign-surface-tracking.ts",
    ),
    "storage",
  );
  assert.equal(
    classifyCampaignChangePath(
      "app/features/plugins/model/plugin-representation.ts",
    ),
    "plugin",
  );
});

test("focused model tests are narrow campaign model tests", () => {
  assert.equal(
    isCampaignCoreFocusedModelTestPath(
      "app/features/creative-canvas/model/campaign-core-verification-policy.test.ts",
    ),
    true,
  );
  assert.equal(
    isCampaignCoreFocusedModelTestPath(
      "app/features/creative-canvas/model/creative-canvas.test.ts",
    ),
    false,
  );
  assert.equal(
    isCampaignCoreFocusedModelTestPath(
      "app/routes/campaign-api.test.ts",
    ),
    false,
  );
});

test("campaign core contract commits stay separate from UI files", () => {
  const boundary = assertCampaignCoreContractCommitsAreUiFree([
    {
      title: "campaign-core: add completion transition guard",
      files: [
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/model/campaign-completion.test.ts",
      ],
    },
    {
      title: "ui: render campaign completion blockers",
      files: [
        "app/features/creative-canvas/components/creative-canvas-screen.tsx",
      ],
    },
  ]);

  assert.deepEqual(boundary.coreCommitTitles, [
    "campaign-core: add completion transition guard",
  ]);
  assert.deepEqual(boundary.uiCommitTitles, [
    "ui: render campaign completion blockers",
  ]);
});

test("campaign core contract commits reject mixed UI files", () => {
  assert.throws(
    () =>
      assertCampaignCoreContractCommitsAreUiFree([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/features/creative-canvas/components/creative-canvas-screen.tsx",
          ],
        },
      ]),
    /must not include UI files/,
  );
});

test("campaign core contract commits reject mixed UI stylesheet files", () => {
  assert.throws(
    () =>
      assertCampaignCoreContractCommitsAreUiFree([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/app.css",
          ],
        },
      ]),
    /must not include UI files/,
  );
});

test("campaign core contract commits require the campaign-core title scope", () => {
  assert.throws(
    () =>
      assertCampaignCoreContractCommitsAreUiFree([
        {
          title: "ui: update completion transition guard",
          files: ["app/features/creative-canvas/model/creative-canvas.ts"],
        },
      ]),
    /must be in a campaign-core commit/,
  );
});

test("campaign core contract commit exists before UI storage route and plugin consumers", () => {
  const boundary = assertCampaignCoreContractCommitExistsFirst([
    {
      title: "campaign-core: add completion transition guard",
      files: [
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/model/campaign-completion.test.ts",
      ],
    },
    {
      title: "api: expose completion blockers",
      files: ["app/routes/api.campaign.ts"],
    },
    {
      title: "ui: render completion blockers",
      files: [
        "app/features/creative-canvas/components/creative-canvas-screen.tsx",
      ],
    },
    {
      title: "storage: persist completion blockers",
      files: [
        "app/features/creative-canvas/client/campaign-surface-tracking.ts",
      ],
    },
    {
      title: "plugin: adapt completion blockers",
      files: ["app/features/plugins/model/plugin-representation.ts"],
    },
  ]);

  assert.equal(
    boundary.coreContractCommitTitle,
    "campaign-core: add completion transition guard",
  );
  assert.deepEqual(boundary.consumerCommitTitles, [
    "api: expose completion blockers",
    "ui: render completion blockers",
    "storage: persist completion blockers",
    "plugin: adapt completion blockers",
  ]);
});

test("campaign core contract commit sequence rejects consumers before core", () => {
  assert.throws(
    () =>
      assertCampaignCoreContractCommitExistsFirst([
        {
          title: "ui: render completion blockers",
          files: [
            "app/features/creative-canvas/components/creative-canvas-screen.tsx",
          ],
        },
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/features/creative-canvas/model/campaign-completion.test.ts",
          ],
        },
      ]),
    /must follow a prior campaign-core contract commit/,
  );
});

test("campaign core contract commit sequence rejects mixed core and consumer files", () => {
  assert.throws(
    () =>
      assertCampaignCoreContractCommitExistsFirst([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/routes/api.campaign.ts",
          ],
        },
      ]),
    /must be independent/,
  );
});

test("campaign commits create one revert unit per scoped commit", () => {
  const plan = createRevertibleCampaignCommitPlan([
    {
      title: "campaign-core: add completion transition guard",
      files: [
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/model/campaign-completion.test.ts",
      ],
    },
    {
      title: "api: expose completion blockers",
      files: ["app/routes/api.campaign.ts"],
    },
    {
      title: "ui: render completion blockers",
      files: [
        "app/features/creative-canvas/components/creative-canvas-screen.tsx",
      ],
    },
    {
      title: "storage: persist completion blockers",
      files: [
        "app/features/creative-canvas/client/campaign-surface-tracking.ts",
      ],
    },
    {
      title: "plugin: adapt completion blockers",
      files: ["app/features/plugins/model/plugin-representation.ts"],
    },
  ]);

  assert.deepEqual(plan.revertUnits, [
    {
      title: "campaign-core: add completion transition guard",
      area: "campaign_core",
    },
    {
      title: "api: expose completion blockers",
      area: "route",
    },
    {
      title: "ui: render completion blockers",
      area: "ui",
    },
    {
      title: "storage: persist completion blockers",
      area: "storage",
    },
    {
      title: "plugin: adapt completion blockers",
      area: "plugin",
    },
  ]);
});

test("campaign revert plan rejects mixed area commits", () => {
  assert.throws(
    () =>
      createRevertibleCampaignCommitPlan([
        {
          title: "ui: render and persist completion blockers",
          files: [
            "app/features/creative-canvas/components/creative-canvas-screen.tsx",
            "app/features/creative-canvas/client/campaign-surface-tracking.ts",
          ],
        },
      ]),
    /must be revertible as one area/,
  );
});

test("campaign revert plan rejects title scope that does not match the changed area", () => {
  assert.throws(
    () =>
      createRevertibleCampaignCommitPlan([
        {
          title: "ui: expose completion blockers",
          files: ["app/routes/api.campaign.ts"],
        },
      ]),
    /title must match its revert area route with api:/,
  );
});

test("campaign revert plan ignores non-campaign commits but requires campaign units", () => {
  assert.throws(
    () =>
      createRevertibleCampaignCommitPlan([
        {
          title: "docs: update commit policy",
          files: ["docs/commit-scope-policy.md"],
        },
      ]),
    /at least one revertible Campaign commit unit/,
  );
});

test("campaign commit sequence exposes explainable intermediate review states", () => {
  const reviewStates = assertCampaignCommitSequenceHasExplainableIntermediateStates([
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
      ],
    },
    {
      title: "storage: persist completion blockers",
      files: [
        "app/features/creative-canvas/client/campaign-surface-tracking.ts",
      ],
    },
  ]);

  assert.deepEqual(reviewStates, [
    {
      title: "campaign-core: add completion transition guard",
      area: "campaign_core",
      explanation:
        "Campaign core contract is reviewable with focused model verification before consumers change.",
      verification: CAMPAIGN_CORE_FOCUSED_MODEL_TEST_COMMAND,
      nextBoundary: "ui",
    },
    {
      title: "ui: render completion blockers",
      area: "ui",
      explanation:
        "UI consumer is reviewable separately because it only consumes the prior Campaign core contract.",
      verification: "npm run commit:title -- \"ui: render completion blockers\"",
      nextBoundary: "storage",
    },
    {
      title: "storage: persist completion blockers",
      area: "storage",
      explanation:
        "Storage consumer is reviewable separately because it only consumes the prior Campaign core contract.",
      verification:
        "npm run commit:title -- \"storage: persist completion blockers\"",
      nextBoundary: null,
    },
  ]);
});

test("campaign commit sequence rejects giant one-shot diffs without an intermediate state", () => {
  assert.throws(
    () =>
      assertCampaignCommitSequenceHasExplainableIntermediateStates([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/features/creative-canvas/components/creative-canvas-screen.tsx",
            "app/features/creative-canvas/client/campaign-surface-tracking.ts",
          ],
        },
      ]),
    /Giant one-shot Campaign diff has no explainable intermediate state/,
  );
});
