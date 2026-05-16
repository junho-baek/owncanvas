import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createCampaignBlock } from "./creative-canvas.ts";
import {
  IMAGE_GENERATION_COMPACT_FRAME_LIMITS,
  IMAGE_GENERATION_DEFAULT_ASPECT_RATIO,
  IMAGE_GENERATION_DEFAULT_FRAME,
  IMAGE_GENERATION_NODE_TYPE,
  attachImageGenerationNodeReferenceTransition,
  closeImageGenerationNodeInspectorTransition,
  createImageGenerationFrame,
  createImageGenerationModelCapabilityKey,
  createImageGenerationNodeProperties,
  createImageGenerationNodeProviderRequest,
  createImageGenerationNodeUiState,
  createImageGenerationReferenceAttachmentId,
  getDefaultImageGenerationModelCapability,
  getImageGenerationModelCapability,
  imageGenerationAspectRatioCompatibilityMapping,
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
  listImageGenerationReferenceTrayAttachments,
  openImageGenerationNodeInspectorTransition,
  queueImageGenerationNodeV2Transition,
  reorderImageGenerationNodeReferenceTransition,
  removeImageGenerationNodeReferenceTransition,
  resetImageGenerationNodeFrameToAspectRatioTransition,
  resolveImageGenerationAspectRatioCompatibilityRule,
  resolveImageGenerationAspectRatioSelectorOptions,
  resolveImageGenerationDocsPanelMetadata,
  resizeImageGenerationNodeFrameTransition,
  resolveImageGenerationReferenceTrayCapability,
  resolveImageGenerationReferenceTrayEmptyState,
  resolveImageGenerationNodeOutputView,
  listImageGenerationModelCapabilities,
  resolveImageGenerationNodeStatusView,
  resolveImageGenerationNodeStatus,
  runImageGenerationNodeV2Transition,
  selectImageGenerationNodeAspectRatioTransition,
  startImageGenerationNodeTransition,
  succeedImageGenerationNodeV2Transition,
  syncImageGenerationNodeFrameFromAspectRatioTransition,
  syncImageGenerationNodeSelectedResultTransition,
  validateImageGenerationReferenceAttachmentDraft,
  validateImageGenerationNodeModelOptions,
  imageGenerationOutputNextNodeMappings,
  resolveImageGenerationOutputNextNodeActions,
  resolveImageGenerationOutputNextNodeMapping,
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
  assert.equal(squareProperties.frame.source, "aspect-ratio");

  const landscapeProperties = selectImageGenerationNodeAspectRatioTransition(
    squareProperties,
    "16:9",
  );

  assert.equal(landscapeProperties.aspectRatio, "16:9");
  assert.deepEqual(landscapeProperties.frame, createImageGenerationFrame("16:9"));
  assert.equal(landscapeProperties.frame.width, 640);
  assert.equal(landscapeProperties.frame.height, 360);
  assert.equal(landscapeProperties.frame.source, "aspect-ratio");
});

test("image generation automatic frame sync follows aspect-ratio updates while frame is automatic", () => {
  const properties = createImageGenerationNodeProperties();

  assert.equal(properties.aspectRatio, "9:16");
  assert.deepEqual(properties.frame, createImageGenerationFrame("9:16"));

  const squareProperties = selectImageGenerationNodeAspectRatioTransition(
    properties,
    "1:1",
  );
  const landscapeProperties = selectImageGenerationNodeAspectRatioTransition(
    squareProperties,
    "16:9",
  );

  assert.deepEqual(squareProperties.frame, createImageGenerationFrame("1:1"));
  assert.equal(squareProperties.frame.source, "aspect-ratio");
  assert.deepEqual(landscapeProperties.frame, createImageGenerationFrame("16:9"));
  assert.equal(landscapeProperties.frame.source, "aspect-ratio");
});

test("image generation manual frame override blocks automatic aspect-ratio resync", () => {
  const properties = createImageGenerationNodeProperties();
  const manuallyResizedProperties = resizeImageGenerationNodeFrameTransition(
    properties,
    {
      width: 388,
      height: 640,
    },
  );

  const ratioChangedProperties = selectImageGenerationNodeAspectRatioTransition(
    manuallyResizedProperties,
    "1:1",
  );
  const automaticSyncProperties =
    syncImageGenerationNodeFrameFromAspectRatioTransition(ratioChangedProperties);

  assert.equal(ratioChangedProperties.aspectRatio, "1:1");
  assert.deepEqual(ratioChangedProperties.frame, {
    width: 388,
    height: 640,
    resizeMode: "locked-aspect-ratio",
    source: "user-resize",
  });
  assert.equal(automaticSyncProperties, ratioChangedProperties);
  assert.notDeepEqual(
    automaticSyncProperties.frame,
    createImageGenerationFrame("1:1"),
  );
});

test("image generation reset clears manual frame override and restores automatic sync", () => {
  const properties = createImageGenerationNodeProperties();
  const manuallyResizedProperties = resizeImageGenerationNodeFrameTransition(
    properties,
    {
      width: 388,
      height: 640,
    },
  );
  const ratioChangedProperties = selectImageGenerationNodeAspectRatioTransition(
    manuallyResizedProperties,
    "1:1",
  );

  const resetProperties = resetImageGenerationNodeFrameToAspectRatioTransition(
    ratioChangedProperties,
  );
  const nextAutomaticProperties = selectImageGenerationNodeAspectRatioTransition(
    resetProperties,
    "16:9",
  );

  assert.equal(resetProperties.aspectRatio, "1:1");
  assert.deepEqual(resetProperties.frame, createImageGenerationFrame("1:1"));
  assert.equal(resetProperties.frame.source, "aspect-ratio");
  assert.equal(nextAutomaticProperties.aspectRatio, "16:9");
  assert.deepEqual(
    nextAutomaticProperties.frame,
    createImageGenerationFrame("16:9"),
  );
  assert.equal(nextAutomaticProperties.frame.source, "aspect-ratio");
});

