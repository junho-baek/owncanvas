import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createCampaignBlock } from "./creative-canvas.ts";
import {
  IMAGE_GENERATION_COMPACT_FRAME_LIMITS,
  IMAGE_GENERATION_DEFAULT_ASPECT_RATIO,
  IMAGE_GENERATION_DEFAULT_FRAME,
  IMAGE_GENERATION_NODE_TYPE,
  createImageGenerationFrame,
  createImageGenerationModelCapabilityKey,
  createImageGenerationNodeProperties,
  createImageGenerationNodeUiState,
  getDefaultImageGenerationModelCapability,
  getImageGenerationModelCapability,
  imageGenerationAspectRatioOptions,
  imageGenerationInputPorts,
  imageGenerationModelCapabilities,
  imageGenerationNodeV2Statuses,
  imageGenerationNodeStatuses,
  imageGenerationOutputPorts,
  imageGenerationProviderCapabilityRegistry,
  isImageGenerationNodeProperties,
  cancelImageGenerationNodeV2Transition,
  completeImageGenerationNodeTransition,
  failImageGenerationNodeV2Transition,
  failImageGenerationNodeTransition,
  queueImageGenerationNodeV2Transition,
  resolveImageGenerationNodeOutputView,
  listImageGenerationModelCapabilities,
  resolveImageGenerationNodeStatusView,
  resolveImageGenerationNodeStatus,
  runImageGenerationNodeV2Transition,
  selectImageGenerationNodeAspectRatioTransition,
  startImageGenerationNodeTransition,
  succeedImageGenerationNodeV2Transition,
  syncImageGenerationNodeSelectedResultTransition,
  validateImageGenerationNodeModelOptions,
  type ImageGenerationAspectRatio,
} from "./image-generation-node.ts";
import {
  imageGenerationModelCapabilityFixtureCases,
  imageGenerationModelCapabilityFixtures,
} from "./image-generation-node.fixtures.ts";

test("image generation node exposes provider-agnostic ports, batch limit, storage, and no secrets", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    batchCount: 5,
  });

  assert.equal(properties.nodeType, IMAGE_GENERATION_NODE_TYPE);
  assert.equal(properties.providerAgnostic, true);
  assert.equal(properties.providerId, "replicate");
  assert.equal(properties.batchCount, 5);
  assert.equal(properties.aspectRatio, IMAGE_GENERATION_DEFAULT_ASPECT_RATIO);
  assert.deepEqual(properties.frame, IMAGE_GENERATION_DEFAULT_FRAME);
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

test("image generation ratio selector transition writes output aspect-ratio state and frame", () => {
  const properties = createImageGenerationNodeProperties();

  assert.deepEqual(imageGenerationAspectRatioOptions, ["9:16", "1:1", "16:9"]);

  const squareProperties = selectImageGenerationNodeAspectRatioTransition(
    properties,
    "1:1",
  );

  assert.equal(squareProperties.aspectRatio, "1:1");
  assert.deepEqual(squareProperties.frame, createImageGenerationFrame("1:1"));
  assert.equal(squareProperties.frame.width, 480);
  assert.equal(squareProperties.frame.height, 480);

  const landscapeProperties = selectImageGenerationNodeAspectRatioTransition(
    squareProperties,
    "16:9",
  );

  assert.equal(landscapeProperties.aspectRatio, "16:9");
  assert.deepEqual(landscapeProperties.frame, createImageGenerationFrame("16:9"));
  assert.equal(landscapeProperties.frame.width, 640);
  assert.equal(landscapeProperties.frame.height, 360);
});

