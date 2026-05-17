import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  addCampaignAsset,
  createCampaignAsset,
  type CampaignAsset,
  type CampaignCanvasBlock,
} from "../../creative-canvas/model/creative-canvas.ts";
import type { FileBackedCampaignDocument } from "./campaign-document.ts";
import {
  getCampaignPaths,
  inspectCampaignInWorkspace,
  resolveWorkspace,
  updateCampaignInWorkspace,
  writeJsonFileAtomic,
} from "./workspace-repository.ts";

export type MockGenerationTarget =
  | { kind: "block"; blockId: string }
  | { kind: "canvas" }
  | { kind: "range"; fromBlockId: string; toBlockId: string }
  | { kind: "selection"; blockIds: string[] };

export type MockGenerationPlan = {
  target: MockGenerationTarget;
  nodeIds: string[];
};

export type MockGenerationRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "partial_failed";

export type MockGenerationRunStatusDocument = {
  schemaVersion: "owncanvas.mock-generation-status.v1";
  runId: string;
  campaignId: string;
  provider: "mock";
  status: MockGenerationRunStatus;
  target: MockGenerationTarget;
  nodeIds: string[];
  parentRunId: string | null;
  attempt: number;
  startedAt: string;
  completedAt: string | null;
  failureDetails: Array<{
    blockId: string;
    message: string;
    retryable: boolean;
  }>;
};

export type MockGenerationOutput = {
  blockId: string;
  assetId: string;
  mediaType: CampaignAsset["mediaType"];
  outputPath: string;
  uri: string;
  prompt: string;
};

export type MockGenerationResponseDocument = {
  schemaVersion: "owncanvas.mock-generation-response.v1";
  runId: string;
  status: MockGenerationRunStatus;
  outputs: MockGenerationOutput[];
};

export type MockGenerationEvent = {
  ts: string;
  type: string;
  runId: string;
  blockId?: string;
  message: string;
};

export type ExecuteMockGenerationRunInput = {
  root?: string;
  campaignId: string;
  target: MockGenerationTarget;
  runId?: string;
  parentRunId?: string | null;
  attempt?: number;
  now?: () => string;
};

export function planMockGenerationRun(
  document: FileBackedCampaignDocument,
  target: MockGenerationTarget,
): MockGenerationPlan {
  const selected = selectTargetNodeIds(document, target);
  const ordered = orderNodeIdsByDependencies(document, selected);

  return {
    target,
    nodeIds: ordered,
  };
}