test("image generation frame records whether size came from ratio automation or manual resize", () => {
  const properties = createImageGenerationNodeProperties();

  assert.equal(properties.frame.source, "aspect-ratio");

  const manuallyResizedProperties = resizeImageGenerationNodeFrameTransition(
    properties,
    {
      width: 388,
      height: 640,
    },
  );

  assert.equal(manuallyResizedProperties.aspectRatio, "9:16");
  assert.equal(manuallyResizedProperties.frame.width, 388);
  assert.equal(manuallyResizedProperties.frame.height, 640);
  assert.equal(manuallyResizedProperties.frame.resizeMode, "locked-aspect-ratio");
  assert.equal(manuallyResizedProperties.frame.source, "user-resize");

  const ratioChangedProperties = selectImageGenerationNodeAspectRatioTransition(
    manuallyResizedProperties,
    "1:1",
  );

  assert.equal(ratioChangedProperties.aspectRatio, "1:1");
  assert.equal(ratioChangedProperties.frame.width, 388);
  assert.equal(ratioChangedProperties.frame.height, 640);
  assert.equal(ratioChangedProperties.frame.resizeMode, "locked-aspect-ratio");
  assert.equal(ratioChangedProperties.frame.source, "user-resize");

  const automaticSyncProperties =
    syncImageGenerationNodeFrameFromAspectRatioTransition(ratioChangedProperties);

  assert.equal(automaticSyncProperties.aspectRatio, "1:1");
  assert.equal(automaticSyncProperties.frame.width, 388);
  assert.equal(automaticSyncProperties.frame.height, 640);
  assert.equal(automaticSyncProperties.frame.source, "user-resize");

  const resetProperties = resetImageGenerationNodeFrameToAspectRatioTransition(
    automaticSyncProperties,
  );

  assert.equal(resetProperties.aspectRatio, "1:1");
  assert.deepEqual(resetProperties.frame, createImageGenerationFrame("1:1"));
  assert.equal(resetProperties.frame.source, "aspect-ratio");
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

test("image generation node inspector trigger opens external settings and docs surfaces", () => {
  const properties = createImageGenerationNodeProperties();
  const openedProperties = openImageGenerationNodeInspectorTransition(properties);

  assert.equal(openedProperties.uiState.viewMode, "compact");
  assert.equal(openedProperties.uiState.inspectorOpen, true);
  assert.equal(openedProperties.uiState.docsPanelOpen, true);
  assert.equal(openedProperties.uiState.referenceTrayOpen, false);
  assert.equal(openedProperties.frame, properties.frame);
});

test("image generation node inspector close hides external surfaces only", () => {
  const properties = createImageGenerationNodeProperties();
  const openedProperties = openImageGenerationNodeInspectorTransition(properties);
  const closedProperties =
    closeImageGenerationNodeInspectorTransition(openedProperties);

  assert.equal(closedProperties.uiState.viewMode, "compact");
  assert.equal(closedProperties.uiState.inspectorOpen, false);
  assert.equal(closedProperties.uiState.docsPanelOpen, false);
  assert.equal(closedProperties.uiState.referenceTrayOpen, false);
  assert.equal(closedProperties.frame, openedProperties.frame);
  assert.equal(closedProperties.providerId, openedProperties.providerId);
  assert.equal(closedProperties.modelSlug, openedProperties.modelSlug);
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

test("image generation output next-node actions expose provider-aware availability", () => {
  const nanoBananaActions = resolveImageGenerationOutputNextNodeActions(
    createImageGenerationNodeProperties({
      providerId: "replicate",
      modelSlug: "google/nano-banana",
    }),
  );

  assert.deepEqual(
    nanoBananaActions.map((action) => ({
      kind: action.kind,
      label: action.label,
      availability: action.availability,
      disabledReason: action.disabledReason,
    })),
    [
      {
        kind: "image-edit",
        label: "Image edit",
        availability: "available",
        disabledReason: null,
      },
      {
        kind: "style-variant",
        label: "Style variant",
        availability: "available",
        disabledReason: null,
      },
      {
        kind: "upscale",
        label: "Upscale",
        availability: "disabled",
        disabledReason:
          "Nano Banana does not expose provider size controls for upscaling.",
      },
      {
        kind: "video",
        label: "Video Block source",
        availability: "disabled",
        disabledReason: "No video provider is connected for this Image Block yet.",
      },
      {
        kind: "output-card",
        label: "Output / result card",
        availability: "available",
        disabledReason: null,
      },
      {
        kind: "landing-asset",
        label: "Landing asset",
        availability: "available",
        disabledReason: null,
      },
    ],
  );

  const seedreamActions = resolveImageGenerationOutputNextNodeActions(
    createImageGenerationNodeProperties({
      providerId: "replicate",
      modelSlug: "bytedance/seedream-3",
    }),
  );

  assert.deepEqual(
    seedreamActions
      .filter((action) =>
        ["image-edit", "style-variant", "upscale", "video"].includes(
          action.kind,
        ),
      )
      .map((action) => ({
        kind: action.kind,
        availability: action.availability,
        disabledReason: action.disabledReason,
      })),
    [
      {
        kind: "image-edit",
        availability: "disabled",
        disabledReason:
          "Seedream 3 does not accept generated images for editing.",
      },
      {
        kind: "style-variant",
        availability: "disabled",
        disabledReason:
          "Seedream 3 does not accept reference images for style variants.",
      },
      {
        kind: "upscale",
        availability: "available",
        disabledReason: null,
      },
      {
        kind: "video",
        availability: "disabled",
        disabledReason: "No video provider is connected for this Image Block yet.",
      },
    ],
  );

  assert.doesNotMatch(
    JSON.stringify(nanoBananaActions),
    /sk-[a-z0-9]|ghp_|password=|secretValue|apiKey|credentialValue|tokenValue/i,
  );
});

test("image generation output next-node mappings define node targets and selected output payload fields", () => {
  assert.deepEqual(
    imageGenerationOutputNextNodeMappings.map((mapping) => ({
      actionKind: mapping.actionKind,
      requiredNodeType: mapping.requiredNodeType,
      targetNodeKind: mapping.targetNodeKind,
      targetInputPort: mapping.targetInputPort,
      edgeLabel: mapping.edgeLabel,
      defaultConfig: mapping.defaultConfig,
      selectedOutputPayloadFields: mapping.selectedOutputPayloadFields,
    })),
    [
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
        selectedOutputPayloadFields: [
          "sourceImageNodeId",
          "sourceOutputAssetId",
          "nextNodeActionKind",
        ],
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
        selectedOutputPayloadFields: [
          "sourceImageNodeId",
          "sourceOutputAssetId",
          "nextNodeActionKind",
        ],
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
        selectedOutputPayloadFields: [
          "sourceImageNodeId",
          "sourceOutputAssetId",
          "nextNodeActionKind",
        ],
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
        selectedOutputPayloadFields: [
          "sourceImageNodeId",
          "sourceOutputAssetId",
          "nextNodeActionKind",
        ],
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
        selectedOutputPayloadFields: [
          "sourceImageNodeId",
          "sourceOutputAssetId",
          "nextNodeActionKind",
        ],
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
        selectedOutputPayloadFields: [
          "sourceImageNodeId",
          "sourceOutputAssetId",
          "nextNodeActionKind",
        ],
      },
    ],
  );

  assert.deepEqual(
    resolveImageGenerationOutputNextNodeMapping("output-card").defaultConfig,
    {
      nodeTitle: "Output / result card",
      nodeSubtitle: "Creative Output pin",
      nodeDescription:
        "Pins a selected image generation result as a reusable canvas output.",
      nodeStatus: "READY",
      connectionPurpose: "creative-output-pin",
    },
  );
});

test("campaign image block is the MVP image generation node by default", () => {
  const imageBlock = createCampaignBlock("image", 0, { x: 240, y: 160 });

  assert.equal(imageBlock.status, "READY");
  assert.equal(imageBlock.subtitle, "prompt + reference + image assets");
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
    assert.equal(frame.source, "aspect-ratio");
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

test("image generation docs panel metadata exposes selected provider model controls and warnings", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });
  const docsMetadata = resolveImageGenerationDocsPanelMetadata(properties);

  assert.deepEqual(docsMetadata.provider, {
    providerId: "replicate",
    name: "Replicate",
    credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
    credentialStatus: {
      state: "missing",
      label: "Environment variable missing",
      envName: "OWNCANVAS_REPLICATE_API_TOKEN",
      message: "Set OWNCANVAS_REPLICATE_API_TOKEN before running provider requests.",
    },
  });
  assert.deepEqual(docsMetadata.selectedModel, {
    slug: "openai/gpt-image-1",
    name: "GPT Image",
  });
  assert.deepEqual(docsMetadata.supportedRatios, ["1:1", "2:3", "3:2"]);
  assert.deepEqual(
    docsMetadata.requiredInputs.map((control) => ({
      id: control.id,
      schemaKey: control.schemaKey,
      kind: control.kind,
      visibility: control.visibility,
    })),
    [
      {
        id: "prompt",
        schemaKey: "prompt",
        kind: "prompt",
        visibility: "compact",
      },
    ],
  );
  assert.deepEqual(
    docsMetadata.optionalControls.map((control) => ({
      id: control.id,
      schemaKey: control.schemaKey,
      kind: control.kind,
      visibility: control.visibility,
      options: control.options,
    })),
    [
      {
        id: "input_images",
        schemaKey: "input_images",
        kind: "reference_images",
        visibility: "compact",
        options: [],
      },
      {
        id: "aspect_ratio",
        schemaKey: "aspect_ratio",
        kind: "aspect_ratio",
        visibility: "inspector",
        options: ["1:1", "2:3", "3:2"],
      },
      {
        id: "quality",
        schemaKey: "quality",
        kind: "quality",
        visibility: "inspector",
        options: ["auto", "low", "medium", "high"],
      },
      {
        id: "output_format",
        schemaKey: "output_format",
        kind: "output_format",
        visibility: "inspector",
        options: ["png", "webp"],
      },
    ],
  );
  assert.deepEqual(docsMetadata.compatibilityWarnings, [
    "9:16 is not native to GPT Image.",
    "This model accepts one reference image.",
  ]);

  const serialized = JSON.stringify(docsMetadata);
  assert.doesNotMatch(
    serialized,
    /sk-[a-z0-9]|ghp_|password=|secretValue|apiKey|credentialValue|tokenValue/i,
  );
  assert.match(serialized, /OWNCANVAS_REPLICATE_API_TOKEN/);
});

test("image generation docs panel metadata resolves credential status states without secrets", () => {
  const baseProperties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });
  const replicatePreset = baseProperties.providerPresets.find(
    (providerPreset) => providerPreset.providerId === "replicate",
  );

  assert.ok(replicatePreset, "expected Replicate provider preset");

  const credentialStatusCases = [
    {
      name: "configured",
      providerPreset: {
        ...replicatePreset,
        credentialStatus: {
          state: "configured" as const,
          message: "Replicate credential is available in the local environment.",
        },
      },
      expected: {
        state: "configured",
        label: "Environment variable configured",
        envName: "OWNCANVAS_REPLICATE_API_TOKEN",
        message: "Replicate credential is available in the local environment.",
      },
    },
    {
      name: "missing",
      providerPreset: replicatePreset,
      expected: {
        state: "missing",
        label: "Environment variable missing",
        envName: "OWNCANVAS_REPLICATE_API_TOKEN",
        message: "Set OWNCANVAS_REPLICATE_API_TOKEN before running provider requests.",
      },
    },
    {
      name: "error",
      providerPreset: {
        ...replicatePreset,
        credentialStatus: {
          state: "error" as const,
          message: "Credential check failed; provider requests are disabled.",
        },
      },
      expected: {
        state: "error",
        label: "Credential check error",
        envName: "OWNCANVAS_REPLICATE_API_TOKEN",
        message: "Credential check failed; provider requests are disabled.",
      },
    },
    {
      name: "disabled",
      providerPreset: {
        ...replicatePreset,
        secretEnvName: "",
        credentialStatus: {
          state: "disabled" as const,
          message: "Provider credential checks are disabled for this preset.",
        },
      },
      expected: {
        state: "disabled",
        label: "Credential disabled",
        envName: null,
        message: "Provider credential checks are disabled for this preset.",
      },
    },
  ];

  for (const credentialStatusCase of credentialStatusCases) {
    const docsMetadata = resolveImageGenerationDocsPanelMetadata({
      ...baseProperties,
      providerPresets: baseProperties.providerPresets.map((providerPreset) =>
        providerPreset.providerId === "replicate"
          ? credentialStatusCase.providerPreset
          : providerPreset,
      ),
    });

    assert.deepEqual(
      docsMetadata.provider.credentialStatus,
      credentialStatusCase.expected,
      credentialStatusCase.name,
    );

    const serialized = JSON.stringify(docsMetadata.provider.credentialStatus);
    assert.doesNotMatch(
      serialized,
      /sk-[a-z0-9]|ghp_|password=|secretValue|apiKey|credentialValue|tokenValue/i,
    );
  }
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

test("image generation provider config shares aspect-ratio compatibility mapping", () => {
  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

  assert.ok(gptImage);

  assert.deepEqual(
    imageGenerationAspectRatioCompatibilityMapping[
      "replicate:openai/gpt-image-1"
    ],
    [
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
  );

  assert.deepEqual(
    resolveImageGenerationAspectRatioCompatibilityRule(gptImage, "9:16"),
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
  );

  assert.deepEqual(
    resolveImageGenerationAspectRatioCompatibilityRule(gptImage, "1:1"),
    {
      providerId: "replicate",
      modelSlug: "openai/gpt-image-1",
      requestedAspectRatio: "1:1",
      providerAspectRatio: "1:1",
      behavior: "native",
      message: "1:1 is native to GPT Image.",
      guidance: "Send the selected aspect ratio to the provider unchanged.",
    },
  );

  assert.deepEqual(
    resolveImageGenerationAspectRatioCompatibilityRule(gptImage, "16:9"),
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
  );
});

test("image generation ratio selector marks provider-native mapped and disabled options", () => {
  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

  assert.ok(gptImage);

  assert.deepEqual(resolveImageGenerationAspectRatioSelectorOptions(gptImage), [
    {
      aspectRatio: "9:16",
      providerAspectRatio: "2:3",
      label: "9:16 -> 2:3",
      availability: "mapped",
      disabled: false,
      compatibilityMessage: "9:16 is not native to GPT Image.",
      guidance:
        "Map this request to the nearest model-supported aspect ratio before sending it to the provider.",
    },
    {
      aspectRatio: "1:1",
      providerAspectRatio: "1:1",
      label: "1:1",
      availability: "native",
      disabled: false,
      compatibilityMessage: null,
      guidance: null,
    },
    {
      aspectRatio: "16:9",
      providerAspectRatio: "3:2",
      label: "16:9 -> 3:2",
      availability: "mapped",
      disabled: false,
      compatibilityMessage: "16:9 is not native to GPT Image.",
      guidance:
        "Map this request to the nearest model-supported aspect ratio before sending it to the provider.",
    },
  ]);

  const disableOnlyCapability = {
    ...gptImage,
    model: {
      ...gptImage.model,
      slug: "custom/disable-ratio-model",
      label: "Disable Ratio Model",
    },
    schemaAdapter: {
      ...gptImage.schemaAdapter,
      unsupportedRatioBehavior: "disable" as const,
    },
  };

  assert.deepEqual(
    resolveImageGenerationAspectRatioSelectorOptions(disableOnlyCapability).map(
      (option) => ({
        aspectRatio: option.aspectRatio,
        providerAspectRatio: option.providerAspectRatio,
        label: option.label,
        availability: option.availability,
        disabled: option.disabled,
        compatibilityMessage: option.compatibilityMessage,
      }),
    ),
    [
      {
        aspectRatio: "9:16",
        providerAspectRatio: "9:16",
        label: "9:16",
        availability: "disabled",
        disabled: true,
        compatibilityMessage: "9:16 is not supported by Disable Ratio Model.",
      },
      {
        aspectRatio: "1:1",
        providerAspectRatio: "1:1",
        label: "1:1",
        availability: "native",
        disabled: false,
        compatibilityMessage: null,
      },
      {
        aspectRatio: "16:9",
        providerAspectRatio: "16:9",
        label: "16:9",
        availability: "disabled",
        disabled: true,
        compatibilityMessage: "16:9 is not supported by Disable Ratio Model.",
      },
    ],
  );
});

test("image generation provider request maps GPT Image unsupported ratio before payload assembly", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
    aspectRatio: "9:16",
    referenceImages: [
      {
        type: "url",
        ref: "https://cdn.example.test/reference.png",
      },
    ],
  });

  const request = createImageGenerationNodeProviderRequest({
    properties,
    prompt: "A vertical campaign poster with clean product lighting.",
    controlValues: {
      quality: "high",
      output_format: "webp",
    },
  });

  assert.equal(request.validation.valid, true);
  assert.deepEqual(
    request.validation.issues.map((issue) => issue.code),
    ["image_generation.aspect_ratio_mapped"],
  );
  assert.equal(request.replicate.model, "openai/gpt-image-1");
  assert.equal(request.replicate.credentialEnvName, "OWNCANVAS_REPLICATE_API_TOKEN");
  assert.deepEqual(request.replicate.aspectRatio, {
    requested: "9:16",
    providerValue: "2:3",
    mapped: true,
  });
  assert.deepEqual(request.replicate.input, {
    prompt: "A vertical campaign poster with clean product lighting.",
    input_images: "https://cdn.example.test/reference.png",
    aspect_ratio: "2:3",
    quality: "high",
    output_format: "webp",
  });
});

