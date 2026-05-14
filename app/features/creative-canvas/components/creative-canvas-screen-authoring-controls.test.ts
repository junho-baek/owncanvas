import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

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

test("Spaces-style image generation node keeps bottom setting chips", () => {
  assert.match(creativeCanvasScreen, /className="space-node-controls nodrag"/);
  assert.match(creativeCanvasScreen, /aria-label="Image generation settings"/);
  assert.match(creativeCanvasScreen, /className="space-control-chip count"/);
  assert.match(creativeCanvasScreen, /<strong>x\{details\.batchCount\}<\/strong>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip model"/);
  assert.match(creativeCanvasScreen, /<span>\{modelLabel\}<\/span>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip ratio"/);
  assert.match(creativeCanvasScreen, /<span>\{details\.aspectRatio\}<\/span>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip quality"/);
  assert.match(creativeCanvasScreen, /<span>1K<\/span>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip icon"/);
  assert.match(creativeCanvasScreen, /aria-label="Advanced settings"/);
  assert.match(appCss, /\.space-node-controls\s*\{[\s\S]*bottom:\s*22px/);
  assert.match(appCss, /\.space-node-controls\s*\{[\s\S]*display:\s*flex/);
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

test("Spaces-style image generation node does not render a preview grid", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.doesNotMatch(imageNodeSource, /freepik-preview-grid/);
  assert.doesNotMatch(imageNodeSource, /freepik-preview-panel/);
  assert.doesNotMatch(imageNodeSource, /freepik-preview-\d+\.jpg/);
  assert.doesNotMatch(imageNodeSource, /<img\b/);
  assert.doesNotMatch(appCss, /\.freepik-preview-grid\b/);
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
  assert.doesNotMatch(imageNodeSource, /title=\{[^}]*(?:secretEnvName|storage|canvasJsonPath|assetDirectory|runHistory|latestResultRefs|metadataRunId|costUsageRunId)[^}]*\}/i);
  assert.doesNotMatch(imageNodeSource, /secretEnvName|canvasJsonPath|assetDirectory|runHistory|latestResultRefs|metadataRunId|costUsageRunId/);
});
