import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const appCss = readFileSync(new URL("../../../app.css", import.meta.url), "utf8");
const landingRenderer = readFileSync(
  new URL("./landing-page-renderer.tsx", import.meta.url),
  "utf8",
);

test("campaign landing CSS defines responsive regions that keep short-form media above the fold", () => {
  assert.match(
    appCss,
    /\.campaign-landing-shell\s*\{[\s\S]*--landing-media-max-block-size:\s*calc\(100svh - \(var\(--landing-shell-padding\) \* 2\)\)/,
  );
  assert.match(
    appCss,
    /\.campaign-landing-shell\s*\{[\s\S]*grid-template-areas:\s*"copy media"/,
  );
  assert.match(
    appCss,
    /\.campaign-landing-copy\s*\{[\s\S]*grid-area:\s*copy/,
  );
  assert.match(
    appCss,
    /\.campaign-landing-modules\s*\{[\s\S]*grid-area:\s*media/,
  );
  assert.match(
    appCss,
    /\.campaign-landing-playback-row\s*\{[\s\S]*grid-template-columns:\s*[\s\S]*minmax\(240px, var\(--landing-module-max-width, 420px\)\)[\s\S]*minmax\(220px, 300px\)/,
  );
  assert.match(
    appCss,
    /\.campaign-landing-commerce-panel\s*\{[\s\S]*max-height:\s*var\(--landing-media-max-block-size\)/,
  );
  assert.match(
    appCss,
    /\.campaign-landing-commerce-panel\s*\{[\s\S]*overflow:\s*auto/,
  );
  assert.match(
    appCss,
    /\.landing-short-form-embed\s*\{[\s\S]*max-height:\s*var\(--landing-media-max-block-size\)/,
  );
  assert.match(
    appCss,
    /@media \(max-width: 760px\)\s*\{[\s\S]*\.campaign-landing-shell\s*\{[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\) auto/,
  );
  assert.match(
    appCss,
    /@media \(max-width: 760px\)\s*\{[\s\S]*\.campaign-landing-shell\s*\{[\s\S]*grid-template-areas:\s*"media"\s*"copy"/,
  );
  assert.match(
    appCss,
    /@media \(max-width: 760px\)\s*\{[\s\S]*\.landing-short-form-embed\s*\{[\s\S]*width:\s*min\(\s*100%,\s*calc\(var\(--landing-media-max-block-size\) \* var\(--landing-module-aspect-ratio\)\)\s*\)/,
  );
  assert.match(
    appCss,
    /@media \(max-width: 760px\)\s*\{[\s\S]*\.campaign-landing-playback-row\s*\{[\s\S]*grid-template-columns:\s*1fr/,
  );
});

test("campaign landing renderer includes adjacent commerce actions without overlaying playback", () => {
  assert.match(
    landingRenderer,
    /className="campaign-landing-playback-row"/,
  );
  assert.match(
    landingRenderer,
    /className="campaign-landing-playback-stack"/,
  );
  assert.match(
    landingRenderer,
    /className="campaign-landing-commerce-panel"/,
  );
  assert.match(
    landingRenderer,
    /aria-label="Product offer and campaign actions"/,
  );
  assert.match(
    landingRenderer,
    /data-tracking-target-id="commerce-panel:primary-offer"/,
  );
  assert.match(
    landingRenderer,
    /data-tracking-target-id="commerce-panel:primary-offer"[\s\S]*target=\{commerceLinkPolicy\.target\}[\s\S]*rel=\{commerceLinkPolicy\.rel\}/,
    "commerce panel conversion should use the selected landing behavior policy",
  );
  assert.match(landingRenderer, /className="campaign-landing-signup-form"/);
});

test("campaign landing renderer instruments native short-form playback depth, completion, and replay", () => {
  assert.match(
    landingRenderer,
    /createCampaignSurfacePlaybackEngagementInput/,
    "native video players should emit playback engagement through campaign tracking",
  );
  assert.match(
    landingRenderer,
    /onTimeUpdate=\{playbackInstrumentation\.handleTimeUpdate\}/,
    "video time updates should drive watch-depth and replay tracking",
  );
  assert.match(
    landingRenderer,
    /onEnded=\{playbackInstrumentation\.handleEnded\}/,
    "video ended events should drive completion tracking",
  );
  assert.match(
    landingRenderer,
    /action:\s*"watch_depth"/,
    "watch-depth events should use a stable playback action name",
  );
  assert.match(
    landingRenderer,
    /action:\s*"complete"/,
    "completion events should use a stable playback action name",
  );
  assert.match(
    landingRenderer,
    /action:\s*"replay"/,
    "replay events should use a stable playback action name",
  );
});

test("campaign landing renderer instruments native short-form control interactions and CTAs", () => {
  assert.match(
    landingRenderer,
    /onPlay=\{playbackInstrumentation\.handlePlay\}/,
    "native video play controls should emit campaign engagement",
  );
  assert.match(
    landingRenderer,
    /onPause=\{playbackInstrumentation\.handlePause\}/,
    "native video pause controls should emit campaign engagement",
  );
  assert.match(
    landingRenderer,
    /onVolumeChange=\{playbackInstrumentation\.handleVolumeChange\}/,
    "native video mute and unmute controls should emit campaign engagement",
  );
  assert.match(
    landingRenderer,
    /createCampaignSurfacePlaybackControlEngagementInput/,
    "short-form controls should use stable control-prefixed action names",
  );
  assert.match(
    landingRenderer,
    /data-campaign-track-click="true"[\s\S]*data-tracking-target-id="commerce-panel:primary-offer"/,
    "commerce CTA should remain click tracked beside immersive content",
  );
  assert.match(
    landingRenderer,
    /data-campaign-track-click="true"[\s\S]*data-tracking-target-id=\{`\$\{module\.id\}:cta`\}/,
    "inline continuation CTA should remain click tracked inside landing modules",
  );
});

test("campaign landing renderer applies the selected behavior mode to generated landing output", () => {
  assert.match(
    landingRenderer,
    /getCampaignLandingPageBehaviorConfiguration/,
    "default generated landing templates should resolve the selected campaign behavior mode",
  );
  assert.match(
    landingRenderer,
    /behavior:\s*getCampaignLandingPageBehaviorConfiguration\(campaign\)/,
    "generated landing templates should not lose campaign-level behavior mode",
  );
  assert.match(
    landingRenderer,
    /const templateForRender =[\s\S]*behavior:[\s\S]*template\.behavior \?\? getCampaignLandingPageBehaviorConfiguration\(campaign\)/,
    "rendering an existing template should apply the campaign behavior mode when the template omits it",
  );
  assert.match(
    landingRenderer,
    /commercePanel:\s*createCampaignLandingCommercePanelRenderPolicy\(/,
    "commerce actions should be governed by the same landing behavior policy as generated chrome",
  );
  assert.match(
    landingRenderer,
    /function createCampaignLandingCommercePanelRenderPolicy/,
    "commerce panel behavior should be explicit and testable",
  );
});

test("campaign landing renderer demotes overlay chrome to non-interrupting playback-safe regions", () => {
  assert.match(
    landingRenderer,
    /createCampaignLandingChromeRenderPolicy/,
    "renderer should compute a playback-safe policy from navigation and conversion configuration",
  );
  assert.match(
    landingRenderer,
    /data-render-placement=\{navigationPolicy\.renderPlacement\}/,
    "navigation should expose the applied render placement instead of only raw template placement",
  );
  assert.match(
    landingRenderer,
    /data-consumption-safe=\{navigationPolicy\.consumptionSafe\}/,
    "navigation should mark whether it is safe during active content consumption",
  );
  assert.match(
    landingRenderer,
    /data-render-placement=\{policy\.renderPlacement\}/,
    "conversion elements should expose playback-safe render placement",
  );
  assert.match(
    landingRenderer,
    /target=\{policy\.target\}/,
    "conversion actions should preserve the current playback context when activated",
  );
  assert.match(
    landingRenderer,
    /rel=\{policy\.rel\}/,
    "new-context conversion actions should include rel isolation",
  );
  assert.match(
    appCss,
    /\.campaign-landing-navigation\[data-consumption-safe="true"\]\s*\{[\s\S]*position:\s*static/,
    "navigation chrome should not be fixed over active short-form content",
  );
  assert.match(
    appCss,
    /\.campaign-landing-conversion-elements\[data-consumption-safe="true"\]\s*\{[\s\S]*grid-area:\s*media/,
    "conversion chrome should render in the media flow instead of covering playback",
  );
  assert.match(
    appCss,
    /\.campaign-landing-conversion-elements a\[data-render-placement="side-panel"\]\s*\{[\s\S]*position:\s*static/,
    "side-panel conversion actions should stay out of the media overlay layer",
  );
});

test("campaign landing visual contract covers visibility, playback access, and actions at desktop, tablet, and mobile breakpoints", () => {
  assert.match(
    appCss,
    /\.campaign-landing-shell\s*\{[\s\S]*min-height:\s*100svh/,
    "desktop shell should reserve a full viewport for immersive landing content",
  );
  assert.match(
    appCss,
    /\.landing-short-form-embed\s*\{[\s\S]*max-height:\s*var\(--landing-media-max-block-size\)/,
    "desktop playback should be capped to the visible viewport budget",
  );
  assert.match(
    appCss,
    /\.landing-short-form-embed video:focus-visible,\s*\.landing-short-form-embed iframe:focus-visible\s*\{[\s\S]*outline:\s*2px solid #a8d8c4/,
    "video and iframe playback surfaces should expose keyboard focus",
  );
  assert.match(
    landingRenderer,
    /controls=\{module\.playbackControls\.nativeControls\}/,
    "native video playback controls should remain renderer-driven",
  );
  assert.match(
    landingRenderer,
    /allowFullScreen[\s\S]*tabIndex=\{0\}/,
    "external embeds should be reachable and expandable without hidden overlay controls",
  );
  assert.match(
    appCss,
    /@media \(max-width: 1100px\) and \(min-width: 761px\)\s*\{[\s\S]*\.campaign-landing-shell\s*\{[\s\S]*grid-template-columns:\s*1fr/,
    "tablet layout should stop squeezing copy, playback, and commerce into two narrow columns",
  );
  assert.match(
    appCss,
    /@media \(max-width: 1100px\) and \(min-width: 761px\)\s*\{[\s\S]*\.campaign-landing-playback-row\s*\{[\s\S]*grid-template-columns:\s*[\s\S]*minmax\(260px, var\(--landing-module-max-width, 420px\)\)[\s\S]*minmax\(220px, 300px\)/,
    "tablet layout should keep commerce actions adjacent to playback when width permits",
  );
  assert.match(
    appCss,
    /@media \(max-width: 760px\)\s*\{[\s\S]*\.campaign-landing-shell\s*\{[\s\S]*--landing-media-max-block-size:\s*min\(76svh, calc\(100svh - 32px\)\)/,
    "mobile layout should cap media height so follow-on copy and actions remain discoverable",
  );
  assert.match(
    appCss,
    /@media \(max-width: 760px\)\s*\{[\s\S]*\.campaign-landing-signup-form div\s*\{[\s\S]*grid-template-columns:\s*1fr/,
    "mobile signup action should not compress the input and submit button into an unreadable row",
  );
  assert.match(
    appCss,
    /@media \(max-width: 760px\)\s*\{[\s\S]*\.campaign-landing-offer-module a,\s*\.campaign-landing-disabled-cta,\s*\.campaign-landing-signup-form button\s*\{[\s\S]*width:\s*100%/,
    "mobile primary and secondary actions should present as full-width tap targets",
  );
});

test("campaign canvas CSS keeps short-form playback controls accessible while setup panels scroll", () => {
  const css = readFileSync("app/app.css", "utf8");

  assert.match(
    css,
    /\.campaign-short-form-player\s*\{[\s\S]*position:\s*fixed/,
  );
  assert.match(
    css,
    /\.campaign-short-form-player\s*\{[\s\S]*z-index:\s*26/,
  );
  assert.match(
    css,
    /\.campaign-short-form-controls\s+button:focus-visible\s*\{[\s\S]*outline:\s*2px solid #181d26/,
  );
  assert.match(
    css,
    /\.campaign-short-form-player video\s*\{[\s\S]*aspect-ratio:\s*9 \/ 16/,
  );
  assert.match(
    css,
    /@media \(max-width: 960px\)\s*\{[\s\S]*\.campaign-short-form-player\s*\{[\s\S]*position:\s*sticky/,
  );
});