export async function executeMockGenerationRun({
  root = process.cwd(),
  campaignId,
  target,
  runId,
  parentRunId = null,
  attempt = 1,
  now = () => new Date().toISOString(),
}: ExecuteMockGenerationRunInput) {
  const inspected = await inspectCampaignInWorkspace({ root, id: campaignId });
  const plan = planMockGenerationRun(inspected.document, target);
  const resolvedRunId =
    runId ?? createDeterministicRunId(campaignId, target, plan.nodeIds);
  const timestamp = now();
  const paths = await createRunPaths({
    root,
    campaignId,
    runId: resolvedRunId,
  });
  const request = {
    schemaVersion: "owncanvas.mock-generation-request.v1",
    runId: resolvedRunId,
    campaignId,
    provider: "mock",
    target,
    nodeIds: plan.nodeIds,
    parentRunId,
    attempt,
    requestedAt: timestamp,
  };
  const events: MockGenerationEvent[] = [
    {
      ts: timestamp,
      type: "run.started",
      runId: resolvedRunId,
      message: `Mock generation run ${resolvedRunId} started.`,
    },
  ];
  let response: MockGenerationResponseDocument = {
    schemaVersion: "owncanvas.mock-generation-response.v1",
    runId: resolvedRunId,
    status: "running",
    outputs: [],
  };
  let status: MockGenerationRunStatusDocument = {
    schemaVersion: "owncanvas.mock-generation-status.v1",
    runId: resolvedRunId,
    campaignId,
    provider: "mock",
    status: "running",
    target,
    nodeIds: plan.nodeIds,
    parentRunId,
    attempt,
    startedAt: timestamp,
    completedAt: null,
    failureDetails: [],
  };

  await writeJsonFileAtomic(paths.requestPath, request);

  const updated = await updateCampaignInWorkspace({
    root,
    id: campaignId,
    command: "generate.mock.run",
    now,
    update: async (document) => {
      let current = document;
      const outputs: MockGenerationOutput[] = [];
      const failures: MockGenerationRunStatusDocument["failureDetails"] = [];

      for (const nodeId of plan.nodeIds) {
        const block = current.canvasState.nodes.find((node) => node.id === nodeId);

        if (!block) {
          continue;
        }

        if (block.properties?.mockFailure === true) {
          failures.push({
            blockId: block.id,
            message: `Mock generation failed for ${block.id}.`,
            retryable: true,
          });
          events.push({
            ts: now(),
            type: "block.failed",
            runId: resolvedRunId,
            blockId: block.id,
            message: `Mock generation failed for ${block.id}.`,
          });
          continue;
        }

        const output = await writeMockOutput({
          paths,
          runId: resolvedRunId,
          campaignId,
          block,
          upstreamOutputs: outputs,
        });
        outputs.push(output);
        current = attachMockOutputToCampaign(current, {
          block,
          output,
          runId: resolvedRunId,
          timestamp: now(),
        });
        events.push({
          ts: now(),
          type: "block.completed",
          runId: resolvedRunId,
          blockId: block.id,
          message: `Mock generation completed for ${block.id}.`,
        });
      }

      const finalStatus = resolveFinalStatus(outputs.length, failures.length);
      response = {
        ...response,
        status: finalStatus,
        outputs,
      };
      status = {
        ...status,
        status: finalStatus,
        completedAt: now(),
        failureDetails: failures,
      };
      events.push({
        ts: now(),
        type: finalStatus === "succeeded" ? "run.completed" : "run.partial_failed",
        runId: resolvedRunId,
        message: `Mock generation run ${resolvedRunId} finished with ${finalStatus}.`,
      });

      return current;
    },
  });

  await writeJsonFileAtomic(paths.responsePath, response);
  await writeJsonFileAtomic(paths.statusPath, status);
  await writeJsonFileAtomic(paths.pricingPath, {
    schemaVersion: "owncanvas.mock-generation-pricing.v1",
    runId: resolvedRunId,
    provider: "mock",
    estimatedCostUsd: 0,
    actualCostUsd: 0,
    currency: "USD",
  });
  await writeFile(
    paths.eventsPath,
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    "utf8",
  );

  return {
    runId: resolvedRunId,
    paths,
    request,
    response,
    status,
    campaign: updated.document,
  };
}

export async function getMockGenerationRunStatus(input: {
  root?: string;
  campaignId: string;
  runId: string;
}) {
  const paths = await createRunPaths(input);
  return JSON.parse(
    await readFile(paths.statusPath, "utf8"),
  ) as MockGenerationRunStatusDocument;
}

export async function getMockGenerationRunLogs(input: {
  root?: string;
  campaignId: string;
  runId: string;
}) {
  const paths = await createRunPaths(input);
  const raw = await readFile(paths.eventsPath, "utf8");

  return raw
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as MockGenerationEvent);
}

export async function getMockGenerationRunOutputs(input: {
  root?: string;
  campaignId: string;
  runId: string;
}) {
  const paths = await createRunPaths(input);
  return JSON.parse(
    await readFile(paths.responsePath, "utf8"),
  ) as MockGenerationResponseDocument;
}

export async function cancelMockGenerationRun(input: {
  root?: string;
  campaignId: string;
  runId: string;
  now?: () => string;
}) {
  const paths = await createRunPaths(input);
  const status = await getMockGenerationRunStatus(input);

  if (status.status === "queued" || status.status === "running") {
    const cancelled = {
      ...status,
      status: "cancelled" as const,
      completedAt: input.now?.() ?? new Date().toISOString(),
    };
    await writeJsonFileAtomic(paths.statusPath, cancelled);
    return cancelled;
  }

  return status;
}

