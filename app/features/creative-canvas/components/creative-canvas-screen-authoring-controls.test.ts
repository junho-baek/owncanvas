import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createCampaignBlock, generationPalette } from "../model/creative-canvas.ts";
import {
  IMAGE_GENERATION_COMPACT_FRAME_LIMITS,
  IMAGE_GENERATION_DEFAULT_FRAME,
  closeImageGenerationNodeInspectorTransition,
  createImageGenerationNodeProperties,
  getImageGenerationModelCapability,
  imageGenerationAspectRatioOptions,
  imageGenerationNodeStatuses,
  imageGenerationNodeV2Statuses,
  openImageGenerationNodeInspectorTransition,
  resolveImageGenerationAspectRatioSelectorOptions,
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

function splitCampaignPanelDeveloperDetails(panelSource: string) {
  const developerDetailsStart = panelSource.indexOf(
    '<details className="metadata-developer-details">',
  );
  assert.notEqual(developerDetailsStart, -1);

  const developerDetailsClose = "\n      </details>";
  const developerDetailsEnd = panelSource.indexOf(
    developerDetailsClose,
    developerDetailsStart,
  );
  assert.notEqual(developerDetailsEnd, -1);

  const developerDetailsSource = panelSource.slice(
    developerDetailsStart,
    developerDetailsEnd + developerDetailsClose.length,
  );
  const primaryPanelSource =
    panelSource.slice(0, developerDetailsStart) +
    panelSource.slice(developerDetailsEnd + developerDetailsClose.length);

  return { developerDetailsSource, primaryPanelSource };
}

function getCssRuleBlock(selector: string) {
  const start = appCss.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} rule should exist`);

  const end = appCss.indexOf("\n}", start);
  assert.notEqual(end, -1, `${selector} rule should close`);

  return appCss.slice(start, end + 2);
}

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

test("campaign blocks palette uses concise creative labels without visible technical badges", () => {
  const paletteStart = creativeCanvasScreen.indexOf("function GenerationPalette");
  const paletteEnd = creativeCanvasScreen.indexOf("function CanvasStatus");
  assert.notEqual(paletteStart, -1);
  assert.notEqual(paletteEnd, -1);

  const paletteSource = creativeCanvasScreen.slice(paletteStart, paletteEnd);

  assert.deepEqual(
    generationPalette.map((item) => ({
      kind: item.kind,
      title: item.title,
      description: item.description,
    })),
    [
      { kind: "text", title: "Copy", description: "Hooks, captions, prompts" },
      { kind: "llm", title: "Prompt", description: "Structured drafts from a brief" },
      { kind: "image", title: "Image", description: "Generate, edit, remix" },
      { kind: "video", title: "Video", description: "Turn frames into motion" },
      { kind: "voice", title: "Voice", description: "Narration variants" },
      { kind: "agent", title: "Operator", description: "Repeat campaign steps" },
      { kind: "dm", title: "DM", description: "Replies and comment triggers" },
      { kind: "landing", title: "Landing", description: "Publishable offer page" },
      { kind: "custom", title: "Plugin", description: "Add-on creative action" },
    ],
  );

  assert.match(paletteSource, /aria-label="Campaign blocks"/);
  assert.match(paletteSource, /<span className="palette-kicker">CREATE<\/span>/);
  assert.match(paletteSource, /<strong>Blocks<\/strong>/);
  assert.doesNotMatch(paletteSource, /GENERATION PALETTE|palette-badge|LLM Block|Agent Block|Custom Block/);
  assert.doesNotMatch(appCss, /\.palette-item:hover/);
});

test("created generation blocks avoid console labels and provider setup copy", () => {
  const createdBlocks = generationPalette.map((item, index) =>
    createCampaignBlock(item.kind, index),
  );
  const createdBlockCopy = JSON.stringify(
    createdBlocks.map((block) => ({
      title: block.title,
      subtitle: block.subtitle,
      description: block.description,
      contracts: block.contracts,
    })),
  );
  const expectedTitles = [
    "Copy",
    "Prompt",
    "Image Block",
    "Video",
    "Voice",
    "Operator",
    "DM",
    "Landing",
    "Plugin",
  ];

  assert.deepEqual(
    createdBlocks.map((block) => block.title),
    expectedTitles,
  );

  for (const block of createdBlocks) {
    assert.doesNotMatch(
      block.contracts.map((contract) => contract.label).join(" "),
      /\b(?:MODEL|PLUGIN)\b/,
    );
    assert.doesNotMatch(
      block.contracts.map((contract) => contract.state).join(" "),
      /\bBYO\b/,
    );
  }

  assert.doesNotMatch(
    createdBlockCopy,
    /LLM Block|Agent Block|Custom Block|MODEL|PLUGIN|BYO LLM account|BYO provider|Configured LLM provider|Agent plugin|Custom plugin/,
  );

  const generationNodeStart = creativeCanvasScreen.indexOf(
    "function GenerationBlockNode",
  );
  const generationNodeEnd = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  assert.notEqual(generationNodeStart, -1);
  assert.notEqual(generationNodeEnd, -1);

  const generationNodeSource = creativeCanvasScreen.slice(
    generationNodeStart,
    generationNodeEnd,
  );
  assert.match(generationNodeSource, /Ready to create/);
  assert.doesNotMatch(
    generationNodeSource,
    /LLM Block|Agent Block|Custom Block|MODEL|PLUGIN|BYO LLM account|BYO provider|Configured LLM provider|Agent plugin|Custom plugin/,
  );
});

test("right panel reads as a campaign brief instead of required metadata", () => {
  const panelStart = creativeCanvasScreen.indexOf("function CampaignMetadataPanel");
  const panelEnd = creativeCanvasScreen.indexOf("function MetadataSection");
  assert.notEqual(panelStart, -1);
  assert.notEqual(panelEnd, -1);

  const panelSource = creativeCanvasScreen.slice(panelStart, panelEnd);
  const { developerDetailsSource, primaryPanelSource } =
    splitCampaignPanelDeveloperDetails(panelSource);

  assert.match(panelSource, /aria-label="Campaign brief"/);
  assert.match(panelSource, /<span>BRIEF<\/span>/);
  assert.match(panelSource, /<strong>Campaign basics<\/strong>/);
  assert.match(panelSource, /className="campaign-brief-readiness"/);
  assert.match(panelSource, /<MetadataSection title="Audience">/);
  assert.match(panelSource, /<MetadataSection title="Offer product">/);
  assert.match(panelSource, /<MetadataSection title="Offer">/);
  assert.match(panelSource, /<MetadataSection title="Channels">/);
  assert.match(panelSource, /<MetadataSection title="Assets">/);
  assert.match(panelSource, /<MetadataSection title="Goals">/);
  assert.match(panelSource, /<details className="metadata-developer-details">/);
  assert.match(panelSource, /<summary>Developer details<\/summary>/);
  assert.doesNotMatch(panelSource, /Required metadata|Campaign JSON spec|Canonical spec/);
  assert.doesNotMatch(
    primaryPanelSource,
    /label="Provider plugin"|label="Account ID"|label="UTM source"|label="UTM medium"|label="UTM campaign"|label="UTM content"|label="Landing page ID"|title="Landing behavior"|Redirect allowed|label="Navigation timing"|label="Navigation interruption"|label="Conversion timing"|label="Conversion interruption"/,
  );
  assert.match(developerDetailsSource, /label="Provider plugin"/);
  assert.match(developerDetailsSource, /label="Account ID"/);
  assert.match(developerDetailsSource, /label="Landing page ID"/);
  assert.match(developerDetailsSource, /label="UTM source"/);
  assert.match(developerDetailsSource, /label="UTM medium"/);
  assert.match(developerDetailsSource, /label="UTM campaign"/);
  assert.match(developerDetailsSource, /label="UTM content"/);
  assert.match(developerDetailsSource, /<MetadataSection title="Landing behavior">/);
  assert.match(developerDetailsSource, /Redirect allowed/);
  assert.match(developerDetailsSource, /label="Navigation timing"/);
  assert.match(developerDetailsSource, /label="Navigation interruption"/);
  assert.match(developerDetailsSource, /label="Conversion timing"/);
  assert.match(developerDetailsSource, /label="Conversion interruption"/);

  const primarySectionOrder = [
    '<MetadataSection title="Audience">',
    '<MetadataSection title="Offer product">',
    '<MetadataSection title="Offer">',
    '<MetadataSection title="Channels">',
    '<MetadataSection title="Assets">',
    '<MetadataSection title="Goals">',
  ];
  let previousSectionIndex = -1;

  for (const section of primarySectionOrder) {
    const sectionIndex = panelSource.indexOf(section);
    assert.ok(
      sectionIndex > previousSectionIndex,
      `${section} should appear after the previous primary brief section`,
    );
    previousSectionIndex = sectionIndex;
  }

  const assetsIndex = panelSource.indexOf('<MetadataSection title="Assets">');
  const goalsIndex = panelSource.indexOf('<MetadataSection title="Goals">');
  const developerDetailsIndex = panelSource.indexOf(
    '<details className="metadata-developer-details">',
  );
  const sourceJsonIndex = panelSource.indexOf('<MetadataSection title="Source JSON">');
  const landingBehaviorIndex = panelSource.indexOf(
    '<MetadataSection title="Landing behavior">',
  );

  assert.ok(
    developerDetailsIndex > assetsIndex,
    "Developer details should appear after Assets",
  );
  assert.ok(
    developerDetailsIndex > goalsIndex,
    "Developer details should appear after Goals",
  );
  assert.ok(
    sourceJsonIndex > developerDetailsIndex,
    "Source JSON should be inside the final Developer details disclosure",
  );
  assert.ok(
    landingBehaviorIndex > developerDetailsIndex,
    "Landing behavior should be inside the final Developer details disclosure",
  );
});

test("campaign metadata required props remain accessible without visible required chips", () => {
  const fieldStart = creativeCanvasScreen.indexOf("function MetadataTextField");
  const fieldEnd = creativeCanvasScreen.indexOf("function MetadataSelect");
  const textAreaStart = creativeCanvasScreen.indexOf("function MetadataTextArea");
  const textAreaEnd = creativeCanvasScreen.indexOf("function MetadataJsonArea");
  assert.notEqual(fieldStart, -1);
  assert.notEqual(fieldEnd, -1);
  assert.notEqual(textAreaStart, -1);
  assert.notEqual(textAreaEnd, -1);

  const textFieldSource = creativeCanvasScreen.slice(fieldStart, fieldEnd);
  const textAreaSource = creativeCanvasScreen.slice(textAreaStart, textAreaEnd);
  const requiredControlSource = `${textFieldSource}\n${textAreaSource}`;

  assert.match(textFieldSource, /required = false/);
  assert.match(textFieldSource, /required=\{required\}/);
  assert.match(textFieldSource, /aria-required=\{required \? "true" : undefined\}/);
  assert.match(textAreaSource, /required = false/);
  assert.match(textAreaSource, /required=\{required\}/);
  assert.match(textAreaSource, /aria-required=\{required \? "true" : undefined\}/);
  assert.doesNotMatch(requiredControlSource, />Required</);
  assert.doesNotMatch(requiredControlSource, /className="[^"]*required[^"]*"/i);
});

test("creative canvas primary surfaces avoid console language and nested card treatment", () => {
  const paletteStart = creativeCanvasScreen.indexOf("function GenerationPalette");
  const paletteEnd = creativeCanvasScreen.indexOf("function CanvasStatus");
  const campaignStart = creativeCanvasScreen.indexOf("function CampaignMetadataPanel");
  const campaignEnd = creativeCanvasScreen.indexOf("function MetadataSection");
  const inspectorStart = creativeCanvasScreen.indexOf("function ImageGenerationInspectorPanel");
  const inspectorEnd = creativeCanvasScreen.indexOf("function PersistentShortFormPlayer");

  assert.notEqual(paletteStart, -1);
  assert.notEqual(paletteEnd, -1);
  assert.notEqual(campaignStart, -1);
  assert.notEqual(campaignEnd, -1);
  assert.notEqual(inspectorStart, -1);
  assert.notEqual(inspectorEnd, -1);

  const primarySurfaceSource = [
    creativeCanvasScreen.slice(paletteStart, paletteEnd),
    creativeCanvasScreen.slice(campaignStart, campaignEnd),
    creativeCanvasScreen
      .slice(inspectorStart, inspectorEnd)
      .replace(/<details className="image-generation-developer-details">[\s\S]*?<\/details>/, ""),
  ].join("\n");

  assert.doesNotMatch(
    primarySurfaceSource,
    /Provider settings|Schema adapter|Compatibility|Campaign JSON spec|Required metadata|Canonical spec|pipeline|log language/i,
  );
  assert.doesNotMatch(appCss, /\.metadata-section\s*\{[\s\S]*border-top:\s*1px/);
  assert.doesNotMatch(appCss, /\.image-generation-inspector-section dl div,\s*\.image-generation-docs-panel dl div\s*\{[\s\S]*border:\s*1px/);
  assert.match(appCss, /\.campaign-metadata-panel\s*\{[\s\S]*border-radius:\s*10px/);
  assert.match(appCss, /\.generation-palette\s*\{[\s\S]*border-radius:\s*10px/);
  assert.match(appCss, /\.image-generation-inspector-panel\s*\{[\s\S]*border-radius:\s*10px/);
  assert.match(appCss, /\.metadata-field input,\s*\.metadata-field textarea,\s*\.metadata-field select\s*\{[\s\S]*border-radius:\s*6px/);

  const assetRowRule = getCssRuleBlock(".metadata-asset-row");
  const assetRowActiveRule = getCssRuleBlock(
    ".metadata-asset-row:hover,\n.metadata-asset-row.active",
  );
  const assetDetailsRule = getCssRuleBlock(".metadata-asset-details");

  for (const ruleBlock of [assetRowRule, assetRowActiveRule, assetDetailsRule]) {
    assert.doesNotMatch(ruleBlock, /border:\s*1px/i);
    assert.doesNotMatch(ruleBlock, /border-radius:\s*10px/i);
    assert.doesNotMatch(ruleBlock, /background:\s*#(?:fffefa|ffffff)\b/i);
  }

  assert.match(assetRowRule, /border-bottom:\s*1px solid #dddddd/);
  assert.match(assetRowRule, /background:\s*transparent/);
  assert.match(assetRowActiveRule, /border-bottom-color:\s*#181d26/);
  assert.match(assetRowActiveRule, /background:\s*transparent/);
  assert.match(assetDetailsRule, /border-bottom:\s*1px solid #dddddd/);
  assert.match(assetDetailsRule, /background:\s*transparent/);
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
  assert.match(imageNodeSource, /aspectRatioSelectorOptions\.map/);
  assert.doesNotMatch(imageNodeSource, /<span>16:9<\/span>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip quality"/);
  assert.match(creativeCanvasScreen, /<span>1K<\/span>/);
  assert.match(creativeCanvasScreen, /className="space-control-chip icon"/);
  assert.match(creativeCanvasScreen, /aria-label="Open image inspector and docs"/);
  assert.match(appCss, /\.space-node-controls\s*\{[\s\S]*bottom:\s*22px/);
  assert.match(appCss, /\.space-node-controls\s*\{[\s\S]*display:\s*flex/);
});

test("Spaces-style image generation node has a compact inspector docs trigger", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.match(creativeCanvasScreen, /openImageGenerationNodeInspectorTransition/);
  assert.match(creativeCanvasScreen, /const handleImageInspectorOpen = useCallback/);
  assert.match(creativeCanvasScreen, /onImageInspectorOpen=\{handleImageInspectorOpen\}/);
  assert.match(creativeCanvasScreen, /onOpenInspector=\{\(\) => \{[\s\S]*onImageInspectorOpen\(data\.id\);[\s\S]*\}\}/);
  assert.match(imageNodeSource, /data-inspector-trigger="image-generation"/);
  assert.match(imageNodeSource, /aria-expanded=\{details\.uiState\.inspectorOpen \|\| details\.uiState\.docsPanelOpen\}/);
  assert.match(imageNodeSource, /onClick=\{onOpenInspector\}/);
  assert.match(imageNodeSource, /<Settings2 className="size-3" \/>/);
  assert.doesNotMatch(imageNodeSource, /className="[^"]*(?:inspector-panel|docs-panel|settings-panel)[^"]*"/);
});

test("Image generation docs panel renders provider model documentation", () => {
  const panelStart = creativeCanvasScreen.indexOf(
    "function ImageGenerationInspectorPanel",
  );
  const panelEnd = creativeCanvasScreen.indexOf(
    "function PersistentShortFormPlayer",
  );
  assert.notEqual(panelStart, -1);
  assert.notEqual(panelEnd, -1);

  const panelSource = creativeCanvasScreen.slice(panelStart, panelEnd);

  assert.match(panelSource, /className="image-generation-inspector-panel nodrag"/);
  assert.match(panelSource, /aria-label="Image Block setup"/);
  assert.match(panelSource, /<span>Image setup<\/span>/);
  assert.match(panelSource, /<h2>Model summary<\/h2>/);
  assert.match(panelSource, /<dt>Provider<\/dt>/);
  assert.match(panelSource, /<dt>Model<\/dt>/);
  assert.match(panelSource, /<dt>Status<\/dt>/);
  assert.match(panelSource, /<h2>Inputs<\/h2>/);
  assert.match(panelSource, /<h2>Creative controls<\/h2>/);
  assert.match(panelSource, /<details className="image-generation-developer-details">/);
  assert.match(panelSource, /<summary>Developer details<\/summary>/);
  assert.match(panelSource, /<h2>Provider diagnostics<\/h2>/);
  assert.match(panelSource, /<h2>Adapter mapping<\/h2>/);
  assert.match(panelSource, /<h2>Model limits<\/h2>/);
  assert.doesNotMatch(panelSource, /Provider settings|Provider model docs|Required inputs|Schema adapter|Compatibility/);
  assert.match(
    appCss,
    /\.image-generation-inspector-panel\s*\{[\s\S]*position:\s*fixed/,
  );
  assert.match(
    appCss,
    /\.image-generation-inspector-panel\s*\{[\s\S]*right:\s*376px/,
  );
  assert.match(
    appCss,
    /\.image-generation-inspector-panel\s*\{[\s\S]*top:\s*66px/,
  );
  assert.match(
    appCss,
    /\.image-generation-inspector-panel\s*\{[\s\S]*z-index:\s*22/,
  );
  assert.match(
    appCss,
    /\.image-generation-inspector-panel\s*\{[\s\S]*max-height:\s*calc\(100dvh - 90px\)/,
  );
  assert.match(
    appCss,
    /\.image-generation-inspector-panel\s*\{[\s\S]*overflow:\s*auto/,
  );
  assert.match(
    appCss,
    /\.image-generation-inspector-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(180px, 0\.74fr\) minmax\(260px, 1fr\)/,
  );
  assert.match(
    appCss,
    /\.image-generation-inspector-section,\s*\.image-generation-docs-panel\s*\{[\s\S]*min-width:\s*0/,
  );
  assert.match(
    appCss,
    /\.image-generation-docs-required-inputs,\s*\.image-generation-docs-optional-controls\s*\{[\s\S]*display:\s*grid/,
  );
  assert.match(
    appCss,
    /\.image-generation-docs-required-inputs li\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 0\.82fr\) minmax\(0, 1fr\) auto/,
  );
  assert.match(
    appCss,
    /\.image-generation-docs-optional-controls li\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 0\.78fr\) minmax\(0, 0\.86fr\) minmax\(0, 1fr\) auto/,
  );
  assert.doesNotMatch(appCss, /\.image-generation-credential-status\b/);
});

test("Image Block compact dimensions stay stable when the external panel opens, closes, and updates", () => {
  const renderFrame = (properties: ReturnType<typeof createImageGenerationNodeProperties>) => ({
    width: Math.min(
      IMAGE_GENERATION_COMPACT_FRAME_LIMITS.maxWidth,
      Math.max(IMAGE_GENERATION_COMPACT_FRAME_LIMITS.minWidth, properties.frame.width),
    ),
    height: Math.min(
      IMAGE_GENERATION_COMPACT_FRAME_LIMITS.maxHeight,
      Math.max(IMAGE_GENERATION_COMPACT_FRAME_LIMITS.minHeight, properties.frame.height),
    ),
  });
  const properties = createImageGenerationNodeProperties({
    frame: {
      ...IMAGE_GENERATION_DEFAULT_FRAME,
      width: 388,
      height: 640,
      source: "user-resize",
    },
  });
  const openedProperties = openImageGenerationNodeInspectorTransition(properties);
  const updatedPanelProperties = createImageGenerationNodeProperties({
    ...openedProperties,
    uiState: {
      ...openedProperties.uiState,
      statusMessage: "Inspector metadata refreshed",
    },
  });
  const closedProperties = closeImageGenerationNodeInspectorTransition(
    updatedPanelProperties,
  );

  assert.deepEqual(renderFrame(openedProperties), renderFrame(properties));
  assert.deepEqual(renderFrame(updatedPanelProperties), renderFrame(properties));
  assert.deepEqual(renderFrame(closedProperties), renderFrame(properties));
  assert.deepEqual(openedProperties.frame, properties.frame);
  assert.deepEqual(updatedPanelProperties.frame, properties.frame);
  assert.deepEqual(closedProperties.frame, properties.frame);

  const generationNodeStart = creativeCanvasScreen.indexOf(
    "function GenerationBlockNode",
  );
  const generationNodeEnd = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const openHandlerStart = creativeCanvasScreen.indexOf(
    "const handleImageInspectorOpen = useCallback",
  );
  const openHandlerEnd = creativeCanvasScreen.indexOf(
    "const handleImageInspectorClose = useCallback",
  );
  const closeHandlerEnd = creativeCanvasScreen.indexOf(
    "const creativeNodeTypes = useMemo<NodeTypes>",
  );
  assert.notEqual(generationNodeStart, -1);
  assert.notEqual(generationNodeEnd, -1);
  assert.notEqual(openHandlerStart, -1);
  assert.notEqual(openHandlerEnd, -1);
  assert.notEqual(closeHandlerEnd, -1);

  const generationNodeSource = creativeCanvasScreen.slice(
    generationNodeStart,
    generationNodeEnd,
  );
  const inspectorOpenHandlerSource = creativeCanvasScreen.slice(
    openHandlerStart,
    openHandlerEnd,
  );
  const inspectorCloseHandlerSource = creativeCanvasScreen.slice(
    openHandlerEnd,
    closeHandlerEnd,
  );

  assert.match(
    generationNodeSource,
    /style=\{\{ width: frameWidth, height: frameHeight \}\}/,
  );
  assert.match(generationNodeSource, /imageGeneration\.frame\.width/);
  assert.match(generationNodeSource, /imageGeneration\.frame\.height/);
  assert.doesNotMatch(generationNodeSource, /uiState\.(?:inspectorOpen|docsPanelOpen)/);
  assert.doesNotMatch(inspectorOpenHandlerSource, /\b(?:width|height):/);
  assert.doesNotMatch(inspectorCloseHandlerSource, /\b(?:width|height):/);
  assert.match(
    inspectorOpenHandlerSource,
    /properties: openImageGenerationNodeInspectorTransition\(properties\)/,
  );
  assert.match(
    inspectorCloseHandlerSource,
    /properties: closeImageGenerationNodeInspectorTransition\(properties\)/,
  );
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
  assert.match(
    imageNodeSource,
    /resolveImageGenerationAspectRatioSelectorOptions\(modelCapability\)/,
  );
  assert.match(imageNodeSource, /disabled=\{option\.disabled\}/);
  assert.match(imageNodeSource, /data-provider-ratio=\{option\.providerAspectRatio\}/);
  assert.match(
    imageNodeSource,
    /data-provider-ratio-availability=\{option\.availability\}/,
  );
  assert.match(imageNodeSource, /\{option\.label\}/);
  assert.match(appCss, /\.space-control-select\s*\{[\s\S]*appearance:\s*none/);
});

test("Spaces-style image generation node exposes GPT Image mapped and disabled ratio states", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);
  const gptImage = getImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

  assert.ok(gptImage);

  const gptImageRatioOptions =
    resolveImageGenerationAspectRatioSelectorOptions(gptImage);

  assert.deepEqual(
    gptImageRatioOptions.map((option) => ({
      aspectRatio: option.aspectRatio,
      providerAspectRatio: option.providerAspectRatio,
      availability: option.availability,
      disabled: option.disabled,
      label: option.label,
      compatibilityMessage: option.compatibilityMessage,
    })),
    [
      {
        aspectRatio: "9:16",
        providerAspectRatio: "2:3",
        availability: "mapped",
        disabled: false,
        label: "9:16 -> 2:3",
        compatibilityMessage: "9:16 is not native to GPT Image.",
      },
      {
        aspectRatio: "1:1",
        providerAspectRatio: "1:1",
        availability: "native",
        disabled: false,
        label: "1:1",
        compatibilityMessage: null,
      },
      {
        aspectRatio: "16:9",
        providerAspectRatio: "3:2",
        availability: "mapped",
        disabled: false,
        label: "16:9 -> 3:2",
        compatibilityMessage: "16:9 is not native to GPT Image.",
      },
    ],
  );

  const disabledRatioOptions = resolveImageGenerationAspectRatioSelectorOptions({
    ...gptImage,
    model: {
      ...gptImage.model,
      slug: "custom/disabled-ratio-model",
      label: "Disabled Ratio Model",
    },
    schemaAdapter: {
      ...gptImage.schemaAdapter,
      unsupportedRatioBehavior: "disable" as const,
    },
  });

  assert.deepEqual(
    disabledRatioOptions
      .filter((option) => option.availability === "disabled")
      .map((option) => ({
        aspectRatio: option.aspectRatio,
        disabled: option.disabled,
        compatibilityMessage: option.compatibilityMessage,
      })),
    [
      {
        aspectRatio: "9:16",
        disabled: true,
        compatibilityMessage: "9:16 is not supported by Disabled Ratio Model.",
      },
      {
        aspectRatio: "16:9",
        disabled: true,
        compatibilityMessage: "16:9 is not supported by Disabled Ratio Model.",
      },
    ],
  );

  assert.match(imageNodeSource, /disabled=\{option\.disabled\}/);
  assert.match(imageNodeSource, /data-provider-ratio=\{option\.providerAspectRatio\}/);
  assert.match(
    imageNodeSource,
    /data-provider-ratio-availability=\{option\.availability\}/,
  );
  assert.match(imageNodeSource, /title=\{option\.compatibilityMessage \?\? undefined\}/);
  assert.match(imageNodeSource, /\{option\.label\}/);
});

test("Spaces-style image generation node exposes browser-verifiable resize precedence state", () => {
  const generationNodeStart = creativeCanvasScreen.indexOf(
    "function GenerationBlockNode",
  );
  const generationNodeEnd = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  assert.notEqual(generationNodeStart, -1);
  assert.notEqual(generationNodeEnd, -1);

  const generationNodeSource = creativeCanvasScreen.slice(
    generationNodeStart,
    generationNodeEnd,
  );

  assert.match(
    generationNodeSource,
    /data-image-aspect-ratio=\{imageGeneration\.aspectRatio\}/,
  );
  assert.match(
    generationNodeSource,
    /data-image-frame-source=\{imageGeneration\.frame\.source\}/,
  );
  assert.match(
    generationNodeSource,
    /data-image-frame-width=\{imageGeneration\.frame\.width\}/,
  );
  assert.match(
    generationNodeSource,
    /data-image-frame-height=\{imageGeneration\.frame\.height\}/,
  );
  assert.match(
    generationNodeSource,
    /<NodeResizer[\s\S]*keepAspectRatio/,
  );
  assert.match(
    generationNodeSource,
    /minWidth=\{IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.minWidth\}/,
  );
  assert.match(
    generationNodeSource,
    /maxWidth=\{IMAGE_GENERATION_COMPACT_FRAME_LIMITS\.maxWidth\}/,
  );
  assert.match(
    creativeCanvasScreen,
    /const nextProperties = selectImageGenerationNodeAspectRatioTransition\([\s\S]*width:\s*nextProperties\.frame\.width[\s\S]*height:\s*nextProperties\.frame\.height/,
  );
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

test("Spaces-style image generation node exposes reference tray upload and URL controls", () => {
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
    imageNodeSource,
    /const referenceTrayVisible = selected \|\| details\.uiState\.referenceTrayOpen;/,
  );
  assert.match(
    imageNodeSource,
    /referencePort === undefined \|\| !referenceTrayVisible \? null : \(/,
  );
  assert.match(imageNodeSource, /className="space-reference-tray nodrag"/);
  assert.match(imageNodeSource, /aria-label="Reference attachments"/);
  assert.match(imageNodeSource, /className="space-reference-upload"/);
  assert.match(imageNodeSource, /type="file"/);
  assert.match(imageNodeSource, /accept="image\/\*"/);
  assert.match(imageNodeSource, /aria-label="Upload reference image"/);
  assert.match(imageNodeSource, /className="space-reference-url"/);
  assert.match(imageNodeSource, /type="url"/);
  assert.match(imageNodeSource, /placeholder="Paste image URL"/);
  assert.match(imageNodeSource, /aria-label="Attach reference image URL"/);
  assert.match(imageNodeSource, /attachReferenceUrlDraft/);
  assert.match(imageNodeSource, /className="space-reference-recent"/);
  assert.match(imageNodeSource, /aria-label="Recent generated assets"/);
  assert.match(imageNodeSource, /aria-label="Recent generated asset"/);
  assert.match(imageNodeSource, /No recent outputs/);
  assert.match(imageNodeSource, /Output \$\{index \+ 1\}/);
  assert.match(imageNodeSource, /aria-label="Attach recent generated asset as reference"/);
  assert.match(imageNodeSource, /kind: "recent_output"/);
  assert.match(imageNodeSource, /className="space-reference-existing"/);
  assert.match(imageNodeSource, /aria-label="Campaign assets"/);
  assert.match(imageNodeSource, /aria-label="Selected campaign asset"/);
  assert.match(imageNodeSource, /No image assets/);
  assert.match(imageNodeSource, /aria-label="Attach selected campaign asset as reference"/);
  assert.match(imageNodeSource, /kind: "asset"/);
  assert.match(imageNodeSource, /attachSelectedCampaignAsset/);
  assert.match(imageNodeSource, /campaignAssetReferences\.map/);
  assert.match(imageNodeSource, /const canAttachReference =/);
  assert.match(imageNodeSource, /referenceTrayCapability\.canAddReferences/);
  assert.match(imageNodeSource, /referenceTrayCapability\.acceptedTypes\.includes\("asset"\)/);
  assert.match(imageNodeSource, /referenceTrayCapability\.acceptedTypes\.includes\("url"\)/);
  assert.match(imageNodeSource, /referenceTrayCapability\.acceptedTypes\.includes\("recent_output"\)/);
  assert.match(imageNodeSource, /referenceTrayCapability\.addDisabledReason/);
  assert.match(imageNodeSource, /disabled=\{!canAttachReference\}/);
  assert.match(imageNodeSource, /disabled=\{!canAttachUrlReference/);
  assert.match(imageNodeSource, /aria-disabled=\{!canAttachRecentReference\}/);
  assert.match(imageNodeSource, /disabled=\{!canAttachRecentReference/);
  assert.match(imageNodeSource, /disabled=\{!canAttachCampaignAsset\}/);
  assert.match(imageNodeSource, /canRemove=\{referenceTrayCapability\.canRemoveReferences\}/);
  assert.match(imageNodeSource, /removeDisabledReason=\{referenceTrayCapability\.removeDisabledReason\}/);
  assert.match(imageNodeSource, /disabled=\{!canRemove\}/);
  assert.match(imageNodeSource, /title=\{removeDisabledReason \?\? attachment\.remove\.ariaLabel\}/);
  assert.match(imageNodeSource, /onReferenceAttach\(validation\.referenceInput\)/);
  assert.match(imageNodeSource, /listImageGenerationReferenceTrayAttachments\(details\)/);
  assert.match(imageNodeSource, /className="space-reference-attachment-list"/);
  assert.match(imageNodeSource, /aria-label="Attached reference images"/);
  assert.match(imageNodeSource, /ReferenceTrayAttachmentItem/);
  assert.match(imageNodeSource, /data-reference-order=\{attachment\.insertionOrder\}/);
  assert.match(imageNodeSource, /onReferenceReorder\(/);
  assert.match(imageNodeSource, /aria-label="Reference order controls"/);
  assert.match(imageNodeSource, /aria-label=\{attachment\.reorder\.moveUpAriaLabel\}/);
  assert.match(imageNodeSource, /aria-label=\{attachment\.reorder\.moveDownAriaLabel\}/);
  assert.match(imageNodeSource, /disabled=\{!attachment\.reorder\.canMoveUp\}/);
  assert.match(imageNodeSource, /disabled=\{!attachment\.reorder\.canMoveDown\}/);
  assert.match(imageNodeSource, /handleReferenceRemove\(\{/);
  assert.match(imageNodeSource, /id: attachment\.id/);
  assert.match(imageNodeSource, /resolveImageGenerationReferenceTrayEmptyState\(details\)/);
  assert.match(imageNodeSource, /className="space-reference-empty-state"/);
  assert.match(imageNodeSource, /<strong>\{referenceTrayEmptyState\.label\}<\/strong>/);
  assert.match(imageNodeSource, /<span>\{referenceTrayEmptyState\.description\}<\/span>/);
  assert.match(imageNodeSource, /cleanupStaleReferenceSelections/);
  assert.match(imageNodeSource, /setCampaignAssetDraft\(""\)/);
  assert.match(imageNodeSource, /setRecentOutputDraft\(""\)/);
  assert.match(
    creativeCanvasScreen,
    /recentGeneratedAssetIds=\{imageGeneration\.latestResultRefs\.generatedAssetIds\}/,
  );
  assert.match(
    creativeCanvasScreen,
    /campaignAssetReferences=\{campaignAssetReferences\}/,
  );
  assert.match(
    creativeCanvasScreen,
    /attachImageGenerationNodeReferenceTransition\([\s\S]*properties,[\s\S]*referenceInput[\s\S]*\)/,
  );
  assert.match(
    creativeCanvasScreen,
    /removeImageGenerationNodeReferenceTransition\([\s\S]*properties,[\s\S]*referenceInput[\s\S]*\)/,
  );
  assert.match(
    creativeCanvasScreen,
    /reorderImageGenerationNodeReferenceTransition\([\s\S]*properties,[\s\S]*referenceInput,[\s\S]*direction[\s\S]*\)/,
  );
  assert.match(appCss, /\.space-reference-tray\s*\{[\s\S]*position:\s*absolute/);
  assert.match(appCss, /\.space-reference-tray\s*\{[\s\S]*left:\s*22px/);
  assert.match(appCss, /\.space-reference-tray\s*\{[\s\S]*top:\s*100%/);
  assert.match(appCss, /\.space-reference-upload\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(appCss, /\.space-reference-url\s*\{[\s\S]*min-width:\s*180px/);
  assert.match(appCss, /\.space-reference-recent\s*\{[\s\S]*min-width:\s*218px/);
  assert.match(appCss, /\.space-reference-existing\s*\{[\s\S]*min-width:\s*218px/);
  assert.match(appCss, /\.space-reference-recent button\s*\{[\s\S]*background:\s*#181d26/);
  assert.match(appCss, /\.space-reference-existing button\s*\{[\s\S]*background:\s*#181d26/);
  assert.match(appCss, /\.space-reference-attachment-list\s*\{[\s\S]*display:\s*grid/);
  assert.match(appCss, /\.space-reference-empty-state\s*\{[\s\S]*border:\s*1px dashed #dddddd/);
  assert.match(appCss, /\.space-reference-order-controls\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(appCss, /\.space-reference-preview\s*\{[\s\S]*width:\s*32px/);
  assert.match(appCss, /\.space-reference-attachment button\s*\{[\s\S]*width:\s*24px/);
  assert.doesNotMatch(
    imageNodeSource,
    /className="[^"]*(?:page|generator-page|fullscreen|preview-grid|preview-panel)[^"]*"/i,
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
    /className=\{cn\("space-primary-output-preview", "nodrag", outputView\.className\)\}/g,
  ) ?? [];
  const primaryPreviewStart = imageNodeSource.indexOf(
    'className={cn("space-primary-output-preview", "nodrag", outputView.className)}',
  );
  const primaryPreviewEnd = imageNodeSource.indexOf(
    '<div className="space-node-controls nodrag"',
  );
  assert.notEqual(primaryPreviewStart, -1);
  assert.notEqual(primaryPreviewEnd, -1);
  const primaryPreviewSource = imageNodeSource.slice(
    primaryPreviewStart,
    primaryPreviewEnd,
  );

  assert.equal(primaryPreviewMatches.length, 1);
  assert.match(primaryPreviewSource, /<button[\s\S]*type="button"/);
  assert.match(imageNodeSource, /aria-label=\{outputView\.ariaLabel\}/);
  assert.match(appCss, /\.space-primary-output-preview\s*\{[\s\S]*width:\s*46px/);
  assert.match(appCss, /\.space-primary-output-preview\s*\{[\s\S]*height:\s*82px/);
  assert.doesNotMatch(imageNodeSource, /freepik-preview-grid/);
  assert.doesNotMatch(imageNodeSource, /freepik-preview-panel/);
  assert.doesNotMatch(imageNodeSource, /freepik-preview-\d+\.jpg/);
  assert.doesNotMatch(imageNodeSource, /(?:outputs|generatedAssetIds)\.map\(/);
  assert.doesNotMatch(primaryPreviewSource, /<img\b/);
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
    /className=\{cn\("space-primary-output-preview", "nodrag", outputView\.className\)\}/,
  );
  assert.match(imageNodeSource, /data-output-state=\{outputView\.state\}/);
  assert.match(imageNodeSource, /aria-label=\{outputView\.ariaLabel\}/);
  assert.match(imageNodeSource, /\{outputView\.label\}/);
  assert.match(appCss, /\.space-primary-output-preview\.success\s*\{[\s\S]*border-color:\s*rgba\(57,\s*191,\s*69,\s*0\.64\)/);
  assert.match(appCss, /\.space-primary-output-preview\.error\s*\{[\s\S]*border-color:\s*rgba\(185,\s*28,\s*28,\s*0\.48\)/);
  assert.match(appCss, /\.space-primary-output-preview\.cancelled\s*\{[\s\S]*border-color:\s*rgba\(100,\s*116,\s*139,\s*0\.42\)/);
  assert.match(appCss, /\.space-primary-output-preview\.empty-output\s*\{[\s\S]*border-color:\s*rgba\(226,\s*232,\s*240,\s*0\.92\)/);
});

test("Image output action is the reliable next-node menu entry point", () => {
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  const imageNodeEnd = creativeCanvasScreen.indexOf(
    "function ContractRow",
  );
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);
  const outputActionStart = imageNodeSource.indexOf(
    'data-output-next-node-entrypoint="creative-output-action"',
  );
  assert.notEqual(outputActionStart, -1);

  const outputActionEnd = imageNodeSource.indexOf("</button>", outputActionStart);
  assert.notEqual(outputActionEnd, -1);

  const outputActionSource = imageNodeSource.slice(
    outputActionStart,
    outputActionEnd,
  );

  assert.match(outputActionSource, /data-output-next-node-trigger="generated-image"/);
  assert.match(outputActionSource, /aria-haspopup="menu"/);
  assert.match(outputActionSource, /aria-expanded=\{nextNodeMenuOpen\}/);
  assert.match(outputActionSource, /aria-controls=\{nextNodeMenuId\}/);
  assert.match(outputActionSource, /disabled=\{!canOpenNextNodeMenu\}/);
  assert.match(outputActionSource, /onClick=\{toggleNextNodeMenu\}/);
  assert.match(outputActionSource, /onKeyDown=\{handleNextNodeTriggerKeyDown\}/);
  assert.doesNotMatch(outputActionSource, /Handle\b/);
});

test("Image output drag to empty canvas opens the next-node menu", () => {
  const screenStart = creativeCanvasScreen.indexOf("export function CreativeCanvasScreen");
  const screenEnd = creativeCanvasScreen.indexOf("function ImageGenerationInspectorPanel");
  const genericNodeStart = creativeCanvasScreen.indexOf("function GenerationBlockNode");
  const genericNodeEnd = creativeCanvasScreen.indexOf("function FreepikReferenceImageNode");
  const imageNodeStart = creativeCanvasScreen.indexOf("function FreepikReferenceImageNode");
  const imageNodeEnd = creativeCanvasScreen.indexOf("function ContractRow");
  assert.notEqual(screenStart, -1);
  assert.notEqual(screenEnd, -1);
  assert.notEqual(genericNodeStart, -1);
  assert.notEqual(genericNodeEnd, -1);
  assert.notEqual(imageNodeStart, -1);
  assert.notEqual(imageNodeEnd, -1);

  const screenSource = creativeCanvasScreen.slice(screenStart, screenEnd);
  const genericNodeSource = creativeCanvasScreen.slice(genericNodeStart, genericNodeEnd);
  const imageNodeSource = creativeCanvasScreen.slice(imageNodeStart, imageNodeEnd);

  assert.match(screenSource, /const pendingImageOutputConnectionRef = useRef/);
  assert.match(screenSource, /const suppressImageOutputPaneClickRef = useRef\(false\)/);
  assert.match(screenSource, /const \[imageOutputDropMenu, setImageOutputDropMenu\] =\s*useState/);
  assert.match(screenSource, /const \[imageOutputDropMenuQuery, setImageOutputDropMenuQuery\] = useState\(""\)/);
  assert.match(screenSource, /const closeImageOutputDropMenu = useCallback/);
  assert.match(screenSource, /const getConnectionEventPoint = \(event: MouseEvent \| TouchEvent\) => \{/);
  assert.match(screenSource, /const clampDropMenuPoint = \(point: \{ x: number; y: number \}\) => \{/);
  assert.match(screenSource, /const menuWidth = 320;/);
  assert.match(screenSource, /const menuMaxHeight = 360;/);
  assert.match(screenSource, /viewportWidth - menuWidth - menuOffset/);
  assert.match(screenSource, /viewportHeight - menuMaxHeight - menuOffset/);
  assert.match(screenSource, /onConnectStart=\{\(_, connection\) => \{/);
  assert.match(screenSource, /connection\.handleId !== "outputs\.generated_image_asset"/);
  assert.match(screenSource, /!properties\.uiState\.outputConnectionReady/);
  assert.match(screenSource, /properties\.uiState\.selectedResultAssetId === null/);
  assert.match(screenSource, /selectedResultAssetId: properties\.uiState\.selectedResultAssetId/);
  assert.match(screenSource, /onConnectEnd=\{\(event, connectionState\) => \{/);
  assert.match(screenSource, /if \(pendingConnection === null \|\| connectionState\.isValid\) \{/);
  assert.match(screenSource, /setImageOutputDropMenu\(\{/);
  assert.match(screenSource, /suppressImageOutputPaneClickRef\.current = true/);
  assert.match(screenSource, /suppressImageOutputPaneClickRef\.current = false/);
  assert.match(screenSource, /nodesConnectable/);
  assert.doesNotMatch(screenSource, /nodesConnectable=\{false\}/);
  assert.match(screenSource, /className="canvas-output-drop-menu nodrag"/);
  assert.match(screenSource, /role="menu"/);
  assert.match(screenSource, /data-placement="line-end"/);
  assert.match(screenSource, /className="canvas-output-drop-search"/);
  assert.match(screenSource, /placeholder="Search"/);
  assert.match(screenSource, /className="canvas-output-drop-menu-list"/);
  assert.match(screenSource, /className="canvas-output-drop-menu-item"/);
  assert.match(screenSource, /handleImageOutputNextNodeAction\(/);
  assert.match(appCss, /\.canvas-output-drop-menu\s*\{[\s\S]*position:\s*fixed/);
  assert.match(appCss, /\.canvas-output-drop-menu\s*\{[\s\S]*width:\s*min\(320px, calc\(100vw - 24px\)\)/);
  assert.match(appCss, /\.canvas-output-drop-menu\s*\{[\s\S]*border:\s*1px solid #dddddd/);
  assert.match(appCss, /\.canvas-output-drop-menu\s*\{[\s\S]*background:\s*#ffffff/);
  assert.match(appCss, /\.canvas-output-drop-search\s*\{[\s\S]*background:\s*#f8fafc/);
  assert.match(
    genericNodeSource,
    /<Handle[\s\S]*type="target"[\s\S]*className=\{cn\("canvas-handle", `\$\{data\.tone\}-handle`\)\}[\s\S]*isConnectable=\{false\}/,
  );
  assert.match(
    genericNodeSource,
    /<Handle[\s\S]*type="source"[\s\S]*className=\{cn\("canvas-handle", `\$\{data\.tone\}-handle`\)\}[\s\S]*isConnectable=\{false\}/,
  );
  assert.match(
    imageNodeSource,
    /id=\{`inputs\.\$\{promptPort\.id\}`\}[\s\S]*type="target"[\s\S]*isConnectable=\{false\}/,
  );
  assert.match(
    imageNodeSource,
    /id=\{`inputs\.\$\{referencePort\.id\}`\}[\s\S]*type="target"[\s\S]*isConnectable=\{false\}/,
  );
  assert.match(
    imageNodeSource,
    /id=\{`outputs\.\$\{generatedPort\.id\}`\}[\s\S]*type="source"[\s\S]*isConnectable=\{canOpenNextNodeMenu\}/,
  );
});

test("Spaces-style image generation node opens a next-node contextual menu from the output card", () => {
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
    imageNodeSource,
    /const \[nextNodeMenuOpen, setNextNodeMenuOpen\] = useState\(false\)/,
  );
  assert.match(
    imageNodeSource,
    /const nextNodeMenuTriggerRef = useRef<HTMLButtonElement \| null>\(null\)/,
  );
  assert.match(
    imageNodeSource,
    /const nextNodeMenuRef = useRef<HTMLDivElement \| null>\(null\)/,
  );
  assert.match(
    imageNodeSource,
    /const pendingNextNodeMenuFocusRef = useRef<"first" \| "last" \| null>\(null\)/,
  );
  assert.match(
    imageNodeSource,
    /const canOpenNextNodeMenu =[\s\S]*details\.uiState\.outputConnectionReady[\s\S]*details\.uiState\.selectedResultAssetId !== null/,
  );
  assert.match(
    imageNodeSource,
    /const nextNodeMenuId = `\$\{sourceImageNodeId\}-output-next-node-menu`;/,
  );
  assert.match(imageNodeSource, /const toggleNextNodeMenu = \(\) => \{/);
  assert.match(
    imageNodeSource,
    /setNextNodeMenuOpen\(\(isOpen\) => \{[\s\S]*pendingNextNodeMenuFocusRef\.current = null;[\s\S]*return false;[\s\S]*pendingNextNodeMenuFocusRef\.current = "first";[\s\S]*return true;[\s\S]*\}\)/,
  );
  assert.match(
    imageNodeSource,
    /useEffect\(\(\) => \{[\s\S]*!canOpenNextNodeMenu && nextNodeMenuOpen[\s\S]*closeNextNodeMenu\(\)/,
  );
  assert.match(imageNodeSource, /const closeNextNodeMenu = \(options\?: \{ restoreFocus\?: boolean \}\) => \{/);
  assert.match(imageNodeSource, /nextNodeMenuTriggerRef\.current\?\.focus\(\)/);
  assert.match(imageNodeSource, /const openNextNodeMenu = \(focusPosition: "first" \| "last" = "first"\) => \{/);
  assert.match(imageNodeSource, /const handleNextNodeTriggerKeyDown = \([\s\S]*KeyboardEvent<HTMLButtonElement>/);
  assert.match(imageNodeSource, /event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"/);
  assert.match(imageNodeSource, /event\.key === "Escape" && nextNodeMenuOpen/);
  assert.match(imageNodeSource, /const handleNextNodeMenuKeyDown = \(event: KeyboardEvent<HTMLDivElement>\) => \{/);
  assert.match(imageNodeSource, /event\.key === "Home" \|\| event\.key === "End"/);
  assert.match(imageNodeSource, /document\.addEventListener\("pointerdown", handleDocumentPointerDown\)/);
  assert.match(imageNodeSource, /document\.removeEventListener\("pointerdown", handleDocumentPointerDown\)/);
  assert.match(imageNodeSource, /const handleNextNodeMenuBlur = \(event: FocusEvent<HTMLDivElement>\) => \{/);
  assert.match(
    imageNodeSource,
    /className="space-output-next-node-anchor nodrag" onBlur=\{handleNextNodeMenuBlur\}/,
  );
  assert.match(
    imageNodeSource,
    /<button[\s\S]*ref=\{nextNodeMenuTriggerRef\}[\s\S]*className=\{cn\("space-primary-output-preview", "nodrag", outputView\.className\)\}[\s\S]*data-output-next-node-trigger="generated-image"[\s\S]*aria-haspopup="menu"[\s\S]*aria-expanded=\{nextNodeMenuOpen\}[\s\S]*aria-controls=\{nextNodeMenuId\}[\s\S]*disabled=\{!canOpenNextNodeMenu\}[\s\S]*onClick=\{toggleNextNodeMenu\}[\s\S]*onKeyDown=\{handleNextNodeTriggerKeyDown\}/,
  );
  assert.match(imageNodeSource, /nextNodeMenuOpen \? \(/);
  assert.match(imageNodeSource, /ref=\{nextNodeMenuRef\}/);
  assert.match(imageNodeSource, /className="space-output-next-node-menu nodrag"/);
  assert.match(imageNodeSource, /role="menu"/);
  assert.match(imageNodeSource, /aria-label="Create next generation block from output"/);
  assert.match(imageNodeSource, /onKeyDown=\{handleNextNodeMenuKeyDown\}/);
  assert.match(imageNodeSource, /resolveImageGenerationOutputNextNodeActions\(details\)/);
  assert.match(imageNodeSource, /nextNodeMenuActions\.map\(\(action\) =>/);
  assert.match(imageNodeSource, /data-next-node-kind=\{action\.kind\}/);
  assert.match(
    imageNodeSource,
    /data-provider-availability=\{action\.availability\}/,
  );
  assert.match(imageNodeSource, /aria-disabled=\{disabled\}/);
  assert.match(imageNodeSource, /disabled=\{disabled\}/);
  assert.match(
    imageNodeSource,
    /title=\{action\.disabledReason \?\? action\.description\}/,
  );
  assert.match(imageNodeSource, /onClick=\{\(\) => handleNextNodeMenuAction\(action\.kind\)\}/);
  assert.match(imageNodeSource, /\{action\.label\}/);
  assert.match(imageNodeSource, /\{action\.disabledReason\}/);
  assert.match(imageNodeSource, /onOutputNextNodeAction\(actionKind, selectedResultAssetId\)/);
  assert.match(
    creativeCanvasScreen,
    /onImageOutputNextNodeAction=\{handleImageOutputNextNodeAction\}/,
  );
  assert.match(
    creativeCanvasScreen,
    /const handleImageOutputNextNodeAction = useCallback\(\([\s\S]*actionKind: ImageGenerationOutputNextNodeActionKind,[\s\S]*selectedResultAssetId: string,[\s\S]*\) => \{/,
  );
  assert.match(
    creativeCanvasScreen,
    /applyImageOutputNextNodeActionToCanvas\(\{[\s\S]*nodes: currentNodes,[\s\S]*edges: canvasSnapshotRef\.current\.edges,[\s\S]*sourceNodeId,[\s\S]*actionKind,[\s\S]*selectedResultAssetId,[\s\S]*\}\)/,
  );
  assert.match(
    creativeCanvasScreen,
    /if \(nextCanvas\.createdNode === null\) \{[\s\S]*return currentNodes;[\s\S]*\}/,
  );
  assert.match(
    creativeCanvasScreen,
    /selectedNodeIdRef\.current = nextCanvas\.createdNode\.id;/,
  );
  assert.match(creativeCanvasScreen, /setEdges\(nextCanvas\.edges\)/);
  assert.match(creativeCanvasScreen, /updateCampaignCanvas\(nextCanvas\.nodes, nextCanvas\.edges\)/);
  assert.match(creativeCanvasScreen, /return nextCanvas\.nodes;/);
  assert.match(creativeCanvasScreen, /"image-edit": ImageIcon/);
  assert.match(creativeCanvasScreen, /"style-variant": Sparkles/);
  assert.match(creativeCanvasScreen, /upscale: Maximize2/);
  assert.match(creativeCanvasScreen, /video: Video/);
  assert.match(creativeCanvasScreen, /"output-card": Captions/);
  assert.match(creativeCanvasScreen, /"landing-asset": ShoppingBag/);
  assert.match(appCss, /\.space-output-next-node-anchor\s*\{[\s\S]*position:\s*absolute/);
  assert.match(appCss, /\.space-output-next-node-anchor\s*\{[\s\S]*top:\s*56px/);
  assert.match(appCss, /\.space-output-next-node-anchor\s*\{[\s\S]*right:\s*22px/);
  assert.match(appCss, /\.space-output-next-node-menu\s*\{[\s\S]*position:\s*absolute/);
  assert.match(appCss, /\.space-output-next-node-menu\s*\{[\s\S]*right:\s*-176px/);
  assert.match(appCss, /\.space-output-next-node-menu\s*\{[\s\S]*border-radius:\s*8px/);
  assert.match(appCss, /\.space-output-next-node-menu button\s*\{[\s\S]*min-height:\s*30px/);
  assert.match(appCss, /\.space-output-next-node-menu button:disabled\s*\{[\s\S]*cursor:\s*not-allowed/);
  assert.doesNotMatch(
    imageNodeSource,
    /className="[^"]*(?:page|generator-page|fullscreen|preview-grid|preview-panel)[^"]*"/i,
  );
  assert.doesNotMatch(
    imageNodeSource,
    /secret|token|api key|metadata|cost|debug/i,
  );
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
