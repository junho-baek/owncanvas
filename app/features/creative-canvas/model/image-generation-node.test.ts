import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createCampaignBlock } from "./creative-canvas.ts";
import {
  IMAGE_GENERATION_COMPACT_FRAME_LIMITS,
  IMAGE_GENERATION_NODE_TYPE,
  createImageGenerationFrame,
  createImageGenerationModelCapabilityKey,
  createImageGenerationNodeProperties,
  createImageGenerationNodeUiState,
  getDefaultImageGenerationModelCapability,
  getImageGenerationModelCapability,
  imageGenerationInputPorts,
  imageGenerationModelCapabilities,
  imageGenerationNodeStatuses,
  imageGenerationOutputPorts,
  imageGenerationProviderCapabilityRegistry,
  isImageGenerationNodeProperties,
  listImageGenerationModelCapabilities,
  resolveImageGenerationNodeStatusView,
  resolveImageGenerationNodeStatus,
  type ImageGenerationAspectRatio,
} from "./image-generation-node.ts";

test("image generation node exposes provider-agnostic ports, batch limit, storage, and no secrets", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    batchCount: 5,
  });

  assert.equal(properties.nodeType, IMAGE_GENERATION_NODE_TYPE);
  assert.equal(properties.providerAgnostic, true);
  assert.equal(properties.providerId, "replicate");
  assert.equal(properties.batchCount, 5);
  assert.equal(properties.aspectRatio, "9:16");
  assert.deepEqual(properties.frame, {
    width: 360,
    height: 640,
    resizeMode: "locked-aspect-ratio",
  });
  assert.deepEqual(
    properties.inputs.map((port) => port.id),
    ["prompt", "reference_image", "style_template_vars"],
  );
  assert.deepEqual(
    properties.outputs.map((port) => port.id),
    ["generated_image_asset", "metadata", "cost_usage"],
  );
  assert.deepEqual(properties.storage, {
    canvasJsonPath: "canvas.json",
    assetDirectory: "assets/",
    runHistory: "runs/",
    secretPolicy: "env-or-local-secret-store-only",
  });

  const serialized = JSON.stringify(properties);
  assert.doesNotMatch(serialized, /sk-[a-z0-9]|ghp_|password=|secretValue/i);
  assert.match(serialized, /OWNCANVAS_REPLICATE_API_TOKEN/);
});

test("image generation node defines idle selected running completed and error status model", () => {
  const properties = createImageGenerationNodeProperties();

  assert.deepEqual(imageGenerationNodeStatuses, [
    "idle",
    "selected",
    "running",
    "completed",
    "error",
  ]);
  assert.deepEqual(properties.uiState, {
    viewMode: "compact",
    inspectorOpen: false,
    docsPanelOpen: false,
    referenceTrayOpen: false,
    status: "idle",
    progressPercent: null,
    statusMessage: null,
    errorReason: null,
    outputConnectionReady: false,
  });
  assert.equal(
    resolveImageGenerationNodeStatus({
      selected: true,
      uiState: properties.uiState,
    }),
    "selected",
  );
  assert.equal(
    resolveImageGenerationNodeStatus({
      selected: true,
      uiState: createImageGenerationNodeUiState({
        status: "running",
        progressPercent: 42,
        statusMessage: "Generating preview",
      }),
    }),
    "running",
  );
  assert.equal(
    createImageGenerationNodeUiState({
      status: "completed",
      outputConnectionReady: true,
    }).outputConnectionReady,
    true,
  );
  assert.equal(
    createImageGenerationNodeUiState({
      status: "error",
      errorReason: "Provider rejected unsupported aspect ratio",
    }).errorReason,
    "Provider rejected unsupported aspect ratio",
  );
});

test("image generation node maps lifecycle states to compact view metadata only", () => {
  assert.deepEqual(
    imageGenerationNodeStatuses.map((status) =>
      resolveImageGenerationNodeStatusView(status),
    ),
    [
      {
        status: "idle",
        label: "Idle",
        className: "idle",
        ariaLabel: "Image node status: idle",
      },
      {
        status: "selected",
        label: "Selected",
        className: "selected",
        ariaLabel: "Image node status: selected",
      },
      {
        status: "running",
        label: "Running",
        className: "running",
        ariaLabel: "Image node status: running",
      },
      {
        status: "completed",
        label: "Ready",
        className: "completed",
        ariaLabel: "Image node status: completed",
      },
      {
        status: "error",
        label: "Error",
        className: "error",
        ariaLabel: "Image node status: error",
      },
    ],
  );

  const statusViews = imageGenerationNodeStatuses.map((status) =>
    resolveImageGenerationNodeStatusView(status),
  );
  const serialized = JSON.stringify(statusViews);

  for (const statusView of statusViews) {
    assert.deepEqual(Object.keys(statusView).sort(), [
      "ariaLabel",
      "className",
      "label",
      "status",
    ]);
  }
  assert.doesNotMatch(serialized, /invoke|retry|runGeneration|generateImage/i);
});

