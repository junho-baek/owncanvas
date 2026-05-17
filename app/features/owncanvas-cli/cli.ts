import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  applyAuthoringCommand,
  applyAuthoringCommands,
  OwnCanvasAuthoringError,
  type OwnCanvasAuthoringResult,
  type OwnCanvasAuthoringCommand,
} from "./model/authoring-commands.ts";
import {
  cancelMockGenerationRun,
  executeMockGenerationRun,
  getMockGenerationRunLogs,
  getMockGenerationRunOutputs,
  getMockGenerationRunStatus,
  retryMockGenerationRun,
  type MockGenerationTarget,
} from "./model/mock-generation.ts";
import {
  createCampaignInWorkspace,
  exportCampaignFromWorkspace,
  getWorkspaceStatus,
  initializeWorkspace,
  inspectCampaignInWorkspace,
  listCampaignsInWorkspace,
  OwnCanvasCliRepositoryError,
  updateCampaignInWorkspace,
} from "./model/workspace-repository.ts";
import { diffJsonDocuments, formatDiffEntriesForHumans } from "./model/diff.ts";
import { isJsonObject, parseJsonObject, stableStringify } from "./model/stable-json.ts";
import {
  createCampaignInspectSummary,
  validateCampaignWorkspace,
  type OwnCanvasCliValidationDiagnostic,
} from "./model/validation.ts";

export type OwnCanvasCliResultEnvelope = {
  schemaVersion: "owncanvas.cli-result.v1";
  ok: boolean;
  command: string;
  workspacePath: string | null;
  campaignId: string | null;
  revisionBefore: string | null;
  revisionAfter: string | null;
  changed: boolean;
  createdIds: string[];
  updatedIds: string[];
  deletedIds: string[];
  data: Record<string, unknown> | null;
  warnings: OwnCanvasCliDiagnostic[];
  errors: OwnCanvasCliDiagnostic[];
};

export type OwnCanvasCliDiagnostic = {
  code: string;
  message: string;
  path: string | null;
  command: string;
  retryable: boolean;
  severity: "warning" | "error";
  recoveryHint: string | null;
  details: Record<string, unknown> | null;
};

type ParsedCliArgs = {
  commandGroup: string | null;
  commandName: string | null;
  positionals: string[];
  options: {
    root?: string;
    id?: string;
    title?: string;
    out?: string;
    campaign?: string;
    kind?: string;
    x?: string;
    y?: string;
    prompt?: string;
    model?: string;
    aspectRatio?: string;
    count?: string;
    duration?: string;
    resolution?: string;
    referenceAsset?: string;
    uri?: string;
    mediaType?: string;
    usage?: string;
    plan?: string;
    against?: string;
    canvas: boolean;
    from?: string;
    to?: string;
    selection?: string;
    runId?: string;
    runReady: boolean;
    strict: boolean;
    dryRun: boolean;
    ifNotExists: boolean;
    ifExists: boolean;
    json: boolean;
  };
};

const RESULT_SCHEMA_VERSION = "owncanvas.cli-result.v1";

export async function runOwnCanvasCli(argv = process.argv.slice(2)) {
  const parsed = parseCliArgs(argv);
  const command = getCommandLabel(parsed);

  try {
    const result = await executeCommand(parsed);
    writeResult(result, parsed.options.json);
    return 0;
  } catch (error) {
    if (error instanceof OwnCanvasCliEnvelopeExit) {
      writeResult(error.envelope, parsed.options.json);
      return error.exitCode;
    }

    const exitCode =
      error instanceof UsageError
        ? 6
        : error instanceof OwnCanvasAuthoringError
          ? error.exitCode
        : error instanceof OwnCanvasCliRepositoryError
          ? error.exitCode
          : 1;
    const diagnostic = createDiagnostic(error, command);
    const envelope = createEnvelope({
      ok: false,
      command,
      workspacePath: null,
      campaignId: parsed.options.id ?? parsed.positionals[0] ?? null,
      changed: false,
      errors: [diagnostic],
    });

    writeResult(envelope, parsed.options.json);
    return exitCode;
  }
}