export async function retryMockGenerationRun(input: {
  root?: string;
  campaignId: string;
  runId: string;
  now?: () => string;
}) {
  const paths = await createRunPaths(input);
  const request = JSON.parse(
    await readFile(paths.requestPath, "utf8"),
  ) as {
    target: MockGenerationTarget;
    attempt: number;
  };
  const nextAttempt = request.attempt + 1;

  return executeMockGenerationRun({
    root: input.root,
    campaignId: input.campaignId,
    target: request.target,
    runId: `${input.runId}_retry_${nextAttempt}`,
    parentRunId: input.runId,
    attempt: nextAttempt,
    now: input.now,
  });
}

function selectTargetNodeIds(
  document: FileBackedCampaignDocument,
  target: MockGenerationTarget,
) {
  if (target.kind === "canvas") {
    return document.canvasState.nodes.map((node) => node.id);
  }

  if (target.kind === "block") {
    return collectUpstreamNodeIds(document, target.blockId);
  }

  if (target.kind === "range") {
    return findPathNodeIds(document, target.fromBlockId, target.toBlockId);
  }

  return target.blockIds;
}

function orderNodeIdsByDependencies(
  document: FileBackedCampaignDocument,
  selectedNodeIds: string[],
) {
  const selected = new Set(selectedNodeIds);
  const ordered: string[] = [];
  const visited = new Set<string>();

  const visit = (nodeId: string) => {
    if (visited.has(nodeId) || !selected.has(nodeId)) {
      return;
    }

    visited.add(nodeId);

    for (const edge of document.canvasState.edges) {
      if (edge.target === nodeId && selected.has(edge.source)) {
        visit(edge.source);
      }
    }

    ordered.push(nodeId);
  };

  for (const node of document.canvasState.nodes) {
    if (selected.has(node.id)) {
      visit(node.id);
    }
  }

  return ordered;
}

function collectUpstreamNodeIds(
  document: FileBackedCampaignDocument,
  blockId: string,
) {
  const collected = new Set<string>();

  const visit = (nodeId: string) => {
    if (collected.has(nodeId)) {
      return;
    }

    collected.add(nodeId);

    for (const edge of document.canvasState.edges) {
      if (edge.target === nodeId) {
        visit(edge.source);
      }
    }
  };

  visit(blockId);

  return [...collected];
}

function findPathNodeIds(
  document: FileBackedCampaignDocument,
  fromBlockId: string,
  toBlockId: string,
) {
  const queue: Array<{ nodeId: string; path: string[] }> = [
    { nodeId: fromBlockId, path: [fromBlockId] },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const next = queue.shift();

    if (!next || visited.has(next.nodeId)) {
      continue;
    }

    if (next.nodeId === toBlockId) {
      return next.path;
    }

    visited.add(next.nodeId);

    for (const edge of document.canvasState.edges) {
      if (edge.source === next.nodeId) {
        queue.push({
          nodeId: edge.target,
          path: [...next.path, edge.target],
        });
      }
    }
  }

  return [fromBlockId, toBlockId].filter((nodeId) =>
    document.canvasState.nodes.some((node) => node.id === nodeId),
  );
}

async function writeMockOutput(input: {
  paths: MockGenerationRunPaths;
  runId: string;
  campaignId: string;
  block: CampaignCanvasBlock;
  upstreamOutputs: MockGenerationOutput[];
}): Promise<MockGenerationOutput> {
  await mkdir(input.paths.outputsDirectoryPath, { recursive: true });
  const mediaType = resolveMockOutputMediaType(input.block);
  const assetId = `asset_${input.runId}_${input.block.id}`;
  const outputPath = path.join(
    input.paths.outputsDirectoryPath,
    `${input.block.id}.${mediaType === "text" ? "txt" : "mock"}`,
  );
  const prompt =
    typeof input.block.properties?.prompt === "string"
      ? input.block.properties.prompt
      : input.block.title;
  const content = [
    `OwnCanvas mock output`,
    `campaign=${input.campaignId}`,
    `run=${input.runId}`,
    `block=${input.block.id}`,
    `kind=${input.block.kind}`,
    `prompt=${prompt}`,
    `upstream=${input.upstreamOutputs.map((output) => output.assetId).join(",")}`,
  ].join("\n");

  await writeFile(outputPath, content, "utf8");

  return {
    blockId: input.block.id,
    assetId,
    mediaType,
    outputPath,
    uri: `outputs/${input.runId}/${path.basename(outputPath)}`,
    prompt,
  };
}

