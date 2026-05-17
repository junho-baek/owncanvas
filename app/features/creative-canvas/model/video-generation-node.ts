export type VideoGenerationProviderId = "replicate";

export type VideoGenerationModelSlug =
  | "bytedance/seedance-1-lite"
  | "bytedance/seedance-1-pro-fast"
  | "bytedance/seedance-2.0-fast"
  | "kwaivgi/kling-v2.1";

export type VideoGenerationAspectRatio =
  | "16:9"
  | "4:3"
  | "1:1"
  | "3:4"
  | "9:16"
  | "21:9"
  | "9:21";

export type VideoGenerationResolution = "480p" | "720p" | "1080p";

export type VideoGenerationUiStatus =
  | "idle"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type VideoGenerationFailureDetails = {
  name: string;
  category?: string;
  message: string;
  providerId: VideoGenerationProviderId;
  modelSlug: VideoGenerationModelSlug;
  providerRequestId: string | null;
  retryable: boolean | null;
};

export type VideoGenerationNodeUiState = {
  status: VideoGenerationUiStatus;
  progressPercent: number | null;
  statusMessage: string;
  errorReason: string | null;
  failureDetails: VideoGenerationFailureDetails | null;
  selectedResultAssetId: string | null;
  outputConnectionReady: boolean;
};

export type VideoGenerationNodeResultRefs = {
  generatedAssetIds: string[];
  metadataRunId: string | null;
  costUsageRunId: string | null;
};

export type VideoGenerationNodeProperties = {
  schemaVersion: "owncanvas.video-generation-node.v1";
  providerId: VideoGenerationProviderId;
  modelSlug: VideoGenerationModelSlug;
  serviceAdapterId: "replicate";
  prompt: string;
  aspectRatio: VideoGenerationAspectRatio;
  durationSeconds: number;
  resolution: VideoGenerationResolution;
  frameRate: 24;
  referenceImageAssetId: string | null;
  referenceImageUri: string | null;
  sourceImageNodeId?: string;
  sourceOutputAssetId?: string;
  nextNodeActionKind?: string;
  latestResultRefs: VideoGenerationNodeResultRefs;
  uiState: VideoGenerationNodeUiState;
};

export type VideoGenerationModelCapability = {
  providerId: VideoGenerationProviderId;
  modelSlug: VideoGenerationModelSlug;
  serviceAdapterId: "replicate";
  label: string;
  supportsTextToVideo: boolean;
  supportsImageToVideo: boolean;
  requiresReferenceImage: boolean;
  referenceImageInputKey: "image" | "start_image" | null;
  durationOptions: number[];
  resolutionOptions: VideoGenerationResolution[];
  aspectRatioOptions: VideoGenerationAspectRatio[];
  defaultDurationSeconds: number;
  defaultResolution: VideoGenerationResolution;
  defaultAspectRatio: VideoGenerationAspectRatio;
};

export type VideoGenerationModelPickerOption = {
  value: VideoGenerationModelSlug;
  label: string;
  disabled: boolean;
  disabledReason: string | null;
  serviceAdapterId: "replicate";
  serviceModelRef: VideoGenerationModelSlug;
};

export const VIDEO_GENERATION_MODEL_CAPABILITIES = [
  {
    providerId: "replicate",
    modelSlug: "bytedance/seedance-1-lite",
    serviceAdapterId: "replicate",
    label: "Seedance 1 Lite",
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    requiresReferenceImage: false,
    referenceImageInputKey: "image",
    durationOptions: [2, 5, 10],
    resolutionOptions: ["480p", "720p"],
    aspectRatioOptions: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "9:21"],
    defaultDurationSeconds: 2,
    defaultResolution: "480p",
    defaultAspectRatio: "16:9",
  },
  {
    providerId: "replicate",
    modelSlug: "bytedance/seedance-1-pro-fast",
    serviceAdapterId: "replicate",
    label: "Seedance 1 Pro Fast",
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    requiresReferenceImage: false,
    referenceImageInputKey: "image",
    durationOptions: [2, 5, 10],
    resolutionOptions: ["480p", "720p", "1080p"],
    aspectRatioOptions: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "9:21"],
    defaultDurationSeconds: 2,
    defaultResolution: "480p",
    defaultAspectRatio: "16:9",
  },
  {
    providerId: "replicate",
    modelSlug: "bytedance/seedance-2.0-fast",
    serviceAdapterId: "replicate",
    label: "Seedance 2 Fast",
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    requiresReferenceImage: false,
    referenceImageInputKey: "image",
    durationOptions: [5, 10, 15],
    resolutionOptions: ["480p", "720p"],
    aspectRatioOptions: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
    defaultDurationSeconds: 5,
    defaultResolution: "480p",
    defaultAspectRatio: "16:9",
  },
  {
    providerId: "replicate",
    modelSlug: "kwaivgi/kling-v2.1",
    serviceAdapterId: "replicate",
    label: "Kling v2.1",
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    requiresReferenceImage: true,
    referenceImageInputKey: "start_image",
    durationOptions: [5, 10],
    resolutionOptions: ["720p", "1080p"],
    aspectRatioOptions: ["16:9"],
    defaultDurationSeconds: 5,
    defaultResolution: "720p",
    defaultAspectRatio: "16:9",
  },
] as const satisfies readonly VideoGenerationModelCapability[];

