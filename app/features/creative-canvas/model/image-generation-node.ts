export const IMAGE_GENERATION_NODE_TYPE = "owncanvas.image-generation.v1";

export const imageGenerationNodeStatuses = [
  "idle",
  "selected",
  "running",
  "completed",
  "error",
  "cancelled",
] as const;

export type ImageGenerationNodeStatus =
  (typeof imageGenerationNodeStatuses)[number];

export const imageGenerationNodeV2Statuses = [
  "idle",
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
] as const;

export type ImageGenerationNodeV2Status =
  (typeof imageGenerationNodeV2Statuses)[number];

export type ImageGenerationNodeUiStatus =
  | ImageGenerationNodeStatus
  | ImageGenerationNodeV2Status;

export type ImageGenerationNodeInputPortId =
  | "prompt"
  | "reference_image"
  | "style_template_vars";

export type ImageGenerationNodeOutputPortId =
  | "generated_image_asset"
  | "metadata"
  | "cost_usage";

export type ImageGenerationNodePort = {
  id: ImageGenerationNodeInputPortId | ImageGenerationNodeOutputPortId;
  label: string;
  dataType: "text" | "asset" | "json" | "currency";
  required: boolean;
  description: string;
};

export type ImageGenerationProviderPreset = {
  providerId: "openai-image" | "replicate" | "freepik-compatible";
  label: string;
  capabilityId: string;
  modelHint: string;
  secretEnvName: string;
  credentialStatus?: ImageGenerationProviderCredentialStatus;
  notes: string;
};

export type ImageGenerationProviderId = ImageGenerationProviderPreset["providerId"];

export type ImageGenerationModelCapabilityKey =
  `${ImageGenerationProviderId}:${string}`;

export type ImageGenerationCapabilityAspectRatio =
  | ImageGenerationAspectRatio
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "21:9"
  | "match_input_image"
  | "custom";

export type ImageGenerationInputControlKind =
  | "prompt"
  | "reference_images"
  | "aspect_ratio"
  | "output_format"
  | "seed"
  | "quality"
  | "guidance"
  | "size";

export type ImageGenerationInputControlDefaultValue =
  | string
  | number
  | boolean
  | null
  | readonly string[];

export type ImageGenerationInputControlValidationConstraints = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  minItems?: number;
  maxItems?: number;
  options?: readonly string[];
  acceptedTypes?: readonly ("asset" | "url" | "recent_output")[];
};

export type ImageGenerationInputControl = {
  id: string;
  schemaKey: string;
  kind: ImageGenerationInputControlKind;
  required: boolean;
  visibility: "compact" | "inspector" | "hidden";
  defaultValue: ImageGenerationInputControlDefaultValue;
  options?: readonly string[];
  validationConstraints: ImageGenerationInputControlValidationConstraints;
};

export type ImageGenerationModelControlMetadata = {
  supportedControls: readonly ImageGenerationInputControlKind[];
  defaultValues: Record<string, ImageGenerationInputControlDefaultValue>;
  aspectRatioOptions: readonly ImageGenerationCapabilityAspectRatio[];
  validationConstraints: Record<
    string,
    ImageGenerationInputControlValidationConstraints
  >;
};

export type ImageGenerationSchemaAdapter = {
  providerId: ImageGenerationProviderId;
  promptField: string;
  referenceImagesField: string | null;
  aspectRatioField: string | null;
  widthField: string | null;
  heightField: string | null;
  sizeField: string | null;
  seedField: string | null;
  guidanceField: string | null;
  qualityField: string | null;
  outputFormatField: string | null;
  unsupportedRatioBehavior: "disable" | "map_nearest" | "require_model_change";
};

export type ImageGenerationReplicateCapabilityMetadata = {
  providerId: "replicate";
  modelRef: string;
  inputEnvelopeField: "input";
  credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN";
  schemaInputKeys: {
    required: readonly string[];
    optional: readonly string[];
  };
  referenceInputMode: "none" | "single" | "multi";
  customSizeKeys: {
    size: string | null;
    width: string | null;
    height: string | null;
  };
  capabilityBindings: {
    prompt: {
      schemaKey: string;
      required: true;
    };
    referenceImages: {
      schemaKey: string | null;
      mode: "none" | "single" | "multi";
    };
    aspectRatio: {
      schemaKey: string | null;
      mode: "none" | "enum" | "enum_or_custom";
    };
    size: {
      schemaKey: string | null;
      mode: "none" | "size" | "width_height";
    };
    seed: {
      schemaKey: string | null;
      supported: boolean;
    };
    guidance: {
      schemaKey: string | null;
      supported: boolean;
    };
    quality: {
      schemaKey: string | null;
      supported: boolean;
    };
    outputFormat: {
      schemaKey: string | null;
      supported: boolean;
    };
  };
};

export type ImageGenerationModelCapability = {
  provider: Pick<ImageGenerationProviderPreset, "providerId" | "label" | "secretEnvName">;
  model: {
    slug: string;
    label: string;
  };
  schemaAdapter: ImageGenerationSchemaAdapter;
  replicate?: ImageGenerationReplicateCapabilityMetadata;
  controlMetadata: ImageGenerationModelControlMetadata;
  capabilities: {
    textToImage: boolean;
    imageToImage: boolean;
    multiReference: boolean;
    inpainting: boolean;
    maskInput: boolean;
    seedControl: boolean;
    aspectRatioControl: boolean;
    customSize: boolean;
    qualityControl: boolean;
    outputFormatControl: boolean;
  };
  supportedAspectRatios: ImageGenerationCapabilityAspectRatio[];
  defaultAspectRatio: ImageGenerationCapabilityAspectRatio;
  referenceSupport: {
    supported: boolean;
    maxImages: number;
    inputControlId: string | null;
    acceptedTypes: readonly ("asset" | "url" | "recent_output")[];
  };
  referenceAttachment: ImageGenerationReferenceAttachmentCapabilityMetadata;
  inputControls: ImageGenerationInputControl[];
  outputConstraints: {
    formats: readonly string[];
    maxOutputs: number;
    defaultFormat: string;
    unsupportedDefaultRatioBehavior?: "map_nearest" | "disable";
  };
};

export type ImageGenerationAspectRatioCompatibilityBehavior =
  | "native"
  | "map_nearest"
  | "disable"
  | "require_model_change";

export type ImageGenerationAspectRatioCompatibilityRule = {
  providerId: ImageGenerationProviderId;
  modelSlug: string;
  requestedAspectRatio: ImageGenerationCapabilityAspectRatio;
  providerAspectRatio: ImageGenerationCapabilityAspectRatio;
  behavior: ImageGenerationAspectRatioCompatibilityBehavior;
  message: string;
  guidance: string;
};

export type ImageGenerationAspectRatioCompatibilityMapping = Record<
  ImageGenerationModelCapabilityKey,
  readonly ImageGenerationAspectRatioCompatibilityRule[]
>;

export type ImageGenerationAspectRatioSelectorOptionAvailability =
  | "native"
  | "mapped"
  | "disabled";

export type ImageGenerationAspectRatioSelectorOption = {
  aspectRatio: ImageGenerationAspectRatio;
  providerAspectRatio: ImageGenerationCapabilityAspectRatio;
  label: string;
  availability: ImageGenerationAspectRatioSelectorOptionAvailability;
  disabled: boolean;
  compatibilityMessage: string | null;
  guidance: string | null;
};

export type ImageGenerationOutputNextNodeActionKind =
  | "image-edit"
  | "style-variant"
  | "upscale"
  | "video"
  | "output-card"
  | "landing-asset";

export type ImageGenerationOutputNextNodeActionAvailability =
  | "available"
  | "disabled";

export type ImageGenerationOutputNextNodeAction = {
  kind: ImageGenerationOutputNextNodeActionKind;
  label: string;
  description: string;
  availability: ImageGenerationOutputNextNodeActionAvailability;
  disabledReason: string | null;
};

export type ImageGenerationOutputNextNodeTargetKind =
  | "image"
  | "video"
  | "landing"
  | "custom";

export type ImageGenerationOutputNextNodeRequiredNodeType = "generation";

export type ImageGenerationOutputNextNodeSelectedOutputPayloadField =
  | "sourceImageNodeId"
  | "sourceOutputAssetId"
  | "nextNodeActionKind";

export type ImageGenerationOutputNextNodeDefaultConfig = {
  nodeTitle: string;
  nodeSubtitle: string;
  nodeDescription: string;
  nodeStatus: "READY" | "DRAFT" | "NEEDS INPUT";
  connectionPurpose: string;
};

export type ImageGenerationOutputNextNodeMapping = {
  actionKind: ImageGenerationOutputNextNodeActionKind;
  requiredNodeType: ImageGenerationOutputNextNodeRequiredNodeType;
  targetNodeKind: ImageGenerationOutputNextNodeTargetKind;
  targetInputPort: string;
  edgeLabel: string;
  defaultConfig: ImageGenerationOutputNextNodeDefaultConfig;
  selectedOutputPayloadFields: readonly ImageGenerationOutputNextNodeSelectedOutputPayloadField[];
};

const imageGenerationOutputNextNodeSelectedOutputPayloadFields = [
  "sourceImageNodeId",
  "sourceOutputAssetId",
  "nextNodeActionKind",
] as const satisfies readonly ImageGenerationOutputNextNodeSelectedOutputPayloadField[];

export const imageGenerationOutputNextNodeMappings = [
  {
    actionKind: "image-edit",
    requiredNodeType: "generation",
    targetNodeKind: "image",
    targetInputPort: "inputs.reference_image",
    edgeLabel: "image edit source",
    defaultConfig: {
      nodeTitle: "Image Block",
      nodeSubtitle: "Edit selected Creative Output",
      nodeDescription:
        "Uses the selected generated image as the edit source for a new Image Block.",
      nodeStatus: "DRAFT",
      connectionPurpose: "edit-source",
    },
    selectedOutputPayloadFields:
      imageGenerationOutputNextNodeSelectedOutputPayloadFields,
  },
  {
    actionKind: "style-variant",
    requiredNodeType: "generation",
    targetNodeKind: "image",
    targetInputPort: "inputs.reference_image",
    edgeLabel: "style reference",
    defaultConfig: {
      nodeTitle: "Image Block",
      nodeSubtitle: "Variant from selected Creative Output",
      nodeDescription:
        "Keeps the selected generated image as the style reference for a new Image Block.",
      nodeStatus: "DRAFT",
      connectionPurpose: "style-reference",
    },
    selectedOutputPayloadFields:
      imageGenerationOutputNextNodeSelectedOutputPayloadFields,
  },
  {
    actionKind: "upscale",
    requiredNodeType: "generation",
    targetNodeKind: "image",
    targetInputPort: "inputs.reference_image",
    edgeLabel: "upscale source",
    defaultConfig: {
      nodeTitle: "Image Block",
      nodeSubtitle: "Upscale selected Creative Output",
      nodeDescription:
        "Uses the selected generated image as the source for a provider-sized upscale Image Block.",
      nodeStatus: "DRAFT",
      connectionPurpose: "upscale-source",
    },
    selectedOutputPayloadFields:
      imageGenerationOutputNextNodeSelectedOutputPayloadFields,
  },
  {
    actionKind: "video",
    requiredNodeType: "generation",
    targetNodeKind: "video",
    targetInputPort: "inputs.frame",
    edgeLabel: "video source",
    defaultConfig: {
      nodeTitle: "Video Block",
      nodeSubtitle: "Animate selected Creative Output",
      nodeDescription:
        "Uses the selected generated image as the starting frame for a Video Block.",
      nodeStatus: "DRAFT",
      connectionPurpose: "video-source-frame",
    },
    selectedOutputPayloadFields:
      imageGenerationOutputNextNodeSelectedOutputPayloadFields,
  },
  {
    actionKind: "output-card",
    requiredNodeType: "generation",
    targetNodeKind: "custom",
    targetInputPort: "inputs.creative_output",
    edgeLabel: "Creative Output",
    defaultConfig: {
      nodeTitle: "Output / result card",
      nodeSubtitle: "Creative Output pin",
      nodeDescription:
        "Pins a selected image generation result as a reusable canvas output.",
      nodeStatus: "READY",
      connectionPurpose: "creative-output-pin",
    },
    selectedOutputPayloadFields:
      imageGenerationOutputNextNodeSelectedOutputPayloadFields,
  },
  {
    actionKind: "landing-asset",
    requiredNodeType: "generation",
    targetNodeKind: "landing",
    targetInputPort: "inputs.landing_asset",
    edgeLabel: "landing asset",
    defaultConfig: {
      nodeTitle: "Landing Block",
      nodeSubtitle: "Use selected Creative Output",
      nodeDescription:
        "Uses the selected generated image as an asset for a landing destination.",
      nodeStatus: "DRAFT",
      connectionPurpose: "landing-page-asset",
    },
    selectedOutputPayloadFields:
      imageGenerationOutputNextNodeSelectedOutputPayloadFields,
  },
] as const satisfies readonly ImageGenerationOutputNextNodeMapping[];

