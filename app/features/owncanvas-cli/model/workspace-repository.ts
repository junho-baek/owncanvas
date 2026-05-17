import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  assertSupportedCampaignDocument,
  createFileBackedCampaignDocument,
  type FileBackedCampaignDocument,
} from "./campaign-document.ts";
import { parseJsonObject, stableStringify } from "./stable-json.ts";

export const OWNCANVAS_WORKSPACE_SCHEMA_VERSION = "owncanvas.cli-workspace.v1";
export const OWNCANVAS_WORKSPACE_DIRECTORY = ".owncanvas";
export const OWNCANVAS_CAMPAIGNS_DIRECTORY = "campaigns";

export type OwnCanvasWorkspaceDocument = {
  schemaVersion: typeof OWNCANVAS_WORKSPACE_SCHEMA_VERSION;
  workspaceId: string;
  campaignsPath: typeof OWNCANVAS_CAMPAIGNS_DIRECTORY;
  createdAt: string;
  updatedAt: string;
};

export type OwnCanvasWorkspacePaths = {
  rootPath: string;
  workspacePath: string;
  workspaceJsonPath: string;
  campaignsPath: string;
};

export type OwnCanvasCampaignPaths = {
  campaignDirectoryPath: string;
  campaignJsonPath: string;
  subdirectories: string[];
};

export type OwnCanvasCampaignSummary = {
  id: string;
  title: string;
  path: string;
  revision: FileBackedCampaignDocument["revision"];
  createdAt: string;
  updatedAt: string;
};

export type OwnCanvasCliRepositoryErrorCode =
  | "workspace_not_found"
  | "campaign_not_found"
  | "campaign_already_exists"
  | "invalid_json"
  | "unsupported_schema_version"
  | "file_io_error";

export class OwnCanvasCliRepositoryError extends Error {
  readonly code: OwnCanvasCliRepositoryErrorCode;
  readonly exitCode: number;

  constructor(
    code: OwnCanvasCliRepositoryErrorCode,
    message: string,
    exitCode: number,
  ) {
    super(message);
    this.name = "OwnCanvasCliRepositoryError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

export type WorkspaceInput = {
  root?: string;
};

export type TimestampedWorkspaceInput = WorkspaceInput & {
  now?: () => string;
};

export type CreateCampaignInput = TimestampedWorkspaceInput & {
  id: string;
  title?: string;
};

export type CampaignInput = WorkspaceInput & {
  id: string;
};

export type ExportCampaignInput = CampaignInput & {
  out: string;
};

export async function initializeWorkspace({
  root = process.cwd(),
  now = () => new Date().toISOString(),
}: TimestampedWorkspaceInput = {}) {
  const paths = getWorkspacePaths(root);
  await mkdir(paths.campaignsPath, { recursive: true });

  if (await fileExists(paths.workspaceJsonPath)) {
    const workspace = await readWorkspaceDocument(paths.workspaceJsonPath);

    return {
      changed: false,
      workspacePath: paths.workspacePath,
      paths,
      workspace,
    };
  }

  const timestamp = now();
  const workspace: OwnCanvasWorkspaceDocument = {
    schemaVersion: OWNCANVAS_WORKSPACE_SCHEMA_VERSION,
    workspaceId: createWorkspaceId(paths.rootPath),
    campaignsPath: OWNCANVAS_CAMPAIGNS_DIRECTORY,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await writeJsonFileAtomic(paths.workspaceJsonPath, workspace);

  return {
    changed: true,
    workspacePath: paths.workspacePath,
    paths,
    workspace,
  };
}

export async function getWorkspaceStatus({
  root = process.cwd(),
}: WorkspaceInput = {}) {
  const paths = getWorkspacePaths(root);

  if (!(await fileExists(paths.workspaceJsonPath))) {
    return {
      initialized: false,
      workspacePath: paths.workspacePath,
      paths,
      workspace: null,
    };
  }

  const workspace = await readWorkspaceDocument(paths.workspaceJsonPath);

  return {
    initialized: true,
    workspacePath: paths.workspacePath,
    paths,
    workspace,
  };
}

export async function resolveWorkspace(input: WorkspaceInput = {}) {
  const status = await getWorkspaceStatus(input);

  if (!status.initialized || !status.workspace) {
    throw new OwnCanvasCliRepositoryError(
      "workspace_not_found",
      `OwnCanvas workspace was not found at ${status.workspacePath}. Run workspace init first.`,
      7,
    );
  }

  return {
    workspacePath: status.workspacePath,
    paths: status.paths,
    workspace: status.workspace,
  };
}

export async function createCampaignInWorkspace({
  root = process.cwd(),
  id,
  title,
  now = () => new Date().toISOString(),
}: CreateCampaignInput) {
  const workspace = await resolveWorkspace({ root });
  const paths = getCampaignPaths(workspace.paths, id);

  if (await fileExists(paths.campaignJsonPath)) {
    throw new OwnCanvasCliRepositoryError(
      "campaign_already_exists",
      `Campaign "${id}" already exists.`,
      3,
    );
  }

  await mkdir(paths.campaignDirectoryPath, { recursive: true });
  await Promise.all(
    paths.subdirectories.map((directory) => mkdir(directory, { recursive: true })),
  );

  const document = createFileBackedCampaignDocument({
    id,
    title,
    now,
  });
  await writeJsonFileAtomic(paths.campaignJsonPath, document);

  return {
    changed: true,
    workspacePath: workspace.workspacePath,
    paths,
    document,
  };
}

export async function listCampaignsInWorkspace(input: WorkspaceInput = {}) {
  const workspace = await resolveWorkspace(input);

  if (!(await fileExists(workspace.paths.campaignsPath))) {
    return [];
  }

  const entries = await readdir(workspace.paths.campaignsPath, {
    withFileTypes: true,
  });
  const summaries = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const paths = getCampaignPaths(workspace.paths, entry.name);
        const document = await readCampaignDocument(paths.campaignJsonPath);

        return {
          id: document.id,
          title: document.title,
          path: paths.campaignDirectoryPath,
          revision: document.revision,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        } satisfies OwnCanvasCampaignSummary;
      }),
  );

