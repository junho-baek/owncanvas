import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  createProviderRunId,
  createProviderRunManifest,
  loadProviderRunEnvironment,
  OwnCanvasProviderRunError,
  redactSecrets,
  resolveProviderRunIntent,
  writeProviderRunManifest,
} from "./provider-runs.ts";
import {
  createCampaignInWorkspace,
  initializeWorkspace,
} from "./workspace-repository.ts";

test("resolveProviderRunIntent keeps mock as the default provider", () => {
  const intent = resolveProviderRunIntent({});

  assert.equal(intent.providerMode, "mock");
  assert.equal(intent.requiresCredential, false);
  assert.equal(intent.estimatedCostUsd, 0);
});

test("resolveProviderRunIntent rejects real provider without explicit cost intent", () => {
  assert.throws(
    () =>
      resolveProviderRunIntent({
        providerMode: "real",
        env: { OWNCANVAS_REPLICATE_API_TOKEN: "token" },
      }),
    (error) =>
      error instanceof OwnCanvasProviderRunError &&
      error.code === "cost_intent_required" &&
      error.exitCode === 4,
  );
});

test("resolveProviderRunIntent rejects real provider without credential", () => {
  assert.throws(
    () =>
      resolveProviderRunIntent({
        providerMode: "real",
        allowCost: true,
        env: {},
      }),
    (error) =>
      error instanceof OwnCanvasProviderRunError &&
      error.code === "provider_credential_missing" &&
      error.exitCode === 5,
  );
});

test("resolveProviderRunIntent enforces max cost guard", () => {
  assert.throws(
    () =>
      resolveProviderRunIntent({
        providerMode: "replicate",
        maxCostUsd: 0.001,
        env: { OWNCANVAS_REPLICATE_API_TOKEN: "token" },
      }),
    (error) =>
      error instanceof OwnCanvasProviderRunError &&
      error.code === "budget_guard_failed" &&
      error.exitCode === 4,
  );
});

test("loadProviderRunEnvironment reads .env.local and explicit env files without printing values", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-provider-env-"));
  const envFilePath = path.join(root, "agent.env");
  await writeFile(
    path.join(root, ".env.local"),
    "OWNCANVAS_REPLICATE_API_TOKEN=from-local\n",
    "utf8",
  );
  await writeFile(envFilePath, "OWNCANVAS_REPLICATE_API_TOKEN=from-env-file\n", "utf8");

  const env = await loadProviderRunEnvironment({
    root,
    envFilePath,
    baseEnv: {},
  });

  assert.equal(env.OWNCANVAS_REPLICATE_API_TOKEN, "from-env-file");
});

test("createProviderRunManifest redacts credential-shaped values", () => {
  const manifest = createProviderRunManifest({
    runId: "run_real_1",
    campaignId: "launch",
    target: { kind: "block", blockId: "image_hero" },
    providerMode: "real",
    serviceAdapterId: "replicate",
    model: "bytedance/seedance-1-lite",
    inputs: {
      prompt: "hello",
      token: "secret",
      nested: { apiKey: "secret-2" },
    },
    estimatedCostUsd: 0.02,
  });

  assert.equal(manifest.inputs.token, "[redacted]");
  assert.deepEqual(manifest.inputs.nested, { apiKey: "[redacted]" });
  assert.equal(
    (redactSecrets({ authorization: "bearer secret" }) as { authorization: string })
      .authorization,
    "[redacted]",
  );
});

test("writeProviderRunManifest writes auditable run files without secrets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-provider-run-"));
  await initializeWorkspace({ root });
  await createCampaignInWorkspace({
    root,
    id: "launch",
    title: "Launch",
  });
  const runId = createProviderRunId({
    campaignId: "launch",
    target: { kind: "block", blockId: "image_hero" },
    providerMode: "fake-failure",
  });

  const result = await writeProviderRunManifest({
    root,
    runId,
    campaignId: "launch",
    target: { kind: "block", blockId: "image_hero" },
    providerMode: "fake-failure",
    serviceAdapterId: "replicate",
    model: "bytedance/seedance-1-lite",
    inputs: { prompt: "hello", apiKey: "secret" },
    status: "failed",
    estimatedCostUsd: 0.02,
    failureDetails: [
      {
        code: "provider_fake_failure",
        message: "Fake provider failed.",
        retryable: true,
      },
    ],
  });
  const manifest = JSON.parse(
    await readFile(path.join(result.runDirectoryPath, "provider-manifest.json"), "utf8"),
  ) as { inputs: { apiKey: string }; failureDetails: Array<{ code: string }> };

  assert.equal(manifest.inputs.apiKey, "[redacted]");
  assert.equal(manifest.failureDetails[0]?.code, "provider_fake_failure");
  assert.equal(
    JSON.parse(await readFile(path.join(result.runDirectoryPath, "pricing.json"), "utf8"))
      .estimatedCostUsd,
    0.02,
  );
});