async function executeCommand(parsed: ParsedCliArgs): Promise<OwnCanvasCliResultEnvelope> {
  const { commandGroup, commandName, options, positionals } = parsed;

  if (commandGroup === "workspace" && commandName === "init") {
    const result = await initializeWorkspace({ root: options.root });

    return createEnvelope({
      ok: true,
      command: "workspace init",
      workspacePath: result.workspacePath,
      changed: result.changed,
      data: {
        workspace: result.workspace,
      },
    });
  }

  if (commandGroup === "workspace" && commandName === "status") {
    const result = await getWorkspaceStatus({ root: options.root });

    return createEnvelope({
      ok: true,
      command: "workspace status",
      workspacePath: result.workspacePath,
      changed: false,
      data: {
        initialized: result.initialized,
        workspace: result.workspace,
      },
    });
  }

  if (commandGroup === "campaign" && commandName === "create") {
    const id = requireOption(options.id, "--id", parsed);
    const result = await createCampaignInWorkspace({
      root: options.root,
      id,
      title: options.title,
    });

    return createEnvelope({
      ok: true,
      command: "campaign create",
      workspacePath: result.workspacePath,
      campaignId: result.document.id,
      revisionAfter: result.document.revision.hash,
      changed: result.changed,
      data: {
        campaign: result.document,
        path: result.paths.campaignDirectoryPath,
      },
    });
  }

  if (commandGroup === "campaign" && commandName === "list") {
    const campaigns = await listCampaignsInWorkspace({ root: options.root });
    const status = await getWorkspaceStatus({ root: options.root });

    return createEnvelope({
      ok: true,
      command: "campaign list",
      workspacePath: status.workspacePath,
      changed: false,
      data: {
        campaigns,
      },
    });
  }

  if (commandGroup === "campaign" && commandName === "inspect") {
    const id = requireCampaignId(parsed);
    const result = await inspectCampaignInWorkspace({
      root: options.root,
      id,
    });

    return createEnvelope({
      ok: true,
      command: "campaign inspect",
      workspacePath: result.workspacePath,
      campaignId: result.document.id,
      revisionAfter: result.document.revision.hash,
      changed: false,
      data: {
        campaign: result.document,
        summary: await createCampaignInspectSummary({
          document: result.document,
          campaignDirectoryPath: result.paths.campaignDirectoryPath,
        }),
        path: result.paths.campaignDirectoryPath,
      },
    });
  }

  if (commandGroup === "campaign" && commandName === "open") {
    const id = requireCampaignId(parsed);
    const result = await inspectCampaignInWorkspace({
      root: options.root,
      id,
    });

    return createEnvelope({
      ok: true,
      command: "campaign open",
      workspacePath: result.workspacePath,
      campaignId: result.document.id,
      revisionAfter: result.document.revision.hash,
      changed: false,
      data: {
        canvasPath: `/campaigns/${encodeURIComponent(result.document.id)}/canvas`,
        campaign: result.document,
      },
    });
  }

  if (commandGroup === "campaign" && commandName === "export") {
    const id = requireCampaignId(parsed);
    const out = requireOption(options.out, "--out", parsed);
    const result = await exportCampaignFromWorkspace({
      root: options.root,
      id,
      out,
    });

    return createEnvelope({
      ok: true,
      command: "campaign export",
      workspacePath: result.workspacePath,
      campaignId: result.document.id,
      revisionAfter: result.document.revision.hash,
      changed: true,
      data: {
        outPath: result.outPath,
        campaign: result.document,
      },
    });
  }

  if (commandGroup === "block" && commandName === "add") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const kind = requireSupportedBlockKind(requireOption(options.kind, "--kind", parsed));
    const command: OwnCanvasAuthoringCommand = {
      type: "block.add",
      id: requireOption(options.id, "--id", parsed),
      kind,
      ...(options.title === undefined ? {} : { title: options.title }),
      ...createOptionalPosition(options),
      ...(options.ifNotExists ? { ifNotExists: true } : {}),
    };

    return executeAuthoringCommand(parsed, campaignId, command, "block add");
  }

  if (commandGroup === "block" && commandName === "set") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const command: OwnCanvasAuthoringCommand = {
      type: "block.set",
      id: requireCampaignScopedTargetId(parsed),
      ...(options.title === undefined ? {} : { title: options.title }),
      ...createOptionalPosition(options),
      ...(options.prompt === undefined ? {} : { prompt: options.prompt }),
      ...(options.model === undefined ? {} : { model: options.model }),
      ...(options.aspectRatio === undefined
        ? {}
        : { aspectRatio: options.aspectRatio }),
      ...(options.count === undefined
        ? {}
        : { count: parseNumberOption(options.count, "--count") }),
      ...(options.duration === undefined
        ? {}
        : { duration: parseNumberOption(options.duration, "--duration") }),
      ...(options.resolution === undefined ? {} : { resolution: options.resolution }),
      ...(options.referenceAsset === undefined
        ? {}
        : { referenceAssetId: options.referenceAsset }),
    };

    return executeAuthoringCommand(parsed, campaignId, command, "block set");
  }

  if (commandGroup === "block" && commandName === "remove") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const command: OwnCanvasAuthoringCommand = {
      type: "block.remove",
      id: requireCampaignScopedTargetId(parsed),
      ...(options.ifExists ? { ifExists: true } : {}),
    };

    return executeAuthoringCommand(parsed, campaignId, command, "block remove");
  }

  if (commandGroup === "block" && commandName === "restore") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const command: OwnCanvasAuthoringCommand = {
      type: "block.restore",
      id: requireCampaignScopedTargetId(parsed),
      ...(options.ifExists ? { ifExists: true } : {}),
    };

    return executeAuthoringCommand(parsed, campaignId, command, "block restore");
  }

  if (commandGroup === "edge" && commandName === "connect") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const command: OwnCanvasAuthoringCommand = {
      type: "edge.connect",
      source: requirePosition(parsed, 0, "source endpoint"),
      target: requirePosition(parsed, 1, "target endpoint"),
      ...(options.title === undefined ? {} : { label: options.title }),
      ...(options.ifNotExists ? { ifNotExists: true } : {}),
    };

    return executeAuthoringCommand(parsed, campaignId, command, "edge connect");
  }

  if (commandGroup === "edge" && commandName === "disconnect") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const command: OwnCanvasAuthoringCommand = {
      type: "edge.disconnect",
      ...(options.id === undefined ? {} : { id: options.id }),
      ...(parsed.positionals[0] === undefined ? {} : { source: parsed.positionals[0] }),
      ...(parsed.positionals[1] === undefined ? {} : { target: parsed.positionals[1] }),
      ...(options.ifExists ? { ifExists: true } : {}),
    };

    return executeAuthoringCommand(parsed, campaignId, command, "edge disconnect");
  }

  if (commandGroup === "asset" && commandName === "import") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const command: OwnCanvasAuthoringCommand = {
      type: "asset.import",
      id: requireOption(options.id, "--id", parsed),
      uri: requireOption(options.uri, "--uri", parsed),
      mediaType: requireOption(options.mediaType, "--media-type", parsed) as never,
      title: requireOption(options.title, "--title", parsed),
      ...(options.usage === undefined ? {} : { usage: options.usage as never }),
      ...(options.ifNotExists ? { ifNotExists: true } : {}),
    };

    return executeAuthoringCommand(parsed, campaignId, command, "asset import");
  }

  if (commandGroup === "asset" && commandName === "list") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const command: OwnCanvasAuthoringCommand = {
      type: "asset.list",
    };

    return executeAuthoringCommand(parsed, campaignId, command, "asset list");
  }

  if (commandGroup === "apply" && commandName === null) {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const commands = await readAuthoringPlan(
      requireOption(options.plan, "--plan", parsed),
    );

    return executeAuthoringCommands(parsed, campaignId, commands, "apply");
  }

  if (commandGroup === "validate" && commandName === null) {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const report = await validateCampaignWorkspace({
      root: options.root,
      campaignId,
      runReady: options.runReady,
      strict: options.strict,
    });
    const envelope = createEnvelope({
      ok: report.valid,
      command: "validate",
      workspacePath: report.workspacePath,
      campaignId,
      revisionAfter: report.summary.revision.hash,
      changed: false,
      data: { report },
      warnings: report.warnings.map((diagnostic) =>
        createDiagnosticFromValidation(diagnostic, "validate"),
      ),
      errors: report.errors.map((diagnostic) =>
        createDiagnosticFromValidation(diagnostic, "validate"),
      ),
    });

    if (!report.valid) {
      throw new OwnCanvasCliEnvelopeExit(envelope, 2);
    }

    return envelope;
  }

  if (commandGroup === "diff" && commandName === null) {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const againstPath = requireOption(options.against, "--against", parsed);
    const result = await inspectCampaignInWorkspace({
      root: options.root,
      id: campaignId,
    });
    const against = parseJsonObject(await readFile(againstPath, "utf8"));
    const entries = diffJsonDocuments(against, result.document);

    return createEnvelope({
      ok: true,
      command: "diff",
      workspacePath: result.workspacePath,
      campaignId,
      revisionAfter: result.document.revision.hash,
      changed: false,
      data: {
        againstPath,
        entries,
        human: formatDiffEntriesForHumans(entries),
      },
    });
  }

  if (commandGroup === "generate" && commandName === "run") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const target = createGenerationTarget(parsed);
    const result = await executeMockGenerationRun({
      root: options.root,
      campaignId,
      target,
      runId: options.runId,
    });

    return createEnvelope({
      ok: true,
      command: "generate run",
      workspacePath: result.paths.campaignDirectoryPath,
      campaignId,
      revisionAfter: result.campaign.revision.hash,
      changed: true,
      createdIds: result.response.outputs.map((output) => output.assetId),
      data: {
        runId: result.runId,
        status: result.status,
        response: result.response,
        paths: result.paths,
      },
    });
  }

  if (commandGroup === "generate" && commandName === "status") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const status = await getMockGenerationRunStatus({
      root: options.root,
      campaignId,
      runId: requirePosition(parsed, 0, "run id"),
    });

    return createEnvelope({
      ok: true,
      command: "generate status",
      campaignId,
      changed: false,
      data: { status },
    });
  }

  if (commandGroup === "generate" && commandName === "logs") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const events = await getMockGenerationRunLogs({
      root: options.root,
      campaignId,
      runId: requirePosition(parsed, 0, "run id"),
    });

    return createEnvelope({
      ok: true,
      command: "generate logs",
      campaignId,
      changed: false,
      data: { events },
    });
  }

  if (commandGroup === "generate" && commandName === "outputs") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const outputs = await getMockGenerationRunOutputs({
      root: options.root,
      campaignId,
      runId: requirePosition(parsed, 0, "run id"),
    });

    return createEnvelope({
      ok: true,
      command: "generate outputs",
      campaignId,
      changed: false,
      data: { outputs },
    });
  }

  if (commandGroup === "generate" && commandName === "cancel") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const status = await cancelMockGenerationRun({
      root: options.root,
      campaignId,
      runId: requirePosition(parsed, 0, "run id"),
    });

    return createEnvelope({
      ok: true,
      command: "generate cancel",
      campaignId,
      changed: status.status === "cancelled",
      data: { status },
    });
  }

  if (commandGroup === "generate" && commandName === "retry") {
    const campaignId = requireOption(options.campaign, "--campaign", parsed);
    const result = await retryMockGenerationRun({
      root: options.root,
      campaignId,
      runId: requirePosition(parsed, 0, "run id"),
    });

    return createEnvelope({
      ok: true,
      command: "generate retry",
      campaignId,
      revisionAfter: result.campaign.revision.hash,
      changed: true,
      createdIds: result.response.outputs.map((output) => output.assetId),
      data: {
        runId: result.runId,
        status: result.status,
        response: result.response,
      },
    });
  }

  throw new UsageError(`Unknown command "${getCommandLabel(parsed)}".`);
}

