export const IMAGE_GENERATION_NODE_TYPE = "owncanvas.image-generation.v1";

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

export type ImageGenerationStorageContract = {
  canvasJsonPath: "canvas.json";
  assetDirectory: "assets/";
  runHistory: "runs/" | "history.jsonl";
  secretPolicy: "env-or-local-secret-store-only";
};

export type ImageGenerationNodeProperties = {
  nodeType: typeof IMAGE_GENERATION_NODE_TYPE;
  providerAgnostic: true;
  providerId: ImageGenerationProviderPreset["providerId"];
  batchCount: 1 | 2 | 3 | 4 | 5;
  inputs: ImageGenerationNodePort[];
  outputs: ImageGenerationNodePort[];
  providerPresets: ImageGenerationProviderPreset[];
  storage: ImageGenerationStorageContract;
  latestResultRefs: {
    generatedAssetIds: string[];
    metadataRunId: string | null;
    costUsageRunId: string | null;
  };
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

export function createImageGenerationNodeProperties(
  input: Partial<Pick<ImageGenerationNodeProperties, "providerId" | "batchCount">> = {},
): ImageGenerationNodeProperties {
  return {
    nodeType: IMAGE_GENERATION_NODE_TYPE,
    providerAgnostic: true,
    providerId: input.providerId ?? "openai-image",
    batchCount: input.batchCount ?? 5,
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
