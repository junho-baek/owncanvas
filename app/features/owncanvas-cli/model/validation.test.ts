import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { applyAuthoringCommands } from "./authoring-commands.ts";
import { stableStringify } from "./stable-json.ts";
import {
  createCampaignInWorkspace,
  initializeWorkspace,
  inspectCampaignInWorkspace,
  updateCampaignInWorkspace,
} from "./workspace-repository.ts";
import {
  createCampaignInspectSummary,
  validateCampaignWorkspace,
} from "./validation.ts";

test("validateCampaignWorkspace reports draft warnings without failing default validation", async () => {
  const root = await createValidationWorkspace();

  const report = await validateCampaignWorkspace({
    root,
    campaignId: "agent-contracts",
  });

  assert.equal(report.valid, true);
  assert.equal(report.errors.length, 0);
  assert.equal(
    report.warnings.some((warning) => warning.code === "block.prompt_empty"),
    true,
  );
  assert.equal(report.summary.nodeCount, 1);
  assert.equal(report.summary.blocksByKind.image, 1);
});

test("validateCampaignWorkspace promotes run-ready warnings to errors", async () => {
  const root = await createValidationWorkspace();

  const report = await validateCampaignWorkspace({
    root,
    campaignId: "agent-contracts",
    runReady: true,
  });

  assert.equal(report.valid, false);
  assert.equal(
    report.errors.some((error) => error.code === "block.prompt_empty"),
    true,
  );
  assert.equal(report.warnings.length, 0);
});

test("validateCampaignWorkspace reports missing asset references and output refs", async () => {
  const root = await createValidationWorkspace();
  const inspected = await inspectCampaignInWorkspace({
    root,
    id: "agent-contracts",
  });
  const mutated = {
    ...inspected.document,
    canvasState: {
      ...inspected.document.canvasState,
      nodes: inspected.document.canvasState.nodes.map((node) =>
        node.id === "image_hero"
          ? {
              ...node,
              properties: {
                ...node.properties,
                referenceImageAssetId: "missing_ref",
                latestResultRefs: {
                  generatedAssetIds: ["missing_output"],
                },
              },
            }
          : node,
      ),
    },
  };
  await writeFile(
    inspected.paths.campaignJsonPath,
    stableStringify(mutated),
    "utf8",
  );

  const report = await validateCampaignWorkspace({
    root,
    campaignId: "agent-contracts",
  });

  assert.equal(report.valid, false);
  assert.equal(
    report.errors.some((error) => error.code === "asset_ref_missing"),
    true,
  );
  assert.equal(
    report.errors.some((error) => error.code === "output_ref_missing"),
    true,
  );
});

test("validateCampaignWorkspace checks model catalog and run manifests", async () => {
  const root = await createValidationWorkspace();
  await updateCampaignInWorkspace({
    root,
    id: "agent-contracts",
    command: "test.unknown-model",
    update: (document) => ({
      ...document,
      canvasState: {
        ...document.canvasState,
        nodes: document.canvasState.nodes.map((node) =>
          node.id === "image_hero"
            ? {
                ...node,
                properties: {
                  ...node.properties,
                  modelSlug: "missing/model",
                },
              }
            : node,
        ),
      },
      campaignSpec: {
        ...document.campaignSpec,
        nodes: document.campaignSpec.nodes.map((node) =>
          node.id === "image_hero"
            ? {
                ...node,
                properties: {
                  ...node.properties,
                  modelSlug: "missing/model",
                },
              }
            : node,
        ),
      },
    }),
  });
  const inspected = await inspectCampaignInWorkspace({
    root,
    id: "agent-contracts",
  });
  const runPath = path.join(inspected.paths.campaignDirectoryPath, "runs", "run_bad");
  await mkdir(runPath, { recursive: true });
  await writeFile(
    path.join(runPath, "status.json"),
    stableStringify({ schemaVersion: "x", runId: "wrong" }),
    "utf8",
  );

  const report = await validateCampaignWorkspace({
    root,
    campaignId: "agent-contracts",
  });

  assert.equal(report.valid, false);
  assert.equal(report.errors.some((error) => error.code === "block.model_unknown"), true);
  assert.equal(
    report.errors.some((error) => error.code === "run_manifest.run_id_mismatch"),
    true,
  );
  assert.equal(
    report.errors.filter((error) => error.code === "run_manifest_invalid").length,
    2,
  );
});

test("createCampaignInspectSummary reports agent-useful state", async () => {
  const root = await createValidationWorkspace();
  const inspected = await inspectCampaignInWorkspace({
    root,
    id: "agent-contracts",
  });

  const summary = await createCampaignInspectSummary({
    document: inspected.document,
    campaignDirectoryPath: inspected.paths.campaignDirectoryPath,
  });

  assert.equal(summary.campaignId, "agent-contracts");
  assert.equal(summary.nodeCount, 1);
  assert.deepEqual(summary.promptsMissingBlockIds, ["image_hero"]);
  assert.deepEqual(summary.models, [
    {
      blockId: "image_hero",
      kind: "image",
      providerId: "replicate",
      modelSlug: "google/nano-banana",
      serviceAdapterId: "replicate",
    },
  ]);
});

async function createValidationWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-validation-"));
  await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });
  await createCampaignInWorkspace({
    root,
    id: "agent-contracts",
    title: "Agent Contracts",
    now: () => "2026-05-18T00:01:00.000Z",
  });
  await updateCampaignInWorkspace({
    root,
    id: "agent-contracts",
    command: "test.add-image",
    now: () => "2026-05-18T00:02:00.000Z",
    update: (document) =>
      applyAuthoringCommands(document, [
        {
          type: "block.add",
          id: "image_hero",
          kind: "image",
          title: "Hero Image",
        },
      ]).document,
  });

  return root;
}