test("image generation provider request maps GPT Image unsupported landscape ratio to nearest supported landscape ratio", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
    aspectRatio: "16:9",
  });

  const request = createImageGenerationNodeProviderRequest({
    properties,
    prompt: "A wide product banner with crisp shadows.",
  });

  assert.equal(request.validation.valid, true);
  assert.deepEqual(
    request.validation.issues.map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      message: issue.message,
      supportedValues: issue.supportedValues,
    })),
    [
      {
        code: "image_generation.aspect_ratio_mapped",
        severity: "warning",
        message: "16:9 is not native to GPT Image.",
        supportedValues: ["1:1", "2:3", "3:2"],
      },
    ],
  );
  assert.deepEqual(request.replicate.aspectRatio, {
    requested: "16:9",
    providerValue: "3:2",
    mapped: true,
  });
  assert.deepEqual(request.replicate.input, {
    prompt: "A wide product banner with crisp shadows.",
    aspect_ratio: "3:2",
  });
});

test("image generation provider payload creation uses the shared aspect-ratio compatibility path", () => {
  const configuredRules =
    imageGenerationAspectRatioCompatibilityMapping["replicate:openai/gpt-image-1"];
  const gptImageCapability = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

  assert.ok(gptImageCapability);

  for (const configuredRule of configuredRules) {
    const resolvedRule = resolveImageGenerationAspectRatioCompatibilityRule(
      gptImageCapability,
      configuredRule.requestedAspectRatio,
    );
    const request = createImageGenerationNodeProviderRequest({
      properties: createImageGenerationNodeProperties({
        providerId: configuredRule.providerId,
        modelSlug: configuredRule.modelSlug,
        aspectRatio: configuredRule.requestedAspectRatio as ImageGenerationAspectRatio,
      }),
      prompt: `Campaign asset in ${configuredRule.requestedAspectRatio}.`,
    });

    assert.equal(resolvedRule, configuredRule);
    assert.equal(request.validation.valid, true);
    assert.deepEqual(
      request.validation.issues.map((issue) => ({
        code: issue.code,
        severity: issue.severity,
        message: issue.message,
        guidance: issue.guidance,
      })),
      [
        {
          code: "image_generation.aspect_ratio_mapped",
          severity: "warning",
          message: configuredRule.message,
          guidance: configuredRule.guidance,
        },
      ],
    );
    assert.deepEqual(request.replicate.aspectRatio, {
      requested: configuredRule.requestedAspectRatio,
      providerValue: configuredRule.providerAspectRatio,
      mapped: true,
    });
    assert.equal(
      request.replicate.input.aspect_ratio,
      configuredRule.providerAspectRatio,
    );
    assert.notEqual(
      request.replicate.input.aspect_ratio,
      configuredRule.requestedAspectRatio,
    );
  }

  const seedreamCapability = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "bytedance/seedream-3",
  });

  assert.ok(seedreamCapability);

  const rejectedRule = resolveImageGenerationAspectRatioCompatibilityRule(
    seedreamCapability,
    "4:5",
  );
  const rejectedValidation = validateImageGenerationNodeModelOptions(
    seedreamCapability,
    {
      aspectRatio: "4:5",
    },
  );

  assert.deepEqual(rejectedRule, {
    providerId: "replicate",
    modelSlug: "bytedance/seedream-3",
    requestedAspectRatio: "4:5",
    providerAspectRatio: "4:5",
    behavior: "disable",
    message: "4:5 is not supported by Seedream 3.",
    guidance: "Pick a supported aspect ratio or change image model.",
  });
  assert.deepEqual(rejectedValidation, {
    valid: false,
    issues: [
      {
        code: "image_generation.aspect_ratio_unsupported",
        severity: "error",
        controlId: "aspect_ratio",
        message: rejectedRule.message,
        guidance: rejectedRule.guidance,
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
    ],
    feedback: {
      state: "invalid",
      label: "Unsupported",
      className: "invalid",
      ariaLabel: "Image generation options include unsupported values",
      message: rejectedRule.message,
    },
  });

  assert.throws(
    () =>
      createImageGenerationNodeProviderRequest({
        properties: createImageGenerationNodeProperties({
          providerId: "replicate",
          modelSlug: "bytedance/seedream-3",
          aspectRatio: "4:5" as ImageGenerationAspectRatio,
        }),
        prompt: "Rejected provider payload.",
      }),
    {
      message:
        "Cannot create image generation provider request: 4:5 is not supported by Seedream 3.",
    },
  );
});