test("campaign image block is the MVP image generation node by default", () => {
  const imageBlock = createCampaignBlock("image", 0, { x: 240, y: 160 });

  assert.equal(imageBlock.status, "READY");
  assert.equal(imageBlock.subtitle, "prompt + reference + x1-x5 outputs");
  assert.equal(isImageGenerationNodeProperties(imageBlock.properties), true);

  if (!isImageGenerationNodeProperties(imageBlock.properties)) {
    throw new Error("expected image generation properties");
  }

  assert.deepEqual(imageBlock.properties.inputs, imageGenerationInputPorts);
  assert.deepEqual(imageBlock.properties.outputs, imageGenerationOutputPorts);
  assert.equal(imageBlock.properties.aspectRatio, "9:16");
  assert.deepEqual(imageBlock.properties.frame, {
    width: 360,
    height: 640,
    resizeMode: "locked-aspect-ratio",
  });
  assert.equal(imageBlock.properties.providerPresets.length, 3);
  assert.equal(
    imageBlock.properties.providerPresets.some(
      (provider) => provider.providerId === "freepik-compatible",
    ),
    true,
  );
});

test("image generation frames stay compact canvas-node sized", () => {
  const supportedRatios: ImageGenerationAspectRatio[] = ["16:9", "9:16", "1:1"];

  for (const aspectRatio of supportedRatios) {
    const frame = createImageGenerationFrame(aspectRatio);

    assert.equal(frame.resizeMode, "locked-aspect-ratio");
    assert.equal(
      frame.width >= IMAGE_GENERATION_COMPACT_FRAME_LIMITS.minWidth,
      true,
    );
    assert.equal(
      frame.height >= IMAGE_GENERATION_COMPACT_FRAME_LIMITS.minHeight,
      true,
    );
    assert.equal(
      frame.width <= IMAGE_GENERATION_COMPACT_FRAME_LIMITS.maxWidth,
      true,
    );
    assert.equal(
      frame.height <= IMAGE_GENERATION_COMPACT_FRAME_LIMITS.maxHeight,
      true,
    );
  }
});

test("image generation models expose provider capability metadata", () => {
  const nanoBanana = imageGenerationModelCapabilities.find(
    (model) => model.provider.providerId === "replicate" && model.model.slug === "google/nano-banana",
  );

  assert.ok(nanoBanana, "expected Nano Banana capability metadata");
  assert.deepEqual(nanoBanana.supportedAspectRatios, [
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
  ]);
  assert.equal(nanoBanana.defaultAspectRatio, "9:16");
  assert.equal(nanoBanana.referenceSupport.supported, true);
  assert.equal(nanoBanana.referenceSupport.maxImages, 8);
  assert.equal(nanoBanana.referenceSupport.inputControlId, "reference_images");
  assert.deepEqual(
    nanoBanana.inputControls.map((control) => control.id),
    ["prompt", "reference_images", "aspect_ratio", "output_format"],
  );
  assert.deepEqual(nanoBanana.outputConstraints.formats, ["jpg", "png", "webp"]);

  const gptImage = imageGenerationModelCapabilities.find(
    (model) => model.provider.providerId === "replicate" && model.model.slug === "openai/gpt-image-1",
  );

  assert.ok(gptImage, "expected GPT Image capability metadata");
  assert.equal(gptImage.defaultAspectRatio, "2:3");
  assert.equal(gptImage.supportedAspectRatios.includes("9:16"), false);
  assert.equal(gptImage.outputConstraints.unsupportedDefaultRatioBehavior, "map_nearest");

  const serialized = JSON.stringify(imageGenerationModelCapabilities);
  assert.doesNotMatch(serialized, /sk-[a-z0-9]|ghp_|password=|secretValue/i);
  assert.match(serialized, /OWNCANVAS_REPLICATE_API_TOKEN/);
});

test("initial image model registry entries declare default ratio and supported controls", () => {
  const entries = listImageGenerationModelCapabilities({ providerId: "replicate" });

  assert.deepEqual(
    entries.map((model) => ({
      slug: model.model.slug,
      defaultAspectRatio: model.defaultAspectRatio,
      controlIds: model.inputControls.map((control) => control.id),
    })),
    [
      {
        slug: "google/nano-banana",
        defaultAspectRatio: "9:16",
        controlIds: [
          "prompt",
          "reference_images",
          "aspect_ratio",
          "output_format",
        ],
      },
      {
        slug: "openai/gpt-image-1",
        defaultAspectRatio: "2:3",
        controlIds: [
          "prompt",
          "input_images",
          "aspect_ratio",
          "quality",
          "output_format",
        ],
      },
      {
        slug: "bytedance/seedream-3",
        defaultAspectRatio: "9:16",
        controlIds: [
          "prompt",
          "aspect_ratio",
          "size",
          "guidance_scale",
          "seed",
        ],
      },
    ],
  );

  for (const entry of entries) {
    assert.equal(
      entry.supportedAspectRatios.includes(entry.defaultAspectRatio),
      true,
      `${entry.model.slug} default ratio must be supported by the model entry`,
    );
    assert.equal(
      entry.inputControls.some(
        (control) =>
          control.kind === "aspect_ratio" &&
          control.schemaKey === entry.schemaAdapter.aspectRatioField,
      ),
      entry.capabilities.aspectRatioControl,
      `${entry.model.slug} aspect ratio control should match capability flag`,
    );
  }

  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

  assert.ok(gptImage);
  assert.equal(gptImage.schemaAdapter.referenceImagesField, "input_images");
  assert.equal(gptImage.referenceSupport.inputControlId, "input_images");
  assert.equal(gptImage.supportedAspectRatios.includes("9:16"), false);
  assert.equal(
    gptImage.schemaAdapter.unsupportedRatioBehavior,
    "map_nearest",
  );
});