function parseCliArgs(argv: string[]): ParsedCliArgs {
  const positionals: string[] = [];
  const options: ParsedCliArgs["options"] = {
    ifNotExists: false,
    ifExists: false,
    canvas: false,
    runReady: false,
    strict: false,
    dryRun: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--json") {
      options.json = true;
      continue;
    }

    if (token === "--if-not-exists") {
      options.ifNotExists = true;
      continue;
    }

    if (token === "--if-exists") {
      options.ifExists = true;
      continue;
    }

    if (token === "--canvas") {
      options.canvas = true;
      continue;
    }

    if (token === "--run-ready") {
      options.runReady = true;
      continue;
    }

    if (token === "--strict") {
      options.strict = true;
      continue;
    }

    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (isValueFlag(token)) {
      const value = argv[index + 1];

      if (!value || value.startsWith("--")) {
        throw new UsageError(`${token} requires a value.`);
      }

      if (token === "--root") {
        options.root = value;
      } else if (token === "--id") {
        options.id = value;
      } else if (token === "--title") {
        options.title = value;
      } else if (token === "--out") {
        options.out = value;
      } else if (token === "--campaign") {
        options.campaign = value;
      } else if (token === "--kind") {
        options.kind = value;
      } else if (token === "--x") {
        options.x = value;
      } else if (token === "--y") {
        options.y = value;
      } else if (token === "--prompt") {
        options.prompt = value;
      } else if (token === "--model") {
        options.model = value;
      } else if (token === "--aspect-ratio") {
        options.aspectRatio = value;
      } else if (token === "--count") {
        options.count = value;
      } else if (token === "--duration") {
        options.duration = value;
      } else if (token === "--resolution") {
        options.resolution = value;
      } else if (token === "--reference-asset") {
        options.referenceAsset = value;
      } else if (token === "--uri") {
        options.uri = value;
      } else if (token === "--media-type") {
        options.mediaType = value;
      } else if (token === "--usage") {
        options.usage = value;
      } else if (token === "--plan") {
        options.plan = value;
      } else if (token === "--against") {
        options.against = value;
      } else if (token === "--from") {
        options.from = value;
      } else if (token === "--to") {
        options.to = value;
      } else if (token === "--selection") {
        options.selection = value;
      } else if (token === "--run-id") {
        options.runId = value;
      }

      index += 1;
      continue;
    }

    positionals.push(token);
  }

  return {
    commandGroup: positionals.shift() ?? null,
    commandName: positionals.shift() ?? null,
    positionals,
    options,
  };
}

