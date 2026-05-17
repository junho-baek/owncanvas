import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
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
