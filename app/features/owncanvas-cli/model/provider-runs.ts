import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MockGenerationOutput, MockGenerationTarget } from "./mock-generation.ts";
import {
  getCampaignPaths,
  resolveWorkspace,
  writeJsonFileAtomic,
} from "./workspace-repository.ts";

export type OwnCanvasProviderMode =
  | "mock"
  | "real"
  | "replicate"
  | "fake-success"
  | "fake-failure";

export type OwnCanvasProviderRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "partial_failed";

export type OwnCanvasProviderRunIntent = {
  providerMode: OwnCanvasProviderMode;
  serviceAdapterId: "replicate" | "mock";
  credentialEnvName: string | null;
  credentialPresent: boolean;
  requiresCredential: boolean;
  estimatedCostUsd: number;
  maxCostUsd: number | null;
  allowCost: boolean;
};

export type OwnCanvasProviderRunManifest = {
  schemaVersion: "owncanvas.provider-run-manifest.v1";
  runId: string;
  campaignId: string;
  status: OwnCanvasProviderRunStatus;
  target: MockGenerationTarget;
  provider: OwnCanvasProviderMode;
  serviceAdapterId: "replicate" | "mock";
  model: string | null;
  inputs: Record<string, unknown>;
  outputs: Array<{
    blockId: string;
    assetId: string;
    mediaType: string;
    uri: string;
  }>;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
  costs: {
    currency: "USD";
    estimatedCostUsd: number;
    actualCostUsd: number | null;
    pricingSnapshot: Record<string, unknown>;
  };
  failureDetails: Array<{
    code: string;
    message: string;
    retryable: boolean;
  }>;
  parentRunId: string | null;
  attempt: number;
};

export type CreateProviderRunManifestInput = {
  runId: string;
  campaignId: string;
  target: MockGenerationTarget;
  providerMode: OwnCanvasProviderMode;
  serviceAdapterId: "replicate" | "mock";
  model?: string | null;
  inputs?: Record<string, unknown>;
  outputs?: MockGenerationOutput[];
  status?: OwnCanvasProviderRunStatus;
  estimatedCostUsd?: number;
  actualCostUsd?: number | null;
  failureDetails?: OwnCanvasProviderRunManifest["failureDetails"];
  parentRunId?: string | null;
  attempt?: number;
  requestedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  latencyMs?: number | null;
};

export type WriteProviderRunManifestInput = CreateProviderRunManifestInput & {
  root?: string;
};

export class OwnCanvasProviderRunError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly recoveryHint: string | null;
  readonly details: Record<string, unknown> | null;

  constructor(input: {
    code: string;
    message: string;
    exitCode: 4 | 5;
    recoveryHint?: string | null;
    details?: Record<string, unknown> | null;
  }) {
    super(input.message);
    this.name = "OwnCanvasProviderRunError";
    this.code = input.code;
    this.exitCode = input.exitCode;
    this.recoveryHint = input.recoveryHint ?? null;
    this.details = input.details ?? null;
  }
}

const REPLICATE_CREDENTIAL_ENV_NAME = "OWNCANVAS_REPLICATE_API_TOKEN";
const DEFAULT_PROVIDER_ESTIMATED_COST_USD = 0.02;

export function resolveProviderRunIntent(input: {
  providerMode?: string;
  allowCost?: boolean;
  maxCostUsd?: number | null;
  env?: Record<string, string | undefined>;
}): OwnCanvasProviderRunIntent {
  const providerMode = normalizeProviderMode(input.providerMode);
  const estimatedCostUsd =
    providerMode === "mock" ? 0 : DEFAULT_PROVIDER_ESTIMATED_COST_USD;
  const maxCostUsd = input.maxCostUsd ?? null;
  const allowCost = input.allowCost === true;

  if (providerMode === "mock") {
    return {
      providerMode,
      serviceAdapterId: "mock",
      credentialEnvName: null,
      credentialPresent: false,
      requiresCredential: false,
      estimatedCostUsd,
      maxCostUsd,
      allowCost,
    };
  }

  if (!allowCost && maxCostUsd === null) {
    throw new OwnCanvasProviderRunError({
      code: "cost_intent_required",
      message:
        "Real provider generation requires --allow-cost or --max-cost-usd.",
      exitCode: 4,
      recoveryHint:
        "Pass --max-cost-usd for a bounded run, or --allow-cost when you intentionally accept provider charges.",
      details: { estimatedCostUsd },
    });
  }

  if (maxCostUsd !== null && estimatedCostUsd > maxCostUsd) {
    throw new OwnCanvasProviderRunError({
      code: "budget_guard_failed",
      message: `Estimated provider cost ${estimatedCostUsd} exceeds --max-cost-usd ${maxCostUsd}.`,
      exitCode: 4,
      recoveryHint: "Increase --max-cost-usd or switch back to mock generation.",
      details: { estimatedCostUsd, maxCostUsd },
    });
  }

  const credentialPresent = Boolean(
    input.env?.[REPLICATE_CREDENTIAL_ENV_NAME]?.trim(),
  );

  if (!credentialPresent) {
    throw new OwnCanvasProviderRunError({
      code: "provider_credential_missing",
      message: `Provider credential ${REPLICATE_CREDENTIAL_ENV_NAME} is missing.`,
      exitCode: 5,
      recoveryHint:
        "Set the credential in the environment, .env.local, or pass --env-file.",
      details: { credentialEnvName: REPLICATE_CREDENTIAL_ENV_NAME },
    });
  }

  return {
    providerMode,
    serviceAdapterId: "replicate",
    credentialEnvName: REPLICATE_CREDENTIAL_ENV_NAME,
    credentialPresent,
    requiresCredential: true,
    estimatedCostUsd,
    maxCostUsd,
    allowCost,
  };
}