export function createVideoGenerationNodeProperties(
  input: Partial<VideoGenerationNodeProperties> = {},
): VideoGenerationNodeProperties {
  const modelSlug = input.modelSlug ?? "bytedance/seedance-1-lite";
  const capability =
    resolveVideoGenerationModelCapability({
      providerId: input.providerId ?? "replicate",
      modelSlug,
    }) ?? VIDEO_GENERATION_MODEL_CAPABILITIES[0];

  return {
    schemaVersion: "owncanvas.video-generation-node.v1",
    providerId: input.providerId ?? capability.providerId,
    modelSlug,
    serviceAdapterId: "replicate",
    prompt: input.prompt ?? "",
    aspectRatio: input.aspectRatio ?? capability.defaultAspectRatio,
    durationSeconds:
      input.durationSeconds ?? capability.defaultDurationSeconds,
    resolution: input.resolution ?? capability.defaultResolution,
    frameRate: 24,
    referenceImageAssetId: input.referenceImageAssetId ?? null,
    referenceImageUri: input.referenceImageUri ?? null,
    ...(input.sourceImageNodeId === undefined
      ? {}
      : { sourceImageNodeId: input.sourceImageNodeId }),
    ...(input.sourceOutputAssetId === undefined
      ? {}
      : { sourceOutputAssetId: input.sourceOutputAssetId }),
    ...(input.nextNodeActionKind === undefined
      ? {}
      : { nextNodeActionKind: input.nextNodeActionKind }),
    latestResultRefs: {
      generatedAssetIds: [...(input.latestResultRefs?.generatedAssetIds ?? [])],
      metadataRunId: input.latestResultRefs?.metadataRunId ?? null,
      costUsageRunId: input.latestResultRefs?.costUsageRunId ?? null,
    },
    uiState: createVideoGenerationNodeUiState(input.uiState),
  };
}

export function createVideoGenerationNodeUiState(
  input: Partial<VideoGenerationNodeUiState> = {},
): VideoGenerationNodeUiState {
  return {
    status: input.status ?? "idle",
    progressPercent: input.progressPercent ?? null,
    statusMessage: input.statusMessage ?? "",
    errorReason: input.errorReason ?? null,
    failureDetails: input.failureDetails ?? null,
    selectedResultAssetId: input.selectedResultAssetId ?? null,
    outputConnectionReady: input.outputConnectionReady ?? false,
  };
}

export function isVideoGenerationNodeProperties(
  value: unknown,
): value is VideoGenerationNodeProperties {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === "owncanvas.video-generation-node.v1" &&
    value.providerId === "replicate" &&
    isVideoGenerationModelSlug(value.modelSlug) &&
    value.serviceAdapterId === "replicate" &&
    typeof value.prompt === "string" &&
    isVideoGenerationAspectRatio(value.aspectRatio) &&
    typeof value.durationSeconds === "number" &&
    Number.isInteger(value.durationSeconds) &&
    isVideoGenerationResolution(value.resolution) &&
    value.frameRate === 24 &&
    (value.referenceImageAssetId === null ||
      typeof value.referenceImageAssetId === "string") &&
    (value.referenceImageUri === null ||
      typeof value.referenceImageUri === "string") &&
    isRecord(value.latestResultRefs) &&
    Array.isArray(value.latestResultRefs.generatedAssetIds) &&
    isRecord(value.uiState)
  );
}