export function resolveImageGenerationOutputNextNodeMapping(
  actionKind: ImageGenerationOutputNextNodeActionKind,
): ImageGenerationOutputNextNodeMapping {
  const mapping = imageGenerationOutputNextNodeMappings.find(
    (candidate) => candidate.actionKind === actionKind,
  );

  if (mapping === undefined) {
    throw new Error(`Unknown image output next-node action: ${actionKind}`);
  }

  return mapping;
}

export type ImageGenerationNodeValidationIssueSeverity = "warning" | "error";

export type ImageGenerationNodeValidationIssue = {
  code:
    | "image_generation.model_capability_missing"
    | "image_generation.aspect_ratio_unsupported"
    | "image_generation.aspect_ratio_mapped"
    | "image_generation.control_unsupported"
    | "image_generation.control_value_invalid"
    | "image_generation.reference_unsupported"
    | "image_generation.reference_count_invalid"
    | "image_generation.reference_type_invalid";
  severity: ImageGenerationNodeValidationIssueSeverity;
  controlId: string;
  message: string;
  guidance: string;
  supportedValues?: readonly string[];
};

export type ImageGenerationNodeValidationFeedbackState =
  | "ready"
  | "warning"
  | "invalid";

export type ImageGenerationNodeValidationFeedback = {
  state: ImageGenerationNodeValidationFeedbackState;
  label: string;
  className: ImageGenerationNodeValidationFeedbackState;
  ariaLabel: string;
  message: string | null;
};

export type ImageGenerationNodeValidationResult = {
  valid: boolean;
  issues: ImageGenerationNodeValidationIssue[];
  feedback: ImageGenerationNodeValidationFeedback;
};

export type ImageGenerationReferenceInputType =
  | "asset"
  | "url"
  | "recent_output";

export type ImageGenerationReferenceAttachmentCapabilityState =
  | "unsupported"
  | "single-reference"
  | "multi-reference";

export type ImageGenerationReferenceAttachmentCapabilityMetadata = {
  schemaVersion: "owncanvas.image-generation.reference-attachment-capability.v1";
  providerId: ImageGenerationProviderId;
  modelSlug: string;
  state: ImageGenerationReferenceAttachmentCapabilityState;
  supported: boolean;
  maxReferenceCount: number;
  inputControlId: string | null;
  schemaKey: string | null;
  referenceInputMode: "none" | "single" | "multi";
  acceptedTypes: readonly ImageGenerationReferenceInputType[];
  unsupportedReason: string | null;
};

export type ImageGenerationReferenceAttachmentMetadata = {
  schemaVersion: "owncanvas.image-generation.reference-attachment.v1";
  source: "upload" | "url" | "asset" | "recent_output";
  providerBinding: {
    providerId: ImageGenerationProviderId;
    modelSlug: string;
    credentialEnvName: string;
    inputControlId: string | null;
    schemaKey: string | null;
    referenceInputMode: "none" | "single" | "multi";
    maxImages: number;
    acceptedTypes: readonly ImageGenerationReferenceInputType[];
  };
  file?: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  };
  url?: {
    href: string;
    origin: string;
    pathname: string;
  };
  asset?: {
    assetId: string;
    title: string | null;
    mediaType: string | null;
  };
  recentOutput?: {
    assetId: string;
    sourceNodeId: string | null;
    outputPortId: string | null;
  };
};

export type ImageGenerationNodeReferenceInput = {
  id?: string;
  type: ImageGenerationReferenceInputType;
  ref: string;
  attachmentMetadata?: ImageGenerationReferenceAttachmentMetadata;
};

export type ImageGenerationReferenceTrayPreviewState =
  | "previewable"
  | "pending-upload"
  | "asset-reference"
  | "recent-output";

export type ImageGenerationReferenceTrayAttachment = {
  id: string;
  insertionOrder: number;
  type: ImageGenerationReferenceInputType;
  ref: string;
  source: ImageGenerationReferenceAttachmentMetadata["source"] | "unknown";
  label: string;
  detail: string;
  preview: {
    state: ImageGenerationReferenceTrayPreviewState;
    src: string | null;
    alt: string;
  };
  remove: {
    ariaLabel: string;
  };
  reorder: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    moveUpAriaLabel: string;
    moveDownAriaLabel: string;
  };
  validation: {
    state: "valid" | "disabled" | "error";
    message: string | null;
  };
};

export type ImageGenerationReferenceTrayCapability = {
  providerId: ImageGenerationProviderId;
  modelSlug: string;
  state: ImageGenerationReferenceAttachmentCapabilityState;
  supported: boolean;
  acceptedTypes: readonly ImageGenerationReferenceInputType[];
  attachedReferenceCount: number;
  maxReferenceCount: number;
  remainingReferenceCount: number;
  canAddReferences: boolean;
  addDisabledReason: string | null;
  canRemoveReferences: boolean;
  removeDisabledReason: string | null;
};

export type ImageGenerationReferenceTrayEmptyState = {
  label: string;
  description: string;
  actionLabel: string;
};

export type ImageGenerationReferenceAttachmentDraft =
  | {
      kind: "file";
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }
  | {
      kind: "url";
      url: string;
    }
  | {
      kind: "asset";
      assetId: string;
      title?: string;
      mediaType?: string;
    }
  | {
      kind: "recent_output";
      assetId: string;
      sourceNodeId?: string;
      outputPortId?: string;
    };

export type ImageGenerationReferenceAttachmentValidation = {
  valid: boolean;
  message: string | null;
  referenceInput: ImageGenerationNodeReferenceInput | null;
};

export type ImageGenerationNodeModelOptionValues = {
  aspectRatio?: ImageGenerationCapabilityAspectRatio;
  controlValues?: Record<string, ImageGenerationInputControlDefaultValue>;
  referenceImages?: readonly ImageGenerationNodeReferenceInput[];
};

export type ImageGenerationNodeProviderRequestInput = {
  properties: ImageGenerationNodeProperties;
  prompt: string;
  referenceImages?: readonly ImageGenerationNodeReferenceInput[];
  controlValues?: Record<string, ImageGenerationInputControlDefaultValue>;
};

export type ImageGenerationReplicatePredictionRequest = {
  providerId: "replicate";
  model: string;
  credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN";
  inputEnvelopeField: "input";
  input: Record<string, unknown>;
  aspectRatio: {
    requested: ImageGenerationAspectRatio;
    providerValue: ImageGenerationCapabilityAspectRatio;
    mapped: boolean;
  };
};

export type ImageGenerationNodeProviderRequest = {
  provider: Pick<
    ImageGenerationModelCapability["provider"],
    "providerId" | "label" | "secretEnvName"
  >;
  model: ImageGenerationModelCapability["model"];
  schemaAdapter: ImageGenerationSchemaAdapter;
  validation: ImageGenerationNodeValidationResult;
  replicate: ImageGenerationReplicatePredictionRequest;
};

export type ImageGenerationDocsPanelControlSummary = {
  id: string;
  label: string;
  schemaKey: string;
  kind: ImageGenerationInputControlKind;
  required: boolean;
  visibility: ImageGenerationInputControl["visibility"];
  defaultValue: ImageGenerationInputControlDefaultValue;
  options: readonly string[];
};

export type ImageGenerationCredentialStatus = {
  state: "configured" | "missing" | "error" | "disabled";
  label: string;
  envName: string | null;
  message: string;
};

export type ImageGenerationProviderCredentialStatus = Pick<
  ImageGenerationCredentialStatus,
  "state"
> & {
  message?: string;
};

export type ImageGenerationDocsPanelMetadata = {
  provider: {
    providerId: ImageGenerationProviderId;
    name: string;
    credentialEnvName: string | null;
    credentialStatus: ImageGenerationCredentialStatus;
  };
  selectedModel: {
    slug: string;
    name: string;
  };
  supportedRatios: readonly ImageGenerationCapabilityAspectRatio[];
  requiredInputs: readonly ImageGenerationDocsPanelControlSummary[];
  optionalControls: readonly ImageGenerationDocsPanelControlSummary[];
  compatibilityWarnings: readonly string[];
};

type ImageGenerationModelCapabilityDefinition = Omit<
  ImageGenerationModelCapability,
  "controlMetadata" | "referenceAttachment"
>;

export type ImageGenerationProviderCapabilityRegistryProvider = Pick<
  ImageGenerationProviderPreset,
  "providerId" | "label" | "secretEnvName"
> & {
  modelSlugs: string[];
};

export type ImageGenerationProviderCapabilityRegistry = {
  version: "owncanvas.image-generation.capability-registry.v1";
  defaultModel: {
    providerId: ImageGenerationProviderId;
    modelSlug: string;
  };
  providers: ImageGenerationProviderCapabilityRegistryProvider[];
  modelsByKey: Record<ImageGenerationModelCapabilityKey, ImageGenerationModelCapability>;
};

export type ImageGenerationStorageContract = {
  canvasJsonPath: "canvas.json";
  assetDirectory: "assets/";
  runHistory: "runs/" | "history.jsonl";
  secretPolicy: "env-or-local-secret-store-only";
};

export type ImageGenerationAspectRatio = "16:9" | "9:16" | "1:1";

export const imageGenerationAspectRatioOptions = [
  "9:16",
  "1:1",
  "16:9",
] as const satisfies readonly ImageGenerationAspectRatio[];

export type ImageGenerationFrameSource = "aspect-ratio" | "user-resize";

// Manual resize policy: automatic aspect-ratio frame sync writes canonical
// frames only while the current frame still comes from ratio automation. Once a
// user resize writes `frame.source = "user-resize"`, later aspect-ratio updates
// keep the manual frame until an explicit reset transition is requested.
export type ImageGenerationFrame = {
  width: number;
  height: number;
  resizeMode: "locked-aspect-ratio";
  source: ImageGenerationFrameSource;
};

export const IMAGE_GENERATION_DEFAULT_ASPECT_RATIO =
  "9:16" as const satisfies ImageGenerationAspectRatio;

export const IMAGE_GENERATION_DEFAULT_FRAME = {
  width: 360,
  height: 640,
  resizeMode: "locked-aspect-ratio",
  source: "aspect-ratio",
} as const satisfies ImageGenerationFrame;

export const IMAGE_GENERATION_COMPACT_FRAME_LIMITS = {
  minWidth: 320,
  minHeight: 260,
  maxWidth: 640,
  maxHeight: 640,
} as const;

export const IMAGE_GENERATION_REFERENCE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const imageGenerationReferenceUploadAcceptedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

const imageGenerationReferenceAcceptedFileExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
] as const;

export type ImageGenerationNodeUiState = {
  viewMode: "compact" | "focused";
  inspectorOpen: boolean;
  docsPanelOpen: boolean;
  referenceTrayOpen: boolean;
  status: ImageGenerationNodeUiStatus;
  progressPercent: number | null;
  statusMessage: string | null;
  errorReason: string | null;
  failureDetails: ImageGenerationNodeFailureDetails | null;
  selectedResultAssetId: string | null;
  outputConnectionReady: boolean;
};

export type ImageGenerationNodeFailureDetails = {
  name: string;
  category?: string;
  message: string;
  providerId: ImageGenerationProviderId | null;
  modelSlug: string | null;
  providerRequestId: string | null;
  retryable: boolean | null;
};

export type ImageGenerationNodeStatusView = {
  status: ImageGenerationNodeUiStatus;
  label: string;
  className: ImageGenerationNodeUiStatus;
  ariaLabel: string;
};

export type ImageGenerationNodeOutputState =
  | "success"
  | "error"
  | "cancelled"
  | "empty-output";

export type ImageGenerationNodeOutputView = {
  state: ImageGenerationNodeOutputState;
  label: string;
  className: ImageGenerationNodeOutputState;
  ariaLabel: string;
};

export type ImageGenerationNodeProperties = {
  nodeType: typeof IMAGE_GENERATION_NODE_TYPE;
  providerAgnostic: true;
  providerId: ImageGenerationProviderPreset["providerId"];
  modelSlug: string;
  prompt: string;
  batchCount: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  aspectRatio: ImageGenerationAspectRatio;
  frame: ImageGenerationFrame;
  referenceImages: ImageGenerationNodeReferenceInput[];
  inputs: ImageGenerationNodePort[];
  outputs: ImageGenerationNodePort[];
  providerPresets: ImageGenerationProviderPreset[];
  storage: ImageGenerationStorageContract;
  latestResultRefs: {
    generatedAssetIds: string[];
    metadataRunId: string | null;
    costUsageRunId: string | null;
  };
  uiState: ImageGenerationNodeUiState;
};

export type ImageGenerationNodeResultRefs =
  ImageGenerationNodeProperties["latestResultRefs"];

export const imageGenerationInputPorts = [
  {
    id: "prompt",
    label: "Prompt",
    dataType: "text",
    required: true,
    description: "Primary prompt text from a Text Block or inline edit.",
  },
  {
    id: "reference_image",
    label: "Reference image",
    dataType: "asset",
    required: false,
    description: "Optional uploaded or linked campaign asset used as image reference.",
  },
  {
    id: "style_template_vars",
    label: "Style / template vars",
    dataType: "json",
    required: false,
    description: "Optional style preset and prompt variables kept in the JSON spec.",
  },
] as const satisfies readonly ImageGenerationNodePort[];