function createGenerationTarget(parsed: ParsedCliArgs): MockGenerationTarget {
  const { options } = parsed;

  if (options.canvas) {
    return { kind: "canvas" };
  }

  if (options.from !== undefined || options.to !== undefined) {
    return {
      kind: "range",
      fromBlockId: requireOption(options.from, "--from", parsed),
      toBlockId: requireOption(options.to, "--to", parsed),
    };
  }

  if (options.selection !== undefined) {
    return {
      kind: "selection",
      blockIds: options.selection
        .split(",")
        .map((blockId) => blockId.trim())
        .filter(Boolean),
    };
  }

  return {
    kind: "block",
    blockId: requirePosition(parsed, 0, "block id"),
  };
}

function createEnvelope(input: {
  ok: boolean;
  command: string;
  workspacePath?: string | null;
  campaignId?: string | null;
  revisionBefore?: string | null;
  revisionAfter?: string | null;
  changed: boolean;
  createdIds?: string[];
  updatedIds?: string[];
  deletedIds?: string[];
  data?: Record<string, unknown> | null;
  warnings?: OwnCanvasCliDiagnostic[];
  errors?: OwnCanvasCliDiagnostic[];
}): OwnCanvasCliResultEnvelope {
  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    ok: input.ok,
    command: input.command,
    workspacePath: input.workspacePath ?? null,
    campaignId: input.campaignId ?? null,
    revisionBefore: input.revisionBefore ?? null,
    revisionAfter: input.revisionAfter ?? null,
    changed: input.changed,
    createdIds: input.createdIds ?? [],
    updatedIds: input.updatedIds ?? [],
    deletedIds: input.deletedIds ?? [],
    data: input.data ?? null,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  };
}