export function resolveVideoGenerationModelCapability(input: {
  providerId: VideoGenerationProviderId;
  modelSlug: VideoGenerationModelSlug;
}): VideoGenerationModelCapability | undefined {
  return VIDEO_GENERATION_MODEL_CAPABILITIES.find(
    (capability) =>
      capability.providerId === input.providerId &&
      capability.modelSlug === input.modelSlug,
  );
}

export function resolveVideoGenerationModelPickerOptions(input: {
  selectedModelSlug: VideoGenerationModelSlug;
  hasReferenceImage: boolean;
}): VideoGenerationModelPickerOption[] {
  return VIDEO_GENERATION_MODEL_CAPABILITIES.map((capability) => {
    const disabled =
      capability.requiresReferenceImage && !input.hasReferenceImage;

    return {
      value: capability.modelSlug,
      label: capability.label,
      disabled,
      disabledReason: disabled ? "Requires a reference image" : null,
      serviceAdapterId: capability.serviceAdapterId,
      serviceModelRef: capability.modelSlug,
    };
  });
}

export function selectVideoGenerationNodeModelTransition(
  properties: VideoGenerationNodeProperties,
  modelSlug: VideoGenerationModelSlug,
): VideoGenerationNodeProperties {
  const capability =
    resolveVideoGenerationModelCapability({
      providerId: "replicate",
      modelSlug,
    }) ?? VIDEO_GENERATION_MODEL_CAPABILITIES[0];

  return createVideoGenerationNodeProperties({
    ...properties,
    modelSlug: capability.modelSlug,
    durationSeconds: nearestSupportedNumber(
      properties.durationSeconds,
      capability.durationOptions,
      capability.defaultDurationSeconds,
    ),
    resolution: includesVideoGenerationResolution(
      capability.resolutionOptions,
      properties.resolution,
    )
      ? properties.resolution
      : capability.defaultResolution,
    aspectRatio: includesVideoGenerationAspectRatio(
      capability.aspectRatioOptions,
      properties.aspectRatio,
    )
      ? properties.aspectRatio
      : capability.defaultAspectRatio,
  });
}

export function createVideoGenerationNodeProviderRequest(input: {
  properties: VideoGenerationNodeProperties;
  prompt: string;
  referenceImageUri?: string | null;
}) {
  const capability = resolveVideoGenerationNodeModelCapability(input.properties);
  const prompt = input.prompt.trim();
  const replicateInput: Record<string, unknown> = {
    prompt,
    duration: input.properties.durationSeconds,
  };
  const referenceImageUri =
    input.referenceImageUri ?? input.properties.referenceImageUri;

  if (capability.modelSlug === "kwaivgi/kling-v2.1") {
    replicateInput.mode =
      input.properties.resolution === "1080p" ? "pro" : "standard";
    replicateInput.negative_prompt = "";
  } else {
    replicateInput.resolution = input.properties.resolution;
    replicateInput.aspect_ratio = input.properties.aspectRatio;
    replicateInput.fps = input.properties.frameRate;
    if (capability.modelSlug === "bytedance/seedance-2.0-fast") {
      replicateInput.generate_audio = false;
    } else {
      replicateInput.camera_fixed = false;
    }
  }

  if (
    referenceImageUri !== null &&
    capability.referenceImageInputKey !== null
  ) {
    replicateInput[capability.referenceImageInputKey] = referenceImageUri;
  }

  return {
    replicate: {
      providerId: input.properties.providerId,
      model: input.properties.modelSlug,
      serviceAdapterId: input.properties.serviceAdapterId,
      credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
      inputEnvelopeField: "input",
      input: replicateInput,
    },
  };
}

export function validateVideoGenerationRunReadiness(input: {
  properties: VideoGenerationNodeProperties;
  referenceImageUri?: string | null;
}):
  | { valid: true; error: null }
  | { valid: false; error: VideoGenerationFailureDetails } {
  const capability = resolveVideoGenerationNodeModelCapability(input.properties);
  const referenceImageUri =
    input.referenceImageUri ?? input.properties.referenceImageUri;

  if (input.properties.prompt.trim() === "") {
    return {
      valid: false,
      error: createVideoGenerationFailureDetails(input.properties, {
        name: "VideoGenerationPromptMissing",
        message: "Prompt is required.",
        retryable: false,
      }),
    };
  }

  if (
    capability.requiresReferenceImage &&
    (referenceImageUri === null || referenceImageUri.trim() === "")
  ) {
    return {
      valid: false,
      error: createVideoGenerationFailureDetails(input.properties, {
        name: "VideoGenerationReferenceMissing",
        message: "Selected model requires a reference image.",
        retryable: false,
      }),
    };
  }

  if (!capability.durationOptions.includes(input.properties.durationSeconds)) {
    return {
      valid: false,
      error: createVideoGenerationFailureDetails(input.properties, {
        name: "VideoGenerationDurationUnsupported",
        message: "Selected duration is not supported by this model.",
        retryable: false,
      }),
    };
  }

  if (!capability.resolutionOptions.includes(input.properties.resolution)) {
    return {
      valid: false,
      error: createVideoGenerationFailureDetails(input.properties, {
        name: "VideoGenerationResolutionUnsupported",
        message: "Selected resolution is not supported by this model.",
        retryable: false,
      }),
    };
  }

  return { valid: true, error: null };
}

