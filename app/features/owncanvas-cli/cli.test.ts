import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

type CliResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  json: {
    schemaVersion?: unknown;
    ok?: unknown;
    command?: unknown;
    workspacePath?: unknown;
    campaignId?: unknown;
    revisionBefore?: unknown;
    revisionAfter?: unknown;
    changed?: unknown;
    data?: unknown;
    createdIds?: unknown;
    updatedIds?: unknown;
    deletedIds?: unknown;
    warnings?: Array<{ code?: unknown }>;
    errors: Array<{ code?: unknown }>;
  };
};

const cliPath = path.resolve("app/features/owncanvas-cli/cli.ts");

test("OwnCanvas CLI initializes a workspace and manages Campaigns with JSON envelopes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-cli-public-"));

  const init = runCli(["workspace", "init", "--root", root, "--json"]);
  assert.equal(init.status, 0);
  assert.equal(init.json.schemaVersion, "owncanvas.cli-result.v1");
  assert.equal(init.json.ok, true);
  assert.equal(init.json.command, "workspace init");
  assert.equal(init.json.workspacePath, path.join(root, ".owncanvas"));
  assert.equal(init.json.changed, true);
  assert.deepEqual(init.json.errors, []);

  const status = runCli(["workspace", "status", "--root", root, "--json"]);
  assert.equal(status.status, 0);
  assert.equal(status.json.ok, true);
  assert.equal(status.json.command, "workspace status");
  assert.equal((status.json.data as { initialized: boolean }).initialized, true);

  const created = runCli([
    "campaign",
    "create",
    "--root",
    root,
    "--id",
    "launch-pack",
    "--title",
    "Launch Pack",
    "--json",
  ]);
  assert.equal(created.status, 0);
  assert.equal(created.json.ok, true);
  assert.equal(created.json.command, "campaign create");
  assert.equal(created.json.campaignId, "launch-pack");
  assert.equal(created.json.changed, true);
  assert.equal(typeof created.json.revisionAfter, "string");

  const listed = runCli(["campaign", "list", "--root", root, "--json"]);
  assert.equal(listed.status, 0);
  assert.equal(listed.json.command, "campaign list");
  assert.deepEqual(
    ((listed.json.data as { campaigns: Array<{ id: string }> }).campaigns ?? []).map(
      (campaign) => campaign.id,
    ),
    ["launch-pack"],
  );

  const inspected = runCli([
    "campaign",
    "inspect",
    "--root",
    root,
    "launch-pack",
    "--json",
  ]);
  assert.equal(inspected.status, 0);
  assert.equal(inspected.json.command, "campaign inspect");
  assert.equal(
    (inspected.json.data as { campaign: { title: string } }).campaign.title,
    "Launch Pack",
  );

  const opened = runCli([
    "campaign",
    "open",
    "--root",
    root,
    "launch-pack",
    "--json",
  ]);
  assert.equal(opened.status, 0);
  assert.equal(opened.json.command, "campaign open");
  assert.equal(
    (opened.json.data as { canvasPath: string }).canvasPath,
    "/campaigns/launch-pack/canvas",
  );

  const out = path.join(root, "exports", "launch-pack.json");
  const exported = runCli([
    "campaign",
    "export",
    "--root",
    root,
    "launch-pack",
    "--out",
    out,
    "--json",
  ]);
  assert.equal(exported.status, 0);
  assert.equal(exported.json.command, "campaign export");
  assert.equal((exported.json.data as { outPath: string }).outPath, out);

  const exportedDocument = JSON.parse(await readFile(out, "utf8")) as {
    id: string;
    schemaVersion: string;
  };
  assert.equal(exportedDocument.id, "launch-pack");
  assert.equal(exportedDocument.schemaVersion, "owncanvas.campaign.v1");
});

test("OwnCanvas CLI maps usage errors to JSON exit code 6", () => {
  const result = runCli(["campaign", "inspect", "--json"]);

  assert.equal(result.status, 6);
  assert.equal(result.json.ok, false);
  assert.equal(result.json.errors[0].code, "usage_error");
});

