import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  IMAGE_GENERATION_DEFAULT_FRAME,
  createImageGenerationNodeProperties,
  imageGenerationAspectRatioOptions,
  imageGenerationNodeStatuses,
  imageGenerationNodeV2Statuses,
  resolveImageGenerationNodeStatusView,
} from "../model/image-generation-node.ts";
import {
  imageGenerationNodeErrorRecoveryFeedbackFixtures,
  imageGenerationNodeStatusFeedbackStoryFixtures,
} from "./image-generation-node-status-feedback.fixtures.ts";

const creativeCanvasScreen = readFileSync(
  new URL("./creative-canvas-screen.tsx", import.meta.url),
  "utf8",
);
const appCss = readFileSync(new URL("../../../app.css", import.meta.url), "utf8");

test("campaign editor exposes landing navigation and conversion authoring controls", () => {
  assert.match(
    creativeCanvasScreen,
    /setCampaignLandingPageAuthoringControls/,
    "editor should persist landing chrome controls through the campaign JSON model",
  );
  assert.match(creativeCanvasScreen, /id="landing-navigation-visibility"/);
  assert.match(creativeCanvasScreen, /id="landing-navigation-placement"/);
  assert.match(creativeCanvasScreen, /id="landing-navigation-timing"/);
  assert.match(creativeCanvasScreen, /id="landing-navigation-interruption"/);
  assert.match(creativeCanvasScreen, /id="landing-conversion-label"/);
  assert.match(creativeCanvasScreen, /id="landing-conversion-url"/);
  assert.match(creativeCanvasScreen, /id="landing-conversion-placement"/);
  assert.match(creativeCanvasScreen, /id="landing-conversion-timing"/);
  assert.match(creativeCanvasScreen, /id="landing-conversion-interruption"/);
});