export const imageGenerationOutputPorts = [
  {
    id: "generated_image_asset",
    label: "Generated image asset",
    dataType: "asset",
    required: true,
    description: "Generated still-image asset references stored under assets/.",
  },
  {
    id: "metadata",
    label: "Metadata",
    dataType: "json",
    required: true,
    description: "Provider response, model, dimensions, prompt hash, and run id.",
  },
  {
    id: "cost_usage",
    label: "Cost / usage",
    dataType: "currency",
    required: false,
    description: "Provider-side cost and usage counters when available.",
  },
] as const satisfies readonly ImageGenerationNodePort[];

export const imageGenerationProviderPresets = [
  {
    providerId: "openai-image",
    label: "OpenAI Image",
    capabilityId: "image.generate",
    modelHint: "gpt-image / ChatGPT Image provider family",
    secretEnvName: "OWNCANVAS_OPENAI_API_KEY",
    notes: "Use an environment variable or local secret store; never persist the key in canvas.json.",
  },
  {
    providerId: "replicate",
    label: "Replicate model service",
    capabilityId: "image.generate",
    modelHint: "Serves selected image model slugs such as google/nano-banana",
    secretEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
    notes:
      "Execution service only; the user-facing generation choice is the selected image model.",
  },
  {
    providerId: "freepik-compatible",
    label: "Freepik-style",
    capabilityId: "image.generate",
    modelHint: "Prompt + reference + style + batch image generation UX",
    secretEnvName: "OWNCANVAS_FREEPIK_API_KEY",
    notes: "UI/port contract mirrors a Freepik-style image node while staying provider-agnostic.",
  },
] as const satisfies readonly ImageGenerationProviderPreset[];

function createImageGenerationModelControlMetadata(
  inputControls: ImageGenerationInputControl[],
  supportedAspectRatios: ImageGenerationCapabilityAspectRatio[],
): ImageGenerationModelControlMetadata {
  const supportedControls = Array.from(
    new Set(inputControls.map((control) => control.kind)),
  );
  const defaultValues: Record<string, ImageGenerationInputControlDefaultValue> = {};
  const validationConstraints: Record<
    string,
    ImageGenerationInputControlValidationConstraints
  > = {};
  const aspectRatioControl = inputControls.find(
    (control) => control.kind === "aspect_ratio",
  );

  for (const control of inputControls) {
    defaultValues[control.id] = control.defaultValue;
    validationConstraints[control.id] = control.validationConstraints;
  }

  return {
    supportedControls,
    defaultValues,
    aspectRatioOptions:
      aspectRatioControl?.options?.filter(
        (option): option is ImageGenerationCapabilityAspectRatio =>
          supportedAspectRatios.includes(
            option as ImageGenerationCapabilityAspectRatio,
          ),
      ) ?? [],
    validationConstraints,
  };
}

function defineImageGenerationModelCapability(
  definition: ImageGenerationModelCapabilityDefinition,
): ImageGenerationModelCapability {
  return {
    ...definition,
    controlMetadata: createImageGenerationModelControlMetadata(
      definition.inputControls,
      definition.supportedAspectRatios,
    ),
    referenceAttachment:
      createImageGenerationReferenceAttachmentCapabilityMetadata(definition),
  };
}

function createImageGenerationReferenceAttachmentCapabilityMetadata(
  definition: ImageGenerationModelCapabilityDefinition,
): ImageGenerationReferenceAttachmentCapabilityMetadata {
  const referenceImagesBinding =
    definition.replicate?.capabilityBindings.referenceImages;
  const referenceInputMode =
    referenceImagesBinding?.mode ??
    (definition.referenceSupport.supported
      ? definition.capabilities.multiReference
        ? "multi"
        : "single"
      : "none");
  const state: ImageGenerationReferenceAttachmentCapabilityState =
    !definition.referenceSupport.supported || referenceInputMode === "none"
      ? "unsupported"
      : definition.referenceSupport.maxImages > 1 || referenceInputMode === "multi"
        ? "multi-reference"
        : "single-reference";

  return {
    schemaVersion:
      "owncanvas.image-generation.reference-attachment-capability.v1",
    providerId: definition.provider.providerId,
    modelSlug: definition.model.slug,
    state,
    supported: state !== "unsupported",
    maxReferenceCount: definition.referenceSupport.supported
      ? definition.referenceSupport.maxImages
      : 0,
    inputControlId: definition.referenceSupport.inputControlId,
    schemaKey:
      referenceImagesBinding?.schemaKey ??
      definition.schemaAdapter.referenceImagesField,
    referenceInputMode: state === "unsupported" ? "none" : referenceInputMode,
    acceptedTypes: definition.referenceSupport.acceptedTypes,
    unsupportedReason:
      state === "unsupported"
        ? `${definition.model.label} does not accept reference images.`
        : null,
  };
}

export const imageGenerationModelCapabilities: ImageGenerationModelCapability[] = [
  defineImageGenerationModelCapability({
    provider: {
      providerId: "replicate",
      label: "Replicate model service",
      secretEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
    },
    model: {
      slug: "google/nano-banana",
      label: "Nano Banana",
    },
    schemaAdapter: {
      providerId: "replicate",
      promptField: "prompt",
      referenceImagesField: "reference_images",
      aspectRatioField: "aspect_ratio",
      widthField: null,
      heightField: null,
      sizeField: null,
      seedField: null,
      guidanceField: null,
      qualityField: null,
      outputFormatField: "output_format",
      unsupportedRatioBehavior: "disable",
    },
    replicate: {
      providerId: "replicate",
      modelRef: "google/nano-banana",
      inputEnvelopeField: "input",
      credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
      schemaInputKeys: {
        required: ["prompt"],
        optional: ["reference_images", "aspect_ratio", "output_format"],
      },
      referenceInputMode: "multi",
      customSizeKeys: {
        size: null,
        width: null,
        height: null,
      },
      capabilityBindings: {
        prompt: {
          schemaKey: "prompt",
          required: true,
        },
        referenceImages: {
          schemaKey: "reference_images",
          mode: "multi",
        },
        aspectRatio: {
          schemaKey: "aspect_ratio",
          mode: "enum",
        },
        size: {
          schemaKey: null,
          mode: "none",
        },
        seed: {
          schemaKey: null,
          supported: false,
        },
        guidance: {
          schemaKey: null,
          supported: false,
        },
        quality: {
          schemaKey: null,
          supported: false,
        },
        outputFormat: {
          schemaKey: "output_format",
          supported: true,
        },
      },
    },
    capabilities: {
      textToImage: true,
      imageToImage: true,
      multiReference: true,
      inpainting: false,
      maskInput: false,
      seedControl: false,
      aspectRatioControl: true,
      customSize: false,
      qualityControl: false,
      outputFormatControl: true,
    },
    supportedAspectRatios: [
      "match_input_image",
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9",
    ],
    defaultAspectRatio: "9:16",
    referenceSupport: {
      supported: true,
      maxImages: 8,
      inputControlId: "reference_images",
      acceptedTypes: ["asset", "url", "recent_output"],
    },
    inputControls: [
      {
        id: "prompt",
        schemaKey: "prompt",
        kind: "prompt",
        required: true,
        visibility: "compact",
        defaultValue: "",
        validationConstraints: {
          minLength: 1,
          maxLength: 4000,
        },
      },
      {
        id: "reference_images",
        schemaKey: "reference_images",
        kind: "reference_images",
        required: false,
        visibility: "compact",
        defaultValue: [],
        validationConstraints: {
          minItems: 0,
          maxItems: 8,
          acceptedTypes: ["asset", "url", "recent_output"],
        },
      },
      {
        id: "aspect_ratio",
        schemaKey: "aspect_ratio",
        kind: "aspect_ratio",
        required: false,
        visibility: "inspector",
        defaultValue: "9:16",
        options: [
          "match_input_image",
          "1:1",
          "2:3",
          "3:2",
          "3:4",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9",
          "21:9",
        ],
        validationConstraints: {
          options: [
            "match_input_image",
            "1:1",
            "2:3",
            "3:2",
            "3:4",
            "4:3",
            "4:5",
            "5:4",
            "9:16",
            "16:9",
            "21:9",
          ],
        },
      },
      {
        id: "output_format",
        schemaKey: "output_format",
        kind: "output_format",
        required: false,
        visibility: "inspector",
        defaultValue: "jpg",
        options: ["jpg", "png", "webp"],
        validationConstraints: {
          options: ["jpg", "png", "webp"],
        },
      },
    ],
    outputConstraints: {
      formats: ["jpg", "png", "webp"],
      maxOutputs: 1,
      defaultFormat: "jpg",
    },
  }),
  defineImageGenerationModelCapability({
    provider: {
      providerId: "replicate",
      label: "Replicate model service",
      secretEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
    },
    model: {
      slug: "openai/gpt-image-1",
      label: "GPT Image",
    },
    schemaAdapter: {
      providerId: "replicate",
      promptField: "prompt",
      referenceImagesField: "input_images",
      aspectRatioField: "aspect_ratio",
      widthField: null,
      heightField: null,
      sizeField: null,
      seedField: null,
      guidanceField: null,
      qualityField: "quality",
      outputFormatField: "output_format",
      unsupportedRatioBehavior: "map_nearest",
    },
    replicate: {
      providerId: "replicate",
      modelRef: "openai/gpt-image-1",
      inputEnvelopeField: "input",
      credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
      schemaInputKeys: {
        required: ["prompt"],
        optional: ["input_images", "aspect_ratio", "quality", "output_format"],
      },
      referenceInputMode: "single",
      customSizeKeys: {
        size: null,
        width: null,
        height: null,
      },
      capabilityBindings: {
        prompt: {
          schemaKey: "prompt",
          required: true,
        },
        referenceImages: {
          schemaKey: "input_images",
          mode: "single",
        },
        aspectRatio: {
          schemaKey: "aspect_ratio",
          mode: "enum",
        },
        size: {
          schemaKey: null,
          mode: "none",
        },
        seed: {
          schemaKey: null,
          supported: false,
        },
        guidance: {
          schemaKey: null,
          supported: false,
        },
        quality: {
          schemaKey: "quality",
          supported: true,
        },
        outputFormat: {
          schemaKey: "output_format",
          supported: true,
        },
      },
    },
    capabilities: {
      textToImage: true,
      imageToImage: true,
      multiReference: false,
      inpainting: false,
      maskInput: false,
      seedControl: false,
      aspectRatioControl: true,
      customSize: false,
      qualityControl: true,
      outputFormatControl: true,
    },
    supportedAspectRatios: ["1:1", "2:3", "3:2"],
    defaultAspectRatio: "2:3",
    referenceSupport: {
      supported: true,
      maxImages: 1,
      inputControlId: "input_images",
      acceptedTypes: ["asset", "url", "recent_output"],
    },
    inputControls: [
      {
        id: "prompt",
        schemaKey: "prompt",
        kind: "prompt",
        required: true,
        visibility: "compact",
        defaultValue: "",
        validationConstraints: {
          minLength: 1,
          maxLength: 4000,
        },
      },
      {
        id: "input_images",
        schemaKey: "input_images",
        kind: "reference_images",
        required: false,
        visibility: "compact",
        defaultValue: [],
        validationConstraints: {
          minItems: 0,
          maxItems: 1,
          acceptedTypes: ["asset", "url", "recent_output"],
        },
      },
      {
        id: "aspect_ratio",
        schemaKey: "aspect_ratio",
        kind: "aspect_ratio",
        required: false,
        visibility: "inspector",
        defaultValue: "2:3",
        options: ["1:1", "2:3", "3:2"],
        validationConstraints: {
          options: ["1:1", "2:3", "3:2"],
        },
      },
      {
        id: "quality",
        schemaKey: "quality",
        kind: "quality",
        required: false,
        visibility: "inspector",
        defaultValue: "auto",
        options: ["auto", "low", "medium", "high"],
        validationConstraints: {
          options: ["auto", "low", "medium", "high"],
        },
      },
      {
        id: "output_format",
        schemaKey: "output_format",
        kind: "output_format",
        required: false,
        visibility: "inspector",
        defaultValue: "png",
        options: ["png", "webp"],
        validationConstraints: {
          options: ["png", "webp"],
        },
      },
    ],
    outputConstraints: {
      formats: ["png", "webp"],
      maxOutputs: 1,
      defaultFormat: "png",
      unsupportedDefaultRatioBehavior: "map_nearest",
    },
  }),
  defineImageGenerationModelCapability({
    provider: {
      providerId: "replicate",
      label: "Replicate model service",
      secretEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
    },
    model: {
      slug: "bytedance/seedream-3",
      label: "Seedream 3",
    },
    schemaAdapter: {
      providerId: "replicate",
      promptField: "prompt",
      referenceImagesField: null,
      aspectRatioField: "aspect_ratio",
      widthField: null,
      heightField: null,
      sizeField: "size",
      seedField: "seed",
      guidanceField: "guidance_scale",
      qualityField: null,
      outputFormatField: null,
      unsupportedRatioBehavior: "disable",
    },
    replicate: {
      providerId: "replicate",
      modelRef: "bytedance/seedream-3",
      inputEnvelopeField: "input",
      credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
      schemaInputKeys: {
        required: ["prompt"],
        optional: ["aspect_ratio", "size", "guidance_scale", "seed"],
      },
      referenceInputMode: "none",
      customSizeKeys: {
        size: "size",
        width: null,
        height: null,
      },
      capabilityBindings: {
        prompt: {
          schemaKey: "prompt",
          required: true,
        },
        referenceImages: {
          schemaKey: null,
          mode: "none",
        },
        aspectRatio: {
          schemaKey: "aspect_ratio",
          mode: "enum_or_custom",
        },
        size: {
          schemaKey: "size",
          mode: "size",
        },
        seed: {
          schemaKey: "seed",
          supported: true,
        },
        guidance: {
          schemaKey: "guidance_scale",
          supported: true,
        },
        quality: {
          schemaKey: null,
          supported: false,
        },
        outputFormat: {
          schemaKey: null,
          supported: false,
        },
      },
    },
    capabilities: {
      textToImage: true,
      imageToImage: false,
      multiReference: false,
      inpainting: false,
      maskInput: false,
      seedControl: true,
      aspectRatioControl: true,
      customSize: true,
      qualityControl: false,
      outputFormatControl: false,
    },
    supportedAspectRatios: [
      "1:1",
      "3:4",
      "4:3",
      "16:9",
      "9:16",
      "2:3",
      "3:2",
      "21:9",
      "custom",
    ],
    defaultAspectRatio: "9:16",
    referenceSupport: {
      supported: false,
      maxImages: 0,
      inputControlId: null,
      acceptedTypes: [],
    },
    inputControls: [
      {
        id: "prompt",
        schemaKey: "prompt",
        kind: "prompt",
        required: true,
        visibility: "compact",
        defaultValue: "",
        validationConstraints: {
          minLength: 1,
          maxLength: 4000,
        },
      },
      {
        id: "aspect_ratio",
        schemaKey: "aspect_ratio",
        kind: "aspect_ratio",
        required: false,
        visibility: "inspector",
        defaultValue: "9:16",
        options: [
          "1:1",
          "3:4",
          "4:3",
          "16:9",
          "9:16",
          "2:3",
          "3:2",
          "21:9",
          "custom",
        ],
        validationConstraints: {
          options: [
            "1:1",
            "3:4",
            "4:3",
            "16:9",
            "9:16",
            "2:3",
            "3:2",
            "21:9",
            "custom",
          ],
        },
      },
      {
        id: "size",
        schemaKey: "size",
        kind: "size",
        required: false,
        visibility: "inspector",
        defaultValue: "regular",
        options: ["small", "regular", "big"],
        validationConstraints: {
          options: ["small", "regular", "big"],
        },
      },
      {
        id: "guidance_scale",
        schemaKey: "guidance_scale",
        kind: "guidance",
        required: false,
        visibility: "inspector",
        defaultValue: 2.5,
        validationConstraints: {
          min: 1,
          max: 10,
        },
      },
      {
        id: "seed",
        schemaKey: "seed",
        kind: "seed",
        required: false,
        visibility: "inspector",
        defaultValue: null,
        validationConstraints: {
          min: 0,
          max: 2147483647,
          integer: true,
        },
      },
    ],
    outputConstraints: {
      formats: ["jpg"],
      maxOutputs: 1,
      defaultFormat: "jpg",
    },
  }),
];