test("OwnCanvas CLI authors blocks, assets, edges, and apply plans", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-cli-authoring-"));
  runCli(["workspace", "init", "--root", root, "--json"]);
  runCli([
    "campaign",
    "create",
    "--root",
    root,
    "--id",
    "launch-pack",
    "--title",
    "Launch Pack",
    "--json",
  ]);

  const imageBlock = runCli([
    "block",
    "add",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--kind",
    "image",
    "--id",
    "image_hero",
    "--title",
    "Hero",
    "--x",
    "100",
    "--y",
    "200",
    "--json",
  ]);
  assert.equal(imageBlock.status, 0);
  assert.equal(imageBlock.json.command, "block add");
  assert.deepEqual(imageBlock.json.createdIds, ["image_hero"]);

  const imageSet = runCli([
    "block",
    "set",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "image_hero",
    "--prompt",
    "Make a premium product launch image",
    "--model",
    "openai/gpt-image-1",
    "--aspect-ratio",
    "9:16",
    "--count",
    "3",
    "--json",
  ]);
  assert.equal(imageSet.status, 0);
  assert.deepEqual(imageSet.json.updatedIds, ["image_hero"]);

  const asset = runCli([
    "asset",
    "import",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--id",
    "ref_hero",
    "--uri",
    "file:///tmp/ref.png",
    "--media-type",
    "image",
    "--title",
    "Reference",
    "--json",
  ]);
  assert.equal(asset.status, 0);
  assert.deepEqual(asset.json.createdIds, ["ref_hero"]);

  runCli([
    "block",
    "add",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--kind",
    "video",
    "--id",
    "video_hero",
    "--json",
  ]);
  const edge = runCli([
    "edge",
    "connect",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "image_hero:generated_image_asset",
    "video_hero:reference_image",
    "--json",
  ]);
  assert.equal(edge.status, 0);
  assert.deepEqual(edge.json.createdIds, [
    "edge_image_hero_generated_image_asset_video_hero_reference_image",
  ]);

  const planPath = path.join(root, "authoring-plan.json");
  await writeFile(
    planPath,
    JSON.stringify({
      commands: [
        { type: "block.add", id: "text_prompt", kind: "text" },
        {
          type: "edge.connect",
          source: "text_prompt:prompt",
          target: "image_hero:prompt",
        },
      ],
    }),
    "utf8",
  );
  const applied = runCli([
    "apply",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--plan",
    planPath,
    "--json",
  ]);
  assert.equal(applied.status, 0);
  assert.equal(applied.json.command, "apply");
  assert.deepEqual(applied.json.createdIds, [
    "text_prompt",
    "edge_text_prompt_prompt_image_hero_prompt",
  ]);

  const inspected = runCli([
    "campaign",
    "inspect",
    "--root",
    root,
    "launch-pack",
    "--json",
  ]);
  const campaign = (inspected.json.data as { campaign: {
    canvasState: { nodes: Array<{ id: string; properties?: Record<string, unknown> }>; edges: Array<{ id: string }> };
    assets: Array<{ id: string }>;
  } }).campaign;

  assert.deepEqual(
    campaign.canvasState.nodes.map((node) => node.id),
    ["image_hero", "video_hero", "text_prompt"],
  );
  assert.equal(campaign.canvasState.nodes[0]?.properties?.prompt, "Make a premium product launch image");
  assert.deepEqual(campaign.assets.map((candidate) => candidate.id), ["ref_hero"]);
  assert.equal(campaign.canvasState.edges.length, 2);
});