test("Spaces-style image generation node keeps the visible Korean generator label", () => {
  assert.match(creativeCanvasScreen, /className="space-image-node-label"/);
  assert.match(creativeCanvasScreen, />이미지 생성기 #1</);
});

test("Spaces-style image generation node keeps the top-right floating action toolbar", () => {
  assert.match(creativeCanvasScreen, /className="space-node-toolbar nodrag"/);
  assert.match(creativeCanvasScreen, /aria-label="Node actions"/);
  assert.match(creativeCanvasScreen, /aria-label="Run image node"/);
  assert.match(creativeCanvasScreen, /aria-label="Connect node"/);
  assert.match(creativeCanvasScreen, /aria-label="Delete node"/);
  assert.match(creativeCanvasScreen, /aria-label="More actions"/);
  assert.match(appCss, /\.space-node-toolbar\s*\{[\s\S]*position:\s*absolute/);
  assert.match(appCss, /\.space-node-toolbar\s*\{[\s\S]*top:\s*-43px/);
  assert.match(appCss, /\.space-node-toolbar\s*\{[\s\S]*right:\s*-40px/);
  assert.match(appCss, /\.space-node-toolbar\s*\{[\s\S]*display:\s*inline-flex/);
});

test("Spaces-style image generation node keeps a large prompt area", () => {
  assert.match(creativeCanvasScreen, /className="space-node-prompt"/);
  assert.match(creativeCanvasScreen, /aria-label="Prompt"/);
  assert.match(
    creativeCanvasScreen,
    /어떤 이미지를 생성하고 싶은지 설명해주세요\.\.\./,
  );
  assert.match(appCss, /\.space-node-prompt\s*\{[\s\S]*top:\s*54px/);
  assert.match(appCss, /\.space-node-prompt\s*\{[\s\S]*bottom:\s*76px/);
  assert.match(appCss, /\.space-node-prompt\s*\{[\s\S]*min-height:\s*120px/);
});

test("Spaces-style image generation node stays compact and not page-like", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.match(
    creativeCanvasScreen,
    /style=\{\{ width: frameWidth, height: frameHeight \}\}/,
  );
  assert.match(
    creativeCanvasScreen,
    /const storedFrameWidth = imageGeneration\.frame\.width;/,
  );
  assert.match(
    creativeCanvasScreen,
    /const storedFrameHeight = imageGeneration\.frame\.height;/,
  );
  assert.match(
    creativeCanvasScreen,
    /Math\.max\(\s*IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.minWidth,\s*storedFrameWidth,\s*\)/,
  );
  assert.match(
    creativeCanvasScreen,
    /Math\.max\(\s*IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.minHeight,\s*storedFrameHeight,\s*\)/,
  );
  assert.doesNotMatch(
    creativeCanvasScreen,
    /(?:width|height)\s*\?\?\s*imageGeneration\.frame\.(?:width|height)/,
  );
  assert.match(creativeCanvasScreen, /IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.minWidth/);
  assert.match(creativeCanvasScreen, /IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.minHeight/);
  assert.match(creativeCanvasScreen, /maxWidth=\{IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.maxWidth\}/);
  assert.match(creativeCanvasScreen, /maxHeight=\{IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.maxHeight\}/);
  assert.match(creativeCanvasScreen, /Math\.min\([\s\S]*IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.maxWidth/);
  assert.match(creativeCanvasScreen, /Math\.min\([\s\S]*IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.maxHeight/);
  assert.match(appCss, /\.space-image-node-card\s*\{[\s\S]*min-width:\s*320px/);
  assert.match(appCss, /\.space-image-node-card\s*\{[\s\S]*min-height:\s*260px/);
  assert.doesNotMatch(imageNodeSource, /className="[^"]*(?:page|generator-page|fullscreen|preview-grid|preview-panel)[^"]*"/i);
  assert.doesNotMatch(appCss, /\.space-image-node-card\s*\{[\s\S]*(?:width:\s*100vw|height:\s*100vh|position:\s*fixed)/i);
});

test("Spaces-style image generation node keeps bottom setting chips", () => {
  const defaultImageGeneration = createImageGenerationNodeProperties();
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.equal(defaultImageGeneration.aspectRatio, "9:16");
  assert.equal(defaultImageGeneration.frame.width, IMAGE_GENERATION_DEFAULT_FRAME.width);
  assert.equal(defaultImageGeneration.frame.height, IMAGE_GENERATION_DEFAULT_FRAME.height);
  assert.match(creativeCanvasScreen, /className="space-node-controls nodrag"/);
  assert.match(creativeCanvasScreen, /aria-label="Image generation settings"/);
  assert.match(creativeCanvasScreen, /className="space-control-chip count"/);
  assert.match(creativeCanvasScreen, /<strong>x\{details\.batchCount\}<\/strong>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip model"/);
  assert.match(creativeCanvasScreen, /<span>\{modelLabel\}<\/span>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip ratio"/);
  assert.match(imageNodeSource, /value=\{details\.aspectRatio\}/);
  assert.match(imageNodeSource, /onChange=\{handleAspectRatioChange\}/);
  assert.match(imageNodeSource, /imageGenerationAspectRatioOptions\.map/);
  assert.doesNotMatch(imageNodeSource, /<span>16:9<\/span>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip quality"/);
  assert.match(creativeCanvasScreen, /<span>1K<\/span>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip icon"/);
  assert.match(creativeCanvasScreen, /aria-label="Advanced settings"/);
  assert.match(appCss, /\.space-node-controls\s*\{[\s\S]*bottom:\s*22px/);
  assert.match(appCss, /\.space-node-controls\s*\{[\s\S]*display:\s*flex/);
});

test("Spaces-style image generation node ratio selector writes selected output aspect ratio", () => {
  const defaultImageGeneration = createImageGenerationNodeProperties();
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.deepEqual(imageGenerationAspectRatioOptions, ["9:16", "1:1", "16:9"]);
  assert.equal(defaultImageGeneration.aspectRatio, "9:16");
  assert.match(
    creativeCanvasScreen,
    /selectImageGenerationNodeAspectRatioTransition\(\s*properties,\s*aspectRatio,\s*\)/,
  );
  assert.match(creativeCanvasScreen, /width:\s*nextProperties\.frame\.width/);
  assert.match(creativeCanvasScreen, /height:\s*nextProperties\.frame\.height/);
  assert.match(
    imageNodeSource,
    /onAspectRatioChange\(event\.currentTarget\.value as ImageGenerationAspectRatio\)/,
  );
  assert.match(imageNodeSource, /aria-label="Output aspect ratio"/);
  assert.match(appCss, /\.space-control-select\s*\{[\s\S]*appearance:\s*none/);
});

test("Spaces-style image generation node uses valid DOM containers for embedded handles", () => {
  assert.match(
    creativeCanvasScreen,
    /<div\s+className="space-side-port text-port prompt-input-affordance"[\s\S]*?<Handle[\s\S]*?prompt-input-handle[\s\S]*?<\/div>/,
  );
  assert.match(
    creativeCanvasScreen,
    /<div\s+className="space-side-port image-port"[\s\S]*?<Handle[\s\S]*?reference-image-handle[\s\S]*?<\/div>/,
  );
  assert.match(
    creativeCanvasScreen,
    /<div\s+className="space-side-port space-output-port"[\s\S]*?<Handle[\s\S]*?generated-output-handle[\s\S]*?<\/div>/,
  );
});

test("Spaces-style image generation node keeps the bottom-right circular run button", () => {
  assert.match(creativeCanvasScreen, /className="space-run-button nodrag"/);
  assert.match(creativeCanvasScreen, /aria-label="Generate image"/);
  assert.match(creativeCanvasScreen, /<Play className="size-4" fill="currentColor" \/>/);
  assert.match(appCss, /\.space-run-button\s*\{[\s\S]*position:\s*absolute/);
  assert.match(appCss, /\.space-run-button\s*\{[\s\S]*right:\s*18px/);
  assert.match(appCss, /\.space-run-button\s*\{[\s\S]*bottom:\s*22px/);
  assert.match(appCss, /\.space-run-button\s*\{[\s\S]*width:\s*34px/);
  assert.match(appCss, /\.space-run-button\s*\{[\s\S]*height:\s*34px/);
  assert.match(appCss, /\.space-run-button\s*\{[\s\S]*border-radius:\s*999px/);
});

test("Spaces-style image generation node renders compact lifecycle status feedback", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.match(imageNodeSource, /resolveImageGenerationNodeStatus\(\{/);
  assert.match(imageNodeSource, /selected,\s*uiState: details\.uiState/);
  assert.match(imageNodeSource, /resolveImageGenerationNodeStatusView\(nodeStatus\)/);
  assert.match(
    imageNodeSource,
    /className=\{cn\("space-node-status", nodeStatusView\.className\)\}/,
  );
  assert.match(imageNodeSource, /data-status=\{nodeStatusView\.status\}/);
  assert.match(imageNodeSource, /role="status"/);
  assert.match(imageNodeSource, /aria-label=\{nodeStatusView\.ariaLabel\}/);
  assert.match(imageNodeSource, /\{nodeStatusView\.label\}/);
  assert.doesNotMatch(imageNodeSource, /if \(status ===/);
  assert.doesNotMatch(imageNodeSource, /invoke|retry|runGeneration|generateImage/);
  assert.match(appCss, /\.space-node-status\s*\{[\s\S]*position:\s*absolute/);
  assert.match(appCss, /\.space-node-status\.selected\s*\{[\s\S]*color:\s*#2563eb/);
  assert.match(appCss, /\.space-node-status\.running\s*\{[\s\S]*color:\s*#c2410c/);
  assert.match(appCss, /\.space-node-status\.completed\s*\{[\s\S]*color:\s*#047857/);
  assert.match(appCss, /\.space-node-status\.error\s*\{[\s\S]*color:\s*#b91c1c/);
});

test("Spaces-style image generation node has non-generating UI coverage for every lifecycle status", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);
  const statusBadgeStart = imageNodeSource.indexOf(
    'className={cn("space-node-status", nodeStatusView.className)}',
  );
  const statusBadgeEnd = imageNodeSource.indexOf(
    "</span>",
    statusBadgeStart,
  );
  assert.notEqual(statusBadgeStart, -1);
  assert.notEqual(statusBadgeEnd, -1);

  const statusBadgeSource = imageNodeSource.slice(
    statusBadgeStart,
    statusBadgeEnd,
  );

  const statusBadgeStories = imageGenerationNodeStatuses.map((status) => {
    const view = resolveImageGenerationNodeStatusView(status);

    return {
      status,
      renderedBadge: {
        role: "status",
        className: `space-node-status ${view.className}`,
        dataStatus: view.status,
        ariaLabel: view.ariaLabel,
        text: view.label,
      },
    };
  });

  assert.deepEqual(
    statusBadgeStories.map((story) => story.status),
    imageGenerationNodeStatuses,
  );
  assert.deepEqual(
    statusBadgeStories.map((story) => story.renderedBadge),
    [
      {
        role: "status",
        className: "space-node-status idle",
        dataStatus: "idle",
        ariaLabel: "Image node status: idle",
        text: "Idle",
      },
      {
        role: "status",
        className: "space-node-status selected",
        dataStatus: "selected",
        ariaLabel: "Image node status: selected",
        text: "Selected",
      },
      {
        role: "status",
        className: "space-node-status running",
        dataStatus: "running",
        ariaLabel: "Image node status: running",
        text: "Running",
      },
      {
        role: "status",
        className: "space-node-status completed",
        dataStatus: "completed",
        ariaLabel: "Image node status: completed",
        text: "Ready",
      },
      {
        role: "status",
        className: "space-node-status error",
        dataStatus: "error",
        ariaLabel: "Image node status: error",
        text: "Error",
      },
      {
        role: "status",
        className: "space-node-status cancelled",
        dataStatus: "cancelled",
        ariaLabel: "Image node status: cancelled",
        text: "Cancelled",
      },
    ],
  );

  for (const story of statusBadgeStories) {
    assert.match(
      appCss,
      new RegExp(`\\.space-node-status\\.${story.status}\\s*\\{[\\s\\S]*color:`),
      `${story.status} status should have explicit compact badge styling`,
    );
    assert.doesNotMatch(
      JSON.stringify(story.renderedBadge),
      /type|button|on(?:Click|PointerDown|MouseDown|Submit)|invoke|retry|runGeneration|generateImage/i,
    );
  }

  assert.match(statusBadgeSource, /data-status=\{nodeStatusView\.status\}/);
  assert.match(statusBadgeSource, /aria-label=\{nodeStatusView\.ariaLabel\}/);
  assert.match(statusBadgeSource, /\{nodeStatusView\.label\}/);
  assert.doesNotMatch(
    statusBadgeSource,
    /type="button"|on(?:Click|PointerDown|MouseDown|Submit)=|invoke|retry|runGeneration|generateImage|Generate image/i,
  );
});

test("Spaces-style image generation node has visible feedback for every v2 lifecycle status", () => {
  const legacyStatusSet = new Set<string>(imageGenerationNodeStatuses);
  const statusStories = [
    ...imageGenerationNodeStatuses,
    ...imageGenerationNodeV2Statuses.filter(
      (status) => !legacyStatusSet.has(status),
    ),
  ].map((status) => {
    const view = resolveImageGenerationNodeStatusView(status);

    return {
      status,
      renderedBadge: {
        role: "status",
        className: `space-node-status ${view.className}`,
        dataStatus: view.status,
        ariaLabel: view.ariaLabel,
        text: view.label,
      },
    };
  });

  assert.deepEqual(
    statusStories.map((story) => story.status),
    [
      "idle",
      "selected",
      "running",
      "completed",
      "error",
      "cancelled",
      "queued",
      "succeeded",
      "failed",
      "canceled",
    ],
  );

  for (const story of statusStories) {
    assert.match(
      appCss,
      new RegExp(`\\.space-node-status\\.${story.status}\\s*\\{[\\s\\S]*color:`),
      `${story.status} status should render with explicit visible feedback styling`,
    );
    assert.equal(story.renderedBadge.role, "status");
    assert.equal(story.renderedBadge.dataStatus, story.status);
    assert.match(story.renderedBadge.className, new RegExp(`\\b${story.status}\\b`));
    assert.match(story.renderedBadge.ariaLabel, /^Image node status: /);
    assert.notEqual(story.renderedBadge.text, "");
  }
});

test("image generation node status feedback story fixtures render every visible status badge", () => {
  assert.deepEqual(
    imageGenerationNodeStatusFeedbackStoryFixtures.map((fixture) => fixture.status),
    imageGenerationNodeV2Statuses,
  );

  for (const fixture of imageGenerationNodeStatusFeedbackStoryFixtures) {
    assert.equal(fixture.badge.role, "status");
    assert.equal(fixture.badge.dataStatus, fixture.status);
    assert.match(fixture.badge.className, /\bspace-node-status\b/);
    assert.match(fixture.badge.className, new RegExp(`\\b${fixture.status}\\b`));
    assert.match(fixture.badge.ariaLabel, /^Image node status: /);
    assert.notEqual(fixture.badge.text, "");
    assert.match(
      fixture.renderedHtml,
      new RegExp(
        `<span class="${fixture.badge.className}" data-status="${fixture.status}" role="status" aria-label="${fixture.badge.ariaLabel}">${fixture.badge.text}</span>`,
      ),
    );
    assert.match(
      appCss,
      new RegExp(`\\.space-node-status\\.${fixture.status}\\s*\\{[\\s\\S]*color:`),
      `${fixture.status} fixture should have visible badge styling`,
    );
  }
});

test("image generation node error and recovery fixtures stay compact and non-generating", () => {
  assert.deepEqual(
    imageGenerationNodeErrorRecoveryFeedbackFixtures.map((fixture) => ({
      id: fixture.id,
      phase: fixture.phase,
      retryable: fixture.retryable,
      status: fixture.status,
      statusMessage: fixture.statusMessage,
      errorReason: fixture.errorReason,
      outputState: fixture.outputBadge.dataOutputState,
      outputConnectionReady: fixture.outputConnectionReady,
    })),
    [
      {
        id: "image-generation-node-error-retryable-provider",
        phase: "error",
        retryable: true,
        status: "error",
        statusMessage: "Generation failed",
        errorReason: "Replicate is temporarily rate limited",
        outputState: "error",
        outputConnectionReady: false,
      },
      {
        id: "image-generation-node-error-non-retryable-provider",
        phase: "error",
        retryable: false,
        status: "error",
        statusMessage: "Generation failed",
        errorReason: "Provider rejected unsafe reference image",
        outputState: "error",
        outputConnectionReady: false,
      },
      {
        id: "image-generation-node-recovery-queued",
        phase: "recovery",
        retryable: true,
        status: "queued",
        statusMessage: "Generation queued",
        errorReason: null,
        outputState: "empty-output",
        outputConnectionReady: false,
      },
      {
        id: "image-generation-node-recovery-succeeded",
        phase: "recovery",
        retryable: true,
        status: "succeeded",
        statusMessage: "Generation complete",
        errorReason: null,
        outputState: "success",
        outputConnectionReady: true,
      },
    ],
  );

  for (const fixture of imageGenerationNodeErrorRecoveryFeedbackFixtures) {
    assert.equal(fixture.statusBadge.role, "status");
    assert.match(fixture.statusBadge.className, /\bspace-node-status\b/);
    assert.match(fixture.outputBadge.className, /\bspace-primary-output-preview\b/);
    assert.notEqual(fixture.statusBadge.text, "");
    assert.notEqual(fixture.outputBadge.text, "");
    assert.match(
      appCss,
      new RegExp(
        `\\.space-node-status\\.${fixture.statusBadge.dataStatus}\\s*\\{[\\s\\S]*color:`,
      ),
      `${fixture.id} should keep compact status styling`,
    );
    assert.match(
      appCss,
      new RegExp(
        `\\.space-primary-output-preview\\.${fixture.outputBadge.dataOutputState}\\s*\\{[\\s\\S]*border-color:`,
      ),
      `${fixture.id} should keep compact output-state styling`,
    );
    assert.doesNotMatch(
      fixture.renderedHtml,
      /class="[^"]*(?:page|generator-page|fullscreen|preview-grid|preview-panel)[^"]*"/i,
    );
    assert.doesNotMatch(
      fixture.renderedHtml,
      /<button\b|<form\b|type="button"|on(?:Click|PointerDown|MouseDown|Submit)|invoke|retry|runGeneration|generateImage|Generate image/i,
    );
  }
});

test("Spaces-style image generation node keeps the lower-right resize handle", () => {
  assert.match(creativeCanvasScreen, /<NodeResizer/);
  assert.match(
    creativeCanvasScreen,
    /handleClassName="space-node-resize-handle"/,
  );
  assert.match(creativeCanvasScreen, /isVisible=\{selected\}/);
  assert.match(creativeCanvasScreen, /keepAspectRatio/);
  assert.match(
    creativeCanvasScreen,
    /<span className="space-node-resize-corner" aria-hidden="true" \/>/,
  );
  assert.match(appCss, /\.space-node-resize-corner\s*\{[\s\S]*right:\s*5px/);
  assert.match(appCss, /\.space-node-resize-corner\s*\{[\s\S]*bottom:\s*5px/);
  assert.match(appCss, /\.space-node-resize-handle\s*\{[\s\S]*display:\s*none !important/);
  assert.match(
    appCss,
    /\.space-node-resize-handle\.bottom\.right\s*\{[\s\S]*display:\s*none !important/,
  );
});

test("Spaces-style image generation node only allows a single primary output preview", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);
  const primaryPreviewMatches = imageNodeSource.match(
    /className=\{cn\("space-primary-output-preview", outputView\.className\)\}/g,
  ) ?? [];

  assert.equal(primaryPreviewMatches.length, 1);
  assert.match(imageNodeSource, /aria-label=\{outputView\.ariaLabel\}/);
  assert.match(appCss, /\.space-primary-output-preview\s*\{[\s\S]*width:\s*46px/);
  assert.match(appCss, /\.space-primary-output-preview\s*\{[\s\S]*height:\s*82px/);
  assert.doesNotMatch(imageNodeSource, /freepik-preview-grid/);
  assert.doesNotMatch(imageNodeSource, /freepik-preview-panel/);
  assert.doesNotMatch(imageNodeSource, /freepik-preview-\d+\.jpg/);
  assert.doesNotMatch(imageNodeSource, /(?:outputs|generatedAssetIds)\.map\(/);
  assert.doesNotMatch(imageNodeSource, /<img\b/);
  assert.doesNotMatch(appCss, /\.freepik-preview-grid\b/);
  assert.doesNotMatch(appCss, /\.freepik-preview-panel\b/);
});

test("Spaces-style image generation node renders output area states", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.match(imageNodeSource, /resolveImageGenerationNodeOutputView\(details\)/);
  assert.match(
    imageNodeSource,
    /className=\{cn\("space-primary-output-preview", outputView\.className\)\}/,
  );
  assert.match(imageNodeSource, /data-output-state=\{outputView\.state\}/);
  assert.match(imageNodeSource, /aria-label=\{outputView\.ariaLabel\}/);
  assert.match(imageNodeSource, /\{outputView\.label\}/);
  assert.match(appCss, /\.space-primary-output-preview\.success\s*\{[\s\S]*border-color:\s*rgba\(57,\s*191,\s*69,\s*0\.64\)/);
  assert.match(appCss, /\.space-primary-output-preview\.error\s*\{[\s\S]*border-color:\s*rgba\(185,\s*28,\s*28,\s*0\.48\)/);
  assert.match(appCss, /\.space-primary-output-preview\.cancelled\s*\{[\s\S]*border-color:\s*rgba\(100,\s*116,\s*139,\s*0\.42\)/);
  assert.match(appCss, /\.space-primary-output-preview\.empty-output\s*\{[\s\S]*border-color:\s*rgba\(226,\s*232,\s*240,\s*0\.92\)/);
});

test("Spaces-style image generation node hides JSON, secrets, storage, and debug copy", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.doesNotMatch(imageNodeSource, />[^<]*(?:JSON|schema|storage|debug|secret|token|API key|canvas\.json|assets\/|runs\/|metadata|cost)[^<]*</i);
  assert.doesNotMatch(imageNodeSource, /aria-label="[^"]*(?:JSON|schema|storage|debug|secret|token|API key|metadata|cost)[^"]*"/i);
  assert.doesNotMatch(imageNodeSource, /title=\{[^}]*(?:JSON|schema|storage|debug|secret|token|API key|payload|request|response|trace|metadata|cost)[^}]*\}/i);
  assert.doesNotMatch(imageNodeSource, /title=\{[^}]*(?:secretEnvName|storage|canvasJsonPath|assetDirectory|runHistory|latestResultRefs|metadataRunId|costUsageRunId)[^}]*\}/i);
  assert.doesNotMatch(imageNodeSource, /secretEnvName|canvasJsonPath|assetDirectory|runHistory|latestResultRefs|metadataRunId|costUsageRunId/);
  assert.doesNotMatch(imageNodeSource, /\?\?\s*details\.(?:inputs|outputs)\[/);
  assert.match(
    imageNodeSource,
    /details\.inputs\.find\(\(port\) => port\.id === "prompt"\)/,
  );
  assert.match(
    imageNodeSource,
    /details\.inputs\.find\(\(port\) => port\.id === "reference_image" && port\.dataType === "asset"\)/,
  );
  assert.match(
    imageNodeSource,
    /details\.outputs\.find\([\s\S]*port\.id === "generated_image_asset" && port\.dataType === "asset"[\s\S]*\)/,
  );
  assert.doesNotMatch(
    imageNodeSource,
    /(?:metadata|cost_usage|style_template_vars|payload|raw|debug|trace|request|response)/i,
  );
});
