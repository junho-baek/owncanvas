import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createVideoGenerationNodeProperties,
  createVideoGenerationNodeProviderRequest,
  failVideoGenerationNodeTransition,
  isVideoGenerationNodeProperties,
  queueVideoGenerationNodeTransition,
  resolveVideoGenerationModelPickerOptions,
  selectVideoGenerationNodeModelTransition,
  succeedVideoGenerationNodeTransition,
  validateVideoGenerationRunReadiness,
} from "./video-generation-node.ts";

test("video generation node defaults to cheap Seedance smoke settings", () => {
  const properties = createVideoGenerationNodeProperties();

  assert.equal(properties.providerId, "replicate");
  assert.equal(properties.serviceAdapterId, "replicate");
  assert.equal(properties.modelSlug, "bytedance/seedance-1-lite");
  assert.equal(properties.durationSeconds, 2);
  assert.equal(properties.resolution, "480p");
  assert.equal(properties.aspectRatio, "16:9");
  assert.equal(isVideoGenerationNodeProperties(properties), true);
});

test("video model picker exposes model names instead of Replicate as a model", () => {
  const options = resolveVideoGenerationModelPickerOptions({
    selectedModelSlug: "bytedance/seedance-1-lite",
    hasReferenceImage: false,
  });

  assert.deepEqual(
    options.map((option) => ({
      value: option.value,
      label: option.label,
      serviceAdapterId: option.serviceAdapterId,
      disabled: option.disabled,
    })),
    [
      {
        value: "bytedance/seedance-1-lite",
        label: "Seedance 1 Lite",
        serviceAdapterId: "replicate",
        disabled: false,
      },
      {
        value: "bytedance/seedance-1-pro-fast",
        label: "Seedance 1 Pro Fast",
        serviceAdapterId: "replicate",
        disabled: false,
      },
      {
        value: "bytedance/seedance-2.0-fast",
        label: "Seedance 2 Fast",
        serviceAdapterId: "replicate",
        disabled: false,
      },
      {
        value: "kwaivgi/kling-v2.1",
        label: "Kling v2.1",
        serviceAdapterId: "replicate",
        disabled: true,
      },
    ],
  );
});

test("Seedance video provider request uses prompt duration resolution and aspect ratio", () => {
  const properties = createVideoGenerationNodeProperties({
    prompt: "educational 3D animation about AI-native CEO co-coding",
  });
  const request = createVideoGenerationNodeProviderRequest({
    properties,
    prompt: properties.prompt,
  });

  assert.deepEqual(request.replicate, {
    providerId: "replicate",
    model: "bytedance/seedance-1-lite",
    serviceAdapterId: "replicate",
    credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
    inputEnvelopeField: "input",
    input: {
      prompt: "educational 3D animation about AI-native CEO co-coding",
      duration: 2,
      resolution: "480p",
      aspect_ratio: "16:9",
      fps: 24,
      camera_fixed: false,
    },
  });
});

test("Kling request requires a start image and maps resolution to mode", () => {
  const properties = selectVideoGenerationNodeModelTransition(
    createVideoGenerationNodeProperties({
      prompt: "animate the founder at the command center",
      referenceImageUri: "https://assets.example.test/reference.png",
      resolution: "1080p",
    }),
    "kwaivgi/kling-v2.1",
  );
  const request = createVideoGenerationNodeProviderRequest({
    properties,
    prompt: properties.prompt,
  });

  assert.equal(
    validateVideoGenerationRunReadiness({
      properties: createVideoGenerationNodeProperties({
        modelSlug: "kwaivgi/kling-v2.1",
        prompt: "animate the founder at the command center",
      }),
    }).valid,
    false,
  );
  assert.deepEqual(request.replicate.input, {
    prompt: "animate the founder at the command center",
    duration: 5,
    mode: "pro",
    negative_prompt: "",
    start_image: "https://assets.example.test/reference.png",
  });
});

test("video generation lifecycle transitions queue succeed and fail", () => {
  const properties = createVideoGenerationNodeProperties({
    prompt: "educational 3D animation",
  });
  const queued = queueVideoGenerationNodeTransition(properties);
  const succeeded = succeedVideoGenerationNodeTransition(queued, {
    generatedAssetIds: ["asset_video_output"],
    metadataRunId: "prediction_123",
    costUsageRunId: null,
  });
  const failed = failVideoGenerationNodeTransition(properties, {
    name: "GenerationProviderUnavailable",
    category: "transport_error",
    message: "provider timeout",
    providerId: "replicate",
    modelSlug: "bytedance/seedance-1-lite",
    providerRequestId: null,
    retryable: true,
  });

  assert.equal(queued.uiState.status, "queued");
  assert.equal(succeeded.uiState.status, "succeeded");
  assert.equal(succeeded.uiState.selectedResultAssetId, "asset_video_output");
  assert.equal(succeeded.uiState.outputConnectionReady, true);
  assert.equal(failed.uiState.status, "failed");
  assert.equal(failed.uiState.failureDetails?.name, "GenerationProviderUnavailable");
});
