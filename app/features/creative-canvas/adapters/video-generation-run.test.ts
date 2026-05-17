import assert from "node:assert/strict";
import { test } from "node:test";

import type { CampaignAsset } from "../model/creative-canvas.ts";
import { createVideoGenerationNodeProperties } from "../model/video-generation-node.ts";
import type { CreativeFlowNode } from "./react-flow-canvas.ts";
import {
  createVideoGenerationRunPlan,
  resolveVideoGenerationReferenceImageUri,
} from "./video-generation-run.ts";

function createVideoNode(
  id: string,
  properties = createVideoGenerationNodeProperties({
    prompt: "AI-native CEO co-coding with Ouroboros and Codex",
  }),
): CreativeFlowNode {
  return {
    id,
    type: "generation",
    position: { x: 0, y: 0 },
    data: {
      id,
      kind: "video",
      type: "video",
      title: "Video",
      subtitle: "motion drafts",
      description: "Video generation",
      tone: "violet",
      status: "DRAFT",
      contracts: [],
      position: { x: 0, y: 0 },
      properties,
    },
  };
}

test("createVideoGenerationRunPlan creates one video generation batch", () => {
  const sourceNode = createVideoNode("video_block_1");
  const plan = createVideoGenerationRunPlan({
    campaignId: "campaign_video",
    sourceNode,
    existingNodes: [sourceNode],
    campaignAssets: [],
    now: () => "2026-05-17T05:00:00.000Z",
  });

  assert.equal(plan.batchId, "video_block_1_video_20260517050000000");
  assert.equal(plan.batch.fanOutCount, 1);
  assert.equal(plan.batch.spec.mediaType, "video");
  assert.equal(plan.batch.jobs[0]?.mediaType, "video");
  assert.equal(plan.batch.jobs[0]?.nodeId, "video_block_1");
  assert.equal(plan.batch.jobs[0]?.model, "bytedance/seedance-1-lite");
  assert.deepEqual(plan.batch.jobs[0]?.parameters, {
    replicate: {
      providerId: "replicate",
      model: "bytedance/seedance-1-lite",
      serviceAdapterId: "replicate",
      credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
      inputEnvelopeField: "input",
      input: {
        prompt: "AI-native CEO co-coding with Ouroboros and Codex",
        duration: 2,
        resolution: "480p",
        aspect_ratio: "16:9",
        fps: 24,
        camera_fixed: false,
      },
    },
  });
});

test("createVideoGenerationRunPlan maps connected image output asset into Kling start_image", () => {
  const sourceNode = createVideoNode(
    "video_block_2",
    createVideoGenerationNodeProperties({
      modelSlug: "kwaivgi/kling-v2.1",
      prompt: "animate this reference as a calm 3D lesson",
      sourceOutputAssetId: "asset_reference_image",
    }),
  );
  const plan = createVideoGenerationRunPlan({
    campaignId: "campaign_video",
    sourceNode,
    existingNodes: [sourceNode],
    campaignAssets: [
      {
        id: "asset_reference_image",
        source: "link",
        mediaType: "image",
        title: "Reference",
        uri: "https://assets.example.test/reference.png",
        usage: "generated",
        status: "ready",
        altText: "Reference",
        fileName: "reference.png",
        mimeType: "image/png",
        sizeBytes: null,
        rights: {
          owner: "OwnCanvas generated output",
          license: "campaign-use",
        },
        createdAt: "2026-05-17T05:00:00.000Z",
        createdBy: "agent",
      },
    ],
    now: () => "2026-05-17T05:00:00.000Z",
  });

  assert.deepEqual(plan.batch.jobs[0]?.parameters, {
    replicate: {
      providerId: "replicate",
      model: "kwaivgi/kling-v2.1",
      serviceAdapterId: "replicate",
      credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
      inputEnvelopeField: "input",
      input: {
        prompt: "animate this reference as a calm 3D lesson",
        duration: 5,
        mode: "standard",
        negative_prompt: "",
        start_image: "https://assets.example.test/reference.png",
      },
    },
  });
});

test("resolveVideoGenerationReferenceImageUri prefers explicit URI then asset ids", () => {
  const assets = [
    {
      id: "asset_from_canvas",
      uri: "https://assets.example.test/canvas.png",
    },
  ] as CampaignAsset[];

  assert.equal(
    resolveVideoGenerationReferenceImageUri({
      properties: {
        referenceImageUri: "https://assets.example.test/direct.png",
        referenceImageAssetId: "asset_from_canvas",
      },
      campaignAssets: assets,
    }),
    "https://assets.example.test/direct.png",
  );
  assert.equal(
    resolveVideoGenerationReferenceImageUri({
      properties: {
        referenceImageUri: null,
        referenceImageAssetId: null,
        sourceOutputAssetId: "asset_from_canvas",
      },
      campaignAssets: assets,
    }),
    "https://assets.example.test/canvas.png",
  );
});