test("image generation node defines idle selected running completed and error status model", () => {
  const properties = createImageGenerationNodeProperties();

  assert.deepEqual(imageGenerationNodeStatuses, [
    "idle",
    "selected",
    "running",
    "completed",
    "error",
    "cancelled",
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
    failureDetails: null,
    selectedResultAssetId: null,
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
      {
        status: "cancelled",
        label: "Cancelled",
        className: "cancelled",
        ariaLabel: "Image node status: cancelled",
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

test("image generation v2 status transitions cover idle queued running succeeded failed and canceled states", () => {
  const baseProperties = createImageGenerationNodeProperties({
    latestResultRefs: {
      generatedAssetIds: ["asset_stale_output"],
      metadataRunId: "run_stale_metadata",
      costUsageRunId: "run_stale_cost",
    },
    uiState: createImageGenerationNodeUiState({
      viewMode: "focused",
      inspectorOpen: true,
      docsPanelOpen: true,
      referenceTrayOpen: true,
      status: "idle",
      progressPercent: 88,
      statusMessage: "Previous output",
      errorReason: "Previous warning",
      outputConnectionReady: true,
      selectedResultAssetId: "asset_stale_output",
    }),
  });

  assert.deepEqual(imageGenerationNodeV2Statuses, [
    "idle",
    "queued",
    "running",
    "succeeded",
    "failed",
    "canceled",
  ]);
  assert.equal(baseProperties.uiState.status, "idle");

  const queuedProperties = queueImageGenerationNodeV2Transition(baseProperties);

  assert.equal(queuedProperties.uiState.status, "queued");
  assert.equal(queuedProperties.uiState.progressPercent, null);
  assert.equal(queuedProperties.uiState.statusMessage, "Generation queued");
  assert.equal(queuedProperties.uiState.errorReason, null);
  assert.equal(queuedProperties.uiState.failureDetails, null);
  assert.equal(queuedProperties.uiState.selectedResultAssetId, null);
  assert.equal(queuedProperties.uiState.outputConnectionReady, false);
  assert.deepEqual(queuedProperties.latestResultRefs, {
    generatedAssetIds: [],
    metadataRunId: null,
    costUsageRunId: null,
  });

  const runningProperties = runImageGenerationNodeV2Transition(queuedProperties);

  assert.equal(runningProperties.uiState.status, "running");
  assert.equal(runningProperties.uiState.progressPercent, 0);
  assert.equal(runningProperties.uiState.statusMessage, "Generation started");

  const succeededProperties = succeedImageGenerationNodeV2Transition(
    runningProperties,
    {
      generatedAssetIds: ["asset_vertical_ad_1", "asset_vertical_ad_2"],
      metadataRunId: "run_image_metadata_1",
      costUsageRunId: "run_image_cost_1",
    },
  );

  assert.equal(succeededProperties.uiState.status, "succeeded");
  assert.equal(succeededProperties.uiState.progressPercent, 100);
  assert.equal(succeededProperties.uiState.statusMessage, "Generation complete");
  assert.equal(succeededProperties.uiState.errorReason, null);
  assert.equal(succeededProperties.uiState.failureDetails, null);
  assert.equal(
    succeededProperties.uiState.selectedResultAssetId,
    "asset_vertical_ad_1",
  );
  assert.equal(succeededProperties.uiState.outputConnectionReady, true);

  const failedProperties = failImageGenerationNodeV2Transition(
    runningProperties,
    {
      name: "ProviderSafetyError",
      message: "Provider rejected unsafe reference image",
      providerId: "replicate",
      modelSlug: "google/nano-banana",
      providerRequestId: "prediction_failed_1",
      retryable: false,
    },
  );

  assert.equal(failedProperties.uiState.status, "failed");
  assert.equal(failedProperties.uiState.progressPercent, null);
  assert.equal(failedProperties.uiState.statusMessage, "Generation failed");
  assert.equal(
    failedProperties.uiState.errorReason,
    "Provider rejected unsafe reference image",
  );
  assert.equal(failedProperties.uiState.outputConnectionReady, false);
  assert.deepEqual(failedProperties.latestResultRefs, {
    generatedAssetIds: [],
    metadataRunId: null,
    costUsageRunId: null,
  });

  const canceledProperties = cancelImageGenerationNodeV2Transition(
    runningProperties,
  );

  assert.equal(canceledProperties.uiState.status, "canceled");
  assert.equal(canceledProperties.uiState.progressPercent, null);
  assert.equal(canceledProperties.uiState.statusMessage, "Generation canceled");
  assert.equal(canceledProperties.uiState.errorReason, null);
  assert.equal(canceledProperties.uiState.failureDetails, null);
  assert.equal(canceledProperties.uiState.outputConnectionReady, false);
  assert.deepEqual(canceledProperties.latestResultRefs, {
    generatedAssetIds: [],
    metadataRunId: null,
    costUsageRunId: null,
  });

  for (const properties of [
    queuedProperties,
    runningProperties,
    succeededProperties,
    failedProperties,
    canceledProperties,
  ]) {
    assert.deepEqual(
      {
        viewMode: properties.uiState.viewMode,
        inspectorOpen: properties.uiState.inspectorOpen,
        docsPanelOpen: properties.uiState.docsPanelOpen,
        referenceTrayOpen: properties.uiState.referenceTrayOpen,
      },
      {
        viewMode: "focused",
        inspectorOpen: true,
        docsPanelOpen: true,
        referenceTrayOpen: true,
      },
    );
  }
});

test("image generation start transition marks status model active in progress", () => {
  const completedProperties = createImageGenerationNodeProperties({
    latestResultRefs: {
      generatedAssetIds: ["asset_previous_output"],
      metadataRunId: "run_previous_metadata",
      costUsageRunId: "run_previous_cost",
    },
    uiState: createImageGenerationNodeUiState({
      viewMode: "focused",
      inspectorOpen: true,
      docsPanelOpen: true,
      referenceTrayOpen: true,
      status: "completed",
      progressPercent: 100,
      statusMessage: "Ready",
      errorReason: "Previous transient provider warning",
      outputConnectionReady: true,
    }),
  });

  const runningProperties =
    startImageGenerationNodeTransition(completedProperties);

  assert.equal(runningProperties.uiState.status, "running");
  assert.equal(runningProperties.uiState.progressPercent, 0);
  assert.equal(runningProperties.uiState.statusMessage, "Generation started");
  assert.equal(runningProperties.uiState.errorReason, null);
  assert.equal(runningProperties.uiState.selectedResultAssetId, null);
  assert.equal(runningProperties.uiState.outputConnectionReady, false);
  assert.deepEqual(runningProperties.latestResultRefs, {
    generatedAssetIds: [],
    metadataRunId: null,
    costUsageRunId: null,
  });
  assert.deepEqual(
    {
      viewMode: runningProperties.uiState.viewMode,
      inspectorOpen: runningProperties.uiState.inspectorOpen,
      docsPanelOpen: runningProperties.uiState.docsPanelOpen,
      referenceTrayOpen: runningProperties.uiState.referenceTrayOpen,
    },
    {
      viewMode: "focused",
      inspectorOpen: true,
      docsPanelOpen: true,
      referenceTrayOpen: true,
    },
  );
  assert.equal(
    resolveImageGenerationNodeStatus({
      selected: true,
      uiState: runningProperties.uiState,
    }),
    "running",
  );
});

test("image generation success transition marks status model completed with output ready", () => {
  const runningProperties = createImageGenerationNodeProperties({
    latestResultRefs: {
      generatedAssetIds: [],
      metadataRunId: null,
      costUsageRunId: null,
    },
    uiState: createImageGenerationNodeUiState({
      viewMode: "focused",
      inspectorOpen: true,
      docsPanelOpen: true,
      referenceTrayOpen: true,
      status: "running",
      progressPercent: 64,
      statusMessage: "Provider is rendering",
      errorReason: "Previous warning",
      outputConnectionReady: false,
    }),
  });

  const completedProperties = completeImageGenerationNodeTransition(
    runningProperties,
    {
      generatedAssetIds: ["asset_vertical_ad_1", "asset_vertical_ad_2"],
      metadataRunId: "run_image_metadata_1",
      costUsageRunId: "run_image_cost_1",
    },
  );

  assert.deepEqual(completedProperties.latestResultRefs, {
    generatedAssetIds: ["asset_vertical_ad_1", "asset_vertical_ad_2"],
    metadataRunId: "run_image_metadata_1",
    costUsageRunId: "run_image_cost_1",
  });
  assert.equal(completedProperties.uiState.status, "completed");
  assert.equal(completedProperties.uiState.progressPercent, 100);
  assert.equal(completedProperties.uiState.statusMessage, "Generation complete");
  assert.equal(completedProperties.uiState.errorReason, null);
  assert.equal(completedProperties.uiState.failureDetails, null);
  assert.equal(
    completedProperties.uiState.selectedResultAssetId,
    "asset_vertical_ad_1",
  );
  assert.equal(completedProperties.uiState.outputConnectionReady, true);
  assert.deepEqual(
    {
      viewMode: completedProperties.uiState.viewMode,
      inspectorOpen: completedProperties.uiState.inspectorOpen,
      docsPanelOpen: completedProperties.uiState.docsPanelOpen,
      referenceTrayOpen: completedProperties.uiState.referenceTrayOpen,
    },
    {
      viewMode: "focused",
      inspectorOpen: true,
      docsPanelOpen: true,
      referenceTrayOpen: true,
    },
  );
  assert.equal(
    resolveImageGenerationNodeStatus({
      selected: true,
      uiState: completedProperties.uiState,
    }),
    "completed",
  );
  assert.deepEqual(resolveImageGenerationNodeOutputView(completedProperties), {
    state: "success",
    label: "Ready",
    className: "success",
    ariaLabel: "Image output area: generated output ready",
  });
});

test("image generation failure transition marks status model error with failure details", () => {
  const runningProperties = createImageGenerationNodeProperties({
    latestResultRefs: {
      generatedAssetIds: ["asset_should_not_be_connectable"],
      metadataRunId: "run_stale_metadata",
      costUsageRunId: "run_stale_cost",
    },
    uiState: createImageGenerationNodeUiState({
      viewMode: "focused",
      inspectorOpen: true,
      docsPanelOpen: true,
      referenceTrayOpen: true,
      status: "running",
      progressPercent: 72,
      statusMessage: "Provider is rendering",
      errorReason: null,
      outputConnectionReady: true,
    }),
  });

  const failedProperties = failImageGenerationNodeTransition(runningProperties, {
    name: "ProviderSafetyError",
    message: "Provider rejected unsafe reference image",
    providerId: "replicate",
    modelSlug: "google/nano-banana",
    providerRequestId: "prediction_failed_1",
    retryable: false,
  });

  assert.deepEqual(failedProperties.latestResultRefs, {
    generatedAssetIds: [],
    metadataRunId: null,
    costUsageRunId: null,
  });
  assert.equal(failedProperties.uiState.status, "error");
  assert.equal(failedProperties.uiState.progressPercent, null);
  assert.equal(failedProperties.uiState.statusMessage, "Generation failed");
  assert.equal(
    failedProperties.uiState.errorReason,
    "Provider rejected unsafe reference image",
  );
  assert.deepEqual(failedProperties.uiState.failureDetails, {
    name: "ProviderSafetyError",
    message: "Provider rejected unsafe reference image",
    providerId: "replicate",
    modelSlug: "google/nano-banana",
    providerRequestId: "prediction_failed_1",
    retryable: false,
  });
  assert.equal(failedProperties.uiState.outputConnectionReady, false);
  assert.equal(failedProperties.uiState.selectedResultAssetId, null);
  assert.deepEqual(
    {
      viewMode: failedProperties.uiState.viewMode,
      inspectorOpen: failedProperties.uiState.inspectorOpen,
      docsPanelOpen: failedProperties.uiState.docsPanelOpen,
      referenceTrayOpen: failedProperties.uiState.referenceTrayOpen,
    },
    {
      viewMode: "focused",
      inspectorOpen: true,
      docsPanelOpen: true,
      referenceTrayOpen: true,
    },
  );
  assert.equal(
    resolveImageGenerationNodeStatus({
      selected: true,
      uiState: failedProperties.uiState,
    }),
    "error",
  );
  assert.deepEqual(resolveImageGenerationNodeOutputView(failedProperties), {
    state: "error",
    label: "Error",
    className: "error",
    ariaLabel: "Image output area: Provider rejected unsafe reference image",
  });
});

test("image generation output selection keeps status model synchronized with selected result", () => {
  const completedProperties = completeImageGenerationNodeTransition(
    createImageGenerationNodeProperties({
      uiState: createImageGenerationNodeUiState({
        viewMode: "focused",
        inspectorOpen: true,
        docsPanelOpen: true,
        referenceTrayOpen: true,
        status: "running",
        progressPercent: 74,
      }),
    }),
    {
      generatedAssetIds: ["asset_vertical_ad_1", "asset_vertical_ad_2"],
      metadataRunId: "run_image_metadata_1",
      costUsageRunId: "run_image_cost_1",
    },
  );

  assert.equal(completedProperties.uiState.selectedResultAssetId, "asset_vertical_ad_1");
  assert.equal(completedProperties.uiState.status, "completed");
  assert.equal(completedProperties.uiState.outputConnectionReady, true);

  const secondSelection = syncImageGenerationNodeSelectedResultTransition(
    completedProperties,
    "asset_vertical_ad_2",
  );

  assert.equal(
    secondSelection.uiState.selectedResultAssetId,
    "asset_vertical_ad_2",
  );
  assert.equal(secondSelection.uiState.status, "completed");
  assert.equal(secondSelection.uiState.statusMessage, "Output selected");
  assert.equal(secondSelection.uiState.outputConnectionReady, true);
  assert.deepEqual(resolveImageGenerationNodeOutputView(secondSelection), {
    state: "success",
    label: "Ready",
    className: "success",
    ariaLabel: "Image output area: generated output ready",
  });

  const missingSelection = syncImageGenerationNodeSelectedResultTransition(
    secondSelection,
    "asset_removed_by_output_change",
  );

  assert.equal(missingSelection.uiState.selectedResultAssetId, null);
  assert.equal(missingSelection.uiState.status, "completed");
  assert.equal(missingSelection.uiState.statusMessage, "Select an output");
  assert.equal(missingSelection.uiState.outputConnectionReady, false);
  assert.deepEqual(resolveImageGenerationNodeOutputView(missingSelection), {
    state: "empty-output",
    label: "Empty",
    className: "empty-output",
    ariaLabel: "Image output area: no generated output returned",
  });
  assert.deepEqual(
    {
      viewMode: missingSelection.uiState.viewMode,
      inspectorOpen: missingSelection.uiState.inspectorOpen,
      docsPanelOpen: missingSelection.uiState.docsPanelOpen,
      referenceTrayOpen: missingSelection.uiState.referenceTrayOpen,
    },
    {
      viewMode: "focused",
      inspectorOpen: true,
      docsPanelOpen: true,
      referenceTrayOpen: true,
    },
  );
});

test("image generation node maps output area success error cancelled and empty-output states", () => {
  const baseProperties = createImageGenerationNodeProperties();

  assert.deepEqual(
    [
      resolveImageGenerationNodeOutputView(baseProperties),
      resolveImageGenerationNodeOutputView(
        createImageGenerationNodeProperties({
          latestResultRefs: {
            generatedAssetIds: ["asset_vertical_ad_1"],
            metadataRunId: "run_image_1",
            costUsageRunId: null,
          },
          uiState: createImageGenerationNodeUiState({
            status: "completed",
            selectedResultAssetId: "asset_vertical_ad_1",
            outputConnectionReady: true,
          }),
        }),
      ),
      resolveImageGenerationNodeOutputView(
        createImageGenerationNodeProperties({
          uiState: createImageGenerationNodeUiState({
            status: "completed",
            statusMessage: "Provider returned no image output",
          }),
        }),
      ),
      resolveImageGenerationNodeOutputView(
        createImageGenerationNodeProperties({
          uiState: createImageGenerationNodeUiState({
            status: "error",
            errorReason: "Provider rejected unsupported aspect ratio",
          }),
        }),
      ),
      resolveImageGenerationNodeOutputView(
        createImageGenerationNodeProperties({
          uiState: createImageGenerationNodeUiState({
            status: "cancelled",
            statusMessage: "Generation cancelled",
          }),
        }),
      ),
    ],
    [
      {
        state: "empty-output",
        label: "Empty",
        className: "empty-output",
        ariaLabel: "Image output area: no output yet",
      },
      {
        state: "success",
        label: "Ready",
        className: "success",
        ariaLabel: "Image output area: generated output ready",
      },
      {
        state: "empty-output",
        label: "Empty",
        className: "empty-output",
        ariaLabel: "Image output area: no generated output returned",
      },
      {
        state: "error",
        label: "Error",
        className: "error",
        ariaLabel: "Image output area: Provider rejected unsupported aspect ratio",
      },
      {
        state: "cancelled",
        label: "Cancelled",
        className: "cancelled",
        ariaLabel: "Image output area: generation cancelled",
      },
    ],
  );
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
  assert.equal(
    imageBlock.properties.aspectRatio,
    IMAGE_GENERATION_DEFAULT_ASPECT_RATIO,
  );
  assert.deepEqual(imageBlock.properties.frame, IMAGE_GENERATION_DEFAULT_FRAME);
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

    if (aspectRatio === IMAGE_GENERATION_DEFAULT_ASPECT_RATIO) {
      assert.deepEqual(frame, IMAGE_GENERATION_DEFAULT_FRAME);
    }

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

test("model capability fixtures cover vertical defaults and restricted unsupported options", () => {
  assert.equal(imageGenerationModelCapabilityFixtureCases.length >= 2, true);
  assert.equal(
    imageGenerationModelCapabilityFixtures.length,
    imageGenerationModelCapabilityFixtureCases.length,
  );

  for (const fixtureCase of imageGenerationModelCapabilityFixtureCases) {
    const { capability, expectations } = fixtureCase;
    const supportedControlKinds = new Set(
      capability.inputControls.map((control) => control.kind),
    );

    assert.equal(
      capability.defaultAspectRatio,
      expectations.defaultAspectRatio,
      `${fixtureCase.id} default aspect ratio`,
    );
    assert.equal(
      capability.schemaAdapter.unsupportedRatioBehavior,
      expectations.unsupportedRatioBehavior,
      `${fixtureCase.id} unsupported ratio behavior`,
    );
    assert.equal(
      capability.referenceSupport.maxImages,
      expectations.maxReferenceImages,
      `${fixtureCase.id} max reference images`,
    );

    for (const aspectRatio of expectations.supportedAspectRatiosInclude) {
      assert.equal(
        capability.supportedAspectRatios.includes(aspectRatio),
        true,
        `${fixtureCase.id} should support ${aspectRatio}`,
      );
    }

    for (const aspectRatio of expectations.unsupportedAspectRatios) {
      assert.equal(
        capability.supportedAspectRatios.includes(aspectRatio),
        false,
        `${fixtureCase.id} should not support ${aspectRatio}`,
      );
    }

    for (const controlKind of expectations.unsupportedControlKinds) {
      assert.equal(
        supportedControlKinds.has(controlKind),
        false,
        `${fixtureCase.id} should not expose unsupported ${controlKind} control`,
      );
    }
  }

  const hasVerticalNineBySixteenDefault =
    imageGenerationModelCapabilityFixtureCases.some(
      ({ capability }) => capability.defaultAspectRatio === "9:16",
    );
  const hasRestrictedUnsupportedOptions =
    imageGenerationModelCapabilityFixtureCases.some(
      ({ expectations }) =>
        expectations.unsupportedAspectRatios.length > 0 ||
        expectations.unsupportedControlKinds.length > 0,
    );

  assert.equal(hasVerticalNineBySixteenDefault, true);
  assert.equal(hasRestrictedUnsupportedOptions, true);
});

test("unsupported model options are hidden disabled or rejected by capability schema", () => {
  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });
  const seedream = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "bytedance/seedream-3",
  });

  assert.ok(gptImage);
  assert.ok(seedream);

  assert.deepEqual(gptImage.controlMetadata.supportedControls, [
    "prompt",
    "reference_images",
    "aspect_ratio",
    "quality",
    "output_format",
  ]);
  assert.equal(gptImage.controlMetadata.supportedControls.includes("seed"), false);
  assert.equal(
    gptImage.controlMetadata.supportedControls.includes("guidance"),
    false,
  );
  assert.equal(gptImage.controlMetadata.supportedControls.includes("size"), false);

  const gptAspectRatioControl = gptImage.inputControls.find(
    (control) => control.id === "aspect_ratio",
  );

  assert.deepEqual(gptAspectRatioControl?.options, ["1:1", "2:3", "3:2"]);
  assert.equal(gptAspectRatioControl?.options?.includes("9:16"), false);

  assert.deepEqual(
    validateImageGenerationNodeModelOptions(gptImage, {
      aspectRatio: "9:16",
    }),
    {
      valid: true,
      issues: [
        {
          code: "image_generation.aspect_ratio_mapped",
          severity: "warning",
          controlId: "aspect_ratio",
          message: "9:16 is not native to GPT Image.",
          guidance:
            "Map this request to the nearest model-supported aspect ratio before sending it to the provider.",
          supportedValues: ["1:1", "2:3", "3:2"],
        },
      ],
      feedback: {
        state: "warning",
        label: "Needs mapping",
        className: "warning",
        ariaLabel: "Image generation options need provider mapping",
        message: "9:16 is not native to GPT Image.",
      },
    },
  );

  const rejectedGptOptions = validateImageGenerationNodeModelOptions(gptImage, {
    controlValues: {
      seed: 12345,
      output_format: "jpg",
    },
    referenceImages: [
      { type: "asset", ref: "asset_reference_1" },
      { type: "url", ref: "https://example.com/reference.png" },
    ],
  });

  assert.equal(rejectedGptOptions.valid, false);
  assert.equal(rejectedGptOptions.feedback.state, "invalid");
  assert.deepEqual(
    rejectedGptOptions.issues.map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      controlId: issue.controlId,
      supportedValues: issue.supportedValues,
    })),
    [
      {
        code: "image_generation.control_unsupported",
        severity: "error",
        controlId: "seed",
        supportedValues: [
          "prompt",
          "input_images",
          "aspect_ratio",
          "quality",
          "output_format",
        ],
      },
      {
        code: "image_generation.control_value_invalid",
        severity: "error",
        controlId: "output_format",
        supportedValues: ["png", "webp"],
      },
      {
        code: "image_generation.reference_count_invalid",
        severity: "error",
        controlId: "input_images",
        supportedValues: undefined,
      },
    ],
  );

  const disabledSeedreamRatio = validateImageGenerationNodeModelOptions(seedream, {
    aspectRatio: "4:5",
  });

  assert.equal(disabledSeedreamRatio.valid, false);
  assert.deepEqual(disabledSeedreamRatio.issues, [
    {
      code: "image_generation.aspect_ratio_unsupported",
      severity: "error",
      controlId: "aspect_ratio",
      message: "4:5 is not supported by Seedream 3.",
      guidance: "Pick a supported aspect ratio or change image model.",
      supportedValues: [
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
  ]);

  const rejectedSeedreamReference = validateImageGenerationNodeModelOptions(
    seedream,
    {
      referenceImages: [{ type: "asset", ref: "asset_reference_1" }],
    },
  );

  assert.deepEqual(
    rejectedSeedreamReference.issues.map((issue) => issue.code),
    [
      "image_generation.reference_unsupported",
      "image_generation.reference_count_invalid",
      "image_generation.reference_type_invalid",
    ],
  );
  assert.equal(rejectedSeedreamReference.feedback.label, "Unsupported");
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
