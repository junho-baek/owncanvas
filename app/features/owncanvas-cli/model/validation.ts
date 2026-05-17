import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  getImageGenerationModelCapability,
  type ImageGenerationProviderId,
} from "../../creative-canvas/model/image-generation-node.ts";
import {
  resolveVideoGenerationModelCapability,
  type VideoGenerationModelSlug,
  type VideoGenerationProviderId,
} from "../../creative-canvas/model/video-generation-node.ts";
import {
  validateCampaignCanvasEdit,
  type CampaignCanvasBlock,
  type GenerationBlockKind,
} from "../../creative-canvas/model/creative-canvas.ts";
import {
  calculateCampaignDocumentHash,
  type FileBackedCampaignDocument,
} from "./campaign-document.ts";
import {
  getWorkspaceStatus,
  inspectCampaignInWorkspace,
} from "./workspace-repository.ts";
import { isJsonObject, parseJsonObject } from "./stable-json.ts";

export type OwnCanvasCliValidationSeverity = "warning" | "error";

export type OwnCanvasCliValidationDiagnostic = {
  code: string;
  message: string;
  path: string | null;
  severity: OwnCanvasCliValidationSeverity;
  retryable: boolean;
  recoveryHint: string | null;
  details: Record<string, unknown> | null;
};

export type OwnCanvasCliValidationReport = {
  schemaVersion: "owncanvas.cli-validation.v1";
  valid: boolean;
  campaignId: string;
  workspacePath: string;
  summary: OwnCanvasCampaignInspectSummary;
  warnings: OwnCanvasCliValidationDiagnostic[];
  errors: OwnCanvasCliValidationDiagnostic[];
};

export type OwnCanvasCampaignInspectSummary = {
  schemaVersion: "owncanvas.cli-inspect-summary.v1";
  campaignId: string;
  title: string;
  revision: FileBackedCampaignDocument["revision"];
  nodeCount: number;
  edgeCount: number;
  assetCount: number;
  runCount: number;
  blocksByKind: Record<string, number>;
  outputReadyBlockIds: string[];
  promptsMissingBlockIds: string[];
  models: Array<{
    blockId: string;
    kind: string;
    providerId: string | null;
    modelSlug: string | null;
    serviceAdapterId: string | null;
  }>;
};

export type ValidateCampaignWorkspaceInput = {
  root?: string;
  campaignId: string;
  runReady?: boolean;
  strict?: boolean;
};

const SUPPORTED_CLI_BLOCK_KINDS = new Set<GenerationBlockKind>([
  "text",
  "image",
  "video",
  "voice",
  "llm",
  "agent",
  "dm",
  "landing",
  "custom",
]);

export async function validateCampaignWorkspace({
  root = process.cwd(),
  campaignId,
  runReady = false,
  strict = false,
}: ValidateCampaignWorkspaceInput): Promise<OwnCanvasCliValidationReport> {
  const inspected = await inspectCampaignInWorkspace({ root, id: campaignId });
  const status = await getWorkspaceStatus({ root });
  const warnings: OwnCanvasCliValidationDiagnostic[] = [];
  const errors: OwnCanvasCliValidationDiagnostic[] = [];

  validateRequiredDocumentFields(inspected.document, errors);
  validateRevisionMetadata(inspected.document, errors);
  await validateWorkspaceLayout(inspected.paths, errors);
  validateCanvas("canvasState", inspected.document.canvasState, errors);
  validateCanvas("campaignSpec", inspected.document.campaignSpec, errors);
  validateBlocks(inspected.document, warnings, errors);
  validateEdges(inspected.document, errors);
  validateAssetRefs(inspected.document, errors);
  validateOutputRefs(inspected.document, errors);
  await validateRunManifests(inspected.paths.campaignDirectoryPath, errors);

  const promotedWarnings =
    runReady || strict ? warnings.filter(isRunReadyWarning) : [];
  const remainingWarnings = warnings.filter(
    (warning) => !promotedWarnings.includes(warning),
  );
  const finalErrors = [
    ...errors,
    ...promotedWarnings.map((warning) => ({
      ...warning,
      severity: "error" as const,
      recoveryHint:
        warning.recoveryHint ??
        "Fill required run inputs before asking an agent to execute this Campaign.",
    })),
  ];

  return {
    schemaVersion: "owncanvas.cli-validation.v1",
    valid: finalErrors.length === 0,
    campaignId: inspected.document.id,
    workspacePath: status.workspacePath,
    summary: await createCampaignInspectSummary({
      document: inspected.document,
      campaignDirectoryPath: inspected.paths.campaignDirectoryPath,
    }),
    warnings: remainingWarnings,
    errors: finalErrors,
  };
}