test("OwnCanvas CLI runs deterministic mock generation and exposes lifecycle commands", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-cli-generate-"));
  runCli(["workspace", "init", "--root", root, "--json"]);
  runCli([
    "campaign",
    "create",
    "--root",
    root,
    "--id",
    "launch-pack",
    "--json",
  ]);
  const planPath = path.join(root, "canvas-plan.json");
  await writeFile(
    planPath,
    JSON.stringify({
      commands: [
        { type: "block.add", id: "text_prompt", kind: "text" },
        { type: "block.add", id: "image_hero", kind: "image" },
        { type: "block.add", id: "video_hero", kind: "video" },
        {
          type: "edge.connect",
          source: "text_prompt:prompt",
          target: "image_hero:prompt",
        },
        {
          type: "edge.connect",
          source: "image_hero:generated_image_asset",
          target: "video_hero:reference_image",
        },
      ],
    }),
    "utf8",
  );
  runCli([
    "apply",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--plan",
    planPath,
    "--json",
  ]);

  const run = runCli([
    "generate",
    "run",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--canvas",
    "--run-id",
    "run_cli_canvas",
    "--json",
  ]);
  assert.equal(run.status, 0);
  assert.equal(run.json.command, "generate run");
  assert.equal((run.json.data as { status: { status: string } }).status.status, "succeeded");

  const status = runCli([
    "generate",
    "status",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "run_cli_canvas",
    "--json",
  ]);
  const logs = runCli([
    "generate",
    "logs",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "run_cli_canvas",
    "--json",
  ]);
  const outputs = runCli([
    "generate",
    "outputs",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "run_cli_canvas",
    "--json",
  ]);
  const retry = runCli([
    "generate",
    "retry",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "run_cli_canvas",
    "--json",
  ]);

  assert.equal((status.json.data as { status: { status: string } }).status.status, "succeeded");
  assert.equal((logs.json.data as { events: Array<{ type: string }> }).events.some((event) => event.type === "run.completed"), true);
  assert.deepEqual(
    (outputs.json.data as { outputs: { outputs: Array<{ blockId: string }> } }).outputs.outputs.map((output) => output.blockId),
    ["text_prompt", "image_hero", "video_hero"],
  );
  assert.equal((retry.json.data as { status: { parentRunId: string } }).status.parentRunId, "run_cli_canvas");
});

test("OwnCanvas CLI validates, dry-runs, diffs, and uses stable exit codes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-cli-contracts-"));
  runCli(["workspace", "init", "--root", root, "--json"]);
  runCli([
    "campaign",
    "create",
    "--root",
    root,
    "--id",
    "launch-pack",
    "--json",
  ]);
  runCli([
    "block",
    "add",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--kind",
    "image",
    "--id",
    "image_hero",
    "--json",
  ]);

  const validateDraft = runCli([
    "validate",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--json",
  ]);
  assert.equal(validateDraft.status, 0);
  assert.equal(validateDraft.json.command, "validate");
  assert.equal(validateDraft.json.ok, true);
  assert.equal(validateDraft.json.warnings?.[0]?.code, "block.prompt_empty");

  const validateReady = runCli([
    "validate",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--run-ready",
    "--json",
  ]);
  assert.equal(validateReady.status, 2);
  assert.equal(validateReady.json.ok, false);
  assert.equal(validateReady.json.errors[0]?.code, "block.prompt_empty");

  const exportedPath = path.join(root, "exports", "before.json");
  runCli([
    "campaign",
    "export",
    "--root",
    root,
    "launch-pack",
    "--out",
    exportedPath,
    "--json",
  ]);
  const planPath = path.join(root, "contracts-plan.json");
  await writeFile(
    planPath,
    JSON.stringify({
      commands: [{ type: "block.add", id: "text_prompt", kind: "text" }],
    }),
    "utf8",
  );

  const dryRun = runCli([
    "apply",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--plan",
    planPath,
    "--dry-run",
    "--json",
  ]);
  assert.equal(dryRun.status, 0);
  assert.equal((dryRun.json.data as { dryRun: boolean }).dryRun, true);
  assert.equal(dryRun.json.revisionBefore, dryRun.json.revisionAfter);

  const afterDryRun = runCli([
    "campaign",
    "inspect",
    "--root",
    root,
    "launch-pack",
    "--json",
  ]);
  assert.deepEqual(
    ((afterDryRun.json.data as { campaign: { canvasState: { nodes: Array<{ id: string }> } } }).campaign.canvasState.nodes)
      .map((node) => node.id),
    ["image_hero"],
  );
  assert.equal(
    (afterDryRun.json.data as { summary: { nodeCount: number } }).summary.nodeCount,
    1,
  );

  runCli([
    "apply",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--plan",
    planPath,
    "--json",
  ]);
  const structuredDiff = runCli([
    "diff",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--against",
    exportedPath,
    "--json",
  ]);
  assert.equal(structuredDiff.status, 0);
  assert.equal(structuredDiff.json.command, "diff");
  assert.equal(
    (structuredDiff.json.data as { entries: Array<{ path: string }> }).entries.some(
      (entry) => entry.path === "canvasState.nodes.1",
    ),
    true,
  );

  const humanDiff = runCliRaw([
    "diff",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--against",
    exportedPath,
  ]);
  assert.equal(humanDiff.status, 0);
  assert.match(humanDiff.stdout, /\+ canvasState\.nodes\.1:/);

  const conflict = runCli([
    "block",
    "add",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--kind",
    "text",
    "--id",
    "text_prompt",
    "--json",
  ]);
  assert.equal(conflict.status, 3);
  assert.equal(conflict.json.errors[0]?.code, "block_already_exists");

  const fileError = runCli([
    "campaign",
    "inspect",
    "--root",
    path.join(root, "missing-workspace"),
    "launch-pack",
    "--json",
  ]);
  assert.equal(fileError.status, 7);
  assert.equal(fileError.json.errors[0]?.code, "workspace_not_found");
});