export function createImageGenerationModelCapabilityKey(input: {
  providerId: ImageGenerationProviderId;
  modelSlug: string;
}): ImageGenerationModelCapabilityKey {
  return `${input.providerId}:${input.modelSlug}`;
}

export const imageGenerationAspectRatioCompatibilityMapping: ImageGenerationAspectRatioCompatibilityMapping = {
  "replicate:openai/gpt-image-1": [
    {
      providerId: "replicate",
      modelSlug: "openai/gpt-image-1",
      requestedAspectRatio: "9:16",
      providerAspectRatio: "2:3",
      behavior: "map_nearest",
      message: "9:16 is not native to GPT Image.",
      guidance:
        "Map this request to the nearest model-supported aspect ratio before sending it to the provider.",
    },
    {
      providerId: "replicate",
      modelSlug: "openai/gpt-image-1",
      requestedAspectRatio: "16:9",
      providerAspectRatio: "3:2",
      behavior: "map_nearest",
      message: "16:9 is not native to GPT Image.",
      guidance:
        "Map this request to the nearest model-supported aspect ratio before sending it to the provider.",
    },
  ],
};

function parseNumericImageGenerationAspectRatio(
  aspectRatio: ImageGenerationCapabilityAspectRatio,
): number | null {
  const [width, height, extra] = aspectRatio.split(":");

  if (extra !== undefined || width === undefined || height === undefined) {
    return null;
  }

  const numericWidth = Number(width);
  const numericHeight = Number(height);

  if (
    !Number.isFinite(numericWidth) ||
    !Number.isFinite(numericHeight) ||
    numericWidth <= 0 ||
    numericHeight <= 0
  ) {
    return null;
  }

  return numericWidth / numericHeight;
}

function resolveNearestSupportedImageGenerationAspectRatio(
  capability: Pick<
    ImageGenerationModelCapability,
    "defaultAspectRatio" | "supportedAspectRatios"
  >,
  requestedAspectRatio: ImageGenerationCapabilityAspectRatio,
): ImageGenerationCapabilityAspectRatio {
  const requestedNumericRatio =
    parseNumericImageGenerationAspectRatio(requestedAspectRatio);

  if (requestedNumericRatio === null) {
    return capability.defaultAspectRatio;
  }

  let nearestRatio: ImageGenerationCapabilityAspectRatio =
    capability.defaultAspectRatio;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const supportedAspectRatio of capability.supportedAspectRatios) {
    const supportedNumericRatio =
      parseNumericImageGenerationAspectRatio(supportedAspectRatio);

    if (supportedNumericRatio === null) {
      continue;
    }

    const distance = Math.abs(supportedNumericRatio - requestedNumericRatio);

    if (distance < nearestDistance) {
      nearestRatio = supportedAspectRatio;
      nearestDistance = distance;
    }
  }

  return nearestRatio;
}

export function resolveImageGenerationAspectRatioCompatibilityRule(
  capability: Pick<
    ImageGenerationModelCapability,
    "provider" | "model" | "defaultAspectRatio" | "supportedAspectRatios" | "schemaAdapter"
  >,
  requestedAspectRatio: ImageGenerationCapabilityAspectRatio,
): ImageGenerationAspectRatioCompatibilityRule {
  const modelKey = createImageGenerationModelCapabilityKey({
    providerId: capability.provider.providerId,
    modelSlug: capability.model.slug,
  });
  const configuredRule = imageGenerationAspectRatioCompatibilityMapping[
    modelKey
  ]?.find((rule) => rule.requestedAspectRatio === requestedAspectRatio);

  if (configuredRule) {
    return configuredRule;
  }

  if (capability.supportedAspectRatios.includes(requestedAspectRatio)) {
    return {
      providerId: capability.provider.providerId,
      modelSlug: capability.model.slug,
      requestedAspectRatio,
      providerAspectRatio: requestedAspectRatio,
      behavior: "native",
      message: `${requestedAspectRatio} is native to ${capability.model.label}.`,
      guidance: "Send the selected aspect ratio to the provider unchanged.",
    };
  }

  const canMapUnsupportedRatio =
    capability.schemaAdapter.unsupportedRatioBehavior === "map_nearest";
  const providerAspectRatio = canMapUnsupportedRatio
    ? resolveNearestSupportedImageGenerationAspectRatio(
        capability,
        requestedAspectRatio,
      )
    : requestedAspectRatio;

  return {
    providerId: capability.provider.providerId,
    modelSlug: capability.model.slug,
    requestedAspectRatio,
    providerAspectRatio,
    behavior: capability.schemaAdapter.unsupportedRatioBehavior,
    message: canMapUnsupportedRatio
      ? `${requestedAspectRatio} is not native to ${capability.model.label}.`
      : `${requestedAspectRatio} is not supported by ${capability.model.label}.`,
    guidance: canMapUnsupportedRatio
      ? "Map this request to the nearest model-supported aspect ratio before sending it to the provider."
      : "Pick a supported aspect ratio or change image model.",
  };
}

export function resolveImageGenerationAspectRatioSelectorOptions(
  capability:
    | Pick<
        ImageGenerationModelCapability,
        | "provider"
        | "model"
        | "defaultAspectRatio"
        | "supportedAspectRatios"
        | "schemaAdapter"
      >
    | undefined,
  aspectRatioOptions: readonly ImageGenerationAspectRatio[] =
    imageGenerationAspectRatioOptions,
): ImageGenerationAspectRatioSelectorOption[] {
  if (!capability) {
    return aspectRatioOptions.map((aspectRatio) => ({
      aspectRatio,
      providerAspectRatio: aspectRatio,
      label: aspectRatio,
      availability: "native",
      disabled: false,
      compatibilityMessage: null,
      guidance: null,
    }));
  }

  return aspectRatioOptions.map((aspectRatio) => {
    const compatibilityRule = resolveImageGenerationAspectRatioCompatibilityRule(
      capability,
      aspectRatio,
    );
    const availability =
      compatibilityRule.behavior === "native"
        ? "native"
        : compatibilityRule.behavior === "map_nearest"
          ? "mapped"
          : "disabled";
    const disabled = availability === "disabled";
    const mappedLabel =
      compatibilityRule.providerAspectRatio === aspectRatio
        ? aspectRatio
        : `${aspectRatio} -> ${compatibilityRule.providerAspectRatio}`;

    return {
      aspectRatio,
      providerAspectRatio: compatibilityRule.providerAspectRatio,
      label: availability === "mapped" ? mappedLabel : aspectRatio,
      availability,
      disabled,
      compatibilityMessage:
        availability === "native" ? null : compatibilityRule.message,
      guidance: availability === "native" ? null : compatibilityRule.guidance,
    };
  });
}

function createImageGenerationProviderCapabilityRegistry(
  modelCapabilities: ImageGenerationModelCapability[],
): ImageGenerationProviderCapabilityRegistry {
  const providersById = new Map<
    ImageGenerationProviderId,
    ImageGenerationProviderCapabilityRegistryProvider
  >();
  const modelsByKey: Record<
    ImageGenerationModelCapabilityKey,
    ImageGenerationModelCapability
  > = {};

  for (const modelCapability of modelCapabilities) {
    const key = createImageGenerationModelCapabilityKey({
      providerId: modelCapability.provider.providerId,
      modelSlug: modelCapability.model.slug,
    });

    modelsByKey[key] = modelCapability;

    const existingProvider = providersById.get(modelCapability.provider.providerId);

    if (existingProvider) {
      existingProvider.modelSlugs.push(modelCapability.model.slug);
      continue;
    }

    providersById.set(modelCapability.provider.providerId, {
      ...modelCapability.provider,
      modelSlugs: [modelCapability.model.slug],
    });
  }

  return {
    version: "owncanvas.image-generation.capability-registry.v1",
    defaultModel: {
      providerId: "replicate",
      modelSlug: "google/nano-banana",
    },
    providers: Array.from(providersById.values()),
    modelsByKey,
  };
}

export const imageGenerationProviderCapabilityRegistry =
  createImageGenerationProviderCapabilityRegistry(imageGenerationModelCapabilities);

export function getImageGenerationModelCapability(input: {
  providerId: ImageGenerationProviderId;
  modelSlug: string;
}): ImageGenerationModelCapability | undefined {
  return imageGenerationProviderCapabilityRegistry.modelsByKey[
    createImageGenerationModelCapabilityKey(input)
  ];
}

export function getDefaultImageGenerationModelCapability():
  | ImageGenerationModelCapability
  | undefined {
  return getImageGenerationModelCapability(
    imageGenerationProviderCapabilityRegistry.defaultModel,
  );
}

export function listImageGenerationModelCapabilities(
  input: { providerId?: ImageGenerationProviderId } = {},
): ImageGenerationModelCapability[] {
  if (!input.providerId) {
    return [...imageGenerationModelCapabilities];
  }

  return imageGenerationModelCapabilities.filter(
    (modelCapability) => modelCapability.provider.providerId === input.providerId,
  );
}

export function resolveImageGenerationNodeModelCapability(
  properties: Pick<ImageGenerationNodeProperties, "providerId" | "modelSlug">,
): ImageGenerationModelCapability | undefined {
  return getImageGenerationModelCapability({
    providerId: properties.providerId,
    modelSlug: properties.modelSlug,
  });
}

