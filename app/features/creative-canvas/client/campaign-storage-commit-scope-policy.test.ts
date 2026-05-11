import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertCampaignStorageCommitsFollowCoreContract,
  createCampaignStorageChangePlan,
  isCampaignStorageChangePath,
} from "./campaign-storage-commit-scope-policy.ts";

test("campaign storage changes are limited to persistence and compatibility surfaces", () => {
  const plan = createCampaignStorageChangePlan([
    "app/features/creative-canvas/client/campaign-surface-tracking.ts",
    "app/features/creative-canvas/model/campaign-persistence.ts",
    "app/routes/campaign-storage-compatibility.ts",
  ]);

  assert.equal(plan.scope, "storage");
  assert.equal(plan.commitTitlePrefix, "storage:");
  assert.deepEqual(plan.files, [
    "app/features/creative-canvas/client/campaign-surface-tracking.ts",
    "app/features/creative-canvas/model/campaign-persistence.ts",
    "app/routes/campaign-storage-compatibility.ts",
  ]);
});

test("campaign storage scope rejects UI component and page changes", () => {
  for (const path of [
    "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    "app/routes/campaign-reporting.tsx",
  ]) {
    assert.throws(
      () =>
        createCampaignStorageChangePlan([
          "app/features/creative-canvas/client/campaign-surface-tracking.ts",
          path,
        ]),
      /Campaign storage changes must stay separate from UI and plugin adapter changes/,
      path,
    );
  }
});

test("campaign storage scope rejects plugin adapter and Campaign core rule changes", () => {
  for (const path of [
    "app/features/plugins/model/plugin-representation.ts",
    "app/features/creative-canvas/adapters/react-flow-canvas.ts",
    "app/features/creative-canvas/model/creative-canvas.ts",
  ]) {
    assert.throws(
      () =>
        createCampaignStorageChangePlan([
          "app/features/creative-canvas/client/campaign-surface-tracking.ts",
          path,
        ]),
      /Campaign storage changes must stay separate/,
      path,
    );
  }
});

test("campaign storage path detection keeps UI and plugin adapters out of storage commits", () => {
  assert.equal(
    isCampaignStorageChangePath(
      "app/features/creative-canvas/client/campaign-surface-tracking.ts",
    ),
    true,
  );
  assert.equal(
    isCampaignStorageChangePath(
      "app/features/creative-canvas/model/campaign-persistence.ts",
    ),
    true,
  );
  assert.equal(
    isCampaignStorageChangePath(
      "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    ),
    false,
  );
  assert.equal(
    isCampaignStorageChangePath("app/features/plugins/model/plugin-representation.ts"),
    false,
  );
});

test("campaign storage commits follow a prior core contract commit", () => {
  const boundary = assertCampaignStorageCommitsFollowCoreContract([
    {
      title: "campaign-core: add completion transition guard",
      files: [
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/model/campaign-completion.test.ts",
      ],
    },
    {
      title: "storage: persist completion blockers",
      files: [
        "app/features/creative-canvas/client/campaign-surface-tracking.ts",
        "app/features/creative-canvas/model/campaign-persistence.ts",
      ],
    },
  ]);

  assert.equal(
    boundary.coreContractCommitTitle,
    "campaign-core: add completion transition guard",
  );
  assert.deepEqual(boundary.storageCommitTitles, [
    "storage: persist completion blockers",
  ]);
});

test("campaign storage commits reject storage changes before core", () => {
  assert.throws(
    () =>
      assertCampaignStorageCommitsFollowCoreContract([
        {
          title: "storage: persist completion blockers",
          files: ["app/features/creative-canvas/client/campaign-surface-tracking.ts"],
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

test("campaign storage commits reject mixed storage and plugin adapter files", () => {
  assert.throws(
    () =>
      assertCampaignStorageCommitsFollowCoreContract([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/features/creative-canvas/model/campaign-completion.test.ts",
          ],
        },
        {
          title: "storage: persist completion blockers",
          files: [
            "app/features/creative-canvas/client/campaign-surface-tracking.ts",
            "app/features/plugins/model/plugin-representation.ts",
          ],
        },
      ]),
    /Campaign storage changes must stay separate/,
  );
});

test("campaign storage commits require a storage title after core", () => {
  assert.throws(
    () =>
      assertCampaignStorageCommitsFollowCoreContract([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/features/creative-canvas/model/campaign-completion.test.ts",
          ],
        },
        {
          title: "plugin: persist completion blockers",
          files: ["app/features/creative-canvas/client/campaign-surface-tracking.ts"],
        },
      ]),
    /must be in a storage commit after the core contract commit/,
  );
});
