import {
  addCampaignAsset,
  applyCampaignCanvasEditAction,
  createCampaignAsset,
  createCampaignBlock,
  type CampaignAsset,
  type CampaignAssetMediaType,
  type CampaignAssetUsage,
  type CampaignCanvasBlock,
  type CampaignCanvasEdge,
  type GenerationBlockKind,
} from "../../creative-canvas/model/creative-canvas.ts";
import type { FileBackedCampaignDocument } from "./campaign-document.ts";
import { hashStableJson } from "./stable-json.ts";

export type OwnCanvasAuthoringCommand =
  | BlockAddCommand
  | BlockSetCommand
  | BlockRemoveCommand
  | BlockRestoreCommand
  | EdgeConnectCommand
  | EdgeDisconnectCommand
  | AssetImportCommand
  | AssetListCommand;

export type OwnCanvasAuthoringResult = {
  document: FileBackedCampaignDocument;
  changed: boolean;
  command: OwnCanvasAuthoringCommand["type"];
  createdIds: string[];
  updatedIds: string[];
  deletedIds: string[];
  data: Record<string, unknown>;
};

export class OwnCanvasAuthoringError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(code: string, message: string, exitCode = 2) {
    super(message);
    this.name = "OwnCanvasAuthoringError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

type SupportedCliBlockKind = Extract<GenerationBlockKind, "text" | "image" | "video">;

type BlockAddCommand = {
  type: "block.add";
  id: string;
  kind: SupportedCliBlockKind;
  title?: string;
  position?: { x: number; y: number };
  ifNotExists?: boolean;
};

type BlockSetCommand = {
  type: "block.set";
  id: string;
  title?: string;
  position?: { x: number; y: number };
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  count?: number;
  duration?: number;
  resolution?: string;
  referenceAssetId?: string;
};

type BlockRemoveCommand = {
  type: "block.remove";
  id: string;
  ifExists?: boolean;
};

type BlockRestoreCommand = {
  type: "block.restore";
  id: string;
  ifExists?: boolean;
};

type EdgeConnectCommand = {
  type: "edge.connect";
  source: string;
  target: string;
  label?: string;
  ifNotExists?: boolean;
};

type EdgeDisconnectCommand = {
  type: "edge.disconnect";
  id?: string;
  source?: string;
  target?: string;
  ifExists?: boolean;
};

type AssetImportCommand = {
  type: "asset.import";
  id: string;
  uri: string;
  mediaType: CampaignAssetMediaType;
  title: string;
  usage?: CampaignAssetUsage;
  ifNotExists?: boolean;
};

type AssetListCommand = {
  type: "asset.list";
};

type DeletedBlockRecord = {
  block: CampaignCanvasBlock;
};

type OwnCanvasCliExtensions = {
  deletedBlocks?: Record<string, DeletedBlockRecord>;
};

const AUTHORING_ACTOR = "owncanvas-cli";

export function applyAuthoringCommand(
  document: FileBackedCampaignDocument,
  command: OwnCanvasAuthoringCommand,
): OwnCanvasAuthoringResult {
  switch (command.type) {
    case "block.add":
      return addBlock(document, command);
    case "block.set":
      return setBlock(document, command);
    case "block.remove":
      return removeBlock(document, command);
    case "block.restore":
      return restoreBlock(document, command);
    case "edge.connect":
      return connectEdge(document, command);
    case "edge.disconnect":
      return disconnectEdge(document, command);
    case "asset.import":
      return importAsset(document, command);
    case "asset.list":
      return createResult(document, command, {
        changed: false,
        data: { assets: document.assets },
      });
  }
}

export function applyAuthoringCommands(
  document: FileBackedCampaignDocument,
  commands: OwnCanvasAuthoringCommand[],
): OwnCanvasAuthoringResult {
  const originalHash = hashStableJson(document);
  let currentDocument = cloneDocument(document);
  const results: OwnCanvasAuthoringResult[] = [];

  for (const command of commands) {
    const result = applyAuthoringCommand(currentDocument, command);
    currentDocument = result.document;
    results.push(result);
  }

  return createResult(currentDocument, { type: "asset.list" }, {
    changed: hashStableJson(currentDocument) !== originalHash,
    data: { results },
    createdIds: results.flatMap((result) => result.createdIds),
    updatedIds: results.flatMap((result) => result.updatedIds),
    deletedIds: results.flatMap((result) => result.deletedIds),
  });
}

function addBlock(
  document: FileBackedCampaignDocument,
  command: BlockAddCommand,
): OwnCanvasAuthoringResult {
  const existingBlock = findBlock(document, command.id);

  if (existingBlock) {
    if (command.ifNotExists) {
      return createResult(document, command, {
        changed: false,
        data: { block: existingBlock },
      });
    }

    throw new OwnCanvasAuthoringError(
      "block_already_exists",
      `Generation Block "${command.id}" already exists.`,
      3,
    );
  }

  const block = {
    ...createCampaignBlock(
      command.kind,
      document.canvasState.nodes.length,
      command.position,
    ),
    id: command.id,
    ...(command.title === undefined ? {} : { title: command.title }),
  };
  const updatedDocument = applyCampaignCanvasEditAction(document, {
    type: "canvas.node.create",
    node: block,
  }) as FileBackedCampaignDocument;

  return createResult(updatedDocument, command, {
    changed: true,
    createdIds: [command.id],
    data: { block },
  });
}

function setBlock(
  document: FileBackedCampaignDocument,
  command: BlockSetCommand,
): OwnCanvasAuthoringResult {
  const block = findBlock(document, command.id);

  if (!block) {
    throw new OwnCanvasAuthoringError(
      "block_not_found",
      `Generation Block "${command.id}" was not found.`,
      7,
    );
  }

  const patch = createBlockPatch(block, command);
  const updatedDocument = applyCampaignCanvasEditAction(document, {
    type: "canvas.node.update",
    nodeId: command.id,
    patch,
  }) as FileBackedCampaignDocument;
  const updatedBlock = findBlock(updatedDocument, command.id);

  return createResult(updatedDocument, command, {
    changed: hashStableJson(block) !== hashStableJson(updatedBlock),
    updatedIds: [command.id],
    data: { block: updatedBlock },
  });
}

function removeBlock(
  document: FileBackedCampaignDocument,
  command: BlockRemoveCommand,
): OwnCanvasAuthoringResult {
  const block = findBlock(document, command.id);

  if (!block) {
    if (command.ifExists) {
      return createResult(document, command, { changed: false });
    }

    throw new OwnCanvasAuthoringError(
      "block_not_found",
      `Generation Block "${command.id}" was not found.`,
      7,
    );
  }

  const withDeletedBlock = setDeletedBlock(document, block);
  const updatedDocument = applyCampaignCanvasEditAction(withDeletedBlock, {
    type: "canvas.node.delete",
    nodeId: command.id,
  }) as FileBackedCampaignDocument;

  return createResult(updatedDocument, command, {
    changed: true,
    deletedIds: [command.id],
    data: { block },
  });
}

function restoreBlock(
  document: FileBackedCampaignDocument,
  command: BlockRestoreCommand,
): OwnCanvasAuthoringResult {
  const existingBlock = findBlock(document, command.id);

  if (existingBlock) {
    if (command.ifExists) {
      return createResult(document, command, {
        changed: false,
        data: { block: existingBlock },
      });
    }

    throw new OwnCanvasAuthoringError(
      "block_already_exists",
      `Generation Block "${command.id}" already exists.`,
      3,
    );
  }

  const deletedRecord = getDeletedBlocks(document)[command.id];

  if (!deletedRecord) {
    if (command.ifExists) {
      return createResult(document, command, { changed: false });
    }

    throw new OwnCanvasAuthoringError(
      "deleted_block_not_found",
      `Deleted Generation Block "${command.id}" was not found.`,
      7,
    );
  }

  const withRestoredBlock = removeDeletedBlock(document, command.id);
  const updatedDocument = applyCampaignCanvasEditAction(withRestoredBlock, {
    type: "canvas.node.create",
    node: deletedRecord.block,
  }) as FileBackedCampaignDocument;

  return createResult(updatedDocument, command, {
    changed: true,
    createdIds: [command.id],
    data: { block: deletedRecord.block },
  });
}

function connectEdge(
  document: FileBackedCampaignDocument,
  command: EdgeConnectCommand,
): OwnCanvasAuthoringResult {
  const source = parsePortReference(command.source, "source");
  const target = parsePortReference(command.target, "target");
  ensureBlockExists(document, source.blockId);
  ensureBlockExists(document, target.blockId);

  const edge = createDomainEdge({
    source: source.blockId,
    sourcePort: source.port,
    target: target.blockId,
    targetPort: target.port,
    label: command.label ?? createEdgeLabel(source.port, target.port),
  });
  const existingEdge = document.canvasState.edges.find(
    (candidate) => candidate.id === edge.id,
  );

  if (existingEdge) {
    return createResult(document, command, {
      changed: false,
      data: { edge: existingEdge },
    });
  }

  const updatedDocument = applyCampaignCanvasEditAction(document, {
    type: "canvas.edge.connect",
    edge,
  }) as FileBackedCampaignDocument;

  return createResult(updatedDocument, command, {
    changed: true,
    createdIds: [edge.id],
    data: { edge },
  });
}

function disconnectEdge(
  document: FileBackedCampaignDocument,
  command: EdgeDisconnectCommand,
): OwnCanvasAuthoringResult {
  const edgeId = command.id ?? resolveEdgeIdFromCommand(command);
  const edge = document.canvasState.edges.find((candidate) => candidate.id === edgeId);

  if (!edge) {
    if (command.ifExists) {
      return createResult(document, command, { changed: false });
    }

    throw new OwnCanvasAuthoringError(
      "edge_not_found",
      `Canvas edge "${edgeId}" was not found.`,
      7,
    );
  }

  const updatedDocument = applyCampaignCanvasEditAction(document, {
    type: "canvas.edge.disconnect",
    edgeId,
  }) as FileBackedCampaignDocument;

  return createResult(updatedDocument, command, {
    changed: true,
    deletedIds: [edgeId],
    data: { edge },
  });
}

function importAsset(
  document: FileBackedCampaignDocument,
  command: AssetImportCommand,
): OwnCanvasAuthoringResult {
  const existingAsset = document.assets.find((asset) => asset.id === command.id);

  if (existingAsset) {
    if (command.ifNotExists) {
      return createResult(document, command, {
        changed: false,
        data: { asset: existingAsset },
      });
    }

    throw new OwnCanvasAuthoringError(
      "asset_already_exists",
      `Campaign asset "${command.id}" already exists.`,
      3,
    );
  }

  const asset = createCampaignAsset(
    {
      id: command.id,
      source: command.uri.startsWith("file:") ? "upload" : "link",
      mediaType: command.mediaType,
      title: command.title,
      uri: command.uri,
      usage: command.usage ?? "reference",
      status: "ready",
      rights: {
        owner: AUTHORING_ACTOR,
        license: "reference",
        sourceUrl: command.uri.startsWith("http") ? command.uri : undefined,
      },
      createdBy: "agent",
    },
    { now: () => document.updatedAt },
  );
  const updatedDocument = addCampaignAsset(document, asset, {
    now: () => document.updatedAt,
  }) as FileBackedCampaignDocument;

  return createResult(updatedDocument, command, {
    changed: true,
    createdIds: [asset.id],
    data: { asset },
  });
}

function createBlockPatch(
  block: CampaignCanvasBlock,
  command: BlockSetCommand,
) {
  const properties = { ...(block.properties ?? {}) };

  if (command.prompt !== undefined) {
    properties.prompt = command.prompt;
  }

  if (command.model !== undefined) {
    properties.modelSlug = command.model;
  }

  if (command.aspectRatio !== undefined) {
    properties.aspectRatio = command.aspectRatio;
  }

  if (command.count !== undefined) {
    properties.batchCount = command.count;
  }

  if (command.duration !== undefined) {
    properties.durationSeconds = command.duration;
  }

  if (command.resolution !== undefined) {
    properties.resolution = command.resolution;
  }

  if (command.referenceAssetId !== undefined) {
    properties.referenceImageAssetId = command.referenceAssetId;
    properties.referenceImages = [
      {
        type: "asset",
        ref: command.referenceAssetId,
        attachmentMetadata: {
          source: "asset",
          asset: {
            assetId: command.referenceAssetId,
            title: null,
            mediaType: "image",
          },
        },
      },
    ];
  }

  return {
    ...(command.title === undefined ? {} : { title: command.title }),
    ...(command.position === undefined ? {} : { position: command.position }),
    properties,
  };
}

function createDomainEdge(edge: {
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  label: string;
}): CampaignCanvasEdge & { sourcePort: string; targetPort: string } {
  return {
    id: createEdgeId(edge),
    source: edge.source,
    sourcePort: edge.sourcePort,
    target: edge.target,
    targetPort: edge.targetPort,
    type: "domain",
    label: edge.label,
  };
}

function createEdgeId(edge: {
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}) {
  return [
    "edge",
    edge.source,
    edge.sourcePort,
    edge.target,
    edge.targetPort,
  ]
    .join("_")
    .replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function createEdgeLabel(sourcePort: string, targetPort: string) {
  return `${sourcePort} -> ${targetPort}`;
}

function parsePortReference(value: string | undefined, role: "source" | "target") {
  if (!value) {
    throw new OwnCanvasAuthoringError(
      "edge_endpoint_required",
      `Canvas edge ${role} endpoint is required.`,
      6,
    );
  }

  const separatorIndex = value.indexOf(":");

  if (separatorIndex < 1 || separatorIndex === value.length - 1) {
    throw new OwnCanvasAuthoringError(
      "edge_endpoint_invalid",
      `Canvas edge ${role} endpoint must use block_id:port_name syntax.`,
      6,
    );
  }

  return {
    blockId: value.slice(0, separatorIndex),
    port: value.slice(separatorIndex + 1),
  };
}

function resolveEdgeIdFromCommand(command: EdgeDisconnectCommand) {
  if (command.id) {
    return command.id;
  }

  const source = parsePortReference(command.source, "source");
  const target = parsePortReference(command.target, "target");

  return createEdgeId({
    source: source.blockId,
    sourcePort: source.port,
    target: target.blockId,
    targetPort: target.port,
  });
}

function ensureBlockExists(document: FileBackedCampaignDocument, blockId: string) {
  if (!findBlock(document, blockId)) {
    throw new OwnCanvasAuthoringError(
      "block_not_found",
      `Generation Block "${blockId}" was not found.`,
      7,
    );
  }
}

function findBlock(document: FileBackedCampaignDocument, blockId: string) {
  return document.canvasState.nodes.find((node) => node.id === blockId);
}

function setDeletedBlock(
  document: FileBackedCampaignDocument,
  block: CampaignCanvasBlock,
): FileBackedCampaignDocument {
  const extensions = getCliExtensions(document);

  return {
    ...document,
    extensions: {
      ...(document.extensions ?? {}),
      owncanvasCli: {
        ...extensions,
        deletedBlocks: {
          ...(extensions.deletedBlocks ?? {}),
          [block.id]: {
            block,
          },
        },
      },
    },
  };
}

function removeDeletedBlock(
  document: FileBackedCampaignDocument,
  blockId: string,
): FileBackedCampaignDocument {
  const extensions = getCliExtensions(document);
  const { [blockId]: _removed, ...deletedBlocks } = extensions.deletedBlocks ?? {};

  return {
    ...document,
    extensions: {
      ...(document.extensions ?? {}),
      owncanvasCli: {
        ...extensions,
        deletedBlocks,
      },
    },
  };
}

function getDeletedBlocks(document: FileBackedCampaignDocument) {
  return getCliExtensions(document).deletedBlocks ?? {};
}

function getCliExtensions(document: FileBackedCampaignDocument): OwnCanvasCliExtensions {
  const owncanvasCli = document.extensions?.owncanvasCli;

  if (
    typeof owncanvasCli === "object" &&
    owncanvasCli !== null &&
    !Array.isArray(owncanvasCli)
  ) {
    return owncanvasCli as OwnCanvasCliExtensions;
  }

  return {};
}

function createResult(
  document: FileBackedCampaignDocument,
  command: Pick<OwnCanvasAuthoringCommand, "type">,
  input: Partial<Omit<OwnCanvasAuthoringResult, "document" | "command">> = {},
): OwnCanvasAuthoringResult {
  return {
    document,
    changed: input.changed ?? true,
    command: command.type,
    createdIds: input.createdIds ?? [],
    updatedIds: input.updatedIds ?? [],
    deletedIds: input.deletedIds ?? [],
    data: input.data ?? {},
  };
}

function cloneDocument(
  document: FileBackedCampaignDocument,
): FileBackedCampaignDocument {
  return JSON.parse(JSON.stringify(document)) as FileBackedCampaignDocument;
}