export function resolveImageGenerationDocsPanelMetadata(
  properties: Pick<
    ImageGenerationNodeProperties,
    | "providerId"
    | "modelSlug"
    | "providerPresets"
    | "inputs"
    | "aspectRatio"
    | "referenceImages"
  >,
): ImageGenerationDocsPanelMetadata {
  const capability = resolveImageGenerationNodeModelCapability(properties);
  const providerPreset = properties.providerPresets.find(
    (provider) => provider.providerId === properties.providerId,
  );
  const fallbackCredentialEnvName = providerPreset?.secretEnvName ?? null;
  const validation = validateImageGenerationNodeModelOptions(capability, {
    aspectRatio: properties.aspectRatio,
    referenceImages: properties.referenceImages,
  });

  if (!capability) {
    return {
      provider: {
        providerId: properties.providerId,
        name: providerPreset?.label ?? properties.providerId,
        credentialEnvName: fallbackCredentialEnvName,
        credentialStatus: resolveImageGenerationCredentialStatus(
          fallbackCredentialEnvName,
          providerPreset?.credentialStatus,
        ),
      },
      selectedModel: {
        slug: properties.modelSlug,
        name: properties.modelSlug,
      },
      supportedRatios: [],
      requiredInputs: properties.inputs
        .filter((port) => port.required)
        .map((port) => ({
          id: port.id,
          label: port.label,
          schemaKey: port.id,
          kind: port.id === "prompt" ? "prompt" : "reference_images",
          required: true,
          visibility: "compact",
          defaultValue: port.dataType === "json" ? null : "",
          options: [],
        })),
      optionalControls: [],
      compatibilityWarnings: validation.issues.map((issue) => issue.message),
    };
  }

  const compatibilityWarnings = validation.issues.map((issue) => issue.message);

  if (!capability.referenceSupport.supported) {
    compatibilityWarnings.push(
      "Reference attachments are not supported by this model.",
    );
  } else if (
    !capability.capabilities.multiReference &&
    capability.referenceSupport.maxImages === 1
  ) {
    compatibilityWarnings.push("This model accepts one reference image.");
  }

  return {
    provider: {
      providerId: capability.provider.providerId,
      name: capability.provider.label,
      credentialEnvName: capability.provider.secretEnvName,
      credentialStatus: resolveImageGenerationCredentialStatus(
        capability.provider.secretEnvName,
        providerPreset?.credentialStatus,
      ),
    },
    selectedModel: {
      slug: capability.model.slug,
      name: capability.model.label,
    },
    supportedRatios: [...capability.supportedAspectRatios],
    requiredInputs: capability.inputControls
      .filter((control) => control.required)
      .map(createImageGenerationDocsPanelControlSummary),
    optionalControls: capability.inputControls
      .filter((control) => !control.required)
      .map(createImageGenerationDocsPanelControlSummary),
    compatibilityWarnings,
  };
}

function resolveImageGenerationCredentialStatus(
  envName: string | null,
  status?: ImageGenerationProviderCredentialStatus,
): ImageGenerationCredentialStatus {
  if (!envName || status?.state === "disabled") {
    return {
      state: "disabled",
      label: "Credential disabled",
      envName: null,
      message:
        status?.message ?? "Select a provider with a documented environment variable.",
    };
  }

  if (status?.state === "configured") {
    return {
      state: "configured",
      label: "Environment variable configured",
      envName,
      message:
        status.message ?? `Using ${envName} from local environment or secret store.`,
    };
  }

  if (status?.state === "error") {
    return {
      state: "error",
      label: "Credential check error",
      envName,
      message:
        status.message ?? `Could not verify ${envName}; provider requests stay disabled.`,
    };
  }

  return {
    state: "missing",
    label: "Environment variable missing",
    envName,
    message: `Set ${envName} before running provider requests.`,
  };
}

function createImageGenerationDocsPanelControlSummary(
  control: ImageGenerationInputControl,
): ImageGenerationDocsPanelControlSummary {
  return {
    id: control.id,
    label: control.id.replaceAll("_", " "),
    schemaKey: control.schemaKey,
    kind: control.kind,
    required: control.required,
    visibility: control.visibility,
    defaultValue: control.defaultValue,
    options: control.options ?? [],
  };
}

function isImageGenerationCustomSizeControlValue(
  capability: ImageGenerationModelCapability,
  control: ImageGenerationInputControl,
  value: ImageGenerationInputControlDefaultValue,
): boolean {
  return (
    capability.capabilities.customSize &&
    control.kind === "size" &&
    control.schemaKey === capability.schemaAdapter.sizeField &&
    typeof value === "string" &&
    /^\d+x\d+$/.test(value)
  );
}

export function validateImageGenerationNodeModelOptions(
  capability: ImageGenerationModelCapability | undefined,
  options: ImageGenerationNodeModelOptionValues,
): ImageGenerationNodeValidationResult {
  const issues: ImageGenerationNodeValidationIssue[] = [];

  if (!capability) {
    issues.push({
      code: "image_generation.model_capability_missing",
      severity: "error",
      controlId: "model",
      message: "Image model capability metadata is missing.",
      guidance: "Choose a model from the image generation capability registry.",
    });

    return createImageGenerationNodeValidationResult(issues);
  }

  if (
    options.aspectRatio !== undefined &&
    !capability.supportedAspectRatios.includes(options.aspectRatio)
  ) {
    const compatibilityRule =
      resolveImageGenerationAspectRatioCompatibilityRule(
        capability,
        options.aspectRatio,
      );
    const canMapUnsupportedRatio = compatibilityRule.behavior === "map_nearest";

    issues.push({
      code: canMapUnsupportedRatio
        ? "image_generation.aspect_ratio_mapped"
        : "image_generation.aspect_ratio_unsupported",
      severity: canMapUnsupportedRatio ? "warning" : "error",
      controlId: "aspect_ratio",
      message: compatibilityRule.message,
      guidance: compatibilityRule.guidance,
      supportedValues: capability.supportedAspectRatios,
    });
  }

  const controlsById = new Map(
    capability.inputControls.map((control) => [control.id, control]),
  );

  for (const [controlId, value] of Object.entries(options.controlValues ?? {})) {
    const control = controlsById.get(controlId);

    if (!control) {
      issues.push({
        code: "image_generation.control_unsupported",
        severity: "error",
        controlId,
        message: `${controlId} is not supported by ${capability.model.label}.`,
        guidance: "Hide this control for the selected model or switch to a model that supports it.",
        supportedValues: capability.inputControls.map(
          (supportedControl) => supportedControl.id,
        ),
      });
      continue;
    }

    const allowedValues = control.validationConstraints.options ?? control.options;

    if (
      allowedValues &&
      typeof value === "string" &&
      !allowedValues.includes(value) &&
      !isImageGenerationCustomSizeControlValue(capability, control, value)
    ) {
      issues.push({
        code: "image_generation.control_value_invalid",
        severity: "error",
        controlId,
        message: `${value} is not a valid ${control.id} option.`,
        guidance: "Use one of the model-supported option values.",
        supportedValues: allowedValues,
      });
    }
  }

  const referenceImages = options.referenceImages ?? [];

  if (referenceImages.length > 0 && !capability.referenceSupport.supported) {
    issues.push({
      code: "image_generation.reference_unsupported",
      severity: "error",
      controlId: capability.referenceSupport.inputControlId ?? "reference_images",
      message: `${capability.model.label} does not accept reference images.`,
      guidance: "Remove reference attachments or switch to an image-to-image capable model.",
    });
  }

  if (referenceImages.length > capability.referenceSupport.maxImages) {
    issues.push({
      code: "image_generation.reference_count_invalid",
      severity: "error",
      controlId: capability.referenceSupport.inputControlId ?? "reference_images",
      message: `${capability.model.label} accepts at most ${capability.referenceSupport.maxImages} reference image(s).`,
      guidance: "Remove extra references before sending the provider request.",
    });
  }

  for (const referenceImage of referenceImages) {
    if (!capability.referenceSupport.acceptedTypes.includes(referenceImage.type)) {
      issues.push({
        code: "image_generation.reference_type_invalid",
        severity: "error",
        controlId: capability.referenceSupport.inputControlId ?? "reference_images",
        message: `${referenceImage.type} references are not supported by ${capability.model.label}.`,
        guidance: "Attach a reference type accepted by this model capability.",
        supportedValues: capability.referenceSupport.acceptedTypes,
      });
    }
  }

  return createImageGenerationNodeValidationResult(issues);
}

function resolveImageGenerationProviderFrameSizeControl({
  capability,
  properties,
  controlValues,
}: {
  capability: ImageGenerationModelCapability;
  properties: ImageGenerationNodeProperties;
  controlValues: Record<string, ImageGenerationInputControlDefaultValue>;
}): { schemaKey: string; value: string } | null {
  const sizeField = capability.schemaAdapter.sizeField;

  if (!capability.capabilities.customSize || sizeField === null) {
    return null;
  }

  if (properties.frame.source !== "user-resize") {
    return null;
  }

  if (sizeField in controlValues || "size" in controlValues) {
    return null;
  }

  const width = Math.round(properties.frame.width);
  const height = Math.round(properties.frame.height);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    schemaKey: sizeField,
    value: `${width}x${height}`,
  };
}

export function createImageGenerationNodeProviderRequest(
  input: ImageGenerationNodeProviderRequestInput,
): ImageGenerationNodeProviderRequest {
  const capability = resolveImageGenerationNodeModelCapability(input.properties);
  const validation = validateImageGenerationNodeModelOptions(capability, {
    aspectRatio: input.properties.aspectRatio,
    controlValues: input.controlValues,
    referenceImages: input.referenceImages ?? input.properties.referenceImages,
  });

  if (!capability) {
    throw new Error("Image model capability metadata is missing.");
  }

  if (!validation.valid) {
    throw new Error(
      `Cannot create image generation provider request: ${
        validation.issues[0]?.message ?? "invalid model options"
      }`,
    );
  }

  if (!capability.replicate) {
    throw new Error(
      `Provider request assembly is not available for ${capability.provider.providerId}.`,
    );
  }

  const referenceImages = (
    input.referenceImages ?? input.properties.referenceImages
  ).map((referenceImage) => normalizeImageGenerationReferenceInput(referenceImage));
  const compatibilityRule = resolveImageGenerationAspectRatioCompatibilityRule(
    capability,
    input.properties.aspectRatio,
  );
  const replicateInput: Record<string, unknown> = {
    [capability.schemaAdapter.promptField]: input.prompt,
  };

  if (capability.schemaAdapter.aspectRatioField) {
    replicateInput[capability.schemaAdapter.aspectRatioField] =
      compatibilityRule.providerAspectRatio;
  }

  if (
    capability.schemaAdapter.referenceImagesField &&
    referenceImages.length > 0
  ) {
    const refs = referenceImages.map((referenceImage) => referenceImage.ref);
    replicateInput[capability.schemaAdapter.referenceImagesField] =
      capability.replicate.referenceInputMode === "single" ? refs[0] : refs;
  }

  const controlValues = input.controlValues ?? {};
  const providerFrameSizeControl = resolveImageGenerationProviderFrameSizeControl({
    capability,
    properties: input.properties,
    controlValues,
  });

  if (providerFrameSizeControl) {
    replicateInput[providerFrameSizeControl.schemaKey] =
      providerFrameSizeControl.value;
  }

  const skippedSchemaKeys = new Set(
    [
      capability.schemaAdapter.promptField,
      capability.schemaAdapter.aspectRatioField,
      capability.schemaAdapter.referenceImagesField,
    ].filter((schemaKey): schemaKey is string => schemaKey !== null),
  );

  for (const control of capability.inputControls) {
    if (
      skippedSchemaKeys.has(control.schemaKey) ||
      !(control.id in controlValues)
    ) {
      continue;
    }

    replicateInput[control.schemaKey] = controlValues[control.id];
  }

  return {
    provider: {
      providerId: capability.provider.providerId,
      label: capability.provider.label,
      secretEnvName: capability.provider.secretEnvName,
    },
    model: { ...capability.model },
    schemaAdapter: { ...capability.schemaAdapter },
    validation,
    replicate: {
      providerId: capability.replicate.providerId,
      model: capability.replicate.modelRef,
      credentialEnvName: capability.replicate.credentialEnvName,
      inputEnvelopeField: capability.replicate.inputEnvelopeField,
      input: replicateInput,
      aspectRatio: {
        requested: input.properties.aspectRatio,
        providerValue: compatibilityRule.providerAspectRatio,
        mapped: compatibilityRule.behavior === "map_nearest",
      },
    },
  };
}