function writeResult(envelope: OwnCanvasCliResultEnvelope, json: boolean) {
  if (json) {
    process.stdout.write(stableStringify(envelope));
    return;
  }

  if (envelope.ok && typeof envelope.data?.human === "string") {
    process.stdout.write(envelope.data.human);
    return;
  }

  if (envelope.ok) {
    process.stdout.write(`${envelope.command}: ok\n`);
    return;
  }

  process.stderr.write(`${envelope.command}: ${envelope.errors[0]?.message ?? "failed"}\n`);
}

function requireCampaignId(parsed: ParsedCliArgs) {
  return parsed.positionals[0] ?? requireOption(parsed.options.id, "--id", parsed);
}

async function executeAuthoringCommand(
  parsed: ParsedCliArgs,
  campaignId: string,
  command: OwnCanvasAuthoringCommand,
  label: string,
): Promise<OwnCanvasCliResultEnvelope> {
  let authoringResult: OwnCanvasAuthoringResult | null = null;
  const updateResult = await updateCampaignInWorkspace({
    root: parsed.options.root,
    id: campaignId,
    command: command.type,
    update: (document) => {
      authoringResult = applyAuthoringCommand(document, command);
      return authoringResult.document;
    },
  });
  const result = requireAuthoringResult(authoringResult);

  return createEnvelope({
    ok: true,
    command: label,
    workspacePath: updateResult.workspacePath,
    campaignId,
    revisionBefore: updateResult.revisionBefore,
    revisionAfter: updateResult.revisionAfter,
    changed: updateResult.changed,
    createdIds: result.createdIds,
    updatedIds: result.updatedIds,
    deletedIds: result.deletedIds,
    data: {
      result: {
        command: result.command,
        data: result.data,
      },
      campaign: updateResult.document,
    },
  });
}