test("replicate image model entries expose provider-specific schema metadata aligned with adapters", () => {
  const replicateEntries = listImageGenerationModelCapabilities({
    providerId: "replicate",
  });

  assert.equal(replicateEntries.length, 3);

  for (const entry of replicateEntries) {
    assert.equal(entry.replicate?.providerId, "replicate");
    assert.equal(entry.replicate?.inputEnvelopeField, "input");
    assert.equal(
      entry.replicate?.credentialEnvName,
      "OWNCANVAS_REPLICATE_API_TOKEN",
    );
    assert.equal(entry.replicate?.modelRef, entry.model.slug);
    assert.equal(entry.replicate?.schemaInputKeys.required.includes("prompt"), true);

    const adapterInputKeys = [
      entry.schemaAdapter.promptField,
      entry.schemaAdapter.referenceImagesField,
      entry.schemaAdapter.aspectRatioField,
      entry.schemaAdapter.widthField,
      entry.schemaAdapter.heightField,
      entry.schemaAdapter.sizeField,
      entry.schemaAdapter.seedField,
      entry.schemaAdapter.guidanceField,
      entry.schemaAdapter.qualityField,
      entry.schemaAdapter.outputFormatField,
    ].filter((key): key is string => key !== null);

    for (const adapterInputKey of adapterInputKeys) {
      assert.equal(
        [
          ...(entry.replicate?.schemaInputKeys.required ?? []),
          ...(entry.replicate?.schemaInputKeys.optional ?? []),
        ].includes(adapterInputKey),
        true,
        `${entry.model.slug} Replicate schema metadata must include ${adapterInputKey}`,
      );
    }

    assert.equal(
      entry.replicate?.referenceInputMode === "none",
      entry.schemaAdapter.referenceImagesField === null,
    );
  }

  const nanoBanana = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });
  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });
  const seedream = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "bytedance/seedream-3",
  });

  assert.equal(nanoBanana?.replicate?.referenceInputMode, "multi");
  assert.equal(gptImage?.replicate?.referenceInputMode, "single");
  assert.equal(seedream?.replicate?.referenceInputMode, "none");
  assert.deepEqual(seedream?.replicate?.customSizeKeys, {
    size: "size",
    width: null,
    height: null,
  });
});

test("image generation capability registry exposes keyed lookup API", () => {
  assert.equal(
    imageGenerationProviderCapabilityRegistry.version,
    "owncanvas.image-generation.capability-registry.v1",
  );
  assert.deepEqual(imageGenerationProviderCapabilityRegistry.defaultModel, {
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  const nanoBananaKey = createImageGenerationModelCapabilityKey({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  assert.equal(nanoBananaKey, "replicate:google/nano-banana");
  assert.equal(
    imageGenerationProviderCapabilityRegistry.modelsByKey[nanoBananaKey]?.model.slug,
    "google/nano-banana",
  );
  assert.deepEqual(
    imageGenerationProviderCapabilityRegistry.providers.map((provider) => provider.providerId),
    ["replicate"],
  );
  assert.deepEqual(
    imageGenerationProviderCapabilityRegistry.providers[0]?.modelSlugs,
    ["google/nano-banana", "openai/gpt-image-1", "bytedance/seedream-3"],
  );

  const lookedUp = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  assert.ok(lookedUp);
  assert.equal(lookedUp.model.label, "Nano Banana");
  assert.equal(lookedUp.schemaAdapter.promptField, "prompt");
  assert.equal(lookedUp.schemaAdapter.referenceImagesField, "reference_images");

  const missing = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "unknown/model",
  });

  assert.equal(missing, undefined);

  assert.equal(
    getDefaultImageGenerationModelCapability()?.model.slug,
    "google/nano-banana",
  );
  assert.deepEqual(
    listImageGenerationModelCapabilities({ providerId: "replicate" }).map(
      (model) => model.model.slug,
    ),
    ["google/nano-banana", "openai/gpt-image-1", "bytedance/seedream-3"],
  );
});