export async function createCampaignInspectSummary(input: {
  document: FileBackedCampaignDocument;
  campaignDirectoryPath: string;
}): Promise<OwnCanvasCampaignInspectSummary> {
  const runIds = await listRunIds(input.campaignDirectoryPath);
  const blocksByKind: Record<string, number> = {};
  const outputReadyBlockIds: string[] = [];
  const promptsMissingBlockIds: string[] = [];
  const models: OwnCanvasCampaignInspectSummary["models"] = [];

  for (const block of input.document.canvasState.nodes) {
    blocksByKind[block.kind] = (blocksByKind[block.kind] ?? 0) + 1;

    if (isOutputReady(block)) {
      outputReadyBlockIds.push(block.id);
    }

    if (requiresPrompt(block) && getPrompt(block).trim() === "") {
      promptsMissingBlockIds.push(block.id);
    }

    if (block.kind === "image" || block.kind === "video") {
      models.push({
        blockId: block.id,
        kind: block.kind,
        providerId: stringProperty(block, "providerId"),
        modelSlug: stringProperty(block, "modelSlug"),
        serviceAdapterId: stringProperty(block, "serviceAdapterId") ?? "replicate",
      });
    }
  }

  return {
    schemaVersion: "owncanvas.cli-inspect-summary.v1",
    campaignId: input.document.id,
    title: input.document.title,
    revision: input.document.revision,
    nodeCount: input.document.canvasState.nodes.length,
    edgeCount: input.document.canvasState.edges.length,
    assetCount: input.document.assets.length,
    runCount: runIds.length,
    blocksByKind,
    outputReadyBlockIds: outputReadyBlockIds.sort(),
    promptsMissingBlockIds: promptsMissingBlockIds.sort(),
    models,
  };
}

function validateRequiredDocumentFields(
  document: FileBackedCampaignDocument,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  if (document.schemaVersion !== "owncanvas.campaign.v1") {
    errors.push(errorDiagnostic({
      code: "campaign.schema_version_invalid",
      path: "schemaVersion",
      message: "Campaign schemaVersion must be owncanvas.campaign.v1.",
    }));
  }

  for (const field of ["id", "title", "createdAt", "updatedAt"] as const) {
    if (typeof document[field] !== "string" || document[field].trim() === "") {
      errors.push(errorDiagnostic({
        code: `campaign.${field}_required`,
        path: field,
        message: `Campaign ${field} is required.`,
      }));
    }
  }

  if (!isJsonObject(document.campaignSpec)) {
    errors.push(errorDiagnostic({
      code: "campaign.campaign_spec_required",
      path: "campaignSpec",
      message: "Campaign campaignSpec must be an object.",
    }));
  }

  if (!isJsonObject(document.canvasState)) {
    errors.push(errorDiagnostic({
      code: "campaign.canvas_state_required",
      path: "canvasState",
      message: "Campaign canvasState must be an object.",
    }));
  }

  if (!Array.isArray(document.assets)) {
    errors.push(errorDiagnostic({
      code: "campaign.assets_required",
      path: "assets",
      message: "Campaign assets must be an array.",
    }));
  }
}