export function validateImageGenerationReferenceAttachmentDraft(
  draft: ImageGenerationReferenceAttachmentDraft,
  capability: ImageGenerationModelCapability | undefined,
): ImageGenerationReferenceAttachmentValidation {
  if (!capability) {
    return createInvalidReferenceAttachmentValidation(
      "Choose an image model before attaching references.",
    );
  }

  if (!capability.referenceAttachment.supported) {
    return createInvalidReferenceAttachmentValidation(
      capability.referenceAttachment.unsupportedReason ??
        "The selected model does not accept reference images.",
    );
  }

  if (draft.kind === "file") {
    const fileName = draft.fileName.trim();
    const mimeType = draft.mimeType.trim().toLowerCase();

    if (fileName.length === 0) {
      return createInvalidReferenceAttachmentValidation(
        "Choose an image file before attaching it.",
      );
    }

    if (!isAcceptedImageGenerationReferenceFile(fileName, mimeType)) {
      return createInvalidReferenceAttachmentValidation(
        "Reference uploads must be PNG, JPEG, WebP, GIF, or AVIF images.",
      );
    }

    if (draft.sizeBytes <= 0) {
      return createInvalidReferenceAttachmentValidation(
        "Reference uploads cannot be empty.",
      );
    }

    if (draft.sizeBytes > IMAGE_GENERATION_REFERENCE_UPLOAD_MAX_BYTES) {
      return createInvalidReferenceAttachmentValidation(
        "Reference uploads must be 10 MB or smaller.",
      );
    }

    return {
      valid: true,
      message: null,
      referenceInput: {
        id: createImageGenerationReferenceAttachmentId({
          type: "asset",
          ref: `upload:${fileName}`,
        }),
        type: "asset",
        ref: `upload:${fileName}`,
        attachmentMetadata: createImageGenerationReferenceAttachmentMetadata(
          capability,
          {
            source: "upload",
            file: {
              fileName,
              mimeType,
              sizeBytes: draft.sizeBytes,
            },
          },
        ),
      },
    };
  }

  if (draft.kind === "asset") {
    const assetId = draft.assetId.trim();

    if (assetId.length === 0) {
      return createInvalidReferenceAttachmentValidation(
        "Choose a campaign asset before attaching it.",
      );
    }

    return {
      valid: true,
      message: null,
      referenceInput: {
        id: createImageGenerationReferenceAttachmentId({
          type: "asset",
          ref: assetId,
        }),
        type: "asset",
        ref: assetId,
        attachmentMetadata: createImageGenerationReferenceAttachmentMetadata(
          capability,
          {
            source: "asset",
            asset: {
              assetId,
              title: normalizeOptionalReferenceMetadataText(draft.title),
              mediaType: normalizeOptionalReferenceMetadataText(draft.mediaType),
            },
          },
        ),
      },
    };
  }

  if (draft.kind === "recent_output") {
    const assetId = draft.assetId.trim();

    if (assetId.length === 0) {
      return createInvalidReferenceAttachmentValidation(
        "Choose a recent generated output before attaching it.",
      );
    }

    return {
      valid: true,
      message: null,
      referenceInput: {
        id: createImageGenerationReferenceAttachmentId({
          type: "recent_output",
          ref: assetId,
        }),
        type: "recent_output",
        ref: assetId,
        attachmentMetadata: createImageGenerationReferenceAttachmentMetadata(
          capability,
          {
            source: "recent_output",
            recentOutput: {
              assetId,
              sourceNodeId: normalizeOptionalReferenceMetadataText(
                draft.sourceNodeId,
              ),
              outputPortId: normalizeOptionalReferenceMetadataText(
                draft.outputPortId,
              ),
            },
          },
        ),
      },
    };
  }

  const trimmedUrl = draft.url.trim();

  if (trimmedUrl.length === 0) {
    return createInvalidReferenceAttachmentValidation(
      "Paste an image URL before attaching it.",
    );
  }

  try {
    const url = new URL(trimmedUrl);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return createInvalidReferenceAttachmentValidation(
        "Reference URLs must start with https:// or http://.",
      );
    }

    if (url.username !== "" || url.password !== "") {
      return createInvalidReferenceAttachmentValidation(
        "Reference URLs cannot include embedded credentials.",
      );
    }

    if (!hasAcceptedImageGenerationReferenceExtension(url.pathname)) {
      return createInvalidReferenceAttachmentValidation(
        "Reference URLs must point to a PNG, JPEG, WebP, GIF, or AVIF image.",
      );
    }

    return {
      valid: true,
      message: null,
      referenceInput: {
        id: createImageGenerationReferenceAttachmentId({
          type: "url",
          ref: url.toString(),
        }),
        type: "url",
        ref: url.toString(),
        attachmentMetadata: createImageGenerationReferenceAttachmentMetadata(
          capability,
          {
            source: "url",
            url: {
              href: url.toString(),
              origin: url.origin,
              pathname: url.pathname,
            },
          },
        ),
      },
    };
  } catch {
    return createInvalidReferenceAttachmentValidation(
      "Enter a valid image URL.",
    );
  }
}

function createImageGenerationReferenceAttachmentMetadata(
  capability: ImageGenerationModelCapability,
  metadata:
    | {
        source: "upload";
        file: NonNullable<ImageGenerationReferenceAttachmentMetadata["file"]>;
      }
    | {
        source: "url";
        url: NonNullable<ImageGenerationReferenceAttachmentMetadata["url"]>;
      }
    | {
        source: "asset";
        asset: NonNullable<ImageGenerationReferenceAttachmentMetadata["asset"]>;
      }
    | {
        source: "recent_output";
        recentOutput: NonNullable<
          ImageGenerationReferenceAttachmentMetadata["recentOutput"]
        >;
      },
): ImageGenerationReferenceAttachmentMetadata {
  const referenceImagesBinding =
    capability.replicate?.capabilityBindings.referenceImages;

  return {
    schemaVersion: "owncanvas.image-generation.reference-attachment.v1",
    source: metadata.source,
    providerBinding: {
      providerId: capability.provider.providerId,
      modelSlug: capability.model.slug,
      credentialEnvName: capability.provider.secretEnvName,
      inputControlId: capability.referenceSupport.inputControlId,
      schemaKey:
        referenceImagesBinding?.schemaKey ??
        capability.schemaAdapter.referenceImagesField,
      referenceInputMode:
        referenceImagesBinding?.mode ??
        (capability.capabilities.multiReference ? "multi" : "single"),
      maxImages: capability.referenceSupport.maxImages,
      acceptedTypes: capability.referenceSupport.acceptedTypes,
    },
    ...(metadata.source === "upload" ? { file: metadata.file } : {}),
    ...(metadata.source === "url" ? { url: metadata.url } : {}),
    ...(metadata.source === "asset" ? { asset: metadata.asset } : {}),
    ...(metadata.source === "recent_output"
      ? { recentOutput: metadata.recentOutput }
      : {}),
  };
}

function cloneImageGenerationReferenceAttachmentMetadata(
  metadata: ImageGenerationReferenceAttachmentMetadata,
): ImageGenerationReferenceAttachmentMetadata {
  return {
    schemaVersion: metadata.schemaVersion,
    source: metadata.source,
    providerBinding: {
      ...metadata.providerBinding,
      acceptedTypes: [...metadata.providerBinding.acceptedTypes],
    },
    ...(metadata.file === undefined ? {} : { file: { ...metadata.file } }),
    ...(metadata.url === undefined ? {} : { url: { ...metadata.url } }),
    ...(metadata.asset === undefined ? {} : { asset: { ...metadata.asset } }),
    ...(metadata.recentOutput === undefined
      ? {}
      : { recentOutput: { ...metadata.recentOutput } }),
  };
}

function normalizeOptionalReferenceMetadataText(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isAcceptedImageGenerationReferenceFile(
  fileName: string,
  mimeType: string,
): boolean {
  if (
    imageGenerationReferenceUploadAcceptedMimeTypes.includes(
      mimeType as (typeof imageGenerationReferenceUploadAcceptedMimeTypes)[number],
    )
  ) {
    return true;
  }

  return mimeType === "" && hasAcceptedImageGenerationReferenceExtension(fileName);
}

function hasAcceptedImageGenerationReferenceExtension(path: string): boolean {
  const lowerPath = path.toLowerCase();

  return imageGenerationReferenceAcceptedFileExtensions.some((extension) =>
    lowerPath.endsWith(extension),
  );
}

function createInvalidReferenceAttachmentValidation(
  message: string,
): ImageGenerationReferenceAttachmentValidation {
  return {
    valid: false,
    message,
    referenceInput: null,
  };
}

export function createImageGenerationReferenceAttachmentId(
  referenceInput: Pick<ImageGenerationNodeReferenceInput, "type" | "ref">,
): string {
  const identity = `${referenceInput.type}:${referenceInput.ref}`;
  let hash = 2166136261;

  for (const character of identity) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return `image-reference-${(hash >>> 0).toString(36)}`;
}

function normalizeImageGenerationReferenceInput(
  referenceInput: ImageGenerationNodeReferenceInput,
): ImageGenerationNodeReferenceInput {
  return {
    ...referenceInput,
    id:
      referenceInput.id ??
      createImageGenerationReferenceAttachmentId(referenceInput),
    ...(referenceInput.attachmentMetadata === undefined
      ? {}
      : {
          attachmentMetadata:
            cloneImageGenerationReferenceAttachmentMetadata(
              referenceInput.attachmentMetadata,
            ),
        }),
  };
}

function createImageGenerationNodeValidationResult(
  issues: ImageGenerationNodeValidationIssue[],
): ImageGenerationNodeValidationResult {
  const hasError = issues.some((issue) => issue.severity === "error");
  const hasWarning = issues.some((issue) => issue.severity === "warning");
  const state: ImageGenerationNodeValidationFeedbackState = hasError
    ? "invalid"
    : hasWarning
      ? "warning"
      : "ready";

  return {
    valid: !hasError,
    issues,
    feedback: {
      state,
      label:
        state === "ready"
          ? "Ready"
          : state === "warning"
            ? "Needs mapping"
            : "Unsupported",
      className: state,
      ariaLabel:
        state === "ready"
          ? "Image generation options are ready"
          : state === "warning"
            ? "Image generation options need provider mapping"
            : "Image generation options include unsupported values",
      message: issues[0]?.message ?? null,
    },
  };
}

export function createImageGenerationNodeProperties(
  input: Partial<
    Pick<
      ImageGenerationNodeProperties,
      | "providerId"
      | "modelSlug"
      | "prompt"
      | "batchCount"
      | "aspectRatio"
      | "frame"
      | "referenceImages"
      | "providerPresets"
      | "latestResultRefs"
      | "uiState"
    >
  > = {},
): ImageGenerationNodeProperties {
  const aspectRatio = input.aspectRatio ?? IMAGE_GENERATION_DEFAULT_ASPECT_RATIO;
  const providerId =
    input.providerId ?? imageGenerationProviderCapabilityRegistry.defaultModel.providerId;
  const modelSlug =
    input.modelSlug ??
    imageGenerationProviderCapabilityRegistry.providers.find(
      (provider) => provider.providerId === providerId,
    )?.modelSlugs[0] ??
    imageGenerationProviderCapabilityRegistry.defaultModel.modelSlug;

  return {
    nodeType: IMAGE_GENERATION_NODE_TYPE,
    providerAgnostic: true,
    providerId,
    modelSlug,
    prompt: input.prompt ?? "",
    batchCount: input.batchCount ?? 1,
    aspectRatio,
    frame: input.frame ?? createImageGenerationFrame(aspectRatio),
    referenceImages: (input.referenceImages ?? []).map((referenceImage) =>
      normalizeImageGenerationReferenceInput(referenceImage),
    ),
    inputs: imageGenerationInputPorts.map((port) => ({ ...port })),
    outputs: imageGenerationOutputPorts.map((port) => ({ ...port })),
    providerPresets: (input.providerPresets ?? imageGenerationProviderPresets).map(
      (preset) => ({ ...preset }),
    ),
    storage: {
      canvasJsonPath: "canvas.json",
      assetDirectory: "assets/",
      runHistory: "runs/",
      secretPolicy: "env-or-local-secret-store-only",
    },
    latestResultRefs: input.latestResultRefs ?? {
      generatedAssetIds: [],
      metadataRunId: null,
      costUsageRunId: null,
    },
    uiState: input.uiState ?? createImageGenerationNodeUiState(),
  };
}

export function attachImageGenerationNodeReferenceTransition(
  properties: ImageGenerationNodeProperties,
  referenceInput: ImageGenerationNodeReferenceInput,
): ImageGenerationNodeProperties {
  const capability = resolveImageGenerationNodeModelCapability(properties);
  const maxImages = capability?.referenceSupport.maxImages ?? 0;
  const normalizedReferenceInput =
    normalizeImageGenerationReferenceInput(referenceInput);
  let existingReferenceMatched = false;
  const updatedReferences = properties.referenceImages.map((referenceImage) => {
    const normalizedReferenceImage =
      normalizeImageGenerationReferenceInput(referenceImage);

    if (
      normalizedReferenceImage.type === normalizedReferenceInput.type &&
      normalizedReferenceImage.ref === normalizedReferenceInput.ref
    ) {
      existingReferenceMatched = true;
      return {
        ...normalizedReferenceInput,
        id: normalizedReferenceImage.id,
      };
    }

    return normalizedReferenceImage;
  });
  const nextReferenceImages =
    existingReferenceMatched
      ? updatedReferences
      : maxImages <= 1
        ? [normalizedReferenceInput]
        : [...updatedReferences, normalizedReferenceInput].slice(-maxImages);
  const validation = validateImageGenerationNodeModelOptions(capability, {
    aspectRatio: properties.aspectRatio,
    referenceImages: nextReferenceImages,
  });

  if (!validation.valid) {
    return properties;
  }

  return {
    ...properties,
    referenceImages: nextReferenceImages.map((referenceImage) =>
      normalizeImageGenerationReferenceInput(referenceImage),
    ),
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      referenceTrayOpen: true,
      statusMessage: "Reference asset attached",
      errorReason: null,
      failureDetails: null,
    }),
  };
}