test("image generation provider request rejects disabled unsupported ratios before payload assembly", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "bytedance/seedream-3",
    aspectRatio: "4:5" as ImageGenerationAspectRatio,
  });

  assert.throws(
    () =>
      createImageGenerationNodeProviderRequest({
        properties,
        prompt: "A tall product poster with balanced negative space.",
      }),
    {
      message:
        "Cannot create image generation provider request: 4:5 is not supported by Seedream 3.",
    },
  );
});

test("image generation provider request keeps native aspect ratios unchanged", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
    aspectRatio: "1:1",
    referenceImages: [
      {
        type: "asset",
        ref: "asset_reference_1",
      },
      {
        type: "url",
        ref: "https://cdn.example.test/reference-2.png",
      },
    ],
  });

  const request = createImageGenerationNodeProviderRequest({
    properties,
    prompt: "Square social ad concept.",
    controlValues: {
      output_format: "jpg",
    },
  });

  assert.equal(request.validation.valid, true);
  assert.deepEqual(request.validation.issues, []);
  assert.deepEqual(request.replicate.aspectRatio, {
    requested: "1:1",
    providerValue: "1:1",
    mapped: false,
  });
  assert.deepEqual(request.replicate.input, {
    prompt: "Square social ad concept.",
    reference_images: [
      "asset_reference_1",
      "https://cdn.example.test/reference-2.png",
    ],
    aspect_ratio: "1:1",
    output_format: "jpg",
  });
});