async function executeAuthoringCommands(
  parsed: ParsedCliArgs,
  campaignId: string,
  commands: OwnCanvasAuthoringCommand[],
  label: string,
): Promise<OwnCanvasCliResultEnvelope> {
  if (parsed.options.dryRun) {
    const inspected = await inspectCampaignInWorkspace({
      root: parsed.options.root,
      id: campaignId,
    });
    const result = applyAuthoringCommands(inspected.document, commands);

    return createEnvelope({
      ok: true,
      command: label,
      workspacePath: inspected.workspacePath,
      campaignId,
      revisionBefore: inspected.document.revision.hash,
      revisionAfter: inspected.document.revision.hash,
      changed: result.changed,
      createdIds: result.createdIds,
      updatedIds: result.updatedIds,
      deletedIds: result.deletedIds,
      data: {
        dryRun: true,
        result: {
          commandCount: commands.length,
          results: result.data.results,
        },
        campaignPreview: result.document,
      },
    });
  }

  let authoringResult: OwnCanvasAuthoringResult | null = null;
  const updateResult = await updateCampaignInWorkspace({
    root: parsed.options.root,
    id: campaignId,
    command: "apply",
    update: (document) => {
      authoringResult = applyAuthoringCommands(document, commands);
      return authoringResult.document;
    },
  });
  const result = requireAuthoringResult(authoringResult);

  return createEnvelope({
    ok: true,
    command: label,
    workspacePath: updateResult.workspacePath,
    campaignId,
    revisionBefore: updateResult.revisionBefore,
    revisionAfter: updateResult.revisionAfter,
    changed: updateResult.changed,
    createdIds: result.createdIds,
    updatedIds: result.updatedIds,
    deletedIds: result.deletedIds,
    data: {
      result: {
        commandCount: commands.length,
        results: result.data.results,
      },
      campaign: updateResult.document,
    },
  });
}

function requireAuthoringResult(
  result: OwnCanvasAuthoringResult | null,
): OwnCanvasAuthoringResult {
  if (result === null) {
    throw new Error("Authoring command did not return a result.");
  }

  return result;
}

function requireOption(
  value: string | undefined,
  name: string,
  parsed: ParsedCliArgs,
) {
  if (!value) {
    throw new UsageError(`${getCommandLabel(parsed)} requires ${name}.`);
  }

  return value;
}

function requireCampaignScopedTargetId(parsed: ParsedCliArgs) {
  return parsed.positionals[0] ?? requireOption(parsed.options.id, "--id", parsed);
}

function requirePosition(parsed: ParsedCliArgs, index: number, label: string) {
  const value = parsed.positionals[index];

  if (!value) {
    throw new UsageError(`${getCommandLabel(parsed)} requires ${label}.`);
  }

  return value;
}