export function removeImageGenerationNodeReferenceTransition(
  properties: ImageGenerationNodeProperties,
  referenceInput:
    | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
    | Pick<ImageGenerationNodeReferenceInput, "id">,
): ImageGenerationNodeProperties {
  const nextReferenceImages = properties.referenceImages
    .map((referenceImage) => normalizeImageGenerationReferenceInput(referenceImage))
    .filter(
      (referenceImage) =>
        !matchesImageGenerationReferenceInputIdentity(
          referenceImage,
          referenceInput,
        ),
    );

  if (nextReferenceImages.length === properties.referenceImages.length) {
    return properties;
  }

  return {
    ...properties,
    referenceImages: nextReferenceImages.map((referenceImage) =>
      normalizeImageGenerationReferenceInput(referenceImage),
    ),
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      referenceTrayOpen: true,
      statusMessage:
        nextReferenceImages.length === 0
          ? "Reference tray empty"
          : "Reference asset removed",
      errorReason: null,
      failureDetails: null,
    }),
  };
}

export function reorderImageGenerationNodeReferenceTransition(
  properties: ImageGenerationNodeProperties,
  referenceInput:
    | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
    | Pick<ImageGenerationNodeReferenceInput, "id">,
  direction: "up" | "down",
): ImageGenerationNodeProperties {
  const normalizedReferenceImages = properties.referenceImages.map(
    (referenceImage) => normalizeImageGenerationReferenceInput(referenceImage),
  );
  const currentIndex = normalizedReferenceImages.findIndex((referenceImage) =>
    matchesImageGenerationReferenceInputIdentity(referenceImage, referenceInput),
  );

  if (currentIndex === -1) {
    return properties;
  }

  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (nextIndex < 0 || nextIndex >= normalizedReferenceImages.length) {
    return properties;
  }

  const nextReferenceImages = [...normalizedReferenceImages];
  [nextReferenceImages[currentIndex], nextReferenceImages[nextIndex]] = [
    nextReferenceImages[nextIndex],
    nextReferenceImages[currentIndex],
  ];

  return {
    ...properties,
    referenceImages: nextReferenceImages.map((referenceImage) =>
      normalizeImageGenerationReferenceInput(referenceImage),
    ),
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      referenceTrayOpen: true,
      statusMessage: "Reference order updated",
      errorReason: null,
      failureDetails: null,
    }),
  };
}

function matchesImageGenerationReferenceInputIdentity(
  referenceImage: ImageGenerationNodeReferenceInput,
  referenceInput:
    | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
    | Pick<ImageGenerationNodeReferenceInput, "id">,
): boolean {
  if ("id" in referenceInput) {
    return referenceInput.id !== undefined && referenceImage.id === referenceInput.id;
  }

  if ("type" in referenceInput && "ref" in referenceInput) {
    return (
      referenceImage.type === referenceInput.type &&
      referenceImage.ref === referenceInput.ref
    );
  }

  return false;
}

export function listImageGenerationReferenceTrayAttachments(
  properties: Pick<ImageGenerationNodeProperties, "referenceImages"> &
    Partial<Pick<ImageGenerationNodeProperties, "providerId" | "modelSlug">>,
): ImageGenerationReferenceTrayAttachment[] {
  const capability =
    properties.providerId === undefined || properties.modelSlug === undefined
      ? undefined
      : resolveImageGenerationNodeModelCapability({
          providerId: properties.providerId,
          modelSlug: properties.modelSlug,
        });

  return properties.referenceImages.map((referenceImage, index) =>
    createImageGenerationReferenceTrayAttachment(
      referenceImage,
      index,
      properties.referenceImages.length,
      capability,
    ),
  );
}

export function resolveImageGenerationReferenceTrayCapability(
  properties: Pick<
    ImageGenerationNodeProperties,
    "providerId" | "modelSlug" | "referenceImages"
  >,
): ImageGenerationReferenceTrayCapability {
  const capability = resolveImageGenerationNodeModelCapability(properties);
  const attachedReferenceCount = properties.referenceImages.length;

  if (!capability) {
    return {
      providerId: properties.providerId,
      modelSlug: properties.modelSlug,
      state: "unsupported",
      supported: false,
      acceptedTypes: [],
      attachedReferenceCount,
      maxReferenceCount: 0,
      remainingReferenceCount: 0,
      canAddReferences: false,
      addDisabledReason: "Choose an image model before attaching references.",
      canRemoveReferences: attachedReferenceCount > 0,
      removeDisabledReason:
        attachedReferenceCount > 0 ? null : "No reference images are attached.",
    };
  }

  const maxReferenceCount = capability.referenceAttachment.maxReferenceCount;
  const remainingReferenceCount = Math.max(
    0,
    maxReferenceCount - attachedReferenceCount,
  );
  const addDisabledReason =
    !capability.referenceAttachment.supported
      ? capability.referenceAttachment.unsupportedReason ??
        `${capability.model.label} does not accept reference images.`
      : remainingReferenceCount === 0
        ? `${capability.model.label} accepts at most ${maxReferenceCount} reference image(s).`
        : null;

  return {
    providerId: capability.provider.providerId,
    modelSlug: capability.model.slug,
    state: capability.referenceAttachment.state,
    supported: capability.referenceAttachment.supported,
    acceptedTypes: capability.referenceAttachment.acceptedTypes,
    attachedReferenceCount,
    maxReferenceCount,
    remainingReferenceCount,
    canAddReferences: addDisabledReason === null,
    addDisabledReason,
    canRemoveReferences: attachedReferenceCount > 0,
    removeDisabledReason:
      attachedReferenceCount > 0 ? null : "No reference images are attached.",
  };
}

export function resolveImageGenerationReferenceTrayEmptyState(
  properties: Pick<
    ImageGenerationNodeProperties,
    "providerId" | "modelSlug" | "referenceImages"
  >,
): ImageGenerationReferenceTrayEmptyState | null {
  if (properties.referenceImages.length > 0) {
    return null;
  }

  const capability = resolveImageGenerationNodeModelCapability(properties);

  if (capability?.referenceSupport.supported === false) {
    return {
      label: "References unavailable",
      description: "The selected model does not accept reference images.",
      actionLabel: "Change model",
    };
  }

  return {
    label: "No references attached",
    description: "Attach an upload, URL, campaign asset, or recent output.",
    actionLabel: "Add a reference",
  };
}

function createImageGenerationReferenceTrayAttachment(
  referenceImage: ImageGenerationNodeReferenceInput,
  insertionOrder: number,
  attachmentCount: number,
  capability: ImageGenerationModelCapability | undefined,
): ImageGenerationReferenceTrayAttachment {
  const metadata = referenceImage.attachmentMetadata;
  const id =
    normalizeImageGenerationReferenceInput(referenceImage).id ??
    createImageGenerationReferenceAttachmentId(referenceImage);
  const createReorderState = (label: string) => ({
    canMoveUp: insertionOrder > 0,
    canMoveDown: insertionOrder < attachmentCount - 1,
    moveUpAriaLabel: `Move ${label} earlier`,
    moveDownAriaLabel: `Move ${label} later`,
  });
  const validation = resolveImageGenerationReferenceTrayAttachmentValidation({
    referenceImage,
    insertionOrder,
    capability,
  });

  if (metadata?.source === "url" && metadata.url) {
    const label = "URL reference";

    return {
      id,
      insertionOrder,
      type: referenceImage.type,
      ref: referenceImage.ref,
      source: "url",
      label,
      detail: metadata.url.pathname,
      preview: {
        state: "previewable",
        src: metadata.url.href,
        alt: "Reference image URL preview",
      },
      remove: {
        ariaLabel: `Remove ${label}`,
      },
      reorder: createReorderState(label),
      validation,
    };
  }

  if (metadata?.source === "upload" && metadata.file) {
    const label = metadata.file.fileName;

    return {
      id,
      insertionOrder,
      type: referenceImage.type,
      ref: referenceImage.ref,
      source: "upload",
      label,
      detail: `${metadata.file.mimeType || "image"} / ${formatReferenceAttachmentSize(metadata.file.sizeBytes)}`,
      preview: {
        state: "pending-upload",
        src: null,
        alt: `${metadata.file.fileName} upload reference`,
      },
      remove: {
        ariaLabel: `Remove ${label}`,
      },
      reorder: createReorderState(label),
      validation,
    };
  }

  if (metadata?.source === "asset" && metadata.asset) {
    const label = metadata.asset.title ?? metadata.asset.assetId;

    return {
      id,
      insertionOrder,
      type: referenceImage.type,
      ref: referenceImage.ref,
      source: "asset",
      label,
      detail: metadata.asset.mediaType ?? "Campaign asset",
      preview: {
        state: "asset-reference",
        src: null,
        alt: `${label} campaign asset reference`,
      },
      remove: {
        ariaLabel: `Remove ${label}`,
      },
      reorder: createReorderState(label),
      validation,
    };
  }

  if (metadata?.source === "recent_output" && metadata.recentOutput) {
    const label = "Recent output";

    return {
      id,
      insertionOrder,
      type: referenceImage.type,
      ref: referenceImage.ref,
      source: "recent_output",
      label,
      detail: metadata.recentOutput.assetId,
      preview: {
        state: "recent-output",
        src: null,
        alt: `${metadata.recentOutput.assetId} generated output reference`,
      },
      remove: {
        ariaLabel: `Remove ${metadata.recentOutput.assetId}`,
      },
      reorder: createReorderState(label),
      validation,
    };
  }

  const label = referenceImage.ref;

  return {
    id,
    insertionOrder,
    type: referenceImage.type,
    ref: referenceImage.ref,
    source: "unknown",
    label,
    detail: referenceImage.type,
    preview: {
      state:
        referenceImage.type === "url"
          ? "previewable"
          : referenceImage.type === "recent_output"
            ? "recent-output"
            : "asset-reference",
      src: referenceImage.type === "url" ? referenceImage.ref : null,
      alt: `${referenceImage.ref} reference`,
    },
    remove: {
      ariaLabel: `Remove ${referenceImage.ref}`,
    },
    reorder: createReorderState(label),
    validation,
  };
}

function resolveImageGenerationReferenceTrayAttachmentValidation({
  referenceImage,
  insertionOrder,
  capability,
}: {
  referenceImage: ImageGenerationNodeReferenceInput;
  insertionOrder: number;
  capability: ImageGenerationModelCapability | undefined;
}): ImageGenerationReferenceTrayAttachment["validation"] {
  if (!capability) {
    return {
      state: "error",
      message: "Choose an image model before using reference attachments.",
    };
  }

  if (!capability.referenceSupport.supported) {
    return {
      state: "error",
      message: `${capability.model.label} does not accept reference images.`,
    };
  }

  if (!capability.referenceSupport.acceptedTypes.includes(referenceImage.type)) {
    return {
      state: "error",
      message: `${referenceImage.type} references are not supported by ${capability.model.label}.`,
    };
  }

  if (insertionOrder >= capability.referenceSupport.maxImages) {
    return {
      state: "disabled",
      message: `${capability.model.label} accepts at most ${capability.referenceSupport.maxImages} reference image(s). Remove this reference or change image model.`,
    };
  }

  return {
    state: "valid",
    message: null,
  };
}

function formatReferenceAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createImageGenerationNodeUiState(
  input: Partial<ImageGenerationNodeUiState> = {},
): ImageGenerationNodeUiState {
  return {
    viewMode: input.viewMode ?? "compact",
    inspectorOpen: input.inspectorOpen ?? false,
    docsPanelOpen: input.docsPanelOpen ?? false,
    referenceTrayOpen: input.referenceTrayOpen ?? false,
    status: input.status ?? "idle",
    progressPercent: input.progressPercent ?? null,
    statusMessage: input.statusMessage ?? null,
    errorReason: input.errorReason ?? null,
    failureDetails: input.failureDetails
      ? { ...input.failureDetails }
      : input.failureDetails === null
        ? null
        : null,
    selectedResultAssetId: input.selectedResultAssetId ?? null,
    outputConnectionReady: input.outputConnectionReady ?? false,
  };
}

export function startImageGenerationNodeTransition(
  properties: ImageGenerationNodeProperties,
): ImageGenerationNodeProperties {
  return {
    ...properties,
    latestResultRefs: cloneImageGenerationNodeResultRefs(
      properties.latestResultRefs,
    ),
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      status: "running",
      progressPercent: 0,
      statusMessage: "Generation started",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId: null,
      outputConnectionReady: false,
    }),
  };
}

export function completeImageGenerationNodeTransition(
  properties: ImageGenerationNodeProperties,
  latestResultRefs: ImageGenerationNodeResultRefs,
): ImageGenerationNodeProperties {
  const selectedResultAssetId = latestResultRefs.generatedAssetIds[0] ?? null;

  return {
    ...properties,
    latestResultRefs: {
      generatedAssetIds: [...latestResultRefs.generatedAssetIds],
      metadataRunId: latestResultRefs.metadataRunId,
      costUsageRunId: latestResultRefs.costUsageRunId,
    },
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      status: "completed",
      progressPercent: 100,
      statusMessage: "Generation complete",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId,
      outputConnectionReady: selectedResultAssetId !== null,
    }),
  };
}

export function queueImageGenerationNodeV2Transition(
  properties: ImageGenerationNodeProperties,
): ImageGenerationNodeProperties {
  return {
    ...properties,
    latestResultRefs: cloneImageGenerationNodeResultRefs(
      properties.latestResultRefs,
    ),
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      status: "queued",
      progressPercent: null,
      statusMessage: "Generation queued",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId: null,
      outputConnectionReady: false,
    }),
  };
}