test("Seedream provider request derives provider size from a manual canvas frame", () => {
  const seedreamProperties = resizeImageGenerationNodeFrameTransition(
    createImageGenerationNodeProperties({
      providerId: "replicate",
      modelSlug: "bytedance/seedream-3",
      aspectRatio: "9:16",
    }),
    { width: 384, height: 640 },
  );

  const request = createImageGenerationNodeProviderRequest({
    properties: seedreamProperties,
    prompt: "Tall product shot on a coral studio sweep",
  });

  assert.equal(request.replicate.model, "bytedance/seedream-3");
  assert.equal(
    request.replicate.input.prompt,
    "Tall product shot on a coral studio sweep",
  );
  assert.equal(request.replicate.input.aspect_ratio, "9:16");
  assert.equal(request.replicate.input.size, "384x640");
  assert.equal("width" in request.replicate.input, false);
  assert.equal("height" in request.replicate.input, false);
  assert.equal(request.replicate.aspectRatio.requested, "9:16");
  assert.equal(request.replicate.aspectRatio.providerValue, "9:16");
  assert.equal(request.replicate.aspectRatio.mapped, false);

  const explicitSizeRequest = createImageGenerationNodeProviderRequest({
    properties: seedreamProperties,
    prompt: "Tall product shot on a coral studio sweep",
    controlValues: {
      size: "1024x1792",
      guidance_scale: 3.5,
      seed: 12345,
    },
  });

  assert.equal(explicitSizeRequest.replicate.input.size, "1024x1792");
  assert.equal(explicitSizeRequest.replicate.input.guidance_scale, 3.5);
  assert.equal(explicitSizeRequest.replicate.input.seed, 12345);
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

test("image generation reference attachment drafts validate uploads and URLs before provider requests", () => {
  const nanoBanana = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  assert.ok(nanoBanana);

  const uploadedReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "file",
      fileName: "reference.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    },
    nanoBanana,
  );

  assert.equal(uploadedReference.valid, true);
  assert.equal(uploadedReference.message, null);
  assert.deepEqual(uploadedReference.referenceInput, {
    id: createImageGenerationReferenceAttachmentId({
      type: "asset",
      ref: "upload:reference.png",
    }),
    type: "asset",
    ref: "upload:reference.png",
    attachmentMetadata: {
      schemaVersion: "owncanvas.image-generation.reference-attachment.v1",
      source: "upload",
      providerBinding: {
        providerId: "replicate",
        modelSlug: "google/nano-banana",
        credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
        inputControlId: "reference_images",
        schemaKey: "reference_images",
        referenceInputMode: "multi",
        maxImages: 8,
        acceptedTypes: ["asset", "url", "recent_output"],
      },
      file: {
        fileName: "reference.png",
        mimeType: "image/png",
        sizeBytes: 1024,
      },
    },
  });

  assert.deepEqual(
    validateImageGenerationReferenceAttachmentDraft(
      {
        kind: "file",
        fileName: "reference.svg",
        mimeType: "image/svg+xml",
        sizeBytes: 1024,
      },
      nanoBanana,
    ),
    {
      valid: false,
      message: "Reference uploads must be PNG, JPEG, WebP, GIF, or AVIF images.",
      referenceInput: null,
    },
  );

  assert.deepEqual(
    validateImageGenerationReferenceAttachmentDraft(
      {
        kind: "file",
        fileName: "large.webp",
        mimeType: "image/webp",
        sizeBytes: 10 * 1024 * 1024 + 1,
      },
      nanoBanana,
    ),
    {
      valid: false,
      message: "Reference uploads must be 10 MB or smaller.",
      referenceInput: null,
    },
  );

  const urlReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "url",
      url: " https://cdn.example.test/reference.png ",
    },
    nanoBanana,
  );

  assert.equal(urlReference.valid, true);
  assert.equal(urlReference.referenceInput?.type, "url");
  assert.equal(
    urlReference.referenceInput?.ref,
    "https://cdn.example.test/reference.png",
  );
  assert.deepEqual(urlReference.referenceInput?.attachmentMetadata?.url, {
    href: "https://cdn.example.test/reference.png",
    origin: "https://cdn.example.test",
    pathname: "/reference.png",
  });
  assert.deepEqual(
    urlReference.referenceInput?.attachmentMetadata?.providerBinding,
    uploadedReference.referenceInput?.attachmentMetadata?.providerBinding,
  );

  assert.deepEqual(
    validateImageGenerationReferenceAttachmentDraft(
      {
        kind: "url",
        url: "ftp://cdn.example.test/reference.png",
      },
      nanoBanana,
    ),
    {
      valid: false,
      message: "Reference URLs must start with https:// or http://.",
      referenceInput: null,
    },
  );

  assert.deepEqual(
    validateImageGenerationReferenceAttachmentDraft(
      {
        kind: "url",
        url: "https://embedded-user:embedded-value@cdn.example.test/reference.png",
      },
      nanoBanana,
    ),
    {
      valid: false,
      message: "Reference URLs cannot include embedded credentials.",
      referenceInput: null,
    },
  );
});

test("image generation reference attachment metadata normalizes campaign assets and recent outputs into provider bindings", () => {
  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

  assert.ok(gptImage);

  const campaignAssetReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: " asset_product_reference ",
      title: " Product reference ",
      mediaType: " image/png ",
    },
    gptImage,
  );

  assert.deepEqual(campaignAssetReference.referenceInput, {
    id: createImageGenerationReferenceAttachmentId({
      type: "asset",
      ref: "asset_product_reference",
    }),
    type: "asset",
    ref: "asset_product_reference",
    attachmentMetadata: {
      schemaVersion: "owncanvas.image-generation.reference-attachment.v1",
      source: "asset",
      providerBinding: {
        providerId: "replicate",
        modelSlug: "openai/gpt-image-1",
        credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
        inputControlId: "input_images",
        schemaKey: "input_images",
        referenceInputMode: "single",
        maxImages: 1,
        acceptedTypes: ["asset", "url", "recent_output"],
      },
      asset: {
        assetId: "asset_product_reference",
        title: "Product reference",
        mediaType: "image/png",
      },
    },
  });

  const recentOutputReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "recent_output",
      assetId: "asset_generated_image_1",
      sourceNodeId: "image_node_1",
      outputPortId: "generated_image_asset",
    },
    gptImage,
  );

  assert.equal(recentOutputReference.referenceInput?.type, "recent_output");
  assert.deepEqual(
    recentOutputReference.referenceInput?.attachmentMetadata?.recentOutput,
    {
      assetId: "asset_generated_image_1",
      sourceNodeId: "image_node_1",
      outputPortId: "generated_image_asset",
    },
  );

  const serialized = JSON.stringify([
    campaignAssetReference,
    recentOutputReference,
  ]);
  assert.doesNotMatch(serialized, /sk-[a-z0-9]|ghp_|password=|secretValue/i);
  assert.match(serialized, /OWNCANVAS_REPLICATE_API_TOKEN/);
});