function validateRevisionMetadata(
  document: FileBackedCampaignDocument,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  if (!isJsonObject(document.revision)) {
    errors.push(errorDiagnostic({
      code: "revision.required",
      path: "revision",
      message: "Campaign revision metadata is required.",
    }));
    return;
  }

  if (
    typeof document.revision.hash !== "string" ||
    document.revision.hash.trim() === ""
  ) {
    errors.push(errorDiagnostic({
      code: "revision.hash_required",
      path: "revision.hash",
      message: "Campaign revision hash is required.",
    }));
  } else if (calculateCampaignDocumentHash(document) !== document.revision.hash) {
    errors.push(errorDiagnostic({
      code: "revision.hash_mismatch",
      path: "revision.hash",
      message: "Campaign revision hash does not match document contents.",
    }));
  }

  if (
    typeof document.revision.number !== "number" ||
    !Number.isFinite(document.revision.number) ||
    document.revision.number < 1
  ) {
    errors.push(errorDiagnostic({
      code: "revision.number_invalid",
      path: "revision.number",
      message: "Campaign revision number must be a positive number.",
    }));
  }
}

async function validateWorkspaceLayout(
  paths: { subdirectories: string[] },
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  for (const directoryPath of paths.subdirectories) {
    const basename = path.basename(directoryPath);

    try {
      await access(directoryPath);
    } catch {
      errors.push(errorDiagnostic({
        code: "workspace_layout.directory_missing",
        path: directoryPath,
        message: `Campaign workspace directory "${basename}" is missing.`,
      }));
      continue;
    }

    if (!["assets", "outputs", "runs", "snapshots"].includes(basename)) {
      errors.push(errorDiagnostic({
        code: "workspace_layout.directory_unexpected",
        path: directoryPath,
        message: `Unexpected Campaign workspace directory "${basename}".`,
      }));
    }
  }
}

function validateCanvas(
  label: "canvasState" | "campaignSpec",
  canvas: unknown,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  const validation = validateCampaignCanvasEdit(canvas);

  for (const validationError of validation.errors) {
    errors.push(errorDiagnostic({
      code: validationError.code,
      path: `${label}.${validationError.path.replace(/^canvas\./, "")}`,
      message: validationError.message,
    }));
  }
}

function validateBlocks(
  document: FileBackedCampaignDocument,
  warnings: OwnCanvasCliValidationDiagnostic[],
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  document.canvasState.nodes.forEach((block, index) => {
    const blockPath = `canvasState.nodes.${index}`;

    if (!SUPPORTED_CLI_BLOCK_KINDS.has(block.kind)) {
      errors.push(errorDiagnostic({
        code: "block.kind_unsupported",
        path: `${blockPath}.kind`,
        message: `Generation Block kind "${block.kind}" is not supported by the CLI.`,
      }));
    }

    if (requiresPrompt(block) && getPrompt(block).trim() === "") {
      warnings.push(warningDiagnostic({
        code: "block.prompt_empty",
        path: `${blockPath}.properties.prompt`,
        message: `Generation Block "${block.id}" has no prompt.`,
        recoveryHint: "Set a prompt with block set --prompt before generation.",
        details: { blockId: block.id, kind: block.kind },
      }));
    }

    if (block.kind === "image") {
      validateImageBlockModel(block, blockPath, errors);
    }

    if (block.kind === "video") {
      validateVideoBlockModel(block, blockPath, errors);
    }
  });
}

function validateImageBlockModel(
  block: CampaignCanvasBlock,
  blockPath: string,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  const providerId = stringProperty(block, "providerId") ?? "replicate";
  const modelSlug = stringProperty(block, "modelSlug");

  if (!modelSlug) {
    errors.push(errorDiagnostic({
      code: "block.model_required",
      path: `${blockPath}.properties.modelSlug`,
      message: `Image Block "${block.id}" is missing modelSlug.`,
    }));
    return;
  }

  if (
    !getImageGenerationModelCapability({
      providerId: providerId as ImageGenerationProviderId,
      modelSlug,
    })
  ) {
    errors.push(errorDiagnostic({
      code: "block.model_unknown",
      path: `${blockPath}.properties.modelSlug`,
      message: `Image Block "${block.id}" references an unknown image model.`,
      details: { providerId, modelSlug },
    }));
  }
}

