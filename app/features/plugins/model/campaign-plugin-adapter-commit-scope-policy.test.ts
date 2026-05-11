import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertCampaignCorePluginCommitHistoryIsSeparated,
  assertCampaignPluginAdapterCommitsFollowCoreContract,
  createCampaignPluginAdapterChangePlan,
  isCampaignPluginAdapterChangePath,
} from "./campaign-plugin-adapter-commit-scope-policy.ts";

test("campaign plugin adapter changes are limited to provider and automation glue", () => {
  const plan = createCampaignPluginAdapterChangePlan([
    "app/features/plugins/model/plugin-representation.ts",
    "app/features/plugins/model/instagram-comment-dm-flow.ts",
    "app/features/creative-canvas/adapters/plugin-provider-bridge.ts",
    "app/routes/api.agent-plugins.ts",
  ]);

  assert.equal(plan.scope, "plugin");
  assert.equal(plan.commitTitlePrefix, "plugin:");
  assert.deepEqual(plan.files, [
    "app/features/plugins/model/plugin-representation.ts",
    "app/features/plugins/model/instagram-comment-dm-flow.ts",
    "app/features/creative-canvas/adapters/plugin-provider-bridge.ts",
    "app/routes/api.agent-plugins.ts",
  ]);
});

test("campaign plugin adapter scope rejects Campaign core UI and storage changes", () => {
  for (const path of [
    "app/features/creative-canvas/model/creative-canvas.ts",
    "app/features/creative-canvas/components/creative-canvas-screen.tsx",
    "app/features/creative-canvas/client/campaign-surface-tracking.ts",
  ]) {
    assert.throws(
      () =>
        createCampaignPluginAdapterChangePlan([
          "app/features/plugins/model/plugin-representation.ts",
          path,
        ]),
      /Campaign plugin adapter changes must stay separate from core, UI, storage, and API changes/,
      path,
    );
  }
});

test("campaign plugin adapter scope rejects campaign API route contracts and docs", () => {
  for (const path of [
    "app/routes/api.campaign.ts",
    "app/routes/campaign-reporting.tsx",
    "docs/commit-scope-policy.md",
  ]) {
    assert.throws(
      () =>
        createCampaignPluginAdapterChangePlan([
          "app/features/plugins/model/plugin-representation.ts",
          path,
        ]),
      /Campaign plugin adapter changes must stay separate/,
      path,
    );
  }
});

test("campaign plugin adapter path detection keeps core consumers out of plugin commits", () => {
  assert.equal(
    isCampaignPluginAdapterChangePath(
      "app/features/plugins/model/plugin-representation.ts",
    ),
    true,
  );
  assert.equal(
    isCampaignPluginAdapterChangePath(
      "app/features/creative-canvas/adapters/plugin-provider-bridge.ts",
    ),
    true,
  );
  assert.equal(isCampaignPluginAdapterChangePath("app/routes/api.agent-plugins.ts"), true);
  assert.equal(
    isCampaignPluginAdapterChangePath(
      "app/features/creative-canvas/model/creative-canvas.ts",
    ),
    false,
  );
  assert.equal(
    isCampaignPluginAdapterChangePath(
      "app/features/creative-canvas/client/campaign-surface-tracking.ts",
    ),
    false,
  );
});

test("campaign provider automation and extension adapters count as plugin changes", () => {
  for (const path of [
    "app/features/creative-canvas/adapters/instagram-provider-adapter.ts",
    "app/features/creative-canvas/adapters/campaign-automation-adapter.ts",
    "app/features/creative-canvas/adapters/browser-extension-adapter.ts",
  ]) {
    assert.equal(isCampaignPluginAdapterChangePath(path), true, path);
  }
});

test("campaign plugin adapter commits follow a prior core contract commit", () => {
  const boundary = assertCampaignPluginAdapterCommitsFollowCoreContract([
    {
      title: "campaign-core: add completion transition guard",
      files: [
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/model/campaign-completion.test.ts",
      ],
    },
    {
      title: "plugin: adapt completion blockers",
      files: [
        "app/features/plugins/model/plugin-representation.ts",
        "app/features/creative-canvas/adapters/plugin-provider-bridge.ts",
        "app/routes/api.agent-plugins.ts",
      ],
    },
  ]);

  assert.equal(
    boundary.coreContractCommitTitle,
    "campaign-core: add completion transition guard",
  );
  assert.deepEqual(boundary.pluginCommitTitles, [
    "plugin: adapt completion blockers",
  ]);
});

test("campaign commit history keeps core contract and plugin commits separated", () => {
  const history = assertCampaignCorePluginCommitHistoryIsSeparated([
    {
      title: "campaign-core: add completion transition guard",
      files: [
        "app/features/creative-canvas/model/creative-canvas.ts",
        "app/features/creative-canvas/model/campaign-completion.test.ts",
      ],
    },
    {
      title: "docs: record campaign commit policy",
      files: ["docs/commit-scope-policy.md"],
    },
    {
      title: "plugin: adapt completion blockers",
      files: [
        "app/features/plugins/model/plugin-representation.ts",
        "app/features/creative-canvas/adapters/plugin-provider-bridge.ts",
      ],
    },
  ]);

  assert.deepEqual(history.coreContractCommitTitles, [
    "campaign-core: add completion transition guard",
  ]);
  assert.deepEqual(history.pluginCommitTitles, [
    "plugin: adapt completion blockers",
  ]);
});

test("campaign commit history rejects mixed core contract and plugin commits", () => {
  assert.throws(
    () =>
      assertCampaignCorePluginCommitHistoryIsSeparated([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/features/plugins/model/plugin-representation.ts",
          ],
        },
      ]),
    /Campaign commit history must not mix core contract and plugin changes/,
  );
});

test("campaign plugin adapter commits reject plugin changes before core", () => {
  assert.throws(
    () =>
      assertCampaignPluginAdapterCommitsFollowCoreContract([
        {
          title: "plugin: adapt completion blockers",
          files: ["app/features/plugins/model/plugin-representation.ts"],
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

test("campaign plugin adapter commits reject mixed core and plugin files", () => {
  assert.throws(
    () =>
      assertCampaignPluginAdapterCommitsFollowCoreContract([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/features/plugins/model/plugin-representation.ts",
          ],
        },
      ]),
    /must precede campaign plugin commits/,
  );
});

test("campaign plugin adapter commits require a plugin title after core", () => {
  assert.throws(
    () =>
      assertCampaignPluginAdapterCommitsFollowCoreContract([
        {
          title: "campaign-core: add completion transition guard",
          files: [
            "app/features/creative-canvas/model/creative-canvas.ts",
            "app/features/creative-canvas/model/campaign-completion.test.ts",
          ],
        },
        {
          title: "campaign-core: adapt completion blockers",
          files: ["app/features/plugins/model/plugin-representation.ts"],
        },
      ]),
    /must be in a plugin commit after the core contract commit/,
  );
});
