import { pathToFileURL } from "node:url";

import {
  createCampaignInWorkspace,
  exportCampaignFromWorkspace,
  getWorkspaceStatus,
  initializeWorkspace,
  inspectCampaignInWorkspace,
  listCampaignsInWorkspace,
  OwnCanvasCliRepositoryError,
} from "./model/workspace-repository.ts";
import { stableStringify } from "./model/stable-json.ts";

export type OwnCanvasCliResultEnvelope = {
  schemaVersion: "owncanvas.cli-result.v1";
  ok: boolean;
  command: string;
  workspacePath: string | null;
  campaignId: string | null;
  revisionBefore: string | null;
  revisionAfter: string | null;
  changed: boolean;
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
    const exitCode =
      error instanceof UsageError
        ? 6
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

  throw new UsageError(`Unknown command "${getCommandLabel(parsed)}".`);
}

function parseCliArgs(argv: string[]): ParsedCliArgs {
  const positionals: string[] = [];
  const options: ParsedCliArgs["options"] = {
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--json") {
      options.json = true;
      continue;
    }

    if (token === "--root" || token === "--id" || token === "--title" || token === "--out") {
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
      } else {
        options.out = value;
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

function createEnvelope(input: {
  ok: boolean;
  command: string;
  workspacePath?: string | null;
  campaignId?: string | null;
  revisionBefore?: string | null;
  revisionAfter?: string | null;
  changed: boolean;
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

  if (envelope.ok) {
    process.stdout.write(`${envelope.command}: ok\n`);
    return;
  }

  process.stderr.write(`${envelope.command}: ${envelope.errors[0]?.message ?? "failed"}\n`);
}

function requireCampaignId(parsed: ParsedCliArgs) {
  return parsed.positionals[0] ?? requireOption(parsed.options.id, "--id", parsed);
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

function getCommandLabel(parsed: ParsedCliArgs) {
  return [parsed.commandGroup, parsed.commandName].filter(Boolean).join(" ") || "unknown";
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