test("OwnCanvas CLI keeps provider runs opt-in and records guarded manifests", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-cli-provider-"));
  runCli(["workspace", "init", "--root", root, "--json"]);
  runCli([
    "campaign",
    "create",
    "--root",
    root,
    "--id",
    "launch-pack",
    "--json",
  ]);
  runCli([
    "block",
    "add",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "--kind",
    "image",
    "--id",
    "image_hero",
    "--json",
  ]);
  runCli([
    "block",
    "set",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "image_hero",
    "--prompt",
    "Create a launch image",
    "--json",
  ]);
  const envFile = path.join(root, "provider.env");
  await writeFile(envFile, "OWNCANVAS_REPLICATE_API_TOKEN=test-token\n", "utf8");

  const defaultMock = runCli([
    "generate",
    "run",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "image_hero",
    "--run-id",
    "run_default_mock",
    "--json",
  ]);
  assert.equal(defaultMock.status, 0);
  assert.equal((defaultMock.json.data as { status: { provider?: string } }).status.provider, "mock");

  const missingCostIntent = runCli([
    "generate",
    "run",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "image_hero",
    "--provider",
    "real",
    "--env-file",
    envFile,
    "--json",
  ]);
  assert.equal(missingCostIntent.status, 4);
  assert.equal(missingCostIntent.json.errors[0]?.code, "cost_intent_required");

  const missingCredential = runCli([
    "generate",
    "run",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "image_hero",
    "--provider",
    "real",
    "--allow-cost",
    "--json",
  ]);
  assert.equal(missingCredential.status, 5);
  assert.equal(missingCredential.json.errors[0]?.code, "provider_credential_missing");

  const fakeFailure = runCli([
    "generate",
    "run",
    "--root",
    root,
    "--campaign",
    "launch-pack",
    "image_hero",
    "--provider",
    "fake-failure",
    "--allow-cost",
    "--max-cost-usd",
    "1",
    "--env-file",
    envFile,
    "--run-id",
    "run_provider_failure",
    "--json",
  ]);
  assert.equal(fakeFailure.status, 5);
  assert.equal(fakeFailure.json.errors[0]?.code, "provider_fake_failure");

  const manifestPath = path.join(
    root,
    ".owncanvas",
    "campaigns",
    "launch-pack",
    "runs",
    "run_provider_failure",
    "provider-manifest.json",
  );
  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as {
    status: string;
    failureDetails: Array<{ code: string }>;
  };

  assert.equal(manifest.status, "failed");
  assert.equal(manifest.failureDetails[0]?.code, "provider_fake_failure");
  assert.equal(manifestRaw.includes("test-token"), false);
});

function runCli(args: string[]): CliResult {
  const result = runCliRaw(args);
  const trimmedStdout = result.stdout.trim();

  assert.notEqual(trimmedStdout, "", result.stderr);

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json: JSON.parse(trimmedStdout) as CliResult["json"],
  };
}

function runCliRaw(args: string[]) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", cliPath, ...args],
    {
      encoding: "utf8",
    },
  );
}