export async function loadProviderRunEnvironment(input: {
  root?: string;
  envFilePath?: string;
  baseEnv?: Record<string, string | undefined>;
}) {
  const env: Record<string, string | undefined> = {
    ...(input.baseEnv ?? process.env),
  };
  const envFiles = [
    input.root === undefined ? null : path.join(input.root, ".env.local"),
    input.envFilePath ?? null,
  ].filter((candidate): candidate is string => candidate !== null);

  for (const envFilePath of envFiles) {
    Object.assign(env, await readEnvFileIfPresent(envFilePath));
  }

  return env;
}

export function createProviderRunManifest(
  input: CreateProviderRunManifestInput,
): OwnCanvasProviderRunManifest {
  const requestedAt = input.requestedAt ?? new Date().toISOString();

  return {
    schemaVersion: "owncanvas.provider-run-manifest.v1",
    runId: input.runId,
    campaignId: input.campaignId,
    status: input.status ?? "queued",
    target: input.target,
    provider: input.providerMode,
    serviceAdapterId: input.serviceAdapterId,
    model: input.model ?? null,
    inputs: redactSecrets(input.inputs ?? {}) as Record<string, unknown>,
    outputs: (input.outputs ?? []).map((output) => ({
      blockId: output.blockId,
      assetId: output.assetId,
      mediaType: output.mediaType,
      uri: output.uri,
    })),
    requestedAt,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    latencyMs: input.latencyMs ?? null,
    costs: {
      currency: "USD",
      estimatedCostUsd: input.estimatedCostUsd ?? 0,
      actualCostUsd: input.actualCostUsd ?? null,
      pricingSnapshot: {
        source: "owncanvas-cli",
        capturedAt: requestedAt,
      },
    },
    failureDetails: input.failureDetails ?? [],
    parentRunId: input.parentRunId ?? null,
    attempt: input.attempt ?? 1,
  };
}

export async function writeProviderRunManifest(input: WriteProviderRunManifestInput) {
  const workspace = await resolveWorkspace({ root: input.root });
  const campaignPaths = getCampaignPaths(workspace.paths, input.campaignId);
  const runDirectoryPath = path.join(
    campaignPaths.campaignDirectoryPath,
    "runs",
    input.runId,
  );
  const manifest = createProviderRunManifest(input);

  await mkdir(runDirectoryPath, { recursive: true });
  await writeJsonFileAtomic(
    path.join(runDirectoryPath, "provider-manifest.json"),
    manifest,
  );
  await writeJsonFileAtomic(path.join(runDirectoryPath, "status.json"), {
    schemaVersion: "owncanvas.provider-run-status.v1",
    runId: manifest.runId,
    campaignId: manifest.campaignId,
    provider: manifest.provider,
    serviceAdapterId: manifest.serviceAdapterId,
    status: manifest.status,
    target: manifest.target,
    parentRunId: manifest.parentRunId,
    attempt: manifest.attempt,
    startedAt: manifest.startedAt,
    completedAt: manifest.completedAt,
    failureDetails: manifest.failureDetails,
  });
  await writeJsonFileAtomic(path.join(runDirectoryPath, "response.json"), {
    schemaVersion: "owncanvas.provider-run-response.v1",
    runId: manifest.runId,
    status: manifest.status,
    outputs: manifest.outputs,
  });
  await writeJsonFileAtomic(path.join(runDirectoryPath, "pricing.json"), {
    schemaVersion: "owncanvas.provider-run-pricing.v1",
    runId: manifest.runId,
    provider: manifest.provider,
    serviceAdapterId: manifest.serviceAdapterId,
    estimatedCostUsd: manifest.costs.estimatedCostUsd,
    actualCostUsd: manifest.costs.actualCostUsd,
    currency: "USD",
    pricingSnapshot: manifest.costs.pricingSnapshot,
  });
  await writeFile(
    path.join(runDirectoryPath, "events.jsonl"),
    `${JSON.stringify({
      ts: manifest.requestedAt,
      type: `provider.${manifest.status}`,
      runId: manifest.runId,
      message: `Provider run ${manifest.runId} finished with ${manifest.status}.`,
    })}\n`,
    "utf8",
  );

  return {
    manifest,
    runDirectoryPath,
  };
}

export function createProviderRunId(input: {
  campaignId: string;
  target: MockGenerationTarget;
  providerMode: OwnCanvasProviderMode;
}) {
  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 12);

  return `run_${input.providerMode.replace(/[^a-z0-9]+/gi, "_")}_${digest}`;
}

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSecretKey(key) ? "[redacted]" : redactSecrets(item),
    ]),
  );
}

function normalizeProviderMode(value: string | undefined): OwnCanvasProviderMode {
  if (
    value === undefined ||
    value === "mock" ||
    value === "real" ||
    value === "replicate" ||
    value === "fake-success" ||
    value === "fake-failure"
  ) {
    return value ?? "mock";
  }

  throw new OwnCanvasProviderRunError({
    code: "provider_mode_unsupported",
    message: `Unsupported provider mode "${value}".`,
    exitCode: 5,
    recoveryHint: "Use mock, real, replicate, fake-success, or fake-failure.",
    details: { providerMode: value },
  });
}

async function readEnvFileIfPresent(filePath: string) {
  try {
    return parseEnvFile(await readFile(filePath, "utf8"));
  } catch (error) {
    if (isFileNotFound(error)) {
      return {};
    }

    throw error;
  }
}

function parseEnvFile(raw: string) {
  const values: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    values[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return values;
}

function isSecretKey(key: string) {
  return /token|secret|api[_-]?key|authorization|credential/i.test(key);
}

function isFileNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
