export const IMAGE_GENERATION_NODE_TYPE = "owncanvas.image-generation.v1";

export const imageGenerationNodeStatuses = [
  "idle",
  "selected",
  "running",
  "completed",
  "error",
] as const;

export type ImageGenerationNodeStatus =
  (typeof imageGenerationNodeStatuses)[number];

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
  inputControls: ImageGenerationInputControl[];
  outputConstraints: {
    formats: readonly string[];
    maxOutputs: number;
    defaultFormat: string;
    unsupportedDefaultRatioBehavior?: "map_nearest" | "disable";
  };
};

type ImageGenerationModelCapabilityDefinition = Omit<
  ImageGenerationModelCapability,
  "controlMetadata"
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

export type ImageGenerationFrame = {
  width: number;
  height: number;
  resizeMode: "locked-aspect-ratio";
};

export const IMAGE_GENERATION_COMPACT_FRAME_LIMITS = {
  minWidth: 320,
  minHeight: 260,
  maxWidth: 640,
  maxHeight: 640,
} as const;

export type ImageGenerationNodeUiState = {
  viewMode: "compact" | "focused";
  inspectorOpen: boolean;
  docsPanelOpen: boolean;
  referenceTrayOpen: boolean;
  status: ImageGenerationNodeStatus;
  progressPercent: number | null;
  statusMessage: string | null;
  errorReason: string | null;
  outputConnectionReady: boolean;
};

export type ImageGenerationNodeStatusView = {
  status: ImageGenerationNodeStatus;
  label: string;
  className: ImageGenerationNodeStatus;
  ariaLabel: string;
};

export type ImageGenerationNodeProperties = {
  nodeType: typeof IMAGE_GENERATION_NODE_TYPE;
  providerAgnostic: true;
  providerId: ImageGenerationProviderPreset["providerId"];
  batchCount: 1 | 2 | 3 | 4 | 5;
  aspectRatio: ImageGenerationAspectRatio;
  frame: ImageGenerationFrame;
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
    label: "Replicate",
    capabilityId: "image.generate",
    modelHint: "Provider-selected image model slug",
    secretEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
    notes: "Provider adapter maps the common node contract to a model-specific prediction request.",
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
  };
}

export const imageGenerationModelCapabilities: ImageGenerationModelCapability[] = [
  defineImageGenerationModelCapability({
    provider: {
      providerId: "replicate",
      label: "Replicate",
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
      label: "Replicate",
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
      label: "Replicate",
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

export function createImageGenerationNodeProperties(
  input: Partial<
    Pick<
      ImageGenerationNodeProperties,
      "providerId" | "batchCount" | "aspectRatio" | "frame" | "uiState"
    >
  > = {},
): ImageGenerationNodeProperties {
  const aspectRatio = input.aspectRatio ?? "9:16";

  return {
    nodeType: IMAGE_GENERATION_NODE_TYPE,
    providerAgnostic: true,
    providerId: input.providerId ?? "openai-image",
    batchCount: input.batchCount ?? 1,
    aspectRatio,
    frame: input.frame ?? createImageGenerationFrame(aspectRatio),
    inputs: imageGenerationInputPorts.map((port) => ({ ...port })),
    outputs: imageGenerationOutputPorts.map((port) => ({ ...port })),
    providerPresets: imageGenerationProviderPresets.map((preset) => ({ ...preset })),
    storage: {
      canvasJsonPath: "canvas.json",
      assetDirectory: "assets/",
      runHistory: "runs/",
      secretPolicy: "env-or-local-secret-store-only",
    },
    latestResultRefs: {
      generatedAssetIds: [],
      metadataRunId: null,
      costUsageRunId: null,
    },
    uiState: input.uiState ?? createImageGenerationNodeUiState(),
  };
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
    outputConnectionReady: input.outputConnectionReady ?? false,
  };
}

export function resolveImageGenerationNodeStatus({
  selected,
  uiState,
}: {
  selected: boolean;
  uiState: ImageGenerationNodeUiState | undefined;
}): ImageGenerationNodeStatus {
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
} as const satisfies Record<
  ImageGenerationNodeStatus,
  ImageGenerationNodeStatusView
>;

export function resolveImageGenerationNodeStatusView(
  status: ImageGenerationNodeStatus,
): ImageGenerationNodeStatusView {
  return { ...imageGenerationNodeStatusViews[status] };
}

export function createImageGenerationFrame(
  aspectRatio: ImageGenerationAspectRatio,
): ImageGenerationFrame {
  if (aspectRatio === "9:16") {
    return { width: 360, height: 640, resizeMode: "locked-aspect-ratio" };
  }

  if (aspectRatio === "1:1") {
    return { width: 480, height: 480, resizeMode: "locked-aspect-ratio" };
  }

  return { width: 640, height: 360, resizeMode: "locked-aspect-ratio" };
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