export function queueVideoGenerationNodeTransition(
  properties: VideoGenerationNodeProperties,
): VideoGenerationNodeProperties {
  return createVideoGenerationNodeProperties({
    ...properties,
    latestResultRefs: {
      generatedAssetIds: [],
      metadataRunId: null,
      costUsageRunId: null,
    },
    uiState: {
      status: "queued",
      progressPercent: 0,
      statusMessage: "Queued",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId: null,
      outputConnectionReady: false,
    },
  });
}

export function succeedVideoGenerationNodeTransition(
  properties: VideoGenerationNodeProperties,
  latestResultRefs: VideoGenerationNodeResultRefs,
): VideoGenerationNodeProperties {
  const selectedResultAssetId = latestResultRefs.generatedAssetIds[0] ?? null;

  return createVideoGenerationNodeProperties({
    ...properties,
    latestResultRefs,
    uiState: {
      status: "succeeded",
      progressPercent: 100,
      statusMessage: "Generated",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId,
      outputConnectionReady: selectedResultAssetId !== null,
    },
  });
}

export function failVideoGenerationNodeTransition(
  properties: VideoGenerationNodeProperties,
  failureDetails: VideoGenerationFailureDetails,
): VideoGenerationNodeProperties {
  return createVideoGenerationNodeProperties({
    ...properties,
    uiState: {
      status: "failed",
      progressPercent: null,
      statusMessage: failureDetails.message,
      errorReason: failureDetails.message,
      failureDetails,
      selectedResultAssetId: properties.uiState.selectedResultAssetId,
      outputConnectionReady: properties.uiState.outputConnectionReady,
    },
  });
}

export function createVideoGenerationFailureDetails(
  properties: Pick<VideoGenerationNodeProperties, "providerId" | "modelSlug">,
  input: {
    name: string;
    category?: string;
    message: string;
    providerRequestId?: string | null;
    retryable?: boolean | null;
  },
): VideoGenerationFailureDetails {
  return {
    name: input.name,
    ...(input.category === undefined ? {} : { category: input.category }),
    message: input.message,
    providerId: properties.providerId,
    modelSlug: properties.modelSlug,
    providerRequestId: input.providerRequestId ?? null,
    retryable: input.retryable ?? null,
  };
}

export function resolveVideoGenerationNodeModelCapability(
  properties: Pick<VideoGenerationNodeProperties, "providerId" | "modelSlug">,
): VideoGenerationModelCapability {
  return (
    resolveVideoGenerationModelCapability({
      providerId: properties.providerId,
      modelSlug: properties.modelSlug,
    }) ?? VIDEO_GENERATION_MODEL_CAPABILITIES[0]
  );
}

function nearestSupportedNumber(
  value: number,
  supported: readonly number[],
  fallback: number,
) {
  return supported.includes(value) ? value : fallback;
}

function includesVideoGenerationResolution(
  values: readonly VideoGenerationResolution[],
  value: VideoGenerationResolution,
) {
  return values.includes(value);
}

function includesVideoGenerationAspectRatio(
  values: readonly VideoGenerationAspectRatio[],
  value: VideoGenerationAspectRatio,
) {
  return values.includes(value);
}

function isVideoGenerationModelSlug(
  value: unknown,
): value is VideoGenerationModelSlug {
  return VIDEO_GENERATION_MODEL_CAPABILITIES.some(
    (capability) => capability.modelSlug === value,
  );
}

function isVideoGenerationAspectRatio(
  value: unknown,
): value is VideoGenerationAspectRatio {
  return ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "9:21"].includes(
    String(value),
  );
}

function isVideoGenerationResolution(
  value: unknown,
): value is VideoGenerationResolution {
  return value === "480p" || value === "720p" || value === "1080p";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