  return summaries.sort((left, right) => left.id.localeCompare(right.id));
}

export async function inspectCampaignInWorkspace({
  root = process.cwd(),
  id,
}: CampaignInput) {
  const workspace = await resolveWorkspace({ root });
  const paths = getCampaignPaths(workspace.paths, id);
  const document = await readCampaignDocument(paths.campaignJsonPath);

  return {
    workspacePath: workspace.workspacePath,
    paths,
    document,
  };
}

export async function exportCampaignFromWorkspace({
  root = process.cwd(),
  id,
  out,
}: ExportCampaignInput) {
  const inspected = await inspectCampaignInWorkspace({ root, id });
  await mkdir(path.dirname(out), { recursive: true });
  await writeJsonFileAtomic(out, inspected.document);

  return {
    ...inspected,
    outPath: out,
  };
}

export function getWorkspacePaths(root: string): OwnCanvasWorkspacePaths {
  const rootPath = path.resolve(root);
  const workspacePath = path.join(rootPath, OWNCANVAS_WORKSPACE_DIRECTORY);

  return {
    rootPath,
    workspacePath,
    workspaceJsonPath: path.join(workspacePath, "workspace.json"),
    campaignsPath: path.join(workspacePath, OWNCANVAS_CAMPAIGNS_DIRECTORY),
  };
}

export function getCampaignPaths(
  workspacePaths: OwnCanvasWorkspacePaths,
  campaignId: string,
): OwnCanvasCampaignPaths {
  const campaignDirectoryPath = path.join(
    workspacePaths.campaignsPath,
    campaignId,
  );

  return {
    campaignDirectoryPath,
    campaignJsonPath: path.join(campaignDirectoryPath, "campaign.json"),
    subdirectories: ["assets", "outputs", "runs", "snapshots"].map((directory) =>
      path.join(campaignDirectoryPath, directory),
    ),
  };
}

async function readWorkspaceDocument(
  workspaceJsonPath: string,
): Promise<OwnCanvasWorkspaceDocument> {
  const document = await readJsonObject(workspaceJsonPath);

  if (document.schemaVersion !== OWNCANVAS_WORKSPACE_SCHEMA_VERSION) {
    throw new OwnCanvasCliRepositoryError(
      "unsupported_schema_version",
      `Unsupported workspace schemaVersion "${String(document.schemaVersion)}".`,
      2,
    );
  }

  return document as OwnCanvasWorkspaceDocument;
}

async function readCampaignDocument(
  campaignJsonPath: string,
): Promise<FileBackedCampaignDocument> {
  const document = await readJsonObject(campaignJsonPath);

  try {
    assertSupportedCampaignDocument(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new OwnCanvasCliRepositoryError(
      message.includes("schemaVersion")
        ? "unsupported_schema_version"
        : "invalid_json",
      message,
      2,
    );
  }

  return document;
}

async function readJsonObject(filePath: string) {
  try {
    return parseJsonObject(await readFile(filePath, "utf8"));
  } catch (error) {
    if (isFileNotFound(error)) {
      throw new OwnCanvasCliRepositoryError(
        filePath.endsWith("campaign.json")
          ? "campaign_not_found"
          : "workspace_not_found",
        `Required file was not found at ${filePath}.`,
        7,
      );
    }

    if (error instanceof SyntaxError) {
      throw new OwnCanvasCliRepositoryError(
        "invalid_json",
        `Invalid JSON at ${filePath}: ${error.message}`,
        2,
      );
    }

    throw error;
  }
}

async function writeJsonFileAtomic(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  await writeFile(temporaryPath, stableStringify(value), "utf8");
  await rename(temporaryPath, filePath);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (isFileNotFound(error)) {
      return false;
    }

    throw error;
  }
}

function createWorkspaceId(rootPath: string) {
  const basename = path.basename(rootPath).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `workspace_${basename || "owncanvas"}`;
}

function isFileNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