test("image generation recent output references attach through reference tray transition", () => {
  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

  assert.ok(gptImage);

  const baseProperties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
    latestResultRefs: {
      generatedAssetIds: ["asset_generated_image_1", "asset_generated_image_2"],
      metadataRunId: "run_recent_metadata",
      costUsageRunId: "run_recent_cost",
    },
    uiState: createImageGenerationNodeUiState({
      referenceTrayOpen: true,
      status: "completed",
      selectedResultAssetId: "asset_generated_image_1",
      outputConnectionReady: true,
    }),
  });
  const recentOutputReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "recent_output",
      assetId: "asset_generated_image_2",
      sourceNodeId: "image_node_1",
      outputPortId: "generated_image_asset",
    },
    gptImage,
  );

  assert.equal(recentOutputReference.valid, true);
  assert.ok(recentOutputReference.referenceInput);

  const attachedProperties = attachImageGenerationNodeReferenceTransition(
    baseProperties,
    recentOutputReference.referenceInput,
  );

  assert.deepEqual(
    attachedProperties.referenceImages.map((referenceImage) => ({
      type: referenceImage.type,
      ref: referenceImage.ref,
      recentOutput: referenceImage.attachmentMetadata?.recentOutput,
    })),
    [
      {
        type: "recent_output",
        ref: "asset_generated_image_2",
        recentOutput: {
          assetId: "asset_generated_image_2",
          sourceNodeId: "image_node_1",
          outputPortId: "generated_image_asset",
        },
      },
    ],
  );
  assert.equal(attachedProperties.uiState.referenceTrayOpen, true);
  assert.equal(attachedProperties.uiState.statusMessage, "Reference asset attached");
  assert.deepEqual(attachedProperties.latestResultRefs, baseProperties.latestResultRefs);

  const serialized = JSON.stringify(attachedProperties);
  assert.doesNotMatch(serialized, /sk-[a-z0-9]|ghp_|password=|secretValue/i);
  assert.match(serialized, /OWNCANVAS_REPLICATE_API_TOKEN/);
});

test("image generation reference tray normalizes attachments with preview and remove state", () => {
  const nanoBanana = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  assert.ok(nanoBanana);

  const uploadedReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "file",
      fileName: "reference.png",
      mimeType: "image/png",
      sizeBytes: 2048,
    },
    nanoBanana,
  );
  const urlReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "url",
      url: "https://cdn.example.test/reference.webp",
    },
    nanoBanana,
  );
  const campaignAssetReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_product_reference",
      title: "Product reference",
      mediaType: "image/png",
    },
    nanoBanana,
  );
  const recentOutputReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "recent_output",
      assetId: "asset_generated_image_1",
      sourceNodeId: "image_node_1",
      outputPortId: "generated_image_asset",
    },
    nanoBanana,
  );

  assert.ok(uploadedReference.referenceInput);
  assert.ok(urlReference.referenceInput);
  assert.ok(campaignAssetReference.referenceInput);
  assert.ok(recentOutputReference.referenceInput);

  const attachedProperties = [
    uploadedReference.referenceInput,
    urlReference.referenceInput,
    campaignAssetReference.referenceInput,
    recentOutputReference.referenceInput,
  ].reduce(
    (properties, referenceInput) =>
      attachImageGenerationNodeReferenceTransition(properties, referenceInput),
    createImageGenerationNodeProperties(),
  );

  assert.deepEqual(
    listImageGenerationReferenceTrayAttachments(attachedProperties).map(
      (attachment) => ({
        id: attachment.id,
        insertionOrder: attachment.insertionOrder,
        source: attachment.source,
        label: attachment.label,
        previewState: attachment.preview.state,
        previewSrc: attachment.preview.src,
        removeLabel: attachment.remove.ariaLabel,
      }),
    ),
    [
      {
        id: createImageGenerationReferenceAttachmentId({
          type: "asset",
          ref: "upload:reference.png",
        }),
        insertionOrder: 0,
        source: "upload",
        label: "reference.png",
        previewState: "pending-upload",
        previewSrc: null,
        removeLabel: "Remove reference.png",
      },
      {
        id: createImageGenerationReferenceAttachmentId({
          type: "url",
          ref: "https://cdn.example.test/reference.webp",
        }),
        insertionOrder: 1,
        source: "url",
        label: "URL reference",
        previewState: "previewable",
        previewSrc: "https://cdn.example.test/reference.webp",
        removeLabel: "Remove URL reference",
      },
      {
        id: createImageGenerationReferenceAttachmentId({
          type: "asset",
          ref: "asset_product_reference",
        }),
        insertionOrder: 2,
        source: "asset",
        label: "Product reference",
        previewState: "asset-reference",
        previewSrc: null,
        removeLabel: "Remove Product reference",
      },
      {
        id: createImageGenerationReferenceAttachmentId({
          type: "recent_output",
          ref: "asset_generated_image_1",
        }),
        insertionOrder: 3,
        source: "recent_output",
        label: "Recent output",
        previewState: "recent-output",
        previewSrc: null,
        removeLabel: "Remove asset_generated_image_1",
      },
    ],
  );

  const removedProperties = removeImageGenerationNodeReferenceTransition(
    attachedProperties,
    {
      type: "url",
      ref: "https://cdn.example.test/reference.webp",
    },
  );

  assert.deepEqual(
    removedProperties.referenceImages.map((referenceImage) => referenceImage.ref),
    [
      "upload:reference.png",
      "asset_product_reference",
      "asset_generated_image_1",
    ],
  );
  assert.equal(removedProperties.uiState.referenceTrayOpen, true);
  assert.equal(removedProperties.uiState.statusMessage, "Reference asset removed");
});

test("image generation reference tray capability gates add and remove controls by selected model", () => {
  const multiReferenceProperties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  assert.deepEqual(resolveImageGenerationReferenceTrayCapability(multiReferenceProperties), {
    providerId: "replicate",
    modelSlug: "google/nano-banana",
    state: "multi-reference",
    supported: true,
    acceptedTypes: ["asset", "url", "recent_output"],
    attachedReferenceCount: 0,
    maxReferenceCount: 8,
    remainingReferenceCount: 8,
    canAddReferences: true,
    addDisabledReason: null,
    canRemoveReferences: false,
    removeDisabledReason: "No reference images are attached.",
  });

  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

  assert.ok(gptImage);

  const singleReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_single_reference",
      title: "Single reference",
      mediaType: "image/png",
    },
    gptImage,
  );

  assert.ok(singleReference.referenceInput);

  const maxedSingleReferenceProperties = attachImageGenerationNodeReferenceTransition(
    createImageGenerationNodeProperties({
      providerId: "replicate",
      modelSlug: "openai/gpt-image-1",
    }),
    singleReference.referenceInput,
  );

  assert.deepEqual(
    resolveImageGenerationReferenceTrayCapability(maxedSingleReferenceProperties),
    {
      providerId: "replicate",
      modelSlug: "openai/gpt-image-1",
      state: "single-reference",
      supported: true,
      acceptedTypes: ["asset", "url", "recent_output"],
      attachedReferenceCount: 1,
      maxReferenceCount: 1,
      remainingReferenceCount: 0,
      canAddReferences: false,
      addDisabledReason: "GPT Image accepts at most 1 reference image(s).",
      canRemoveReferences: true,
      removeDisabledReason: null,
    },
  );

  const unsupportedReferenceProperties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "bytedance/seedream-3",
  });

  assert.deepEqual(resolveImageGenerationReferenceTrayCapability(unsupportedReferenceProperties), {
    providerId: "replicate",
    modelSlug: "bytedance/seedream-3",
    state: "unsupported",
    supported: false,
    acceptedTypes: [],
    attachedReferenceCount: 0,
    maxReferenceCount: 0,
    remainingReferenceCount: 0,
    canAddReferences: false,
    addDisabledReason: "Seedream 3 does not accept reference images.",
    canRemoveReferences: false,
    removeDisabledReason: "No reference images are attached.",
  });
});