function attachMockOutputToCampaign(
  document: FileBackedCampaignDocument,
  input: {
    block: CampaignCanvasBlock;
    output: MockGenerationOutput;
    runId: string;
    timestamp: string;
  },
): FileBackedCampaignDocument {
  const asset = createCampaignAsset(
    {
      id: input.output.assetId,
      source: "link",
      mediaType: input.output.mediaType,
      title: `${input.block.title} mock output`,
      uri: input.output.uri,
      usage: "generated",
      status: "ready",
      rights: {
        owner: "owncanvas-cli",
        license: "mock",
      },
      createdBy: "agent",
      outputLocations: {
        primaryUri: input.output.uri,
      },
    },
    { now: () => input.timestamp },
  );
  const withAsset = addCampaignAsset(document, asset, {
    now: () => input.timestamp,
  }) as FileBackedCampaignDocument;

  return {
    ...withAsset,
    canvasState: {
      ...withAsset.canvasState,
      nodes: withAsset.canvasState.nodes.map((node) =>
        node.id === input.block.id
          ? attachOutputToNode(node, input.output, input.runId)
          : node,
      ),
    },
    campaignSpec: {
      ...withAsset.campaignSpec,
      nodes: withAsset.campaignSpec.nodes.map((node) =>
        node.id === input.block.id
          ? attachOutputToNode(node, input.output, input.runId)
          : node,
      ),
    },
  };
}

function attachOutputToNode(
  node: CampaignCanvasBlock,
  output: MockGenerationOutput,
  runId: string,
): CampaignCanvasBlock {
  if (node.kind === "image" || node.kind === "video") {
    return {
      ...node,
      properties: {
        ...(node.properties ?? {}),
        latestResultRefs: {
          generatedAssetIds: [output.assetId],
          metadataRunId: runId,
          costUsageRunId: runId,
        },
        uiState: {
          ...((node.properties?.uiState as Record<string, unknown> | undefined) ?? {}),
          status: "succeeded",
          selectedResultAssetId: output.assetId,
          outputConnectionReady: true,
        },
      },
    };
  }

  return {
    ...node,
    properties: {
      ...(node.properties ?? {}),
      mockOutputAssetId: output.assetId,
      mockOutputRunId: runId,
      mockOutputText: output.prompt,
    },
  };
}

function resolveMockOutputMediaType(
  block: CampaignCanvasBlock,
): CampaignAsset["mediaType"] {
  if (block.kind === "image") {
    return "image";
  }

  if (block.kind === "video") {
    return "video";
  }

  return "text";
}

function resolveFinalStatus(
  successCount: number,
  failureCount: number,
): MockGenerationRunStatus {
  if (failureCount === 0) {
    return "succeeded";
  }

  if (successCount === 0) {
    return "failed";
  }

  return "partial_failed";
}

function createDeterministicRunId(
  campaignId: string,
  target: MockGenerationTarget,
  nodeIds: string[],
) {
  const digest = createHash("sha256")
    .update(JSON.stringify({ campaignId, target, nodeIds }))
    .digest("hex")
    .slice(0, 12);

  return `run_mock_${digest}`;
}

type MockGenerationRunPaths = Awaited<ReturnType<typeof createRunPaths>>;

async function createRunPaths(input: {
  root?: string;
  campaignId: string;
  runId: string;
}) {
  const workspace = await resolveWorkspace({ root: input.root });
  const campaignPaths = getCampaignPaths(workspace.paths, input.campaignId);
  const runDirectoryPath = path.join(campaignPaths.campaignDirectoryPath, "runs", input.runId);
  const outputsDirectoryPath = path.join(
    campaignPaths.campaignDirectoryPath,
    "outputs",
    input.runId,
  );

  await mkdir(runDirectoryPath, { recursive: true });

  return {
    campaignDirectoryPath: campaignPaths.campaignDirectoryPath,
    runDirectoryPath,
    outputsDirectoryPath,
    requestPath: path.join(runDirectoryPath, "request.json"),
    responsePath: path.join(runDirectoryPath, "response.json"),
    statusPath: path.join(runDirectoryPath, "status.json"),
    eventsPath: path.join(runDirectoryPath, "events.jsonl"),
    pricingPath: path.join(runDirectoryPath, "pricing.json"),
  };
}