function parseNumberOption(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new UsageError(`${label} must be a finite number.`);
  }

  return parsed;
}

function createOptionalPosition(options: ParsedCliArgs["options"]) {
  if (options.x === undefined && options.y === undefined) {
    return {};
  }

  if (options.x === undefined || options.y === undefined) {
    throw new UsageError("--x and --y must be provided together.");
  }

  return {
    position: {
      x: parseNumberOption(options.x, "--x"),
      y: parseNumberOption(options.y, "--y"),
    },
  };
}

function requireSupportedBlockKind(value: string) {
  if (value === "text" || value === "image" || value === "video") {
    return value;
  }

  throw new UsageError("--kind must be one of text, image, or video.");
}

async function readAuthoringPlan(planPath: string): Promise<OwnCanvasAuthoringCommand[]> {
  const parsed = JSON.parse(await readFile(planPath, "utf8")) as unknown;
  const commands = Array.isArray(parsed)
    ? parsed
    : isJsonObject(parsed) && Array.isArray(parsed.commands)
      ? parsed.commands
      : null;

  if (!commands) {
    throw new UsageError("--plan must contain an array or an object with commands array.");
  }

  return commands as OwnCanvasAuthoringCommand[];
}

function isValueFlag(token: string) {
  return [
    "--root",
    "--id",
    "--title",
    "--out",
    "--campaign",
    "--kind",
    "--x",
    "--y",
    "--prompt",
    "--model",
    "--aspect-ratio",
    "--count",
    "--duration",
    "--resolution",
    "--reference-asset",
    "--uri",
    "--media-type",
    "--usage",
    "--plan",
    "--against",
    "--from",
    "--to",
    "--selection",
    "--run-id",
  ].includes(token);
}

function createDiagnostic(error: unknown, command: string): OwnCanvasCliDiagnostic {
  if (error instanceof OwnCanvasCliRepositoryError) {
    return {
      code: error.code,
      message: error.message,
      path: null,
      command,
      retryable: error.code === "workspace_not_found",
      severity: "error",
      recoveryHint:
        error.code === "workspace_not_found" ? "Run workspace init first." : null,
      details: null,
    };
  }

  if (error instanceof OwnCanvasAuthoringError) {
    return {
      code: error.code,
      message: error.message,
      path: null,
      command,
      retryable: error.code.endsWith("_not_found"),
      severity: "error",
      recoveryHint: null,
      details: null,
    };
  }

  if (error instanceof UsageError) {
    return {
      code: "usage_error",
      message: error.message,
      path: null,
      command,
      retryable: false,
      severity: "error",
      recoveryHint: "Check the command and required flags.",
      details: null,
    };
  }

  return {
    code: "unknown_error",
    message: error instanceof Error ? error.message : String(error),
    path: null,
    command,
    retryable: false,
    severity: "error",
    recoveryHint: null,
    details: null,
  };
}

function createDiagnosticFromValidation(
  diagnostic: OwnCanvasCliValidationDiagnostic,
  command: string,
): OwnCanvasCliDiagnostic {
  return {
    code: diagnostic.code,
    message: diagnostic.message,
    path: diagnostic.path,
    command,
    retryable: diagnostic.retryable,
    severity: diagnostic.severity,
    recoveryHint: diagnostic.recoveryHint,
    details: diagnostic.details,
  };
}

function getCommandLabel(parsed: ParsedCliArgs) {
  return [parsed.commandGroup, parsed.commandName].filter(Boolean).join(" ") || "unknown";
}

class OwnCanvasCliEnvelopeExit extends Error {
  readonly envelope: OwnCanvasCliResultEnvelope;
  readonly exitCode: number;

  constructor(envelope: OwnCanvasCliResultEnvelope, exitCode: number) {
    super(envelope.errors[0]?.message ?? `${envelope.command} failed.`);
    this.name = "OwnCanvasCliEnvelopeExit";
    this.envelope = envelope;
    this.exitCode = exitCode;
  }
}

class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runOwnCanvasCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      process.stderr.write(
        error instanceof Error ? `${error.message}\n` : `${String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