function validateVideoBlockModel(
  block: CampaignCanvasBlock,
  blockPath: string,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  const providerId = stringProperty(block, "providerId") ?? "replicate";
  const modelSlug = stringProperty(block, "modelSlug");

  if (!modelSlug) {
    errors.push(errorDiagnostic({
      code: "block.model_required",
      path: `${blockPath}.properties.modelSlug`,
      message: `Video Block "${block.id}" is missing modelSlug.`,
    }));
    return;
  }

  if (
    !resolveVideoGenerationModelCapability({
      providerId: providerId as VideoGenerationProviderId,
      modelSlug: modelSlug as VideoGenerationModelSlug,
    })
  ) {
    errors.push(errorDiagnostic({
      code: "block.model_unknown",
      path: `${blockPath}.properties.modelSlug`,
      message: `Video Block "${block.id}" references an unknown video model.`,
      details: { providerId, modelSlug },
    }));
  }
}

function validateEdges(
  document: FileBackedCampaignDocument,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  const nodeIds = new Set(document.canvasState.nodes.map((node) => node.id));

  document.canvasState.edges.forEach((edge, index) => {
    const edgePath = `canvasState.edges.${index}`;

    if (!nodeIds.has(edge.source)) {
      errors.push(errorDiagnostic({
        code: "edge.source_missing",
        path: `${edgePath}.source`,
        message: `Canvas edge "${edge.id}" references a missing source block.`,
      }));
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(errorDiagnostic({
        code: "edge.target_missing",
        path: `${edgePath}.target`,
        message: `Canvas edge "${edge.id}" references a missing target block.`,
      }));
    }

    if (!edge.sourcePort) {
      errors.push(errorDiagnostic({
        code: "edge.source_port_required",
        path: `${edgePath}.sourcePort`,
        message: `Canvas edge "${edge.id}" is missing sourcePort.`,
      }));
    }

    if (!edge.targetPort) {
      errors.push(errorDiagnostic({
        code: "edge.target_port_required",
        path: `${edgePath}.targetPort`,
        message: `Canvas edge "${edge.id}" is missing targetPort.`,
      }));
    }
  });
}

function validateAssetRefs(
  document: FileBackedCampaignDocument,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  const assetIds = new Set(document.assets.map((asset) => asset.id));

  document.canvasState.nodes.forEach((block, index) => {
    const properties = block.properties ?? {};
    const referenceAssetId =
      typeof properties.referenceImageAssetId === "string"
        ? properties.referenceImageAssetId
        : null;

    if (referenceAssetId && !assetIds.has(referenceAssetId)) {
      errors.push(errorDiagnostic({
        code: "asset_ref_missing",
        path: `canvasState.nodes.${index}.properties.referenceImageAssetId`,
        message: `Generation Block "${block.id}" references missing asset "${referenceAssetId}".`,
      }));
    }

    if (Array.isArray(properties.referenceImages)) {
      properties.referenceImages.forEach((reference, referenceIndex) => {
        if (!isJsonObject(reference) || reference.type !== "asset") {
          return;
        }

        const assetId = typeof reference.ref === "string" ? reference.ref : null;

        if (assetId && !assetIds.has(assetId)) {
          errors.push(errorDiagnostic({
            code: "asset_ref_missing",
            path: `canvasState.nodes.${index}.properties.referenceImages.${referenceIndex}.ref`,
            message: `Generation Block "${block.id}" references missing asset "${assetId}".`,
          }));
        }
      });
    }
  });
}