export function runImageGenerationNodeV2Transition(
  properties: ImageGenerationNodeProperties,
): ImageGenerationNodeProperties {
  return {
    ...properties,
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      status: "running",
      progressPercent: 0,
      statusMessage: "Generation started",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId: null,
      outputConnectionReady: false,
    }),
  };
}

export function succeedImageGenerationNodeV2Transition(
  properties: ImageGenerationNodeProperties,
  latestResultRefs: ImageGenerationNodeResultRefs,
): ImageGenerationNodeProperties {
  const completedProperties = completeImageGenerationNodeTransition(
    properties,
    latestResultRefs,
  );

  return {
    ...completedProperties,
    uiState: createImageGenerationNodeUiState({
      ...completedProperties.uiState,
      status: "succeeded",
    }),
  };
}

export function failImageGenerationNodeTransition(
  properties: ImageGenerationNodeProperties,
  failureDetails: ImageGenerationNodeFailureDetails,
): ImageGenerationNodeProperties {
  const selectedResultAssetId =
    properties.uiState.selectedResultAssetId ??
    properties.latestResultRefs.generatedAssetIds[0] ??
    null;

  return {
    ...properties,
    latestResultRefs: cloneImageGenerationNodeResultRefs(
      properties.latestResultRefs,
    ),
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      status: "error",
      progressPercent: null,
      statusMessage: "Generation failed",
      errorReason: failureDetails.message,
      failureDetails,
      selectedResultAssetId,
      outputConnectionReady: selectedResultAssetId !== null,
    }),
  };
}

function cloneImageGenerationNodeResultRefs(
  latestResultRefs: ImageGenerationNodeResultRefs,
): ImageGenerationNodeResultRefs {
  return {
    generatedAssetIds: [...latestResultRefs.generatedAssetIds],
    metadataRunId: latestResultRefs.metadataRunId,
    costUsageRunId: latestResultRefs.costUsageRunId,
  };
}

export function failImageGenerationNodeV2Transition(
  properties: ImageGenerationNodeProperties,
  failureDetails: ImageGenerationNodeFailureDetails,
): ImageGenerationNodeProperties {
  const failedProperties = failImageGenerationNodeTransition(
    properties,
    failureDetails,
  );

  return {
    ...failedProperties,
    uiState: createImageGenerationNodeUiState({
      ...failedProperties.uiState,
      status: "failed",
    }),
  };
}

export function cancelImageGenerationNodeV2Transition(
  properties: ImageGenerationNodeProperties,
): ImageGenerationNodeProperties {
  return {
    ...properties,
    latestResultRefs: {
      generatedAssetIds: [],
      metadataRunId: null,
      costUsageRunId: null,
    },
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      status: "canceled",
      progressPercent: null,
      statusMessage: "Generation canceled",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId: null,
      outputConnectionReady: false,
    }),
  };
}

export function syncImageGenerationNodeSelectedResultTransition(
  properties: ImageGenerationNodeProperties,
  selectedResultAssetId: string | null,
): ImageGenerationNodeProperties {
  const nextSelectedResultAssetId =
    selectedResultAssetId !== null &&
    properties.latestResultRefs.generatedAssetIds.includes(selectedResultAssetId)
      ? selectedResultAssetId
      : null;
  const hasAvailableOutputs =
    properties.latestResultRefs.generatedAssetIds.length > 0;
  const isTerminalFeedbackStatus =
    properties.uiState.status === "error" ||
    properties.uiState.status === "cancelled";
  const status =
    nextSelectedResultAssetId !== null && !isTerminalFeedbackStatus
      ? "completed"
      : properties.uiState.status;

  return {
    ...properties,
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      status,
      selectedResultAssetId: nextSelectedResultAssetId,
      outputConnectionReady: nextSelectedResultAssetId !== null,
      statusMessage:
        nextSelectedResultAssetId !== null
          ? "Output selected"
          : hasAvailableOutputs && properties.uiState.status === "completed"
            ? "Select an output"
            : properties.uiState.statusMessage,
    }),
  };
}

export function openImageGenerationNodeInspectorTransition(
  properties: ImageGenerationNodeProperties,
): ImageGenerationNodeProperties {
  return {
    ...properties,
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      viewMode: "compact",
      inspectorOpen: true,
      docsPanelOpen: true,
    }),
  };
}

export function closeImageGenerationNodeInspectorTransition(
  properties: ImageGenerationNodeProperties,
): ImageGenerationNodeProperties {
  return {
    ...properties,
    uiState: createImageGenerationNodeUiState({
      ...properties.uiState,
      inspectorOpen: false,
      docsPanelOpen: false,
    }),
  };
}

export function selectImageGenerationNodeAspectRatioTransition(
  properties: ImageGenerationNodeProperties,
  aspectRatio: ImageGenerationAspectRatio,
): ImageGenerationNodeProperties {
  const nextProperties = {
    ...properties,
    aspectRatio,
  };

  return syncImageGenerationNodeFrameFromAspectRatioTransition(nextProperties);
}

export function syncImageGenerationNodeFrameFromAspectRatioTransition(
  properties: ImageGenerationNodeProperties,
): ImageGenerationNodeProperties {
  if (properties.frame.source === "user-resize") {
    return properties;
  }

  return {
    ...properties,
    frame: createImageGenerationFrame(properties.aspectRatio),
  };
}

export function resetImageGenerationNodeFrameToAspectRatioTransition(
  properties: ImageGenerationNodeProperties,
): ImageGenerationNodeProperties {
  return {
    ...properties,
    frame: createImageGenerationFrame(properties.aspectRatio),
  };
}

export function resizeImageGenerationNodeFrameTransition(
  properties: ImageGenerationNodeProperties,
  frame: Pick<ImageGenerationFrame, "width" | "height">,
): ImageGenerationNodeProperties {
  return {
    ...properties,
    frame: {
      ...properties.frame,
      width: frame.width,
      height: frame.height,
      source: "user-resize",
    },
  };
}

export function resolveImageGenerationNodeStatus({
  selected,
  uiState,
}: {
  selected: boolean;
  uiState: ImageGenerationNodeUiState | undefined;
}): ImageGenerationNodeUiStatus {
  if (uiState === undefined) {
    return selected ? "selected" : "idle";
  }

  if (selected && uiState.status === "idle") {
    return "selected";
  }

  return uiState.status;
}

const imageGenerationNodeStatusViews = {
  idle: {
    status: "idle",
    label: "Idle",
    className: "idle",
    ariaLabel: "Image node status: idle",
  },
  selected: {
    status: "selected",
    label: "Selected",
    className: "selected",
    ariaLabel: "Image node status: selected",
  },
  running: {
    status: "running",
    label: "Running",
    className: "running",
    ariaLabel: "Image node status: running",
  },
  completed: {
    status: "completed",
    label: "Ready",
    className: "completed",
    ariaLabel: "Image node status: completed",
  },
  error: {
    status: "error",
    label: "Error",
    className: "error",
    ariaLabel: "Image node status: error",
  },
  cancelled: {
    status: "cancelled",
    label: "Cancelled",
    className: "cancelled",
    ariaLabel: "Image node status: cancelled",
  },
  queued: {
    status: "queued",
    label: "Queued",
    className: "queued",
    ariaLabel: "Image node status: queued",
  },
  succeeded: {
    status: "succeeded",
    label: "Ready",
    className: "succeeded",
    ariaLabel: "Image node status: succeeded",
  },
  failed: {
    status: "failed",
    label: "Error",
    className: "failed",
    ariaLabel: "Image node status: failed",
  },
  canceled: {
    status: "canceled",
    label: "Canceled",
    className: "canceled",
    ariaLabel: "Image node status: canceled",
  },
} as const satisfies Record<
  ImageGenerationNodeUiStatus,
  ImageGenerationNodeStatusView
>;

export function resolveImageGenerationNodeStatusView(
  status: ImageGenerationNodeUiStatus,
): ImageGenerationNodeStatusView {
  return { ...imageGenerationNodeStatusViews[status] };
}

export function resolveImageGenerationNodeOutputView(
  properties: Pick<ImageGenerationNodeProperties, "latestResultRefs" | "uiState">,
): ImageGenerationNodeOutputView {
  if (
    properties.uiState.status === "error" ||
    properties.uiState.status === "failed"
  ) {
    return {
      state: "error",
      label: "Error",
      className: "error",
      ariaLabel: `Image output area: ${
        properties.uiState.errorReason ?? "generation failed"
      }`,
    };
  }

  if (
    properties.uiState.status === "cancelled" ||
    properties.uiState.status === "canceled"
  ) {
    return {
      state: "cancelled",
      label: "Cancelled",
      className: "cancelled",
      ariaLabel: "Image output area: generation cancelled",
    };
  }

  if (
    (properties.uiState.status === "completed" ||
      properties.uiState.status === "succeeded") &&
    properties.uiState.selectedResultAssetId !== null &&
    properties.latestResultRefs.generatedAssetIds.includes(
      properties.uiState.selectedResultAssetId,
    )
  ) {
    return {
      state: "success",
      label: "Ready",
      className: "success",
      ariaLabel: "Image output area: generated output ready",
    };
  }

  return {
    state: "empty-output",
    label: "Empty",
    className: "empty-output",
    ariaLabel:
      properties.uiState.status === "completed"
        ? "Image output area: no generated output returned"
        : "Image output area: no output yet",
  };
}

export function resolveImageGenerationOutputNextNodeActions(
  properties: Pick<ImageGenerationNodeProperties, "providerId" | "modelSlug">,
): ImageGenerationOutputNextNodeAction[] {
  const capability = resolveImageGenerationNodeModelCapability(properties);

  if (!capability) {
    return createImageGenerationOutputNextNodeActions({
      imageEditReason: "Choose a model with image editing support.",
      styleVariantReason: "Choose a model with reference-image support.",
      upscaleReason: "Choose a model with provider size controls.",
      videoReason: "Choose a provider with video generation support.",
    });
  }

  return createImageGenerationOutputNextNodeActions({
    imageEditReason: capability.capabilities.imageToImage
      ? null
      : `${capability.model.label} does not accept generated images for editing.`,
    styleVariantReason: capability.referenceSupport.supported
      ? null
      : `${capability.model.label} does not accept reference images for style variants.`,
    upscaleReason: capability.capabilities.customSize
      ? null
      : `${capability.model.label} does not expose provider size controls for upscaling.`,
    videoReason: "No video provider is connected for this Image Block yet.",
  });
}

function createImageGenerationOutputNextNodeActions(input: {
  imageEditReason: string | null;
  styleVariantReason: string | null;
  upscaleReason: string | null;
  videoReason: string | null;
}): ImageGenerationOutputNextNodeAction[] {
  return [
    createImageGenerationOutputNextNodeAction({
      kind: "image-edit",
      label: "Image edit",
      description: "Create an Image Block that uses this output as its edit source.",
      disabledReason: input.imageEditReason,
    }),
    createImageGenerationOutputNextNodeAction({
      kind: "style-variant",
      label: "Style variant",
      description: "Create an Image Block variant that keeps this output as style reference.",
      disabledReason: input.styleVariantReason,
    }),
    createImageGenerationOutputNextNodeAction({
      kind: "upscale",
      label: "Upscale",
      description: "Create a provider-sized Image Block for a larger output.",
      disabledReason: input.upscaleReason,
    }),
    createImageGenerationOutputNextNodeAction({
      kind: "video",
      label: "Video Block source",
      description: "Create a Video Block that starts from this still image.",
      disabledReason: input.videoReason,
    }),
    createImageGenerationOutputNextNodeAction({
      kind: "output-card",
      label: "Output / result card",
      description: "Pin this Creative Output as a reusable canvas result card.",
      disabledReason: null,
    }),
    createImageGenerationOutputNextNodeAction({
      kind: "landing-asset",
      label: "Landing asset",
      description: "Use this Creative Output as a landing page asset.",
      disabledReason: null,
    }),
  ];
}

function createImageGenerationOutputNextNodeAction(input: {
  kind: ImageGenerationOutputNextNodeActionKind;
  label: string;
  description: string;
  disabledReason: string | null;
}): ImageGenerationOutputNextNodeAction {
  return {
    kind: input.kind,
    label: input.label,
    description: input.description,
    availability: input.disabledReason === null ? "available" : "disabled",
    disabledReason: input.disabledReason,
  };
}

export function createImageGenerationFrame(
  aspectRatio: ImageGenerationAspectRatio,
): ImageGenerationFrame {
  if (aspectRatio === "9:16") {
    return { ...IMAGE_GENERATION_DEFAULT_FRAME };
  }

  if (aspectRatio === "1:1") {
    return {
      width: 480,
      height: 480,
      resizeMode: "locked-aspect-ratio",
      source: "aspect-ratio",
    };
  }

  return {
    width: 640,
    height: 360,
    resizeMode: "locked-aspect-ratio",
    source: "aspect-ratio",
  };
}

export function isImageGenerationNodeProperties(
  value: unknown,
): value is ImageGenerationNodeProperties {
  return (
    typeof value === "object" &&
    value !== null &&
    "nodeType" in value &&
    value.nodeType === IMAGE_GENERATION_NODE_TYPE
  );
}
