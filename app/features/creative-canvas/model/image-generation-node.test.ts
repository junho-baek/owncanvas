import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createCampaignBlock } from "./creative-canvas.ts";
import {
  IMAGE_GENERATION_NODE_TYPE,
  createImageGenerationNodeProperties,
  imageGenerationInputPorts,
  imageGenerationOutputPorts,
  isImageGenerationNodeProperties,
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
  assert.equal(imageBlock.properties.providerPresets.length, 3);
  assert.equal(
    imageBlock.properties.providerPresets.some(
      (provider) => provider.providerId === "freepik-compatible",
    ),
    true,
  );
});