function validateOutputRefs(
  document: FileBackedCampaignDocument,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  const assetIds = new Set(document.assets.map((asset) => asset.id));

  document.canvasState.nodes.forEach((block, index) => {
    const latestResultRefs = block.properties?.latestResultRefs;

    if (!isJsonObject(latestResultRefs)) {
      return;
    }

    const generatedAssetIds = latestResultRefs.generatedAssetIds;

    if (!Array.isArray(generatedAssetIds)) {
      return;
    }

    generatedAssetIds.forEach((assetId, assetIndex) => {
      if (typeof assetId === "string" && !assetIds.has(assetId)) {
        errors.push(errorDiagnostic({
          code: "output_ref_missing",
          path: `canvasState.nodes.${index}.properties.latestResultRefs.generatedAssetIds.${assetIndex}`,
          message: `Generation Block "${block.id}" output references missing asset "${assetId}".`,
        }));
      }
    });
  });
}

async function validateRunManifests(
  campaignDirectoryPath: string,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  const runsDirectoryPath = path.join(campaignDirectoryPath, "runs");
  const entries = await safeReadDirectory(runsDirectoryPath);

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const runPath = path.join(runsDirectoryPath, entry.name);
    await validateRunManifestFile(runPath, entry.name, "status.json", errors);
    await validateRunManifestFile(runPath, entry.name, "response.json", errors);
    await validateRunManifestFile(runPath, entry.name, "pricing.json", errors);
  }
}

async function validateRunManifestFile(
  runPath: string,
  runId: string,
  fileName: string,
  errors: OwnCanvasCliValidationDiagnostic[],
) {
  const filePath = path.join(runPath, fileName);

  try {
    const document = parseJsonObject(await readFile(filePath, "utf8"));

    if (document.runId !== runId) {
      errors.push(errorDiagnostic({
        code: "run_manifest.run_id_mismatch",
        path: filePath,
        message: `Run manifest ${fileName} does not match run directory id.`,
      }));
    }
  } catch (error) {
    errors.push(errorDiagnostic({
      code: "run_manifest_invalid",
      path: filePath,
      message: `Run manifest ${fileName} is missing or invalid.`,
      details: {
        reason: error instanceof Error ? error.message : String(error),
      },
    }));
  }
}

async function listRunIds(campaignDirectoryPath: string) {
  const entries = await safeReadDirectory(path.join(campaignDirectoryPath, "runs"));

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function safeReadDirectory(directoryPath: string) {
  try {
    return await readdir(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isRunReadyWarning(diagnostic: OwnCanvasCliValidationDiagnostic) {
  return diagnostic.code === "block.prompt_empty";
}

function requiresPrompt(block: CampaignCanvasBlock) {
  return block.kind === "text" || block.kind === "image" || block.kind === "video";
}

function getPrompt(block: CampaignCanvasBlock) {
  return typeof block.properties?.prompt === "string" ? block.properties.prompt : "";
}

function isOutputReady(block: CampaignCanvasBlock) {
  const uiState = block.properties?.uiState;
  return (
    isJsonObject(uiState) &&
    uiState.outputConnectionReady === true &&
    typeof uiState.selectedResultAssetId === "string"
  );
}

function stringProperty(block: CampaignCanvasBlock, key: string) {
  const value = block.properties?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function errorDiagnostic(input: {
  code: string;
  message: string;
  path: string | null;
  recoveryHint?: string | null;
  details?: Record<string, unknown> | null;
}): OwnCanvasCliValidationDiagnostic {
  return {
    code: input.code,
    message: input.message,
    path: input.path,
    severity: "error",
    retryable: false,
    recoveryHint: input.recoveryHint ?? null,
    details: input.details ?? null,
  };
}

function warningDiagnostic(input: {
  code: string;
  message: string;
  path: string | null;
  recoveryHint?: string | null;
  details?: Record<string, unknown> | null;
}): OwnCanvasCliValidationDiagnostic {
  return {
    code: input.code,
    message: input.message,
    path: input.path,
    severity: "warning",
    retryable: false,
    recoveryHint: input.recoveryHint ?? null,
    details: input.details ?? null,
  };
}