test("image generation reference provider scenarios cover unsupported single and multi reference models", () => {
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

  assert.ok(nanoBanana);
  assert.ok(gptImage);
  assert.ok(seedream);

  const unsupportedSeedreamProperties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "bytedance/seedream-3",
  });
  const unsupportedSeedreamDraft = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_seedream_reference",
      title: "Unsupported Seedream reference",
      mediaType: "image/png",
    },
    seedream,
  );

  assert.deepEqual(unsupportedSeedreamDraft, {
    valid: false,
    message: "Seedream 3 does not accept reference images.",
    referenceInput: null,
  });
  assert.equal(
    attachImageGenerationNodeReferenceTransition(
      unsupportedSeedreamProperties,
      { type: "asset", ref: "asset_seedream_reference" },
    ),
    unsupportedSeedreamProperties,
  );
  assert.deepEqual(
    validateImageGenerationNodeModelOptions(seedream, {
      referenceImages: [{ type: "asset", ref: "asset_seedream_reference" }],
    }).issues.map((issue) => issue.code),
    [
      "image_generation.reference_unsupported",
      "image_generation.reference_count_invalid",
      "image_generation.reference_type_invalid",
    ],
  );
  assert.deepEqual(
    resolveImageGenerationReferenceTrayEmptyState(unsupportedSeedreamProperties),
    {
      label: "References unavailable",
      description: "The selected model does not accept reference images.",
      actionLabel: "Change model",
    },
  );

  const gptFirstReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_gpt_reference_1",
      title: "GPT reference one",
      mediaType: "image/png",
    },
    gptImage,
  );
  const gptSecondReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "url",
      url: "https://cdn.example.test/gpt-reference-2.png",
    },
    gptImage,
  );

  assert.ok(gptFirstReference.referenceInput);
  assert.ok(gptSecondReference.referenceInput);
  assert.equal(
    gptFirstReference.referenceInput.attachmentMetadata?.providerBinding
      .referenceInputMode,
    "single",
  );
  assert.equal(
    gptFirstReference.referenceInput.attachmentMetadata?.providerBinding.schemaKey,
    "input_images",
  );

  const maxedGptProperties = attachImageGenerationNodeReferenceTransition(
    createImageGenerationNodeProperties({
      providerId: "replicate",
      modelSlug: "openai/gpt-image-1",
    }),
    gptFirstReference.referenceInput,
  );
  const replacedGptProperties = attachImageGenerationNodeReferenceTransition(
    maxedGptProperties,
    gptSecondReference.referenceInput,
  );

  assert.deepEqual(
    maxedGptProperties.referenceImages.map((referenceImage) => referenceImage.ref),
    ["asset_gpt_reference_1"],
  );
  assert.deepEqual(
    replacedGptProperties.referenceImages.map((referenceImage) => referenceImage.ref),
    ["https://cdn.example.test/gpt-reference-2.png"],
  );
  assert.deepEqual(
    resolveImageGenerationReferenceTrayCapability(maxedGptProperties),
    {
      providerId: "replicate",
      modelSlug: "openai/gpt-image-1",
      state: "single-reference",
      supported: true,
      acceptedTypes: ["asset", "url", "recent_output"],
      attachedReferenceCount: 1,
      maxReferenceCount: 1,
      remainingReferenceCount: 0,
      canAddReferences: false,
      addDisabledReason: "GPT Image accepts at most 1 reference image(s).",
      canRemoveReferences: true,
      removeDisabledReason: null,
    },
  );
  assert.deepEqual(
    validateImageGenerationNodeModelOptions(gptImage, {
      referenceImages: [
        gptFirstReference.referenceInput,
        gptSecondReference.referenceInput,
      ],
    }).issues.map((issue) => ({
      code: issue.code,
      controlId: issue.controlId,
      message: issue.message,
    })),
    [
      {
        code: "image_generation.reference_count_invalid",
        controlId: "input_images",
        message: "GPT Image accepts at most 1 reference image(s).",
      },
    ],
  );

  const nanoFirstReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_nano_reference_1",
      title: "Nano reference one",
      mediaType: "image/png",
    },
    nanoBanana,
  );
  const nanoSecondReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "recent_output",
      assetId: "asset_nano_reference_2",
      sourceNodeId: "image_node_source",
      outputPortId: "generated_image_asset",
    },
    nanoBanana,
  );

  assert.ok(nanoFirstReference.referenceInput);
  assert.ok(nanoSecondReference.referenceInput);
  assert.equal(
    nanoFirstReference.referenceInput.attachmentMetadata?.providerBinding
      .referenceInputMode,
    "multi",
  );
  assert.equal(
    nanoFirstReference.referenceInput.attachmentMetadata?.providerBinding.schemaKey,
    "reference_images",
  );

  const multiNanoProperties = [
    nanoFirstReference.referenceInput,
    nanoSecondReference.referenceInput,
  ].reduce(
    (properties, referenceInput) =>
      attachImageGenerationNodeReferenceTransition(properties, referenceInput),
    createImageGenerationNodeProperties({
      providerId: "replicate",
      modelSlug: "google/nano-banana",
    }),
  );

  assert.deepEqual(
    multiNanoProperties.referenceImages.map((referenceImage) => referenceImage.ref),
    ["asset_nano_reference_1", "asset_nano_reference_2"],
  );
  assert.deepEqual(resolveImageGenerationReferenceTrayCapability(multiNanoProperties), {
    providerId: "replicate",
    modelSlug: "google/nano-banana",
    state: "multi-reference",
    supported: true,
    acceptedTypes: ["asset", "url", "recent_output"],
    attachedReferenceCount: 2,
    maxReferenceCount: 8,
    remainingReferenceCount: 6,
    canAddReferences: true,
    addDisabledReason: null,
    canRemoveReferences: true,
    removeDisabledReason: null,
  });
  assert.deepEqual(
    listImageGenerationReferenceTrayAttachments(multiNanoProperties).map(
      (attachment) => ({
        ref: attachment.ref,
        validation: attachment.validation,
        canMoveUp: attachment.reorder.canMoveUp,
        canMoveDown: attachment.reorder.canMoveDown,
      }),
    ),
    [
      {
        ref: "asset_nano_reference_1",
        validation: { state: "valid", message: null },
        canMoveUp: false,
        canMoveDown: true,
      },
      {
        ref: "asset_nano_reference_2",
        validation: { state: "valid", message: null },
        canMoveUp: true,
        canMoveDown: false,
      },
    ],
  );

  const serialized = JSON.stringify([
    unsupportedSeedreamDraft,
    maxedGptProperties,
    replacedGptProperties,
    multiNanoProperties,
  ]);
  assert.doesNotMatch(
    serialized,
    /sk-[a-z0-9]|ghp_|password=|secretValue|apiKey|credentialValue|tokenValue/i,
  );
  assert.match(serialized, /OWNCANVAS_REPLICATE_API_TOKEN/);
});

