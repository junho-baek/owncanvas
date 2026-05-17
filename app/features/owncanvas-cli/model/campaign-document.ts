import {
  createBlankCampaignRecord,
  type CampaignRecord,
} from "../../creative-canvas/model/creative-canvas.ts";
import { hashStableJson, isJsonObject } from "./stable-json.ts";

export type OwnCanvasCliRevision = {
  number: number;
  hash: string;
  previousHash: string | null;
  updatedAt: string;
  lastCommand: string;
  lastActor: string;
};

export type FileBackedCampaignDocument = CampaignRecord & {
  revision: OwnCanvasCliRevision;
  extensions?: Record<string, unknown>;
};

export type FileBackedCampaignDocumentInput = {
  id: string;
  title?: string;
  now?: () => string;
  actor?: string;
};

export type RenameFileBackedCampaignDocumentInput = {
  title: string;
  now?: () => string;
  actor?: string;
};

const CAMPAIGN_SCHEMA_VERSION = "owncanvas.campaign.v1";
const DEFAULT_ACTOR = "owncanvas-cli";

export function createFileBackedCampaignDocument({
  id,
  title = "Untitled campaign",
  now = () => new Date().toISOString(),
  actor = DEFAULT_ACTOR,
}: FileBackedCampaignDocumentInput): FileBackedCampaignDocument {
  const timestamp = now();
  const storage = createMemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id,
    now: () => timestamp,
  });
  const baseDocument = {
    ...campaign,
    title,
    updatedAt: timestamp,
  };

  return attachRevision(baseDocument, {
    number: 1,
    previousHash: null,
    updatedAt: timestamp,
    lastCommand: "campaign.create",
    lastActor: actor,
  });
}

export function renameFileBackedCampaignDocument<
  TDocument extends FileBackedCampaignDocument,
>(
  document: TDocument,
  {
    title,
    now = () => new Date().toISOString(),
    actor = DEFAULT_ACTOR,
  }: RenameFileBackedCampaignDocumentInput,
): TDocument {
  assertSupportedCampaignDocument(document);

  const timestamp = now();
  const nextDocument = {
    ...document,
    title,
    updatedAt: timestamp,
  };

  return attachRevision(nextDocument, {
    number: document.revision.number + 1,
    previousHash: document.revision.hash,
    updatedAt: timestamp,
    lastCommand: "campaign.rename",
    lastActor: actor,
  }) as TDocument;
}

export function assertSupportedCampaignDocument(
  value: unknown,
): asserts value is FileBackedCampaignDocument {
  if (!isJsonObject(value)) {
    throw new Error("Campaign document must be a JSON object.");
  }

  if (value.schemaVersion !== CAMPAIGN_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported Campaign schemaVersion "${String(value.schemaVersion)}".`,
    );
  }

  if (!isJsonObject(value.revision)) {
    throw new Error("Campaign document is missing revision metadata.");
  }
}

export function calculateCampaignDocumentHash(
  document: Omit<FileBackedCampaignDocument, "revision"> | FileBackedCampaignDocument,
): string {
  const { revision: _revision, ...hashableDocument } =
    document as FileBackedCampaignDocument;
  return hashStableJson(hashableDocument);
}

function attachRevision<TDocument extends CampaignRecord | FileBackedCampaignDocument>(
  document: TDocument,
  revisionInput: Omit<OwnCanvasCliRevision, "hash">,
): TDocument & FileBackedCampaignDocument {
  const { revision: _revision, ...documentWithoutRevision } =
    document as TDocument & Partial<FileBackedCampaignDocument>;
  const hash = calculateCampaignDocumentHash(
    documentWithoutRevision as Omit<FileBackedCampaignDocument, "revision">,
  );

  return {
    ...documentWithoutRevision,
    revision: {
      ...revisionInput,
      hash,
    },
  } as TDocument & FileBackedCampaignDocument;
}

function createMemoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}
