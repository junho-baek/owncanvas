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
    revisionAfter?: unknown;
    changed?: unknown;
    data?: unknown;
    createdIds?: unknown;
    updatedIds?: unknown;
    deletedIds?: unknown;
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

function runCli(args: string[]): CliResult {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", cliPath, ...args],
    {
      encoding: "utf8",
    },
  );
  const trimmedStdout = result.stdout.trim();

  assert.notEqual(trimmedStdout, "", result.stderr);

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json: JSON.parse(trimmedStdout) as CliResult["json"],
  };
}