test("image generation reference tray preserves stable IDs and insertion order across replacement", () => {
  const nanoBanana = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  assert.ok(nanoBanana);

  const firstReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_first_reference",
      title: "First reference",
      mediaType: "image/png",
    },
    nanoBanana,
  );
  const secondReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "url",
      url: "https://cdn.example.test/second-reference.png",
    },
    nanoBanana,
  );
  const replacementFirstReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_first_reference",
      title: "Updated first reference",
      mediaType: "image/webp",
    },
    nanoBanana,
  );

  assert.ok(firstReference.referenceInput);
  assert.ok(secondReference.referenceInput);
  assert.ok(replacementFirstReference.referenceInput);

  const attachedProperties = [
    firstReference.referenceInput,
    secondReference.referenceInput,
    replacementFirstReference.referenceInput,
  ].reduce(
    (properties, referenceInput) =>
      attachImageGenerationNodeReferenceTransition(properties, referenceInput),
    createImageGenerationNodeProperties(),
  );

  assert.deepEqual(
    attachedProperties.referenceImages.map((referenceImage) => ({
      id: referenceImage.id,
      ref: referenceImage.ref,
      title: referenceImage.attachmentMetadata?.asset?.title ?? null,
    })),
    [
      {
        id: firstReference.referenceInput.id,
        ref: "asset_first_reference",
        title: "Updated first reference",
      },
      {
        id: secondReference.referenceInput.id,
        ref: "https://cdn.example.test/second-reference.png",
        title: null,
      },
    ],
  );
  assert.deepEqual(
    listImageGenerationReferenceTrayAttachments(attachedProperties).map(
      (attachment) => ({
        id: attachment.id,
        insertionOrder: attachment.insertionOrder,
        ref: attachment.ref,
      }),
    ),
    [
      {
        id: firstReference.referenceInput.id,
        insertionOrder: 0,
        ref: "asset_first_reference",
      },
      {
        id: secondReference.referenceInput.id,
        insertionOrder: 1,
        ref: "https://cdn.example.test/second-reference.png",
      },
    ],
  );

  const removedByStableId = removeImageGenerationNodeReferenceTransition(
    attachedProperties,
    { id: secondReference.referenceInput.id },
  );

  assert.deepEqual(
    removedByStableId.referenceImages.map((referenceImage) => referenceImage.ref),
    ["asset_first_reference"],
  );
});

test("image generation reference removal exposes empty-state fallback after final attachment", () => {
  const nanoBanana = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  assert.ok(nanoBanana);

  const reference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_only_reference",
      title: "Only reference",
      mediaType: "image/png",
    },
    nanoBanana,
  );

  assert.ok(reference.referenceInput);

  const attachedProperties = attachImageGenerationNodeReferenceTransition(
    createImageGenerationNodeProperties({
      uiState: createImageGenerationNodeUiState({
        referenceTrayOpen: true,
        status: "failed",
        errorReason: "Reference payload failed",
        failureDetails: {
          name: "ReferenceError",
          message: "Reference payload failed",
          providerId: "replicate",
          modelSlug: "google/nano-banana",
          providerRequestId: "prediction_1",
          retryable: true,
        },
      }),
    }),
    reference.referenceInput,
  );

  assert.equal(resolveImageGenerationReferenceTrayEmptyState(attachedProperties), null);

  const removedProperties = removeImageGenerationNodeReferenceTransition(
    attachedProperties,
    { id: reference.referenceInput.id },
  );

  assert.deepEqual(removedProperties.referenceImages, []);
  assert.equal(removedProperties.uiState.referenceTrayOpen, true);
  assert.equal(removedProperties.uiState.statusMessage, "Reference tray empty");
  assert.equal(removedProperties.uiState.errorReason, null);
  assert.equal(removedProperties.uiState.failureDetails, null);
  assert.deepEqual(resolveImageGenerationReferenceTrayEmptyState(removedProperties), {
    label: "No references attached",
    description: "Attach an upload, URL, campaign asset, or recent output.",
    actionLabel: "Add a reference",
  });
});

test("image generation reference tray reorders attachments deterministically by stable ID", () => {
  const nanoBanana = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

  assert.ok(nanoBanana);

  const firstReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_first_reference",
      title: "First reference",
      mediaType: "image/png",
    },
    nanoBanana,
  );
  const secondReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "asset",
      assetId: "asset_second_reference",
      title: "Second reference",
      mediaType: "image/png",
    },
    nanoBanana,
  );
  const thirdReference = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "url",
      url: "https://cdn.example.test/third-reference.png",
    },
    nanoBanana,
  );

  assert.ok(firstReference.referenceInput);
  assert.ok(secondReference.referenceInput);
  assert.ok(thirdReference.referenceInput);

  const attachedProperties = [
    firstReference.referenceInput,
    secondReference.referenceInput,
    thirdReference.referenceInput,
  ].reduce(
    (properties, referenceInput) =>
      attachImageGenerationNodeReferenceTransition(properties, referenceInput),
    createImageGenerationNodeProperties(),
  );

  const movedThirdEarlier = reorderImageGenerationNodeReferenceTransition(
    attachedProperties,
    { id: thirdReference.referenceInput.id },
    "up",
  );

  assert.deepEqual(
    movedThirdEarlier.referenceImages.map((referenceImage) => referenceImage.ref),
    [
      "asset_first_reference",
      "https://cdn.example.test/third-reference.png",
      "asset_second_reference",
    ],
  );
  assert.equal(movedThirdEarlier.uiState.referenceTrayOpen, true);
  assert.equal(movedThirdEarlier.uiState.statusMessage, "Reference order updated");

  const movedFirstLater = reorderImageGenerationNodeReferenceTransition(
    movedThirdEarlier,
    {
      type: "asset",
      ref: "asset_first_reference",
    },
    "down",
  );

  assert.deepEqual(
    listImageGenerationReferenceTrayAttachments(movedFirstLater).map(
      (attachment) => ({
        ref: attachment.ref,
        insertionOrder: attachment.insertionOrder,
        canMoveUp: attachment.reorder.canMoveUp,
        canMoveDown: attachment.reorder.canMoveDown,
      }),
    ),
    [
      {
        ref: "https://cdn.example.test/third-reference.png",
        insertionOrder: 0,
        canMoveUp: false,
        canMoveDown: true,
      },
      {
        ref: "asset_first_reference",
        insertionOrder: 1,
        canMoveUp: true,
        canMoveDown: true,
      },
      {
        ref: "asset_second_reference",
        insertionOrder: 2,
        canMoveUp: true,
        canMoveDown: false,
      },
    ],
  );

  assert.equal(
    reorderImageGenerationNodeReferenceTransition(
      movedFirstLater,
      { id: thirdReference.referenceInput.id },
      "up",
    ),
    movedFirstLater,
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
