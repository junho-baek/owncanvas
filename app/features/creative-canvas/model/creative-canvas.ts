import type {
  InstagramCommentTriggerEvent,
  PluginApprovalRequirement,
  PluginActor,
  PluginCapability,
  PluginCatalog,
  PluginLifecycleState,
  PluginOrigin,
  PluginPermissionMode,
  PluginType,
} from "../../plugins/model/plugin-representation.ts";
import {
  INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  validateInstagramCommentTriggerEvent,
  verifyAgentInstalledPluginUsable,
} from "../../plugins/model/plugin-representation.ts";

export type GenerationBlockKind =
  | "text"
  | "llm"
  | "image"
  | "video"
  | "voice"
  | "agent"
  | "dm"
  | "landing"
  | "custom";

export type GenerationBlockTone = "ink" | "blue" | "violet" | "green";

export type GenerationBlockContract = {
  label: string;
  value: string;
  state: "READY" | "OPTIONAL" | "WAITING" | "BYO";
};

export type CampaignCanvasBlock = {
  id: string;
  kind: GenerationBlockKind;
  type?: GenerationBlockKind;
  label?: string;
  title: string;
  subtitle: string;
  description: string;
  tone: GenerationBlockTone;
  status: "READY" | "DRAFT" | "NEEDS INPUT";
  position: { x: number; y: number };
  contracts: GenerationBlockContract[];
  properties?: Record<string, unknown>;
};

export type CampaignCanvasEdge = {
  id: string;
  source: string;
  sourcePort?: string;
  target: string;
  targetPort?: string;
  type?: string;
  label: string;
  properties?: Record<string, unknown>;
};

export type CampaignImmersiveLandingPageBlockType =
  | "short-form-embed"
  | "short-form-continuation";

export type CampaignImmersiveLandingPageBlockContentMode =
  | "embedded"
  | "continued";

export type CampaignImmersiveLandingPageBlockSchemaProperty = {
  key: string;
  type: "asset-ref" | "enum" | "string" | "array" | "object";
  required: boolean;
  description: string;
  options?: string[];
  itemType?: string;
};

export type CampaignImmersiveLandingPageBlockContentSchema = {
  required: string[];
  properties: CampaignImmersiveLandingPageBlockSchemaProperty[];
};

export type CampaignImmersiveLandingPageBlockConfigurationOption = {
  key: string;
  type: "boolean" | "enum" | "string" | "number";
  required: boolean;
  description: string;
  defaultValue?: boolean | string | number;
  options?: string[];
};

export type CampaignImmersiveLandingPageBlockTypeDefinition = {
  type: CampaignImmersiveLandingPageBlockType;
  label: string;
  contentMode: CampaignImmersiveLandingPageBlockContentMode;
  description: string;
  acceptedInputPorts: string[];
  outputPorts: string[];
  mediaTypes: CampaignAssetMediaType[];
  attributionRole: "source-touchpoint" | "landing-engagement";
  contentSchema: CampaignImmersiveLandingPageBlockContentSchema;
  configurationOptions: CampaignImmersiveLandingPageBlockConfigurationOption[];
};

export const CAMPAIGN_IMMERSIVE_LANDING_PAGE_BLOCK_TYPES = [
  {
    type: "short-form-embed",
    label: "Short-form embed",
    contentMode: "embedded",
    description:
      "Embeds the source short-form video inside the tracked landing page.",
    acceptedInputPorts: ["inputs.short_form_asset", "inputs.tracking_context"],
    outputPorts: ["outputs.viewer_context"],
    mediaTypes: ["video"],
    attributionRole: "source-touchpoint",
    contentSchema: {
      required: ["sourceAssetId", "embedMode", "trackingEventName"],
      properties: [
        {
          key: "sourceAssetId",
          type: "asset-ref",
          required: true,
          description:
            "Campaign asset id for the short-form video preserved on the landing page.",
        },
        {
          key: "embedMode",
          type: "enum",
          required: true,
          options: ["inline-player", "autoplay-muted", "tap-to-play"],
          description: "How the source short-form video is embedded.",
        },
        {
          key: "posterAssetId",
          type: "asset-ref",
          required: false,
          description: "Optional poster image shown before playback.",
        },
        {
          key: "trackingEventName",
          type: "string",
          required: true,
          description:
            "Engagement event emitted when the embedded short is viewed.",
        },
      ],
    },
    configurationOptions: [
      {
        key: "preserveAspectRatio",
        type: "boolean",
        required: true,
        defaultValue: true,
        description: "Preserve the source short-form aspect ratio on landing.",
      },
      {
        key: "autoplayPolicy",
        type: "enum",
        required: true,
        options: ["muted", "tap-to-play"],
        defaultValue: "muted",
        description: "Playback policy used by the landing renderer.",
      },
      {
        key: "attributionTouchpointId",
        type: "string",
        required: true,
        description:
          "Touchpoint id used to join embed engagement to conversion.",
      },
    ],
  },
  {
    type: "short-form-continuation",
    label: "Short-form continuation",
    contentMode: "continued",
    description:
      "Continues the source short-form content with sequential landing-native clips.",
    acceptedInputPorts: ["inputs.viewer_context", "inputs.offer_context"],
    outputPorts: ["outputs.conversion_intent"],
    mediaTypes: ["video", "image", "text"],
    attributionRole: "landing-engagement",
    contentSchema: {
      required: ["sequence", "cta"],
      properties: [
        {
          key: "sequence",
          type: "array",
          required: true,
          itemType: "content-segment",
          description:
            "Ordered landing-native clips, images, or text beats that continue the source short.",
        },
        {
          key: "cta",
          type: "object",
          required: true,
          description:
            "Conversion call-to-action rendered after the continuation.",
        },
        {
          key: "offerAssetIds",
          type: "array",
          required: false,
          itemType: "asset-ref",
          description:
            "Optional product or offer assets used inside the continuation.",
        },
      ],
    },
    configurationOptions: [
      {
        key: "maxSegments",
        type: "number",
        required: true,
        defaultValue: 3,
        description: "Maximum continuation segments generated or rendered.",
      },
      {
        key: "transitionStyle",
        type: "enum",
        required: true,
        options: ["snap", "scroll", "story"],
        defaultValue: "scroll",
        description:
          "Landing-native transition pattern between continuation segments.",
      },
      {
        key: "conversionEventName",
        type: "string",
        required: true,
        defaultValue: "purchase",
        description: "Conversion event this block optimizes toward.",
      },
    ],
  },
] satisfies CampaignImmersiveLandingPageBlockTypeDefinition[];

export function getCampaignImmersiveLandingPageBlockTypeDefinition(
  type: string,
): CampaignImmersiveLandingPageBlockTypeDefinition | undefined {
  return CAMPAIGN_IMMERSIVE_LANDING_PAGE_BLOCK_TYPES.find(
    (definition) => definition.type === type,
  );
}

export const CAMPAIGN_LANDING_PAGE_TEMPLATE_SCHEMA_VERSION =
  "owncanvas.landing-page-template.v1";

export type CampaignLandingPageTemplateSchemaVersion =
  typeof CAMPAIGN_LANDING_PAGE_TEMPLATE_SCHEMA_VERSION;

export type CampaignLandingPageTemplatePageType = "immersive";

export type CampaignLandingPageBehaviorMode =
  | "immersion-preserving"
  | "traditional";

export const CAMPAIGN_LANDING_PAGE_BEHAVIOR_MODES = [
  "immersion-preserving",
  "traditional",
] as const satisfies readonly CampaignLandingPageBehaviorMode[];

export type CampaignLandingPageBehaviorConfiguration = {
  mode: CampaignLandingPageBehaviorMode;
  preserveInlineContext: boolean;
  allowTraditionalRedirect: boolean;
};

export type CampaignLandingPageTemplateProviderSourceType =
  | "social-post"
  | "generated-asset"
  | "uploaded-asset"
  | "external-url";

export type CampaignLandingPageTemplateEmbedMode =
  | "oembed"
  | "iframe"
  | "native-player"
  | "asset-render";

export type CampaignLandingPageTemplateSourcePlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "shopify"
  | "owncanvas"
  | "custom";

export type CampaignLandingPageTemplateShortFormProviderMetadata = {
  providerPluginId: string;
  providerKind: PluginOrigin["kind"];
  sourcePlatform: CampaignLandingPageTemplateSourcePlatform;
  sourceType: CampaignLandingPageTemplateProviderSourceType;
  sourceContentId: string;
  sourceUrl: string;
  sourceAssetId?: string;
  embedMode: CampaignLandingPageTemplateEmbedMode;
};

export type CampaignEmbeddedShortFormLandingPageTemplateConfiguration = {
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  showCaptions: boolean;
  preserveSourceChrome: boolean;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  maxDurationSeconds?: number;
};

export type CampaignEmbeddedShortFormLandingPageTemplateModule = {
  id: string;
  type: "embedded-short-form-content";
  blockType: "short-form-embed";
  label: string;
  required: boolean;
  order: number;
  acceptedInputPorts: string[];
  outputPorts: string[];
  mediaTypes: CampaignAssetMediaType[];
  attributionRole: "source-touchpoint";
  provider: CampaignLandingPageTemplateShortFormProviderMetadata;
  configuration: CampaignEmbeddedShortFormLandingPageTemplateConfiguration;
};

export type CampaignInlineShortFormContinuationBehavior = {
  consumptionSurface: "same-page";
  navigationPolicy: "inline-only";
  trigger: "after-source-engagement" | "after-source-complete" | "manual";
  transitionStyle: "snap" | "scroll" | "story";
  requiresSeparatePage: false;
};

export type CampaignInlineShortFormContinuationSegment = {
  id: string;
  assetId?: string;
  mediaType: CampaignAssetMediaType;
  headline: string;
  body?: string;
  trackingEventName: string;
};

export type CampaignInlineShortFormContinuationCallToAction = {
  label: string;
  url: string;
  conversionEventName: string;
};

export type CampaignInlineShortFormContinuationLandingPageTemplateConfiguration = {
  maxSegments: number;
  transitionStyle: "snap" | "scroll" | "story";
  conversionEventName: string;
  preserveInlineContext: boolean;
};

export type CampaignInlineShortFormContinuationLandingPageTemplateModule = {
  id: string;
  type: "inline-short-form-continuation";
  blockType: "short-form-continuation";
  label: string;
  required: boolean;
  order: number;
  acceptedInputPorts: string[];
  outputPorts: string[];
  mediaTypes: CampaignAssetMediaType[];
  attributionRole: "landing-engagement";
  sourceModuleId: string;
  continuationBehavior: CampaignInlineShortFormContinuationBehavior;
  segments: CampaignInlineShortFormContinuationSegment[];
  cta: CampaignInlineShortFormContinuationCallToAction;
  configuration: CampaignInlineShortFormContinuationLandingPageTemplateConfiguration;
};

export type CampaignLandingPageElementVisibility =
  | "visible"
  | "hidden"
  | "conditional";

export const CAMPAIGN_LANDING_PAGE_ELEMENT_VISIBILITY_OPTIONS = [
  "visible",
  "hidden",
  "conditional",
] as const satisfies readonly CampaignLandingPageElementVisibility[];

export type CampaignLandingPageElementTiming =
  | "before-playback"
  | "during-playback"
  | "after-playback-start"
  | "after-playback-complete"
  | "manual";

export const CAMPAIGN_LANDING_PAGE_ELEMENT_TIMING_OPTIONS = [
  "before-playback",
  "during-playback",
  "after-playback-start",
  "after-playback-complete",
  "manual",
] as const satisfies readonly CampaignLandingPageElementTiming[];

export type CampaignLandingPagePlaybackInterruptionBehavior =
  | "non-blocking"
  | "pause-on-activate"
  | "block-until-complete";

export const CAMPAIGN_LANDING_PAGE_PLAYBACK_INTERRUPTION_OPTIONS = [
  "non-blocking",
  "pause-on-activate",
  "block-until-complete",
] as const satisfies readonly CampaignLandingPagePlaybackInterruptionBehavior[];

export type CampaignLandingPageNavigationPlacement =
  | "top-overlay"
  | "bottom-overlay"
  | "inline";

export const CAMPAIGN_LANDING_PAGE_NAVIGATION_PLACEMENT_OPTIONS = [
  "top-overlay",
  "bottom-overlay",
  "inline",
] as const satisfies readonly CampaignLandingPageNavigationPlacement[];

export type CampaignLandingPageConversionElementPlacement =
  | "sticky-bottom"
  | "inline"
  | "side-panel"
  | "end-card";

export const CAMPAIGN_LANDING_PAGE_CONVERSION_PLACEMENT_OPTIONS = [
  "sticky-bottom",
  "inline",
  "side-panel",
  "end-card",
] as const satisfies readonly CampaignLandingPageConversionElementPlacement[];

export type CampaignLandingPageNavigationConfiguration = {
  visibility: CampaignLandingPageElementVisibility;
  placement: CampaignLandingPageNavigationPlacement;
  timing: CampaignLandingPageElementTiming;
  interruptionBehavior: CampaignLandingPagePlaybackInterruptionBehavior;
};

export type CampaignLandingPageConversionElementConfiguration = {
  id: string;
  label: string;
  conversionEventName: string;
  destinationUrl: string;
  visibility: CampaignLandingPageElementVisibility;
  placement: CampaignLandingPageConversionElementPlacement;
  timing: CampaignLandingPageElementTiming;
  interruptionBehavior: CampaignLandingPagePlaybackInterruptionBehavior;
};

export type CampaignLandingPageTemplateModule =
  | CampaignEmbeddedShortFormLandingPageTemplateModule
  | CampaignInlineShortFormContinuationLandingPageTemplateModule;

export type CampaignLandingPageTemplateSchema = {
  schemaVersion: CampaignLandingPageTemplateSchemaVersion;
  id: string;
  title: string;
  pageType: CampaignLandingPageTemplatePageType;
  behavior?: CampaignLandingPageBehaviorConfiguration;
  navigation?: CampaignLandingPageNavigationConfiguration;
  conversionElements?: CampaignLandingPageConversionElementConfiguration[];
  modules: CampaignLandingPageTemplateModule[];
};

export type CampaignLandingPageTemplateValidationErrorCode =
  | "landing-template.schema_version_invalid"
  | "landing-template.id_required"
  | "landing-template.title_required"
  | "landing-template.page_type_invalid"
  | "landing-template.module_required"
  | "landing-template.module_id_required"
  | "landing-template.module_type_invalid"
  | "landing-template.provider_plugin_id_required"
  | "landing-template.provider_kind_invalid"
  | "landing-template.source_platform_required"
  | "landing-template.source_platform_unsupported"
  | "landing-template.source_type_invalid"
  | "landing-template.source_content_id_required"
  | "landing-template.source_url_invalid"
  | "landing-template.source_url_unsupported"
  | "landing-template.embed_mode_invalid"
  | "landing-template.embed_configuration_unsupported"
  | "landing-template.configuration_invalid"
  | "landing-template.inline_source_module_id_required"
  | "landing-template.inline_source_module_missing"
  | "landing-template.inline_continuation_requires_same_page"
  | "landing-template.inline_continuation_segment_required"
  | "landing-template.inline_continuation_segment_invalid"
  | "landing-template.inline_continuation_cta_required"
  | "landing-template.inline_continuation_cta_url_invalid"
  | "landing-template.behavior_configuration_invalid"
  | "landing-template.navigation_configuration_invalid"
  | "landing-template.conversion_element_invalid";

export type CampaignLandingPageTemplateValidationError = {
  code: CampaignLandingPageTemplateValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignLandingPageTemplateValidationResult = {
  valid: boolean;
  errors: CampaignLandingPageTemplateValidationError[];
};

export type CampaignLandingPageRenderBreakpointName =
  | "mobile"
  | "tablet"
  | "desktop";

export type CampaignLandingPageRenderBreakpoint = {
  name: CampaignLandingPageRenderBreakpointName;
  minWidth: number;
  maxWidth: number | null;
  aspectRatio: string;
  maxInlineSize: string;
};

export type CampaignLandingPageResponsiveLayoutRequirement = {
  breakpoint: CampaignLandingPageRenderBreakpointName;
  minWidth: number;
  maxWidth: number | null;
  layout: "single-column" | "centered-column" | "immersive-desktop";
  mediaAspectRatio: string;
  mediaMaxInlineSize: string;
  continuationPlacement: "below-source" | "adjacent-rail";
  ctaPlacement: "sticky-bottom" | "below-content" | "side-panel";
  safeAreaPadding: string;
};

export type CampaignLandingPageInteractionRequirement = {
  breakpoint: CampaignLandingPageRenderBreakpointName;
  primaryInput: "touch" | "pointer";
  playbackActivation: "tap" | "click";
  scrollBehavior: "native" | "scroll" | "snap" | "story";
  preservesInlineContext: true;
  supportsKeyboardNavigation: boolean;
  conversionAction: "sticky-cta" | "inline-cta" | "side-panel-cta";
};

export type CampaignEmbeddedShortFormPlaybackControls = {
  nativeControls: boolean;
  keyboardAccessible: true;
  captions: "show-when-available" | "provider-managed";
  fullscreen: boolean;
  pictureInPicture: boolean;
};

export type CampaignEmbeddedShortFormPageInteractionPolicy = {
  pointerEvents: "media-controls" | "activate-on-focus-or-hover";
  pageScroll: "preserve";
  iframeActivation: "not-applicable" | "explicit";
  focusTrap: false;
};

export type CampaignEmbeddedShortFormPreviewSurface =
  | "social-oembed"
  | "social-iframe"
  | "native-video"
  | "asset-render"
  | "custom-iframe";

export type CampaignEmbeddedShortFormPreview = {
  sourcePlatform: CampaignLandingPageTemplateSourcePlatform;
  sourceType: CampaignLandingPageTemplateProviderSourceType;
  embedMode: CampaignLandingPageTemplateEmbedMode;
  previewSurface: CampaignEmbeddedShortFormPreviewSurface;
  sourceUrl: string;
  supported: true;
};

export type CampaignEmbeddedShortFormRenderedModule = {
  id: string;
  type: "embedded-short-form-content";
  label: string;
  order: number;
  mediaElement: "video" | "iframe";
  mediaUrl: string;
  sourcePlatform: CampaignLandingPageTemplateSourcePlatform;
  embedMode: CampaignLandingPageTemplateEmbedMode;
  aspectRatio: CampaignEmbeddedShortFormLandingPageTemplateConfiguration["aspectRatio"];
  cssAspectRatio: string;
  className: "landing-short-form-embed";
  style: {
    aspectRatio: string;
    width: "100%";
    maxWidth: string;
  };
  responsiveBreakpoints: CampaignLandingPageRenderBreakpoint[];
  responsiveLayoutRequirements: CampaignLandingPageResponsiveLayoutRequirement[];
  interactionRequirements: CampaignLandingPageInteractionRequirement[];
  playback: Pick<
    CampaignEmbeddedShortFormLandingPageTemplateConfiguration,
    "autoplay" | "muted" | "loop" | "showCaptions" | "preserveSourceChrome"
  >;
  playbackControls: CampaignEmbeddedShortFormPlaybackControls;
  pageInteractionPolicy: CampaignEmbeddedShortFormPageInteractionPolicy;
  preview: CampaignEmbeddedShortFormPreview;
  tracking: {
    attributionRole: "source-touchpoint";
    sourceContentId: string;
    sourceAssetId?: string;
  };
};

export type CampaignInlineShortFormContinuationRenderedModule = {
  id: string;
  type: "inline-short-form-continuation";
  label: string;
  order: number;
  sourceModuleId: string;
  segments: CampaignInlineShortFormContinuationSegment[];
  cta: CampaignInlineShortFormContinuationCallToAction;
  className: "landing-short-form-continuation";
  behavior: CampaignInlineShortFormContinuationBehavior;
  responsiveLayoutRequirements: CampaignLandingPageResponsiveLayoutRequirement[];
  interactionRequirements: CampaignLandingPageInteractionRequirement[];
};

export type CampaignLandingPageRenderedModule =
  | CampaignEmbeddedShortFormRenderedModule
  | CampaignInlineShortFormContinuationRenderedModule;

export type CampaignLandingPageRenderModel = {
  schemaVersion: CampaignLandingPageTemplateSchemaVersion;
  templateId: string;
  title: string;
  pageType: CampaignLandingPageTemplatePageType;
  behavior: CampaignLandingPageBehaviorConfiguration;
  navigation: CampaignLandingPageNavigationConfiguration;
  conversionElements: CampaignLandingPageConversionElementConfiguration[];
  modules: CampaignLandingPageRenderedModule[];
};

export type CampaignLandingPagePreviewAccessibilityCheck = {
  id: string;
  target: string;
  accessible: boolean;
  nonDisruptive: boolean;
  previewPlacement:
    | "media"
    | CampaignLandingPageNavigationPlacement
    | CampaignLandingPageConversionElementPlacement;
  activation: "manual" | "native-controls" | "new-context" | "same-context";
};

export type CampaignLandingPagePreviewAccessibilityValidationError = {
  code:
    | "landing-preview.short_form_required"
    | "landing-preview.short_form_inaccessible"
    | "landing-preview.navigation_inaccessible"
    | "landing-preview.navigation_disruptive"
    | "landing-preview.conversion_inaccessible"
    | "landing-preview.conversion_disruptive";
  path: string;
  message: string;
};

export type CampaignLandingPagePreviewAccessibilityValidationResult = {
  valid: boolean;
  checks: CampaignLandingPagePreviewAccessibilityCheck[];
  errors: CampaignLandingPagePreviewAccessibilityValidationError[];
};

export type CampaignLandingPagePublishingPreviewValidationRuleId =
  | "short-form-source-context"
  | "inline-immersion-behavior"
  | "non-blocking-page-chrome"
  | "same-page-continuation"
  | "conversion-path-accessible"
  | "desktop-immersive-layout"
  | "mobile-immersive-layout";

export type CampaignLandingPagePublishingPreviewValidationRule = {
  id: CampaignLandingPagePublishingPreviewValidationRuleId;
  label: string;
  description: string;
  severity: "error";
};

export const CAMPAIGN_LANDING_PAGE_PUBLISHING_PREVIEW_VALIDATION_RULES = [
  {
    id: "short-form-source-context",
    label: "Short-form source context",
    description:
      "Publishing preview must include a supported embedded short-form module with source URL, content id, preview surface, and source-touchpoint attribution.",
    severity: "error",
  },
  {
    id: "inline-immersion-behavior",
    label: "Inline immersion behavior",
    description:
      "Immersive landing previews must preserve inline context and must not switch to traditional redirect behavior.",
    severity: "error",
  },
  {
    id: "non-blocking-page-chrome",
    label: "Non-blocking page chrome",
    description:
      "Visible navigation and conversion controls must stay reachable without blocking active short-form playback.",
    severity: "error",
  },
  {
    id: "same-page-continuation",
    label: "Same-page continuation",
    description:
      "Short-form continuation modules must stay on the same landing page and point back to an embedded source module.",
    severity: "error",
  },
  {
    id: "conversion-path-accessible",
    label: "Accessible conversion path",
    description:
      "Publishing preview must expose a valid HTTP conversion destination through a visible conversion element or inline continuation CTA.",
    severity: "error",
  },
  {
    id: "desktop-immersive-layout",
    label: "Desktop immersive layout",
    description:
      "Desktop publishing previews must keep short-form playback in the primary media region with adjacent continuation and side-panel conversion actions.",
    severity: "error",
  },
  {
    id: "mobile-immersive-layout",
    label: "Mobile immersive layout",
    description:
      "Mobile publishing previews must keep short-form content in a touch-first single-column layout with inline context and reachable conversion actions.",
    severity: "error",
  },
] as const satisfies readonly CampaignLandingPagePublishingPreviewValidationRule[];

export type CampaignLandingPagePublishingPreviewValidationError = {
  code:
    | "landing-preview.source_context_missing"
    | "landing-preview.inline_context_not_preserved"
    | "landing-preview.page_chrome_blocks_playback"
    | "landing-preview.same_page_continuation_missing"
    | "landing-preview.conversion_path_missing"
    | "landing-preview.desktop_layout_not_immersive"
    | "landing-preview.mobile_layout_not_immersive";
  ruleId: CampaignLandingPagePublishingPreviewValidationRuleId;
  path: string;
  message: string;
  guidance: {
    layoutScope: "global" | "desktop" | "mobile";
    summary: string;
    actions: string[];
  };
};

export type CampaignLandingPagePublishingPreviewValidationResult = {
  valid: boolean;
  rules: CampaignLandingPagePublishingPreviewValidationRule[];
  accessibility: CampaignLandingPagePreviewAccessibilityValidationResult;
  errors: CampaignLandingPagePublishingPreviewValidationError[];
};

export type CampaignLandingPageExposureCaptureContext = {
  sessionUrl?: string;
  sessionId?: string;
  channelId?: string;
  touchpointId?: string;
  occurredAt?: string;
  viewId?: string;
  actor?: CampaignTrackingEventActorContext;
};

export function createEmbeddedShortFormLandingPageTemplateModule(
  input: {
    id: string;
    label: string;
    provider: CampaignLandingPageTemplateShortFormProviderMetadata;
    configuration?: Partial<CampaignEmbeddedShortFormLandingPageTemplateConfiguration>;
    required?: boolean;
    order?: number;
  },
): CampaignEmbeddedShortFormLandingPageTemplateModule {
  const blockType = getCampaignImmersiveLandingPageBlockTypeDefinition(
    "short-form-embed",
  );

  if (blockType === undefined) {
    throw new Error("short-form-embed landing block type is not registered");
  }

  return {
    id: input.id,
    type: "embedded-short-form-content",
    blockType: "short-form-embed",
    label: input.label,
    required: input.required ?? true,
    order: input.order ?? 0,
    acceptedInputPorts: [...blockType.acceptedInputPorts],
    outputPorts: [...blockType.outputPorts],
    mediaTypes: [...blockType.mediaTypes],
    attributionRole: "source-touchpoint",
    provider: { ...input.provider },
    configuration: {
      autoplay: input.configuration?.autoplay ?? false,
      muted: input.configuration?.muted ?? true,
      loop: input.configuration?.loop ?? false,
      showCaptions: input.configuration?.showCaptions ?? true,
      preserveSourceChrome: input.configuration?.preserveSourceChrome ?? true,
      aspectRatio: input.configuration?.aspectRatio ?? "9:16",
      ...(input.configuration?.maxDurationSeconds === undefined
        ? {}
        : { maxDurationSeconds: input.configuration.maxDurationSeconds }),
    },
  };
}

export function createInlineShortFormContinuationLandingPageTemplateModule(
  input: {
    id: string;
    label: string;
    sourceModuleId: string;
    segments: CampaignInlineShortFormContinuationSegment[];
    cta: CampaignInlineShortFormContinuationCallToAction;
    behavior?: Partial<CampaignInlineShortFormContinuationBehavior>;
    configuration?: Partial<CampaignInlineShortFormContinuationLandingPageTemplateConfiguration>;
    required?: boolean;
    order?: number;
  },
): CampaignInlineShortFormContinuationLandingPageTemplateModule {
  const blockType = getCampaignImmersiveLandingPageBlockTypeDefinition(
    "short-form-continuation",
  );

  if (blockType === undefined) {
    throw new Error(
      "short-form-continuation landing block type is not registered",
    );
  }

  const transitionStyle = input.configuration?.transitionStyle ??
    input.behavior?.transitionStyle ??
    "scroll";
  const conversionEventName =
    input.configuration?.conversionEventName ??
    input.cta.conversionEventName;

  return {
    id: input.id,
    type: "inline-short-form-continuation",
    blockType: "short-form-continuation",
    label: input.label,
    required: input.required ?? true,
    order: input.order ?? 1,
    acceptedInputPorts: [...blockType.acceptedInputPorts],
    outputPorts: [...blockType.outputPorts],
    mediaTypes: [...blockType.mediaTypes],
    attributionRole: "landing-engagement",
    sourceModuleId: input.sourceModuleId,
    continuationBehavior: {
      consumptionSurface: "same-page",
      navigationPolicy: "inline-only",
      trigger: input.behavior?.trigger ?? "after-source-engagement",
      transitionStyle,
      requiresSeparatePage: false,
    },
    segments: input.segments.map((segment) => ({ ...segment })),
    cta: { ...input.cta },
    configuration: {
      maxSegments: input.configuration?.maxSegments ?? 3,
      transitionStyle,
      conversionEventName,
      preserveInlineContext:
        input.configuration?.preserveInlineContext ?? true,
    },
  };
}

export function validateCampaignLandingPageTemplateSchema(
  schema: unknown,
): CampaignLandingPageTemplateValidationResult {
  const errors: CampaignLandingPageTemplateValidationError[] = [];

  if (!isRecord(schema)) {
    return {
      valid: false,
      errors: [
        {
          code: "landing-template.schema_version_invalid",
          path: "schemaVersion",
          message: "Landing page template schema must be an object.",
        },
      ],
    };
  }

  if (schema.schemaVersion !== CAMPAIGN_LANDING_PAGE_TEMPLATE_SCHEMA_VERSION) {
    errors.push({
      code: "landing-template.schema_version_invalid",
      path: "schemaVersion",
      message: "Landing page templates must use the current schema version.",
    });
  }

  if (typeof schema.id !== "string" || schema.id.trim() === "") {
    errors.push({
      code: "landing-template.id_required",
      path: "id",
      message: "Landing page template id is required.",
    });
  }

  if (typeof schema.title !== "string" || schema.title.trim() === "") {
    errors.push({
      code: "landing-template.title_required",
      path: "title",
      message: "Landing page template title is required.",
    });
  }

  if (schema.pageType !== "immersive") {
    errors.push({
      code: "landing-template.page_type_invalid",
      path: "pageType",
      message: "Landing page template page type must be immersive.",
    });
  }

  validateCampaignLandingPageBehaviorConfiguration(
    schema.behavior,
    "behavior",
    errors,
  );
  validateCampaignLandingPageNavigationConfiguration(
    schema.navigation,
    "navigation",
    errors,
  );
  validateCampaignLandingPageConversionElements(
    schema.conversionElements,
    "conversionElements",
    errors,
  );

  if (!Array.isArray(schema.modules) || schema.modules.length === 0) {
    errors.push({
      code: "landing-template.module_required",
      path: "modules",
      message: "Landing page template requires at least one module.",
    });
  } else {
    const moduleIds = new Set(
      schema.modules
        .filter(isRecord)
        .map((module) => module.id)
        .filter((id): id is string => typeof id === "string" && id.trim() !== ""),
    );

    schema.modules.forEach((module, moduleIndex) => {
      validateCampaignLandingPageTemplateModule(
        module,
        `modules.${moduleIndex}`,
        errors,
        moduleIds,
      );
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createCampaignLandingPageRenderModel(
  template: CampaignLandingPageTemplateSchema,
): CampaignLandingPageRenderModel {
  const validation = validateCampaignLandingPageTemplateSchema(template);

  if (!validation.valid) {
    throw new Error(
      `Invalid campaign landing page template: ${validation.errors
        .map((error) => error.code)
        .join(",")}`,
    );
  }

  const sortedModules = [...template.modules].sort(
    (left, right) => left.order - right.order,
  );
  const embeddedModulesById = new Map(
    sortedModules
      .filter(
        (
          module,
        ): module is CampaignEmbeddedShortFormLandingPageTemplateModule =>
          module.type === "embedded-short-form-content",
      )
      .map((module) => [module.id, module]),
  );
  const continuationModulesBySourceModuleId = new Map(
    sortedModules
      .filter(
        (
          module,
        ): module is CampaignInlineShortFormContinuationLandingPageTemplateModule =>
          module.type === "inline-short-form-continuation",
      )
      .map((module) => [module.sourceModuleId, module]),
  );

  return {
    schemaVersion: template.schemaVersion,
    templateId: template.id,
    title: template.title,
    pageType: template.pageType,
    behavior: normalizeCampaignLandingPageBehaviorConfiguration(
      template.behavior,
    ),
    navigation: normalizeCampaignLandingPageNavigationConfiguration(
      template.navigation,
    ),
    conversionElements: normalizeCampaignLandingPageConversionElements(
      template.conversionElements,
    ),
    modules: sortedModules
      .map((module) => {
        if (module.type === "embedded-short-form-content") {
          return createEmbeddedShortFormRenderedModule(
            module,
            continuationModulesBySourceModuleId.get(module.id),
          );
        }

        const sourceModule = embeddedModulesById.get(module.sourceModuleId);
        const cssAspectRatio = sourceModule === undefined
          ? "9 / 16"
          : getCampaignLandingPageAspectRatioCssValue(
              sourceModule.configuration.aspectRatio,
            );
        const maxInlineSize = sourceModule === undefined
          ? "420px"
          : getCampaignLandingPageModuleMaxWidth(
              sourceModule.configuration.aspectRatio,
            );

        return {
          id: module.id,
          type: "inline-short-form-continuation",
          label: module.label,
          order: module.order,
          sourceModuleId: module.sourceModuleId,
          segments: module.segments.map((segment) => ({ ...segment })),
          cta: { ...module.cta },
          className: "landing-short-form-continuation",
          behavior: { ...module.continuationBehavior },
          responsiveLayoutRequirements:
            createCampaignLandingPageResponsiveLayoutRequirements(
              cssAspectRatio,
              maxInlineSize,
            ),
          interactionRequirements:
            createCampaignLandingPageInteractionRequirements(
              module.configuration.transitionStyle,
            ),
        } satisfies CampaignInlineShortFormContinuationRenderedModule;
      }),
  };
}

export function validateCampaignLandingPagePreviewAccessibility(
  renderModel: CampaignLandingPageRenderModel,
): CampaignLandingPagePreviewAccessibilityValidationResult {
  const checks: CampaignLandingPagePreviewAccessibilityCheck[] = [];
  const errors: CampaignLandingPagePreviewAccessibilityValidationError[] = [];
  const preserveActiveConsumption =
    renderModel.behavior.mode === "immersion-preserving" &&
    renderModel.behavior.preserveInlineContext;
  const activeShortFormModule = renderModel.modules.find(
    (module): module is CampaignEmbeddedShortFormRenderedModule =>
      module.type === "embedded-short-form-content",
  );

  if (activeShortFormModule === undefined) {
    errors.push({
      code: "landing-preview.short_form_required",
      path: "modules",
      message:
        "Landing preview validation requires an embedded short-form module.",
    });
  } else {
    const accessible =
      activeShortFormModule.playbackControls.nativeControls &&
      activeShortFormModule.playbackControls.keyboardAccessible &&
      activeShortFormModule.pageInteractionPolicy.focusTrap === false;
    const nonDisruptive =
      activeShortFormModule.pageInteractionPolicy.pageScroll === "preserve";

    checks.push({
      id: "short-form-active-content",
      target: activeShortFormModule.id,
      accessible,
      nonDisruptive,
      previewPlacement: "media",
      activation: "native-controls",
    });

    if (!accessible) {
      errors.push({
        code: "landing-preview.short_form_inaccessible",
        path: `modules.${activeShortFormModule.id}`,
        message:
          "Active short-form content must keep native keyboard-accessible controls.",
      });
    }
  }

  if (renderModel.navigation.visibility === "visible") {
    const previewPlacement = preserveActiveConsumption
      ? "inline"
      : renderModel.navigation.placement;
    const activation = preserveActiveConsumption ? "manual" : "manual";
    const accessible = true;
    const nonDisruptive = preserveActiveConsumption
      ? true
      : renderModel.navigation.interruptionBehavior === "non-blocking";

    checks.push({
      id: "landing-navigation",
      target: "navigation",
      accessible,
      nonDisruptive,
      previewPlacement,
      activation,
    });

    if (!accessible) {
      errors.push({
        code: "landing-preview.navigation_inaccessible",
        path: "navigation",
        message: "Visible landing navigation must remain reachable in preview.",
      });
    }

    if (!nonDisruptive) {
      errors.push({
        code: "landing-preview.navigation_disruptive",
        path: "navigation.interruptionBehavior",
        message:
          "Landing navigation must not disrupt active short-form playback in preview.",
      });
    }
  }

  renderModel.conversionElements
    .filter((element) => element.visibility === "visible")
    .forEach((element, index) => {
      const previewPlacement =
        preserveActiveConsumption && element.placement === "sticky-bottom"
          ? "side-panel"
          : element.placement;
      const accessible =
        element.label.trim() !== "" && isHttpUrl(element.destinationUrl);
      const nonDisruptive = preserveActiveConsumption
        ? true
        : element.interruptionBehavior === "non-blocking";

      checks.push({
        id: `conversion-element:${element.id}`,
        target: element.id,
        accessible,
        nonDisruptive,
        previewPlacement,
        activation: preserveActiveConsumption ? "new-context" : "same-context",
      });

      if (!accessible) {
        errors.push({
          code: "landing-preview.conversion_inaccessible",
          path: `conversionElements.${index}`,
          message:
            "Visible conversion elements must expose a label and valid HTTP destination.",
        });
      }

      if (!nonDisruptive) {
        errors.push({
          code: "landing-preview.conversion_disruptive",
          path: `conversionElements.${index}.interruptionBehavior`,
          message:
            "Visible conversion elements must not interrupt active short-form playback in preview.",
        });
      }
    });

  return {
    valid: errors.length === 0,
    checks,
    errors,
  };
}

export function validateCampaignLandingPagePublishingPreview(
  renderModel: CampaignLandingPageRenderModel,
): CampaignLandingPagePublishingPreviewValidationResult {
  const accessibility =
    validateCampaignLandingPagePreviewAccessibility(renderModel);
  const errors: CampaignLandingPagePublishingPreviewValidationError[] = [];
  const embeddedShortFormModules = renderModel.modules.filter(
    (module): module is CampaignEmbeddedShortFormRenderedModule =>
      module.type === "embedded-short-form-content",
  );
  const embeddedModuleIds = new Set(
    embeddedShortFormModules.map((module) => module.id),
  );
  const hasSupportedSourceContext = embeddedShortFormModules.some(
    (module) =>
      module.preview.supported === true &&
      module.preview.sourceUrl.trim() !== "" &&
      module.preview.previewSurface.trim() !== "" &&
      module.tracking.attributionRole === "source-touchpoint" &&
      module.tracking.sourceContentId.trim() !== "",
  );

  if (!hasSupportedSourceContext) {
    errors.push(
      createCampaignLandingPagePublishingPreviewValidationError({
        code: "landing-preview.source_context_missing",
        ruleId: "short-form-source-context",
        path: "modules",
        message:
          "Publishing preview requires supported embedded short-form source context with attribution.",
      }),
    );
  }

  if (
    renderModel.behavior.mode !== "immersion-preserving" ||
    renderModel.behavior.preserveInlineContext !== true ||
    renderModel.behavior.allowTraditionalRedirect !== false
  ) {
    errors.push(
      createCampaignLandingPagePublishingPreviewValidationError({
        code: "landing-preview.inline_context_not_preserved",
        ruleId: "inline-immersion-behavior",
        path: "behavior",
        message:
          "Publishing preview must preserve inline short-form context instead of redirecting to a traditional landing flow.",
      }),
    );
  }

  if (
    renderModel.navigation.visibility === "visible" &&
    renderModel.navigation.interruptionBehavior === "block-until-complete"
  ) {
    errors.push(
      createCampaignLandingPagePublishingPreviewValidationError({
        code: "landing-preview.page_chrome_blocks_playback",
        ruleId: "non-blocking-page-chrome",
        path: "navigation.interruptionBehavior",
        message:
          "Visible navigation cannot block active short-form playback in publishing preview.",
      }),
    );
  }

  renderModel.conversionElements.forEach((element, index) => {
    if (
      element.visibility === "visible" &&
      element.interruptionBehavior === "block-until-complete"
    ) {
      errors.push(
        createCampaignLandingPagePublishingPreviewValidationError({
          code: "landing-preview.page_chrome_blocks_playback",
          ruleId: "non-blocking-page-chrome",
          path: `conversionElements.${index}.interruptionBehavior`,
          message:
            "Visible conversion controls cannot block active short-form playback in publishing preview.",
        }),
      );
    }
  });

  const continuationModules = renderModel.modules.filter(
    (module): module is CampaignInlineShortFormContinuationRenderedModule =>
      module.type === "inline-short-form-continuation",
  );
  const hasInvalidContinuation = continuationModules.some(
    (module) =>
      !embeddedModuleIds.has(module.sourceModuleId) ||
      module.behavior.consumptionSurface !== "same-page" ||
      module.behavior.navigationPolicy !== "inline-only" ||
      module.behavior.requiresSeparatePage !== false,
  );

  if (hasInvalidContinuation) {
    errors.push(
      createCampaignLandingPagePublishingPreviewValidationError({
        code: "landing-preview.same_page_continuation_missing",
        ruleId: "same-page-continuation",
        path: "modules",
        message:
          "Short-form continuation preview must remain same-page and reference an embedded source module.",
      }),
    );
  }

  const hasVisibleConversionElement = renderModel.conversionElements.some(
    (element) =>
      element.visibility === "visible" &&
      element.label.trim() !== "" &&
      element.conversionEventName.trim() !== "" &&
      isHttpUrl(element.destinationUrl),
  );
  const hasInlineContinuationCta = continuationModules.some(
    (module) =>
      module.cta.label.trim() !== "" &&
      module.cta.conversionEventName.trim() !== "" &&
      isHttpUrl(module.cta.url),
  );

  if (!hasVisibleConversionElement && !hasInlineContinuationCta) {
    errors.push(
      createCampaignLandingPagePublishingPreviewValidationError({
        code: "landing-preview.conversion_path_missing",
        ruleId: "conversion-path-accessible",
        path: "conversionElements",
        message:
          "Publishing preview must expose a visible conversion element or inline continuation CTA with a valid HTTP destination.",
      }),
    );
  }

  const invalidDesktopImmersiveModule = renderModel.modules.find(
    (module) => !hasDesktopImmersivePublishingPreviewLayout(module),
  );

  if (invalidDesktopImmersiveModule !== undefined) {
    errors.push(
      createCampaignLandingPagePublishingPreviewValidationError({
        code: "landing-preview.desktop_layout_not_immersive",
        ruleId: "desktop-immersive-layout",
        path: `modules.${invalidDesktopImmersiveModule.id}.responsiveLayoutRequirements.desktop`,
        message:
          "Desktop publishing preview must preserve short-form playback beside continuation and conversion actions without losing inline context.",
      }),
    );
  }

  const invalidMobileImmersiveModule = renderModel.modules.find(
    (module) => !hasMobileImmersivePublishingPreviewLayout(module),
  );

  if (invalidMobileImmersiveModule !== undefined) {
    errors.push(
      createCampaignLandingPagePublishingPreviewValidationError({
        code: "landing-preview.mobile_layout_not_immersive",
        ruleId: "mobile-immersive-layout",
        path: `modules.${invalidMobileImmersiveModule.id}.responsiveLayoutRequirements.mobile`,
        message:
          "Mobile publishing preview must keep short-form playback touch-first, inline, and paired with reachable conversion actions.",
      }),
    );
  }

  return {
    valid: accessibility.valid && errors.length === 0,
    rules: CAMPAIGN_LANDING_PAGE_PUBLISHING_PREVIEW_VALIDATION_RULES.map(
      (rule) => ({ ...rule }),
    ),
    accessibility,
    errors,
  };
}

function createCampaignLandingPagePublishingPreviewValidationError(
  input: Omit<CampaignLandingPagePublishingPreviewValidationError, "guidance">,
): CampaignLandingPagePublishingPreviewValidationError {
  return {
    ...input,
    guidance: getCampaignLandingPagePublishingPreviewGuidance(input.code),
  };
}

function getCampaignLandingPagePublishingPreviewGuidance(
  code: CampaignLandingPagePublishingPreviewValidationError["code"],
): CampaignLandingPagePublishingPreviewValidationError["guidance"] {
  switch (code) {
    case "landing-preview.desktop_layout_not_immersive":
      return {
        layoutScope: "desktop",
        summary:
          "Desktop preview breaks the immersive short-form to commerce layout.",
        actions: [
          "Use the immersive-desktop layout with source playback in the media region, continuation in the adjacent rail, and conversion controls in the side panel.",
          "Keep desktop interaction pointer/click based while preserving inline context and keyboard navigation.",
        ],
      };
    case "landing-preview.mobile_layout_not_immersive":
      return {
        layoutScope: "mobile",
        summary:
          "Mobile preview breaks the touch-first immersive short-form layout.",
        actions: [
          "Use the single-column mobile layout with full-width media, same-page continuation below the source, and a sticky-bottom conversion action.",
          "Keep mobile interaction touch/tap based while preserving inline playback context.",
        ],
      };
    case "landing-preview.page_chrome_blocks_playback":
      return {
        layoutScope: "global",
        summary:
          "Visible page chrome interrupts active short-form playback.",
        actions: [
          "Change blocking navigation or conversion controls to non-blocking, pause-on-activate, or same-context behavior.",
          "Keep commerce controls reachable without forcing playback completion before the visitor can continue.",
        ],
      };
    case "landing-preview.inline_context_not_preserved":
      return {
        layoutScope: "global",
        summary:
          "The preview is configured as a traditional redirect instead of an immersive continuation.",
        actions: [
          "Set landing behavior to immersion-preserving with inline context enabled and traditional redirects disabled.",
          "Keep the source short-form content visible or resumable through the commerce handoff.",
        ],
      };
    case "landing-preview.same_page_continuation_missing":
      return {
        layoutScope: "global",
        summary:
          "Continuation content is detached from the source short-form module.",
        actions: [
          "Connect each continuation module to an embedded source module and keep its consumption surface on the same page.",
          "Use inline-only navigation for continuation segments so the visitor does not lose playback context.",
        ],
      };
    case "landing-preview.conversion_path_missing":
      return {
        layoutScope: "global",
        summary:
          "The preview does not expose a reachable conversion path.",
        actions: [
          "Add a visible conversion element or inline continuation CTA with a valid HTTP checkout or offer URL.",
          "Attach a conversion event name so reporting can attribute the purchase path.",
        ],
      };
    case "landing-preview.source_context_missing":
      return {
        layoutScope: "global",
        summary:
          "The preview is missing the source short-form context needed for immersion validation.",
        actions: [
          "Add a supported embedded short-form module with source URL, preview surface, content id, and source-touchpoint attribution.",
          "Keep the source asset id or content id stable so publishing reports can connect preview failures to the originating asset.",
        ],
      };
  }
}

function hasDesktopImmersivePublishingPreviewLayout(
  module: CampaignLandingPageRenderedModule,
): boolean {
  const desktopLayout = module.responsiveLayoutRequirements.find(
    (requirement) => requirement.breakpoint === "desktop",
  );
  const desktopInteraction = module.interactionRequirements.find(
    (requirement) => requirement.breakpoint === "desktop",
  );

  return (
    desktopLayout !== undefined &&
    desktopLayout.minWidth >= 1024 &&
    desktopLayout.maxWidth === null &&
    desktopLayout.layout === "immersive-desktop" &&
    desktopLayout.mediaAspectRatio.trim() !== "" &&
    desktopLayout.mediaMaxInlineSize.trim() !== "" &&
    desktopLayout.continuationPlacement === "adjacent-rail" &&
    desktopLayout.ctaPlacement === "side-panel" &&
    desktopLayout.safeAreaPadding.trim() !== "" &&
    desktopInteraction !== undefined &&
    desktopInteraction.primaryInput === "pointer" &&
    desktopInteraction.playbackActivation === "click" &&
    desktopInteraction.preservesInlineContext === true &&
    desktopInteraction.supportsKeyboardNavigation === true &&
    desktopInteraction.conversionAction === "side-panel-cta"
  );
}

function hasMobileImmersivePublishingPreviewLayout(
  module: CampaignLandingPageRenderedModule,
): boolean {
  const mobileLayout = module.responsiveLayoutRequirements.find(
    (requirement) => requirement.breakpoint === "mobile",
  );
  const mobileInteraction = module.interactionRequirements.find(
    (requirement) => requirement.breakpoint === "mobile",
  );

  return (
    mobileLayout !== undefined &&
    mobileLayout.minWidth === 0 &&
    mobileLayout.maxWidth !== null &&
    mobileLayout.layout === "single-column" &&
    mobileLayout.mediaAspectRatio.trim() !== "" &&
    mobileLayout.mediaMaxInlineSize === "100%" &&
    mobileLayout.continuationPlacement === "below-source" &&
    mobileLayout.ctaPlacement === "sticky-bottom" &&
    mobileLayout.safeAreaPadding.trim() !== "" &&
    mobileInteraction !== undefined &&
    mobileInteraction.primaryInput === "touch" &&
    mobileInteraction.playbackActivation === "tap" &&
    mobileInteraction.preservesInlineContext === true &&
    mobileInteraction.supportsKeyboardNavigation === true &&
    mobileInteraction.conversionAction === "sticky-cta"
  );
}

export function createCampaignLandingPageExposureEvent(
  campaign: CampaignDraft,
  module: CampaignLandingPageRenderedModule,
  context: CampaignLandingPageExposureCaptureContext = {},
): CampaignExposureTrackingEvent {
  const parsedSession =
    context.sessionUrl === undefined
      ? null
      : parseInboundCampaignSessionUrl(context.sessionUrl, {
          campaignId: campaign.id,
        });
  const session = parsedSession?.session;
  const occurredAt = context.occurredAt ?? new Date().toISOString();
  const sessionId =
    context.sessionId?.trim() ||
    session?.sessionId?.trim() ||
    `${campaign.id}:landing-session`;
  const channelId =
    context.channelId?.trim() || session?.channelId?.trim() || undefined;
  const sourceAssetId =
    module.type === "embedded-short-form-content"
      ? module.tracking.sourceAssetId
      : module.segments.find((segment) => segment.assetId?.trim() !== "")
          ?.assetId;
  const sourceContentId =
    module.type === "embedded-short-form-content"
      ? module.tracking.sourceContentId
      : module.segments[0]?.id ?? module.id;
  const productId = campaign.productOffer.product.id.trim() || undefined;
  const offerId =
    campaign.productOffer.attribution.externalId.trim() ||
    campaign.productOffer.offer.headline.trim() ||
    undefined;
  const targetUrl = getCampaignLandingPageExposureTargetUrl(
    campaign,
    module,
    context.sessionUrl,
  );
  const event: CampaignExposureTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "exposure",
    id: createCampaignLandingPageExposureEventId(
      campaign.id,
      module.id,
      sessionId,
      context.viewId,
    ),
    campaignId: campaign.id,
    sessionId,
    context: context.actor ?? {
      actor: "human",
      userId: "landing-viewer",
      permissionMode: "basic",
    },
    occurredAt,
    content: {
      type:
        module.type === "embedded-short-form-content"
          ? "short_video"
          : "landing_continuation",
      id: sourceContentId,
      nodeId: module.id,
      ...(channelId === undefined ? {} : { channelId }),
      ...(sourceAssetId === undefined ? {} : { assetId: sourceAssetId }),
      ...(productId === undefined ? {} : { productId }),
      ...(offerId === undefined ? {} : { offerId }),
      metadata: {
        landingTemplateId:
          campaign.campaignSpec.landingPageTemplate?.id ??
          `landing_template_${campaign.id}`,
        moduleType: module.type,
        ...(module.type === "embedded-short-form-content"
          ? {
              sourcePlatform: module.sourcePlatform,
              embedMode: module.embedMode,
            }
          : {
              sourceModuleId: module.sourceModuleId,
            }),
      },
    },
    utm: createCampaignLandingPageExposureUtm(campaign, session),
    target: {
      type: "landing.module",
      id: module.id,
      metadata: {
        nodeId: module.id,
        outputPortId: "outputs.exposure",
        ...(channelId === undefined ? {} : { channelId }),
        ...(sourceAssetId === undefined ? {} : { assetId: sourceAssetId }),
        ...(productId === undefined ? {} : { productId }),
        ...(offerId === undefined ? {} : { offerId }),
        ...(targetUrl === undefined ? {} : { url: targetUrl }),
        label: module.label,
        metadata: {
          landingTemplateId:
            campaign.campaignSpec.landingPageTemplate?.id ??
            `landing_template_${campaign.id}`,
          ...(context.touchpointId?.trim() || session?.touchpointId?.trim()
            ? {
                touchpointId:
                  context.touchpointId?.trim() || session?.touchpointId?.trim(),
              }
            : {}),
        },
      },
    },
    exposure: {
      surface: "landing",
      placement:
        module.type === "embedded-short-form-content"
          ? "short-form-render"
          : "inline-continuation-render",
      viewId:
        context.viewId ??
        `${campaign.id}:${module.id}:${sanitizeCampaignTrackingEventIdPart(
          sessionId,
        )}`,
    },
  };
  const validation = validateCampaignExposureTrackingEvent(event);

  if (!validation.valid) {
    throw new Error(
      `Invalid campaign landing exposure event: ${validation.errors
        .map((error) => error.code)
        .join(",")}`,
    );
  }

  return event;
}

export function getCampaignLandingPageAspectRatioCssValue(
  aspectRatio: CampaignEmbeddedShortFormLandingPageTemplateConfiguration["aspectRatio"],
): string {
  return aspectRatio.replace(":", " / ");
}

function createEmbeddedShortFormRenderedModule(
  module: CampaignEmbeddedShortFormLandingPageTemplateModule,
  continuationModule?: CampaignInlineShortFormContinuationLandingPageTemplateModule,
): CampaignEmbeddedShortFormRenderedModule {
  const cssAspectRatio = getCampaignLandingPageAspectRatioCssValue(
    module.configuration.aspectRatio,
  );
  const maxWidth = getCampaignLandingPageModuleMaxWidth(
    module.configuration.aspectRatio,
  );

  return {
    id: module.id,
    type: "embedded-short-form-content",
    label: module.label,
    order: module.order,
    mediaElement:
      module.provider.embedMode === "native-player" ||
      module.provider.embedMode === "asset-render"
        ? "video"
        : "iframe",
    mediaUrl: module.provider.sourceUrl,
    sourcePlatform: module.provider.sourcePlatform,
    embedMode: module.provider.embedMode,
    aspectRatio: module.configuration.aspectRatio,
    cssAspectRatio,
    className: "landing-short-form-embed",
    style: {
      aspectRatio: cssAspectRatio,
      width: "100%",
      maxWidth,
    },
    responsiveBreakpoints: createCampaignLandingPageRenderBreakpoints(
      cssAspectRatio,
      maxWidth,
    ),
    responsiveLayoutRequirements:
      createCampaignLandingPageResponsiveLayoutRequirements(
        cssAspectRatio,
        maxWidth,
      ),
    interactionRequirements: createCampaignLandingPageInteractionRequirements(
      continuationModule?.configuration.transitionStyle ?? "native",
    ),
    playback: {
      autoplay: module.configuration.autoplay,
      muted: module.configuration.muted,
      loop: module.configuration.loop,
      showCaptions: module.configuration.showCaptions,
      preserveSourceChrome: module.configuration.preserveSourceChrome,
    },
    playbackControls: createEmbeddedShortFormPlaybackControls(module),
    pageInteractionPolicy: createEmbeddedShortFormPageInteractionPolicy(module),
    preview: createEmbeddedShortFormPreview(module.provider),
    tracking: {
      attributionRole: "source-touchpoint",
      sourceContentId: module.provider.sourceContentId,
      ...(module.provider.sourceAssetId === undefined
        ? {}
        : { sourceAssetId: module.provider.sourceAssetId }),
    },
  };
}

function createEmbeddedShortFormPreview(
  provider: CampaignLandingPageTemplateShortFormProviderMetadata,
): CampaignEmbeddedShortFormPreview {
  const configuration = getSupportedShortFormEmbedConfiguration(provider);

  if (configuration === null) {
    throw new Error("Unsupported short-form embed preview configuration");
  }

  return {
    sourcePlatform: provider.sourcePlatform,
    sourceType: provider.sourceType,
    embedMode: provider.embedMode,
    previewSurface: configuration.previewSurface,
    sourceUrl: provider.sourceUrl,
    supported: true,
  };
}

function createEmbeddedShortFormPlaybackControls(
  module: CampaignEmbeddedShortFormLandingPageTemplateModule,
): CampaignEmbeddedShortFormPlaybackControls {
  const usesNativeMedia =
    module.provider.embedMode === "native-player" ||
    module.provider.embedMode === "asset-render";

  return {
    nativeControls: usesNativeMedia,
    keyboardAccessible: true,
    captions: usesNativeMedia
      ? module.configuration.showCaptions
        ? "show-when-available"
        : "provider-managed"
      : "provider-managed",
    fullscreen: true,
    pictureInPicture: true,
  };
}

function createEmbeddedShortFormPageInteractionPolicy(
  module: CampaignEmbeddedShortFormLandingPageTemplateModule,
): CampaignEmbeddedShortFormPageInteractionPolicy {
  const usesNativeMedia =
    module.provider.embedMode === "native-player" ||
    module.provider.embedMode === "asset-render";

  return {
    pointerEvents: usesNativeMedia
      ? "media-controls"
      : "activate-on-focus-or-hover",
    pageScroll: "preserve",
    iframeActivation: usesNativeMedia ? "not-applicable" : "explicit",
    focusTrap: false,
  };
}

function createCampaignLandingPageResponsiveLayoutRequirements(
  mediaAspectRatio: string,
  mediaMaxInlineSize: string,
): CampaignLandingPageResponsiveLayoutRequirement[] {
  return [
    {
      breakpoint: "mobile",
      minWidth: 0,
      maxWidth: 639,
      layout: "single-column",
      mediaAspectRatio,
      mediaMaxInlineSize: "100%",
      continuationPlacement: "below-source",
      ctaPlacement: "sticky-bottom",
      safeAreaPadding: "16px",
    },
    {
      breakpoint: "tablet",
      minWidth: 640,
      maxWidth: 1023,
      layout: "centered-column",
      mediaAspectRatio,
      mediaMaxInlineSize,
      continuationPlacement: "below-source",
      ctaPlacement: "below-content",
      safeAreaPadding: "24px",
    },
    {
      breakpoint: "desktop",
      minWidth: 1024,
      maxWidth: null,
      layout: "immersive-desktop",
      mediaAspectRatio,
      mediaMaxInlineSize,
      continuationPlacement: "adjacent-rail",
      ctaPlacement: "side-panel",
      safeAreaPadding: "32px",
    },
  ];
}

function createCampaignLandingPageInteractionRequirements(
  scrollBehavior: CampaignLandingPageInteractionRequirement["scrollBehavior"],
): CampaignLandingPageInteractionRequirement[] {
  return [
    {
      breakpoint: "mobile",
      primaryInput: "touch",
      playbackActivation: "tap",
      scrollBehavior,
      preservesInlineContext: true,
      supportsKeyboardNavigation: true,
      conversionAction: "sticky-cta",
    },
    {
      breakpoint: "tablet",
      primaryInput: "touch",
      playbackActivation: "tap",
      scrollBehavior,
      preservesInlineContext: true,
      supportsKeyboardNavigation: true,
      conversionAction: "inline-cta",
    },
    {
      breakpoint: "desktop",
      primaryInput: "pointer",
      playbackActivation: "click",
      scrollBehavior,
      preservesInlineContext: true,
      supportsKeyboardNavigation: true,
      conversionAction: "side-panel-cta",
    },
  ];
}

function createCampaignLandingPageRenderBreakpoints(
  aspectRatio: string,
  maxInlineSize: string,
): CampaignLandingPageRenderBreakpoint[] {
  return [
    {
      name: "mobile",
      minWidth: 0,
      maxWidth: 639,
      aspectRatio,
      maxInlineSize: "100%",
    },
    {
      name: "tablet",
      minWidth: 640,
      maxWidth: 1023,
      aspectRatio,
      maxInlineSize,
    },
    {
      name: "desktop",
      minWidth: 1024,
      maxWidth: null,
      aspectRatio,
      maxInlineSize,
    },
  ];
}

function getCampaignLandingPageModuleMaxWidth(
  aspectRatio: CampaignEmbeddedShortFormLandingPageTemplateConfiguration["aspectRatio"],
): string {
  if (aspectRatio === "9:16" || aspectRatio === "4:5") {
    return "420px";
  }

  if (aspectRatio === "1:1") {
    return "560px";
  }

  return "860px";
}

export type CampaignTargetAudience = {
  age: string;
  gender: string;
  interests: string;
  behavior: string;
  region: string;
  platform: string;
};

export const CAMPAIGN_TARGET_AUDIENCE_FIELDS = [
  "age",
  "gender",
  "interests",
  "behavior",
  "region",
  "platform",
] as const satisfies readonly (keyof CampaignTargetAudience)[];

export type CampaignTargetAudienceField =
  (typeof CAMPAIGN_TARGET_AUDIENCE_FIELDS)[number];

export type CampaignProductOffer = {
  product: {
    id: string;
    title: string;
    brand: string;
    category: string;
    description: string;
    tags: string[];
    canonicalUrl: string;
    media: CampaignProductMedia[];
    variants: CampaignProductVariant[];
  };
  offer: {
    headline: string;
    summary: string;
    price: CampaignProductPrice;
    discount: string;
    terms: string;
    destinationUrl: string;
    callToAction: string;
  };
  attribution: {
    source: string;
    externalId: string;
    affiliateNetwork: string;
    commissionRate: number | null;
    trackingUrl: string;
  };
};

export const CAMPAIGN_PRODUCT_OFFER_FIELDS = {
  product: [
    "id",
    "title",
    "brand",
    "category",
    "description",
    "tags",
    "canonicalUrl",
    "media",
    "variants",
  ],
  offer: [
    "headline",
    "summary",
    "price",
    "discount",
    "terms",
    "destinationUrl",
    "callToAction",
  ],
  attribution: [
    "source",
    "externalId",
    "affiliateNetwork",
    "commissionRate",
    "trackingUrl",
  ],
} as const satisfies {
  readonly product: readonly (keyof CampaignProductOffer["product"])[];
  readonly offer: readonly (keyof CampaignProductOffer["offer"])[];
  readonly attribution: readonly (keyof CampaignProductOffer["attribution"])[];
};

export type CampaignProductOfferSection =
  keyof typeof CAMPAIGN_PRODUCT_OFFER_FIELDS;

export type CampaignProductOfferField<
  Section extends CampaignProductOfferSection = CampaignProductOfferSection,
> = (typeof CAMPAIGN_PRODUCT_OFFER_FIELDS)[Section][number];

export type CampaignProductMedia = {
  id: string;
  type: "image" | "video";
  url: string;
  altText: string;
  role: "primary" | "gallery" | "ugc" | "reference";
};

export type CampaignProductPrice = {
  amount: number | null;
  currency: string;
  display: string;
};

export type CampaignProductVariant = {
  id: string;
  title: string;
  sku: string;
  attributes: Record<string, string>;
  price: CampaignProductPrice;
  availability: "unknown" | "in-stock" | "out-of-stock" | "preorder";
};

export type CampaignAssetSource = "upload" | "link";

export type CampaignAssetMediaType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "text"
  | "other";

export type CampaignAssetUsage =
  | "product"
  | "reference"
  | "generated"
  | "ad"
  | "landing";

export type CampaignAssetStatus = "draft" | "ready" | "approved" | "archived";

export type CampaignAssetOutputLocations = {
  primaryUri: string;
  thumbnailUri?: string;
};

export type CampaignAssetStorageReference = {
  provider: string;
  bucket: string;
  objectKey: string;
  publicUri: string;
  contentHash?: string;
};

export type CampaignAssetGenerationOutputField =
  | "uri"
  | "title"
  | "altText"
  | "fileName"
  | "mimeType"
  | "sizeBytes";

export type CampaignAssetGenerationOutputTarget = {
  assetId: string;
  field: CampaignAssetGenerationOutputField;
};

export type CampaignGeneratedAssetMetadata = {
  jobId: string;
  resultId: string;
  assetId: string;
  mediaType: CampaignAssetGenerationMediaType;
  providerPluginId: string;
  capabilityId: string;
  providerRequestId: string;
  storageReferences?: CampaignAssetStorageReference[];
  outputUri: string;
  thumbnailUri?: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number | null;
  model: string;
  promptHash: string;
  seed: number | null;
  generatedAt: string;
  durationMs: number;
  costUsd: number | null;
  finishReason: CampaignAssetGenerationResultFinishReason;
  dimensions: {
    width: number;
    height: number;
  };
  durationSeconds?: number;
  frameRate?: number;
  codec?: string;
  inputSources: string[];
  outputTargets: CampaignAssetGenerationOutputTarget[];
};

export type CampaignAsset = {
  id: string;
  source: CampaignAssetSource;
  mediaType: CampaignAssetMediaType;
  title: string;
  uri: string;
  usage: CampaignAssetUsage;
  status: CampaignAssetStatus;
  altText: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  rights: {
    owner: string;
    license: string;
    sourceUrl?: string;
  };
  createdBy: PluginActor;
  createdAt: string;
  outputLocations?: CampaignAssetOutputLocations;
  generatedMetadata?: CampaignGeneratedAssetMetadata;
  storageReferences?: CampaignAssetStorageReference[];
};

export type CampaignAssetSummary = Pick<
  CampaignAsset,
  | "id"
  | "title"
  | "source"
  | "mediaType"
  | "usage"
  | "status"
  | "createdBy"
  | "createdAt"
> & {
  rightsOwner: string;
};

export type CampaignShortFormContentBrowseSurface =
  | "commerce"
  | "campaign-actions"
  | "canvas";

export type CampaignShortFormContentControlActionId =
  | "play-pause"
  | "mute"
  | "captions"
  | "open-product"
  | "open-campaign-action"
  | "track-conversion";

export type CampaignShortFormContentControlAction = {
  id: CampaignShortFormContentControlActionId;
  label: string;
  ariaLabel: string;
  targetSurface: CampaignShortFormContentBrowseSurface;
};

export type CampaignShortFormContentControlModel = {
  activeAsset: Pick<
    CampaignAsset,
    | "id"
    | "title"
    | "mediaType"
    | "uri"
    | "altText"
    | "mimeType"
    | "generatedMetadata"
  >;
  playlist: CampaignAssetSummary[];
  playback: {
    nativeControls: true;
    muted: boolean;
    loop: boolean;
    captions: "show-when-available";
  };
  layout: {
    placement: "sticky-bottom-right";
    maxInlineSize: string;
    aspectRatio: "9 / 16";
  };
  accessibility: {
    keyboardAccessible: true;
    remainsAvailableWhileBrowsing: true;
    ariaLabel: string;
  };
  availableWhileBrowsing: CampaignShortFormContentBrowseSurface[];
  actions: CampaignShortFormContentControlAction[];
  commerceContext: {
    productTitle: string;
    offerHeadline: string;
    destinationUrl: string;
    callToAction: string;
  };
  campaignActionContext: {
    primaryChannelId: string;
    primaryChannelLabel: string;
    conversionEventName: string;
  };
};

export type CampaignAssetInput = {
  id?: string;
  source: CampaignAssetSource;
  mediaType: CampaignAssetMediaType;
  title: string;
  uri: string;
  usage: CampaignAssetUsage;
  status?: CampaignAssetStatus;
  altText?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number | null;
  rights: {
    owner: string;
    license: string;
    sourceUrl?: string;
  };
  createdBy: PluginActor;
  outputLocations?: CampaignAssetOutputLocations;
  generatedMetadata?: CampaignGeneratedAssetMetadata;
  storageReferences?: CampaignAssetStorageReference[];
};

export type CampaignAssetEditInput = Partial<
  Pick<CampaignAsset, "mediaType" | "title" | "usage" | "status" | "altText">
> & {
  rights?: Partial<CampaignAsset["rights"]>;
};

export type CampaignAssetReplacementInput = Partial<
  Pick<CampaignAsset, "mediaType" | "title" | "usage" | "status" | "altText">
> & {
  source: CampaignAssetSource;
  uri: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number | null;
  rights?: Partial<CampaignAsset["rights"]>;
};

export type CampaignAssetValidationErrorCode =
  | "asset.id_required"
  | "asset.title_required"
  | "asset.uri_required"
  | "asset.uri_invalid"
  | "asset.file_name_required"
  | "asset.size_invalid"
  | "asset.rights_owner_required"
  | "asset.rights_source_url_invalid"
  | "asset.output_location_invalid";

export type CampaignAssetValidationError = {
  code: CampaignAssetValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignAssetValidationResult = {
  valid: boolean;
  errors: CampaignAssetValidationError[];
};

export type CampaignAssetGenerationMediaType = Extract<
  CampaignAssetMediaType,
  "image" | "video"
>;

export type CampaignAssetGenerationRequiredInput = {
  key: string;
  label: string;
  source: string;
  dataType: "text" | "image" | "video" | "audio" | "json" | "asset";
};

export type CampaignAssetGenerationJobStatus =
  | "draft"
  | "ready"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type CampaignExecutionActor = PluginActor | "system";

export const CAMPAIGN_ASSET_GENERATION_JOB_STATUSES = [
  "draft",
  "ready",
  "queued",
  "running",
  "completed",
  "failed",
  "canceled",
] as const satisfies readonly CampaignAssetGenerationJobStatus[];

export type CampaignAssetGenerationJobLifecycle = {
  createdAt: string;
  updatedAt: string;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  canceledAt: string | null;
  actor: CampaignExecutionActor;
  attempt: number;
  progress: number;
  error: string | null;
  failureDetails?: CampaignAssetGenerationFailureDetails | null;
};

export type CampaignAssetGenerationFailureDetails = {
  name: string;
  message: string;
  stack?: string | null;
  jobId?: string;
  mediaType?: CampaignAssetGenerationMediaType;
  providerPluginId?: string;
  capabilityId?: string;
  attempt?: number;
  failedAt?: string;
};

export type CampaignImageAssetGenerationInputs = {
  prompt: string;
  negativePrompt: string;
  referenceAssetIds: string[];
  productAssetIds: string[];
  count: number;
  aspectRatio: string;
  size: {
    width: number;
    height: number;
  };
  style: string;
  seed: number | null;
  providerParameters: Record<string, unknown>;
};

export type CampaignVideoAssetGenerationInputs = {
  prompt: string;
  negativePrompt: string;
  storyboard: Record<string, unknown>;
  script: string;
  referenceAssetIds: string[];
  productAssetIds: string[];
  count: number;
  aspectRatio: string;
  durationSeconds: number;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  style: string;
  seed: number | null;
  providerParameters: Record<string, unknown>;
};

export type CampaignAssetGenerationResultFinishReason =
  | "completed"
  | "filtered"
  | "partial"
  | "failed";

export type CampaignAssetGenerationResultMetadata = {
  id: string;
  assetId: string;
  uri: string;
  mimeType: string;
  width: number;
  height: number;
  durationSeconds?: number;
  frameRate?: number;
  codec?: string;
  thumbnailUri?: string;
  sizeBytes: number | null;
  model: string;
  seed: number | null;
  promptHash: string;
  providerRequestId: string;
  storageReferences?: CampaignAssetStorageReference[];
  generatedAt: string;
  durationMs: number;
  costUsd: number | null;
  finishReason: CampaignAssetGenerationResultFinishReason;
};

export type CampaignAssetGenerationJob = {
  id: string;
  mediaType: CampaignAssetGenerationMediaType;
  providerPluginId: string;
  capabilityId: string;
  requiredInputs: CampaignAssetGenerationRequiredInput[];
  imageInputs?: CampaignImageAssetGenerationInputs;
  videoInputs?: CampaignVideoAssetGenerationInputs;
  outputTargets: CampaignAssetGenerationOutputTarget[];
  resultMetadata?: CampaignAssetGenerationResultMetadata[];
  status: CampaignAssetGenerationJobStatus;
  lifecycle?: CampaignAssetGenerationJobLifecycle;
};

export type CampaignAssetGenerationJobInput = Omit<
  CampaignAssetGenerationJob,
  "id" | "status"
> & {
  id?: string;
  status?: CampaignAssetGenerationJobStatus;
};

export type CampaignAssetGenerationValidationErrorCode =
  | "asset_generation_job.list_required"
  | "asset_generation_job.object_required"
  | "asset_generation_job.id_required"
  | "asset_generation_job.id_duplicate"
  | "asset_generation_job.status_invalid"
  | "asset_generation_job.media_type_required"
  | "asset_generation_job.provider_plugin_id_required"
  | "asset_generation_job.capability_id_required"
  | "asset_generation_job.required_input_required"
  | "asset_generation_job.required_input_key_required"
  | "asset_generation_job.required_input_source_required"
  | "asset_generation_job.output_target_required"
  | "asset_generation_job.output_target_asset_id_required"
  | "asset_generation_job.output_target_field_required"
  | "asset_generation_job.lifecycle_attempt_invalid"
  | "asset_generation_job.lifecycle_progress_invalid"
  | "asset_generation_job.lifecycle_timestamp_invalid"
  | "asset_generation_job.lifecycle_error_required";

export type CampaignAssetGenerationValidationError = {
  code: CampaignAssetGenerationValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignAssetGenerationValidationResult = {
  valid: boolean;
  errors: CampaignAssetGenerationValidationError[];
};

const EMPTY_ASSET_GENERATION_JOB_LIFECYCLE: CampaignAssetGenerationJobLifecycle =
  {
    createdAt: "",
    updatedAt: "",
    queuedAt: null,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    canceledAt: null,
    actor: "system",
    attempt: 0,
    progress: 0,
    error: null,
  };

export type CampaignProductOfferInput = {
  product?: Partial<CampaignProductOffer["product"]>;
  offer?: Omit<Partial<CampaignProductOffer["offer"]>, "price"> & {
    price?: Partial<CampaignProductPrice>;
  };
  attribution?: Partial<CampaignProductOffer["attribution"]>;
};

export type CampaignProductOfferValidationErrorCode =
  | "product.title_required"
  | "product.canonical_url_invalid"
  | "product.media_id_required"
  | "product.media_url_invalid"
  | "product.variant_id_required"
  | "product.variant_title_required"
  | "product.variant_price_invalid"
  | "product.variant_currency_invalid"
  | "offer.headline_required"
  | "offer.destination_url_invalid"
  | "offer.call_to_action_required"
  | "offer.price_invalid"
  | "offer.currency_invalid"
  | "attribution.commission_rate_invalid"
  | "attribution.tracking_url_invalid";

export type CampaignProductOfferValidationError = {
  code: CampaignProductOfferValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignProductOfferValidationResult = {
  valid: boolean;
  errors: CampaignProductOfferValidationError[];
};

export const CAMPAIGN_REQUIRED_FIELDS = [
  "id",
  "title",
  "objective",
  "targetAudience",
  "productOffer",
  "campaignSpec",
  "canvasState",
  "plugins",
  "assets",
  "channels",
  "tracking",
  "logs",
  "versions",
  "status",
] as const;

export type CampaignRequiredField = (typeof CAMPAIGN_REQUIRED_FIELDS)[number];

export type CampaignSchemaVersion = "owncanvas.campaign.v1";

export type CampaignUtmTracking = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

export type CampaignAttributionModel =
  | "first-touch"
  | "last-touch"
  | "linear";

export type CampaignAttributionParameter = {
  key: string;
  value: string;
  source: string;
};

export type CampaignPixelEvent = {
  id: string;
  provider: string;
  pixelId: string;
  eventName: string;
  conversion: boolean;
};

export type CampaignAnalyticsDestination = {
  id: string;
  provider: string;
  destinationId: string;
  label: string;
  enabled: boolean;
};

export type CampaignTrackedSession = {
  id: string;
  campaignId: string;
  userId?: string;
  url: string;
  channelId?: string;
  touchpointId?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  utm: CampaignUtmTracking;
  attributionParameters: CampaignAttributionParameter[];
};

export const CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION =
  "owncanvas.tracking-event.v1" as const;

export type CampaignTrackingEventSchemaVersion =
  typeof CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION;

export type CampaignTrackingEventType =
  | "exposure"
  | "click"
  | "conversion"
  | "engagement"
  | "revisit";

export type CampaignTrackingEventActorContext = {
  actor: PluginActor;
  userId?: string;
  agentId?: string;
  pluginId?: string;
  permissionMode?: PluginPermissionMode;
};

export type CampaignTrackingEventTargetMetadata = {
  nodeId?: string;
  inputPortId?: string;
  outputPortId?: string;
  channelId?: string;
  workflowId?: string;
  contentVariantId?: string;
  pageId?: string;
  assetId?: string;
  productId?: string;
  offerId?: string;
  url?: string;
  label?: string;
  metadata?: Record<string, unknown>;
};

export type CampaignTrackingEventContentMetadata = {
  type: string;
  id: string;
  nodeId?: string;
  channelId?: string;
  workflowId?: string;
  contentVariantId?: string;
  pageId?: string;
  assetId?: string;
  productId?: string;
  offerId?: string;
  metadata?: Record<string, unknown>;
};

export type CampaignTrackingEventTarget = {
  type: string;
  id: string;
  metadata: CampaignTrackingEventTargetMetadata;
};

export type CampaignTrackingEventBase = {
  schemaVersion: CampaignTrackingEventSchemaVersion;
  id: string;
  campaignId: string;
  sessionId: string;
  context: CampaignTrackingEventActorContext;
  occurredAt: string;
  content: CampaignTrackingEventContentMetadata;
  utm: CampaignUtmTracking;
  target: CampaignTrackingEventTarget;
};

export type CampaignExposureTrackingEvent = CampaignTrackingEventBase & {
  type: "exposure";
  exposure: {
    surface: string;
    placement: string;
    viewId?: string;
  };
};

export type CampaignClickTrackingEvent = CampaignTrackingEventBase & {
  type: "click";
  click: {
    id?: string;
    href: string;
    label?: string;
    destination?: string;
  };
};

export type CampaignConversionTrackingEvent = CampaignTrackingEventBase & {
  type: "conversion";
  conversion: {
    eventName: string;
    value?: number;
    currency?: string;
    orderId?: string;
    quantity?: number;
    metadata?: Record<string, unknown>;
  };
};

export type CampaignEngagementTrackingEvent = CampaignTrackingEventBase & {
  type: "engagement";
  engagement: {
    kind: "playback" | "scroll";
    action: string;
    value?: number;
    unit?: "percent" | "seconds" | "pixels" | "count";
    metadata?: Record<string, unknown>;
  };
};

export type CampaignRevisitTrackingEvent = CampaignTrackingEventBase & {
  type: "revisit";
  revisit: {
    firstSeenAt: string;
    lastSeenAt: string;
    matchedBy: CampaignReturningAttributionMatch[];
  };
};

export type CampaignTrackingEvent =
  | CampaignExposureTrackingEvent
  | CampaignClickTrackingEvent
  | CampaignConversionTrackingEvent
  | CampaignEngagementTrackingEvent
  | CampaignRevisitTrackingEvent;

export type CampaignAnalyticsEventAttribution = {
  campaignId: string;
  sessionId: string;
  eventId: string;
  eventType: CampaignTrackingEventType;
  occurredAt: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  nodeId?: string;
  inputPortId?: string;
  outputPortId?: string;
  channelId?: string;
  pageId?: string;
  assetId?: string;
  productId?: string;
  offerId?: string;
  targetType: string;
  targetId: string;
  surface?: string;
  placement?: string;
  viewId?: string;
  destination?: string;
  href?: string;
  clickId?: string;
  workflowId?: string;
  contentVariantId?: string;
  conversionEventName?: string;
  conversionValue?: number;
  conversionCurrency?: string;
  orderId?: string;
  quantity?: number;
  engagementKind?: "playback" | "scroll";
  engagementAction?: string;
  engagementValue?: number;
  engagementUnit?: "percent" | "seconds" | "pixels" | "count";
  revisitFirstSeenAt?: string;
  revisitLastSeenAt?: string;
  revisitMatchedBy?: CampaignReturningAttributionMatch[];
  immersion?: {
    type: "short-form";
    pageId: string;
    assetId: string;
    sessionId: string;
    action: string;
    value?: number;
    unit?: "percent" | "seconds" | "pixels" | "count";
  };
};

export type CampaignConversionOrigin = {
  campaignId: string;
  workflowId?: string;
  contentId: string;
  contentType: string;
  contentVariantId?: string;
  nodeId?: string;
  inputPortId?: string;
  outputPortId?: string;
  channelId?: string;
  pageId?: string;
  assetId?: string;
  productId?: string;
  offerId?: string;
  sourceEventId: string;
  attributedInteractionEventId?: string;
};

export type CampaignAnalyticsEventRecord = {
  event: CampaignTrackingEvent;
  persistedAt: string;
  attribution: CampaignAnalyticsEventAttribution;
};

export type CampaignPurchaseConversionAttributionMetadata = {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  nodeId: string;
  inputPortId: string;
  channelId: string;
  pageId?: string;
  assetId?: string;
  productId: string;
  offerId: string;
  targetType: string;
  targetId: string;
  url?: string;
  label?: string;
  conversionMetadata?: Record<string, unknown>;
  targetMetadata?: Record<string, unknown>;
};

export type CampaignPurchaseConversionEventRecord = {
  schemaVersion: "owncanvas.campaign-purchase-conversion-event.v1";
  id: string;
  eventId: string;
  campaignId: string;
  sessionId: string;
  occurredAt: string;
  persistedAt: string;
  actor: PluginActor;
  userId: string;
  agentId?: string;
  pluginId?: string;
  permissionMode?: PluginPermissionMode;
  eventName: "purchase";
  orderId: string;
  value?: number;
  currency?: string;
  quantity?: number;
  content: CampaignTrackingEventContentMetadata;
  utm: CampaignUtmTracking;
  target: CampaignTrackingEventTarget;
  attribution: CampaignAnalyticsEventAttribution;
  attributionMetadata: CampaignPurchaseConversionAttributionMetadata;
  attributionMatch?: CampaignConversionAttributionMatch;
};

export type CampaignConversionAttributionRule =
  | "last-click-same-session-offer"
  | "last-click-same-user-offer"
  | "last-click-same-session-product"
  | "last-click-same-user-product"
  | "last-click-same-session"
  | "last-click-same-user"
  | "last-exposure-same-session-offer"
  | "last-exposure-same-user-offer"
  | "last-exposure-same-session-product"
  | "last-exposure-same-user-product"
  | "last-exposure-same-session"
  | "last-exposure-same-user"
  | "last-session-same-session";

export type CampaignConversionAttributionMatch = {
  conversionEventId: string;
  interactionEventId: string;
  rule: CampaignConversionAttributionRule;
  matchedAt: string;
  interactionOccurredAt: string;
  attributionWindowDays: number;
  reason: string;
};

export type CampaignConversionEventRecord = {
  schemaVersion: "owncanvas.campaign-conversion-record.v1";
  id: string;
  eventId: string;
  campaignId: string;
  sessionId: string;
  occurredAt: string;
  persistedAt: string;
  actor: PluginActor;
  userId?: string;
  agentId?: string;
  pluginId?: string;
  permissionMode?: PluginPermissionMode;
  eventName: string;
  value?: number;
  currency?: string;
  orderId?: string;
  quantity?: number;
  content: CampaignTrackingEventContentMetadata;
  utm: CampaignUtmTracking;
  target: CampaignTrackingEventTarget;
  attribution: CampaignAnalyticsEventAttribution;
  attributionMatch?: CampaignConversionAttributionMatch;
};

export type CampaignRevisitEventRecord = {
  schemaVersion: "owncanvas.campaign-revisit-record.v1";
  id: string;
  eventId: string;
  campaignId: string;
  sessionId: string;
  occurredAt: string;
  persistedAt: string;
  actor: PluginActor;
  userId?: string;
  agentId?: string;
  pluginId?: string;
  permissionMode?: PluginPermissionMode;
  firstSeenAt: string;
  lastSeenAt: string;
  matchedBy: CampaignReturningAttributionMatch[];
  content: CampaignTrackingEventContentMetadata;
  utm: CampaignUtmTracking;
  target: CampaignTrackingEventTarget;
  attribution: CampaignAnalyticsEventAttribution;
};

export type CampaignAnalyticsEventQuery = {
  campaignId?: string;
  sessionId?: string;
  clickId?: string;
  pageId?: string;
  assetId?: string;
  eventType?: CampaignTrackingEventType;
  channelId?: string;
  productId?: string;
  offerId?: string;
  destination?: string;
  href?: string;
  conversionEventName?: string;
  orderId?: string;
  currency?: string;
  matchedBy?: CampaignReturningAttributionMatch["type"];
  from?: string;
  to?: string;
};

export type CampaignMetricKind =
  | "exposure"
  | "click"
  | "conversion"
  | "revisit";

export type CampaignMetricQueryFilter =
  | "campaignId"
  | "sessionId"
  | "clickId"
  | "pageId"
  | "assetId"
  | "channelId"
  | "productId"
  | "offerId"
  | "destination"
  | "href"
  | "conversionEventName"
  | "orderId"
  | "currency"
  | "matchedBy"
  | "from"
  | "to";

export type CampaignMetricQueryGroupBy =
  | "sessionId"
  | "clickId"
  | "pageId"
  | "assetId"
  | "channelId"
  | "productId"
  | "offerId"
  | "source"
  | "medium"
  | "campaign"
  | "surface"
  | "placement"
  | "destination"
  | "href"
  | "conversionEventName"
  | "currency"
  | "matchedBy";

export type CampaignMetricQueryMeasure =
  | "count"
  | "uniqueSessions"
  | "totalValue";

export type CampaignMetricQueryContract = {
  schemaVersion: "owncanvas.campaign-metric-query-contract.v1";
  metric: CampaignMetricKind;
  eventType: CampaignMetricKind;
  endpoint: string;
  method: "GET";
  requiredFilters: CampaignMetricQueryFilter[];
  supportedFilters: CampaignMetricQueryFilter[];
  supportedGroupBy: CampaignMetricQueryGroupBy[];
  measures: CampaignMetricQueryMeasure[];
};

export type CampaignMetricQuery = Omit<
  CampaignAnalyticsEventQuery,
  "eventType"
> & {
  metric?: CampaignMetricKind | "all";
  groupBy?: CampaignMetricQueryGroupBy[];
};

export type CampaignMetricQueryReportRow = {
  metric: CampaignMetricKind;
  eventType: CampaignMetricKind;
  count: number;
  uniqueSessions: number;
  totalValue?: number;
};

export type CampaignMetricQueryReport = {
  schemaVersion: "owncanvas.campaign-metric-query-report.v1";
  campaignId: string;
  generatedAt: string;
  query: {
    metric: CampaignMetricKind | "all";
    filters: Partial<CampaignAnalyticsEventQuery>;
  };
  contracts: CampaignMetricQueryContract[];
  rows: CampaignMetricQueryReportRow[];
  report?: CampaignMetricReport;
  conversionMetrics?: CampaignConversionMetricsReport;
};

export type CampaignMetricReportRow = {
  key: string;
  group: Partial<Record<CampaignMetricQueryGroupBy, string>>;
  count: number;
  uniqueSessions: number;
  totalValue?: number;
};

export type CampaignMetricReport = {
  schemaVersion: "owncanvas.campaign-metric-report.v1";
  campaignId: string;
  generatedAt: string;
  metric: CampaignMetricKind;
  query: {
    filters: Partial<CampaignAnalyticsEventQuery>;
    groupBy: CampaignMetricQueryGroupBy[];
  };
  summary: {
    count: number;
    uniqueSessions: number;
    totalValue?: number;
  };
  rows: CampaignMetricReportRow[];
};

export type CampaignConversionMetricsReport = {
  schemaVersion: "owncanvas.campaign-conversion-metrics.v1";
  campaignId: string;
  generatedAt: string;
  query: {
    filters: Partial<CampaignAnalyticsEventQuery>;
  };
  funnel: {
    exposures: number;
    exposureSessions: number;
    clicks: number;
    clickSessions: number;
    conversions: number;
    conversionSessions: number;
    purchaseConversions: number;
    purchaseConversionSessions: number;
  };
  rates: {
    clickThroughRate: number;
    sessionClickThroughRate: number;
    purchaseConversionRate: number;
    sessionPurchaseConversionRate: number;
  };
  reportableMetrics: CampaignReportableConversionMetric[];
  successScore: CampaignConversionSuccessScore;
  value: {
    totalValue: number;
    averageOrderValue: number;
    revenuePerClick: number;
    revenuePerClickSession: number;
    currencyBreakdown: Record<string, number>;
  };
};

export type CampaignReportableConversionMetric = {
  key: "purchase_conversion_rate" | "purchase_conversions";
  label: string;
  source: string;
  unit: "percent" | "count";
  numerator?: string;
  denominator?: string;
};

export type CampaignConversionSuccessScore = {
  score: number;
  primaryMetric: "purchase_conversion_rate" | "purchase_conversion_count";
  value: number;
  unit: "percent" | "count";
  purchaseConversions: number;
  purchaseConversionRate: number;
  denominator: "clicks" | "none";
};

const CAMPAIGN_METRIC_QUERY_BASE_GROUPS = [
  "sessionId",
  "pageId",
  "assetId",
  "channelId",
  "productId",
  "offerId",
  "source",
  "medium",
  "campaign",
] as const satisfies readonly CampaignMetricQueryGroupBy[];

export const CAMPAIGN_METRIC_QUERY_CONTRACTS = [
  {
    schemaVersion: "owncanvas.campaign-metric-query-contract.v1",
    metric: "exposure",
    eventType: "exposure",
    endpoint: "/api/campaigns/:campaignId/tracking/exposures",
    method: "GET",
    requiredFilters: ["campaignId"],
    supportedFilters: [
      "campaignId",
      "sessionId",
      "pageId",
      "assetId",
      "channelId",
      "productId",
      "offerId",
      "from",
      "to",
    ],
    supportedGroupBy: [
      ...CAMPAIGN_METRIC_QUERY_BASE_GROUPS,
      "surface",
      "placement",
    ],
    measures: ["count", "uniqueSessions"],
  },
  {
    schemaVersion: "owncanvas.campaign-metric-query-contract.v1",
    metric: "click",
    eventType: "click",
    endpoint: "/api/campaigns/:campaignId/tracking/clicks",
    method: "GET",
    requiredFilters: ["campaignId"],
    supportedFilters: [
      "campaignId",
      "sessionId",
      "clickId",
      "pageId",
      "assetId",
      "channelId",
      "productId",
      "offerId",
      "destination",
      "href",
      "from",
      "to",
    ],
    supportedGroupBy: [
      "sessionId",
      "clickId",
      "pageId",
      "assetId",
      "channelId",
      "productId",
      "offerId",
      "source",
      "medium",
      "campaign",
      "destination",
      "href",
    ],
    measures: ["count", "uniqueSessions"],
  },
  {
    schemaVersion: "owncanvas.campaign-metric-query-contract.v1",
    metric: "conversion",
    eventType: "conversion",
    endpoint: "/api/campaigns/:campaignId/tracking/conversions",
    method: "GET",
    requiredFilters: ["campaignId"],
    supportedFilters: [
      "campaignId",
      "sessionId",
      "pageId",
      "assetId",
      "channelId",
      "productId",
      "offerId",
      "conversionEventName",
      "orderId",
      "currency",
      "from",
      "to",
    ],
    supportedGroupBy: [
      ...CAMPAIGN_METRIC_QUERY_BASE_GROUPS,
      "conversionEventName",
      "currency",
    ],
    measures: ["count", "uniqueSessions", "totalValue"],
  },
  {
    schemaVersion: "owncanvas.campaign-metric-query-contract.v1",
    metric: "revisit",
    eventType: "revisit",
    endpoint: "/api/campaigns/:campaignId/tracking/revisits",
    method: "GET",
    requiredFilters: ["campaignId"],
    supportedFilters: [
      "campaignId",
      "sessionId",
      "pageId",
      "assetId",
      "channelId",
      "productId",
      "offerId",
      "matchedBy",
      "from",
      "to",
    ],
    supportedGroupBy: [...CAMPAIGN_METRIC_QUERY_BASE_GROUPS, "matchedBy"],
    measures: ["count", "uniqueSessions"],
  },
] as const satisfies readonly CampaignMetricQueryContract[];

export type CampaignConversionAnalyticsRow = {
  conversionEventId: string;
  conversionRecordId: string;
  sessionId: string;
  occurredAt: string;
  eventName: string;
  value?: number;
  currency?: string;
  orderId?: string;
  source: string;
  medium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  nodeId?: string;
  inputPortId?: string;
  outputPortId?: string;
  channelId?: string;
  assetId?: string;
  productId?: string;
  offerId?: string;
  targetType: string;
  targetId: string;
  attributionRule?: CampaignConversionAttributionRule;
  attributedInteractionEventId?: string;
  attributedInteractionType?: "exposure" | "click" | "session";
  attributedInteractionOccurredAt?: string;
  attributionWindowDays?: number;
  origin: CampaignConversionOrigin;
};

export type CampaignConversionAnalyticsSummary = {
  totalConversions: number;
  attributedConversions: number;
  unattributedConversions: number;
  totalValue: number;
  currencyBreakdown: Record<string, number>;
  eventNames: Record<string, number>;
};

export type CampaignAttributedConversionAnalyticsEntry = {
  record: CampaignConversionEventRecord;
  event?: CampaignConversionTrackingEvent;
  attributionMatch?: CampaignConversionAttributionMatch;
  attributedInteraction?: CampaignAnalyticsEventRecord;
};

export type CampaignAttributedConversionExportDestination = {
  id: string;
  provider: string;
  destinationId: string;
  label: string;
};

export type CampaignAttributedConversionExportEvent =
  CampaignConversionAnalyticsRow & {
    id: string;
    campaignId: string;
    quantity?: number;
    attributedClickId?: string;
    attributedSource?: string;
    attributedMedium?: string;
    attributedCampaign?: string;
    attributedContent?: string;
    attributedTerm?: string;
    attributedNodeId?: string;
    attributedOutputPortId?: string;
    attributedChannelId?: string;
    attributedAssetId?: string;
    attributedProductId?: string;
    attributedOfferId?: string;
    attributedTargetType?: string;
    attributedTargetId?: string;
    attributedHref?: string;
    attributedDestination?: string;
  };

export type CampaignAttributedConversionExport = {
  schemaVersion: "owncanvas.attributed-conversion-export.v1";
  campaignId: string;
  generatedAt: string;
  analyticsDestinations: CampaignAttributedConversionExportDestination[];
  measurementGoals: CampaignMeasurementGoal[];
  events: CampaignAttributedConversionExportEvent[];
};

export type CampaignAttributedConversionAnalytics = {
  schemaVersion: "owncanvas.campaign-conversion-analytics.v1";
  campaignId: string;
  generatedAt: string;
  summary: CampaignConversionAnalyticsSummary;
  rows: CampaignConversionAnalyticsRow[];
  conversions: CampaignAttributedConversionAnalyticsEntry[];
  export: CampaignAttributedConversionExport;
};

export type CampaignLandingPageImmersionMetricBreakdown = {
  samples: number;
  averagePercent: number;
  maxPercent: number;
};

export type CampaignLandingPageImmersionRate = {
  sessions: number;
  rate: number;
};

export type CampaignLandingPageImmersionAssetMetrics = {
  assetId: string;
  sessions: number;
  eventCount: number;
  watchDepth: CampaignLandingPageImmersionMetricBreakdown;
  completion: CampaignLandingPageImmersionRate;
  replay: CampaignLandingPageImmersionRate & {
    count: number;
  };
  interactionCount: number;
  interactionCounts: Record<string, number>;
};

export type CampaignLandingPageImmersionAnalyticsPage = {
  pageId: string;
  sessions: number;
  eventCount: number;
  watchDepth: CampaignLandingPageImmersionMetricBreakdown;
  completionRate: number;
  completedSessions: number;
  replayRate: number;
  replaySessions: number;
  replayCount: number;
  interactionCount: number;
  interactionCounts: Record<string, number>;
  playbackInteractionCount: number;
  scrollInteractionCount: number;
  assets: CampaignLandingPageImmersionAssetMetrics[];
};

export type CampaignLandingPageImmersionAnalytics = {
  schemaVersion: "owncanvas.campaign-landing-immersion-analytics.v1";
  campaignId: string;
  generatedAt: string;
  summary: {
    pages: number;
    sessions: number;
    eventCount: number;
    averageWatchDepthPercent: number;
    maxWatchDepthPercent: number;
    completionRate: number;
    replayRate: number;
    interactionCount: number;
    interactionCounts: Record<string, number>;
  };
  pages: CampaignLandingPageImmersionAnalyticsPage[];
};

type CampaignLandingPageImmersionRecord = CampaignAnalyticsEventRecord & {
  event: CampaignEngagementTrackingEvent;
};

export type CampaignConversionPriorInteractionQuery = {
  attributionWindowDays?: number;
};

export type CampaignConversionPriorInteractionResult = {
  attributionWindowDays: number;
  windowStartsAt: string;
  conversionOccurredAt: string;
  interactions: CampaignAnalyticsEventRecord[];
  sessions: CampaignTrackedSession[];
  attributionMatch?: CampaignConversionAttributionMatch;
};

export type CampaignAnalyticsEventStore = {
  schemaVersion: "owncanvas.campaign-analytics.v1";
  events: CampaignAnalyticsEventRecord[];
  purchaseConversions: CampaignPurchaseConversionEventRecord[];
  indexes: {
    byCampaignId: Record<string, string[]>;
    bySessionId: Record<string, string[]>;
    byCampaignSession: Record<string, string[]>;
    byClickId: Record<string, string[]>;
    byPageId: Record<string, string[]>;
    byAssetId: Record<string, string[]>;
    byCampaignPage: Record<string, string[]>;
    byCampaignAsset: Record<string, string[]>;
  };
};

export type CampaignTrackingEventSchemaProperty = {
  key: string;
  dataType: "string" | "timestamp" | "object";
  required: boolean;
  description: string;
};

export type CampaignTrackingEventSchema = {
  schemaVersion: "owncanvas.tracking-event-schema.v1";
  eventSchemaVersion: CampaignTrackingEventSchemaVersion;
  eventType: CampaignTrackingEventType;
  required: readonly string[];
  properties: readonly CampaignTrackingEventSchemaProperty[];
};

const CAMPAIGN_TRACKING_EVENT_BASE_SCHEMA_PROPERTIES = [
  {
    key: "schemaVersion",
    dataType: "string",
    required: true,
    description: "Tracking event schema version.",
  },
  {
    key: "id",
    dataType: "string",
    required: true,
    description: "Unique event identifier.",
  },
  {
    key: "campaignId",
    dataType: "string",
    required: true,
    description: "Campaign that owns the exposure or click.",
  },
  {
    key: "sessionId",
    dataType: "string",
    required: true,
    description: "Visitor session used for funnel attribution.",
  },
  {
    key: "context",
    dataType: "object",
    required: true,
    description: "Human or agent actor context for the event.",
  },
  {
    key: "occurredAt",
    dataType: "timestamp",
    required: true,
    description: "Timestamp when the event occurred.",
  },
  {
    key: "content",
    dataType: "object",
    required: true,
    description:
      "Content, asset, product, offer, and channel metadata for attribution.",
  },
  {
    key: "utm",
    dataType: "object",
    required: true,
    description: "UTM source, medium, campaign, content, and term metadata.",
  },
  {
    key: "target",
    dataType: "object",
    required: true,
    description: "Canvas, channel, asset, product, offer, or landing target metadata.",
  },
] as const satisfies readonly CampaignTrackingEventSchemaProperty[];

export const CAMPAIGN_EXPOSURE_EVENT_SCHEMA = {
  schemaVersion: "owncanvas.tracking-event-schema.v1",
  eventSchemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  eventType: "exposure",
  required: [
    "schemaVersion",
    "id",
    "campaignId",
    "sessionId",
    "context",
    "occurredAt",
    "content",
    "utm",
    "target",
    "exposure",
  ],
  properties: [
    ...CAMPAIGN_TRACKING_EVENT_BASE_SCHEMA_PROPERTIES,
    {
      key: "exposure",
      dataType: "object",
      required: true,
      description: "Exposure surface, placement, and optional view identifier.",
    },
  ],
} as const satisfies CampaignTrackingEventSchema;

export const CAMPAIGN_CLICK_EVENT_SCHEMA = {
  schemaVersion: "owncanvas.tracking-event-schema.v1",
  eventSchemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  eventType: "click",
  required: [
    "schemaVersion",
    "id",
    "campaignId",
    "sessionId",
    "context",
    "occurredAt",
    "content",
    "utm",
    "target",
    "click",
  ],
  properties: [
    ...CAMPAIGN_TRACKING_EVENT_BASE_SCHEMA_PROPERTIES,
    {
      key: "click",
      dataType: "object",
      required: true,
      description: "Click destination URL plus optional label and destination metadata.",
    },
  ],
} as const satisfies CampaignTrackingEventSchema;

export const CAMPAIGN_CONVERSION_EVENT_SCHEMA = {
  schemaVersion: "owncanvas.tracking-event-schema.v1",
  eventSchemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  eventType: "conversion",
  required: [
    "schemaVersion",
    "id",
    "campaignId",
    "sessionId",
    "context",
    "occurredAt",
    "content",
    "utm",
    "target",
    "conversion",
  ],
  properties: [
    ...CAMPAIGN_TRACKING_EVENT_BASE_SCHEMA_PROPERTIES,
    {
      key: "conversion",
      dataType: "object",
      required: true,
      description:
        "Final conversion event name plus optional value, currency, order, quantity, and metadata.",
    },
  ],
} as const satisfies CampaignTrackingEventSchema;

export const CAMPAIGN_ENGAGEMENT_EVENT_SCHEMA = {
  schemaVersion: "owncanvas.tracking-event-schema.v1",
  eventSchemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  eventType: "engagement",
  required: [
    "schemaVersion",
    "id",
    "campaignId",
    "sessionId",
    "context",
    "occurredAt",
    "content",
    "utm",
    "target",
    "engagement",
  ],
  properties: [
    ...CAMPAIGN_TRACKING_EVENT_BASE_SCHEMA_PROPERTIES,
    {
      key: "engagement",
      dataType: "object",
      required: true,
      description:
        "Short-form playback or scroll engagement kind, action, value, unit, and metadata.",
    },
  ],
} as const satisfies CampaignTrackingEventSchema;

export const CAMPAIGN_REVISIT_EVENT_SCHEMA = {
  schemaVersion: "owncanvas.tracking-event-schema.v1",
  eventSchemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  eventType: "revisit",
  required: [
    "schemaVersion",
    "id",
    "campaignId",
    "sessionId",
    "context",
    "occurredAt",
    "content",
    "utm",
    "target",
    "revisit",
  ],
  properties: [
    ...CAMPAIGN_TRACKING_EVENT_BASE_SCHEMA_PROPERTIES,
    {
      key: "revisit",
      dataType: "object",
      required: true,
      description:
        "Returning session or user attribution match timestamps and match reasons.",
    },
  ],
} as const satisfies CampaignTrackingEventSchema;

export type CampaignTracking = {
  utm: CampaignUtmTracking;
  attributionParameters: CampaignAttributionParameter[];
  pixelEvents: CampaignPixelEvent[];
  analyticsDestinations: CampaignAnalyticsDestination[];
  analytics: string[];
  events: string[];
  conversions: string[];
  evaluation: CampaignEvaluationModel;
  measurementGoals: CampaignMeasurementGoal[];
  metrics: CampaignMeasurementMetric[];
  measurementCycles?: CampaignMeasurementCycle[];
  improvementActions?: CampaignImprovementAction[];
  eventLog?: CampaignTrackingEvent[];
  conversionRecords?: CampaignConversionEventRecord[];
  revisitRecords?: CampaignRevisitEventRecord[];
  sessions?: CampaignTrackedSession[];
  attribution: {
    model: CampaignAttributionModel;
    touchpoints: string[];
  };
};

export type CampaignInboundSession = {
  url: string;
  campaignId: string;
  sessionId?: string;
  userId?: string;
  channelId?: string;
  touchpointId?: string;
  utm: CampaignUtmTracking;
  attributionParameters: CampaignAttributionParameter[];
};

export type CampaignInboundSessionParseOptions = {
  campaignId?: string;
};

export type CampaignReturningAttributionIdentifierInput = {
  sessionId?: string;
  userId?: string;
  clickId?: string;
  attributionParameters?: CampaignAttributionParameter[];
};

export type CampaignReturningAttributionMatch = {
  type: "session" | "user" | "click" | "attribution_parameter";
  identifier: string;
  key?: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type CampaignReturningAttributionResult = {
  campaignId: string;
  returning: boolean;
  matches: CampaignReturningAttributionMatch[];
};

export type CampaignInboundSessionValidationErrorCode =
  | "inbound-session.url_invalid"
  | "inbound-session.utm_source_required"
  | "inbound-session.utm_medium_required"
  | "inbound-session.utm_campaign_required"
  | "inbound-session.campaign_mismatch";

export type CampaignInboundSessionValidationError = {
  code: CampaignInboundSessionValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignInboundSessionValidationResult = {
  ok: boolean;
  errors: CampaignInboundSessionValidationError[];
};

export type CampaignInboundSessionParseResult =
  | {
      ok: true;
      session: CampaignInboundSession;
      errors: [];
    }
  | {
      ok: false;
      session: CampaignInboundSession;
      errors: CampaignInboundSessionValidationError[];
    };

export type CampaignWorkflowEventSchemaVersion = "owncanvas.workflow-event.v1";

export type CampaignWorkflowEventType = "instagram.comment.created";

export type CampaignWorkflowEvent = {
  schemaVersion: CampaignWorkflowEventSchemaVersion;
  id: string;
  campaignId: string;
  type: CampaignWorkflowEventType;
  occurredAt: string;
  ingestedAt: string;
  source: {
    pluginId: string;
    capabilityId: string;
    channel: "instagram";
    trigger: "comment";
    providerEventId: string;
    accountId: string;
    mediaId: string;
    commentId: string;
    permalink?: string;
  };
  subject: {
    type: "instagram.comment";
    id: string;
    parentId?: string;
    text: string;
    actor: {
      id: string;
      username?: string;
    };
  };
  workflow: {
    sourceNodeId?: string;
    outputPort: string;
    targetNodeId?: string;
    targetInputPort?: string;
  };
  attribution: CampaignUtmTracking & {
    touchpoint: "instagram.comment";
  };
  payload: {
    schemaVersion: typeof INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION;
    event: {
      accountId: string;
      mediaId: string;
      commentId: string;
      commenterId: string;
      commenterUsername?: string;
      text: string;
    };
  };
  metadata?: Record<string, unknown>;
};

export type CampaignWorkflowEventIngestionErrorCode =
  | "workflow-event.campaign_mismatch";

export type CampaignWorkflowEventIngestionError = {
  code:
    | CampaignWorkflowEventIngestionErrorCode
    | ReturnType<typeof validateInstagramCommentTriggerEvent>["errors"][number]["code"];
  path: string;
  message: string;
};

export type InstagramCommentWorkflowIngestionOptions = {
  pluginId?: string;
  capabilityId?: string;
  sourceNodeId?: string;
  outputPort?: string;
  targetNodeId?: string;
  targetInputPort?: string;
  now?: () => string;
};

export type InstagramCommentWorkflowIngestionResult =
  | {
      ok: true;
      campaign: CampaignDraft;
      event: CampaignWorkflowEvent;
      errors: [];
    }
  | {
      ok: false;
      campaign: CampaignDraft;
      errors: CampaignWorkflowEventIngestionError[];
    };

export type CampaignTrackingInput = Partial<
  Omit<CampaignTracking, "utm" | "attribution">
> & {
  utm?: Partial<CampaignUtmTracking>;
  attribution?: Partial<CampaignTracking["attribution"]>;
};

export type CampaignTrackingValidationErrorCode =
  | "tracking.attribution_parameter_key_required"
  | "tracking.attribution_parameter_value_required"
  | "tracking.attribution_parameter_source_required"
  | "tracking.pixel_event_id_required"
  | "tracking.pixel_event_id_duplicate"
  | "tracking.pixel_provider_required"
  | "tracking.pixel_id_required"
  | "tracking.pixel_event_name_required"
  | "tracking.analytics_destination_id_required"
  | "tracking.analytics_destination_id_duplicate"
  | "tracking.analytics_provider_required"
  | "tracking.analytics_destination_identifier_required"
  | "tracking.analytics_destination_label_required"
  | "tracking.event_name_required"
  | "tracking.conversion_event_required"
  | "tracking.attribution_touchpoint_required";

export type CampaignTrackingValidationError = {
  code: CampaignTrackingValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignTrackingValidationResult = {
  valid: boolean;
  errors: CampaignTrackingValidationError[];
};

export type CampaignTrackingEventValidationErrorCode =
  | "tracking_event.object_required"
  | "tracking_event.schema_version_invalid"
  | "tracking_event.type_required"
  | "tracking_event.type_unsupported"
  | "tracking_event.id_required"
  | "tracking_event.campaign_id_required"
  | "tracking_event.session_id_required"
  | "tracking_event.context_required"
  | "tracking_event.context_actor_invalid"
  | "tracking_event.context_user_id_required"
  | "tracking_event.context_agent_id_required"
  | "tracking_event.occurred_at_invalid"
  | "tracking_event.content_required"
  | "tracking_event.content_type_required"
  | "tracking_event.content_id_required"
  | "tracking_event.utm_required"
  | "tracking_event.utm_source_required"
  | "tracking_event.utm_medium_required"
  | "tracking_event.utm_campaign_required"
  | "tracking_event.target_required"
  | "tracking_event.target_type_required"
  | "tracking_event.target_id_required"
  | "tracking_event.target_metadata_required"
  | "tracking_event.target_url_invalid"
  | "tracking_event.content_channel_unknown"
  | "tracking_event.content_asset_unknown"
  | "tracking_event.content_product_mismatch"
  | "tracking_event.content_offer_mismatch"
  | "tracking_event.utm_source_mismatch"
  | "tracking_event.utm_medium_mismatch"
  | "tracking_event.utm_campaign_mismatch"
  | "tracking_event.utm_content_mismatch"
  | "tracking_event.exposure_required"
  | "tracking_event.exposure_surface_required"
  | "tracking_event.exposure_placement_required"
  | "tracking_event.click_required"
  | "tracking_event.click_href_invalid"
  | "tracking_event.conversion_required"
  | "tracking_event.conversion_event_name_required"
  | "tracking_event.conversion_value_invalid"
  | "tracking_event.conversion_currency_invalid"
  | "tracking_event.conversion_quantity_invalid"
  | "tracking_event.purchase_user_id_required"
  | "tracking_event.purchase_order_id_required"
  | "tracking_event.purchase_node_id_required"
  | "tracking_event.purchase_input_port_id_required"
  | "tracking_event.purchase_channel_id_required"
  | "tracking_event.purchase_product_id_required"
  | "tracking_event.purchase_offer_id_required"
  | "tracking_event.engagement_required"
  | "tracking_event.engagement_kind_invalid"
  | "tracking_event.engagement_action_required"
  | "tracking_event.engagement_value_invalid"
  | "tracking_event.engagement_unit_invalid"
  | "tracking_event.revisit_required"
  | "tracking_event.revisit_first_seen_at_invalid"
  | "tracking_event.revisit_last_seen_at_invalid"
  | "tracking_event.revisit_match_required";

export type CampaignTrackingEventValidationError = {
  code: CampaignTrackingEventValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignTrackingEventValidationResult =
  | {
      valid: true;
      event: CampaignTrackingEvent;
      errors: [];
    }
  | {
      valid: false;
      event: null;
      errors: CampaignTrackingEventValidationError[];
    };

export type CampaignMeasurementReportingTimeframe = {
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export type CampaignEvaluationSuccessMetric = {
  id: string;
  metric: string;
  eventName: string;
  unit: string;
  priority: "primary" | "secondary";
  optimizationDirection: "increase" | "decrease";
  attributionRole: "final_conversion" | "assist";
  description: string;
};

export type CampaignEvaluationModel = {
  schemaVersion: "owncanvas.campaign-evaluation.v1";
  primarySuccessMetric: CampaignEvaluationSuccessMetric;
  secondaryMetrics: CampaignEvaluationSuccessMetric[];
};

export type CampaignMeasurementGoal = {
  id: string;
  name: string;
  target: number | null;
  unit: string;
  successCriteria: string;
  reportingTimeframe: CampaignMeasurementReportingTimeframe;
};

export type CampaignMeasurementGoalInput = {
  id?: string;
  name: string;
  target?: number | null;
  unit: string;
  successCriteria: string;
  reportingTimeframe: Partial<CampaignMeasurementReportingTimeframe> &
    Pick<CampaignMeasurementReportingTimeframe, "startsAt" | "endsAt">;
};

export type CampaignMeasurementGoalEditInput = Partial<
  Omit<CampaignMeasurementGoal, "id" | "reportingTimeframe">
> & {
  reportingTimeframe?: Partial<CampaignMeasurementReportingTimeframe>;
};

export type CampaignMeasurementGoalValidationErrorCode =
  | "measurement_goal.id_required"
  | "measurement_goal.id_duplicate"
  | "measurement_goal.name_required"
  | "measurement_goal.target_invalid"
  | "measurement_goal.unit_required"
  | "measurement_goal.success_criteria_required"
  | "measurement_goal.reporting_starts_at_required"
  | "measurement_goal.reporting_starts_at_invalid"
  | "measurement_goal.reporting_ends_at_required"
  | "measurement_goal.reporting_ends_at_invalid"
  | "measurement_goal.reporting_timezone_required";

export type CampaignMeasurementGoalValidationError = {
  code: CampaignMeasurementGoalValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignMeasurementGoalValidationResult = {
  valid: boolean;
  errors: CampaignMeasurementGoalValidationError[];
};

export type CampaignMeasurementMetric = {
  id: string;
  metric: string;
  value: number;
  unit: string;
  source: string;
  attributionTouchpoint: string;
  observedAt: string;
};

export type CampaignMeasurementCycle = {
  schemaVersion: "owncanvas.campaign-measurement-cycle.v1";
  id: string;
  status: "completed";
  goalIds: string[];
  startedAt: string;
  completedAt: string;
  resultCount: number;
  performanceResults: CampaignMeasurementMetric[];
  primaryResult?: CampaignMeasurementMetric;
};

export type CampaignMeasurementCycleCompletion = {
  schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1";
  hasCompletedMeasurementCycle: boolean;
  completedCycleCount: number;
  latestCompletedCycle?: CampaignMeasurementCycle;
};

export type CampaignImprovementAction = {
  schemaVersion: "owncanvas.campaign-improvement-action.v1";
  id: string;
  status: "proposed" | "accepted" | "completed";
  priority: "high" | "medium" | "low";
  actionType: "optimize_conversion_path" | "scale_winning_path";
  sourceMeasurementCycleId: string;
  goalIds: string[];
  metric: string;
  observedValue: number;
  targetValue: number | null;
  unit: string;
  recommendation: string;
  rationale: string;
  createdAt: string;
  measurementResultUsage?: CampaignMeasurementResultUsage;
};

export type CampaignMeasurementResultUsage = {
  schemaVersion: "owncanvas.campaign-measurement-result-usage.v1";
  usedAt: string;
  usedMetricIds: string[];
  appliedChange: string;
};

export type CampaignMeasurementBasedImprovementStatus = {
  schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1";
  state: "pending" | "proposed" | "completed";
  hasCompletedMeasurementBasedImprovementCycle: boolean;
  completedImprovementCycleCount: number;
  latestCompletedMeasurementCycleId?: string;
  latestCompletedImprovementActionId?: string;
  completedAt?: string;
};

export type CampaignMeasurementMetricInput = {
  id?: string;
  metric: string;
  value: number;
  unit: string;
  source: string;
  attributionTouchpoint: string;
  observedAt: string;
};

export type CampaignMeasurementMetricValidationErrorCode =
  | "measurement_metric.id_required"
  | "measurement_metric.id_duplicate"
  | "measurement_metric.metric_required"
  | "measurement_metric.value_invalid"
  | "measurement_metric.unit_required"
  | "measurement_metric.source_required"
  | "measurement_metric.attribution_touchpoint_required"
  | "measurement_metric.observed_at_required"
  | "measurement_metric.observed_at_invalid";

export type CampaignMeasurementMetricValidationError = {
  code: CampaignMeasurementMetricValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignMeasurementMetricValidationResult = {
  valid: boolean;
  errors: CampaignMeasurementMetricValidationError[];
};

export type CampaignCompletionValidationError = {
  code:
    | "campaign_completion.measurement_criteria_required"
    | "campaign_completion.measurement_record_required"
    | "campaign_completion.improvement_record_required"
    | "campaign_completion.improvement_criteria_required";
  path: string;
  message: string;
};

export type CampaignCompletionValidationResult = {
  valid: boolean;
  errors: CampaignCompletionValidationError[];
};

export type CampaignCompletionActionState = {
  measurementCycleCompletion: CampaignMeasurementCycleCompletion;
  improvementStatus: CampaignMeasurementBasedImprovementStatus;
};

export class CampaignCompletionActionError extends Error {
  readonly reasons: CampaignCompletionValidationError[];
  readonly completionState: CampaignCompletionActionState;

  constructor(input: {
    reasons: CampaignCompletionValidationError[];
    completionState: CampaignCompletionActionState;
  }) {
    super(
      `Invalid campaign completion: ${input.reasons
        .map((error) => error.code)
        .join(", ")}`,
    );
    this.name = "CampaignCompletionActionError";
    this.reasons = input.reasons;
    this.completionState = input.completionState;
  }
}

export type CampaignPublishingChannelType =
  | "social"
  | "direct-message"
  | "landing"
  | "email"
  | "paid-ad"
  | "custom";

export type CampaignPublishingStatus =
  | "draft"
  | "configured"
  | "scheduled"
  | "published"
  | "paused";

export type CampaignPublishingSchedule = {
  mode: "manual" | "scheduled" | "recurring";
  startsAt: string;
  timezone: string;
};

export type CampaignPublishingTracking = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  conversionEvent: string;
};

export type CampaignPublishedLinkOwncanvasParameters = {
  campaignId: string;
  channelId: string;
  responderId: string;
  messageId: string;
  conversionEvent: string;
};

export type CampaignPublishedLink = {
  id: string;
  channelId: string;
  destinationUrl: string;
  publishedUrl: string;
  utm: CampaignUtmTracking;
  owncanvasParameters: CampaignPublishedLinkOwncanvasParameters;
  attributionParameters: CampaignAttributionParameter[];
  publishedAt: string;
};

export type CampaignPublishingChannel = {
  id: string;
  type: CampaignPublishingChannelType;
  platform: string;
  label: string;
  providerPluginId: string;
  account: {
    id: string;
    handle: string;
  };
  placement: string;
  destinationUrl: string;
  landingPageId: string;
  schedule: CampaignPublishingSchedule;
  tracking: CampaignPublishingTracking;
  publishedLinks: CampaignPublishedLink[];
  status: CampaignPublishingStatus;
};

export type CampaignPublishingChannelSummary = Pick<
  CampaignPublishingChannel,
  | "id"
  | "type"
  | "platform"
  | "label"
  | "providerPluginId"
  | "placement"
  | "destinationUrl"
  | "landingPageId"
  | "status"
> & {
  accountHandle: string;
  scheduleMode: CampaignPublishingSchedule["mode"];
  startsAt: string;
  timezone: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  conversionEvent: string;
};

export type CampaignDestinationUrlContext = {
  responderId: string;
  messageId: string;
};

export type CampaignUtmGenerationCampaignContext = Pick<
  CampaignDraft,
  "id" | "tracking"
> &
  Partial<Pick<CampaignDraft, "title" | "objective">>;

export type CampaignPublishedLinkContext = CampaignDestinationUrlContext & {
  id?: string;
  publishedAt?: string;
};

export const CAMPAIGN_PUBLISHING_CHANNEL_FIELDS = [
  "id",
  "type",
  "platform",
  "label",
  "providerPluginId",
  "account",
  "placement",
  "destinationUrl",
  "landingPageId",
  "schedule",
  "tracking",
  "publishedLinks",
  "status",
] as const satisfies readonly (keyof CampaignPublishingChannel)[];

export type CampaignPublishingChannelField =
  (typeof CAMPAIGN_PUBLISHING_CHANNEL_FIELDS)[number];

export type CampaignPublishingChannelInput = {
  id?: string;
  type: CampaignPublishingChannelType;
  platform: string;
  label: string;
  providerPluginId?: string;
  account?: Partial<CampaignPublishingChannel["account"]>;
  placement: string;
  destinationUrl: string;
  landingPageId?: string;
  schedule?: Partial<CampaignPublishingSchedule>;
  tracking: Partial<CampaignPublishingTracking> &
    Pick<
      CampaignPublishingTracking,
      "utmSource" | "utmMedium" | "utmCampaign" | "conversionEvent"
    >;
  publishedLinks?: CampaignPublishedLink[];
  status?: CampaignPublishingStatus;
};

export type CampaignPublishingValidationErrorCode =
  | "channel.id_required"
  | "channel.platform_required"
  | "channel.label_required"
  | "channel.provider_plugin_id_required"
  | "channel.account_id_required"
  | "channel.account_handle_required"
  | "channel.placement_required"
  | "channel.destination_url_required"
  | "channel.destination_url_invalid"
  | "channel.landing_page_id_required"
  | "channel.schedule_starts_at_required"
  | "channel.schedule_starts_at_invalid"
  | "channel.schedule_timezone_required"
  | "channel.utm_source_required"
  | "channel.utm_medium_required"
  | "channel.utm_campaign_required"
  | "channel.conversion_event_required"
  | "channel.published_link_id_required"
  | "channel.published_link_id_duplicate"
  | "channel.published_link_channel_id_mismatch"
  | "channel.published_link_destination_url_invalid"
  | "channel.published_link_url_invalid"
  | "channel.published_link_utm_source_required"
  | "channel.published_link_utm_medium_required"
  | "channel.published_link_utm_campaign_required"
  | "channel.published_link_published_at_required"
  | "channel.published_link_published_at_invalid"
  | "channel.id_duplicate";

export type CampaignPublishingValidationError = {
  code: CampaignPublishingValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignPublishingValidationResult = {
  valid: boolean;
  errors: CampaignPublishingValidationError[];
};

export type CampaignPluginActivationState = Extract<
  PluginLifecycleState,
  "installed" | "configured" | "active" | "inactive"
>;

export type CampaignWorkflowPluginConfiguration = {
  pluginId: string;
  type: PluginType;
  lifecycleState: CampaignPluginActivationState;
  permissionMode: PluginPermissionMode;
  capabilityIds: string[];
  configuration: {
    values: Record<string, unknown>;
    secretRefs: Record<string, string>;
    updatedAt?: string;
  };
  installedBy: PluginActor;
  configuredBy?: PluginActor;
  activatedBy?: PluginActor;
  installedAt: string;
  configuredAt?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  updatedAt: string;
};

export const CAMPAIGN_STORAGE_KEY = "owncanvas.campaigns.v1";

export const CAMPAIGN_WORKSPACE_STORAGE_KEY = "owncanvas.workspace.v1";

export const CAMPAIGN_ANALYTICS_STORAGE_KEY = "owncanvas.campaign-analytics.v1";
export const DEFAULT_CAMPAIGN_ATTRIBUTION_WINDOW_DAYS = 7;

export type CampaignWorkspaceState = {
  schemaVersion: "owncanvas.workspace.v1";
  id: string;
  campaignId: string;
  mode: "basic" | "advanced";
  activeTool: "select" | "hand" | "comment";
  canvas: {
    nodes: CampaignCanvasBlock[];
    edges: CampaignCanvasEdge[];
    viewport: {
      x: number;
      y: number;
      zoom: number;
    };
    selectedNodeIds: string[];
    selectedEdgeIds: string[];
  };
  initializedAt: string;
  updatedAt: string;
};

export type CampaignWorkspaceLink = {
  storageKey: typeof CAMPAIGN_WORKSPACE_STORAGE_KEY;
  workspaceId: string;
  initializedAt: string;
};

export type CampaignStatus = "draft" | "completed";

export type CampaignDraft = {
  schemaVersion: CampaignSchemaVersion;
  id: string;
  title: string;
  objective: string;
  targetAudience: CampaignTargetAudience;
  productOffer: CampaignProductOffer;
  campaignSpec: {
    nodes: CampaignCanvasBlock[];
    edges: CampaignCanvasEdge[];
    assetGenerationJobs: CampaignAssetGenerationJob[];
    assetGenerationWorkflowState?: CampaignAssetGenerationWorkflowState;
    assetGenerationExecutions?: CampaignAssetGenerationExecutionRecord[];
    workflowEvents?: CampaignWorkflowEvent[];
    landingPageBehavior?: CampaignLandingPageBehaviorConfiguration;
    landingPageNavigation?: CampaignLandingPageNavigationConfiguration;
    landingPageConversionElements?: CampaignLandingPageConversionElementConfiguration[];
    landingPageTemplate?: CampaignLandingPageTemplateSchema;
  };
  canvasState: {
    nodes: CampaignCanvasBlock[];
    edges: CampaignCanvasEdge[];
  };
  plugins: CampaignWorkflowPluginConfiguration[];
  assets: CampaignAsset[];
  channels: CampaignPublishingChannel[];
  tracking: CampaignTracking;
  logs: string[];
  versions: string[];
  status: CampaignStatus;
};

export type CampaignSpec = CampaignDraft["campaignSpec"];

export type CampaignRecord = CampaignDraft & {
  workspaceState: CampaignWorkspaceLink;
  createdAt: string;
  updatedAt: string;
};

export type CampaignCanvasEdit = {
  nodes: CampaignCanvasBlock[];
  edges: CampaignCanvasEdge[];
};

export type CampaignCanvasActionBlock = Omit<
  CampaignCanvasBlock,
  "contracts"
> & {
  contracts: readonly GenerationBlockContract[];
};

export type CampaignCanvasEditAction =
  | {
      type: "canvas.node.create";
      node: CampaignCanvasActionBlock;
    }
  | {
      type: "canvas.node.update";
      nodeId: string;
      patch: Partial<
        Pick<
          CampaignCanvasBlock,
          | "title"
          | "subtitle"
          | "description"
          | "tone"
          | "status"
          | "position"
          | "label"
          | "properties"
        >
      > & {
        contracts?: readonly GenerationBlockContract[];
      };
    }
  | {
      type: "canvas.node.delete";
      nodeId: string;
    }
  | {
      type: "canvas.node.reorder";
      nodeIds: readonly string[];
    }
  | {
      type: "canvas.edge.connect";
      edge: CampaignCanvasEdge & {
        sourcePort: string;
        targetPort: string;
      };
    }
  | {
      type: "canvas.edge.disconnect";
      edgeId: string;
    }
  | {
      type: "campaign.landing.behavior.set";
      mode: CampaignLandingPageBehaviorMode;
    };

export type CampaignCanvasEditValidationErrorCode =
  | "canvas.nodes_required"
  | "canvas.edges_required"
  | "canvas.node_id_required"
  | "canvas.node_id_duplicate"
  | "canvas.node_kind_invalid"
  | "canvas.node_position_invalid"
  | "canvas.edge_id_required"
  | "canvas.edge_id_duplicate"
  | "canvas.edge_source_required"
  | "canvas.edge_target_required"
  | "canvas.edge_source_missing"
  | "canvas.edge_target_missing";

export type CampaignCanvasEditValidationError = {
  code: CampaignCanvasEditValidationErrorCode;
  path: string;
  message: string;
};

export type CampaignCanvasEditValidationResult = {
  valid: boolean;
  errors: CampaignCanvasEditValidationError[];
};

export type CampaignSpecJsonEditValidationError =
  | {
      code: "campaign_spec.json_invalid";
      path: "campaignSpec";
      message: string;
    }
  | {
      code: "campaign_spec.json_incomplete";
      path: "campaignSpec";
      message: string;
    }
  | CampaignCanvasEditValidationError
  | CampaignAssetGenerationValidationError
  | CampaignLandingPageTemplateValidationError;

export type CampaignSpecJsonEditResult =
  | {
      valid: true;
      campaign: CampaignDraft;
      structuralEdits: CampaignCanvasStructuralEdit[];
      errors: [];
    }
  | {
      valid: false;
      campaign: CampaignDraft;
      errors: CampaignSpecJsonEditValidationError[];
    };

export type CampaignSpecJsonEditOptions = {
  commit?: boolean;
};

export type CampaignCanvasStructuralEdit =
  | {
      type: "canvas.node.update";
      nodeId: string;
    }
  | {
      type: "canvas.node.delete";
      nodeId: string;
    }
  | {
      type: "canvas.node.create";
      nodeId: string;
    }
  | {
      type: "canvas.node.reorder";
      nodeIds: string[];
    }
  | {
      type: "canvas.edge.connect";
      edgeId: string;
    }
  | {
      type: "canvas.edge.disconnect";
      edgeId: string;
    };

export type CreateBlankCampaignRecordOptions = {
  id?: string;
  now?: () => string;
};

export type UpdateCampaignRecordOptions = {
  now?: () => string;
};

export type CreateCampaignWorkflowPluginConfigurationInput = {
  pluginId: string;
  type: PluginType;
  lifecycleState?: CampaignPluginActivationState;
  permissionMode: PluginPermissionMode;
  capabilityIds?: string[];
  configuration?: {
    values?: Record<string, unknown>;
    secretRefs?: Record<string, string>;
  };
  installedBy: PluginActor;
  configuredBy?: PluginActor;
  activatedBy?: PluginActor;
  installedAt?: string;
  configuredAt?: string;
  activatedAt?: string;
  deactivatedAt?: string;
};

export type SetCampaignWorkflowPluginActivationOptions = {
  active: boolean;
  actor: PluginActor;
  catalog?: PluginCatalog;
  now?: () => string;
};

export type AgentWorkflowRuntimeErrorCode =
  | "runtime.plugin_manifest_not_found"
  | "runtime.plugin_type_mismatch"
  | "runtime.permission_mode_blocked"
  | "runtime.plugin_not_usable"
  | "runtime.capability_not_found";

export type AgentWorkflowRuntimeError = {
  code: AgentWorkflowRuntimeErrorCode;
  message: string;
  pluginId: string;
  path: string;
};

export type AgentWorkflowRuntimeCapability = {
  id: string;
  kind: PluginCapability["kind"];
  title: string;
  description: string;
  inputPorts: PluginCapability["inputPorts"];
  outputPorts: PluginCapability["outputPorts"];
  supportsParallel: boolean;
  supportsBulk: boolean;
  maxParallel?: number;
};

export type AgentWorkflowRuntimePlugin = {
  pluginId: string;
  manifestId: string;
  name: string;
  displayName: string;
  type: PluginType;
  originKind: PluginOrigin["kind"];
  permissionMode: PluginPermissionMode;
  requiresApprovalFor: readonly PluginApprovalRequirement[];
  activatedBy?: PluginActor;
  activatedAt?: string;
  configuration: CampaignWorkflowPluginConfiguration["configuration"];
  capabilities: AgentWorkflowRuntimeCapability[];
};

export type AgentWorkflowRuntime = {
  campaignId: string;
  mode: PluginPermissionMode;
  loadedAt: string;
  plugins: AgentWorkflowRuntimePlugin[];
  errors: AgentWorkflowRuntimeError[];
};

export type LoadAgentWorkflowRuntimeOptions = {
  mode?: PluginPermissionMode;
  now?: () => string;
};

export type CampaignAssetGenerationWorkflow = {
  campaignId: CampaignDraft["id"];
  jobs: CampaignAssetGenerationJob[];
  imageJobs: CampaignAssetGenerationJob[];
  videoJobs: CampaignAssetGenerationJob[];
};

export type CampaignAssetGenerationExecutorContext = {
  campaignId: CampaignDraft["id"];
  actor: CampaignExecutionActor;
  startedAt: string;
  reportProgress: (progress: number) => void;
};

export type CampaignAssetGenerationExecutor = (
  job: CampaignAssetGenerationJob,
  context: CampaignAssetGenerationExecutorContext,
) =>
  | CampaignAssetGenerationResultMetadata[]
  | Promise<CampaignAssetGenerationResultMetadata[]>;

export type CampaignImageAssetGenerationExecutorContext =
  CampaignAssetGenerationExecutorContext;

export type CampaignImageAssetGenerationExecutor =
  CampaignAssetGenerationExecutor;

export type CampaignVideoAssetGenerationExecutorContext =
  CampaignAssetGenerationExecutorContext;

export type CampaignVideoAssetGenerationExecutor =
  CampaignAssetGenerationExecutor;

export type CampaignAssetGenerationExecutionOptions = {
  actor?: CampaignExecutionActor;
  maxConcurrency?: number;
  maxAttempts?: number;
  now?: () => string;
};

export type CampaignImageAssetGenerationExecutionOptions =
  CampaignAssetGenerationExecutionOptions;

export type CampaignVideoAssetGenerationExecutionOptions =
  CampaignAssetGenerationExecutionOptions;

export type CampaignAssetGenerationExecutionStatus =
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type CampaignAssetGenerationJobStatusSnapshot = {
  jobId: CampaignAssetGenerationJob["id"];
  mediaType: CampaignAssetGenerationMediaType;
  executionStatus: CampaignAssetGenerationExecutionStatus;
  jobStatus: CampaignAssetGenerationJobStatus;
  actor: CampaignExecutionActor;
  attempt: number;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  error: string | null;
  failureDetails?: CampaignAssetGenerationFailureDetails | null;
};

export type CampaignAssetGenerationExecutionStatusEvent = {
  status: CampaignAssetGenerationExecutionStatus;
  jobStatus: CampaignAssetGenerationJobStatus;
  progress: number;
  observedAt: string;
  error: string | null;
  failureDetails?: CampaignAssetGenerationFailureDetails | null;
};

export type CampaignAssetGenerationExecutionRecord = {
  id: string;
  campaignId: CampaignDraft["id"];
  jobId: CampaignAssetGenerationJob["id"];
  mediaType: CampaignAssetGenerationMediaType;
  providerPluginId: string;
  capabilityId: string;
  status: CampaignAssetGenerationExecutionStatus;
  jobStatus: CampaignAssetGenerationJobStatus;
  actor: CampaignExecutionActor;
  attempt: number;
  progress: number;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  canceledAt: string | null;
  error: string | null;
  failureDetails?: CampaignAssetGenerationFailureDetails | null;
  resultIds: string[];
  assetIds: string[];
  providerRequestIds: string[];
  outputs: CampaignAssetGenerationResultMetadata[];
  statusEvents: CampaignAssetGenerationExecutionStatusEvent[];
  createdAt: string;
  updatedAt: string;
};

export type CampaignAssetGenerationWorkflowStatus =
  | "empty"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "skipped";

export type CampaignAssetGenerationWorkflowOutput = {
  jobId: CampaignAssetGenerationJob["id"];
  mediaType: CampaignAssetGenerationMediaType;
  resultId: CampaignAssetGenerationResultMetadata["id"];
  assetId: CampaignAssetGenerationResultMetadata["assetId"];
  uri: CampaignAssetGenerationResultMetadata["uri"];
  mimeType: CampaignAssetGenerationResultMetadata["mimeType"];
  providerRequestId: CampaignAssetGenerationResultMetadata["providerRequestId"];
  generatedAt: CampaignAssetGenerationResultMetadata["generatedAt"];
  thumbnailUri?: CampaignAssetGenerationResultMetadata["thumbnailUri"];
};

export type CampaignAssetGenerationWorkflowError = {
  jobId: CampaignAssetGenerationJob["id"];
  mediaType: CampaignAssetGenerationMediaType;
  message: string;
  providerPluginId?: string;
  capabilityId?: string;
};

export type CampaignAssetGenerationWorkflowState = {
  status: CampaignAssetGenerationWorkflowStatus;
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  skippedJobs: number;
  finishedJobs: number;
  percentComplete: number;
  jobIds: CampaignAssetGenerationJob["id"][];
  completedJobIds: CampaignAssetGenerationJob["id"][];
  failedJobIds: CampaignAssetGenerationJob["id"][];
  skippedJobIds: CampaignAssetGenerationJob["id"][];
  assetIds: CampaignAssetGenerationResultMetadata["assetId"][];
  resultIds: CampaignAssetGenerationResultMetadata["id"][];
  providerRequestIds: CampaignAssetGenerationResultMetadata["providerRequestId"][];
  outputs: CampaignAssetGenerationWorkflowOutput[];
  errors: CampaignAssetGenerationWorkflowError[];
};

export type CampaignAssetGenerationExecutionResult = {
  campaignId: CampaignDraft["id"];
  jobs: CampaignAssetGenerationJob[];
  completedJobs: CampaignAssetGenerationJob[];
  failedJobs: CampaignAssetGenerationJob[];
  skippedJobs: CampaignAssetGenerationJob[];
  jobStatuses: CampaignAssetGenerationJobStatusSnapshot[];
  progressUpdates: CampaignAssetGenerationJobStatusSnapshot[];
  executionRecords: CampaignAssetGenerationExecutionRecord[];
};

export type CampaignImageAssetGenerationExecutionResult =
  CampaignAssetGenerationExecutionResult;

export type CampaignVideoAssetGenerationExecutionResult =
  CampaignAssetGenerationExecutionResult;

export type PersistCampaignImageAssetGenerationResultOptions = {
  now?: () => string;
  createdBy?: PluginActor;
  rightsOwner?: string;
  rightsLicense?: string;
};

export type PersistCampaignVideoAssetGenerationResultOptions =
  PersistCampaignImageAssetGenerationResultOptions;

export type PersistCampaignAssetGenerationResultOptions =
  PersistCampaignImageAssetGenerationResultOptions;

export type CampaignImageAssetGenerationWorkflowExecutionOptions =
  CampaignImageAssetGenerationExecutionOptions &
    PersistCampaignImageAssetGenerationResultOptions;

export type CampaignVideoAssetGenerationWorkflowExecutionOptions =
  CampaignVideoAssetGenerationExecutionOptions &
    PersistCampaignVideoAssetGenerationResultOptions;

export type CampaignImageAssetGenerationWorkflowExecutionResult<
  TCampaign extends CampaignDraft,
> = {
  campaign: TCampaign;
  executionResult: CampaignImageAssetGenerationExecutionResult;
};

export type CampaignVideoAssetGenerationWorkflowExecutionResult<
  TCampaign extends CampaignDraft,
> = {
  campaign: TCampaign;
  executionResult: CampaignVideoAssetGenerationExecutionResult;
};

export type CampaignAssetGenerationWorkflowExecutionOptions =
  CampaignAssetGenerationExecutionOptions &
    PersistCampaignAssetGenerationResultOptions;

export type CampaignAssetGenerationWorkflowExecutionResult<
  TCampaign extends CampaignDraft,
> = {
  campaign: TCampaign;
  executionResult: CampaignAssetGenerationExecutionResult;
};

export type GenerationPaletteItem = {
  kind: GenerationBlockKind;
  title: string;
  description: string;
  badge: string;
};

type GenerationBlockDefinition = Omit<
  CampaignCanvasBlock,
  "id" | "position"
>;

export const generationPalette = [
  {
    kind: "text",
    title: "Text Block",
    description: "Briefs, hooks, copy, prompts",
    badge: "LLM",
  },
  {
    kind: "llm",
    title: "LLM Block",
    description: "Model calls and structured outputs",
    badge: "AI",
  },
  {
    kind: "image",
    title: "Image Block",
    description: "Generate, edit, vary images",
    badge: "IMG",
  },
  {
    kind: "video",
    title: "Video Block",
    description: "Turn prompts or frames into motion",
    badge: "VID",
  },
  {
    kind: "voice",
    title: "Voice Block",
    description: "Narration and voice variants",
    badge: "VO",
  },
  {
    kind: "agent",
    title: "Agent Block",
    description: "Agent-run campaign operations",
    badge: "AGT",
  },
  {
    kind: "dm",
    title: "DM Block",
    description: "Comment triggers and direct replies",
    badge: "DM",
  },
  {
    kind: "landing",
    title: "Landing Block",
    description: "Immersive landing destinations",
    badge: "WEB",
  },
  {
    kind: "custom",
    title: "Custom Block",
    description: "Plugin-defined campaign actions",
    badge: "EXT",
  },
] satisfies GenerationPaletteItem[];

const generationBlockDefinitions = {
  text: {
    kind: "text",
    title: "Text Block",
    subtitle: "campaign angles + prompt copy",
    description: "Turns a campaign brief into hooks, captions, and prompts.",
    tone: "ink",
    status: "READY",
    contracts: [
      { label: "INPUT", value: "Campaign brief", state: "READY" },
      { label: "MODEL", value: "BYO LLM account", state: "BYO" },
      { label: "OUTPUT", value: "Hooks + prompt variants", state: "READY" },
    ],
  },
  llm: {
    kind: "llm",
    title: "LLM Block",
    subtitle: "model call + structured output",
    description: "Runs model prompts and returns structured campaign data.",
    tone: "ink",
    status: "READY",
    contracts: [
      { label: "INPUT", value: "Prompt variables", state: "READY" },
      { label: "MODEL", value: "Configured LLM provider", state: "BYO" },
      { label: "OUTPUT", value: "Structured response", state: "READY" },
    ],
  },
  image: {
    kind: "image",
    title: "Image Block",
    subtitle: "product shots + visual variants",
    description: "Creates still images from prompts, references, and edits.",
    tone: "blue",
    status: "DRAFT",
    contracts: [
      { label: "INPUT", value: "Prompt or reference image", state: "READY" },
      { label: "MODEL", value: "BYO image provider", state: "BYO" },
      { label: "OUTPUT", value: "Image candidates", state: "WAITING" },
    ],
  },
  video: {
    kind: "video",
    title: "Video Block",
    subtitle: "motion drafts + short-form cuts",
    description: "Extends prompts or frames into campaign video drafts.",
    tone: "violet",
    status: "NEEDS INPUT",
    contracts: [
      { label: "INPUT", value: "Prompt, frame, or image", state: "OPTIONAL" },
      { label: "MODEL", value: "BYO video provider", state: "BYO" },
      { label: "OUTPUT", value: "Video candidates", state: "WAITING" },
    ],
  },
  voice: {
    kind: "voice",
    title: "Voice Block",
    subtitle: "narration + voice variants",
    description: "Creates voiceover reads for ads, shorts, and product clips.",
    tone: "green",
    status: "DRAFT",
    contracts: [
      { label: "INPUT", value: "Script or caption", state: "READY" },
      { label: "MODEL", value: "BYO voice provider", state: "BYO" },
      { label: "OUTPUT", value: "Voice takes", state: "WAITING" },
    ],
  },
  agent: {
    kind: "agent",
    title: "Agent Block",
    subtitle: "operator automation",
    description: "Lets an activated agent run approved campaign canvas actions.",
    tone: "green",
    status: "DRAFT",
    contracts: [
      { label: "INPUT", value: "Campaign state + instruction", state: "READY" },
      { label: "PLUGIN", value: "Agent plugin", state: "BYO" },
      { label: "OUTPUT", value: "Canvas action log", state: "WAITING" },
    ],
  },
  dm: {
    kind: "dm",
    title: "DM Block",
    subtitle: "comment trigger + reply",
    description: "Represents a social comment-to-DM handoff in the campaign.",
    tone: "blue",
    status: "DRAFT",
    contracts: [
      { label: "INPUT", value: "Comment event", state: "READY" },
      { label: "PLUGIN", value: "DM provider", state: "BYO" },
      { label: "OUTPUT", value: "Tracked DM link", state: "WAITING" },
    ],
  },
  landing: {
    kind: "landing",
    title: "Landing Block",
    subtitle: "immersive offer page",
    description: "Represents a landing destination with checkout attribution.",
    tone: "violet",
    status: "DRAFT",
    contracts: [
      { label: "INPUT", value: "Visitor + offer context", state: "READY" },
      { label: "PLUGIN", value: "Landing provider", state: "BYO" },
      { label: "OUTPUT", value: "Conversion event", state: "WAITING" },
    ],
  },
  custom: {
    kind: "custom",
    title: "Custom Block",
    subtitle: "plugin-defined action",
    description: "Represents a plugin-defined node in the campaign spec.",
    tone: "ink",
    status: "DRAFT",
    contracts: [
      { label: "INPUT", value: "Plugin input", state: "OPTIONAL" },
      { label: "PLUGIN", value: "Custom plugin", state: "BYO" },
      { label: "OUTPUT", value: "Plugin output", state: "WAITING" },
    ],
  },
} satisfies Record<GenerationBlockKind, GenerationBlockDefinition>;

export const initialCampaignBlocks = [
  createCampaignBlock("text", 0, { x: 360, y: 170 }),
  createCampaignBlock("image", 1, { x: 760, y: 150 }),
  createCampaignBlock("video", 2, { x: 760, y: 420 }),
  createCampaignBlock("voice", 3, { x: 360, y: 455 }),
] satisfies CampaignCanvasBlock[];

export const initialCampaignEdges = [
  { id: "text-image", source: "text_block_1", target: "image_block_2", label: "prompts" },
  { id: "image-video", source: "image_block_2", target: "video_block_3", label: "frames" },
  { id: "text-voice", source: "text_block_1", target: "voice_block_4", label: "script" },
] satisfies CampaignCanvasEdge[];

export function createCampaignBlock(
  kind: GenerationBlockKind,
  index: number,
  position = nextBlockPosition(index),
): CampaignCanvasBlock {
  const definition = generationBlockDefinitions[kind];

  return {
    ...definition,
    id: `${kind}_block_${index + 1}`,
    position,
  };
}

export function getGenerationBlockDefinition(kind: GenerationBlockKind) {
  return generationBlockDefinitions[kind];
}

export function createBlankCampaign(): CampaignDraft {
  return {
    schemaVersion: "owncanvas.campaign.v1",
    id: `campaign_${Date.now()}`,
    title: "Untitled campaign",
    objective: "",
    targetAudience: createCampaignTargetAudience(),
    productOffer: createCampaignProductOffer(),
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [],
      edges: [],
    },
    plugins: [],
    assets: [],
    channels: [],
    tracking: createCampaignTrackingConfiguration(),
    logs: [],
    versions: [],
    status: "draft",
  };
}

export function createCampaignAssetGenerationJob(
  input: CampaignAssetGenerationJobInput,
): CampaignAssetGenerationJob {
  return {
    id: input.id ?? `asset_generation_job_${Date.now()}`,
    mediaType: input.mediaType,
    providerPluginId: input.providerPluginId,
    capabilityId: input.capabilityId,
    requiredInputs: input.requiredInputs,
    ...(input.imageInputs === undefined
      ? {}
      : {
          imageInputs: {
            ...input.imageInputs,
            referenceAssetIds: [...input.imageInputs.referenceAssetIds],
            productAssetIds: [...input.imageInputs.productAssetIds],
            size: { ...input.imageInputs.size },
            providerParameters: { ...input.imageInputs.providerParameters },
          },
        }),
    ...(input.videoInputs === undefined
      ? {}
      : {
          videoInputs: {
            ...input.videoInputs,
            storyboard: sortJsonObjectKeysDeep(
              input.videoInputs.storyboard,
            ) as Record<string, unknown>,
            referenceAssetIds: [...input.videoInputs.referenceAssetIds],
            productAssetIds: [...input.videoInputs.productAssetIds],
            resolution: { ...input.videoInputs.resolution },
            providerParameters: { ...input.videoInputs.providerParameters },
          },
        }),
    outputTargets: input.outputTargets,
    ...(input.resultMetadata === undefined
      ? {}
      : {
          resultMetadata: input.resultMetadata.map((result) => ({ ...result })),
        }),
    status: input.status ?? "draft",
    lifecycle: {
      ...EMPTY_ASSET_GENERATION_JOB_LIFECYCLE,
      ...input.lifecycle,
    },
  };
}

export function validateCampaignCanvasEdit(
  canvasEdit: unknown,
): CampaignCanvasEditValidationResult {
  const errors: CampaignCanvasEditValidationError[] = [];

  if (!isRecord(canvasEdit)) {
    return {
      valid: false,
      errors: [
        {
          code: "canvas.nodes_required",
          path: "canvas.nodes",
          message: "Canvas nodes must be an array.",
        },
        {
          code: "canvas.edges_required",
          path: "canvas.edges",
          message: "Canvas edges must be an array.",
        },
      ],
    };
  }

  const nodes = canvasEdit.nodes;
  const edges = canvasEdit.edges;
  const nodeIds = new Set<string>();

  if (!Array.isArray(nodes)) {
    errors.push({
      code: "canvas.nodes_required",
      path: "canvas.nodes",
      message: "Canvas nodes must be an array.",
    });
  } else {
    const seenNodeIds = new Set<string>();

    nodes.forEach((node, nodeIndex) => {
      const nodePath = `canvas.nodes.${nodeIndex}`;

      if (!isRecord(node)) {
        errors.push({
          code: "canvas.node_id_required",
          path: `${nodePath}.id`,
          message: "Canvas node id is required.",
        });
        errors.push({
          code: "canvas.node_kind_invalid",
          path: `${nodePath}.kind`,
          message: "Canvas node kind or type must be a supported campaign node type.",
        });
        errors.push({
          code: "canvas.node_position_invalid",
          path: `${nodePath}.position`,
          message: "Canvas node position must use finite x and y numbers.",
        });
        return;
      }

      if (typeof node.id !== "string" || node.id.trim() === "") {
        errors.push({
          code: "canvas.node_id_required",
          path: `${nodePath}.id`,
          message: "Canvas node id is required.",
        });
      } else if (seenNodeIds.has(node.id)) {
        errors.push({
          code: "canvas.node_id_duplicate",
          path: `${nodePath}.id`,
          message: "Canvas node id must be unique.",
        });
      } else {
        seenNodeIds.add(node.id);
        nodeIds.add(node.id);
      }

      const resolvedKind = resolveCampaignCanvasNodeKind(node);

      if (!isGenerationBlockKind(resolvedKind)) {
        errors.push({
          code: "canvas.node_kind_invalid",
          path:
            typeof node.kind === "undefined"
              ? `${nodePath}.type`
              : `${nodePath}.kind`,
          message: "Canvas node kind or type must be a supported campaign node type.",
        });
      }

      const position = node.position;

      if (!isRecord(position)) {
        errors.push({
          code: "canvas.node_position_invalid",
          path: `${nodePath}.position`,
          message: "Canvas node position must use finite x and y numbers.",
        });
      } else {
        if (
          typeof position.x !== "number" ||
          !Number.isFinite(position.x)
        ) {
          errors.push({
            code: "canvas.node_position_invalid",
            path: `${nodePath}.position.x`,
            message: "Canvas node position must use finite x and y numbers.",
          });
        }

        if (
          typeof position.y !== "number" ||
          !Number.isFinite(position.y)
        ) {
          errors.push({
            code: "canvas.node_position_invalid",
            path: `${nodePath}.position.y`,
            message: "Canvas node position must use finite x and y numbers.",
          });
        }
      }
    });
  }

  if (!Array.isArray(edges)) {
    errors.push({
      code: "canvas.edges_required",
      path: "canvas.edges",
      message: "Canvas edges must be an array.",
    });
  } else {
    const seenEdgeIds = new Set<string>();

    edges.forEach((edge, edgeIndex) => {
      const edgePath = `canvas.edges.${edgeIndex}`;

      if (!isRecord(edge)) {
        errors.push({
          code: "canvas.edge_id_required",
          path: `${edgePath}.id`,
          message: "Canvas edge id is required.",
        });
        errors.push({
          code: "canvas.edge_source_required",
          path: `${edgePath}.source`,
          message: "Canvas edge source is required.",
        });
        errors.push({
          code: "canvas.edge_target_required",
          path: `${edgePath}.target`,
          message: "Canvas edge target is required.",
        });
        return;
      }

      if (typeof edge.id !== "string" || edge.id.trim() === "") {
        errors.push({
          code: "canvas.edge_id_required",
          path: `${edgePath}.id`,
          message: "Canvas edge id is required.",
        });
      } else if (seenEdgeIds.has(edge.id)) {
        errors.push({
          code: "canvas.edge_id_duplicate",
          path: `${edgePath}.id`,
          message: "Canvas edge id must be unique.",
        });
      } else {
        seenEdgeIds.add(edge.id);
      }

      const hasSource =
        typeof edge.source === "string" && edge.source.trim() !== "";
      const hasTarget =
        typeof edge.target === "string" && edge.target.trim() !== "";

      if (!hasSource) {
        errors.push({
          code: "canvas.edge_source_required",
          path: `${edgePath}.source`,
          message: "Canvas edge source is required.",
        });
      }

      if (!hasTarget) {
        errors.push({
          code: "canvas.edge_target_required",
          path: `${edgePath}.target`,
          message: "Canvas edge target is required.",
        });
      }

      if (hasSource && !nodeIds.has(edge.source as string)) {
        errors.push({
          code: "canvas.edge_source_missing",
          path: `${edgePath}.source`,
          message: "Canvas edge source must reference an existing node.",
        });
      }

      if (hasTarget && !nodeIds.has(edge.target as string)) {
        errors.push({
          code: "canvas.edge_target_missing",
          path: `${edgePath}.target`,
          message: "Canvas edge target must reference an existing node.",
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createCampaignCanvasEdit(
  campaign: CampaignDraft,
  canvasEdit: unknown,
): CampaignDraft {
  const validation = validateCampaignCanvasEdit(canvasEdit);

  if (!validation.valid) {
    throw new Error(
      `Invalid campaign canvas edit: ${validation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  const normalizedCanvasEdit = normalizeCampaignCanvasEdit(canvasEdit);
  const syncedCanvasState = {
    nodes: normalizedCanvasEdit.nodes,
    edges: normalizedCanvasEdit.edges,
  };
  const syncedCampaignSpec = {
    ...campaign.campaignSpec,
    ...syncedCanvasState,
    assetGenerationJobs: campaign.campaignSpec.assetGenerationJobs ?? [],
  };

  return {
    ...campaign,
    campaignSpec: syncedCampaignSpec,
    canvasState: syncedCanvasState,
  };
}

export function parseCampaignSpecJsonEdit(
  campaign: CampaignDraft,
  serializedCampaignSpec: string,
  options: CampaignSpecJsonEditOptions = {},
): CampaignSpecJsonEditResult {
  let parsedCampaignSpec: unknown;

  try {
    parsedCampaignSpec = JSON.parse(serializedCampaignSpec);
  } catch {
    return {
      valid: false,
      campaign,
      errors: [
        {
          code: "campaign_spec.json_invalid",
          path: "campaignSpec",
          message: "Campaign spec JSON is invalid.",
        },
      ],
    };
  }

  const layoutHydratedCampaignSpec = hydrateCampaignSpecLayoutDefaults(
    campaign.canvasState,
    parsedCampaignSpec,
  );
  const canvasValidation = validateCampaignCanvasEdit(
    layoutHydratedCampaignSpec,
  );
  const assetGenerationJobs = isRecord(layoutHydratedCampaignSpec)
    ? layoutHydratedCampaignSpec.assetGenerationJobs
    : undefined;
  const assetGenerationJobsForValidation =
    typeof assetGenerationJobs === "undefined"
      ? campaign.campaignSpec.assetGenerationJobs ?? []
      : assetGenerationJobs;
  const assetGenerationValidation = validateCampaignAssetGenerationJobs(
    assetGenerationJobsForValidation,
  );
  const landingPageTemplateValidation =
    isRecord(layoutHydratedCampaignSpec) &&
    typeof layoutHydratedCampaignSpec.landingPageTemplate !== "undefined"
      ? validateCampaignLandingPageTemplateSchema(
          layoutHydratedCampaignSpec.landingPageTemplate,
        )
      : { valid: true, errors: [] };
  const landingPageBehaviorValidationErrors: CampaignLandingPageTemplateValidationError[] =
    [];
  const landingPageNavigationValidationErrors: CampaignLandingPageTemplateValidationError[] =
    [];
  const landingPageConversionElementValidationErrors: CampaignLandingPageTemplateValidationError[] =
    [];

  if (
    isRecord(layoutHydratedCampaignSpec) &&
    typeof layoutHydratedCampaignSpec.landingPageBehavior !== "undefined"
  ) {
    validateCampaignLandingPageBehaviorConfiguration(
      layoutHydratedCampaignSpec.landingPageBehavior,
      "landingPageBehavior",
      landingPageBehaviorValidationErrors,
    );
  }
  if (
    isRecord(layoutHydratedCampaignSpec) &&
    typeof layoutHydratedCampaignSpec.landingPageNavigation !== "undefined"
  ) {
    validateCampaignLandingPageNavigationConfiguration(
      layoutHydratedCampaignSpec.landingPageNavigation,
      "landingPageNavigation",
      landingPageNavigationValidationErrors,
    );
  }
  if (
    isRecord(layoutHydratedCampaignSpec) &&
    typeof layoutHydratedCampaignSpec.landingPageConversionElements !==
      "undefined"
  ) {
    validateCampaignLandingPageConversionElements(
      layoutHydratedCampaignSpec.landingPageConversionElements,
      "landingPageConversionElements",
      landingPageConversionElementValidationErrors,
    );
  }

  const errors: CampaignSpecJsonEditValidationError[] = [
    ...canvasValidation.errors,
    ...assetGenerationValidation.errors,
    ...landingPageBehaviorValidationErrors,
    ...landingPageNavigationValidationErrors,
    ...landingPageConversionElementValidationErrors,
    ...landingPageTemplateValidation.errors,
  ];

  if (options.commit === false) {
    return {
      valid: false,
      campaign,
      errors: [
        {
          code: "campaign_spec.json_incomplete",
          path: "campaignSpec",
          message: "Campaign spec JSON input is incomplete.",
        },
      ],
    };
  }

  if (errors.length > 0) {
    return {
      valid: false,
      campaign,
      errors,
    };
  }

  const structuralEdits = detectCampaignSpecStructuralEdits(
    campaign.canvasState,
    layoutHydratedCampaignSpec,
  );
  const syncedCampaign = createCampaignCanvasEdit(
    campaign,
    layoutHydratedCampaignSpec,
  );
  const syncedAssetGenerationJobs =
    typeof assetGenerationJobs === "undefined"
      ? campaign.campaignSpec.assetGenerationJobs ?? []
      : (assetGenerationJobs as CampaignAssetGenerationJob[]);
  const landingPageBehavior =
    isRecord(layoutHydratedCampaignSpec) &&
    typeof layoutHydratedCampaignSpec.landingPageBehavior !== "undefined"
      ? (layoutHydratedCampaignSpec.landingPageBehavior as CampaignLandingPageBehaviorConfiguration)
      : syncedCampaign.campaignSpec.landingPageBehavior;
  const landingPageTemplate =
    isRecord(layoutHydratedCampaignSpec) &&
    typeof layoutHydratedCampaignSpec.landingPageTemplate !== "undefined"
      ? (layoutHydratedCampaignSpec.landingPageTemplate as CampaignLandingPageTemplateSchema)
      : syncedCampaign.campaignSpec.landingPageTemplate;
  const landingPageNavigation =
    isRecord(layoutHydratedCampaignSpec) &&
    typeof layoutHydratedCampaignSpec.landingPageNavigation !== "undefined"
      ? (layoutHydratedCampaignSpec.landingPageNavigation as CampaignLandingPageNavigationConfiguration)
      : syncedCampaign.campaignSpec.landingPageNavigation;
  const landingPageConversionElements =
    isRecord(layoutHydratedCampaignSpec) &&
    typeof layoutHydratedCampaignSpec.landingPageConversionElements !==
      "undefined"
      ? (layoutHydratedCampaignSpec.landingPageConversionElements as CampaignLandingPageConversionElementConfiguration[])
      : syncedCampaign.campaignSpec.landingPageConversionElements;
  const nextCampaign = {
    ...syncedCampaign,
    campaignSpec: {
      ...syncedCampaign.campaignSpec,
      assetGenerationJobs: syncedAssetGenerationJobs,
      ...(landingPageBehavior === undefined ? {} : { landingPageBehavior }),
      ...(landingPageNavigation === undefined
        ? {}
        : { landingPageNavigation }),
      ...(landingPageConversionElements === undefined
        ? {}
        : { landingPageConversionElements }),
      ...(landingPageTemplate === undefined ? {} : { landingPageTemplate }),
    },
  };

  if (
    areCanonicalJsonValuesEqual(nextCampaign.canvasState, campaign.canvasState) &&
    serializeCampaignSpecJson(nextCampaign) === serializeCampaignSpecJson(campaign)
  ) {
    return {
      valid: true,
      campaign,
      structuralEdits,
      errors: [],
    };
  }

  return {
    valid: true,
    campaign: nextCampaign,
    structuralEdits,
    errors: [],
  };
}

function hydrateCampaignSpecLayoutDefaults(
  currentCanvas: CampaignCanvasEdit,
  parsedCampaignSpec: unknown,
): unknown {
  if (!isRecord(parsedCampaignSpec) || !Array.isArray(parsedCampaignSpec.nodes)) {
    return parsedCampaignSpec;
  }

  const currentNodesById = new Map(
    currentCanvas.nodes.map((node) => [node.id, node]),
  );

  return {
    ...parsedCampaignSpec,
    nodes: parsedCampaignSpec.nodes.map((node) => {
      if (!isRecord(node)) {
        return node;
      }

      const existingNode =
        typeof node.id === "string" ? currentNodesById.get(node.id) : undefined;

      if (!existingNode) {
        return node;
      }

      return {
        ...node,
        ...(Object.hasOwn(node, "position")
          ? {}
          : { position: { ...existingNode.position } }),
        ...(Object.hasOwn(node, "properties") ||
        !isRecord(existingNode.properties)
          ? {}
          : {
              properties: sortJsonObjectKeysDeep(
                existingNode.properties,
              ) as Record<string, unknown>,
            }),
      };
    }),
  };
}

export function serializeCampaignSpecJson(
  campaign: Pick<CampaignDraft, "campaignSpec">,
): string {
  return JSON.stringify(
    normalizeCampaignSpecForSerialization(campaign.campaignSpec),
    null,
    2,
  );
}

export function ingestInstagramCommentEventIntoCampaignWorkflow(
  campaign: CampaignDraft,
  event: InstagramCommentTriggerEvent,
  options: InstagramCommentWorkflowIngestionOptions = {},
): InstagramCommentWorkflowIngestionResult {
  const validation = validateInstagramCommentTriggerEvent(event);
  const errors: CampaignWorkflowEventIngestionError[] = [
    ...validation.errors,
  ];

  if (event.campaignId !== campaign.id) {
    errors.push({
      code: "workflow-event.campaign_mismatch",
      path: "campaignId",
      message:
        "Instagram comment trigger event campaign id must match the campaign workflow.",
    });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      campaign,
      errors,
    };
  }

  const ingestedAt = options.now?.() ?? new Date().toISOString();
  const workflowEvent: CampaignWorkflowEvent = {
    schemaVersion: "owncanvas.workflow-event.v1",
    id: `workflow.event.${event.id}`,
    campaignId: campaign.id,
    type: "instagram.comment.created",
    occurredAt: event.occurredAt,
    ingestedAt,
    source: {
      pluginId: options.pluginId ?? "",
      capabilityId: options.capabilityId ?? "",
      channel: "instagram",
      trigger: "comment",
      providerEventId: event.id,
      accountId: event.accountId,
      mediaId: event.mediaId,
      commentId: event.commentId,
      ...(event.permalink === undefined ? {} : { permalink: event.permalink }),
    },
    subject: {
      type: "instagram.comment",
      id: event.commentId,
      ...(event.parentCommentId === undefined
        ? {}
        : { parentId: event.parentCommentId }),
      text: event.text,
      actor: {
        id: event.commenter.id,
        ...(event.commenter.username === undefined
          ? {}
          : { username: event.commenter.username }),
      },
    },
    workflow: {
      ...(options.sourceNodeId === undefined
        ? {}
        : { sourceNodeId: options.sourceNodeId }),
      outputPort: options.outputPort ?? "",
      ...(options.targetNodeId === undefined
        ? {}
        : { targetNodeId: options.targetNodeId }),
      ...(options.targetInputPort === undefined
        ? {}
        : { targetInputPort: options.targetInputPort }),
    },
    attribution: {
      source: event.attribution?.source ?? "instagram",
      medium: event.attribution?.medium ?? "comment",
      campaign: event.attribution?.campaign ?? campaign.id,
      content: event.attribution?.content ?? event.mediaId,
      term: event.attribution?.term ?? event.text,
      touchpoint: "instagram.comment",
    },
    payload: {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
      event: {
        accountId: event.accountId,
        mediaId: event.mediaId,
        commentId: event.commentId,
        commenterId: event.commenter.id,
        ...(event.commenter.username === undefined
          ? {}
          : { commenterUsername: event.commenter.username }),
        text: event.text,
      },
    },
    ...(event.metadata === undefined ? {} : { metadata: event.metadata }),
  };

  return {
    ok: true,
    event: workflowEvent,
    campaign: {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        workflowEvents: [
          ...(campaign.campaignSpec.workflowEvents ?? []),
          workflowEvent,
        ],
      },
      tracking: {
        ...campaign.tracking,
        events: appendUnique(campaign.tracking.events, workflowEvent.type),
        attribution: {
          ...campaign.tracking.attribution,
          touchpoints: appendUnique(
            campaign.tracking.attribution.touchpoints,
            workflowEvent.attribution.touchpoint,
          ),
        },
      },
      logs: [
        ...campaign.logs,
        `${ingestedAt} workflow.event.ingested:${workflowEvent.id}`,
      ],
    },
    errors: [],
  };
}

export function loadCampaignAssetGenerationWorkflow(
  campaign: Pick<CampaignDraft, "id" | "campaignSpec">,
): CampaignAssetGenerationWorkflow {
  const jobs = campaign.campaignSpec.assetGenerationJobs ?? [];
  const validation = validateCampaignAssetGenerationJobs(jobs);

  if (!validation.valid) {
    throw new Error(
      `Invalid campaign asset generation workflow: ${validation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  const clonedJobs = jobs.map((job) => cloneCampaignAssetGenerationJob(job));

  return {
    campaignId: campaign.id,
    jobs: clonedJobs,
    imageJobs: clonedJobs
      .filter((job) => job.mediaType === "image")
      .map((job) => cloneCampaignAssetGenerationJob(job)),
    videoJobs: clonedJobs
      .filter((job) => job.mediaType === "video")
      .map((job) => cloneCampaignAssetGenerationJob(job)),
  };
}

export async function executeCampaignImageAssetGenerationJobs(
  workflow: CampaignAssetGenerationWorkflow,
  executor: CampaignImageAssetGenerationExecutor,
  options: CampaignImageAssetGenerationExecutionOptions = {},
): Promise<CampaignImageAssetGenerationExecutionResult> {
  return executeCampaignAssetGenerationJobsByFilter(
    workflow,
    executor,
    (job) => job.mediaType === "image",
    options,
  );
}

export async function executeCampaignImageAssetGenerationWorkflow<
  TCampaign extends CampaignDraft,
>(
  campaign: TCampaign,
  executor: CampaignImageAssetGenerationExecutor,
  options: CampaignImageAssetGenerationWorkflowExecutionOptions = {},
): Promise<CampaignImageAssetGenerationWorkflowExecutionResult<TCampaign>> {
  const executionResult = await executeCampaignImageAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaign),
    executor,
    options,
  );

  return {
    campaign: applyCampaignImageAssetGenerationExecutionResult(
      campaign,
      executionResult,
      options,
    ),
    executionResult,
  };
}

export async function executeCampaignVideoAssetGenerationJobs(
  workflow: CampaignAssetGenerationWorkflow,
  executor: CampaignVideoAssetGenerationExecutor,
  options: CampaignVideoAssetGenerationExecutionOptions = {},
): Promise<CampaignVideoAssetGenerationExecutionResult> {
  return executeCampaignAssetGenerationJobsByFilter(
    workflow,
    executor,
    (job) => job.mediaType === "video",
    options,
  );
}

export async function executeCampaignVideoAssetGenerationWorkflow<
  TCampaign extends CampaignDraft,
>(
  campaign: TCampaign,
  executor: CampaignVideoAssetGenerationExecutor,
  options: CampaignVideoAssetGenerationWorkflowExecutionOptions = {},
): Promise<CampaignVideoAssetGenerationWorkflowExecutionResult<TCampaign>> {
  const executionResult = await executeCampaignVideoAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaign),
    executor,
    options,
  );

  return {
    campaign: applyCampaignVideoAssetGenerationExecutionResult(
      campaign,
      executionResult,
      options,
    ),
    executionResult,
  };
}

export async function executeCampaignAssetGenerationJobs(
  workflow: CampaignAssetGenerationWorkflow,
  executor: CampaignAssetGenerationExecutor,
  options: CampaignAssetGenerationExecutionOptions = {},
): Promise<CampaignAssetGenerationExecutionResult> {
  return executeCampaignAssetGenerationJobsByFilter(
    workflow,
    executor,
    () => true,
    options,
  );
}

export async function executeCampaignAssetGenerationWorkflow<
  TCampaign extends CampaignDraft,
>(
  campaign: TCampaign,
  executor: CampaignAssetGenerationExecutor,
  options: CampaignAssetGenerationWorkflowExecutionOptions = {},
): Promise<CampaignAssetGenerationWorkflowExecutionResult<TCampaign>> {
  const executionResult = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaign),
    executor,
    options,
  );

  return {
    campaign: applyCampaignAssetGenerationExecutionResult(
      campaign,
      executionResult,
      options,
    ),
    executionResult,
  };
}

export function applyCampaignAssetGenerationExecutionResult<
  TCampaign extends CampaignDraft,
>(
  campaign: TCampaign,
  executionResult: CampaignAssetGenerationExecutionResult,
  options: PersistCampaignAssetGenerationResultOptions = {},
): TCampaign {
  if (campaign.id !== executionResult.campaignId) {
    throw new Error(
      `Cannot apply asset generation result for campaign "${executionResult.campaignId}" to campaign "${campaign.id}".`,
    );
  }

  const timestamp = options.now?.() ?? new Date().toISOString();
  const generatedAssets = createGeneratedAssetsFromExecutionResult(
    executionResult,
    options,
  );
  const { assets, persistedAssetIds } = mergeGeneratedCampaignAssets(
    campaign.assets,
    generatedAssets,
  );
  const persistedJobIds = executionResult.completedJobs.map((job) => job.id);
  const jobStatusSummary = serializeAssetGenerationJobStatusSnapshots(
    executionResult.jobStatuses,
  );
  const errorSummary = serializeAssetGenerationErrors(
    executionResult.jobStatuses,
  );
  const canvasNodes = aggregateAssetGenerationStatusesIntoCanvasNodes(
    campaign.canvasState.nodes,
    executionResult.jobStatuses,
    executionResult.jobs,
  );
  const specNodes = aggregateAssetGenerationStatusesIntoCanvasNodes(
    campaign.campaignSpec.nodes,
    executionResult.jobStatuses,
    executionResult.jobs,
  );
  const errorLog =
    errorSummary === ""
      ? []
      : [`${timestamp} asset_generation.errors:${errorSummary}`];

  return {
    ...campaign,
    campaignSpec: {
      ...campaign.campaignSpec,
      nodes: specNodes,
      assetGenerationJobs: mergeCampaignAssetGenerationJobs(
        campaign.campaignSpec.assetGenerationJobs,
        executionResult.jobs,
      ),
      assetGenerationWorkflowState:
        aggregateCampaignAssetGenerationWorkflowState(
          executionResult.jobStatuses,
          executionResult.jobs,
        ),
      assetGenerationExecutions: mergeCampaignAssetGenerationExecutionRecords(
        campaign.campaignSpec.assetGenerationExecutions ?? [],
        executionResult.executionRecords,
      ),
    },
    canvasState: {
      ...campaign.canvasState,
      nodes: canvasNodes,
    },
    assets,
    logs: [
      ...campaign.logs,
      `${timestamp} asset_generation.job_statuses:${jobStatusSummary}`,
      `${timestamp} asset_generation.media.persisted:${persistedJobIds.join(",")}`,
      `${timestamp} asset_generation.assets.persisted:${persistedAssetIds.join(",")}`,
      ...errorLog,
    ],
    versions: [
      ...campaign.versions,
      `${timestamp} asset_generation.job_statuses:${jobStatusSummary}`,
      `${timestamp} asset_generation.media.persisted:${persistedJobIds.join(",")}`,
    ],
  };
}

export function saveCampaignAssetGenerationExecutionResult(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  executionResult: CampaignAssetGenerationExecutionResult,
  options: PersistCampaignAssetGenerationResultOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  return updatePersistedCampaignRecord(
    storage,
    applyCampaignAssetGenerationExecutionResult(
      campaign,
      executionResult,
      options,
    ),
    options,
  );
}

async function executeCampaignAssetGenerationJobsByFilter(
  workflow: CampaignAssetGenerationWorkflow,
  executor: CampaignAssetGenerationExecutor,
  shouldExecuteJob: (job: CampaignAssetGenerationJob) => boolean,
  options: CampaignAssetGenerationExecutionOptions = {},
): Promise<CampaignAssetGenerationExecutionResult> {
  const now = options.now ?? (() => new Date().toISOString());
  const actor = options.actor ?? "system";
  const maxAttempts = normalizeAssetGenerationMaxAttempts(options.maxAttempts);
  const jobsToExecute = workflow.jobs.filter(
    (job) => shouldExecuteJob(job) && isExecutableAssetGenerationJob(job),
  );
  const skippedJobs = workflow.jobs
    .filter(
      (job) =>
        !shouldExecuteJob(job) || !isExecutableAssetGenerationJob(job),
    )
    .map((job) => cloneCampaignAssetGenerationJob(job));
  const maxConcurrency = normalizeAssetGenerationConcurrency(
    options.maxConcurrency,
    jobsToExecute.length,
  );
  const completedJobs: CampaignAssetGenerationJob[] = [];
  const failedJobs: CampaignAssetGenerationJob[] = [];
  const progressUpdates: CampaignAssetGenerationJobStatusSnapshot[] = [];
  const statusEventsByJobId = new Map<
    CampaignAssetGenerationJob["id"],
    CampaignAssetGenerationExecutionStatusEvent[]
  >();
  const executedJobsById = new Map<string, CampaignAssetGenerationJob>();
  let nextJobIndex = 0;

  async function runNextJob() {
    while (nextJobIndex < jobsToExecute.length) {
      const job = jobsToExecute[nextJobIndex];
      nextJobIndex += 1;
      const executedJob = await executeCampaignAssetGenerationJob(
        workflow.campaignId,
        job,
        executor,
        {
          actor,
          maxAttempts,
          now,
          recordProgressUpdate: (snapshot, observedAt) => {
            progressUpdates.push(snapshot);
            const currentEvents = statusEventsByJobId.get(snapshot.jobId) ?? [];
            statusEventsByJobId.set(snapshot.jobId, [
              ...currentEvents,
              createAssetGenerationExecutionStatusEvent(snapshot, observedAt),
            ]);
          },
        },
      );

      executedJobsById.set(executedJob.id, executedJob);

      if (executedJob.status === "completed") {
        completedJobs.push(executedJob);
      } else if (executedJob.status === "failed") {
        failedJobs.push(executedJob);
      }
    }
  }

  await Promise.all(
    Array.from({ length: maxConcurrency }, () => runNextJob()),
  );
  const resultJobs = workflow.jobs.map((job) =>
    executedJobsById.get(job.id) ?? cloneCampaignAssetGenerationJob(job),
  );
  const skippedJobIds = new Set(skippedJobs.map((job) => job.id));
  const jobStatuses = createAssetGenerationJobStatusSnapshots(
    resultJobs,
    workflow.jobs,
    skippedJobIds,
  );

  return {
    campaignId: workflow.campaignId,
    jobs: resultJobs,
    completedJobs: sortAssetGenerationJobsByWorkflowOrder(
      completedJobs,
      workflow.jobs,
    ),
    failedJobs: sortAssetGenerationJobsByWorkflowOrder(failedJobs, workflow.jobs),
    skippedJobs,
    jobStatuses,
    progressUpdates,
    executionRecords: createAssetGenerationExecutionRecords(
      resultJobs,
      workflow.jobs,
      skippedJobIds,
      workflow.campaignId,
      statusEventsByJobId,
    ),
  };
}

export function applyCampaignImageAssetGenerationExecutionResult<
  TCampaign extends CampaignDraft,
>(
  campaign: TCampaign,
  executionResult: CampaignImageAssetGenerationExecutionResult,
  options: PersistCampaignImageAssetGenerationResultOptions = {},
): TCampaign {
  if (campaign.id !== executionResult.campaignId) {
    throw new Error(
      `Cannot apply image generation result for campaign "${executionResult.campaignId}" to campaign "${campaign.id}".`,
    );
  }

  const timestamp = options.now?.() ?? new Date().toISOString();
  const generatedAssets = createGeneratedImageAssetsFromExecutionResult(
    executionResult,
    options,
  );
  const { assets, persistedAssetIds } = mergeGeneratedCampaignAssets(
    campaign.assets,
    generatedAssets,
  );
  const persistedJobIds = executionResult.completedJobs.map((job) => job.id);
  const jobStatusSummary = serializeAssetGenerationJobStatusSnapshots(
    executionResult.jobStatuses,
  );
  const canvasNodes = aggregateAssetGenerationStatusesIntoCanvasNodes(
    campaign.canvasState.nodes,
    executionResult.jobStatuses,
    executionResult.jobs,
  );
  const specNodes = aggregateAssetGenerationStatusesIntoCanvasNodes(
    campaign.campaignSpec.nodes,
    executionResult.jobStatuses,
    executionResult.jobs,
  );

  return {
    ...campaign,
    campaignSpec: {
      ...campaign.campaignSpec,
      nodes: specNodes,
      assetGenerationJobs: mergeCampaignAssetGenerationJobs(
        campaign.campaignSpec.assetGenerationJobs,
        executionResult.jobs,
      ),
      assetGenerationWorkflowState:
        aggregateCampaignAssetGenerationWorkflowState(
          executionResult.jobStatuses,
          executionResult.jobs,
        ),
      assetGenerationExecutions: mergeCampaignAssetGenerationExecutionRecords(
        campaign.campaignSpec.assetGenerationExecutions ?? [],
        executionResult.executionRecords,
      ),
    },
    canvasState: {
      ...campaign.canvasState,
      nodes: canvasNodes,
    },
    assets,
    logs: [
      ...campaign.logs,
      `${timestamp} asset_generation.image_job_statuses:${jobStatusSummary}`,
      `${timestamp} asset_generation.images.persisted:${persistedJobIds.join(",")}`,
      `${timestamp} asset_generation.image_assets.persisted:${persistedAssetIds.join(",")}`,
    ],
    versions: [
      ...campaign.versions,
      `${timestamp} asset_generation.image_job_statuses:${jobStatusSummary}`,
      `${timestamp} asset_generation.images.persisted:${persistedJobIds.join(",")}`,
    ],
  };
}

export function saveCampaignImageAssetGenerationExecutionResult(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  executionResult: CampaignImageAssetGenerationExecutionResult,
  options: PersistCampaignImageAssetGenerationResultOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  return updatePersistedCampaignRecord(
    storage,
    applyCampaignImageAssetGenerationExecutionResult(
      campaign,
      executionResult,
      options,
    ),
    options,
  );
}

export function applyCampaignVideoAssetGenerationExecutionResult<
  TCampaign extends CampaignDraft,
>(
  campaign: TCampaign,
  executionResult: CampaignVideoAssetGenerationExecutionResult,
  options: PersistCampaignVideoAssetGenerationResultOptions = {},
): TCampaign {
  if (campaign.id !== executionResult.campaignId) {
    throw new Error(
      `Cannot apply video generation result for campaign "${executionResult.campaignId}" to campaign "${campaign.id}".`,
    );
  }

  const timestamp = options.now?.() ?? new Date().toISOString();
  const generatedAssets = createGeneratedVideoAssetsFromExecutionResult(
    executionResult,
    options,
  );
  const { assets, persistedAssetIds } = mergeGeneratedCampaignAssets(
    campaign.assets,
    generatedAssets,
  );
  const persistedJobIds = executionResult.completedJobs.map((job) => job.id);
  const jobStatusSummary = serializeAssetGenerationJobStatusSnapshots(
    executionResult.jobStatuses,
  );
  const canvasNodes = aggregateAssetGenerationStatusesIntoCanvasNodes(
    campaign.canvasState.nodes,
    executionResult.jobStatuses,
    executionResult.jobs,
  );
  const specNodes = aggregateAssetGenerationStatusesIntoCanvasNodes(
    campaign.campaignSpec.nodes,
    executionResult.jobStatuses,
    executionResult.jobs,
  );

  return {
    ...campaign,
    campaignSpec: {
      ...campaign.campaignSpec,
      nodes: specNodes,
      assetGenerationJobs: mergeCampaignAssetGenerationJobs(
        campaign.campaignSpec.assetGenerationJobs,
        executionResult.jobs,
      ),
      assetGenerationWorkflowState:
        aggregateCampaignAssetGenerationWorkflowState(
          executionResult.jobStatuses,
          executionResult.jobs,
        ),
      assetGenerationExecutions: mergeCampaignAssetGenerationExecutionRecords(
        campaign.campaignSpec.assetGenerationExecutions ?? [],
        executionResult.executionRecords,
      ),
    },
    canvasState: {
      ...campaign.canvasState,
      nodes: canvasNodes,
    },
    assets,
    logs: [
      ...campaign.logs,
      `${timestamp} asset_generation.video_job_statuses:${jobStatusSummary}`,
      `${timestamp} asset_generation.videos.persisted:${persistedJobIds.join(",")}`,
      `${timestamp} asset_generation.video_assets.persisted:${persistedAssetIds.join(",")}`,
    ],
    versions: [
      ...campaign.versions,
      `${timestamp} asset_generation.video_job_statuses:${jobStatusSummary}`,
      `${timestamp} asset_generation.videos.persisted:${persistedJobIds.join(",")}`,
    ],
  };
}

export function saveCampaignVideoAssetGenerationExecutionResult(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  executionResult: CampaignVideoAssetGenerationExecutionResult,
  options: PersistCampaignVideoAssetGenerationResultOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  return updatePersistedCampaignRecord(
    storage,
    applyCampaignVideoAssetGenerationExecutionResult(
      campaign,
      executionResult,
      options,
    ),
    options,
  );
}

export function applyCampaignCanvasEditAction(
  campaign: CampaignDraft,
  action: CampaignCanvasEditAction,
): CampaignDraft {
  const currentCanvas = campaign.canvasState;

  switch (action.type) {
    case "canvas.node.create": {
      return createCampaignCanvasEdit(campaign, {
        nodes: [...currentCanvas.nodes, action.node],
        edges: currentCanvas.edges,
      });
    }

    case "canvas.node.update": {
      return createCampaignCanvasEdit(campaign, {
        nodes: currentCanvas.nodes.map((node) =>
          node.id === action.nodeId
            ? {
                ...node,
                ...action.patch,
                position: action.patch.position ?? node.position,
                contracts: action.patch.contracts ?? node.contracts,
              }
            : node,
        ),
        edges: currentCanvas.edges,
      });
    }

    case "canvas.node.delete": {
      return createCampaignCanvasEdit(campaign, {
        nodes: currentCanvas.nodes.filter((node) => node.id !== action.nodeId),
        edges: currentCanvas.edges.filter(
          (edge) => edge.source !== action.nodeId && edge.target !== action.nodeId,
        ),
      });
    }

    case "canvas.node.reorder": {
      const nodesById = new Map(
        currentCanvas.nodes.map((node) => [node.id, node]),
      );
      const reorderedNodes: CampaignCanvasBlock[] = [];
      const seenNodeIds = new Set<string>();

      for (const nodeId of action.nodeIds) {
        const node = nodesById.get(nodeId);

        if (node === undefined || seenNodeIds.has(nodeId)) {
          continue;
        }

        reorderedNodes.push(node);
        seenNodeIds.add(nodeId);
      }

      for (const node of currentCanvas.nodes) {
        if (!seenNodeIds.has(node.id)) {
          reorderedNodes.push(node);
        }
      }

      return createCampaignCanvasEdit(campaign, {
        nodes: reorderedNodes,
        edges: currentCanvas.edges,
      });
    }

    case "canvas.edge.connect": {
      validateExplicitCanvasEdgePorts(action.edge);

      return createCampaignCanvasEdit(campaign, {
        nodes: currentCanvas.nodes,
        edges: [
          ...currentCanvas.edges.filter((edge) => edge.id !== action.edge.id),
          action.edge,
        ],
      });
    }

    case "canvas.edge.disconnect": {
      return createCampaignCanvasEdit(campaign, {
        nodes: currentCanvas.nodes,
        edges: currentCanvas.edges.filter((edge) => edge.id !== action.edgeId),
      });
    }

    case "campaign.landing.behavior.set": {
      if (!isCampaignLandingPageBehaviorMode(action.mode)) {
        throw new Error(
          "Invalid campaign canvas edit action: campaign.landing.behavior.set requires a supported landing behavior mode.",
        );
      }

      return setCampaignLandingPageBehaviorMode(campaign, action.mode);
    }
  }
}

function normalizeCampaignCanvasEdit(canvasEdit: unknown): CampaignCanvasEdit {
  const rawCanvasEdit = canvasEdit as {
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  };

  return {
    nodes: rawCanvasEdit.nodes.map((node) =>
      normalizeCampaignCanvasNode(node),
    ),
    edges: rawCanvasEdit.edges.map((edge) => normalizeCampaignCanvasEdge(edge)),
  };
}

function detectCampaignSpecStructuralEdits(
  currentCanvas: CampaignCanvasEdit,
  targetCanvasEdit: unknown,
): CampaignCanvasStructuralEdit[] {
  const targetCanvas = normalizeCampaignCanvasEdit(targetCanvasEdit);
  const currentNodesById = new Map(
    currentCanvas.nodes.map((node) => [node.id, normalizeCampaignCanvasNode(node)]),
  );
  const targetNodesById = new Map(
    targetCanvas.nodes.map((node) => [node.id, node]),
  );
  const currentEdgesById = new Map(
    currentCanvas.edges.map((edge) => [edge.id, normalizeCampaignCanvasEdge(edge)]),
  );
  const targetEdgesById = new Map(
    targetCanvas.edges.map((edge) => [edge.id, edge]),
  );
  const structuralEdits: CampaignCanvasStructuralEdit[] = [];

  for (const targetNode of targetCanvas.nodes) {
    const currentNode = currentNodesById.get(targetNode.id);

    if (
      currentNode !== undefined &&
      !areCanonicalJsonValuesEqual(currentNode, targetNode)
    ) {
      structuralEdits.push({
        type: "canvas.node.update",
        nodeId: targetNode.id,
      });
    }
  }

  for (const currentNode of currentCanvas.nodes) {
    if (!targetNodesById.has(currentNode.id)) {
      structuralEdits.push({
        type: "canvas.node.delete",
        nodeId: currentNode.id,
      });
    }
  }

  for (const targetNode of targetCanvas.nodes) {
    if (!currentNodesById.has(targetNode.id)) {
      structuralEdits.push({
        type: "canvas.node.create",
        nodeId: targetNode.id,
      });
    }
  }

  const currentNodeIds = currentCanvas.nodes.map((node) => node.id);
  const targetNodeIds = targetCanvas.nodes.map((node) => node.id);
  const hasSameNodeSet =
    currentNodeIds.length === targetNodeIds.length &&
    currentNodeIds.every((nodeId) => targetNodesById.has(nodeId));

  if (
    hasSameNodeSet &&
    currentNodeIds.some((nodeId, index) => targetNodeIds[index] !== nodeId)
  ) {
    structuralEdits.push({
      type: "canvas.node.reorder",
      nodeIds: targetNodeIds,
    });
  }

  for (const targetEdge of targetCanvas.edges) {
    const currentEdge = currentEdgesById.get(targetEdge.id);

    if (
      currentEdge !== undefined &&
      !areCanonicalJsonValuesEqual(currentEdge, targetEdge)
    ) {
      structuralEdits.push({
        type: "canvas.edge.connect",
        edgeId: targetEdge.id,
      });
    }
  }

  for (const currentEdge of currentCanvas.edges) {
    if (!targetEdgesById.has(currentEdge.id)) {
      structuralEdits.push({
        type: "canvas.edge.disconnect",
        edgeId: currentEdge.id,
      });
    }
  }

  for (const targetEdge of targetCanvas.edges) {
    if (!currentEdgesById.has(targetEdge.id)) {
      structuralEdits.push({
        type: "canvas.edge.connect",
        edgeId: targetEdge.id,
      });
    }
  }

  return structuralEdits;
}

function areCanonicalJsonValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function appendUnique<TValue>(values: readonly TValue[], value: TValue): TValue[] {
  return values.includes(value) ? [...values] : [...values, value];
}

function normalizeCampaignSpecForSerialization(
  campaignSpec: CampaignSpec,
): CampaignSpec {
  return {
    nodes: campaignSpec.nodes.map((node) => normalizeCampaignCanvasNode(node)),
    edges: campaignSpec.edges.map((edge) => normalizeCampaignCanvasEdge(edge)),
    assetGenerationJobs: (campaignSpec.assetGenerationJobs ?? []).map((job) =>
      normalizeCampaignAssetGenerationJobForSerialization(job),
    ),
    ...(campaignSpec.assetGenerationWorkflowState === undefined
      ? {}
      : {
          assetGenerationWorkflowState:
            normalizeCampaignAssetGenerationWorkflowStateForSerialization(
              campaignSpec.assetGenerationWorkflowState,
            ),
        }),
    ...(campaignSpec.assetGenerationExecutions === undefined
      ? {}
      : {
          assetGenerationExecutions:
            campaignSpec.assetGenerationExecutions.map((record) =>
              normalizeCampaignAssetGenerationExecutionRecord(record),
            ),
        }),
    ...(campaignSpec.workflowEvents === undefined
      ? {}
      : {
          workflowEvents: campaignSpec.workflowEvents.map((event) =>
            normalizeCampaignWorkflowEventForSerialization(event),
          ),
        }),
    ...(campaignSpec.landingPageBehavior === undefined
      ? {}
      : {
          landingPageBehavior: {
            ...campaignSpec.landingPageBehavior,
          },
        }),
    ...(campaignSpec.landingPageNavigation === undefined
      ? {}
      : {
          landingPageNavigation: {
            ...campaignSpec.landingPageNavigation,
          },
        }),
    ...(campaignSpec.landingPageConversionElements === undefined
      ? {}
      : {
          landingPageConversionElements:
            campaignSpec.landingPageConversionElements.map((element) => ({
              ...element,
            })),
        }),
    ...(campaignSpec.landingPageTemplate === undefined
      ? {}
      : {
          landingPageTemplate:
            normalizeCampaignLandingPageTemplateForSerialization(
              campaignSpec.landingPageTemplate,
            ),
        }),
  };
}

function normalizeCampaignLandingPageTemplateForSerialization(
  template: CampaignLandingPageTemplateSchema,
): CampaignLandingPageTemplateSchema {
  return {
    schemaVersion: template.schemaVersion,
    id: template.id,
    title: template.title,
    pageType: template.pageType,
    ...(template.behavior === undefined
      ? {}
      : { behavior: { ...template.behavior } }),
    ...(template.navigation === undefined
      ? {}
      : { navigation: { ...template.navigation } }),
    ...(template.conversionElements === undefined
      ? {}
      : {
          conversionElements: template.conversionElements.map((element) => ({
            ...element,
          })),
        }),
    modules: template.modules.map((module) => {
      if (module.type === "embedded-short-form-content") {
        return {
          ...module,
          acceptedInputPorts: [...module.acceptedInputPorts],
          outputPorts: [...module.outputPorts],
          mediaTypes: [...module.mediaTypes],
          provider: { ...module.provider },
          configuration: { ...module.configuration },
        };
      }

      return {
        ...module,
        acceptedInputPorts: [...module.acceptedInputPorts],
        outputPorts: [...module.outputPorts],
        mediaTypes: [...module.mediaTypes],
        continuationBehavior: { ...module.continuationBehavior },
        segments: module.segments.map((segment) => ({ ...segment })),
        cta: { ...module.cta },
        configuration: { ...module.configuration },
      };
    }),
  };
}

function normalizeCampaignAssetGenerationWorkflowStateForSerialization(
  state: CampaignAssetGenerationWorkflowState,
): CampaignAssetGenerationWorkflowState {
  return {
    status: state.status,
    totalJobs: state.totalJobs,
    runningJobs: state.runningJobs,
    completedJobs: state.completedJobs,
    failedJobs: state.failedJobs,
    skippedJobs: state.skippedJobs,
    finishedJobs: state.finishedJobs,
    percentComplete: state.percentComplete,
    jobIds: [...state.jobIds],
    completedJobIds: [...state.completedJobIds],
    failedJobIds: [...state.failedJobIds],
    skippedJobIds: [...state.skippedJobIds],
    assetIds: [...state.assetIds],
    resultIds: [...state.resultIds],
    providerRequestIds: [...state.providerRequestIds],
    outputs: state.outputs.map((output) => ({
      jobId: output.jobId,
      mediaType: output.mediaType,
      resultId: output.resultId,
      assetId: output.assetId,
      uri: output.uri,
      mimeType: output.mimeType,
      providerRequestId: output.providerRequestId,
      generatedAt: output.generatedAt,
      ...(output.thumbnailUri === undefined
        ? {}
        : { thumbnailUri: output.thumbnailUri }),
    })),
    errors: state.errors.map((error) => ({
      jobId: error.jobId,
      mediaType: error.mediaType,
      message: error.message,
      ...(error.providerPluginId === undefined
        ? {}
        : { providerPluginId: error.providerPluginId }),
      ...(error.capabilityId === undefined
        ? {}
        : { capabilityId: error.capabilityId }),
    })),
  };
}

function normalizeCampaignWorkflowEventForSerialization(
  event: CampaignWorkflowEvent,
): CampaignWorkflowEvent {
  return {
    ...event,
    metadata:
      event.metadata === undefined
        ? undefined
        : (sortJsonObjectKeysDeep(event.metadata) as Record<string, unknown>),
  };
}

function normalizeCampaignCanvasNode(
  node: Record<string, unknown>,
): CampaignCanvasBlock {
  const kind = resolveCampaignCanvasNodeKind(node) as GenerationBlockKind;
  const definition = generationBlockDefinitions[kind];
  const position = node.position as { x: number; y: number };
  const type =
    typeof node.type === "string" && isGenerationBlockKind(node.type)
      ? node.type
      : typeof node.label === "string" && node.label.trim() !== ""
        ? kind
        : undefined;
  const label =
    type !== undefined &&
    typeof node.label === "string" &&
    node.label.trim() !== ""
      ? node.label
      : type !== undefined &&
          typeof node.title === "string" &&
          node.title.trim() !== ""
        ? node.title
        : undefined;

  return {
    id: node.id as string,
    kind,
    ...(type === undefined ? {} : { type }),
    ...(label === undefined ? {} : { label }),
    title:
      typeof node.title === "string" && node.title.trim() !== ""
        ? node.title
        : label !== undefined
          ? label
        : definition.title,
    subtitle:
      typeof node.subtitle === "string" ? node.subtitle : definition.subtitle,
    description:
      typeof node.description === "string"
        ? node.description
        : definition.description,
    tone: isGenerationBlockTone(node.tone) ? node.tone : definition.tone,
    status: isGenerationBlockStatus(node.status)
      ? node.status
      : definition.status,
    position: {
      x: position.x,
      y: position.y,
    },
    contracts: normalizeGenerationBlockContracts(
      node.contracts,
      definition.contracts,
    ),
    ...(isRecord(node.properties)
      ? {
          properties: sortJsonObjectKeysDeep(
            node.properties,
          ) as Record<string, unknown>,
        }
      : {}),
  };
}

function normalizeCampaignCanvasEdge(
  edge: Record<string, unknown>,
): CampaignCanvasEdge {
  return {
    id: edge.id as string,
    source: edge.source as string,
    ...(typeof edge.sourcePort === "string" && edge.sourcePort.trim() !== ""
      ? { sourcePort: edge.sourcePort }
      : {}),
    target: edge.target as string,
    ...(typeof edge.targetPort === "string" && edge.targetPort.trim() !== ""
      ? { targetPort: edge.targetPort }
      : {}),
    ...(typeof edge.type === "string" && edge.type.trim() !== ""
      ? { type: edge.type }
      : {}),
    label: typeof edge.label === "string" ? edge.label : "",
    ...(isRecord(edge.properties)
      ? {
          properties: sortJsonObjectKeysDeep(
            edge.properties,
          ) as Record<string, unknown>,
        }
      : {}),
  };
}

function cloneCampaignAssetGenerationJob(
  job: CampaignAssetGenerationJob,
): CampaignAssetGenerationJob {
  return {
    ...job,
    requiredInputs: job.requiredInputs.map((input) => ({ ...input })),
    ...(job.imageInputs === undefined
      ? {}
      : {
          imageInputs: {
            ...job.imageInputs,
            referenceAssetIds: [...job.imageInputs.referenceAssetIds],
            productAssetIds: [...job.imageInputs.productAssetIds],
            size: { ...job.imageInputs.size },
            providerParameters: { ...job.imageInputs.providerParameters },
          },
        }),
    ...(job.videoInputs === undefined
      ? {}
      : {
          videoInputs: {
            ...job.videoInputs,
            storyboard: sortJsonObjectKeysDeep(
              job.videoInputs.storyboard,
            ) as Record<string, unknown>,
            referenceAssetIds: [...job.videoInputs.referenceAssetIds],
            productAssetIds: [...job.videoInputs.productAssetIds],
            resolution: { ...job.videoInputs.resolution },
            providerParameters: { ...job.videoInputs.providerParameters },
          },
        }),
    outputTargets: job.outputTargets.map((target) => ({ ...target })),
    ...(job.resultMetadata === undefined
      ? {}
      : {
          resultMetadata: job.resultMetadata.map((result) => ({ ...result })),
        }),
    ...(job.lifecycle === undefined
      ? {}
      : {
          lifecycle: {
            ...job.lifecycle,
          },
        }),
  };
}

function cloneCampaignAssetGenerationExecutionRecord(
  record: CampaignAssetGenerationExecutionRecord,
): CampaignAssetGenerationExecutionRecord {
  return {
    ...record,
    ...(record.failureDetails === null || record.failureDetails === undefined
      ? {}
      : { failureDetails: { ...record.failureDetails } }),
    resultIds: [...record.resultIds],
    assetIds: [...record.assetIds],
    providerRequestIds: [...record.providerRequestIds],
    outputs: (record.outputs ?? []).map((output) =>
      cloneCampaignAssetGenerationResultMetadata(output),
    ),
    statusEvents: (record.statusEvents ?? []).map((event) => ({
      ...event,
      ...(event.failureDetails === null || event.failureDetails === undefined
        ? {}
        : { failureDetails: { ...event.failureDetails } }),
    })),
  };
}

function normalizeCampaignAssetGenerationExecutionRecord(
  record: CampaignAssetGenerationExecutionRecord,
): CampaignAssetGenerationExecutionRecord {
  return {
    id: record.id,
    campaignId: record.campaignId,
    jobId: record.jobId,
    mediaType: record.mediaType,
    providerPluginId: record.providerPluginId,
    capabilityId: record.capabilityId,
    status: record.status,
    jobStatus: record.jobStatus,
    actor: record.actor,
    attempt: record.attempt,
    progress: record.progress,
    queuedAt: record.queuedAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    failedAt: record.failedAt,
    canceledAt: record.canceledAt,
    error: record.error,
    ...(record.failureDetails === null || record.failureDetails === undefined
      ? {}
      : { failureDetails: { ...record.failureDetails } }),
    resultIds: [...record.resultIds],
    assetIds: [...record.assetIds],
    providerRequestIds: [...record.providerRequestIds],
    outputs: (record.outputs ?? []).map((output) =>
      cloneCampaignAssetGenerationResultMetadata(output),
    ),
    statusEvents: (record.statusEvents ?? []).map((event) => ({
      status: event.status,
      jobStatus: event.jobStatus,
      progress: event.progress,
      observedAt: event.observedAt,
      error: event.error,
      ...(event.failureDetails === null || event.failureDetails === undefined
        ? {}
        : { failureDetails: { ...event.failureDetails } }),
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeCampaignAssetGenerationJobForSerialization(
  job: CampaignAssetGenerationJob,
): CampaignAssetGenerationJob {
  return {
    id: job.id,
    mediaType: job.mediaType,
    providerPluginId: job.providerPluginId,
    capabilityId: job.capabilityId,
    requiredInputs: job.requiredInputs.map((input) => ({
      key: input.key,
      label: input.label,
      source: input.source,
      dataType: input.dataType,
    })),
    ...(job.imageInputs === undefined
      ? {}
      : {
          imageInputs: {
            prompt: job.imageInputs.prompt,
            negativePrompt: job.imageInputs.negativePrompt,
            referenceAssetIds: [...job.imageInputs.referenceAssetIds],
            productAssetIds: [...job.imageInputs.productAssetIds],
            count: job.imageInputs.count,
            aspectRatio: job.imageInputs.aspectRatio,
            size: {
              width: job.imageInputs.size.width,
              height: job.imageInputs.size.height,
            },
            style: job.imageInputs.style,
            seed: job.imageInputs.seed,
            providerParameters: sortJsonObjectKeysDeep(
              job.imageInputs.providerParameters,
            ) as Record<string, unknown>,
          },
        }),
    ...(job.videoInputs === undefined
      ? {}
      : {
          videoInputs: {
            prompt: job.videoInputs.prompt,
            negativePrompt: job.videoInputs.negativePrompt,
            storyboard: sortJsonObjectKeysDeep(
              job.videoInputs.storyboard,
            ) as Record<string, unknown>,
            script: job.videoInputs.script,
            referenceAssetIds: [...job.videoInputs.referenceAssetIds],
            productAssetIds: [...job.videoInputs.productAssetIds],
            count: job.videoInputs.count,
            aspectRatio: job.videoInputs.aspectRatio,
            durationSeconds: job.videoInputs.durationSeconds,
            resolution: {
              width: job.videoInputs.resolution.width,
              height: job.videoInputs.resolution.height,
            },
            frameRate: job.videoInputs.frameRate,
            style: job.videoInputs.style,
            seed: job.videoInputs.seed,
            providerParameters: sortJsonObjectKeysDeep(
              job.videoInputs.providerParameters,
            ) as Record<string, unknown>,
          },
        }),
    outputTargets: job.outputTargets.map((target) => ({
      assetId: target.assetId,
      field: target.field,
    })),
    ...(job.resultMetadata === undefined
      ? {}
      : {
          resultMetadata: job.resultMetadata.map((result) => ({
            id: result.id,
            assetId: result.assetId,
            uri: result.uri,
            mimeType: result.mimeType,
            width: result.width,
            height: result.height,
            ...(result.durationSeconds === undefined
              ? {}
              : { durationSeconds: result.durationSeconds }),
            ...(result.frameRate === undefined
              ? {}
              : { frameRate: result.frameRate }),
            ...(result.codec === undefined ? {} : { codec: result.codec }),
            ...(result.thumbnailUri === undefined
              ? {}
              : { thumbnailUri: result.thumbnailUri }),
            sizeBytes: result.sizeBytes,
            model: result.model,
            seed: result.seed,
            promptHash: result.promptHash,
            providerRequestId: result.providerRequestId,
            ...(result.storageReferences === undefined
              ? {}
              : {
                  storageReferences: cloneCampaignAssetStorageReferences(
                    result.storageReferences,
                  ),
                }),
            generatedAt: result.generatedAt,
            durationMs: result.durationMs,
            costUsd: result.costUsd,
            finishReason: result.finishReason,
          })),
        }),
    status: job.status,
    ...(job.lifecycle === undefined
      ? {}
      : {
          lifecycle: {
            createdAt: job.lifecycle.createdAt,
            updatedAt: job.lifecycle.updatedAt,
            queuedAt: job.lifecycle.queuedAt,
            startedAt: job.lifecycle.startedAt,
            completedAt: job.lifecycle.completedAt,
            failedAt: job.lifecycle.failedAt,
            canceledAt: job.lifecycle.canceledAt,
            actor: job.lifecycle.actor,
            attempt: job.lifecycle.attempt,
            progress: job.lifecycle.progress,
            error: job.lifecycle.error,
          },
        }),
  };
}

function isExecutableAssetGenerationJob(
  job: CampaignAssetGenerationJob,
): boolean {
  return job.status === "ready" || job.status === "queued";
}

function normalizeAssetGenerationConcurrency(
  requestedConcurrency: number | undefined,
  jobCount: number,
): number {
  if (jobCount === 0) {
    return 1;
  }

  if (
    requestedConcurrency === undefined ||
    !Number.isFinite(requestedConcurrency)
  ) {
    return jobCount;
  }

  return Math.max(1, Math.min(Math.floor(requestedConcurrency), jobCount));
}

function normalizeAssetGenerationMaxAttempts(
  requestedMaxAttempts: number | undefined,
): number {
  if (
    requestedMaxAttempts === undefined ||
    !Number.isFinite(requestedMaxAttempts)
  ) {
    return 1;
  }

  return Math.max(1, Math.floor(requestedMaxAttempts));
}

function normalizeAssetGenerationProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.max(0, Math.min(99, Math.round(progress)));
}

async function executeCampaignAssetGenerationJob(
  campaignId: CampaignDraft["id"],
  job: CampaignAssetGenerationJob,
  executor: CampaignAssetGenerationExecutor,
  options: Required<
    Pick<CampaignAssetGenerationExecutionOptions, "actor" | "maxAttempts" | "now">
  > & {
    recordProgressUpdate?: (
      snapshot: CampaignAssetGenerationJobStatusSnapshot,
      observedAt: string,
    ) => void;
  },
): Promise<CampaignAssetGenerationJob> {
  const startedAt = options.now();
  let runningJob = transitionCampaignAssetGenerationJob(job, {
    status: "running",
    actor: options.actor,
    timestamp: startedAt,
    progress: 0,
    attempt: (job.lifecycle?.attempt ?? 0) + 1,
  });
  options.recordProgressUpdate?.(
    createAssetGenerationJobStatusSnapshot(runningJob, new Set()),
    startedAt,
  );

  let attemptStartedAt = startedAt;

  while (true) {
    try {
      const resultMetadata = await executor(
        cloneCampaignAssetGenerationJob(runningJob),
        {
          campaignId,
          actor: options.actor,
          startedAt: attemptStartedAt,
          reportProgress: (progress) => {
            const progressAt = options.now();
            runningJob = transitionCampaignAssetGenerationJob(runningJob, {
              status: "running",
              actor: options.actor,
              timestamp: progressAt,
              progress: normalizeAssetGenerationProgress(progress),
            });
            options.recordProgressUpdate?.(
              createAssetGenerationJobStatusSnapshot(runningJob, new Set()),
              progressAt,
            );
          },
        },
      );
      const completedAt = options.now();
      const completedJob = {
        ...transitionCampaignAssetGenerationJob(runningJob, {
          status: "completed",
          actor: options.actor,
          timestamp: completedAt,
          progress: 100,
        }),
        resultMetadata: resultMetadata.map((result) => ({ ...result })),
      };
      options.recordProgressUpdate?.(
        createAssetGenerationJobStatusSnapshot(completedJob, new Set()),
        completedAt,
      );
      return completedJob;
    } catch (error) {
      const failedAt = options.now();
      const attempt = runningJob.lifecycle?.attempt ?? 0;

      if (attempt < options.maxAttempts) {
        runningJob = transitionCampaignAssetGenerationJob(runningJob, {
          status: "running",
          actor: options.actor,
          timestamp: failedAt,
          progress: runningJob.lifecycle?.progress ?? 0,
          attempt: attempt + 1,
        });
        attemptStartedAt = failedAt;
        options.recordProgressUpdate?.(
          createAssetGenerationJobStatusSnapshot(runningJob, new Set()),
          failedAt,
        );
        continue;
      }

      const failedJob = transitionCampaignAssetGenerationJob(runningJob, {
        status: "failed",
        actor: options.actor,
        timestamp: failedAt,
        progress: runningJob.lifecycle?.progress ?? 0,
        error: error instanceof Error ? error.message : String(error),
        failureDetails: getAssetGenerationFailureDetails({
          error,
          job: runningJob,
          attempt,
          failedAt,
        }),
      });
      options.recordProgressUpdate?.(
        createAssetGenerationJobStatusSnapshot(failedJob, new Set()),
        failedAt,
      );
      return failedJob;
    }
  }
}

function transitionCampaignAssetGenerationJob(
  job: CampaignAssetGenerationJob,
  transition: {
    status: CampaignAssetGenerationJobStatus;
    actor: CampaignExecutionActor;
    timestamp: string;
    progress: number;
    attempt?: number;
    error?: string | null;
    failureDetails?: CampaignAssetGenerationFailureDetails | null;
  },
): CampaignAssetGenerationJob {
  const currentLifecycle = {
    ...EMPTY_ASSET_GENERATION_JOB_LIFECYCLE,
    ...job.lifecycle,
  };
  const lifecycle: CampaignAssetGenerationJobLifecycle = {
    ...currentLifecycle,
    updatedAt: transition.timestamp,
    actor: transition.actor,
    attempt: transition.attempt ?? currentLifecycle.attempt,
    progress: transition.progress,
    error: transition.error ?? null,
  };

  if (transition.failureDetails !== undefined && transition.failureDetails !== null) {
    lifecycle.failureDetails = { ...transition.failureDetails };
  } else {
    delete lifecycle.failureDetails;
  }

  if (transition.status === "running") {
    lifecycle.startedAt = transition.timestamp;
  }

  if (transition.status === "completed") {
    lifecycle.completedAt = transition.timestamp;
  }

  if (transition.status === "failed") {
    lifecycle.failedAt = transition.timestamp;
  }

  return {
    ...cloneCampaignAssetGenerationJob(job),
    status: transition.status,
    lifecycle,
  };
}

function sortAssetGenerationJobsByWorkflowOrder(
  jobs: CampaignAssetGenerationJob[],
  workflowJobs: CampaignAssetGenerationJob[],
): CampaignAssetGenerationJob[] {
  const workflowOrder = new Map(
    workflowJobs.map((job, index) => [job.id, index] as const),
  );

  return [...jobs].sort(
    (left, right) =>
      (workflowOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (workflowOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function createAssetGenerationJobStatusSnapshots(
  jobs: CampaignAssetGenerationJob[],
  workflowJobs: CampaignAssetGenerationJob[],
  skippedJobIds: Set<CampaignAssetGenerationJob["id"]>,
): CampaignAssetGenerationJobStatusSnapshot[] {
  return sortAssetGenerationJobsByWorkflowOrder(jobs, workflowJobs).map(
    (job) => createAssetGenerationJobStatusSnapshot(job, skippedJobIds),
  );
}

function createAssetGenerationJobStatusSnapshot(
  job: CampaignAssetGenerationJob,
  skippedJobIds: Set<CampaignAssetGenerationJob["id"]>,
): CampaignAssetGenerationJobStatusSnapshot {
  const lifecycle = {
    ...EMPTY_ASSET_GENERATION_JOB_LIFECYCLE,
    ...job.lifecycle,
  };

  return {
    jobId: job.id,
    mediaType: job.mediaType,
    executionStatus: getAssetGenerationExecutionStatus(job, skippedJobIds),
    jobStatus: job.status,
    actor: lifecycle.actor,
    attempt: lifecycle.attempt,
    progress: lifecycle.progress,
    startedAt: lifecycle.startedAt,
    completedAt: lifecycle.completedAt,
    failedAt: lifecycle.failedAt,
    error: lifecycle.error,
    ...(lifecycle.failureDetails === null ||
    lifecycle.failureDetails === undefined
      ? {}
      : { failureDetails: { ...lifecycle.failureDetails } }),
  };
}

function createAssetGenerationExecutionRecords(
  jobs: CampaignAssetGenerationJob[],
  workflowJobs: CampaignAssetGenerationJob[],
  skippedJobIds: Set<CampaignAssetGenerationJob["id"]>,
  campaignId: CampaignDraft["id"],
  statusEventsByJobId: Map<
    CampaignAssetGenerationJob["id"],
    CampaignAssetGenerationExecutionStatusEvent[]
  >,
): CampaignAssetGenerationExecutionRecord[] {
  return sortAssetGenerationJobsByWorkflowOrder(jobs, workflowJobs)
    .filter((job) => !skippedJobIds.has(job.id))
    .map((job) =>
      createAssetGenerationExecutionRecord(
        job,
        skippedJobIds,
        campaignId,
        statusEventsByJobId.get(job.id) ?? [],
      ),
    );
}

function createAssetGenerationExecutionRecord(
  job: CampaignAssetGenerationJob,
  skippedJobIds: Set<CampaignAssetGenerationJob["id"]>,
  campaignId: CampaignDraft["id"],
  statusEvents: CampaignAssetGenerationExecutionStatusEvent[],
): CampaignAssetGenerationExecutionRecord {
  const lifecycle = {
    ...EMPTY_ASSET_GENERATION_JOB_LIFECYCLE,
    ...job.lifecycle,
  };
  const resultMetadata = job.resultMetadata ?? [];
  const createdAt = lifecycle.startedAt ?? lifecycle.updatedAt;

  return {
    id: createAssetGenerationExecutionRecordId(
      campaignId,
      job.id,
      lifecycle.attempt,
    ),
    campaignId,
    jobId: job.id,
    mediaType: job.mediaType,
    providerPluginId: job.providerPluginId,
    capabilityId: job.capabilityId,
    status: getAssetGenerationExecutionStatus(job, skippedJobIds),
    jobStatus: job.status,
    actor: lifecycle.actor,
    attempt: lifecycle.attempt,
    progress: lifecycle.progress,
    queuedAt: lifecycle.queuedAt,
    startedAt: lifecycle.startedAt,
    completedAt: lifecycle.completedAt,
    failedAt: lifecycle.failedAt,
    canceledAt: lifecycle.canceledAt,
    error: lifecycle.error,
    ...(lifecycle.failureDetails === null ||
    lifecycle.failureDetails === undefined
      ? {}
      : { failureDetails: { ...lifecycle.failureDetails } }),
    resultIds: resultMetadata.map((result) => result.id),
    assetIds: resultMetadata.map((result) => result.assetId),
    providerRequestIds: resultMetadata.map((result) => result.providerRequestId),
    outputs: resultMetadata.map((result) =>
      cloneCampaignAssetGenerationResultMetadata(result),
    ),
    statusEvents: statusEvents.map((event) => ({ ...event })),
    createdAt,
    updatedAt: lifecycle.updatedAt,
  };
}

function createAssetGenerationExecutionStatusEvent(
  snapshot: CampaignAssetGenerationJobStatusSnapshot,
  observedAt: string,
): CampaignAssetGenerationExecutionStatusEvent {
  return {
    status: snapshot.executionStatus,
    jobStatus: snapshot.jobStatus,
    progress: snapshot.progress,
    observedAt,
    error: snapshot.error,
    ...(snapshot.failureDetails === null ||
    snapshot.failureDetails === undefined
      ? {}
      : { failureDetails: { ...snapshot.failureDetails } }),
  };
}

function getAssetGenerationFailureDetails({
  error,
  job,
  attempt,
  failedAt,
}: {
  error: unknown;
  job: CampaignAssetGenerationJob;
  attempt: number;
  failedAt: string;
}): CampaignAssetGenerationFailureDetails {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      jobId: job.id,
      mediaType: job.mediaType,
      providerPluginId: job.providerPluginId,
      capabilityId: job.capabilityId,
      attempt,
      failedAt,
    };
  }

  return {
    name: "Error",
    message: String(error),
    stack: null,
    jobId: job.id,
    mediaType: job.mediaType,
    providerPluginId: job.providerPluginId,
    capabilityId: job.capabilityId,
    attempt,
    failedAt,
  };
}

function createAssetGenerationExecutionRecordId(
  campaignId: CampaignDraft["id"],
  jobId: CampaignAssetGenerationJob["id"],
  attempt: number,
): string {
  return `exec_${sanitizeAssetGenerationExecutionIdPart(
    campaignId,
  )}_${sanitizeAssetGenerationExecutionIdPart(jobId)}_${attempt}`;
}

function sanitizeAssetGenerationExecutionIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]+/g, "_");
}

function getAssetGenerationExecutionStatus(
  job: CampaignAssetGenerationJob,
  skippedJobIds: Set<CampaignAssetGenerationJob["id"]>,
): CampaignAssetGenerationExecutionStatus {
  if (skippedJobIds.has(job.id)) {
    return "skipped";
  }

  if (job.status === "failed") {
    return "failed";
  }

  if (job.status === "running") {
    return "running";
  }

  return "completed";
}

function serializeAssetGenerationJobStatusSnapshots(
  jobStatuses: CampaignAssetGenerationJobStatusSnapshot[],
): string {
  return jobStatuses
    .map((snapshot) => `${snapshot.jobId}=${snapshot.executionStatus}`)
    .join(",");
}

export function aggregateCampaignAssetGenerationWorkflowState(
  jobStatuses: CampaignAssetGenerationJobStatusSnapshot[],
  jobs: CampaignAssetGenerationJob[],
): CampaignAssetGenerationWorkflowState {
  const jobsById = new Map(jobs.map((job) => [job.id, job] as const));
  const completedJobIds = getAssetGenerationWorkflowJobIdsByStatus(
    jobStatuses,
    "completed",
  );
  const failedJobIds = getAssetGenerationWorkflowJobIdsByStatus(
    jobStatuses,
    "failed",
  );
  const skippedJobIds = getAssetGenerationWorkflowJobIdsByStatus(
    jobStatuses,
    "skipped",
  );
  const runningJobIds = getAssetGenerationWorkflowJobIdsByStatus(
    jobStatuses,
    "running",
  );
  const outputs = createAssetGenerationWorkflowOutputs(jobStatuses, jobsById);
  const errors = createAssetGenerationWorkflowErrors(jobStatuses, jobsById);
  const totalJobs = jobStatuses.length;
  const finishedJobs = completedJobIds.length + failedJobIds.length + skippedJobIds.length;

  return {
    status: getAssetGenerationWorkflowStatus({
      totalJobs,
      runningJobs: runningJobIds.length,
      completedJobs: completedJobIds.length,
      failedJobs: failedJobIds.length,
      skippedJobs: skippedJobIds.length,
    }),
    totalJobs,
    runningJobs: runningJobIds.length,
    completedJobs: completedJobIds.length,
    failedJobs: failedJobIds.length,
    skippedJobs: skippedJobIds.length,
    finishedJobs,
    percentComplete:
      totalJobs === 0 ? 0 : Math.round((finishedJobs / totalJobs) * 100),
    jobIds: jobStatuses.map((status) => status.jobId),
    completedJobIds,
    failedJobIds,
    skippedJobIds,
    assetIds: uniqueAssetGenerationWorkflowValues(
      outputs.map((output) => output.assetId),
    ),
    resultIds: uniqueAssetGenerationWorkflowValues(
      outputs.map((output) => output.resultId),
    ),
    providerRequestIds: uniqueAssetGenerationWorkflowValues(
      outputs.map((output) => output.providerRequestId),
    ),
    outputs,
    errors,
  };
}

function getAssetGenerationWorkflowJobIdsByStatus(
  jobStatuses: CampaignAssetGenerationJobStatusSnapshot[],
  status: CampaignAssetGenerationExecutionStatus,
): CampaignAssetGenerationJob["id"][] {
  return jobStatuses
    .filter((snapshot) => snapshot.executionStatus === status)
    .map((snapshot) => snapshot.jobId);
}

function createAssetGenerationWorkflowOutputs(
  jobStatuses: CampaignAssetGenerationJobStatusSnapshot[],
  jobsById: Map<CampaignAssetGenerationJob["id"], CampaignAssetGenerationJob>,
): CampaignAssetGenerationWorkflowOutput[] {
  const outputs: CampaignAssetGenerationWorkflowOutput[] = [];

  for (const snapshot of jobStatuses) {
    const job = jobsById.get(snapshot.jobId);

    if (job === undefined) {
      continue;
    }

    for (const result of job.resultMetadata ?? []) {
      outputs.push({
        jobId: job.id,
        mediaType: job.mediaType,
        resultId: result.id,
        assetId: result.assetId,
        uri: result.uri,
        mimeType: result.mimeType,
        providerRequestId: result.providerRequestId,
        generatedAt: result.generatedAt,
        ...(result.thumbnailUri === undefined
          ? {}
          : { thumbnailUri: result.thumbnailUri }),
      });
    }
  }

  return outputs;
}

function createAssetGenerationWorkflowErrors(
  jobStatuses: CampaignAssetGenerationJobStatusSnapshot[],
  jobsById: Map<CampaignAssetGenerationJob["id"], CampaignAssetGenerationJob>,
): CampaignAssetGenerationWorkflowError[] {
  return jobStatuses
    .filter(
      (snapshot) =>
        snapshot.executionStatus === "failed" && snapshot.error !== null,
    )
    .map((snapshot) => {
      const job = jobsById.get(snapshot.jobId);

      return {
        jobId: snapshot.jobId,
        mediaType: snapshot.mediaType,
        message: snapshot.error ?? "",
        ...(job === undefined
          ? {}
          : {
              providerPluginId: job.providerPluginId,
              capabilityId: job.capabilityId,
            }),
      };
    });
}

function uniqueAssetGenerationWorkflowValues<TValue>(values: TValue[]): TValue[] {
  return [...new Set(values)];
}

function getAssetGenerationWorkflowStatus(summary: {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  skippedJobs: number;
}): CampaignAssetGenerationWorkflowStatus {
  if (summary.totalJobs === 0) {
    return "empty";
  }

  if (summary.runningJobs > 0) {
    return "running";
  }

  if (summary.failedJobs > 0) {
    return summary.completedJobs > 0 ? "completed_with_errors" : "failed";
  }

  if (summary.completedJobs === summary.totalJobs) {
    return "completed";
  }

  return "skipped";
}

function mergeCampaignAssetGenerationJobs(
  currentJobs: CampaignAssetGenerationJob[],
  resultJobs: CampaignAssetGenerationJob[],
): CampaignAssetGenerationJob[] {
  const resultJobsById = new Map(
    resultJobs.map((job) => [job.id, cloneCampaignAssetGenerationJob(job)]),
  );
  const mergedJobs = currentJobs.map(
    (job) => resultJobsById.get(job.id) ?? cloneCampaignAssetGenerationJob(job),
  );
  const currentJobIds = new Set(currentJobs.map((job) => job.id));
  const appendedResultJobs = resultJobs
    .filter((job) => !currentJobIds.has(job.id))
    .map((job) => cloneCampaignAssetGenerationJob(job));

  return [...mergedJobs, ...appendedResultJobs];
}

function mergeCampaignAssetGenerationExecutionRecords(
  currentRecords: CampaignAssetGenerationExecutionRecord[],
  resultRecords: CampaignAssetGenerationExecutionRecord[],
): CampaignAssetGenerationExecutionRecord[] {
  const resultRecordsById = new Map(
    resultRecords.map((record) => [
      record.id,
      cloneCampaignAssetGenerationExecutionRecord(record),
    ]),
  );
  const mergedRecords = currentRecords.map(
    (record) =>
      resultRecordsById.get(record.id) ??
      cloneCampaignAssetGenerationExecutionRecord(record),
  );
  const currentRecordIds = new Set(currentRecords.map((record) => record.id));
  const appendedResultRecords = resultRecords
    .filter((record) => !currentRecordIds.has(record.id))
    .map((record) => cloneCampaignAssetGenerationExecutionRecord(record));

  return [...mergedRecords, ...appendedResultRecords];
}

function createGeneratedImageAssetsFromExecutionResult(
  executionResult: CampaignImageAssetGenerationExecutionResult,
  options: PersistCampaignImageAssetGenerationResultOptions,
): CampaignAsset[] {
  const assets: CampaignAsset[] = [];
  const seenAssetIds = new Set<string>();

  for (const job of executionResult.completedJobs) {
    for (const result of job.resultMetadata ?? []) {
      if (seenAssetIds.has(result.assetId)) {
        continue;
      }

      seenAssetIds.add(result.assetId);
      assets.push(
        createCampaignAsset(
          {
            id: result.assetId,
            source: "link",
            mediaType: "image",
            title: `Generated image ${result.assetId}`,
            uri: result.uri,
            usage: "generated",
            status: "ready",
            altText: `Generated image output from ${job.id}`,
            fileName: getFileNameFromUri(result.uri),
            mimeType: result.mimeType,
            sizeBytes: result.sizeBytes,
            rights: {
              owner: options.rightsOwner ?? "OwnCanvas generated output",
              license: options.rightsLicense ?? "campaign-use",
            },
            createdBy: options.createdBy ?? "agent",
            ...(result.storageReferences === undefined
              ? {}
              : {
                  storageReferences: cloneCampaignAssetStorageReferences(
                    result.storageReferences,
                  ),
                }),
            outputLocations: {
              primaryUri: result.uri,
              ...(result.thumbnailUri === undefined
                ? {}
                : { thumbnailUri: result.thumbnailUri }),
            },
            generatedMetadata: createCampaignGeneratedAssetMetadata(
              job,
              result,
              "image",
            ),
          },
          { now: () => result.generatedAt },
        ),
      );
    }
  }

  return assets;
}

function createGeneratedVideoAssetsFromExecutionResult(
  executionResult: CampaignVideoAssetGenerationExecutionResult,
  options: PersistCampaignVideoAssetGenerationResultOptions,
): CampaignAsset[] {
  const assets: CampaignAsset[] = [];
  const seenAssetIds = new Set<string>();

  for (const job of executionResult.completedJobs) {
    for (const result of job.resultMetadata ?? []) {
      if (seenAssetIds.has(result.assetId)) {
        continue;
      }

      seenAssetIds.add(result.assetId);
      assets.push(
        createCampaignAsset(
          {
            id: result.assetId,
            source: "link",
            mediaType: "video",
            title: `Generated video ${result.assetId}`,
            uri: result.uri,
            usage: "generated",
            status: "ready",
            altText: `Generated video output from ${job.id}`,
            fileName: getFileNameFromUri(result.uri),
            mimeType: result.mimeType,
            sizeBytes: result.sizeBytes,
            rights: {
              owner: options.rightsOwner ?? "OwnCanvas generated output",
              license: options.rightsLicense ?? "campaign-use",
            },
            createdBy: options.createdBy ?? "agent",
            ...(result.storageReferences === undefined
              ? {}
              : {
                  storageReferences: cloneCampaignAssetStorageReferences(
                    result.storageReferences,
                  ),
                }),
            outputLocations: {
              primaryUri: result.uri,
              ...(result.thumbnailUri === undefined
                ? {}
                : { thumbnailUri: result.thumbnailUri }),
            },
            generatedMetadata: createCampaignGeneratedAssetMetadata(
              job,
              result,
              "video",
            ),
          },
          { now: () => result.generatedAt },
        ),
      );
    }
  }

  return assets;
}

function createGeneratedAssetsFromExecutionResult(
  executionResult: CampaignAssetGenerationExecutionResult,
  options: PersistCampaignAssetGenerationResultOptions,
): CampaignAsset[] {
  const assets: CampaignAsset[] = [];
  const seenAssetIds = new Set<string>();

  for (const job of executionResult.completedJobs) {
    for (const result of job.resultMetadata ?? []) {
      if (seenAssetIds.has(result.assetId)) {
        continue;
      }

      seenAssetIds.add(result.assetId);
      assets.push(
        createCampaignAsset(
          {
            id: result.assetId,
            source: "link",
            mediaType: job.mediaType,
            title: `Generated ${job.mediaType} ${result.assetId}`,
            uri: result.uri,
            usage: "generated",
            status: "ready",
            altText: `Generated ${job.mediaType} output from ${job.id}`,
            fileName: getFileNameFromUri(result.uri),
            mimeType: result.mimeType,
            sizeBytes: result.sizeBytes,
            rights: {
              owner: options.rightsOwner ?? "OwnCanvas generated output",
              license: options.rightsLicense ?? "campaign-use",
            },
            createdBy: options.createdBy ?? "agent",
            ...(result.storageReferences === undefined
              ? {}
              : {
                  storageReferences: cloneCampaignAssetStorageReferences(
                    result.storageReferences,
                  ),
                }),
            outputLocations: {
              primaryUri: result.uri,
              ...(result.thumbnailUri === undefined
                ? {}
                : { thumbnailUri: result.thumbnailUri }),
            },
            generatedMetadata: createCampaignGeneratedAssetMetadata(
              job,
              result,
              job.mediaType,
            ),
          },
          { now: () => result.generatedAt },
        ),
      );
    }
  }

  return assets;
}

function createCampaignGeneratedAssetMetadata(
  job: CampaignAssetGenerationJob,
  result: CampaignAssetGenerationResultMetadata,
  mediaType: CampaignAssetGenerationMediaType,
): CampaignGeneratedAssetMetadata {
  return {
    jobId: job.id,
    resultId: result.id,
    assetId: result.assetId,
    mediaType,
    providerPluginId: job.providerPluginId,
    capabilityId: job.capabilityId,
    providerRequestId: result.providerRequestId,
    ...(result.storageReferences === undefined
      ? {}
      : {
          storageReferences: cloneCampaignAssetStorageReferences(
            result.storageReferences,
          ),
        }),
    outputUri: result.uri,
    ...(result.thumbnailUri === undefined
      ? {}
      : { thumbnailUri: result.thumbnailUri }),
    mimeType: result.mimeType,
    fileName: getFileNameFromUri(result.uri),
    sizeBytes: result.sizeBytes,
    model: result.model,
    promptHash: result.promptHash,
    seed: result.seed,
    generatedAt: result.generatedAt,
    durationMs: result.durationMs,
    costUsd: result.costUsd,
    finishReason: result.finishReason,
    dimensions: {
      width: result.width,
      height: result.height,
    },
    ...(result.durationSeconds === undefined
      ? {}
      : { durationSeconds: result.durationSeconds }),
    ...(result.frameRate === undefined ? {} : { frameRate: result.frameRate }),
    ...(result.codec === undefined ? {} : { codec: result.codec }),
    inputSources: job.requiredInputs.map((input) => input.source),
    outputTargets: job.outputTargets.map((target) => ({ ...target })),
  };
}

function cloneCampaignAssetGenerationResultMetadata(
  result: CampaignAssetGenerationResultMetadata,
): CampaignAssetGenerationResultMetadata {
  return {
    id: result.id,
    assetId: result.assetId,
    uri: result.uri,
    mimeType: result.mimeType,
    width: result.width,
    height: result.height,
    ...(result.durationSeconds === undefined
      ? {}
      : { durationSeconds: result.durationSeconds }),
    ...(result.frameRate === undefined ? {} : { frameRate: result.frameRate }),
    ...(result.codec === undefined ? {} : { codec: result.codec }),
    ...(result.thumbnailUri === undefined
      ? {}
      : { thumbnailUri: result.thumbnailUri }),
    sizeBytes: result.sizeBytes,
    model: result.model,
    seed: result.seed,
    promptHash: result.promptHash,
    providerRequestId: result.providerRequestId,
    ...(result.storageReferences === undefined
      ? {}
      : {
          storageReferences: cloneCampaignAssetStorageReferences(
            result.storageReferences,
          ),
        }),
    generatedAt: result.generatedAt,
    durationMs: result.durationMs,
    costUsd: result.costUsd,
    finishReason: result.finishReason,
  };
}

function cloneCampaignAssetStorageReferences(
  storageReferences: CampaignAssetStorageReference[],
): CampaignAssetStorageReference[] {
  return storageReferences.map((reference) => ({
    provider: reference.provider,
    bucket: reference.bucket,
    objectKey: reference.objectKey,
    publicUri: reference.publicUri,
    ...(reference.contentHash === undefined
      ? {}
      : { contentHash: reference.contentHash }),
  }));
}

function mergeGeneratedCampaignAssets(
  currentAssets: CampaignAsset[],
  generatedAssets: CampaignAsset[],
): {
  assets: CampaignAsset[];
  persistedAssetIds: string[];
} {
  const generatedAssetIds = new Set(generatedAssets.map((asset) => asset.id));
  const existingAssets = currentAssets.map((asset) => {
    const generatedAsset = generatedAssets.find(
      (candidate) => candidate.id === asset.id,
    );

    if (!generatedAsset) {
      return asset;
    }

    return {
      ...asset,
      source: generatedAsset.source,
      mediaType: generatedAsset.mediaType,
      uri: generatedAsset.uri,
      usage: "generated",
      status: "ready",
      mimeType: generatedAsset.mimeType,
      sizeBytes: generatedAsset.sizeBytes,
      fileName: generatedAsset.fileName,
      altText: asset.altText || generatedAsset.altText,
      outputLocations: generatedAsset.outputLocations,
      generatedMetadata: generatedAsset.generatedMetadata,
      storageReferences: generatedAsset.storageReferences,
      rights: {
        ...asset.rights,
        ...generatedAsset.rights,
      },
    } satisfies CampaignAsset;
  });
  const existingAssetIds = new Set(existingAssets.map((asset) => asset.id));
  const newGeneratedAssets = generatedAssets.filter(
    (asset) => !existingAssetIds.has(asset.id),
  );

  return {
    assets: [...existingAssets, ...newGeneratedAssets],
    persistedAssetIds: [...generatedAssetIds],
  };
}

function aggregateAssetGenerationStatusesIntoCanvasNodes(
  nodes: CampaignCanvasBlock[],
  jobStatuses: CampaignAssetGenerationJobStatusSnapshot[],
  jobs: CampaignAssetGenerationJob[] = [],
): CampaignCanvasBlock[] {
  const statusesByJobId = new Map(
    jobStatuses.map((status) => [status.jobId, status] as const),
  );
  const jobsById = new Map(jobs.map((job) => [job.id, job] as const));

  return nodes.map((node) => {
    const jobIds = getCanvasNodeAssetGenerationJobIds(node);
    const matchingStatuses = jobIds
      .map((jobId) => statusesByJobId.get(jobId))
      .filter(
        (status): status is CampaignAssetGenerationJobStatusSnapshot =>
          status !== undefined,
      );

    if (matchingStatuses.length === 0) {
      return node;
    }

    const completed = matchingStatuses.filter(
      (status) => status.executionStatus === "completed",
    ).length;
    const failed = matchingStatuses.filter(
      (status) => status.executionStatus === "failed",
    ).length;
    const aggregateStatus =
      failed > 0
        ? "failed"
        : completed === matchingStatuses.length
          ? "completed"
          : completed > 0
            ? "partial"
            : "skipped";
    const nextStatus =
      failed > 0
        ? "NEEDS INPUT"
        : aggregateStatus === "completed"
          ? "READY"
          : node.status;
    const matchingJobs = jobIds
      .map((jobId) => jobsById.get(jobId))
      .filter((job): job is CampaignAssetGenerationJob => job !== undefined);
    const assetIds: string[] = [];
    const resultIds: string[] = [];
    const outputLocations: {
      assetId: string;
      primaryUri: string;
      thumbnailUri?: string;
    }[] = [];

    for (const job of matchingJobs) {
      for (const result of job.resultMetadata ?? []) {
        if (!assetIds.includes(result.assetId)) {
          assetIds.push(result.assetId);
        }

        if (!resultIds.includes(result.id)) {
          resultIds.push(result.id);
        }

        if (
          !outputLocations.some(
            (location) =>
              location.assetId === result.assetId &&
              location.primaryUri === result.uri,
          )
        ) {
          outputLocations.push({
            assetId: result.assetId,
            primaryUri: result.uri,
            ...(result.thumbnailUri === undefined
              ? {}
              : { thumbnailUri: result.thumbnailUri }),
          });
        }
      }
    }

    return {
      ...node,
      status: nextStatus,
      properties: {
        ...node.properties,
        assetGeneration: {
          completed,
          failed,
          jobIds,
          status: aggregateStatus,
          ...(assetIds.length === 0 ? {} : { assetIds }),
          ...(resultIds.length === 0 ? {} : { resultIds }),
          ...(outputLocations.length === 0 ? {} : { outputLocations }),
        },
      },
    };
  });
}

function getCanvasNodeAssetGenerationJobIds(
  node: CampaignCanvasBlock,
): string[] {
  const properties = node.properties;

  if (!isRecord(properties)) {
    return [];
  }

  const jobIds = new Set<string>();
  const assetGenerationJobId = properties.assetGenerationJobId;
  const assetGenerationJobIds = properties.assetGenerationJobIds;
  const assetGeneration = properties.assetGeneration;

  if (
    typeof assetGenerationJobId === "string" &&
    assetGenerationJobId.trim() !== ""
  ) {
    jobIds.add(assetGenerationJobId);
  }

  if (Array.isArray(assetGenerationJobIds)) {
    for (const jobId of assetGenerationJobIds) {
      if (typeof jobId === "string" && jobId.trim() !== "") {
        jobIds.add(jobId);
      }
    }
  }

  if (isRecord(assetGeneration) && Array.isArray(assetGeneration.jobIds)) {
    for (const jobId of assetGeneration.jobIds) {
      if (typeof jobId === "string" && jobId.trim() !== "") {
        jobIds.add(jobId);
      }
    }
  }

  return [...jobIds];
}

function serializeAssetGenerationErrors(
  jobStatuses: CampaignAssetGenerationJobStatusSnapshot[],
): string {
  return jobStatuses
    .filter(
      (status) => status.executionStatus === "failed" && status.error !== null,
    )
    .map((status) => `${status.jobId}=${status.error}`)
    .join(",");
}

function getFileNameFromUri(uri: string): string {
  try {
    const parsedUrl = new URL(uri);
    const fileName = parsedUrl.pathname.split("/").filter(Boolean).at(-1);

    return fileName ?? "";
  } catch {
    const fileName = uri.split("/").filter(Boolean).at(-1);

    return fileName ?? "";
  }
}

function validateExplicitCanvasEdgePorts(
  edge: Extract<
    CampaignCanvasEditAction,
    { type: "canvas.edge.connect" }
  >["edge"],
) {
  if (edge.sourcePort.trim() === "" || edge.targetPort.trim() === "") {
    throw new Error(
      "Invalid campaign canvas edit action: canvas.edge.connect requires sourcePort and targetPort.",
    );
  }
}

function normalizeGenerationBlockContracts(
  contracts: unknown,
  fallbackContracts: GenerationBlockDefinition["contracts"],
): GenerationBlockContract[] {
  if (!Array.isArray(contracts)) {
    return fallbackContracts.map((contract) => ({ ...contract }));
  }

  return contracts.map((contract, contractIndex) => {
    const fallbackContract =
      fallbackContracts[contractIndex] ??
      ({
        label: "",
        value: "",
        state: "OPTIONAL",
      } satisfies GenerationBlockContract);

    if (!isRecord(contract)) {
      return { ...fallbackContract };
    }

    return {
      label:
        typeof contract.label === "string"
          ? contract.label
          : fallbackContract.label,
      value:
        typeof contract.value === "string"
          ? contract.value
          : fallbackContract.value,
      state: isGenerationBlockContractState(contract.state)
        ? contract.state
        : fallbackContract.state,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSupportedShortFormEmbedConfiguration(
  provider: Pick<
    CampaignLandingPageTemplateShortFormProviderMetadata,
    "sourcePlatform" | "sourceType" | "embedMode" | "sourceUrl"
  >,
): { previewSurface: CampaignEmbeddedShortFormPreviewSurface } | null {
  if (!isSupportedShortFormSourcePlatform(provider.sourcePlatform)) {
    return null;
  }

  if (
    provider.sourcePlatform === "instagram" ||
    provider.sourcePlatform === "tiktok" ||
    provider.sourcePlatform === "youtube"
  ) {
    if (
      provider.sourceType !== "social-post" ||
      !isSupportedShortFormSourceUrl(provider.sourcePlatform, provider.sourceUrl)
    ) {
      return null;
    }

    if (provider.embedMode === "oembed") {
      return { previewSurface: "social-oembed" };
    }

    if (provider.embedMode === "iframe") {
      return { previewSurface: "social-iframe" };
    }

    return null;
  }

  if (provider.sourcePlatform === "owncanvas") {
    if (
      provider.sourceType !== "generated-asset" &&
      provider.sourceType !== "uploaded-asset"
    ) {
      return null;
    }

    if (provider.embedMode === "native-player") {
      return { previewSurface: "native-video" };
    }

    if (provider.embedMode === "asset-render") {
      return { previewSurface: "asset-render" };
    }

    return null;
  }

  if (provider.sourcePlatform === "custom") {
    if (provider.sourceType === "external-url" && provider.embedMode === "iframe") {
      return { previewSurface: "custom-iframe" };
    }

    return null;
  }

  return null;
}

function isSupportedShortFormSourcePlatform(
  sourcePlatform: unknown,
): sourcePlatform is CampaignLandingPageTemplateSourcePlatform {
  return (
    sourcePlatform === "instagram" ||
    sourcePlatform === "tiktok" ||
    sourcePlatform === "youtube" ||
    sourcePlatform === "owncanvas" ||
    sourcePlatform === "custom"
  );
}

function isSupportedShortFormSourceUrl(
  sourcePlatform: CampaignLandingPageTemplateSourcePlatform,
  sourceUrl: string,
): boolean {
  let url: URL;

  try {
    url = new URL(sourceUrl);
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  if (sourcePlatform === "instagram") {
    return hostname === "instagram.com" || hostname.endsWith(".instagram.com");
  }

  if (sourcePlatform === "tiktok") {
    return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com");
  }

  if (sourcePlatform === "youtube") {
    return (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtu.be"
    );
  }

  return true;
}

function normalizeCampaignLandingPageNavigationConfiguration(
  navigation?: CampaignLandingPageNavigationConfiguration,
): CampaignLandingPageNavigationConfiguration {
  return {
    visibility: navigation?.visibility ?? "hidden",
    placement: navigation?.placement ?? "top-overlay",
    timing: navigation?.timing ?? "manual",
    interruptionBehavior: navigation?.interruptionBehavior ?? "non-blocking",
  };
}

function normalizeCampaignLandingPageBehaviorConfiguration(
  behavior?: CampaignLandingPageBehaviorConfiguration,
): CampaignLandingPageBehaviorConfiguration {
  if (behavior !== undefined) {
    return { ...behavior };
  }

  return {
    mode: "immersion-preserving",
    preserveInlineContext: true,
    allowTraditionalRedirect: false,
  };
}

export function createCampaignLandingPageBehaviorConfiguration(
  mode: CampaignLandingPageBehaviorMode,
): CampaignLandingPageBehaviorConfiguration {
  if (mode === "traditional") {
    return {
      mode,
      preserveInlineContext: false,
      allowTraditionalRedirect: true,
    };
  }

  return {
    mode: "immersion-preserving",
    preserveInlineContext: true,
    allowTraditionalRedirect: false,
  };
}

export function getCampaignLandingPageBehaviorConfiguration(
  campaign: Pick<CampaignDraft, "campaignSpec">,
): CampaignLandingPageBehaviorConfiguration {
  return normalizeCampaignLandingPageBehaviorConfiguration(
    campaign.campaignSpec.landingPageTemplate?.behavior ??
      campaign.campaignSpec.landingPageBehavior,
  );
}

export function setCampaignLandingPageBehaviorMode<TCampaign extends CampaignDraft>(
  campaign: TCampaign,
  mode: CampaignLandingPageBehaviorMode,
): TCampaign {
  const behavior = createCampaignLandingPageBehaviorConfiguration(mode);

  return {
    ...campaign,
    campaignSpec: {
      ...campaign.campaignSpec,
      landingPageBehavior: behavior,
      ...(campaign.campaignSpec.landingPageTemplate === undefined
        ? {}
        : {
            landingPageTemplate: {
              ...campaign.campaignSpec.landingPageTemplate,
              behavior,
            },
          }),
    },
  };
}

export function getCampaignLandingPageNavigationConfiguration(
  campaign: Pick<CampaignDraft, "campaignSpec">,
): CampaignLandingPageNavigationConfiguration {
  return normalizeCampaignLandingPageNavigationConfiguration(
    campaign.campaignSpec.landingPageTemplate?.navigation ??
      campaign.campaignSpec.landingPageNavigation,
  );
}

export function getCampaignLandingPageConversionElements(
  campaign: Pick<CampaignDraft, "campaignSpec">,
): CampaignLandingPageConversionElementConfiguration[] {
  return normalizeCampaignLandingPageConversionElements(
    campaign.campaignSpec.landingPageTemplate?.conversionElements ??
      campaign.campaignSpec.landingPageConversionElements,
  );
}

export function setCampaignLandingPageAuthoringControls<
  TCampaign extends CampaignDraft,
>(
  campaign: TCampaign,
  controls: {
    navigation?: CampaignLandingPageNavigationConfiguration;
    conversionElements?: CampaignLandingPageConversionElementConfiguration[];
  },
): TCampaign {
  const navigation =
    controls.navigation === undefined
      ? campaign.campaignSpec.landingPageNavigation
      : normalizeCampaignLandingPageNavigationConfiguration(
          controls.navigation,
        );
  const conversionElements =
    controls.conversionElements === undefined
      ? campaign.campaignSpec.landingPageConversionElements
      : normalizeCampaignLandingPageConversionElements(
          controls.conversionElements,
        );

  return {
    ...campaign,
    campaignSpec: {
      ...campaign.campaignSpec,
      ...(navigation === undefined ? {} : { landingPageNavigation: navigation }),
      ...(conversionElements === undefined
        ? {}
        : { landingPageConversionElements: conversionElements }),
      ...(campaign.campaignSpec.landingPageTemplate === undefined
        ? {}
        : {
            landingPageTemplate: {
              ...campaign.campaignSpec.landingPageTemplate,
              ...(navigation === undefined ? {} : { navigation }),
              ...(conversionElements === undefined
                ? {}
                : { conversionElements }),
            },
          }),
    },
  };
}

function normalizeCampaignLandingPageConversionElements(
  conversionElements?: CampaignLandingPageConversionElementConfiguration[],
): CampaignLandingPageConversionElementConfiguration[] {
  return (conversionElements ?? []).map((element) => ({ ...element }));
}

function validateCampaignLandingPageBehaviorConfiguration(
  behavior: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (behavior === undefined) {
    return;
  }

  if (
    !isRecord(behavior) ||
    !isCampaignLandingPageBehaviorMode(behavior.mode) ||
    typeof behavior.preserveInlineContext !== "boolean" ||
    typeof behavior.allowTraditionalRedirect !== "boolean" ||
    (behavior.mode === "immersion-preserving" &&
      (!behavior.preserveInlineContext || behavior.allowTraditionalRedirect)) ||
    (behavior.mode === "traditional" &&
      (behavior.preserveInlineContext || !behavior.allowTraditionalRedirect))
  ) {
    errors.push({
      code: "landing-template.behavior_configuration_invalid",
      path,
      message:
        "Landing behavior must select immersion-preserving or traditional behavior with matching redirect and inline-context flags.",
    });
  }
}

function validateCampaignLandingPageNavigationConfiguration(
  navigation: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (navigation === undefined) {
    return;
  }

  if (
    !isRecord(navigation) ||
    !isCampaignLandingPageElementVisibility(navigation.visibility) ||
    !isCampaignLandingPageNavigationPlacement(navigation.placement) ||
    !isCampaignLandingPageElementTiming(navigation.timing) ||
    !isCampaignLandingPagePlaybackInterruptionBehavior(
      navigation.interruptionBehavior,
    )
  ) {
    errors.push({
      code: "landing-template.navigation_configuration_invalid",
      path,
      message:
        "Landing navigation must define valid visibility, placement, timing, and playback interruption behavior.",
    });
  }
}

function validateCampaignLandingPageConversionElements(
  conversionElements: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (conversionElements === undefined) {
    return;
  }

  if (!Array.isArray(conversionElements)) {
    errors.push({
      code: "landing-template.conversion_element_invalid",
      path,
      message: "Landing conversion elements must be an array.",
    });
    return;
  }

  conversionElements.forEach((element, elementIndex) => {
    const elementPath = `${path}.${elementIndex}`;

    if (
      !isRecord(element) ||
      typeof element.id !== "string" ||
      element.id.trim() === "" ||
      typeof element.label !== "string" ||
      element.label.trim() === "" ||
      typeof element.conversionEventName !== "string" ||
      element.conversionEventName.trim() === "" ||
      typeof element.destinationUrl !== "string" ||
      !isHttpUrl(element.destinationUrl) ||
      !isCampaignLandingPageElementVisibility(element.visibility) ||
      !isCampaignLandingPageConversionElementPlacement(element.placement) ||
      !isCampaignLandingPageElementTiming(element.timing) ||
      !isCampaignLandingPagePlaybackInterruptionBehavior(
        element.interruptionBehavior,
      )
    ) {
      errors.push({
        code: "landing-template.conversion_element_invalid",
        path: elementPath,
        message:
          "Landing conversion elements must define valid identity, destination, visibility, placement, timing, and playback interruption behavior.",
      });
    }
  });
}

function isCampaignLandingPageElementVisibility(
  value: unknown,
): value is CampaignLandingPageElementVisibility {
  return value === "visible" || value === "hidden" || value === "conditional";
}

function isCampaignLandingPageElementTiming(
  value: unknown,
): value is CampaignLandingPageElementTiming {
  return (
    value === "before-playback" ||
    value === "during-playback" ||
    value === "after-playback-start" ||
    value === "after-playback-complete" ||
    value === "manual"
  );
}

function isCampaignLandingPagePlaybackInterruptionBehavior(
  value: unknown,
): value is CampaignLandingPagePlaybackInterruptionBehavior {
  return (
    value === "non-blocking" ||
    value === "pause-on-activate" ||
    value === "block-until-complete"
  );
}

function isCampaignLandingPageBehaviorMode(
  value: unknown,
): value is CampaignLandingPageBehaviorMode {
  return value === "immersion-preserving" || value === "traditional";
}

function isCampaignLandingPageNavigationPlacement(
  value: unknown,
): value is CampaignLandingPageNavigationPlacement {
  return (
    value === "top-overlay" ||
    value === "bottom-overlay" ||
    value === "inline"
  );
}

function isCampaignLandingPageConversionElementPlacement(
  value: unknown,
): value is CampaignLandingPageConversionElementPlacement {
  return (
    value === "sticky-bottom" ||
    value === "inline" ||
    value === "side-panel" ||
    value === "end-card"
  );
}

function validateCampaignLandingPageTemplateModule(
  module: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
  moduleIds: ReadonlySet<string>,
) {
  if (!isRecord(module)) {
    errors.push({
      code: "landing-template.module_type_invalid",
      path,
      message: "Landing page template modules must be objects.",
    });
    return;
  }

  if (typeof module.id !== "string" || module.id.trim() === "") {
    errors.push({
      code: "landing-template.module_id_required",
      path: `${path}.id`,
      message: "Landing page template module id is required.",
    });
  }

  if (
    module.type === "embedded-short-form-content" &&
    module.blockType === "short-form-embed"
  ) {
    validateCampaignLandingPageTemplateProviderMetadata(
      module.provider,
      `${path}.provider`,
      errors,
    );
    validateCampaignLandingPageTemplateModuleConfiguration(
      module.configuration,
      `${path}.configuration`,
      errors,
    );
    return;
  }

  if (
    module.type === "inline-short-form-continuation" &&
    module.blockType === "short-form-continuation"
  ) {
    validateCampaignLandingPageTemplateInlineContinuationModule(
      module,
      path,
      errors,
      moduleIds,
    );
    return;
  }

  errors.push({
    code: "landing-template.module_type_invalid",
    path: `${path}.type`,
    message:
      "Landing page template modules must use a supported short-form block type.",
  });
}

function validateCampaignLandingPageTemplateProviderMetadata(
  provider: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (!isRecord(provider)) {
    errors.push({
      code: "landing-template.provider_plugin_id_required",
      path: `${path}.providerPluginId`,
      message: "Embedded short-form modules require provider metadata.",
    });
    return;
  }

  if (
    typeof provider.providerPluginId !== "string" ||
    provider.providerPluginId.trim() === ""
  ) {
    errors.push({
      code: "landing-template.provider_plugin_id_required",
      path: `${path}.providerPluginId`,
      message:
        "Embedded short-form modules require a provider plugin id for rendering.",
    });
  }

  if (provider.providerKind !== "built-in" && provider.providerKind !== "external") {
    errors.push({
      code: "landing-template.provider_kind_invalid",
      path: `${path}.providerKind`,
      message: "Embedded short-form provider kind must be built-in or external.",
    });
  }

  if (
    typeof provider.sourcePlatform !== "string" ||
    provider.sourcePlatform.trim() === ""
  ) {
    errors.push({
      code: "landing-template.source_platform_required",
      path: `${path}.sourcePlatform`,
      message: "Embedded short-form modules require source platform metadata.",
    });
  } else if (!isSupportedShortFormSourcePlatform(provider.sourcePlatform)) {
    errors.push({
      code: "landing-template.source_platform_unsupported",
      path: `${path}.sourcePlatform`,
      message:
        "Embedded short-form source platform is not supported for short-form previews.",
    });
  }

  if (
    provider.sourceType !== "social-post" &&
    provider.sourceType !== "generated-asset" &&
    provider.sourceType !== "uploaded-asset" &&
    provider.sourceType !== "external-url"
  ) {
    errors.push({
      code: "landing-template.source_type_invalid",
      path: `${path}.sourceType`,
      message: "Embedded short-form source type is not supported.",
    });
  }

  if (
    typeof provider.sourceContentId !== "string" ||
    provider.sourceContentId.trim() === ""
  ) {
    errors.push({
      code: "landing-template.source_content_id_required",
      path: `${path}.sourceContentId`,
      message:
        "Embedded short-form modules require a stable source content id.",
    });
  }

  if (typeof provider.sourceUrl !== "string" || !isHttpUrl(provider.sourceUrl)) {
    errors.push({
      code: "landing-template.source_url_invalid",
      path: `${path}.sourceUrl`,
      message: "Embedded short-form source URL must be a valid http or https URL.",
    });
  }

  if (
    provider.embedMode !== "oembed" &&
    provider.embedMode !== "iframe" &&
    provider.embedMode !== "native-player" &&
    provider.embedMode !== "asset-render"
  ) {
    errors.push({
      code: "landing-template.embed_mode_invalid",
      path: `${path}.embedMode`,
      message: "Embedded short-form embed mode is not supported.",
    });
  }

  if (
    isSupportedShortFormSourcePlatform(provider.sourcePlatform) &&
    typeof provider.sourceUrl === "string" &&
    isHttpUrl(provider.sourceUrl) &&
    (provider.sourceType === "social-post" ||
      provider.sourceType === "generated-asset" ||
      provider.sourceType === "uploaded-asset" ||
      provider.sourceType === "external-url") &&
    (provider.embedMode === "oembed" ||
      provider.embedMode === "iframe" ||
      provider.embedMode === "native-player" ||
      provider.embedMode === "asset-render")
  ) {
    const supportedConfiguration = getSupportedShortFormEmbedConfiguration({
      sourcePlatform: provider.sourcePlatform,
      sourceType: provider.sourceType,
      sourceUrl: provider.sourceUrl,
      embedMode: provider.embedMode,
    });

    if (supportedConfiguration === null) {
      errors.push({
        code: isSupportedShortFormSourceUrl(
          provider.sourcePlatform,
          provider.sourceUrl,
        )
          ? "landing-template.embed_configuration_unsupported"
          : "landing-template.source_url_unsupported",
        path: `${path}.sourceUrl`,
        message:
          "Embedded short-form source URL and embed mode must match a supported preview configuration.",
      });
    }
  }
}

function validateCampaignLandingPageTemplateModuleConfiguration(
  configuration: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (!isRecord(configuration)) {
    errors.push({
      code: "landing-template.configuration_invalid",
      path,
      message: "Embedded short-form module configuration is required.",
    });
    return;
  }

  const booleanFields = [
    "autoplay",
    "muted",
    "loop",
    "showCaptions",
    "preserveSourceChrome",
  ];
  const hasInvalidBooleanField = booleanFields.some(
    (field) => typeof configuration[field] !== "boolean",
  );
  const validAspectRatios = ["9:16", "1:1", "16:9", "4:5"];
  const hasInvalidMaxDuration =
    configuration.maxDurationSeconds !== undefined &&
    (typeof configuration.maxDurationSeconds !== "number" ||
      !Number.isFinite(configuration.maxDurationSeconds) ||
      configuration.maxDurationSeconds <= 0);

  if (
    hasInvalidBooleanField ||
    !validAspectRatios.includes(String(configuration.aspectRatio)) ||
    hasInvalidMaxDuration
  ) {
    errors.push({
      code: "landing-template.configuration_invalid",
      path,
      message:
        "Embedded short-form module configuration must include valid playback options.",
    });
  }
}

function validateCampaignLandingPageTemplateInlineContinuationModule(
  module: Record<string, unknown>,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
  moduleIds: ReadonlySet<string>,
) {
  if (typeof module.sourceModuleId !== "string" || module.sourceModuleId.trim() === "") {
    errors.push({
      code: "landing-template.inline_source_module_id_required",
      path: `${path}.sourceModuleId`,
      message:
        "Inline short-form continuation modules require the source embedded module id.",
    });
  } else if (!moduleIds.has(module.sourceModuleId)) {
    errors.push({
      code: "landing-template.inline_source_module_missing",
      path: `${path}.sourceModuleId`,
      message:
        "Inline short-form continuation source module must exist in the same landing template.",
    });
  }

  validateCampaignLandingPageTemplateInlineContinuationBehavior(
    module.continuationBehavior,
    `${path}.continuationBehavior`,
    errors,
  );
  validateCampaignLandingPageTemplateInlineContinuationSegments(
    module.segments,
    `${path}.segments`,
    errors,
  );
  validateCampaignLandingPageTemplateInlineContinuationCta(
    module.cta,
    `${path}.cta`,
    errors,
  );
  validateCampaignLandingPageTemplateInlineContinuationConfiguration(
    module.configuration,
    `${path}.configuration`,
    errors,
  );
}

function validateCampaignLandingPageTemplateInlineContinuationBehavior(
  behavior: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (!isRecord(behavior)) {
    errors.push({
      code: "landing-template.inline_continuation_requires_same_page",
      path,
      message:
        "Inline short-form continuation modules require same-page continuation behavior.",
    });
    return;
  }

  const validTrigger =
    behavior.trigger === "after-source-engagement" ||
    behavior.trigger === "after-source-complete" ||
    behavior.trigger === "manual";
  const validTransition =
    behavior.transitionStyle === "snap" ||
    behavior.transitionStyle === "scroll" ||
    behavior.transitionStyle === "story";

  if (
    behavior.consumptionSurface !== "same-page" ||
    behavior.navigationPolicy !== "inline-only" ||
    behavior.requiresSeparatePage !== false ||
    !validTrigger ||
    !validTransition
  ) {
    errors.push({
      code: "landing-template.inline_continuation_requires_same_page",
      path,
      message:
        "Inline short-form continuation must be consumed on the same page without separate navigation.",
    });
  }
}

function validateCampaignLandingPageTemplateInlineContinuationSegments(
  segments: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (!Array.isArray(segments) || segments.length === 0) {
    errors.push({
      code: "landing-template.inline_continuation_segment_required",
      path,
      message:
        "Inline short-form continuation modules require at least one continuation segment.",
    });
    return;
  }

  segments.forEach((segment, index) => {
    const segmentPath = `${path}.${index}`;
    const validMediaTypes = ["video", "image", "text"];

    if (
      !isRecord(segment) ||
      typeof segment.id !== "string" ||
      segment.id.trim() === "" ||
      !validMediaTypes.includes(String(segment.mediaType)) ||
      typeof segment.headline !== "string" ||
      segment.headline.trim() === "" ||
      typeof segment.trackingEventName !== "string" ||
      segment.trackingEventName.trim() === ""
    ) {
      errors.push({
        code: "landing-template.inline_continuation_segment_invalid",
        path: segmentPath,
        message:
          "Inline short-form continuation segments require id, media type, headline, and tracking event name.",
      });
    }
  });
}

function validateCampaignLandingPageTemplateInlineContinuationCta(
  cta: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (!isRecord(cta)) {
    errors.push({
      code: "landing-template.inline_continuation_cta_required",
      path,
      message:
        "Inline short-form continuation modules require a conversion call-to-action.",
    });
    return;
  }

  if (
    typeof cta.label !== "string" ||
    cta.label.trim() === "" ||
    typeof cta.conversionEventName !== "string" ||
    cta.conversionEventName.trim() === ""
  ) {
    errors.push({
      code: "landing-template.inline_continuation_cta_required",
      path,
      message:
        "Inline short-form continuation CTA requires label and conversion event name.",
    });
  }

  if (typeof cta.url !== "string" || !isHttpUrl(cta.url)) {
    errors.push({
      code: "landing-template.inline_continuation_cta_url_invalid",
      path: `${path}.url`,
      message:
        "Inline short-form continuation CTA URLs must use http or https.",
    });
  }
}

function validateCampaignLandingPageTemplateInlineContinuationConfiguration(
  configuration: unknown,
  path: string,
  errors: CampaignLandingPageTemplateValidationError[],
) {
  if (!isRecord(configuration)) {
    errors.push({
      code: "landing-template.configuration_invalid",
      path,
      message: "Inline short-form continuation configuration is required.",
    });
    return;
  }

  const validTransition =
    configuration.transitionStyle === "snap" ||
    configuration.transitionStyle === "scroll" ||
    configuration.transitionStyle === "story";

  if (
    typeof configuration.maxSegments !== "number" ||
    !Number.isFinite(configuration.maxSegments) ||
    configuration.maxSegments <= 0 ||
    !validTransition ||
    typeof configuration.conversionEventName !== "string" ||
    configuration.conversionEventName.trim() === "" ||
    configuration.preserveInlineContext !== true
  ) {
    errors.push({
      code: "landing-template.configuration_invalid",
      path,
      message:
        "Inline short-form continuation configuration must preserve inline context with valid limits and conversion metadata.",
    });
  }
}

function sortJsonObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonObjectKeysDeep(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((sortedValue, key) => {
      sortedValue[key] = sortJsonObjectKeysDeep(value[key]);
      return sortedValue;
    }, {});
}

function isGenerationBlockKind(value: unknown): value is GenerationBlockKind {
  return (
    value === "text" ||
    value === "llm" ||
    value === "image" ||
    value === "video" ||
    value === "voice" ||
    value === "agent" ||
    value === "dm" ||
    value === "landing" ||
    value === "custom"
  );
}

function resolveCampaignCanvasNodeKind(
  node: Record<string, unknown>,
): GenerationBlockKind | undefined {
  if (isGenerationBlockKind(node.kind)) {
    return node.kind;
  }

  if (isGenerationBlockKind(node.type)) {
    return node.type;
  }

  return undefined;
}

function isGenerationBlockTone(value: unknown): value is GenerationBlockTone {
  return (
    value === "ink" ||
    value === "blue" ||
    value === "violet" ||
    value === "green"
  );
}

function isGenerationBlockStatus(
  value: unknown,
): value is CampaignCanvasBlock["status"] {
  return value === "READY" || value === "DRAFT" || value === "NEEDS INPUT";
}

function isGenerationBlockContractState(
  value: unknown,
): value is GenerationBlockContract["state"] {
  return (
    value === "READY" ||
    value === "OPTIONAL" ||
    value === "WAITING" ||
    value === "BYO"
  );
}

export function createCampaignTargetAudience(
  values: Partial<CampaignTargetAudience> = {},
): CampaignTargetAudience {
  return {
    age: values.age ?? "",
    gender: values.gender ?? "",
    interests: values.interests ?? "",
    behavior: values.behavior ?? "",
    region: values.region ?? "",
    platform: values.platform ?? "",
  };
}

export function createCampaignMeasurementGoal(
  input: CampaignMeasurementGoalInput,
): CampaignMeasurementGoal {
  return {
    id: input.id ?? `measurement_goal_${Date.now()}`,
    name: input.name,
    target: input.target ?? null,
    unit: input.unit,
    successCriteria: input.successCriteria,
    reportingTimeframe: {
      startsAt: input.reportingTimeframe.startsAt,
      endsAt: input.reportingTimeframe.endsAt,
      timezone: input.reportingTimeframe.timezone ?? "UTC",
    },
  };
}

export function createCampaignMeasurementMetric(
  input: CampaignMeasurementMetricInput,
): CampaignMeasurementMetric {
  return {
    id: input.id ?? `measurement_metric_${Date.now()}`,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    source: input.source,
    attributionTouchpoint: input.attributionTouchpoint,
    observedAt: input.observedAt,
  };
}

export function getCampaignMeasurementCycleCompletion(
  campaign: Pick<CampaignRecord, "tracking">,
): CampaignMeasurementCycleCompletion {
  const completedCycles = (campaign.tracking.measurementCycles ?? []).filter(
    (cycle) => cycle.status === "completed" && cycle.resultCount > 0,
  );
  const latestCompletedCycle = completedCycles
    .slice()
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt))
    .at(-1);

  return {
    schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
    hasCompletedMeasurementCycle: latestCompletedCycle !== undefined,
    completedCycleCount: completedCycles.length,
    ...(latestCompletedCycle === undefined ? {} : { latestCompletedCycle }),
  };
}

export function hasCampaignCompletedMeasurementCycle(
  campaign: Pick<CampaignRecord, "tracking">,
) {
  return getCampaignMeasurementCycleCompletion(campaign)
    .hasCompletedMeasurementCycle;
}

export function hasCampaignCompletedMeasurementCycleWithCriteria(
  campaign: Pick<CampaignRecord, "tracking">,
) {
  const measurementGoalIds = new Set(
    (campaign.tracking.measurementGoals ?? [])
      .map((goal) => goal.id)
      .filter((goalId) => goalId.trim() !== ""),
  );

  if (measurementGoalIds.size === 0) {
    return false;
  }

  return (campaign.tracking.measurementCycles ?? []).some(
    (cycle) =>
      cycle.status === "completed" &&
      cycle.resultCount > 0 &&
      cycle.goalIds.some((goalId) => measurementGoalIds.has(goalId)),
  );
}

export function validateCampaignCompletion(
  campaign: Pick<CampaignRecord, "status" | "tracking">,
): CampaignCompletionValidationResult {
  if (campaign.status !== "completed") {
    return { valid: true, errors: [] };
  }

  const errors: CampaignCompletionValidationError[] = [];
  const hasCompletedMeasurementCycle =
    hasCampaignCompletedMeasurementCycle(campaign);
  const hasCompletedMeasurementCriteria =
    hasCompletedMeasurementCycle &&
    hasCampaignCompletedMeasurementCycleWithCriteria(campaign);

  if (!hasCompletedMeasurementCycle) {
    errors.push({
      code: "campaign_completion.measurement_record_required",
      path: "tracking.measurementCycles",
      message:
        "Campaign completion requires at least one completed measurement record.",
    });
  }

  if (hasCompletedMeasurementCycle && !hasCompletedMeasurementCriteria) {
    errors.push({
      code: "campaign_completion.measurement_criteria_required",
      path: "tracking.measurementGoals",
      message:
        "Campaign completion requires at least one measurement goal tied to the completed measurement cycle.",
    });
  }

  if (
    !getCampaignMeasurementBasedImprovementStatus(campaign)
      .hasCompletedMeasurementBasedImprovementCycle
  ) {
    errors.push({
      code: "campaign_completion.improvement_record_required",
      path: "tracking.improvementActions",
      message:
        "Campaign completion requires at least one completed improvement record.",
    });
  }

  if (
    hasCompletedMeasurementCriteria &&
    getCampaignMeasurementBasedImprovementStatus(campaign)
      .hasCompletedMeasurementBasedImprovementCycle &&
    !hasCampaignCompletedImprovementWithCriteria(campaign)
  ) {
    errors.push({
      code: "campaign_completion.improvement_criteria_required",
      path: "tracking.improvementActions",
      message:
        "Campaign completion requires at least one completed improvement tied to the required measurement criteria.",
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return { valid: true, errors: [] };
}

export function hasCampaignCompletedImprovementWithCriteria(
  campaign: Pick<CampaignRecord, "tracking">,
) {
  const measurementGoalIds = new Set(
    (campaign.tracking.measurementGoals ?? [])
      .map((goal) => goal.id)
      .filter((goalId) => goalId.trim() !== ""),
  );

  if (measurementGoalIds.size === 0) {
    return false;
  }

  const completedMeasurementCyclesById = new Map(
    (campaign.tracking.measurementCycles ?? [])
      .filter((cycle) => cycle.status === "completed" && cycle.resultCount > 0)
      .map((cycle) => [cycle.id, cycle]),
  );

  return (campaign.tracking.improvementActions ?? []).some((action) => {
    const sourceCycle = completedMeasurementCyclesById.get(
      action.sourceMeasurementCycleId,
    );

    if (
      !hasImprovementActionUsedSourceMeasurementResults(action, sourceCycle)
    ) {
      return false;
    }

    const sourceCycleGoalIds = new Set(sourceCycle?.goalIds ?? []);

    return action.goalIds.some(
      (goalId) =>
        measurementGoalIds.has(goalId) && sourceCycleGoalIds.has(goalId),
    );
  });
}

export function createCampaignImprovementActionsFromMeasurement(input: {
  measurementGoals: CampaignMeasurementGoal[];
  measurementCycles: CampaignMeasurementCycle[];
  primarySuccessMetric: string;
}): CampaignImprovementAction[] {
  return input.measurementCycles
    .filter((cycle) => cycle.status === "completed" && cycle.resultCount > 0)
    .map((cycle) =>
      createCampaignImprovementActionFromMeasurementCycle({
        cycle,
        measurementGoals: input.measurementGoals,
        primarySuccessMetric: input.primarySuccessMetric,
      }),
    );
}

export function getCampaignMeasurementBasedImprovementStatus(
  campaign: Pick<CampaignRecord, "tracking">,
): CampaignMeasurementBasedImprovementStatus {
  const completedMeasurementCycles = (campaign.tracking.measurementCycles ?? [])
    .filter((cycle) => cycle.status === "completed" && cycle.resultCount > 0);
  const completedMeasurementCyclesById = new Map(
    completedMeasurementCycles.map((cycle) => [cycle.id, cycle]),
  );
  const completedMeasurementCycleIds = new Set(
    completedMeasurementCycles.map((cycle) => cycle.id),
  );
  const measurementBasedActions = (campaign.tracking.improvementActions ?? [])
    .filter((action) =>
      completedMeasurementCycleIds.has(action.sourceMeasurementCycleId),
    );
  const completedActions = measurementBasedActions
    .filter((action) =>
      hasImprovementActionUsedSourceMeasurementResults(
        action,
        completedMeasurementCyclesById.get(action.sourceMeasurementCycleId),
      ),
    )
    .slice()
    .sort((left, right) =>
      left.measurementResultUsage!.usedAt.localeCompare(
        right.measurementResultUsage!.usedAt,
      ),
    );
  const latestCompletedAction = completedActions.at(-1);

  return {
    schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1",
    state:
      latestCompletedAction !== undefined
        ? "completed"
        : measurementBasedActions.length > 0
          ? "proposed"
          : "pending",
    hasCompletedMeasurementBasedImprovementCycle:
      latestCompletedAction !== undefined,
    completedImprovementCycleCount: completedActions.length,
    ...(latestCompletedAction === undefined
      ? {}
      : {
          latestCompletedMeasurementCycleId:
            latestCompletedAction.sourceMeasurementCycleId,
          latestCompletedImprovementActionId: latestCompletedAction.id,
          completedAt: latestCompletedAction.measurementResultUsage!.usedAt,
        }),
  };
}

function hasImprovementActionUsedSourceMeasurementResults(
  action: CampaignImprovementAction,
  sourceCycle: CampaignMeasurementCycle | undefined,
) {
  if (
    action.status !== "completed" ||
    action.measurementResultUsage === undefined ||
    sourceCycle === undefined ||
    Number.isNaN(Date.parse(action.measurementResultUsage.usedAt)) ||
    action.measurementResultUsage.usedMetricIds.length === 0 ||
    action.measurementResultUsage.appliedChange.trim() === ""
  ) {
    return false;
  }

  const sourceMetricIds = new Set(
    sourceCycle.performanceResults.map((metric) => metric.id),
  );

  return action.measurementResultUsage.usedMetricIds.some((metricId) =>
    sourceMetricIds.has(metricId),
  );
}
function createCampaignImprovementActionFromMeasurementCycle(input: {
  cycle: CampaignMeasurementCycle;
  measurementGoals: CampaignMeasurementGoal[];
  primarySuccessMetric: string;
}): CampaignImprovementAction {
  const primaryResult =
    input.cycle.primaryResult ??
    input.cycle.performanceResults.find(
      (metric) => metric.metric === input.primarySuccessMetric,
    ) ??
    input.cycle.performanceResults[0];
  const primaryGoal =
    input.measurementGoals.find((goal) =>
      input.cycle.goalIds.includes(goal.id),
    ) ?? input.measurementGoals[0];
  const targetValue = primaryGoal?.target ?? null;
  const missedTarget =
    targetValue !== null && primaryResult.value < targetValue;
  const actionType = missedTarget
    ? "optimize_conversion_path"
    : "scale_winning_path";

  return {
    schemaVersion: "owncanvas.campaign-improvement-action.v1",
    id: `improvement_${input.cycle.id}`,
    status: "proposed",
    priority: missedTarget ? "high" : "medium",
    actionType,
    sourceMeasurementCycleId: input.cycle.id,
    goalIds: input.cycle.goalIds,
    metric: primaryResult.metric,
    observedValue: primaryResult.value,
    targetValue,
    unit: primaryResult.unit,
    recommendation: missedTarget
      ? "Create a conversion-path variant that reduces friction before checkout."
      : "Scale the winning conversion path into the next campaign iteration.",
    rationale:
      targetValue === null
        ? `${primaryResult.metric} recorded ${primaryResult.value} ${primaryResult.unit}; no target was configured, so preserve the measured winner for iteration.`
        : `${primaryResult.metric} recorded ${primaryResult.value} ${primaryResult.unit} against a target of ${targetValue} ${primaryResult.unit}.`,
    createdAt: input.cycle.completedAt,
  };
}

export function createCampaignEvaluationModel(
  values: Partial<CampaignEvaluationModel> = {},
): CampaignEvaluationModel {
  return {
    schemaVersion: "owncanvas.campaign-evaluation.v1",
    primarySuccessMetric: {
      id: "metric.purchase_conversion",
      metric: "purchase_conversion_rate",
      eventName: "purchase",
      unit: "percent",
      priority: "primary",
      optimizationDirection: "increase",
      attributionRole: "final_conversion",
      description:
        "Purchase conversion is the primary campaign success metric for content-commerce evaluation.",
      ...values.primarySuccessMetric,
    },
    secondaryMetrics: values.secondaryMetrics ?? [],
  };
}

export function createCampaignTrackingConfiguration(
  input: CampaignTrackingInput = {},
): CampaignTracking {
  const evaluation = createCampaignEvaluationModel(input.evaluation);
  const measurementGoals = input.measurementGoals ?? [];
  const metrics = input.metrics ?? [];
  const measurementCycles =
    input.measurementCycles ??
    createCompletedCampaignMeasurementCycleFromInputs({
      measurementGoals,
      metrics,
      primarySuccessMetric: evaluation.primarySuccessMetric.metric,
      completedAt:
        metrics
          .map((metric) => metric.observedAt)
          .filter((observedAt) => !Number.isNaN(Date.parse(observedAt)))
          .sort()
          .at(-1) ?? new Date(0).toISOString(),
    });
  const improvementActions =
    input.improvementActions ??
    createCampaignImprovementActionsFromMeasurement({
      measurementGoals,
      measurementCycles,
      primarySuccessMetric: evaluation.primarySuccessMetric.metric,
    });

  return {
    utm: {
      source: input.utm?.source ?? "",
      medium: input.utm?.medium ?? "",
      campaign: input.utm?.campaign ?? "",
      content: input.utm?.content ?? "",
      term: input.utm?.term ?? "",
    },
    attributionParameters: input.attributionParameters ?? [],
    pixelEvents: input.pixelEvents ?? [],
    analyticsDestinations: input.analyticsDestinations ?? [],
    analytics: input.analytics ?? [],
    events: input.events ?? [],
    conversions: input.conversions ?? [],
    evaluation,
    measurementGoals,
    metrics,
    measurementCycles,
    improvementActions,
    ...(input.eventLog === undefined ? {} : { eventLog: input.eventLog }),
    ...(input.conversionRecords === undefined
      ? {}
      : { conversionRecords: input.conversionRecords }),
    ...(input.revisitRecords === undefined
      ? {}
      : { revisitRecords: input.revisitRecords }),
    ...(input.sessions === undefined ? {} : { sessions: input.sessions }),
    attribution: {
      model: input.attribution?.model ?? "last-touch",
      touchpoints: input.attribution?.touchpoints ?? [],
    },
  };
}

export function parseInboundCampaignSessionUrl(
  sessionUrl: string,
  options: CampaignInboundSessionParseOptions = {},
): CampaignInboundSessionParseResult {
  const url = sessionUrl.trim();
  const searchParams = readCampaignInboundSessionSearchParams(url);
  const session: CampaignInboundSession = {
    url,
    campaignId: firstCampaignInboundSessionValue(
      searchParams.get("oc_campaign_id"),
      searchParams.get("campaign_id"),
      searchParams.get("utm_campaign"),
    ),
    ...optionalCampaignInboundSessionField(
      "sessionId",
      firstCampaignInboundSessionValue(
        searchParams.get("oc_session_id"),
        searchParams.get("session_id"),
      ),
    ),
    ...optionalCampaignInboundSessionField(
      "userId",
      firstCampaignInboundSessionValue(
        searchParams.get("oc_user_id"),
        searchParams.get("user_id"),
      ),
    ),
    ...optionalCampaignInboundSessionField(
      "channelId",
      firstCampaignInboundSessionValue(
        searchParams.get("oc_channel_id"),
        searchParams.get("channel_id"),
      ),
    ),
    ...optionalCampaignInboundSessionField(
      "touchpointId",
      firstCampaignInboundSessionValue(
        searchParams.get("oc_touchpoint_id"),
        searchParams.get("touchpoint_id"),
      ),
    ),
    utm: {
      source: normalizeCampaignInboundSessionToken(
        searchParams.get("utm_source") ?? "",
      ),
      medium: normalizeCampaignInboundSessionToken(
        searchParams.get("utm_medium") ?? "",
      ),
      campaign: firstCampaignInboundSessionValue(
        searchParams.get("utm_campaign"),
      ),
      content: firstCampaignInboundSessionValue(searchParams.get("utm_content")),
      term: firstCampaignInboundSessionValue(searchParams.get("utm_term")),
    },
    attributionParameters:
      createCampaignInboundSessionAttributionParameters(searchParams),
  };
  const validation = validateInboundCampaignSession(session);
  const errors = [...validation.errors];
  const expectedCampaignId = options.campaignId?.trim() ?? "";

  if (
    expectedCampaignId !== "" &&
    session.campaignId !== "" &&
    session.campaignId !== expectedCampaignId
  ) {
    errors.push({
      code: "inbound-session.campaign_mismatch",
      path: "campaignId",
      message:
        "Inbound campaign session URL campaign id must match the expected campaign.",
    });
  }

  return errors.length === 0
    ? { ok: true, session, errors: [] }
    : { ok: false, session, errors };
}

export function validateInboundCampaignSession(
  session: CampaignInboundSession,
): CampaignInboundSessionValidationResult {
  const errors: CampaignInboundSessionValidationError[] = [];

  if (!isHttpUrl(session.url)) {
    errors.push({
      code: "inbound-session.url_invalid",
      path: "url",
      message: "Inbound campaign session URL must be an http(s) URL.",
    });
  }

  if (session.utm.source.trim() === "") {
    errors.push({
      code: "inbound-session.utm_source_required",
      path: "utm.source",
      message: "Inbound campaign session URL requires utm_source.",
    });
  }

  if (session.utm.medium.trim() === "") {
    errors.push({
      code: "inbound-session.utm_medium_required",
      path: "utm.medium",
      message: "Inbound campaign session URL requires utm_medium.",
    });
  }

  if (session.utm.campaign.trim() === "") {
    errors.push({
      code: "inbound-session.utm_campaign_required",
      path: "utm.campaign",
      message: "Inbound campaign session URL requires utm_campaign.",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateCampaignTrackingEvent(
  event: unknown,
): CampaignTrackingEventValidationResult {
  const errors: CampaignTrackingEventValidationError[] = [];

  if (!isRecord(event)) {
    return {
      valid: false,
      event: null,
      errors: [
        {
          code: "tracking_event.object_required",
          path: "",
          message: "Tracking events must be objects.",
        },
      ],
    };
  }

  if (event.schemaVersion !== CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION) {
    errors.push({
      code: "tracking_event.schema_version_invalid",
      path: "schemaVersion",
      message: "Tracking events must use the current schema version.",
    });
  }

  if (typeof event.type !== "string" || event.type.trim() === "") {
    errors.push({
      code: "tracking_event.type_required",
      path: "type",
      message: "Tracking events require a type.",
    });
  } else if (
    event.type !== "exposure" &&
    event.type !== "click" &&
    event.type !== "conversion" &&
    event.type !== "engagement" &&
    event.type !== "revisit"
  ) {
    errors.push({
      code: "tracking_event.type_unsupported",
      path: "type",
      message:
        "Tracking event type must be exposure, click, conversion, engagement, or revisit.",
    });
  }

  if (typeof event.id !== "string" || event.id.trim() === "") {
    errors.push({
      code: "tracking_event.id_required",
      path: "id",
      message: "Tracking events require an id.",
    });
  }

  if (typeof event.campaignId !== "string" || event.campaignId.trim() === "") {
    errors.push({
      code: "tracking_event.campaign_id_required",
      path: "campaignId",
      message: "Tracking events require a campaign id.",
    });
  }

  if (typeof event.sessionId !== "string" || event.sessionId.trim() === "") {
    errors.push({
      code: "tracking_event.session_id_required",
      path: "sessionId",
      message: "Tracking events require a session id.",
    });
  }

  validateCampaignTrackingEventContext(event.context, errors);
  validateCampaignTrackingEventTimestamp(event.occurredAt, errors);
  validateCampaignTrackingEventContent(event.content, errors);
  validateCampaignTrackingEventUtm(event.utm, errors);
  validateCampaignTrackingEventTarget(event.target, errors);

  if (event.type === "exposure") {
    validateCampaignTrackingExposureDetails(event.exposure, errors);
  }

  if (event.type === "click") {
    validateCampaignTrackingClickDetails(event.click, errors);
  }

  if (event.type === "conversion") {
    validateCampaignTrackingConversionDetails(event.conversion, errors);
    validateCampaignPurchaseConversionAttributionIdentifiers(event, errors);
  }

  if (event.type === "engagement") {
    validateCampaignTrackingEngagementDetails(event.engagement, errors);
  }

  if (event.type === "revisit") {
    validateCampaignTrackingRevisitDetails(event.revisit, errors);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      event: null,
      errors,
    };
  }

  return {
    valid: true,
    event: event as CampaignTrackingEvent,
    errors: [],
  };
}

export function validateCampaignExposureTrackingEvent(
  event: unknown,
): CampaignTrackingEventValidationResult {
  const validation = validateCampaignTrackingEvent(event);

  if (!validation.valid || validation.event.type === "exposure") {
    return validation;
  }

  return {
    valid: false,
    event: null,
    errors: [
      {
        code: "tracking_event.type_unsupported",
        path: "type",
        message: "Expected an exposure tracking event.",
      },
    ],
  };
}

export function validateCampaignClickTrackingEvent(
  event: unknown,
): CampaignTrackingEventValidationResult {
  const validation = validateCampaignTrackingEvent(event);

  if (!validation.valid || validation.event.type === "click") {
    return validation;
  }

  return {
    valid: false,
    event: null,
    errors: [
      {
        code: "tracking_event.type_unsupported",
        path: "type",
        message: "Expected a click tracking event.",
      },
    ],
  };
}

export function validateCampaignConversionTrackingEvent(
  event: unknown,
): CampaignTrackingEventValidationResult {
  const validation = validateCampaignTrackingEvent(event);

  if (!validation.valid || validation.event.type === "conversion") {
    return validation;
  }

  return {
    valid: false,
    event: null,
    errors: [
      {
        code: "tracking_event.type_unsupported",
        path: "type",
        message: "Expected a conversion tracking event.",
      },
    ],
  };
}

export function validateCampaignEngagementTrackingEvent(
  event: unknown,
): CampaignTrackingEventValidationResult {
  const validation = validateCampaignTrackingEvent(event);

  if (!validation.valid || validation.event.type === "engagement") {
    return validation;
  }

  return {
    valid: false,
    event: null,
    errors: [
      {
        code: "tracking_event.type_unsupported",
        path: "type",
        message: "Expected an engagement tracking event.",
      },
    ],
  };
}

export function validateCampaignRevisitTrackingEvent(
  event: unknown,
): CampaignTrackingEventValidationResult {
  const validation = validateCampaignTrackingEvent(event);

  if (!validation.valid || validation.event.type === "revisit") {
    return validation;
  }

  return {
    valid: false,
    event: null,
    errors: [
      {
        code: "tracking_event.type_unsupported",
        path: "type",
        message: "Expected a revisit tracking event.",
      },
    ],
  };
}

export function validateCampaignTrackingEventCampaignMetadata(
  campaign: Pick<
    CampaignRecord,
    "id" | "channels" | "assets" | "productOffer" | "tracking"
  >,
  event: CampaignTrackingEvent,
): CampaignTrackingEventValidationError[] {
  const errors: CampaignTrackingEventValidationError[] = [];
  const channelId =
    firstNonEmptyString(
      event.content.channelId,
      event.target.metadata.channelId,
    ) ?? "";
  const assetId =
    firstNonEmptyString(event.content.assetId, event.target.metadata.assetId) ??
    "";
  const productId =
    firstNonEmptyString(
      event.content.productId,
      event.target.metadata.productId,
    ) ?? "";
  const offerId =
    firstNonEmptyString(event.content.offerId, event.target.metadata.offerId) ??
    "";

  if (
    channelId !== "" &&
    campaign.channels.length > 0 &&
    !campaign.channels.some((channel) => channel.id === channelId)
  ) {
    errors.push({
      code: "tracking_event.content_channel_unknown",
      path: event.content.channelId === channelId
        ? "content.channelId"
        : "target.metadata.channelId",
      message:
        "Tracking event content channel id must reference a campaign channel.",
    });
  }

  if (
    assetId !== "" &&
    campaign.assets.length > 0 &&
    !campaign.assets.some((asset) => asset.id === assetId)
  ) {
    errors.push({
      code: "tracking_event.content_asset_unknown",
      path: event.content.assetId === assetId
        ? "content.assetId"
        : "target.metadata.assetId",
      message:
        "Tracking event content asset id must reference a campaign asset.",
    });
  }

  const campaignProductId = campaign.productOffer.product.id.trim();

  if (
    productId !== "" &&
    campaignProductId !== "" &&
    productId !== campaignProductId
  ) {
    errors.push({
      code: "tracking_event.content_product_mismatch",
      path: event.content.productId === productId
        ? "content.productId"
        : "target.metadata.productId",
      message:
        "Tracking event content product id must match the campaign product.",
    });
  }

  const campaignOfferId = campaign.productOffer.attribution.externalId.trim();

  if (
    offerId !== "" &&
    campaignOfferId !== "" &&
    offerId !== campaignOfferId
  ) {
    errors.push({
      code: "tracking_event.content_offer_mismatch",
      path: event.content.offerId === offerId
        ? "content.offerId"
        : "target.metadata.offerId",
      message:
        "Tracking event content offer id must match the campaign offer attribution id.",
    });
  }

  validateCampaignTrackingEventUtmAgainstCampaign(
    campaign,
    event,
    channelId,
    errors,
  );

  return errors;
}

function validateCampaignTrackingEventUtmAgainstCampaign(
  campaign: Pick<CampaignRecord, "channels" | "tracking">,
  event: CampaignTrackingEvent,
  channelId: string,
  errors: CampaignTrackingEventValidationError[],
) {
  const channel = campaign.channels.find((candidate) => candidate.id === channelId);

  validateCampaignTrackingEventUtmFieldAgainstCampaign(
    "source",
    event.utm.source,
    [
      campaign.tracking.utm.source,
      channel?.tracking.utmSource,
      ...campaign.channels.map((candidate) => candidate.tracking.utmSource),
    ],
    errors,
  );
  validateCampaignTrackingEventUtmFieldAgainstCampaign(
    "medium",
    event.utm.medium,
    [
      campaign.tracking.utm.medium,
      channel?.tracking.utmMedium,
      ...campaign.channels.map((candidate) => candidate.tracking.utmMedium),
    ],
    errors,
  );
  validateCampaignTrackingEventUtmFieldAgainstCampaign(
    "campaign",
    event.utm.campaign,
    [
      campaign.tracking.utm.campaign,
      channel?.tracking.utmCampaign,
      ...campaign.channels.map((candidate) => candidate.tracking.utmCampaign),
    ],
    errors,
  );
  validateCampaignTrackingEventUtmFieldAgainstCampaign(
    "content",
    event.utm.content,
    [
      campaign.tracking.utm.content,
      channel?.tracking.utmContent,
      ...campaign.channels.map((candidate) => candidate.tracking.utmContent),
    ],
    errors,
  );
}

function validateCampaignTrackingEventUtmFieldAgainstCampaign(
  field: keyof CampaignUtmTracking,
  actual: string,
  configuredValues: (string | undefined)[],
  errors: CampaignTrackingEventValidationError[],
) {
  const allowedValues = configuredValues
    .map((value) => value?.trim() ?? "")
    .filter((value) => value !== "");

  if (allowedValues.length === 0 || allowedValues.includes(actual.trim())) {
    return;
  }

  errors.push({
    code: `tracking_event.utm_${field}_mismatch` as CampaignTrackingEventValidationErrorCode,
    path: `utm.${field}`,
    message: `Tracking event UTM ${field} must match campaign or channel tracking metadata.`,
  });
}

function validateCampaignTrackingEventContext(
  context: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(context)) {
    errors.push({
      code: "tracking_event.context_required",
      path: "context",
      message: "Tracking events require human or agent context.",
    });
    return;
  }

  if (context.actor !== "human" && context.actor !== "agent") {
    errors.push({
      code: "tracking_event.context_actor_invalid",
      path: "context.actor",
      message: "Tracking event context actor must be human or agent.",
    });
    return;
  }

  if (
    context.actor === "human" &&
    (typeof context.userId !== "string" || context.userId.trim() === "")
  ) {
    errors.push({
      code: "tracking_event.context_user_id_required",
      path: "context.userId",
      message: "Human tracking event context requires a user id.",
    });
  }

  if (
    context.actor === "agent" &&
    (typeof context.agentId !== "string" || context.agentId.trim() === "")
  ) {
    errors.push({
      code: "tracking_event.context_agent_id_required",
      path: "context.agentId",
      message: "Agent tracking event context requires an agent id.",
    });
  }
}

function validateCampaignTrackingEventTimestamp(
  occurredAt: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (
    typeof occurredAt !== "string" ||
    occurredAt.trim() === "" ||
    Number.isNaN(Date.parse(occurredAt))
  ) {
    errors.push({
      code: "tracking_event.occurred_at_invalid",
      path: "occurredAt",
      message: "Tracking events require a valid occurredAt timestamp.",
    });
  }
}

function validateCampaignTrackingEventContent(
  content: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(content)) {
    errors.push({
      code: "tracking_event.content_required",
      path: "content",
      message: "Tracking events require content metadata.",
    });
    return;
  }

  if (typeof content.type !== "string" || content.type.trim() === "") {
    errors.push({
      code: "tracking_event.content_type_required",
      path: "content.type",
      message: "Tracking event content type is required.",
    });
  }

  if (typeof content.id !== "string" || content.id.trim() === "") {
    errors.push({
      code: "tracking_event.content_id_required",
      path: "content.id",
      message: "Tracking event content id is required.",
    });
  }
}

function validateCampaignTrackingEventUtm(
  utm: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(utm)) {
    errors.push({
      code: "tracking_event.utm_required",
      path: "utm",
      message: "Tracking events require UTM metadata.",
    });
    return;
  }

  if (typeof utm.source !== "string" || utm.source.trim() === "") {
    errors.push({
      code: "tracking_event.utm_source_required",
      path: "utm.source",
      message: "Tracking event UTM source is required.",
    });
  }

  if (typeof utm.medium !== "string" || utm.medium.trim() === "") {
    errors.push({
      code: "tracking_event.utm_medium_required",
      path: "utm.medium",
      message: "Tracking event UTM medium is required.",
    });
  }

  if (typeof utm.campaign !== "string" || utm.campaign.trim() === "") {
    errors.push({
      code: "tracking_event.utm_campaign_required",
      path: "utm.campaign",
      message: "Tracking event UTM campaign is required.",
    });
  }
}

function validateCampaignTrackingEventTarget(
  target: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(target)) {
    errors.push({
      code: "tracking_event.target_required",
      path: "target",
      message: "Tracking events require target metadata.",
    });
    return;
  }

  if (typeof target.type !== "string" || target.type.trim() === "") {
    errors.push({
      code: "tracking_event.target_type_required",
      path: "target.type",
      message: "Tracking event target type is required.",
    });
  }

  if (typeof target.id !== "string" || target.id.trim() === "") {
    errors.push({
      code: "tracking_event.target_id_required",
      path: "target.id",
      message: "Tracking event target id is required.",
    });
  }

  if (!isRecord(target.metadata)) {
    errors.push({
      code: "tracking_event.target_metadata_required",
      path: "target.metadata",
      message: "Tracking event target metadata is required.",
    });
    return;
  }

  if (
    target.metadata.url !== undefined &&
    (typeof target.metadata.url !== "string" || !isHttpUrl(target.metadata.url))
  ) {
    errors.push({
      code: "tracking_event.target_url_invalid",
      path: "target.metadata.url",
      message: "Tracking event target URLs must use http or https.",
    });
  }
}

function validateCampaignTrackingExposureDetails(
  exposure: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(exposure)) {
    errors.push({
      code: "tracking_event.exposure_required",
      path: "exposure",
      message: "Exposure tracking events require exposure details.",
    });
    return;
  }

  if (typeof exposure.surface !== "string" || exposure.surface.trim() === "") {
    errors.push({
      code: "tracking_event.exposure_surface_required",
      path: "exposure.surface",
      message: "Exposure tracking events require a surface.",
    });
  }

  if (
    typeof exposure.placement !== "string" ||
    exposure.placement.trim() === ""
  ) {
    errors.push({
      code: "tracking_event.exposure_placement_required",
      path: "exposure.placement",
      message: "Exposure tracking events require a placement.",
    });
  }
}

function validateCampaignTrackingClickDetails(
  click: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(click)) {
    errors.push({
      code: "tracking_event.click_required",
      path: "click",
      message: "Click tracking events require click details.",
    });
    return;
  }

  if (typeof click.href !== "string" || !isHttpUrl(click.href)) {
    errors.push({
      code: "tracking_event.click_href_invalid",
      path: "click.href",
      message: "Click tracking events require an http or https href.",
    });
  }
}

function validateCampaignTrackingConversionDetails(
  conversion: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(conversion)) {
    errors.push({
      code: "tracking_event.conversion_required",
      path: "conversion",
      message: "Conversion tracking events require conversion details.",
    });
    return;
  }

  if (
    typeof conversion.eventName !== "string" ||
    conversion.eventName.trim() === ""
  ) {
    errors.push({
      code: "tracking_event.conversion_event_name_required",
      path: "conversion.eventName",
      message: "Conversion tracking events require an event name.",
    });
  }

  if (
    conversion.value !== undefined &&
    (typeof conversion.value !== "number" ||
      !Number.isFinite(conversion.value) ||
      conversion.value < 0)
  ) {
    errors.push({
      code: "tracking_event.conversion_value_invalid",
      path: "conversion.value",
      message: "Conversion value must be a non-negative number when provided.",
    });
  }

  if (
    conversion.currency !== undefined &&
    (typeof conversion.currency !== "string" ||
      !/^[A-Z]{3}$/.test(conversion.currency))
  ) {
    errors.push({
      code: "tracking_event.conversion_currency_invalid",
      path: "conversion.currency",
      message: "Conversion currency must be an uppercase ISO 4217 code.",
    });
  }

  if (
    conversion.quantity !== undefined &&
    (typeof conversion.quantity !== "number" ||
      !Number.isFinite(conversion.quantity) ||
      conversion.quantity < 0)
  ) {
    errors.push({
      code: "tracking_event.conversion_quantity_invalid",
      path: "conversion.quantity",
      message: "Conversion quantity must be a non-negative number when provided.",
    });
  }
}

function validateCampaignPurchaseConversionAttributionIdentifiers(
  event: Record<string, unknown>,
  errors: CampaignTrackingEventValidationError[],
) {
  const conversion = event.conversion;

  if (!isRecord(conversion) || conversion.eventName !== "purchase") {
    return;
  }

  const content = isRecord(event.content) ? event.content : {};
  const context = isRecord(event.context) ? event.context : {};
  const target = isRecord(event.target) ? event.target : {};
  const targetMetadata = isRecord(target.metadata) ? target.metadata : {};

  if (firstNonEmptyUnknownString(context.userId) === undefined) {
    errors.push({
      code: "tracking_event.purchase_user_id_required",
      path: "context.userId",
      message: "Purchase conversion events require a user id for attribution.",
    });
  }

  if (firstNonEmptyUnknownString(conversion.orderId) === undefined) {
    errors.push({
      code: "tracking_event.purchase_order_id_required",
      path: "conversion.orderId",
      message: "Purchase conversion events require an order id.",
    });
  }

  validateCampaignPurchaseAttributionIdentifier(
    "nodeId",
    "tracking_event.purchase_node_id_required",
    "content.nodeId",
    "Purchase conversion events require a canvas node id for attribution.",
    content,
    targetMetadata,
    errors,
  );
  validateCampaignPurchaseAttributionIdentifier(
    "inputPortId",
    "tracking_event.purchase_input_port_id_required",
    "target.metadata.inputPortId",
    "Purchase conversion events require an input port id for attribution.",
    {},
    targetMetadata,
    errors,
  );
  validateCampaignPurchaseAttributionIdentifier(
    "channelId",
    "tracking_event.purchase_channel_id_required",
    "content.channelId",
    "Purchase conversion events require a channel id for attribution.",
    content,
    targetMetadata,
    errors,
  );
  validateCampaignPurchaseAttributionIdentifier(
    "productId",
    "tracking_event.purchase_product_id_required",
    "content.productId",
    "Purchase conversion events require a product id for attribution.",
    content,
    targetMetadata,
    errors,
  );
  validateCampaignPurchaseAttributionIdentifier(
    "offerId",
    "tracking_event.purchase_offer_id_required",
    "content.offerId",
    "Purchase conversion events require an offer id for attribution.",
    content,
    targetMetadata,
    errors,
  );
}

function validateCampaignPurchaseAttributionIdentifier(
  key: "nodeId" | "inputPortId" | "channelId" | "productId" | "offerId",
  code: CampaignTrackingEventValidationErrorCode,
  path: string,
  message: string,
  content: Record<string, unknown>,
  targetMetadata: Record<string, unknown>,
  errors: CampaignTrackingEventValidationError[],
) {
  const value = firstNonEmptyUnknownString(content[key], targetMetadata[key]);

  if (value !== undefined) {
    return;
  }

  errors.push({
    code,
    path,
    message,
  });
}

function firstNonEmptyUnknownString(
  ...values: unknown[]
): string | undefined {
  return values.find(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );
}

function validateCampaignTrackingEngagementDetails(
  engagement: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(engagement)) {
    errors.push({
      code: "tracking_event.engagement_required",
      path: "engagement",
      message: "Engagement tracking events require engagement details.",
    });
    return;
  }

  if (engagement.kind !== "playback" && engagement.kind !== "scroll") {
    errors.push({
      code: "tracking_event.engagement_kind_invalid",
      path: "engagement.kind",
      message: "Engagement kind must be playback or scroll.",
    });
  }

  if (
    typeof engagement.action !== "string" ||
    engagement.action.trim() === ""
  ) {
    errors.push({
      code: "tracking_event.engagement_action_required",
      path: "engagement.action",
      message: "Engagement events require an action.",
    });
  }

  if (
    engagement.value !== undefined &&
    (typeof engagement.value !== "number" ||
      !Number.isFinite(engagement.value) ||
      engagement.value < 0)
  ) {
    errors.push({
      code: "tracking_event.engagement_value_invalid",
      path: "engagement.value",
      message: "Engagement value must be a non-negative finite number.",
    });
  }

  if (
    engagement.unit !== undefined &&
    engagement.unit !== "percent" &&
    engagement.unit !== "seconds" &&
    engagement.unit !== "pixels" &&
    engagement.unit !== "count"
  ) {
    errors.push({
      code: "tracking_event.engagement_unit_invalid",
      path: "engagement.unit",
      message: "Engagement unit must be percent, seconds, pixels, or count.",
    });
  }
}

function validateCampaignTrackingRevisitDetails(
  revisit: unknown,
  errors: CampaignTrackingEventValidationError[],
) {
  if (!isRecord(revisit)) {
    errors.push({
      code: "tracking_event.revisit_required",
      path: "revisit",
      message: "Revisit tracking events require revisit details.",
    });
    return;
  }

  if (
    typeof revisit.firstSeenAt !== "string" ||
    Number.isNaN(Date.parse(revisit.firstSeenAt))
  ) {
    errors.push({
      code: "tracking_event.revisit_first_seen_at_invalid",
      path: "revisit.firstSeenAt",
      message: "Revisit events require a valid firstSeenAt timestamp.",
    });
  }

  if (
    typeof revisit.lastSeenAt !== "string" ||
    Number.isNaN(Date.parse(revisit.lastSeenAt))
  ) {
    errors.push({
      code: "tracking_event.revisit_last_seen_at_invalid",
      path: "revisit.lastSeenAt",
      message: "Revisit events require a valid lastSeenAt timestamp.",
    });
  }

  if (!Array.isArray(revisit.matchedBy) || revisit.matchedBy.length === 0) {
    errors.push({
      code: "tracking_event.revisit_match_required",
      path: "revisit.matchedBy",
      message: "Revisit events require at least one returning attribution match.",
    });
  }
}

export function createCampaignProductOffer(
  values: CampaignProductOfferInput = {},
): CampaignProductOffer {
  return {
    product: {
      id: values.product?.id ?? "",
      title: values.product?.title ?? "",
      brand: values.product?.brand ?? "",
      category: values.product?.category ?? "",
      description: values.product?.description ?? "",
      tags: values.product?.tags ?? [],
      canonicalUrl: values.product?.canonicalUrl ?? "",
      media: values.product?.media ?? [],
      variants: values.product?.variants ?? [],
    },
    offer: {
      headline: values.offer?.headline ?? "",
      summary: values.offer?.summary ?? "",
      price: {
        amount: values.offer?.price?.amount ?? null,
        currency: values.offer?.price?.currency ?? "USD",
        display: values.offer?.price?.display ?? "",
      },
      discount: values.offer?.discount ?? "",
      terms: values.offer?.terms ?? "",
      destinationUrl: values.offer?.destinationUrl ?? "",
      callToAction: values.offer?.callToAction ?? "",
    },
    attribution: {
      source: values.attribution?.source ?? "",
      externalId: values.attribution?.externalId ?? "",
      affiliateNetwork: values.attribution?.affiliateNetwork ?? "",
      commissionRate: values.attribution?.commissionRate ?? null,
      trackingUrl: values.attribution?.trackingUrl ?? "",
    },
  };
}

export function createCampaignPublishingChannel(
  input: CampaignPublishingChannelInput,
): CampaignPublishingChannel {
  return {
    id: input.id ?? `channel_${Date.now()}`,
    type: input.type,
    platform: input.platform,
    label: input.label,
    providerPluginId: input.providerPluginId ?? "",
    account: {
      id: input.account?.id ?? "",
      handle: input.account?.handle ?? "",
    },
    placement: input.placement,
    destinationUrl: input.destinationUrl,
    landingPageId: input.landingPageId ?? "",
    schedule: {
      mode: input.schedule?.mode ?? "manual",
      startsAt: input.schedule?.startsAt ?? "",
      timezone: input.schedule?.timezone ?? "UTC",
    },
    tracking: {
      utmSource: input.tracking.utmSource,
      utmMedium: input.tracking.utmMedium,
      utmCampaign: input.tracking.utmCampaign,
      utmContent: input.tracking.utmContent ?? "",
      conversionEvent: input.tracking.conversionEvent,
    },
    publishedLinks: input.publishedLinks?.map(cloneCampaignPublishedLink) ?? [],
    status: input.status ?? "draft",
  };
}

export function createCampaignAsset(
  input: CampaignAssetInput,
  options: { now?: () => string } = {},
): CampaignAsset {
  return {
    id: input.id ?? `asset_${Date.now()}`,
    source: input.source,
    mediaType: input.mediaType,
    title: input.title,
    uri: input.uri,
    usage: input.usage,
    status: input.status ?? "draft",
    altText: input.altText ?? "",
    fileName: input.fileName ?? "",
    mimeType: input.mimeType ?? "",
    sizeBytes: input.sizeBytes ?? null,
    rights: {
      owner: input.rights.owner,
      license: input.rights.license,
      ...(input.rights.sourceUrl === undefined
        ? {}
        : { sourceUrl: input.rights.sourceUrl }),
    },
    createdBy: input.createdBy,
    createdAt: options.now?.() ?? new Date().toISOString(),
    ...(input.outputLocations === undefined
      ? {}
      : {
          outputLocations: {
            primaryUri: input.outputLocations.primaryUri,
            ...(input.outputLocations.thumbnailUri === undefined
              ? {}
              : { thumbnailUri: input.outputLocations.thumbnailUri }),
          },
        }),
    ...(input.generatedMetadata === undefined
      ? {}
      : {
          generatedMetadata: {
            ...input.generatedMetadata,
            dimensions: { ...input.generatedMetadata.dimensions },
            ...(input.generatedMetadata.storageReferences === undefined
              ? {}
              : {
                  storageReferences: cloneCampaignAssetStorageReferences(
                    input.generatedMetadata.storageReferences,
                  ),
                }),
            inputSources: [...input.generatedMetadata.inputSources],
            outputTargets: input.generatedMetadata.outputTargets.map(
              (target) => ({
                ...target,
              }),
            ),
          },
        }),
    ...(input.storageReferences === undefined
      ? {}
      : {
          storageReferences: cloneCampaignAssetStorageReferences(
            input.storageReferences,
          ),
        }),
  };
}

export function addCampaignAsset<TCampaign extends CampaignDraft>(
  campaign: TCampaign,
  asset: CampaignAsset,
  options: { now?: () => string } = {},
): TCampaign {
  const timestamp = options.now?.() ?? new Date().toISOString();

  return {
    ...campaign,
    assets: [...campaign.assets, asset],
    logs: [...campaign.logs, `${timestamp} asset.added:${asset.id}`],
    versions: [...campaign.versions, `${timestamp} asset.added:${asset.id}`],
  };
}

export function editCampaignAsset<TCampaign extends CampaignDraft>(
  campaign: TCampaign,
  assetId: string,
  edits: CampaignAssetEditInput,
  options: { now?: () => string } = {},
): TCampaign {
  const timestamp = options.now?.() ?? new Date().toISOString();
  const assets = campaign.assets.map((asset) =>
    asset.id === assetId ? mergeCampaignAsset(asset, edits) : asset,
  );

  if (!campaign.assets.some((asset) => asset.id === assetId)) {
    return campaign;
  }

  return {
    ...campaign,
    assets,
    logs: [...campaign.logs, `${timestamp} asset.edited:${assetId}`],
    versions: [...campaign.versions, `${timestamp} asset.edited:${assetId}`],
  };
}

export function replaceCampaignAsset<TCampaign extends CampaignDraft>(
  campaign: TCampaign,
  assetId: string,
  replacement: CampaignAssetReplacementInput,
  options: { now?: () => string } = {},
): TCampaign {
  const timestamp = options.now?.() ?? new Date().toISOString();
  let replaced = false;
  const assets = campaign.assets.map((asset) => {
    if (asset.id !== assetId) {
      return asset;
    }

    replaced = true;

    return mergeCampaignAsset(asset, {
      ...replacement,
      fileName:
        replacement.source === "upload" ? replacement.fileName ?? "" : "",
      mimeType:
        replacement.source === "upload" ? replacement.mimeType ?? "" : "",
      sizeBytes:
        replacement.source === "upload" ? replacement.sizeBytes ?? null : null,
    });
  });

  if (!replaced) {
    return campaign;
  }

  return {
    ...campaign,
    assets,
    logs: [...campaign.logs, `${timestamp} asset.replaced:${assetId}`],
    versions: [...campaign.versions, `${timestamp} asset.replaced:${assetId}`],
  };
}

export function removeCampaignAsset<TCampaign extends CampaignDraft>(
  campaign: TCampaign,
  assetId: string,
  options: { now?: () => string } = {},
): TCampaign {
  if (!campaign.assets.some((asset) => asset.id === assetId)) {
    return campaign;
  }

  const timestamp = options.now?.() ?? new Date().toISOString();

  return {
    ...campaign,
    assets: campaign.assets.filter((asset) => asset.id !== assetId),
    logs: [...campaign.logs, `${timestamp} asset.removed:${assetId}`],
    versions: [...campaign.versions, `${timestamp} asset.removed:${assetId}`],
  };
}

export function archiveCampaignAsset<TCampaign extends CampaignDraft>(
  campaign: TCampaign,
  assetId: string,
  options: { now?: () => string } = {},
): TCampaign {
  if (!campaign.assets.some((asset) => asset.id === assetId)) {
    return campaign;
  }

  const timestamp = options.now?.() ?? new Date().toISOString();

  return {
    ...campaign,
    assets: campaign.assets.map((asset) =>
      asset.id === assetId ? { ...asset, status: "archived" } : asset,
    ),
    logs: [...campaign.logs, `${timestamp} asset.archived:${assetId}`],
    versions: [...campaign.versions, `${timestamp} asset.archived:${assetId}`],
  };
}

export function listCampaignAssets(
  campaign: Pick<CampaignDraft, "assets">,
): CampaignAssetSummary[] {
  return campaign.assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    source: asset.source,
    mediaType: asset.mediaType,
    usage: asset.usage,
    status: asset.status ?? "draft",
    createdBy: asset.createdBy,
    createdAt: asset.createdAt,
    rightsOwner: asset.rights.owner,
  }));
}

export function getCampaignAssetDetails(
  campaign: Pick<CampaignDraft, "assets">,
  assetId: string,
): CampaignAsset | null {
  return campaign.assets.find((asset) => asset.id === assetId) ?? null;
}

export function createCampaignShortFormContentControlModel(
  campaign: Pick<CampaignDraft, "assets" | "productOffer" | "channels">,
  options: { selectedAssetId?: string | null } = {},
): CampaignShortFormContentControlModel | null {
  const playableAssets = campaign.assets.filter(
    (asset) =>
      asset.mediaType === "video" &&
      asset.uri.trim() !== "" &&
      asset.status !== "archived",
  );

  if (playableAssets.length === 0) {
    return null;
  }

  const selectedAsset = options.selectedAssetId === undefined ||
    options.selectedAssetId === null
    ? undefined
    : playableAssets.find((asset) => asset.id === options.selectedAssetId);
  const activeAsset = selectedAsset ?? playableAssets[0];
  const primaryChannel = campaign.channels[0] ?? null;
  const conversionEventName =
    primaryChannel?.tracking.conversionEvent.trim() ||
    "purchase";

  return {
    activeAsset: {
      id: activeAsset.id,
      title: activeAsset.title,
      mediaType: activeAsset.mediaType,
      uri: activeAsset.uri,
      altText: activeAsset.altText,
      mimeType: activeAsset.mimeType,
      ...(activeAsset.generatedMetadata === undefined
        ? {}
        : { generatedMetadata: activeAsset.generatedMetadata }),
    },
    playlist: playableAssets.map((asset) => ({
      id: asset.id,
      title: asset.title,
      source: asset.source,
      mediaType: asset.mediaType,
      usage: asset.usage,
      status: asset.status,
      createdBy: asset.createdBy,
      createdAt: asset.createdAt,
      rightsOwner: asset.rights.owner,
    })),
    playback: {
      nativeControls: true,
      muted: true,
      loop: true,
      captions: "show-when-available",
    },
    layout: {
      placement: "sticky-bottom-right",
      maxInlineSize: "320px",
      aspectRatio: "9 / 16",
    },
    accessibility: {
      keyboardAccessible: true,
      remainsAvailableWhileBrowsing: true,
      ariaLabel: `Short-form content controls for ${activeAsset.title}`,
    },
    availableWhileBrowsing: ["commerce", "campaign-actions", "canvas"],
    actions: [
      {
        id: "play-pause",
        label: "Play",
        ariaLabel: `Play or pause ${activeAsset.title}`,
        targetSurface: "canvas",
      },
      {
        id: "mute",
        label: "Mute",
        ariaLabel: `Mute or unmute ${activeAsset.title}`,
        targetSurface: "canvas",
      },
      {
        id: "captions",
        label: "Captions",
        ariaLabel: `Toggle captions for ${activeAsset.title}`,
        targetSurface: "canvas",
      },
      {
        id: "open-product",
        label: "Product",
        ariaLabel: "Review product and offer while keeping playback visible",
        targetSurface: "commerce",
      },
      {
        id: "open-campaign-action",
        label: "Action",
        ariaLabel: "Review campaign action while keeping playback visible",
        targetSurface: "campaign-actions",
      },
      {
        id: "track-conversion",
        label: "Conversion",
        ariaLabel: `Track ${conversionEventName} conversion from this short-form content`,
        targetSurface: "campaign-actions",
      },
    ],
    commerceContext: {
      productTitle:
        campaign.productOffer.product.title.trim() || "Untitled product",
      offerHeadline:
        campaign.productOffer.offer.headline.trim() || "Untitled offer",
      destinationUrl: campaign.productOffer.offer.destinationUrl,
      callToAction:
        campaign.productOffer.offer.callToAction.trim() || "Open offer",
    },
    campaignActionContext: {
      primaryChannelId: primaryChannel?.id ?? "",
      primaryChannelLabel: primaryChannel?.label ?? "No channel configured",
      conversionEventName,
    },
  };
}

export function listCampaignPublishingChannels(
  campaign: Pick<CampaignDraft, "channels">,
): CampaignPublishingChannelSummary[] {
  return campaign.channels.map((channel) => ({
    id: channel.id,
    type: channel.type,
    platform: channel.platform,
    label: channel.label,
    providerPluginId: channel.providerPluginId,
    accountHandle: channel.account.handle,
    placement: channel.placement,
    destinationUrl: channel.destinationUrl,
    landingPageId: channel.landingPageId,
    scheduleMode: channel.schedule.mode,
    startsAt: channel.schedule.startsAt,
    timezone: channel.schedule.timezone,
    utmSource: channel.tracking.utmSource,
    utmMedium: channel.tracking.utmMedium,
    utmCampaign: channel.tracking.utmCampaign,
    conversionEvent: channel.tracking.conversionEvent,
    status: channel.status,
  }));
}

export function getCampaignPublishingChannelDetails(
  campaign: Pick<CampaignDraft, "channels">,
  channelId: string,
): CampaignPublishingChannel | null {
  return campaign.channels.find((channel) => channel.id === channelId) ?? null;
}

export function createCampaignDestinationUrl(
  campaign: Pick<CampaignDraft, "id" | "channels" | "tracking"> &
    Partial<Pick<CampaignDraft, "title" | "objective">>,
  channelId: string,
  context: CampaignDestinationUrlContext,
): string {
  const channel = getCampaignPublishingChannelDetails(campaign, channelId);

  if (!channel) {
    throw new Error(`Campaign publishing channel "${channelId}" was not found.`);
  }

  return appendCampaignTrackingParametersToUrl(
    channel.destinationUrl,
    campaign,
    channel,
    context,
  );
}

function appendCampaignTrackingParametersToUrl(
  url: string,
  campaign: CampaignUtmGenerationCampaignContext,
  channel: CampaignPublishingChannel,
  context: CampaignDestinationUrlContext,
): string {
  const trackedUrl = new URL(url);
  const parameters = trackedUrl.searchParams;
  const utm = generateDeterministicCampaignUtmParameters(
    campaign,
    channel,
    context,
  );

  setSearchParameter(parameters, "utm_source", utm.source);
  setSearchParameter(parameters, "utm_medium", utm.medium);
  setSearchParameter(parameters, "utm_campaign", utm.campaign);
  setSearchParameter(parameters, "utm_content", utm.content);
  setSearchParameter(parameters, "utm_term", utm.term);
  setSearchParameter(parameters, "oc_campaign_id", campaign.id);
  setSearchParameter(parameters, "oc_channel_id", channel.id);
  setSearchParameter(parameters, "oc_responder_id", context.responderId);
  setSearchParameter(parameters, "oc_message_id", context.messageId);
  setSearchParameter(
    parameters,
    "oc_conversion_event",
    channel.tracking.conversionEvent,
  );

  campaign.tracking.attributionParameters.forEach((parameter) => {
    setSearchParameter(parameters, parameter.key, parameter.value);
  });

  return trackedUrl.toString();
}

export function createCampaignPublishedLink(
  campaign: Pick<CampaignDraft, "id" | "channels" | "tracking"> &
    Partial<Pick<CampaignDraft, "title" | "objective">>,
  channelId: string,
  context: CampaignPublishedLinkContext,
): CampaignPublishedLink {
  const channel = getCampaignPublishingChannelDetails(campaign, channelId);

  if (!channel) {
    throw new Error(`Campaign publishing channel "${channelId}" was not found.`);
  }

  const utm = resolveCampaignPublishedLinkUtm(campaign, channel, context);

  return {
    id: context.id ?? `published_link_${Date.now()}`,
    channelId: channel.id,
    destinationUrl: channel.destinationUrl,
    publishedUrl: createCampaignDestinationUrl(campaign, channelId, context),
    utm,
    owncanvasParameters: {
      campaignId: campaign.id,
      channelId: channel.id,
      responderId: context.responderId,
      messageId: context.messageId,
      conversionEvent: channel.tracking.conversionEvent,
    },
    attributionParameters: campaign.tracking.attributionParameters.map(
      (parameter) => ({ ...parameter }),
    ),
    publishedAt: context.publishedAt ?? new Date().toISOString(),
  };
}

export function listCampaignPublishedLinks(
  campaign: Pick<CampaignDraft, "channels"> | null | undefined,
  channelId?: string,
): CampaignPublishedLink[] {
  if (!campaign) {
    return [];
  }

  const channels =
    channelId === undefined
      ? campaign.channels
      : campaign.channels.filter((channel) => channel.id === channelId);

  return channels.flatMap((channel) =>
    channel.publishedLinks.map(cloneCampaignPublishedLink),
  );
}

export function saveCampaignPublishedLink(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  channelId: string,
  context: CampaignPublishedLinkContext,
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  const channel = getCampaignPublishingChannelDetails(campaign, channelId);

  if (!channel) {
    throw new Error(`Campaign publishing channel "${channelId}" was not found.`);
  }

  const publishedLink = createCampaignPublishedLink(campaign, channelId, context);
  const channels = campaign.channels.map((candidate) => {
    if (candidate.id !== channel.id) {
      return candidate;
    }

    const existingLinks = candidate.publishedLinks.filter(
      (link) => link.id !== publishedLink.id,
    );

    return {
      ...candidate,
      publishedLinks: [...existingLinks, publishedLink],
      status: "published",
    } satisfies CampaignPublishingChannel;
  });

  return updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      channels,
    },
    options,
  );
}

export function generateDeterministicCampaignUtmParameters(
  campaign: CampaignUtmGenerationCampaignContext,
  channel: CampaignPublishingChannel,
  context: Partial<CampaignDestinationUrlContext> = {},
): CampaignUtmTracking {
  const campaignName =
    firstNonEmptyString(campaign.tracking.utm.campaign, campaign.title) ??
    campaign.id;
  const content =
    firstNonEmptyString(
      channel.tracking.utmContent,
      campaign.tracking.utm.content,
    ) ??
    [channel.placement, channel.id, context.responderId, context.messageId]
      .filter(isNonEmptyString)
      .join("-");

  return {
    source: toCampaignUtmSlug(
      firstNonEmptyString(
        channel.tracking.utmSource,
        campaign.tracking.utm.source,
        channel.platform,
      ),
      "owncanvas",
    ),
    medium: toCampaignUtmSlug(
      firstNonEmptyString(
        channel.tracking.utmMedium,
        campaign.tracking.utm.medium,
        channel.type,
      ),
      "campaign",
    ),
    campaign: toCampaignUtmSlug(campaignName, campaign.id),
    content: toCampaignUtmSlug(content, channel.id),
    term: toCampaignUtmSlug(
      firstNonEmptyString(campaign.tracking.utm.term, campaign.objective),
      campaign.id,
    ),
  };
}

function resolveCampaignPublishedLinkUtm(
  campaign: CampaignUtmGenerationCampaignContext,
  channel: CampaignPublishingChannel,
  context: Partial<CampaignDestinationUrlContext>,
): CampaignUtmTracking {
  return generateDeterministicCampaignUtmParameters(campaign, channel, context);
}

function firstNonEmptyString(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find(isNonEmptyString);
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function toCampaignUtmSlug(value: string | undefined, fallback: string): string {
  const normalized =
    value
      ?.trim()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ?? "";

  if (normalized !== "") {
    return normalized;
  }

  return (
    fallback
      .trim()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "campaign"
  );
}

function cloneCampaignPublishedLink(
  link: CampaignPublishedLink,
): CampaignPublishedLink {
  return {
    id: link.id,
    channelId: link.channelId,
    destinationUrl: link.destinationUrl,
    publishedUrl: link.publishedUrl,
    utm: { ...link.utm },
    owncanvasParameters: { ...link.owncanvasParameters },
    attributionParameters: link.attributionParameters.map((parameter) => ({
      ...parameter,
    })),
    publishedAt: link.publishedAt,
  };
}

function normalizeCampaignPublishingChannelPublishedLinks(
  campaign: Pick<CampaignDraft, "id" | "tracking"> &
    Partial<Pick<CampaignDraft, "title" | "objective">>,
  channel: CampaignPublishingChannel,
): CampaignPublishingChannel {
  if (channel.publishedLinks.length === 0) {
    return channel;
  }

  return {
    ...channel,
    publishedLinks: channel.publishedLinks.map((link) => ({
      ...cloneCampaignPublishedLink(link),
      publishedUrl: appendCampaignTrackingParametersToUrl(
        link.publishedUrl,
        campaign,
        channel,
        {
          responderId: link.owncanvasParameters.responderId,
          messageId: link.owncanvasParameters.messageId,
        },
      ),
    })),
  };
}

function normalizeCampaignPublishingChannelsPublishedLinks(
  campaign: Pick<CampaignDraft, "id" | "tracking"> &
    Partial<Pick<CampaignDraft, "title" | "objective">>,
  channels: CampaignPublishingChannel[],
): CampaignPublishingChannel[] {
  return channels.map((channel) =>
    normalizeCampaignPublishingChannelPublishedLinks(campaign, channel),
  );
}

function setSearchParameter(
  parameters: URLSearchParams,
  key: string,
  value: string,
) {
  if (key.trim() === "" || value.trim() === "") {
    return;
  }

  parameters.set(key, value);
}

function mergeCampaignAsset(
  asset: CampaignAsset,
  changes: CampaignAssetEditInput &
    Partial<
      Pick<
        CampaignAsset,
        "source" | "uri" | "fileName" | "mimeType" | "sizeBytes"
      >
    >,
): CampaignAsset {
  const rightsSourceUrl = changes.rights?.sourceUrl;

  return {
    ...asset,
    ...changes,
    rights: {
      owner: changes.rights?.owner ?? asset.rights.owner,
      license: changes.rights?.license ?? asset.rights.license,
      ...(rightsSourceUrl === undefined
        ? asset.rights.sourceUrl === undefined
          ? {}
          : { sourceUrl: asset.rights.sourceUrl }
        : rightsSourceUrl.trim() === ""
          ? {}
          : { sourceUrl: rightsSourceUrl }),
    },
  };
}

export function validateCampaignAssets(
  assets: CampaignAsset[],
): CampaignAssetValidationResult {
  const errors: CampaignAssetValidationError[] = [];

  assets.forEach((asset, index) => {
    if (asset.id.trim() === "") {
      errors.push({
        code: "asset.id_required",
        path: `assets.${index}.id`,
        message: "Campaign asset id is required.",
      });
    }

    if (asset.title.trim() === "") {
      errors.push({
        code: "asset.title_required",
        path: `assets.${index}.title`,
        message: "Campaign asset title is required.",
      });
    }

    if (asset.uri.trim() === "") {
      errors.push({
        code: "asset.uri_required",
        path: `assets.${index}.uri`,
        message: "Campaign asset URI is required.",
      });
    } else if (asset.source === "link" && !isHttpUrl(asset.uri)) {
      errors.push({
        code: "asset.uri_invalid",
        path: `assets.${index}.uri`,
        message: "Linked campaign asset URI must be a valid http or https URL.",
      });
    }

    if (asset.source === "upload" && asset.fileName.trim() === "") {
      errors.push({
        code: "asset.file_name_required",
        path: `assets.${index}.fileName`,
        message: "Uploaded campaign asset file name is required.",
      });
    }

    if (
      asset.sizeBytes !== null &&
      (!Number.isFinite(asset.sizeBytes) || asset.sizeBytes < 0)
    ) {
      errors.push({
        code: "asset.size_invalid",
        path: `assets.${index}.sizeBytes`,
        message: "Campaign asset size cannot be negative.",
      });
    }

    if (asset.rights.owner.trim() === "") {
      errors.push({
        code: "asset.rights_owner_required",
        path: `assets.${index}.rights.owner`,
        message: "Campaign asset rights owner is required.",
      });
    }

    if (
      asset.rights.sourceUrl !== undefined &&
      asset.rights.sourceUrl.trim() !== "" &&
      !isHttpUrl(asset.rights.sourceUrl)
    ) {
      errors.push({
        code: "asset.rights_source_url_invalid",
        path: `assets.${index}.rights.sourceUrl`,
        message:
          "Campaign asset rights source URL must be a valid http or https URL.",
      });
    }

    if (asset.outputLocations !== undefined) {
      if (!isHttpUrl(asset.outputLocations.primaryUri)) {
        errors.push({
          code: "asset.output_location_invalid",
          path: `assets.${index}.outputLocations.primaryUri`,
          message:
            "Campaign asset primary output location must be a valid http or https URL.",
        });
      }

      if (
        asset.outputLocations.thumbnailUri !== undefined &&
        !isHttpUrl(asset.outputLocations.thumbnailUri)
      ) {
        errors.push({
          code: "asset.output_location_invalid",
          path: `assets.${index}.outputLocations.thumbnailUri`,
          message:
            "Campaign asset thumbnail output location must be a valid http or https URL.",
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCampaignAssetGenerationJobs(
  jobs: unknown,
): CampaignAssetGenerationValidationResult {
  const errors: CampaignAssetGenerationValidationError[] = [];
  const seenJobIds = new Set<string>();

  if (!Array.isArray(jobs)) {
    return {
      valid: false,
      errors: [
        {
          code: "asset_generation_job.list_required",
          path: "campaignSpec.assetGenerationJobs",
          message: "Asset generation jobs must be an array.",
        },
      ],
    };
  }

  jobs.forEach((job, jobIndex) => {
    const jobPath = `campaignSpec.assetGenerationJobs.${jobIndex}`;

    if (!isRecord(job)) {
      errors.push({
        code: "asset_generation_job.object_required",
        path: jobPath,
        message: "Asset generation jobs must be objects.",
      });
      return;
    }

    if (typeof job.id !== "string" || job.id.trim() === "") {
      errors.push({
        code: "asset_generation_job.id_required",
        path: `${jobPath}.id`,
        message: "Asset generation job id is required.",
      });
    } else if (seenJobIds.has(job.id)) {
      errors.push({
        code: "asset_generation_job.id_duplicate",
        path: `${jobPath}.id`,
        message: "Asset generation job id must be unique.",
      });
    } else {
      seenJobIds.add(job.id);
    }

    if (
      typeof job.status !== "string" ||
      !(CAMPAIGN_ASSET_GENERATION_JOB_STATUSES as readonly string[]).includes(
        job.status,
      )
    ) {
      errors.push({
        code: "asset_generation_job.status_invalid",
        path: `${jobPath}.status`,
        message: "Asset generation job status is invalid.",
      });
    }

    if (job.mediaType !== "image" && job.mediaType !== "video") {
      errors.push({
        code: "asset_generation_job.media_type_required",
        path: `${jobPath}.mediaType`,
        message: "Asset generation job media type must be image or video.",
      });
    }

    if (
      typeof job.providerPluginId !== "string" ||
      job.providerPluginId.trim() === ""
    ) {
      errors.push({
        code: "asset_generation_job.provider_plugin_id_required",
        path: `${jobPath}.providerPluginId`,
        message: "Asset generation job provider plugin id is required.",
      });
    }

    if (
      typeof job.capabilityId !== "string" ||
      job.capabilityId.trim() === ""
    ) {
      errors.push({
        code: "asset_generation_job.capability_id_required",
        path: `${jobPath}.capabilityId`,
        message: "Asset generation job capability id is required.",
      });
    }

    const requiredInputs = Array.isArray(job.requiredInputs)
      ? job.requiredInputs
      : [];

    if (requiredInputs.length === 0) {
      errors.push({
        code: "asset_generation_job.required_input_required",
        path: `${jobPath}.requiredInputs`,
        message: "Asset generation job requires at least one input.",
      });
    }

    requiredInputs.forEach((input, inputIndex) => {
      const inputPath = `${jobPath}.requiredInputs.${inputIndex}`;

      if (!isRecord(input)) {
        errors.push({
          code: "asset_generation_job.required_input_key_required",
          path: `${inputPath}.key`,
          message: "Asset generation required input key is required.",
        });
        errors.push({
          code: "asset_generation_job.required_input_source_required",
          path: `${inputPath}.source`,
          message: "Asset generation required input source is required.",
        });
        return;
      }

      if (typeof input.key !== "string" || input.key.trim() === "") {
        errors.push({
          code: "asset_generation_job.required_input_key_required",
          path: `${inputPath}.key`,
          message: "Asset generation required input key is required.",
        });
      }

      if (typeof input.source !== "string" || input.source.trim() === "") {
        errors.push({
          code: "asset_generation_job.required_input_source_required",
          path: `${inputPath}.source`,
          message: "Asset generation required input source is required.",
        });
      }
    });

    const outputTargets = Array.isArray(job.outputTargets)
      ? job.outputTargets
      : [];

    if (outputTargets.length === 0) {
      errors.push({
        code: "asset_generation_job.output_target_required",
        path: `${jobPath}.outputTargets`,
        message: "Asset generation job requires at least one output target.",
      });
    }

    outputTargets.forEach((target, targetIndex) => {
      const targetPath = `${jobPath}.outputTargets.${targetIndex}`;

      if (!isRecord(target)) {
        errors.push({
          code: "asset_generation_job.output_target_asset_id_required",
          path: `${targetPath}.assetId`,
          message: "Asset generation output target asset id is required.",
        });
        errors.push({
          code: "asset_generation_job.output_target_field_required",
          path: `${targetPath}.field`,
          message: "Asset generation output target field is required.",
        });
        return;
      }

      if (typeof target.assetId !== "string" || target.assetId.trim() === "") {
        errors.push({
          code: "asset_generation_job.output_target_asset_id_required",
          path: `${targetPath}.assetId`,
          message: "Asset generation output target asset id is required.",
        });
      }

      if (typeof target.field !== "string" || target.field.trim() === "") {
        errors.push({
          code: "asset_generation_job.output_target_field_required",
          path: `${targetPath}.field`,
          message: "Asset generation output target field is required.",
        });
      }
    });

    const lifecycle = job.lifecycle;

    if (lifecycle !== undefined && lifecycle !== null) {
      const lifecyclePath = `campaignSpec.assetGenerationJobs.${jobIndex}.lifecycle`;

      if (!isRecord(lifecycle)) {
        errors.push({
          code: "asset_generation_job.lifecycle_attempt_invalid",
          path: `${lifecyclePath}.attempt`,
          message: "Asset generation lifecycle attempt cannot be negative.",
        });
        errors.push({
          code: "asset_generation_job.lifecycle_progress_invalid",
          path: `${lifecyclePath}.progress`,
          message: "Asset generation lifecycle progress must be 0 through 100.",
        });
        return;
      }

      const lifecycleRecord =
        lifecycle as Partial<CampaignAssetGenerationJobLifecycle>;
      const lifecycleAttempt = lifecycleRecord.attempt;

      if (
        typeof lifecycleAttempt !== "number" ||
        !Number.isInteger(lifecycleAttempt) ||
        lifecycleAttempt < 0
      ) {
        errors.push({
          code: "asset_generation_job.lifecycle_attempt_invalid",
          path: `${lifecyclePath}.attempt`,
          message: "Asset generation lifecycle attempt cannot be negative.",
        });
      }

      const lifecycleProgress = lifecycleRecord.progress;

      if (
        typeof lifecycleProgress !== "number" ||
        !Number.isFinite(lifecycleProgress) ||
        lifecycleProgress < 0 ||
        lifecycleProgress > 100
      ) {
        errors.push({
          code: "asset_generation_job.lifecycle_progress_invalid",
          path: `${lifecyclePath}.progress`,
          message: "Asset generation lifecycle progress must be 0 through 100.",
        });
      }

      const timestampFields = [
        "createdAt",
        "updatedAt",
        "queuedAt",
        "startedAt",
        "completedAt",
        "failedAt",
        "canceledAt",
      ] as const;

      timestampFields.forEach((field) => {
        const value = lifecycleRecord[field];

        if (
          value !== null &&
          value !== "" &&
          (typeof value !== "string" || Number.isNaN(Date.parse(value)))
        ) {
          errors.push({
            code: "asset_generation_job.lifecycle_timestamp_invalid",
            path: `${lifecyclePath}.${field}`,
            message:
              "Asset generation lifecycle timestamps must be valid timestamps.",
          });
        }
      });

      if (job.status === "failed" && lifecycle.error === null) {
        errors.push({
          code: "asset_generation_job.lifecycle_error_required",
          path: `${lifecyclePath}.error`,
          message: "Failed asset generation jobs require lifecycle error metadata.",
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCampaignProductOffer(
  productOffer: CampaignProductOffer,
): CampaignProductOfferValidationResult {
  if (isEmptyCampaignProductOffer(productOffer)) {
    return {
      valid: true,
      errors: [],
    };
  }

  const errors: CampaignProductOfferValidationError[] = [];

  if (productOffer.product.title.trim() === "") {
    errors.push({
      code: "product.title_required",
      path: "product.title",
      message: "Product title is required.",
    });
  }

  if (
    productOffer.product.canonicalUrl.trim() !== "" &&
    !isHttpUrl(productOffer.product.canonicalUrl)
  ) {
    errors.push({
      code: "product.canonical_url_invalid",
      path: "product.canonicalUrl",
      message: "Product canonical URL must be a valid http or https URL.",
    });
  }

  productOffer.product.media.forEach((media, index) => {
    if (media.id.trim() === "") {
      errors.push({
        code: "product.media_id_required",
        path: `product.media.${index}.id`,
        message: "Product media id is required.",
      });
    }

    if (!isHttpUrl(media.url)) {
      errors.push({
        code: "product.media_url_invalid",
        path: `product.media.${index}.url`,
        message: "Product media URL must be a valid http or https URL.",
      });
    }
  });

  productOffer.product.variants.forEach((variant, index) => {
    if (variant.id.trim() === "") {
      errors.push({
        code: "product.variant_id_required",
        path: `product.variants.${index}.id`,
        message: "Product variant id is required.",
      });
    }

    if (variant.title.trim() === "") {
      errors.push({
        code: "product.variant_title_required",
        path: `product.variants.${index}.title`,
        message: "Product variant title is required.",
      });
    }

    if (
      variant.price.amount !== null &&
      (!Number.isFinite(variant.price.amount) || variant.price.amount < 0)
    ) {
      errors.push({
        code: "product.variant_price_invalid",
        path: `product.variants.${index}.price.amount`,
        message: "Product variant price amount cannot be negative.",
      });
    }

    if (!isCurrencyCode(variant.price.currency)) {
      errors.push({
        code: "product.variant_currency_invalid",
        path: `product.variants.${index}.price.currency`,
        message:
          "Product variant price currency must be a three-letter uppercase code.",
      });
    }
  });

  if (productOffer.offer.headline.trim() === "") {
    errors.push({
      code: "offer.headline_required",
      path: "offer.headline",
      message: "Offer headline is required.",
    });
  }

  if (!isHttpUrl(productOffer.offer.destinationUrl)) {
    errors.push({
      code: "offer.destination_url_invalid",
      path: "offer.destinationUrl",
      message: "Offer destination URL must be a valid http or https URL.",
    });
  }

  if (productOffer.offer.callToAction.trim() === "") {
    errors.push({
      code: "offer.call_to_action_required",
      path: "offer.callToAction",
      message: "Offer call to action is required.",
    });
  }

  if (
    productOffer.offer.price.amount !== null &&
    (!Number.isFinite(productOffer.offer.price.amount) ||
      productOffer.offer.price.amount < 0)
  ) {
    errors.push({
      code: "offer.price_invalid",
      path: "offer.price.amount",
      message: "Offer price amount cannot be negative.",
    });
  }

  if (!isCurrencyCode(productOffer.offer.price.currency)) {
    errors.push({
      code: "offer.currency_invalid",
      path: "offer.price.currency",
      message: "Offer price currency must be a three-letter uppercase code.",
    });
  }

  if (
    productOffer.attribution.commissionRate !== null &&
    (!Number.isFinite(productOffer.attribution.commissionRate) ||
      productOffer.attribution.commissionRate < 0 ||
      productOffer.attribution.commissionRate > 100)
  ) {
    errors.push({
      code: "attribution.commission_rate_invalid",
      path: "attribution.commissionRate",
      message: "Commission rate must be between 0 and 100.",
    });
  }

  if (
    productOffer.attribution.trackingUrl.trim() !== "" &&
    !isHttpUrl(productOffer.attribution.trackingUrl)
  ) {
    errors.push({
      code: "attribution.tracking_url_invalid",
      path: "attribution.trackingUrl",
      message: "Attribution tracking URL must be a valid http or https URL.",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCampaignPublishingConfiguration(
  channels: CampaignPublishingChannel[],
): CampaignPublishingValidationResult {
  const errors: CampaignPublishingValidationError[] = [];
  const channelIds = new Set<string>();

  channels.forEach((channel, index) => {
    const path = `channels.${index}`;
    const trimmedChannelId = channel.id.trim();
    const requiresReadyConfiguration = channel.status !== "draft";

    if (trimmedChannelId === "") {
      errors.push({
        code: "channel.id_required",
        path: `${path}.id`,
        message: "Publishing channel id is required.",
      });
    } else if (channelIds.has(trimmedChannelId)) {
      errors.push({
        code: "channel.id_duplicate",
        path: `${path}.id`,
        message: "Publishing channel ids must be unique.",
      });
    } else {
      channelIds.add(trimmedChannelId);
    }

    if (channel.platform.trim() === "") {
      errors.push({
        code: "channel.platform_required",
        path: `${path}.platform`,
        message: "Publishing platform is required.",
      });
    }

    if (channel.label.trim() === "") {
      errors.push({
        code: "channel.label_required",
        path: `${path}.label`,
        message: "Publishing channel label is required.",
      });
    }

    if (
      requiresReadyConfiguration &&
      channel.type !== "custom" &&
      channel.providerPluginId.trim() === ""
    ) {
      errors.push({
        code: "channel.provider_plugin_id_required",
        path: `${path}.providerPluginId`,
        message: "Publishing provider plugin id is required.",
      });
    }

    if (
      requiresReadyConfiguration &&
      requiresPublishingAccount(channel.type)
    ) {
      if (channel.account.id.trim() === "") {
        errors.push({
          code: "channel.account_id_required",
          path: `${path}.account.id`,
          message: "Publishing account id is required for this channel type.",
        });
      }

      if (channel.account.handle.trim() === "") {
        errors.push({
          code: "channel.account_handle_required",
          path: `${path}.account.handle`,
          message: "Publishing account handle is required for this channel type.",
        });
      }
    }

    if (channel.placement.trim() === "") {
      errors.push({
        code: "channel.placement_required",
        path: `${path}.placement`,
        message: "Publishing placement is required.",
      });
    }

    if (channel.destinationUrl.trim() === "") {
      errors.push({
        code: "channel.destination_url_required",
        path: `${path}.destinationUrl`,
        message: "Publishing destination URL is required.",
      });
    } else if (!isHttpUrl(channel.destinationUrl)) {
      errors.push({
        code: "channel.destination_url_invalid",
        path: `${path}.destinationUrl`,
        message: "Publishing destination URL must be a valid http or https URL.",
      });
    }

    if (
      requiresReadyConfiguration &&
      (channel.type === "direct-message" || channel.type === "landing") &&
      channel.landingPageId.trim() === ""
    ) {
      errors.push({
        code: "channel.landing_page_id_required",
        path: `${path}.landingPageId`,
        message:
          "Publishing landing page id is required for DM and landing channels.",
      });
    }

    if (
      requiresReadyConfiguration &&
      channel.schedule.mode !== "manual" &&
      channel.schedule.startsAt.trim() === ""
    ) {
      errors.push({
        code: "channel.schedule_starts_at_required",
        path: `${path}.schedule.startsAt`,
        message: "Publishing schedule start time is required.",
      });
    }

    if (
      channel.schedule.startsAt.trim() !== "" &&
      Number.isNaN(Date.parse(channel.schedule.startsAt))
    ) {
      errors.push({
        code: "channel.schedule_starts_at_invalid",
        path: `${path}.schedule.startsAt`,
        message: "Publishing schedule start time must be a valid timestamp.",
      });
    }

    if (channel.schedule.timezone.trim() === "") {
      errors.push({
        code: "channel.schedule_timezone_required",
        path: `${path}.schedule.timezone`,
        message: "Publishing schedule timezone is required.",
      });
    }

    if (
      requiresReadyConfiguration &&
      channel.tracking.utmSource.trim() === ""
    ) {
      errors.push({
        code: "channel.utm_source_required",
        path: `${path}.tracking.utmSource`,
        message: "Publishing UTM source is required.",
      });
    }

    if (
      requiresReadyConfiguration &&
      channel.tracking.utmMedium.trim() === ""
    ) {
      errors.push({
        code: "channel.utm_medium_required",
        path: `${path}.tracking.utmMedium`,
        message: "Publishing UTM medium is required.",
      });
    }

    if (
      requiresReadyConfiguration &&
      channel.tracking.utmCampaign.trim() === ""
    ) {
      errors.push({
        code: "channel.utm_campaign_required",
        path: `${path}.tracking.utmCampaign`,
        message: "Publishing UTM campaign is required.",
      });
    }

    if (
      requiresReadyConfiguration &&
      channel.tracking.conversionEvent.trim() === ""
    ) {
      errors.push({
        code: "channel.conversion_event_required",
        path: `${path}.tracking.conversionEvent`,
        message: "Publishing conversion event is required.",
      });
    }

    const publishedLinkIds = new Set<string>();

    (channel.publishedLinks ?? []).forEach((link, linkIndex) => {
      const linkPath = `${path}.publishedLinks.${linkIndex}`;
      const trimmedLinkId = link.id.trim();

      if (trimmedLinkId === "") {
        errors.push({
          code: "channel.published_link_id_required",
          path: `${linkPath}.id`,
          message: "Published campaign link id is required.",
        });
      } else if (publishedLinkIds.has(trimmedLinkId)) {
        errors.push({
          code: "channel.published_link_id_duplicate",
          path: `${linkPath}.id`,
          message: "Published campaign link ids must be unique per channel.",
        });
      } else {
        publishedLinkIds.add(trimmedLinkId);
      }

      if (link.channelId !== channel.id) {
        errors.push({
          code: "channel.published_link_channel_id_mismatch",
          path: `${linkPath}.channelId`,
          message: "Published campaign link channel id must match its channel.",
        });
      }

      if (!isHttpUrl(link.destinationUrl)) {
        errors.push({
          code: "channel.published_link_destination_url_invalid",
          path: `${linkPath}.destinationUrl`,
          message:
            "Published campaign link destination URL must be a valid http or https URL.",
        });
      }

      if (!isHttpUrl(link.publishedUrl)) {
        errors.push({
          code: "channel.published_link_url_invalid",
          path: `${linkPath}.publishedUrl`,
          message:
            "Published campaign link URL must be a valid http or https URL.",
        });
      }

      if (link.utm.source.trim() === "") {
        errors.push({
          code: "channel.published_link_utm_source_required",
          path: `${linkPath}.utm.source`,
          message: "Published campaign link UTM source is required.",
        });
      }

      if (link.utm.medium.trim() === "") {
        errors.push({
          code: "channel.published_link_utm_medium_required",
          path: `${linkPath}.utm.medium`,
          message: "Published campaign link UTM medium is required.",
        });
      }

      if (link.utm.campaign.trim() === "") {
        errors.push({
          code: "channel.published_link_utm_campaign_required",
          path: `${linkPath}.utm.campaign`,
          message: "Published campaign link UTM campaign is required.",
        });
      }

      if (link.publishedAt.trim() === "") {
        errors.push({
          code: "channel.published_link_published_at_required",
          path: `${linkPath}.publishedAt`,
          message: "Published campaign link timestamp is required.",
        });
      } else if (Number.isNaN(Date.parse(link.publishedAt))) {
        errors.push({
          code: "channel.published_link_published_at_invalid",
          path: `${linkPath}.publishedAt`,
          message: "Published campaign link timestamp must be valid.",
        });
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCampaignMeasurementGoals(
  measurementGoals: CampaignMeasurementGoal[],
): CampaignMeasurementGoalValidationResult {
  const errors: CampaignMeasurementGoalValidationError[] = [];
  const goalIds = new Set<string>();

  measurementGoals.forEach((goal, index) => {
    const path = `tracking.measurementGoals.${index}`;
    const trimmedGoalId = goal.id.trim();

    if (trimmedGoalId === "") {
      errors.push({
        code: "measurement_goal.id_required",
        path: `${path}.id`,
        message: "Measurement goal id is required.",
      });
    } else if (goalIds.has(trimmedGoalId)) {
      errors.push({
        code: "measurement_goal.id_duplicate",
        path: `${path}.id`,
        message: "Measurement goal ids must be unique.",
      });
    } else {
      goalIds.add(trimmedGoalId);
    }

    if (goal.name.trim() === "") {
      errors.push({
        code: "measurement_goal.name_required",
        path: `${path}.name`,
        message: "Measurement metric name is required.",
      });
    }

    if (
      goal.target !== null &&
      (!Number.isFinite(goal.target) || goal.target < 0)
    ) {
      errors.push({
        code: "measurement_goal.target_invalid",
        path: `${path}.target`,
        message: "Measurement target cannot be negative.",
      });
    }

    if (goal.unit.trim() === "") {
      errors.push({
        code: "measurement_goal.unit_required",
        path: `${path}.unit`,
        message: "Measurement goal unit is required.",
      });
    }

    if (goal.successCriteria.trim() === "") {
      errors.push({
        code: "measurement_goal.success_criteria_required",
        path: `${path}.successCriteria`,
        message: "Measurement success criteria are required.",
      });
    }

    if (goal.reportingTimeframe.startsAt.trim() === "") {
      errors.push({
        code: "measurement_goal.reporting_starts_at_required",
        path: `${path}.reportingTimeframe.startsAt`,
        message: "Measurement reporting start time is required.",
      });
    } else if (Number.isNaN(Date.parse(goal.reportingTimeframe.startsAt))) {
      errors.push({
        code: "measurement_goal.reporting_starts_at_invalid",
        path: `${path}.reportingTimeframe.startsAt`,
        message: "Measurement reporting start time must be a valid timestamp.",
      });
    }

    if (goal.reportingTimeframe.endsAt.trim() === "") {
      errors.push({
        code: "measurement_goal.reporting_ends_at_required",
        path: `${path}.reportingTimeframe.endsAt`,
        message: "Measurement reporting end time is required.",
      });
    } else if (Number.isNaN(Date.parse(goal.reportingTimeframe.endsAt))) {
      errors.push({
        code: "measurement_goal.reporting_ends_at_invalid",
        path: `${path}.reportingTimeframe.endsAt`,
        message: "Measurement reporting end time must be a valid timestamp.",
      });
    }

    if (goal.reportingTimeframe.timezone.trim() === "") {
      errors.push({
        code: "measurement_goal.reporting_timezone_required",
        path: `${path}.reportingTimeframe.timezone`,
        message: "Measurement reporting timezone is required.",
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCampaignMeasurementMetrics(
  metrics: CampaignMeasurementMetric[],
): CampaignMeasurementMetricValidationResult {
  const errors: CampaignMeasurementMetricValidationError[] = [];
  const metricIds = new Set<string>();

  metrics.forEach((metric, index) => {
    const path = `tracking.metrics.${index}`;
    const trimmedMetricId = metric.id.trim();

    if (trimmedMetricId === "") {
      errors.push({
        code: "measurement_metric.id_required",
        path: `${path}.id`,
        message: "Measurement metric id is required.",
      });
    } else if (metricIds.has(trimmedMetricId)) {
      errors.push({
        code: "measurement_metric.id_duplicate",
        path: `${path}.id`,
        message: "Measurement metric ids must be unique.",
      });
    } else {
      metricIds.add(trimmedMetricId);
    }

    if (metric.metric.trim() === "") {
      errors.push({
        code: "measurement_metric.metric_required",
        path: `${path}.metric`,
        message: "Measurement metric name is required.",
      });
    }

    if (!Number.isFinite(metric.value) || metric.value < 0) {
      errors.push({
        code: "measurement_metric.value_invalid",
        path: `${path}.value`,
        message: "Measurement metric value cannot be negative.",
      });
    }

    if (metric.unit.trim() === "") {
      errors.push({
        code: "measurement_metric.unit_required",
        path: `${path}.unit`,
        message: "Measurement metric unit is required.",
      });
    }

    if (metric.source.trim() === "") {
      errors.push({
        code: "measurement_metric.source_required",
        path: `${path}.source`,
        message: "Measurement metric source is required.",
      });
    }

    if (metric.attributionTouchpoint.trim() === "") {
      errors.push({
        code: "measurement_metric.attribution_touchpoint_required",
        path: `${path}.attributionTouchpoint`,
        message: "Measurement metric attribution touchpoint is required.",
      });
    }

    if (metric.observedAt.trim() === "") {
      errors.push({
        code: "measurement_metric.observed_at_required",
        path: `${path}.observedAt`,
        message: "Measurement metric observed time is required.",
      });
    } else if (Number.isNaN(Date.parse(metric.observedAt))) {
      errors.push({
        code: "measurement_metric.observed_at_invalid",
        path: `${path}.observedAt`,
        message: "Measurement metric observed time must be a valid timestamp.",
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCampaignTrackingConfiguration(
  tracking: CampaignTracking,
): CampaignTrackingValidationResult {
  const errors: CampaignTrackingValidationError[] = [];
  const pixelEventIds = new Set<string>();
  const analyticsDestinationIds = new Set<string>();

  tracking.attributionParameters.forEach((parameter, index) => {
    const path = `tracking.attributionParameters.${index}`;

    if (parameter.key.trim() === "") {
      errors.push({
        code: "tracking.attribution_parameter_key_required",
        path: `${path}.key`,
        message: "Attribution parameter key is required.",
      });
    }

    if (parameter.value.trim() === "") {
      errors.push({
        code: "tracking.attribution_parameter_value_required",
        path: `${path}.value`,
        message: "Attribution parameter value is required.",
      });
    }

    if (parameter.source.trim() === "") {
      errors.push({
        code: "tracking.attribution_parameter_source_required",
        path: `${path}.source`,
        message: "Attribution parameter source is required.",
      });
    }
  });

  tracking.pixelEvents.forEach((pixelEvent, index) => {
    const path = `tracking.pixelEvents.${index}`;
    const trimmedPixelEventId = pixelEvent.id.trim();

    if (trimmedPixelEventId === "") {
      errors.push({
        code: "tracking.pixel_event_id_required",
        path: `${path}.id`,
        message: "Pixel event id is required.",
      });
    } else if (pixelEventIds.has(trimmedPixelEventId)) {
      errors.push({
        code: "tracking.pixel_event_id_duplicate",
        path: `${path}.id`,
        message: "Pixel event ids must be unique.",
      });
    } else {
      pixelEventIds.add(trimmedPixelEventId);
    }

    if (pixelEvent.provider.trim() === "") {
      errors.push({
        code: "tracking.pixel_provider_required",
        path: `${path}.provider`,
        message: "Pixel provider is required.",
      });
    }

    if (pixelEvent.pixelId.trim() === "") {
      errors.push({
        code: "tracking.pixel_id_required",
        path: `${path}.pixelId`,
        message: "Pixel identifier is required.",
      });
    }

    if (pixelEvent.eventName.trim() === "") {
      errors.push({
        code: "tracking.pixel_event_name_required",
        path: `${path}.eventName`,
        message: "Pixel event name is required.",
      });
    }
  });

  tracking.analyticsDestinations.forEach((destination, index) => {
    const path = `tracking.analyticsDestinations.${index}`;
    const trimmedDestinationId = destination.id.trim();

    if (trimmedDestinationId === "") {
      errors.push({
        code: "tracking.analytics_destination_id_required",
        path: `${path}.id`,
        message: "Analytics destination id is required.",
      });
    } else if (analyticsDestinationIds.has(trimmedDestinationId)) {
      errors.push({
        code: "tracking.analytics_destination_id_duplicate",
        path: `${path}.id`,
        message: "Analytics destination ids must be unique.",
      });
    } else {
      analyticsDestinationIds.add(trimmedDestinationId);
    }

    if (destination.provider.trim() === "") {
      errors.push({
        code: "tracking.analytics_provider_required",
        path: `${path}.provider`,
        message: "Analytics destination provider is required.",
      });
    }

    if (destination.destinationId.trim() === "") {
      errors.push({
        code: "tracking.analytics_destination_identifier_required",
        path: `${path}.destinationId`,
        message: "Analytics destination identifier is required.",
      });
    }

    if (destination.label.trim() === "") {
      errors.push({
        code: "tracking.analytics_destination_label_required",
        path: `${path}.label`,
        message: "Analytics destination label is required.",
      });
    }
  });

  tracking.events.forEach((eventName, index) => {
    if (eventName.trim() === "") {
      errors.push({
        code: "tracking.event_name_required",
        path: `tracking.events.${index}`,
        message: "Tracking event name is required.",
      });
    }
  });

  tracking.conversions.forEach((conversionEvent, index) => {
    if (conversionEvent.trim() === "") {
      errors.push({
        code: "tracking.conversion_event_required",
        path: `tracking.conversions.${index}`,
        message: "Conversion event name is required.",
      });
    }
  });

  if (
    tracking.conversions.length > 0 &&
    tracking.attribution.touchpoints.length === 0
  ) {
    errors.push({
      code: "tracking.attribution_touchpoint_required",
      path: "tracking.attribution.touchpoints",
      message:
        "At least one attribution touchpoint is required when conversions are tracked.",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function requiresPublishingAccount(type: CampaignPublishingChannelType) {
  return (
    type === "social" ||
    type === "direct-message" ||
    type === "email" ||
    type === "paid-ad"
  );
}

export function createCampaignWorkflowPluginConfiguration(
  input: CreateCampaignWorkflowPluginConfigurationInput,
  options: { now?: () => string } = {},
): CampaignWorkflowPluginConfiguration {
  const timestamp = options.now?.() ?? new Date().toISOString();
  const lifecycleState = input.lifecycleState ?? "installed";
  const configuredAt = input.configuredAt ??
    (lifecycleState === "configured" || lifecycleState === "active"
      ? timestamp
      : undefined);
  const activatedAt = input.activatedAt ??
    (lifecycleState === "active" ? timestamp : undefined);

  return {
    pluginId: input.pluginId,
    type: input.type,
    lifecycleState,
    permissionMode: input.permissionMode,
    capabilityIds: input.capabilityIds ?? [],
    configuration: {
      values: input.configuration?.values ?? {},
      secretRefs: input.configuration?.secretRefs ?? {},
      ...(configuredAt === undefined ? {} : { updatedAt: configuredAt }),
    },
    installedBy: input.installedBy,
    ...(input.configuredBy === undefined ? {} : { configuredBy: input.configuredBy }),
    ...(input.activatedBy === undefined ? {} : { activatedBy: input.activatedBy }),
    installedAt: input.installedAt ?? timestamp,
    ...(configuredAt === undefined ? {} : { configuredAt }),
    ...(activatedAt === undefined ? {} : { activatedAt }),
    ...(input.deactivatedAt === undefined
      ? {}
      : { deactivatedAt: input.deactivatedAt }),
    updatedAt: timestamp,
  };
}

export function setCampaignWorkflowPluginActivation<
  TCampaign extends CampaignDraft,
>(
  campaign: TCampaign,
  pluginId: string,
  options: SetCampaignWorkflowPluginActivationOptions,
): TCampaign {
  const timestamp = options.now?.() ?? new Date().toISOString();
  const nextLifecycleState = options.active ? "active" : "inactive";
  const existingPlugin = campaign.plugins.find(
    (plugin) => plugin.pluginId === pluginId,
  );

  if (existingPlugin === undefined) {
    throw new Error(`Workflow plugin "${pluginId}" is not configured.`);
  }

  if (options.active) {
    if (
      existingPlugin.lifecycleState !== "configured" &&
      existingPlugin.lifecycleState !== "inactive" &&
      existingPlugin.lifecycleState !== "active"
    ) {
      throw new Error(
        `Workflow plugin "${pluginId}" must be configured before activation.`,
      );
    }

    if (options.catalog !== undefined) {
      const manifest = options.catalog.plugins.find(
        (candidate) => candidate.id === pluginId,
      );

      if (manifest === undefined) {
        throw new Error(
          `Workflow plugin "${pluginId}" has no installed catalog manifest.`,
        );
      }

      if (manifest.type !== existingPlugin.type) {
        throw new Error(
          `Workflow plugin "${pluginId}" catalog type does not match the campaign configuration.`,
        );
      }

      if (
        manifest.lifecycle.state !== "installed" &&
        manifest.lifecycle.state !== "configured" &&
        manifest.lifecycle.state !== "active"
      ) {
        throw new Error(
          `Workflow plugin "${pluginId}" catalog lifecycle state "${manifest.lifecycle.state}" cannot be activated.`,
        );
      }

      if (!manifest.permissions.configurableBy.includes(options.actor)) {
        throw new Error(
          `Workflow plugin "${pluginId}" does not allow ${options.actor} activation.`,
        );
      }
    }
  }

  return {
    ...campaign,
    plugins: campaign.plugins.map((plugin) =>
      plugin.pluginId === pluginId
        ? {
            ...plugin,
            lifecycleState: nextLifecycleState,
            ...(options.active
              ? {
                  activatedBy: options.actor,
                  activatedAt: timestamp,
                }
              : {
                  deactivatedAt: timestamp,
                }),
            updatedAt: timestamp,
          }
        : plugin,
    ),
    logs: [
      ...campaign.logs,
      `${timestamp} plugin.${options.active ? "activated" : "deactivated"}:${pluginId}`,
    ],
    versions: [
      ...campaign.versions,
      `${timestamp} plugin.${options.active ? "activated" : "deactivated"}:${pluginId}`,
    ],
  };
}

export function loadActivatedPluginsIntoAgentWorkflowRuntime(
  campaign: Pick<CampaignDraft, "id" | "plugins">,
  catalog: PluginCatalog,
  options: LoadAgentWorkflowRuntimeOptions = {},
): AgentWorkflowRuntime {
  const mode = options.mode ?? "advanced";
  const loadedAt = options.now?.() ?? new Date().toISOString();
  const errors: AgentWorkflowRuntimeError[] = [];
  const plugins = campaign.plugins.flatMap((workflowPlugin, index) => {
    if (workflowPlugin.lifecycleState !== "active") {
      return [];
    }

    const manifest = catalog.plugins.find(
      (candidate) => candidate.id === workflowPlugin.pluginId,
    );
    const path = `plugins.${index}`;

    if (manifest === undefined) {
      errors.push({
        code: "runtime.plugin_manifest_not_found",
        message: "Active workflow plugin has no matching catalog manifest.",
        pluginId: workflowPlugin.pluginId,
        path,
      });
      return [];
    }

    if (manifest.type !== workflowPlugin.type) {
      errors.push({
        code: "runtime.plugin_type_mismatch",
        message: "Active workflow plugin type does not match its catalog manifest.",
        pluginId: workflowPlugin.pluginId,
        path: `${path}.type`,
      });
      return [];
    }

    if (mode === "basic" && workflowPlugin.permissionMode !== "basic") {
      errors.push({
        code: "runtime.permission_mode_blocked",
        message: "Advanced workflow plugin cannot be loaded in basic runtime mode.",
        pluginId: workflowPlugin.pluginId,
        path: `${path}.permissionMode`,
      });
      return [];
    }

    const usability = verifyAgentInstalledPluginUsable(manifest);

    if (!usability.ok) {
      usability.errors.forEach((error) => {
        errors.push({
          code: "runtime.plugin_not_usable",
          message: error.message,
          pluginId: workflowPlugin.pluginId,
          path: `${path}.${error.path}`,
        });
      });
      return [];
    }

    const capabilityIdFilter = new Set(workflowPlugin.capabilityIds);
    const capabilities = manifest.capabilities.flatMap((capability) => {
      if (
        capabilityIdFilter.size > 0 &&
        !capabilityIdFilter.has(capability.id)
      ) {
        return [];
      }

      const runtimeCapability = {
        id: capability.id,
        kind: capability.kind,
        title: capability.title,
        description: capability.description,
        inputPorts: capability.inputPorts,
        outputPorts: capability.outputPorts,
        supportsParallel: capability.concurrency.supportsParallel,
        supportsBulk: capability.concurrency.supportsBulk,
      } satisfies Omit<AgentWorkflowRuntimeCapability, "maxParallel">;

      return [
        capability.concurrency.maxParallel === undefined
          ? runtimeCapability
          : {
              ...runtimeCapability,
              maxParallel: capability.concurrency.maxParallel,
            },
      ];
    });

    workflowPlugin.capabilityIds.forEach((capabilityId) => {
      if (
        !manifest.capabilities.some((capability) => capability.id === capabilityId)
      ) {
        errors.push({
          code: "runtime.capability_not_found",
          message: "Active workflow plugin references a missing catalog capability.",
          pluginId: workflowPlugin.pluginId,
          path: `${path}.capabilityIds`,
        });
      }
    });

    return [
      {
        pluginId: workflowPlugin.pluginId,
        manifestId: manifest.id,
        name: manifest.name,
        displayName: manifest.metadata.displayName,
        type: manifest.type,
        originKind: manifest.origin.kind,
        permissionMode: workflowPlugin.permissionMode,
        requiresApprovalFor: manifest.permissions.requiresApprovalFor,
        ...(workflowPlugin.activatedBy === undefined
          ? {}
          : { activatedBy: workflowPlugin.activatedBy }),
        ...(workflowPlugin.activatedAt === undefined
          ? {}
          : { activatedAt: workflowPlugin.activatedAt }),
        configuration: workflowPlugin.configuration,
        capabilities,
      } satisfies AgentWorkflowRuntimePlugin,
    ];
  });

  return {
    campaignId: campaign.id,
    mode,
    loadedAt,
    plugins,
    errors,
  };
}

export function createBlankCampaignRecord(
  storage: Pick<Storage, "getItem" | "setItem">,
  options: CreateBlankCampaignRecordOptions = {},
): CampaignRecord {
  const timestamp = options.now?.() ?? new Date().toISOString();
  const campaignId = options.id ?? `campaign_${Date.now()}`;
  const draft = { ...createBlankCampaign(), id: campaignId };
  const workspaceState = createEmptyCampaignWorkspaceState(draft, timestamp);
  const campaign = {
    ...draft,
    workspaceState: {
      storageKey: CAMPAIGN_WORKSPACE_STORAGE_KEY,
      workspaceId: workspaceState.id,
      initializedAt: workspaceState.initializedAt,
    },
    logs: [`${timestamp} campaign.created`],
    versions: [`${timestamp} draft.created`],
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies CampaignRecord;
  const existingCampaigns = JSON.parse(
    storage.getItem(CAMPAIGN_STORAGE_KEY) ?? "[]",
  ) as CampaignRecord[];

  storage.setItem(
    CAMPAIGN_STORAGE_KEY,
    JSON.stringify([...existingCampaigns, campaign]),
  );
  storage.setItem(
    CAMPAIGN_WORKSPACE_STORAGE_KEY,
    JSON.stringify([
      ...getPersistedCampaignWorkspaceStates(storage),
      workspaceState,
    ]),
  );

  return campaign;
}

export function getCampaignCanvasPath(campaignId: string) {
  return `/campaigns/${encodeURIComponent(campaignId)}/canvas`;
}

export function getPersistedCampaignRecord(
  storage: Pick<Storage, "getItem">,
  campaignId: string,
): CampaignRecord | null {
  return (
    getPersistedCampaignRecords(storage).find(
      (campaign) => campaign.id === campaignId,
    ) ?? null
  );
}

export function getPersistedCampaignRecords(
  storage: Pick<Storage, "getItem">,
): CampaignRecord[] {
  return JSON.parse(storage.getItem(CAMPAIGN_STORAGE_KEY) ?? "[]") as CampaignRecord[];
}

export function updatePersistedCampaignRecord(
  storage: Pick<Storage, "getItem" | "setItem">,
  updatedCampaign: CampaignRecord,
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const timestamp = options.now?.() ?? new Date().toISOString();
  const assetValidation = validateCampaignAssets(updatedCampaign.assets);
  const assetGenerationValidation = validateCampaignAssetGenerationJobs(
    updatedCampaign.campaignSpec.assetGenerationJobs ?? [],
  );
  const productOfferValidation = validateCampaignProductOffer(
    updatedCampaign.productOffer,
  );
  const publishingValidation = validateCampaignPublishingConfiguration(
    updatedCampaign.channels,
  );
  const measurementGoalValidation = validateCampaignMeasurementGoals(
    updatedCampaign.tracking.measurementGoals ?? [],
  );
  const measurementMetricValidation = validateCampaignMeasurementMetrics(
    updatedCampaign.tracking.metrics ?? [],
  );
  const trackingValidation = validateCampaignTrackingConfiguration(
    updatedCampaign.tracking,
  );
  const completionValidation = validateCampaignCompletion(updatedCampaign);

  if (!assetValidation.valid) {
    throw new Error(
      `Invalid campaign assets: ${assetValidation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  if (!assetGenerationValidation.valid) {
    throw new Error(
      `Invalid campaign asset generation jobs: ${assetGenerationValidation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  if (!productOfferValidation.valid) {
    throw new Error(
      `Invalid campaign product offer: ${productOfferValidation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  if (!publishingValidation.valid) {
    throw new Error(
      `Invalid campaign publishing configuration: ${publishingValidation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  if (!measurementGoalValidation.valid) {
    throw new Error(
      `Invalid campaign measurement goals: ${measurementGoalValidation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  if (!measurementMetricValidation.valid) {
    throw new Error(
      `Invalid campaign measurement metrics: ${measurementMetricValidation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  if (!trackingValidation.valid) {
    throw new Error(
      `Invalid campaign tracking configuration: ${trackingValidation.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  if (!completionValidation.valid) {
    throw new CampaignCompletionActionError({
      reasons: completionValidation.errors,
      completionState: {
        measurementCycleCompletion:
          getCampaignMeasurementCycleCompletion(updatedCampaign),
        improvementStatus:
          getCampaignMeasurementBasedImprovementStatus(updatedCampaign),
      },
    });
  }

  const campaigns = JSON.parse(
    storage.getItem(CAMPAIGN_STORAGE_KEY) ?? "[]",
  ) as CampaignRecord[];
  const persistedCampaign = {
    ...updatedCampaign,
    updatedAt: timestamp,
  } satisfies CampaignRecord;
  const nextCampaigns = campaigns.some(
    (campaign) => campaign.id === persistedCampaign.id,
  )
    ? campaigns.map((campaign) =>
        campaign.id === persistedCampaign.id ? persistedCampaign : campaign,
      )
    : [...campaigns, persistedCampaign];

  storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(nextCampaigns));

  return persistedCampaign;
}

export function saveCampaignTargetAudienceDetails(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  targetAudience: CampaignTargetAudience,
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  return updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      targetAudience: createCampaignTargetAudience(targetAudience),
    },
    options,
  );
}

export function saveCampaignProductOfferDetails(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  productOffer: CampaignProductOffer,
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  return updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      productOffer: createCampaignProductOffer(productOffer),
    },
    options,
  );
}

export function saveCampaignPublishingConfiguration(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  channels: CampaignPublishingChannel[],
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  return updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      channels: normalizeCampaignPublishingChannelsPublishedLinks(
        campaign,
        channels,
      ),
    },
    options,
  );
}

export function saveCampaignMeasurementGoals(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  measurementGoals: CampaignMeasurementGoal[],
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  return updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      tracking: {
        ...campaign.tracking,
        measurementGoals,
      },
    },
    options,
  );
}

export function editCampaignMeasurementGoal(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  goalId: CampaignMeasurementGoal["id"],
  input: CampaignMeasurementGoalEditInput,
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  if (
    !campaign.tracking.measurementGoals.some((goal) => goal.id === goalId)
  ) {
    throw new Error(`Measurement goal "${goalId}" was not found.`);
  }

  return saveCampaignMeasurementGoals(
    storage,
    campaignId,
    campaign.tracking.measurementGoals.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            ...input,
            id: goal.id,
            reportingTimeframe: {
              ...goal.reportingTimeframe,
              ...input.reportingTimeframe,
            },
          }
        : goal,
    ),
    options,
  );
}

function createCompletedCampaignMeasurementCycleFromInputs(input: {
  measurementGoals: CampaignMeasurementGoal[];
  metrics: CampaignMeasurementMetric[];
  primarySuccessMetric: string;
  completedAt: string;
}): CampaignMeasurementCycle[] {
  if (input.metrics.length === 0) {
    return [];
  }

  const goalIds = input.measurementGoals
    .map((goal) => goal.id)
    .filter((goalId) => goalId.trim() !== "")
    .sort();
  const observedTimes = input.metrics
    .map((metric) => metric.observedAt)
    .filter((observedAt) => !Number.isNaN(Date.parse(observedAt)))
    .sort();
  const timeframeStarts = input.measurementGoals
    .map((goal) => goal.reportingTimeframe.startsAt)
    .filter((startsAt) => !Number.isNaN(Date.parse(startsAt)))
    .sort();
  const startedAt = timeframeStarts[0] ?? observedTimes[0] ?? input.completedAt;
  const cycleScope = goalIds.length === 0 ? "unscoped" : goalIds.join("_");

  return [{
    schemaVersion: "owncanvas.campaign-measurement-cycle.v1",
    id: `measurement_cycle_${cycleScope}_${toCampaignMeasurementCycleIdToken(
      input.completedAt,
    )}`,
    status: "completed",
    goalIds,
    startedAt,
    completedAt: input.completedAt,
    resultCount: input.metrics.length,
    performanceResults: input.metrics,
    primaryResult:
      input.metrics.find(
        (metric) => metric.metric === input.primarySuccessMetric,
      ) ?? input.metrics[0],
  }];
}

function upsertCampaignMeasurementCycle(
  cycles: CampaignMeasurementCycle[],
  cycle: CampaignMeasurementCycle,
) {
  return [
    ...cycles.filter((candidate) => candidate.id !== cycle.id),
    cycle,
  ];
}

function toCampaignMeasurementCycleIdToken(value: string) {
  return value.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function saveCampaignMeasurementMetrics(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  metrics: CampaignMeasurementMetric[],
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  const timestamp = options.now?.() ?? new Date().toISOString();
  const completedCycles = createCompletedCampaignMeasurementCycleFromInputs({
    measurementGoals: campaign.tracking.measurementGoals,
    metrics,
    primarySuccessMetric: campaign.tracking.evaluation.primarySuccessMetric.metric,
    completedAt: timestamp,
  });
  const measurementCycles =
    completedCycles.length === 0
      ? (campaign.tracking.measurementCycles ?? [])
      : upsertCampaignMeasurementCycle(
          campaign.tracking.measurementCycles ?? [],
          completedCycles[0],
        );

  return updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      tracking: {
        ...campaign.tracking,
        metrics,
        measurementCycles,
        improvementActions: createCampaignImprovementActionsFromMeasurement({
          measurementGoals: campaign.tracking.measurementGoals,
          measurementCycles,
          primarySuccessMetric:
            campaign.tracking.evaluation.primarySuccessMetric.metric,
        }),
      },
    },
    {
      ...options,
      now: () => timestamp,
    },
  );
}

export function saveCampaignTrackingConfiguration(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  tracking: CampaignTracking,
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  return updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      tracking: createCampaignTrackingConfiguration(tracking),
    },
    options,
  );
}

export function saveCampaignTrackingEvent(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  event: CampaignTrackingEvent,
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  const timestamp = options.now?.() ?? new Date().toISOString();
  const attributionMatch =
    event.type === "conversion"
      ? getPriorCampaignInteractionsForConversion(storage, event, {
          attributionWindowDays:
            getCampaignConversionEventAttributionWindowDays(event),
        }).attributionMatch
      : undefined;
  const conversionRecords =
    event.type === "conversion"
      ? upsertCampaignConversionEventRecord(
          campaign.tracking.conversionRecords ?? [],
          createCampaignConversionEventRecord(event, timestamp, attributionMatch),
        )
      : campaign.tracking.conversionRecords;
  const revisitRecords =
    event.type === "revisit"
      ? upsertCampaignRevisitEventRecord(
          campaign.tracking.revisitRecords ?? [],
          createCampaignRevisitEventRecord(event, timestamp),
        )
      : campaign.tracking.revisitRecords;
  const updatedCampaign = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      tracking: {
        ...campaign.tracking,
        events: appendUnique(campaign.tracking.events, event.type),
        eventLog: [...(campaign.tracking.eventLog ?? []), event],
        ...(conversionRecords === undefined ? {} : { conversionRecords }),
        ...(revisitRecords === undefined ? {} : { revisitRecords }),
      },
    },
    {
      ...options,
      now: () => timestamp,
    },
  );

  persistCampaignAnalyticsEvent(storage, event, timestamp, attributionMatch);

  return updatedCampaign;
}

function createCampaignConversionEventRecord(
  event: CampaignConversionTrackingEvent,
  persistedAt: string,
  attributionMatch?: CampaignConversionAttributionMatch,
): CampaignConversionEventRecord {
  return withoutUndefinedProperties({
    schemaVersion: "owncanvas.campaign-conversion-record.v1" as const,
    id: `conversion_${event.id}`,
    eventId: event.id,
    campaignId: event.campaignId,
    sessionId: event.sessionId,
    occurredAt: event.occurredAt,
    persistedAt,
    actor: event.context.actor,
    userId: event.context.userId,
    agentId: event.context.agentId,
    pluginId: event.context.pluginId,
    permissionMode: event.context.permissionMode,
    eventName: event.conversion.eventName,
    value: event.conversion.value,
    currency: event.conversion.currency,
    orderId: event.conversion.orderId,
    quantity: event.conversion.quantity,
    content: event.content,
    utm: event.utm,
    target: event.target,
    attribution: createCampaignAnalyticsEventAttribution(event),
    attributionMatch,
  });
}

function upsertCampaignConversionEventRecord(
  records: CampaignConversionEventRecord[],
  record: CampaignConversionEventRecord,
) {
  return [
    ...records.filter((candidate) => candidate.eventId !== record.eventId),
    record,
  ];
}

function createCampaignRevisitEventRecord(
  event: CampaignRevisitTrackingEvent,
  persistedAt: string,
): CampaignRevisitEventRecord {
  return withoutUndefinedProperties({
    schemaVersion: "owncanvas.campaign-revisit-record.v1" as const,
    id: `revisit_${event.id}`,
    eventId: event.id,
    campaignId: event.campaignId,
    sessionId: event.sessionId,
    occurredAt: event.occurredAt,
    persistedAt,
    actor: event.context.actor,
    userId: event.context.userId,
    agentId: event.context.agentId,
    pluginId: event.context.pluginId,
    permissionMode: event.context.permissionMode,
    firstSeenAt: event.revisit.firstSeenAt,
    lastSeenAt: event.revisit.lastSeenAt,
    matchedBy: event.revisit.matchedBy,
    content: event.content,
    utm: event.utm,
    target: event.target,
    attribution: createCampaignAnalyticsEventAttribution(event),
  });
}

function upsertCampaignRevisitEventRecord(
  records: CampaignRevisitEventRecord[],
  record: CampaignRevisitEventRecord,
) {
  return [
    ...records.filter((candidate) => candidate.eventId !== record.eventId),
    record,
  ];
}

export function getPersistedCampaignAnalyticsEvents(
  storage: Pick<Storage, "getItem">,
  query: CampaignAnalyticsEventQuery = {},
): CampaignAnalyticsEventRecord[] {
  const store = getPersistedCampaignAnalyticsStore(storage);
  const recordKeyFilter = getCampaignAnalyticsRecordKeyFilter(store, query);
  const records =
    recordKeyFilter === null
      ? store.events
      : store.events.filter((record) =>
          recordKeyFilter.has(getCampaignAnalyticsEventRecordKey(record.event)),
        );

  return records.filter((record) =>
    matchesCampaignAnalyticsEventQuery(record, query),
  );
}

export function getCampaignMetricQueryContracts(): CampaignMetricQueryContract[] {
  return CAMPAIGN_METRIC_QUERY_CONTRACTS.map((contract) => ({
    ...contract,
    requiredFilters: [...contract.requiredFilters],
    supportedFilters: [...contract.supportedFilters],
    supportedGroupBy: [...contract.supportedGroupBy],
    measures: [...contract.measures],
  }));
}

export function getCampaignMetricQueryReport(
  storage: Pick<Storage, "getItem">,
  campaignId: string,
  query: CampaignMetricQuery = {},
  options: { now?: () => string } = {},
): CampaignMetricQueryReport | null {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (campaign === null) {
    return null;
  }

  const metric = query.metric ?? "all";
  const generatedAt = options.now?.() ?? new Date().toISOString();
  const filters = createCampaignMetricQueryFilters(campaignId, query);
  const selectedContracts =
    metric === "all"
      ? getCampaignMetricQueryContracts()
      : getCampaignMetricQueryContracts().filter(
          (contract) => contract.metric === metric,
        );
  const rows = selectedContracts.map((contract) =>
    createCampaignMetricQueryReportRow(
      contract.metric,
      getPersistedCampaignAnalyticsEvents(storage, {
        ...filters,
        eventType: contract.eventType,
      }),
    ),
  );

  return {
    schemaVersion: "owncanvas.campaign-metric-query-report.v1",
    campaignId,
    generatedAt,
    query: {
      metric,
      filters,
    },
    contracts: getCampaignMetricQueryContracts(),
    rows,
    conversionMetrics: getCampaignConversionMetricsReport(
      storage,
      campaignId,
      filters,
      generatedAt,
    ),
    report:
      metric === "all"
        ? undefined
        : (getCampaignMetricReport(
            storage,
            campaignId,
            metric,
            query,
            options,
          ) ?? undefined),
  };
}

function getCampaignConversionMetricsReport(
  storage: Pick<Storage, "getItem">,
  campaignId: string,
  filters: Partial<CampaignAnalyticsEventQuery>,
  generatedAt: string,
): CampaignConversionMetricsReport {
  const exposureRecords = getPersistedCampaignAnalyticsEvents(storage, {
    ...filters,
    eventType: "exposure",
  });
  const clickRecords = getPersistedCampaignAnalyticsEvents(storage, {
    ...filters,
    eventType: "click",
  });
  const conversionRecords = getPersistedCampaignAnalyticsEvents(storage, {
    ...filters,
    eventType: "conversion",
  });
  const purchaseRecords = conversionRecords.filter(
    (record) => record.attribution.conversionEventName === "purchase",
  );
  const totalValue = purchaseRecords.reduce(
    (sum, record) => sum + (record.attribution.conversionValue ?? 0),
    0,
  );
  const clickCount = clickRecords.length;
  const clickSessions = countCampaignMetricSessions(clickRecords);
  const purchaseCount = purchaseRecords.length;
  const purchaseSessions = countCampaignMetricSessions(purchaseRecords);
  const purchaseConversionRate = createCampaignReportingRate(
    purchaseCount,
    clickCount,
  );

  return {
    schemaVersion: "owncanvas.campaign-conversion-metrics.v1",
    campaignId,
    generatedAt,
    query: {
      filters,
    },
    funnel: {
      exposures: exposureRecords.length,
      exposureSessions: countCampaignMetricSessions(exposureRecords),
      clicks: clickCount,
      clickSessions,
      conversions: conversionRecords.length,
      conversionSessions: countCampaignMetricSessions(conversionRecords),
      purchaseConversions: purchaseCount,
      purchaseConversionSessions: purchaseSessions,
    },
    rates: {
      clickThroughRate: createCampaignReportingRate(
        clickCount,
        exposureRecords.length,
      ),
      sessionClickThroughRate: createCampaignReportingRate(
        clickSessions,
        countCampaignMetricSessions(exposureRecords),
      ),
      purchaseConversionRate,
      sessionPurchaseConversionRate: createCampaignReportingRate(
        purchaseSessions,
        clickSessions,
      ),
    },
    reportableMetrics: createCampaignReportableConversionMetrics(),
    successScore: createCampaignConversionSuccessScore({
      clickCount,
      purchaseCount,
      purchaseConversionRate,
    }),
    value: {
      totalValue,
      averageOrderValue: createCampaignReportingRate(totalValue, purchaseCount),
      revenuePerClick: createCampaignReportingRate(totalValue, clickCount),
      revenuePerClickSession: createCampaignReportingRate(
        totalValue,
        clickSessions,
      ),
      currencyBreakdown: createCampaignConversionCurrencyBreakdown(
        purchaseRecords,
      ),
    },
  };
}

function createCampaignReportableConversionMetrics(): CampaignReportableConversionMetric[] {
  return [
    {
      key: "purchase_conversion_rate",
      label: "Purchase conversion rate",
      source: "rates.purchaseConversionRate",
      unit: "percent",
      numerator: "funnel.purchaseConversions",
      denominator: "funnel.clicks",
    },
    {
      key: "purchase_conversions",
      label: "Purchase conversions",
      source: "funnel.purchaseConversions",
      unit: "count",
    },
  ];
}

function createCampaignConversionSuccessScore(input: {
  clickCount: number;
  purchaseCount: number;
  purchaseConversionRate: number;
}): CampaignConversionSuccessScore {
  if (input.clickCount > 0) {
    return {
      score: roundMetric(input.purchaseConversionRate * 100),
      primaryMetric: "purchase_conversion_rate",
      value: input.purchaseConversionRate,
      unit: "percent",
      purchaseConversions: input.purchaseCount,
      purchaseConversionRate: input.purchaseConversionRate,
      denominator: "clicks",
    };
  }

  return {
    score: input.purchaseCount,
    primaryMetric: "purchase_conversion_count",
    value: input.purchaseCount,
    unit: "count",
    purchaseConversions: input.purchaseCount,
    purchaseConversionRate: input.purchaseConversionRate,
    denominator: "none",
  };
}

function countCampaignMetricSessions(records: CampaignAnalyticsEventRecord[]) {
  return new Set(records.map((record) => record.event.sessionId)).size;
}

function createCampaignReportingRate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : roundMetric(numerator / denominator);
}

function createCampaignConversionCurrencyBreakdown(
  records: CampaignAnalyticsEventRecord[],
) {
  return records.reduce<Record<string, number>>((breakdown, record) => {
    const currency = record.attribution.conversionCurrency;
    const value = record.attribution.conversionValue;

    if (currency === undefined || value === undefined) {
      return breakdown;
    }

    breakdown[currency] = (breakdown[currency] ?? 0) + value;

    return breakdown;
  }, {});
}

export function getCampaignMetricReport(
  storage: Pick<Storage, "getItem">,
  campaignId: string,
  metric: CampaignMetricKind,
  query: CampaignMetricQuery = {},
  options: { now?: () => string } = {},
): CampaignMetricReport | null {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (campaign === null) {
    return null;
  }

  const filters = createCampaignMetricQueryFilters(campaignId, query);
  const records = getPersistedCampaignAnalyticsEvents(storage, {
    ...filters,
    eventType: metric,
  });
  const groupBy = query.groupBy ?? [];
  const sessions = new Set(records.map((record) => record.event.sessionId));
  const totalValue =
    metric === "conversion"
      ? createCampaignMetricTotalValue(records)
      : undefined;

  return {
    schemaVersion: "owncanvas.campaign-metric-report.v1",
    campaignId,
    generatedAt: options.now?.() ?? new Date().toISOString(),
    metric,
    query: {
      filters,
      groupBy,
    },
    summary: {
      count: records.length,
      uniqueSessions: sessions.size,
      totalValue,
    },
    rows: createCampaignMetricReportRows(records, groupBy),
  };
}

function createCampaignMetricQueryFilters(
  campaignId: string,
  query: CampaignMetricQuery,
): Partial<CampaignAnalyticsEventQuery> {
  return withoutUndefinedProperties({
    campaignId,
    sessionId: query.sessionId,
    clickId: query.clickId,
    pageId: query.pageId,
    assetId: query.assetId,
    channelId: query.channelId,
    productId: query.productId,
    offerId: query.offerId,
    destination: query.destination,
    href: query.href,
    conversionEventName: query.conversionEventName,
    orderId: query.orderId,
    currency: query.currency,
    matchedBy: query.matchedBy,
    from: query.from,
    to: query.to,
  });
}

function createCampaignMetricQueryReportRow(
  metric: CampaignMetricKind,
  records: CampaignAnalyticsEventRecord[],
): CampaignMetricQueryReportRow {
  const sessions = new Set(records.map((record) => record.event.sessionId));
  const totalValue =
    metric === "conversion"
      ? records.reduce(
          (sum, record) => sum + (record.attribution.conversionValue ?? 0),
          0,
        )
      : undefined;

  return withoutUndefinedProperties({
    metric,
    eventType: metric,
    count: records.length,
    uniqueSessions: sessions.size,
    totalValue,
  });
}

function createCampaignMetricReportRows(
  records: CampaignAnalyticsEventRecord[],
  groupBy: CampaignMetricQueryGroupBy[],
): CampaignMetricReportRow[] {
  if (groupBy.length === 0) {
    const sessions = new Set(records.map((record) => record.event.sessionId));
    const totalValue = createCampaignMetricReportRowTotalValue(records);

    return [withoutUndefinedProperties(
      {
        key: "all",
        group: {},
        count: records.length,
        uniqueSessions: sessions.size,
        totalValue,
      },
    )];
  }

  const groupedRecords = new Map<
    string,
    {
      group: Partial<Record<CampaignMetricQueryGroupBy, string>>;
      records: CampaignAnalyticsEventRecord[];
    }
  >();

  for (const record of records) {
    const group = Object.fromEntries(
      groupBy.map((dimension) => [
        dimension,
        getCampaignMetricGroupValue(record, dimension) ?? "",
      ]),
    ) as Partial<Record<CampaignMetricQueryGroupBy, string>>;
    const key = groupBy.map((dimension) => group[dimension] ?? "").join("|");
    const existing = groupedRecords.get(key);

    if (existing === undefined) {
      groupedRecords.set(key, {
        group,
        records: [record],
      });
    } else {
      existing.records.push(record);
    }
  }

  return [...groupedRecords.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, groupRecords]) => {
      const sessions = new Set(
        groupRecords.records.map((record) => record.event.sessionId),
      );

      return withoutUndefinedProperties({
        key,
        group: groupRecords.group,
        count: groupRecords.records.length,
        uniqueSessions: sessions.size,
        totalValue: createCampaignMetricReportRowTotalValue(groupRecords.records),
      });
    });
}

function createCampaignMetricReportRowTotalValue(
  records: CampaignAnalyticsEventRecord[],
) {
  return records.some((record) => record.event.type === "conversion")
    ? createCampaignMetricTotalValue(records)
    : undefined;
}

function createCampaignMetricTotalValue(records: CampaignAnalyticsEventRecord[]) {
  return records.reduce(
    (sum, record) => sum + (record.attribution.conversionValue ?? 0),
    0,
  );
}

function getCampaignMetricGroupValue(
  record: CampaignAnalyticsEventRecord,
  dimension: CampaignMetricQueryGroupBy,
) {
  const attribution = record.attribution;

  if (dimension === "matchedBy") {
    return attribution.revisitMatchedBy?.map((match) => match.type).join(",");
  }

  if (dimension === "currency") {
    return attribution.conversionCurrency;
  }

  return attribution[dimension];
}

export function getAttributedCampaignConversionAnalytics(
  storage: Pick<Storage, "getItem">,
  campaignId: string,
  options: { now?: () => string } = {},
): CampaignAttributedConversionAnalytics | null {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (campaign === null) {
    return null;
  }

  const generatedAt = options.now?.() ?? new Date().toISOString();
  const analyticsRecords = getPersistedCampaignAnalyticsEvents(storage, {
    campaignId,
  });
  const conversionAnalyticsByEventId = new Map(
    analyticsRecords
      .filter(
        (record): record is CampaignAnalyticsEventRecord & {
          event: CampaignConversionTrackingEvent;
        } => record.event.type === "conversion",
      )
      .map((record) => [record.event.id, record]),
  );
  const analyticsByEventId = new Map(
    analyticsRecords.map((record) => [record.event.id, record]),
  );
  const conversionRecords = campaign.tracking.conversionRecords ?? [];
  const rows = conversionRecords.map((record) =>
    createCampaignConversionAnalyticsRow(record),
  );
  const conversions = conversionRecords.map((record) => {
    const conversionAnalytics = conversionAnalyticsByEventId.get(record.eventId);
    const attributedInteraction =
      record.attributionMatch === undefined
        ? undefined
        : analyticsByEventId.get(record.attributionMatch.interactionEventId);

    return withoutUndefinedProperties({
      record,
      event: conversionAnalytics?.event,
      attributionMatch: record.attributionMatch,
      attributedInteraction,
    });
  });

  return {
    schemaVersion: "owncanvas.campaign-conversion-analytics.v1",
    campaignId,
    generatedAt,
    summary: createCampaignConversionAnalyticsSummary(rows),
    rows,
    conversions,
    export: createCampaignAttributedConversionExport(
      campaign,
      generatedAt,
      conversions,
    ),
  };
}

export function getCampaignLandingPageImmersionAnalytics(
  storage: Pick<Storage, "getItem">,
  campaignId: string,
  options: { now?: () => string } = {},
): CampaignLandingPageImmersionAnalytics | null {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (campaign === null) {
    return null;
  }

  const generatedAt = options.now?.() ?? new Date().toISOString();
  const records = getPersistedCampaignAnalyticsEvents(storage, {
    campaignId,
    eventType: "engagement",
  }).filter(isLandingPageImmersionEngagementRecord);
  const pages = createCampaignLandingPageImmersionAnalyticsPages(records);
  const allSessions = new Set(records.map((record) => record.event.sessionId));
  const completionSessions = new Set(
    records
      .filter((record) => record.event.engagement.action === "complete")
      .map((record) => record.event.sessionId),
  );
  const replaySessions = new Set(
    records
      .filter((record) => record.event.engagement.action === "replay")
      .map((record) => record.event.sessionId),
  );
  const watchDepth = createCampaignLandingPageImmersionWatchDepth(records);

  return {
    schemaVersion: "owncanvas.campaign-landing-immersion-analytics.v1",
    campaignId,
    generatedAt,
    summary: {
      pages: pages.length,
      sessions: allSessions.size,
      eventCount: records.length,
      averageWatchDepthPercent: watchDepth.averagePercent,
      maxWatchDepthPercent: watchDepth.maxPercent,
      completionRate: createCampaignLandingPageImmersionRate(
        completionSessions.size,
        allSessions.size,
      ),
      replayRate: createCampaignLandingPageImmersionRate(
        replaySessions.size,
        allSessions.size,
      ),
      interactionCount: records.length,
      interactionCounts:
        createCampaignLandingPageImmersionInteractionCounts(records),
    },
    pages,
  };
}

function createCampaignLandingPageImmersionAnalyticsPages(
  records: CampaignLandingPageImmersionRecord[],
): CampaignLandingPageImmersionAnalyticsPage[] {
  const recordsByPageId = groupCampaignLandingPageImmersionRecords(
    records,
    (record) => record.attribution.pageId ?? "",
  );

  return [...recordsByPageId.entries()]
    .sort(([leftPageId], [rightPageId]) => leftPageId.localeCompare(rightPageId))
    .map(([pageId, pageRecords]) => {
      const sessions = new Set(
        pageRecords.map((record) => record.event.sessionId),
      );
      const completedSessions = new Set(
        pageRecords
          .filter((record) => record.event.engagement.action === "complete")
          .map((record) => record.event.sessionId),
      );
      const replayRecords = pageRecords.filter(
        (record) => record.event.engagement.action === "replay",
      );
      const replaySessions = new Set(
        replayRecords.map((record) => record.event.sessionId),
      );

      return {
        pageId,
        sessions: sessions.size,
        eventCount: pageRecords.length,
        watchDepth: createCampaignLandingPageImmersionWatchDepth(pageRecords),
        completionRate: createCampaignLandingPageImmersionRate(
          completedSessions.size,
          sessions.size,
        ),
        completedSessions: completedSessions.size,
        replayRate: createCampaignLandingPageImmersionRate(
          replaySessions.size,
          sessions.size,
        ),
        replaySessions: replaySessions.size,
        replayCount: replayRecords.length,
        interactionCount: pageRecords.length,
        interactionCounts:
          createCampaignLandingPageImmersionInteractionCounts(pageRecords),
        playbackInteractionCount: pageRecords.filter(
          (record) => record.event.engagement.kind === "playback",
        ).length,
        scrollInteractionCount: pageRecords.filter(
          (record) => record.event.engagement.kind === "scroll",
        ).length,
        assets: createCampaignLandingPageImmersionAssetMetrics(pageRecords),
      };
    });
}

function createCampaignLandingPageImmersionAssetMetrics(
  records: CampaignLandingPageImmersionRecord[],
): CampaignLandingPageImmersionAssetMetrics[] {
  const recordsByAssetId = groupCampaignLandingPageImmersionRecords(
    records,
    (record) => record.attribution.assetId ?? "",
  );

  return [...recordsByAssetId.entries()]
    .sort(([leftAssetId], [rightAssetId]) =>
      leftAssetId.localeCompare(rightAssetId),
    )
    .map(([assetId, assetRecords]) => {
      const sessions = new Set(
        assetRecords.map((record) => record.event.sessionId),
      );
      const completedSessions = new Set(
        assetRecords
          .filter((record) => record.event.engagement.action === "complete")
          .map((record) => record.event.sessionId),
      );
      const replayRecords = assetRecords.filter(
        (record) => record.event.engagement.action === "replay",
      );
      const replaySessions = new Set(
        replayRecords.map((record) => record.event.sessionId),
      );

      return {
        assetId,
        sessions: sessions.size,
        eventCount: assetRecords.length,
        watchDepth: createCampaignLandingPageImmersionWatchDepth(assetRecords),
        completion: {
          sessions: completedSessions.size,
          rate: createCampaignLandingPageImmersionRate(
            completedSessions.size,
            sessions.size,
          ),
        },
        replay: {
          sessions: replaySessions.size,
          rate: createCampaignLandingPageImmersionRate(
            replaySessions.size,
            sessions.size,
          ),
          count: replayRecords.length,
        },
        interactionCount: assetRecords.length,
        interactionCounts:
          createCampaignLandingPageImmersionInteractionCounts(assetRecords),
      };
    });
}

function groupCampaignLandingPageImmersionRecords(
  records: CampaignLandingPageImmersionRecord[],
  getKey: (record: CampaignLandingPageImmersionRecord) => string,
) {
  return records.reduce<Map<string, CampaignLandingPageImmersionRecord[]>>(
    (groups, record) => {
      const key = getKey(record);

      if (key.trim() === "") {
        return groups;
      }

      groups.set(key, [...(groups.get(key) ?? []), record]);

      return groups;
    },
    new Map(),
  );
}

function createCampaignLandingPageImmersionWatchDepth(
  records: CampaignLandingPageImmersionRecord[],
): CampaignLandingPageImmersionMetricBreakdown {
  const values = records
    .filter(
      (record) =>
        record.event.engagement.kind === "playback" &&
        (record.event.engagement.action === "watch_depth" ||
          record.event.engagement.action === "progress") &&
        record.event.engagement.unit === "percent" &&
        record.event.engagement.value !== undefined,
    )
    .map((record) => record.event.engagement.value ?? 0);
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    samples: values.length,
    averagePercent: values.length === 0 ? 0 : roundMetric(total / values.length),
    maxPercent: values.length === 0 ? 0 : Math.max(...values),
  };
}

function createCampaignLandingPageImmersionInteractionCounts(
  records: CampaignLandingPageImmersionRecord[],
) {
  return records.reduce<Record<string, number>>((counts, record) => {
    const action = record.event.engagement.action;

    counts[action] = (counts[action] ?? 0) + 1;

    return counts;
  }, {});
}

function createCampaignLandingPageImmersionRate(
  numerator: number,
  denominator: number,
) {
  return denominator === 0 ? 0 : roundMetric(numerator / denominator);
}

function isLandingPageImmersionEngagementRecord(
  record: CampaignAnalyticsEventRecord,
): record is CampaignLandingPageImmersionRecord {
  return (
    record.event.type === "engagement" &&
    record.attribution.pageId !== undefined &&
    record.attribution.pageId.trim() !== ""
  );
}

function roundMetric(value: number) {
  return Math.round(value * 10000) / 10000;
}

function createCampaignAttributedConversionExport(
  campaign: CampaignRecord,
  generatedAt: string,
  conversions: CampaignAttributedConversionAnalyticsEntry[],
): CampaignAttributedConversionExport {
  return {
    schemaVersion: "owncanvas.attributed-conversion-export.v1",
    campaignId: campaign.id,
    generatedAt,
    analyticsDestinations: campaign.tracking.analyticsDestinations
      .filter((destination) => destination.enabled)
      .map(({ id, provider, destinationId, label }) => ({
        id,
        provider,
        destinationId,
        label,
      })),
    measurementGoals: campaign.tracking.measurementGoals,
    events: conversions.map((conversion) =>
      createCampaignAttributedConversionExportEvent(conversion),
    ),
  };
}

function createCampaignAttributedConversionExportEvent(
  conversion: CampaignAttributedConversionAnalyticsEntry,
): CampaignAttributedConversionExportEvent {
  const row = createCampaignConversionAnalyticsRow(conversion.record);
  const attributedInteraction = conversion.attributedInteraction?.attribution;

  return withoutUndefinedProperties({
    id: `attributed_${conversion.record.eventId}`,
    ...row,
    campaignId: conversion.record.campaignId,
    quantity: conversion.record.quantity,
    attributedClickId: attributedInteraction?.clickId,
    attributedSource: attributedInteraction?.source,
    attributedMedium: attributedInteraction?.medium,
    attributedCampaign: attributedInteraction?.campaign,
    attributedContent: attributedInteraction?.content,
    attributedTerm: attributedInteraction?.term,
    attributedNodeId: attributedInteraction?.nodeId,
    attributedOutputPortId: attributedInteraction?.outputPortId,
    attributedChannelId: attributedInteraction?.channelId,
    attributedAssetId: attributedInteraction?.assetId,
    attributedProductId: attributedInteraction?.productId,
    attributedOfferId: attributedInteraction?.offerId,
    attributedTargetType: attributedInteraction?.targetType,
    attributedTargetId: attributedInteraction?.targetId,
    attributedHref: attributedInteraction?.href,
    attributedDestination: attributedInteraction?.destination,
  });
}

function createCampaignConversionAnalyticsRow(
  record: CampaignConversionEventRecord,
): CampaignConversionAnalyticsRow {
  const interaction = record.attributionMatch;

  return withoutUndefinedProperties({
    conversionEventId: record.eventId,
    conversionRecordId: record.id,
    sessionId: record.sessionId,
    occurredAt: record.occurredAt,
    eventName: record.eventName,
    value: record.value,
    currency: record.currency,
    orderId: record.orderId,
    source: record.attribution.source,
    medium: record.attribution.medium,
    utmCampaign: record.attribution.campaign,
    utmContent: record.attribution.content,
    utmTerm: record.attribution.term,
    nodeId: record.attribution.nodeId,
    inputPortId: record.attribution.inputPortId,
    outputPortId: record.attribution.outputPortId,
    channelId: record.attribution.channelId,
    assetId: record.attribution.assetId,
    productId: record.attribution.productId,
    offerId: record.attribution.offerId,
    targetType: record.attribution.targetType,
    targetId: record.attribution.targetId,
    attributionRule: interaction?.rule,
    attributedInteractionEventId: interaction?.interactionEventId,
    attributedInteractionType: getCampaignAttributionRuleEventType(
      interaction?.rule,
    ),
    attributedInteractionOccurredAt: interaction?.interactionOccurredAt,
    attributionWindowDays: interaction?.attributionWindowDays,
    origin: createCampaignConversionOrigin(record),
  });
}

function createCampaignConversionOrigin(
  record: CampaignConversionEventRecord,
): CampaignConversionOrigin {
  return withoutUndefinedProperties({
    campaignId: record.campaignId,
    workflowId: record.attribution.workflowId,
    contentId: record.content.id,
    contentType: record.content.type,
    contentVariantId: record.attribution.contentVariantId,
    nodeId: record.attribution.nodeId,
    inputPortId: record.attribution.inputPortId,
    outputPortId: record.attribution.outputPortId,
    channelId: record.attribution.channelId,
    pageId: record.attribution.pageId,
    assetId: record.attribution.assetId,
    productId: record.attribution.productId,
    offerId: record.attribution.offerId,
    sourceEventId: record.eventId,
    attributedInteractionEventId: record.attributionMatch?.interactionEventId,
  });
}

function createCampaignConversionAnalyticsSummary(
  rows: CampaignConversionAnalyticsRow[],
): CampaignConversionAnalyticsSummary {
  return rows.reduce<CampaignConversionAnalyticsSummary>(
    (summary, row) => {
      summary.totalConversions += 1;
      if (row.attributedInteractionEventId === undefined) {
        summary.unattributedConversions += 1;
      } else {
        summary.attributedConversions += 1;
      }
      summary.totalValue += row.value ?? 0;
      summary.eventNames[row.eventName] = (summary.eventNames[row.eventName] ?? 0) + 1;

      if (row.currency !== undefined && row.value !== undefined) {
        summary.currencyBreakdown[row.currency] =
          (summary.currencyBreakdown[row.currency] ?? 0) + row.value;
      }

      return summary;
    },
    {
      totalConversions: 0,
      attributedConversions: 0,
      unattributedConversions: 0,
      totalValue: 0,
      currencyBreakdown: {},
      eventNames: {},
    },
  );
}

function getCampaignAttributionRuleEventType(
  rule: CampaignConversionAttributionRule | undefined,
) {
  if (rule === undefined) {
    return undefined;
  }

  if (rule.startsWith("last-click-")) {
    return "click";
  }

  return rule.startsWith("last-exposure-") ? "exposure" : "session";
}

export function getPriorCampaignInteractionsForConversion(
  storage: Pick<Storage, "getItem">,
  conversionEvent: CampaignConversionTrackingEvent,
  query: CampaignConversionPriorInteractionQuery = {},
): CampaignConversionPriorInteractionResult {
  const attributionWindowDays = normalizeAttributionWindowDays(
    query.attributionWindowDays,
  );
  const conversionOccurredAtMs = Date.parse(conversionEvent.occurredAt);
  const windowStartsAtMs =
    conversionOccurredAtMs - attributionWindowDays * 24 * 60 * 60 * 1000;
  const interactions = getPersistedCampaignAnalyticsEvents(storage, {
    campaignId: conversionEvent.campaignId,
  })
    .filter((record) =>
      isPriorCampaignInteractionForConversion(
        record,
        conversionEvent,
        windowStartsAtMs,
        conversionOccurredAtMs,
      ),
    )
    .sort(
      (left, right) =>
        Date.parse(left.event.occurredAt) - Date.parse(right.event.occurredAt),
    );
  const sessions = getPriorCampaignSessionsForConversion(
    storage,
    conversionEvent,
    windowStartsAtMs,
    conversionOccurredAtMs,
  );
  const attributionMatch = selectCampaignConversionAttributionMatch(
    conversionEvent,
    interactions,
    sessions,
    attributionWindowDays,
  );

  return {
    attributionWindowDays,
    windowStartsAt: new Date(windowStartsAtMs).toISOString(),
    conversionOccurredAt: conversionEvent.occurredAt,
    interactions,
    sessions,
    ...(attributionMatch === undefined ? {} : { attributionMatch }),
  };
}

export function linkPurchaseConversionEventToAttributedCampaign(
  storage: Pick<Storage, "getItem">,
  event: CampaignConversionTrackingEvent,
): CampaignConversionTrackingEvent {
  if (event.conversion.eventName !== "purchase") {
    return event;
  }

  const attributionWindowDays =
    getCampaignConversionEventAttributionWindowDays(event);
  const candidates = getPersistedCampaignRecords(storage)
    .map((campaign) => {
      const candidateEvent = {
        ...event,
        campaignId: campaign.id,
      };
      const priorInteractions = getPriorCampaignInteractionsForConversion(
        storage,
        candidateEvent,
        { attributionWindowDays },
      );

      return {
        campaign,
        event: candidateEvent,
        attributionMatch: priorInteractions.attributionMatch,
      };
    })
    .filter((candidate) => candidate.attributionMatch !== undefined)
    .sort(comparePurchaseConversionCampaignAttributionCandidates);
  const [bestCandidate] = candidates;

  return bestCandidate?.event ?? event;
}

function comparePurchaseConversionCampaignAttributionCandidates(
  left: {
    campaign: CampaignRecord;
    attributionMatch?: CampaignConversionAttributionMatch;
  },
  right: {
    campaign: CampaignRecord;
    attributionMatch?: CampaignConversionAttributionMatch;
  },
) {
  const leftRuleRank = getCampaignConversionAttributionRuleRank(
    left.attributionMatch?.rule,
  );
  const rightRuleRank = getCampaignConversionAttributionRuleRank(
    right.attributionMatch?.rule,
  );
  const ruleDelta = leftRuleRank - rightRuleRank;

  if (ruleDelta !== 0) {
    return ruleDelta;
  }

  const occurredAtDelta =
    Date.parse(right.attributionMatch?.interactionOccurredAt ?? "") -
    Date.parse(left.attributionMatch?.interactionOccurredAt ?? "");

  return occurredAtDelta === 0
    ? left.campaign.id.localeCompare(right.campaign.id)
    : occurredAtDelta;
}

function getCampaignConversionAttributionRuleRank(
  rule: CampaignConversionAttributionRule | undefined,
) {
  if (rule === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  const ruleIndex = CAMPAIGN_CONVERSION_ATTRIBUTION_RULES.findIndex(
    (candidate) => candidate.rule === rule,
  );

  return ruleIndex === -1 ? CAMPAIGN_CONVERSION_ATTRIBUTION_RULES.length : ruleIndex;
}

function getCampaignConversionEventAttributionWindowDays(
  event: CampaignConversionTrackingEvent,
) {
  const attributionWindowDays = isRecord(event.conversion.metadata)
    ? event.conversion.metadata.attributionWindowDays
    : undefined;

  return typeof attributionWindowDays === "number"
    ? attributionWindowDays
    : undefined;
}

type CampaignConversionAttributionRuleDefinition = {
  rule: CampaignConversionAttributionRule;
  eventType: "click" | "exposure";
  identity: "session" | "user";
  match: "offer" | "product" | "any";
  reason: string;
};

const CAMPAIGN_CONVERSION_ATTRIBUTION_RULES: CampaignConversionAttributionRuleDefinition[] =
  [
    {
      rule: "last-click-same-session-offer",
      eventType: "click",
      identity: "session",
      match: "offer",
      reason:
        "Matched the latest prior click in the same session for the same offer.",
    },
    {
      rule: "last-click-same-user-offer",
      eventType: "click",
      identity: "user",
      match: "offer",
      reason:
        "Matched the latest prior click from the same user for the same offer.",
    },
    {
      rule: "last-click-same-session-product",
      eventType: "click",
      identity: "session",
      match: "product",
      reason:
        "Matched the latest prior click in the same session for the same product.",
    },
    {
      rule: "last-click-same-user-product",
      eventType: "click",
      identity: "user",
      match: "product",
      reason:
        "Matched the latest prior click from the same user for the same product.",
    },
    {
      rule: "last-click-same-session",
      eventType: "click",
      identity: "session",
      match: "any",
      reason: "Matched the latest prior click in the same session.",
    },
    {
      rule: "last-click-same-user",
      eventType: "click",
      identity: "user",
      match: "any",
      reason: "Matched the latest prior click from the same user.",
    },
    {
      rule: "last-exposure-same-session-offer",
      eventType: "exposure",
      identity: "session",
      match: "offer",
      reason:
        "Matched the latest prior exposure in the same session for the same offer.",
    },
    {
      rule: "last-exposure-same-user-offer",
      eventType: "exposure",
      identity: "user",
      match: "offer",
      reason:
        "Matched the latest prior exposure from the same user for the same offer.",
    },
    {
      rule: "last-exposure-same-session-product",
      eventType: "exposure",
      identity: "session",
      match: "product",
      reason:
        "Matched the latest prior exposure in the same session for the same product.",
    },
    {
      rule: "last-exposure-same-user-product",
      eventType: "exposure",
      identity: "user",
      match: "product",
      reason:
        "Matched the latest prior exposure from the same user for the same product.",
    },
    {
      rule: "last-exposure-same-session",
      eventType: "exposure",
      identity: "session",
      match: "any",
      reason: "Matched the latest prior exposure in the same session.",
    },
    {
      rule: "last-exposure-same-user",
      eventType: "exposure",
      identity: "user",
      match: "any",
      reason: "Matched the latest prior exposure from the same user.",
    },
  ];

function selectCampaignConversionAttributionMatch(
  conversionEvent: CampaignConversionTrackingEvent,
  interactions: CampaignAnalyticsEventRecord[],
  sessions: CampaignTrackedSession[],
  attributionWindowDays: number,
): CampaignConversionAttributionMatch | undefined {
  for (const rule of CAMPAIGN_CONVERSION_ATTRIBUTION_RULES) {
    const interaction = getLatestCampaignAttributionInteractionForRule(
      interactions,
      conversionEvent,
      rule,
    );

    if (interaction !== undefined) {
      return {
        conversionEventId: conversionEvent.id,
        interactionEventId: interaction.event.id,
        rule: rule.rule,
        matchedAt: conversionEvent.occurredAt,
        interactionOccurredAt: interaction.event.occurredAt,
        attributionWindowDays,
        reason: rule.reason,
      };
    }
  }

  const session = getLatestCampaignAttributionSessionForConversion(sessions);

  return session === undefined
    ? undefined
    : {
        conversionEventId: conversionEvent.id,
        interactionEventId: session.id,
        rule: "last-session-same-session",
        matchedAt: conversionEvent.occurredAt,
        interactionOccurredAt: session.lastSeenAt,
        attributionWindowDays,
        reason: "Matched the prior tracked campaign session.",
      };
}

function getLatestCampaignAttributionSessionForConversion(
  sessions: CampaignTrackedSession[],
) {
  return [...sessions].sort(compareCampaignTrackedSessionsMostRecentFirst)[0];
}

function getLatestCampaignAttributionInteractionForRule(
  interactions: CampaignAnalyticsEventRecord[],
  conversionEvent: CampaignConversionTrackingEvent,
  rule: CampaignConversionAttributionRuleDefinition,
) {
  return interactions
    .filter((interaction) =>
      isCampaignAttributionInteractionRuleMatch(
        interaction.event,
        conversionEvent,
        rule,
      ),
    )
    .sort(compareCampaignAttributionInteractionsMostRecentFirst)[0];
}

function isCampaignAttributionInteractionRuleMatch(
  event: CampaignTrackingEvent,
  conversionEvent: CampaignConversionTrackingEvent,
  rule: CampaignConversionAttributionRuleDefinition,
) {
  if (event.type !== rule.eventType) {
    return false;
  }

  if (!isCampaignAttributionIdentityMatch(event, conversionEvent, rule.identity)) {
    return false;
  }

  if (rule.match === "offer") {
    return hasSameCampaignTrackingMetadataValue(event, conversionEvent, "offerId");
  }

  if (rule.match === "product") {
    return hasSameCampaignTrackingMetadataValue(
      event,
      conversionEvent,
      "productId",
    );
  }

  return true;
}

function isCampaignAttributionIdentityMatch(
  event: CampaignTrackingEvent,
  conversionEvent: CampaignConversionTrackingEvent,
  identity: "session" | "user",
) {
  if (identity === "session") {
    return event.sessionId === conversionEvent.sessionId;
  }

  return (
    event.context.userId !== undefined &&
    event.context.userId.trim() !== "" &&
    event.context.userId === conversionEvent.context.userId
  );
}

function hasSameCampaignTrackingMetadataValue(
  event: CampaignTrackingEvent,
  conversionEvent: CampaignConversionTrackingEvent,
  key: "offerId" | "productId",
) {
  const eventValue = firstNonEmptyString(
    event.content[key],
    event.target.metadata[key],
  );
  const conversionValue = firstNonEmptyString(
    conversionEvent.content[key],
    conversionEvent.target.metadata[key],
  );

  return (
    eventValue !== undefined &&
    conversionValue !== undefined &&
    eventValue === conversionValue
  );
}

function compareCampaignAttributionInteractionsMostRecentFirst(
  left: CampaignAnalyticsEventRecord,
  right: CampaignAnalyticsEventRecord,
) {
  const occurredAtDelta =
    Date.parse(right.event.occurredAt) - Date.parse(left.event.occurredAt);

  return occurredAtDelta === 0
    ? right.event.id.localeCompare(left.event.id)
    : occurredAtDelta;
}

function compareCampaignTrackedSessionsMostRecentFirst(
  left: CampaignTrackedSession,
  right: CampaignTrackedSession,
) {
  const occurredAtDelta = Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt);

  return occurredAtDelta === 0 ? right.id.localeCompare(left.id) : occurredAtDelta;
}

function normalizeAttributionWindowDays(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_CAMPAIGN_ATTRIBUTION_WINDOW_DAYS;
}

function isPriorCampaignInteractionForConversion(
  record: CampaignAnalyticsEventRecord,
  conversionEvent: CampaignConversionTrackingEvent,
  windowStartsAtMs: number,
  conversionOccurredAtMs: number,
) {
  if (record.event.type === "conversion") {
    return false;
  }

  if (!isSameConvertingUserOrSession(record.event, conversionEvent)) {
    return false;
  }

  const occurredAtMs = Date.parse(record.event.occurredAt);

  return (
    Number.isFinite(occurredAtMs) &&
    occurredAtMs >= windowStartsAtMs &&
    occurredAtMs < conversionOccurredAtMs
  );
}

function getPriorCampaignSessionsForConversion(
  storage: Pick<Storage, "getItem">,
  conversionEvent: CampaignConversionTrackingEvent,
  windowStartsAtMs: number,
  conversionOccurredAtMs: number,
) {
  const campaign = getPersistedCampaignRecord(storage, conversionEvent.campaignId);

  return (campaign?.tracking.sessions ?? []).filter((session) =>
    isPriorCampaignSessionForConversion(
      session,
      conversionEvent,
      windowStartsAtMs,
      conversionOccurredAtMs,
    ),
  );
}

function isPriorCampaignSessionForConversion(
  session: CampaignTrackedSession,
  conversionEvent: CampaignConversionTrackingEvent,
  windowStartsAtMs: number,
  conversionOccurredAtMs: number,
) {
  const lastSeenAtMs = Date.parse(session.lastSeenAt);

  return (
    session.campaignId === conversionEvent.campaignId &&
    session.id === conversionEvent.sessionId &&
    Number.isFinite(lastSeenAtMs) &&
    lastSeenAtMs >= windowStartsAtMs &&
    lastSeenAtMs < conversionOccurredAtMs
  );
}

function isSameConvertingUserOrSession(
  event: CampaignTrackingEvent,
  conversionEvent: CampaignConversionTrackingEvent,
) {
  return (
    event.sessionId === conversionEvent.sessionId ||
    (event.context.userId !== undefined &&
      event.context.userId.trim() !== "" &&
      event.context.userId === conversionEvent.context.userId)
  );
}

function persistCampaignAnalyticsEvent(
  storage: Pick<Storage, "getItem" | "setItem">,
  event: CampaignTrackingEvent,
  persistedAt: string,
  attributionMatch?: CampaignConversionAttributionMatch,
) {
  const store = getPersistedCampaignAnalyticsStore(storage);
  const record = createCampaignAnalyticsEventRecord(event, persistedAt);
  const recordKey = getCampaignAnalyticsEventRecordKey(event);
  const events = [
    ...store.events.filter(
      (candidate) =>
        getCampaignAnalyticsEventRecordKey(candidate.event) !== recordKey,
    ),
    record,
  ];
  const purchaseConversionRecord = createCampaignPurchaseConversionEventRecord(
    event,
    persistedAt,
    attributionMatch,
  );
  const purchaseConversions =
    purchaseConversionRecord === undefined
      ? store.purchaseConversions
      : upsertCampaignPurchaseConversionEventRecord(
          store.purchaseConversions,
          purchaseConversionRecord,
        );

  storage.setItem(
    CAMPAIGN_ANALYTICS_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: "owncanvas.campaign-analytics.v1",
      events,
      purchaseConversions,
      indexes: createCampaignAnalyticsEventIndexes(events),
    } satisfies CampaignAnalyticsEventStore),
  );
}

export function getPersistedCampaignPurchaseConversionEvents(
  storage: Pick<Storage, "getItem">,
  query: Pick<
    CampaignAnalyticsEventQuery,
    "campaignId" | "sessionId" | "orderId" | "conversionEventName" | "from" | "to"
  > = {},
): CampaignPurchaseConversionEventRecord[] {
  const store = getPersistedCampaignAnalyticsStore(storage);
  const fromMs = query.from === undefined ? undefined : Date.parse(query.from);
  const toMs = query.to === undefined ? undefined : Date.parse(query.to);

  return store.purchaseConversions.filter((record) => {
    const occurredAtMs = Date.parse(record.occurredAt);

    return (
      (query.campaignId === undefined || record.campaignId === query.campaignId) &&
      (query.sessionId === undefined || record.sessionId === query.sessionId) &&
      (query.orderId === undefined || record.orderId === query.orderId) &&
      (query.conversionEventName === undefined ||
        record.eventName === query.conversionEventName) &&
      (fromMs === undefined || Number.isNaN(fromMs) || occurredAtMs >= fromMs) &&
      (toMs === undefined || Number.isNaN(toMs) || occurredAtMs <= toMs)
    );
  });
}

function getPersistedCampaignAnalyticsStore(
  storage: Pick<Storage, "getItem">,
): CampaignAnalyticsEventStore {
  const serializedStore = storage.getItem(CAMPAIGN_ANALYTICS_STORAGE_KEY);

  if (!serializedStore) {
    return createEmptyCampaignAnalyticsEventStore();
  }

  const parsedStore = JSON.parse(serializedStore) as Partial<CampaignAnalyticsEventStore>;
  const events = Array.isArray(parsedStore.events) ? parsedStore.events : [];
  const purchaseConversions = Array.isArray(parsedStore.purchaseConversions)
    ? parsedStore.purchaseConversions
    : createCampaignPurchaseConversionEventRecordsFromAnalyticsEvents(events);

  return {
    schemaVersion: "owncanvas.campaign-analytics.v1",
    events,
    purchaseConversions,
    indexes: createCampaignAnalyticsEventIndexes(events),
  };
}

function createEmptyCampaignAnalyticsEventStore(): CampaignAnalyticsEventStore {
  return {
    schemaVersion: "owncanvas.campaign-analytics.v1",
    events: [],
    purchaseConversions: [],
    indexes: {
      byCampaignId: {},
      bySessionId: {},
      byCampaignSession: {},
      byClickId: {},
      byPageId: {},
      byAssetId: {},
      byCampaignPage: {},
      byCampaignAsset: {},
    },
  };
}

function createCampaignAnalyticsEventRecord(
  event: CampaignTrackingEvent,
  persistedAt: string,
): CampaignAnalyticsEventRecord {
  return {
    event,
    persistedAt,
    attribution: createCampaignAnalyticsEventAttribution(event),
  };
}

function createCampaignPurchaseConversionEventRecordsFromAnalyticsEvents(
  events: CampaignAnalyticsEventRecord[],
): CampaignPurchaseConversionEventRecord[] {
  return events
    .map((record) =>
      createCampaignPurchaseConversionEventRecord(
        record.event,
        record.persistedAt,
      ),
    )
    .filter(
      (
        record,
      ): record is CampaignPurchaseConversionEventRecord =>
        record !== undefined,
    );
}

function createCampaignPurchaseConversionEventRecord(
  event: CampaignTrackingEvent,
  persistedAt: string,
  attributionMatch?: CampaignConversionAttributionMatch,
): CampaignPurchaseConversionEventRecord | undefined {
  if (event.type !== "conversion" || event.conversion.eventName !== "purchase") {
    return undefined;
  }

  const userId = firstNonEmptyString(event.context.userId);
  const orderId = firstNonEmptyString(event.conversion.orderId);
  const attributionMetadata =
    createCampaignPurchaseConversionAttributionMetadata(event);

  if (
    userId === undefined ||
    orderId === undefined ||
    attributionMetadata === undefined
  ) {
    return undefined;
  }

  return withoutUndefinedProperties({
    schemaVersion: "owncanvas.campaign-purchase-conversion-event.v1" as const,
    id: `purchase_${event.id}`,
    eventId: event.id,
    campaignId: event.campaignId,
    sessionId: event.sessionId,
    occurredAt: event.occurredAt,
    persistedAt,
    actor: event.context.actor,
    userId,
    agentId: event.context.agentId,
    pluginId: event.context.pluginId,
    permissionMode: event.context.permissionMode,
    eventName: "purchase" as const,
    orderId,
    value: event.conversion.value,
    currency: event.conversion.currency,
    quantity: event.conversion.quantity,
    content: event.content,
    utm: event.utm,
    target: event.target,
    attribution: createCampaignAnalyticsEventAttribution(event),
    attributionMetadata,
    attributionMatch,
  });
}

function createCampaignPurchaseConversionAttributionMetadata(
  event: CampaignConversionTrackingEvent,
): CampaignPurchaseConversionAttributionMetadata | undefined {
  const nodeId = firstNonEmptyString(
    event.target.metadata.nodeId,
    event.content.nodeId,
  );
  const inputPortId = firstNonEmptyString(event.target.metadata.inputPortId);
  const channelId = firstNonEmptyString(
    event.target.metadata.channelId,
    event.content.channelId,
  );
  const productId = firstNonEmptyString(
    event.target.metadata.productId,
    event.content.productId,
  );
  const offerId = firstNonEmptyString(
    event.target.metadata.offerId,
    event.content.offerId,
  );

  if (
    nodeId === undefined ||
    inputPortId === undefined ||
    channelId === undefined ||
    productId === undefined ||
    offerId === undefined
  ) {
    return undefined;
  }

  return withoutUndefinedProperties({
    source: event.utm.source,
    medium: event.utm.medium,
    campaign: event.utm.campaign,
    content: event.utm.content,
    term: event.utm.term,
    nodeId,
    inputPortId,
    channelId,
    pageId: event.target.metadata.pageId ?? event.content.pageId,
    assetId: event.target.metadata.assetId ?? event.content.assetId,
    productId,
    offerId,
    targetType: event.target.type,
    targetId: event.target.id,
    url: event.target.metadata.url,
    label: event.target.metadata.label,
    conversionMetadata: event.conversion.metadata,
    targetMetadata: event.target.metadata.metadata,
  });
}

function upsertCampaignPurchaseConversionEventRecord(
  records: CampaignPurchaseConversionEventRecord[],
  record: CampaignPurchaseConversionEventRecord,
) {
  return [
    ...records.filter((candidate) => candidate.eventId !== record.eventId),
    record,
  ];
}

function createCampaignAnalyticsEventAttribution(
  event: CampaignTrackingEvent,
): CampaignAnalyticsEventAttribution {
  const workflowId = firstNonEmptyString(
    event.target.metadata.workflowId,
    event.content.workflowId,
    getStringMetadataValue(event.target.metadata.metadata, "workflowId"),
    getStringMetadataValue(event.content.metadata, "workflowId"),
  );
  const contentVariantId = firstNonEmptyString(
    event.target.metadata.contentVariantId,
    event.content.contentVariantId,
    getStringMetadataValue(event.target.metadata.metadata, "contentVariantId"),
    getStringMetadataValue(event.target.metadata.metadata, "variantId"),
    getStringMetadataValue(event.content.metadata, "contentVariantId"),
    getStringMetadataValue(event.content.metadata, "variantId"),
  );

  return withoutUndefinedProperties({
    campaignId: event.campaignId,
    sessionId: event.sessionId,
    eventId: event.id,
    eventType: event.type,
    occurredAt: event.occurredAt,
    source: event.utm.source,
    medium: event.utm.medium,
    campaign: event.utm.campaign,
    content: event.utm.content,
    term: event.utm.term,
    nodeId: event.target.metadata.nodeId ?? event.content.nodeId,
    inputPortId: event.target.metadata.inputPortId,
    outputPortId: event.target.metadata.outputPortId,
    channelId: event.target.metadata.channelId ?? event.content.channelId,
    pageId: event.target.metadata.pageId ?? event.content.pageId,
    assetId: event.target.metadata.assetId ?? event.content.assetId,
    productId: event.target.metadata.productId ?? event.content.productId,
    offerId: event.target.metadata.offerId ?? event.content.offerId,
    targetType: event.target.type,
    targetId: event.target.id,
    workflowId,
    contentVariantId,
    ...(event.type === "exposure"
      ? {
          surface: event.exposure.surface,
          placement: event.exposure.placement,
          viewId: event.exposure.viewId,
        }
      : event.type === "click"
        ? {
            clickId: event.click.id,
            destination: event.click.destination,
            href: event.click.href,
          }
        : event.type === "conversion"
          ? {
              conversionEventName: event.conversion.eventName,
              conversionValue: event.conversion.value,
              conversionCurrency: event.conversion.currency,
              orderId: event.conversion.orderId,
              quantity: event.conversion.quantity,
            }
          : event.type === "engagement"
            ? {
                engagementKind: event.engagement.kind,
                engagementAction: event.engagement.action,
                engagementValue: event.engagement.value,
                engagementUnit: event.engagement.unit,
                immersion: createCampaignShortFormImmersionAttribution(event),
              }
            : {
                surface: "landing",
                placement: "revisit",
                revisitFirstSeenAt: event.revisit.firstSeenAt,
                revisitLastSeenAt: event.revisit.lastSeenAt,
                revisitMatchedBy: event.revisit.matchedBy,
              }),
  });
}

function getStringMetadataValue(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  if (!isRecord(metadata)) {
    return undefined;
  }

  const value = metadata[key];

  return typeof value === "string" ? value : undefined;
}

function createCampaignAnalyticsEventIndexes(
  events: CampaignAnalyticsEventRecord[],
): CampaignAnalyticsEventStore["indexes"] {
  return events.reduce<CampaignAnalyticsEventStore["indexes"]>(
    (indexes, record) => {
      const recordKey = getCampaignAnalyticsEventRecordKey(record.event);
      const campaignSessionKey = getCampaignAnalyticsSessionIndexKey(
        record.event.campaignId,
        record.event.sessionId,
      );
      const pageId = firstNonEmptyString(
        record.event.target.metadata.pageId,
        record.event.content.pageId,
      );
      const assetId = firstNonEmptyString(
        record.event.target.metadata.assetId,
        record.event.content.assetId,
      );

      indexes.byCampaignId[record.event.campaignId] = appendUnique(
        indexes.byCampaignId[record.event.campaignId] ?? [],
        recordKey,
      );
      indexes.bySessionId[record.event.sessionId] = appendUnique(
        indexes.bySessionId[record.event.sessionId] ?? [],
        recordKey,
      );
      indexes.byCampaignSession[campaignSessionKey] = appendUnique(
        indexes.byCampaignSession[campaignSessionKey] ?? [],
        recordKey,
      );
      if (record.event.type === "click" && record.event.click.id !== undefined) {
        indexes.byClickId[record.event.click.id] = appendUnique(
          indexes.byClickId[record.event.click.id] ?? [],
          recordKey,
        );
      }
      if (pageId !== undefined) {
        indexes.byPageId[pageId] = appendUnique(
          indexes.byPageId[pageId] ?? [],
          recordKey,
        );
        indexes.byCampaignPage[
          getCampaignAnalyticsScopedIndexKey(record.event.campaignId, pageId)
        ] = appendUnique(
          indexes.byCampaignPage[
            getCampaignAnalyticsScopedIndexKey(record.event.campaignId, pageId)
          ] ?? [],
          recordKey,
        );
      }
      if (assetId !== undefined) {
        indexes.byAssetId[assetId] = appendUnique(
          indexes.byAssetId[assetId] ?? [],
          recordKey,
        );
        indexes.byCampaignAsset[
          getCampaignAnalyticsScopedIndexKey(record.event.campaignId, assetId)
        ] = appendUnique(
          indexes.byCampaignAsset[
            getCampaignAnalyticsScopedIndexKey(record.event.campaignId, assetId)
          ] ?? [],
          recordKey,
        );
      }

      return indexes;
    },
    {
      byCampaignId: {},
      bySessionId: {},
      byCampaignSession: {},
      byClickId: {},
      byPageId: {},
      byAssetId: {},
      byCampaignPage: {},
      byCampaignAsset: {},
    },
  );
}

function getCampaignAnalyticsRecordKeyFilter(
  store: CampaignAnalyticsEventStore,
  query: CampaignAnalyticsEventQuery,
) {
  const filters: string[][] = [];

  if (query.campaignId !== undefined && query.sessionId !== undefined) {
    filters.push(
      store.indexes.byCampaignSession[
        getCampaignAnalyticsSessionIndexKey(query.campaignId, query.sessionId)
      ] ?? [],
    );
  } else {
    if (query.campaignId !== undefined) {
      filters.push(store.indexes.byCampaignId[query.campaignId] ?? []);
    }

    if (query.sessionId !== undefined) {
      filters.push(store.indexes.bySessionId[query.sessionId] ?? []);
    }
  }

  if (query.campaignId !== undefined && query.pageId !== undefined) {
    filters.push(
      store.indexes.byCampaignPage[
        getCampaignAnalyticsScopedIndexKey(query.campaignId, query.pageId)
      ] ?? [],
    );
  } else if (query.pageId !== undefined) {
    filters.push(store.indexes.byPageId[query.pageId] ?? []);
  }

  if (query.campaignId !== undefined && query.assetId !== undefined) {
    filters.push(
      store.indexes.byCampaignAsset[
        getCampaignAnalyticsScopedIndexKey(query.campaignId, query.assetId)
      ] ?? [],
    );
  } else if (query.assetId !== undefined) {
    filters.push(store.indexes.byAssetId[query.assetId] ?? []);
  }

  if (query.clickId !== undefined) {
    filters.push(store.indexes.byClickId[query.clickId] ?? []);
  }

  if (filters.length === 0) {
    return null;
  }

  const [firstFilter, ...remainingFilters] = filters.map(
    (filter) => new Set(filter),
  );

  return new Set(
    [...firstFilter].filter((recordKey) =>
      remainingFilters.every((filter) => filter.has(recordKey)),
    ),
  );
}

function matchesCampaignAnalyticsEventQuery(
  record: CampaignAnalyticsEventRecord,
  query: CampaignAnalyticsEventQuery,
) {
  const occurredAtMs = Date.parse(record.event.occurredAt);
  const fromMs = query.from === undefined ? undefined : Date.parse(query.from);
  const toMs = query.to === undefined ? undefined : Date.parse(query.to);

  return (
    (query.eventType === undefined || record.event.type === query.eventType) &&
    (query.channelId === undefined ||
      record.attribution.channelId === query.channelId) &&
    (query.productId === undefined ||
      record.attribution.productId === query.productId) &&
    (query.offerId === undefined || record.attribution.offerId === query.offerId) &&
    (query.destination === undefined ||
      record.attribution.destination === query.destination) &&
    (query.href === undefined || record.attribution.href === query.href) &&
    (query.conversionEventName === undefined ||
      record.attribution.conversionEventName === query.conversionEventName) &&
    (query.orderId === undefined || record.attribution.orderId === query.orderId) &&
    (query.currency === undefined ||
      record.attribution.conversionCurrency === query.currency) &&
    (query.matchedBy === undefined ||
      record.attribution.revisitMatchedBy?.some(
        (match) => match.type === query.matchedBy,
      ) === true) &&
    (fromMs === undefined || Number.isNaN(fromMs) || occurredAtMs >= fromMs) &&
    (toMs === undefined || Number.isNaN(toMs) || occurredAtMs <= toMs)
  );
}

function getCampaignAnalyticsEventRecordKey(event: CampaignTrackingEvent) {
  return `${event.campaignId}:${event.sessionId}:${event.id}`;
}

function getCampaignAnalyticsSessionIndexKey(campaignId: string, sessionId: string) {
  return `${campaignId}:${sessionId}`;
}

function getCampaignAnalyticsScopedIndexKey(campaignId: string, scopedId: string) {
  return `${campaignId}:${scopedId}`;
}

function createCampaignShortFormImmersionAttribution(
  event: CampaignTrackingEvent,
): CampaignAnalyticsEventAttribution["immersion"] {
  if (
    event.type !== "engagement" ||
    event.engagement.kind !== "playback" ||
    event.content.type !== "short_video"
  ) {
    return undefined;
  }

  const pageId = firstNonEmptyString(
    event.target.metadata.pageId,
    event.content.pageId,
  );
  const assetId = firstNonEmptyString(
    event.target.metadata.assetId,
    event.content.assetId,
  );

  if (pageId === undefined || assetId === undefined) {
    return undefined;
  }

  return withoutUndefinedProperties({
    type: "short-form" as const,
    pageId,
    assetId,
    sessionId: event.sessionId,
    action: event.engagement.action,
    value: event.engagement.value,
    unit: event.engagement.unit,
  });
}

function withoutUndefinedProperties<TValue extends Record<string, unknown>>(
  value: TValue,
) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as TValue;
}

export function trackInboundCampaignSession(
  storage: Pick<Storage, "getItem" | "setItem">,
  campaignId: string,
  sessionUrl: string,
  options: UpdateCampaignRecordOptions = {},
): CampaignRecord {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }

  const parsedSession = parseInboundCampaignSessionUrl(sessionUrl, {
    campaignId,
  });

  if (!parsedSession.ok) {
    throw new Error(
      `Invalid inbound campaign session: ${parsedSession.errors
        .map((error) => error.code)
        .join(", ")}`,
    );
  }

  const timestamp = options.now?.() ?? new Date().toISOString();
  const trackedSession = createCampaignTrackedSession(
    parsedSession.session,
    campaign,
    timestamp,
  );
  const sessions = upsertCampaignTrackedSession(
    campaign.tracking.sessions ?? [],
    trackedSession,
  );

  return updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      tracking: {
        ...campaign.tracking,
        sessions,
      },
    },
    options,
  );
}

export function identifyReturningCampaignAttribution(
  storage: Pick<Storage, "getItem">,
  campaignId: string,
  identifiers: CampaignReturningAttributionIdentifierInput,
): CampaignReturningAttributionResult {
  const campaign = getPersistedCampaignRecord(storage, campaignId);
  const sessions = campaign?.tracking.sessions ?? [];
  const analyticsEvents = getPersistedCampaignAnalyticsEvents(storage, {
    campaignId,
  });
  const matches = [
    ...findReturningCampaignSessionMatches(sessions, identifiers.sessionId),
    ...findReturningCampaignUserMatches(analyticsEvents, identifiers.userId),
    ...findReturningCampaignClickMatches(analyticsEvents, identifiers.clickId),
    ...findReturningCampaignAttributionParameterMatches(
      sessions,
      identifiers.attributionParameters ?? [],
    ),
  ];

  return {
    campaignId,
    returning: matches.length > 0,
    matches: dedupeReturningCampaignAttributionMatches(matches),
  };
}

export function getPersistedCampaignWorkspaceState(
  storage: Pick<Storage, "getItem">,
  campaignId: string,
): CampaignWorkspaceState | null {
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  if (!campaign) {
    return null;
  }

  return (
    getPersistedCampaignWorkspaceStates(storage).find(
      (workspace) =>
        workspace.id === campaign.workspaceState.workspaceId &&
        workspace.campaignId === campaign.id,
    ) ?? null
  );
}

export function createEmptyCampaignWorkspaceState(
  campaign: CampaignDraft,
  timestamp: string,
  workspaceId = `workspace_${campaign.id}`,
): CampaignWorkspaceState {
  return {
    schemaVersion: "owncanvas.workspace.v1",
    id: workspaceId,
    campaignId: campaign.id,
    mode: "basic",
    activeTool: "select",
    canvas: {
      nodes: campaign.canvasState.nodes,
      edges: campaign.canvasState.edges,
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      selectedNodeIds: [],
      selectedEdgeIds: [],
    },
    initializedAt: timestamp,
    updatedAt: timestamp,
  };
}

function getPersistedCampaignWorkspaceStates(
  storage: Pick<Storage, "getItem">,
): CampaignWorkspaceState[] {
  const serializedWorkspaces = storage.getItem(CAMPAIGN_WORKSPACE_STORAGE_KEY);

  if (!serializedWorkspaces) {
    return [];
  }

  const parsedWorkspaces = JSON.parse(serializedWorkspaces) as
    | CampaignWorkspaceState
    | CampaignWorkspaceState[];

  return Array.isArray(parsedWorkspaces) ? parsedWorkspaces : [parsedWorkspaces];
}

function isEmptyCampaignProductOffer(productOffer: CampaignProductOffer) {
  return (
    Object.values(productOffer.product)
      .filter((value) => !Array.isArray(value))
      .every((value) => typeof value === "string" && value.trim() === "") &&
    productOffer.product.tags.length === 0 &&
    productOffer.product.media.length === 0 &&
    productOffer.product.variants.length === 0 &&
    productOffer.offer.headline.trim() === "" &&
    productOffer.offer.summary.trim() === "" &&
    productOffer.offer.price.amount === null &&
    productOffer.offer.price.currency === "USD" &&
    productOffer.offer.price.display.trim() === "" &&
    productOffer.offer.discount.trim() === "" &&
    productOffer.offer.terms.trim() === "" &&
    productOffer.offer.destinationUrl.trim() === "" &&
    productOffer.offer.callToAction.trim() === "" &&
    productOffer.attribution.source.trim() === "" &&
    productOffer.attribution.externalId.trim() === "" &&
    productOffer.attribution.affiliateNetwork.trim() === "" &&
    productOffer.attribution.commissionRate === null &&
    productOffer.attribution.trackingUrl.trim() === ""
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createCampaignLandingPageExposureUtm(
  campaign: Pick<CampaignDraft, "id" | "tracking">,
  session?: CampaignInboundSession,
): CampaignUtmTracking {
  return {
    source:
      session?.utm.source.trim() ||
      campaign.tracking.utm.source.trim() ||
      "owncanvas",
    medium:
      session?.utm.medium.trim() ||
      campaign.tracking.utm.medium.trim() ||
      "landing",
    campaign:
      session?.utm.campaign.trim() ||
      campaign.tracking.utm.campaign.trim() ||
      campaign.id,
    content: session?.utm.content.trim() || campaign.tracking.utm.content,
    term: session?.utm.term.trim() || campaign.tracking.utm.term,
  };
}

function getCampaignLandingPageExposureTargetUrl(
  campaign: CampaignDraft,
  module: CampaignLandingPageRenderedModule,
  sessionUrl?: string,
) {
  if (module.type === "inline-short-form-continuation") {
    return module.cta.url;
  }

  if (sessionUrl !== undefined && isHttpUrl(sessionUrl)) {
    return sessionUrl;
  }

  if (isHttpUrl(module.mediaUrl)) {
    return module.mediaUrl;
  }

  const destinationUrl = campaign.productOffer.offer.destinationUrl.trim();

  return isHttpUrl(destinationUrl) ? destinationUrl : undefined;
}

function createCampaignLandingPageExposureEventId(
  campaignId: string,
  moduleId: string,
  sessionId: string,
  viewId?: string,
) {
  return [
    "event",
    "exposure",
    sanitizeCampaignTrackingEventIdPart(campaignId),
    sanitizeCampaignTrackingEventIdPart(moduleId),
    sanitizeCampaignTrackingEventIdPart(viewId ?? sessionId),
  ].join("_");
}

function sanitizeCampaignTrackingEventIdPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_]+/g, "_") || "unknown";
}

function readCampaignInboundSessionSearchParams(value: string) {
  try {
    return new URL(value).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function firstCampaignInboundSessionValue(
  ...values: Array<string | null | undefined>
) {
  return values.find((value) => value?.trim() !== "")?.trim() ?? "";
}

function optionalCampaignInboundSessionField<Key extends string>(
  key: Key,
  value: string,
) {
  return value === "" ? {} : { [key]: value };
}

function normalizeCampaignInboundSessionToken(value: string) {
  return value.trim().toLowerCase();
}

function createCampaignInboundSessionAttributionParameters(
  searchParams: URLSearchParams,
): CampaignAttributionParameter[] {
  const parameters: CampaignAttributionParameter[] = [];

  searchParams.forEach((value, key) => {
    const normalizedKey = key.trim();

    if (
      normalizedKey === "" ||
      value.trim() === "" ||
      isReservedCampaignInboundSessionParameter(normalizedKey)
    ) {
      return;
    }

    parameters.push({
      key: normalizedKey,
      value: value.trim(),
      source: "url",
    });
  });

  return parameters;
}

function createCampaignTrackedSession(
  session: CampaignInboundSession,
  campaign: Pick<CampaignRecord, "id">,
  timestamp: string,
): CampaignTrackedSession {
  const sessionId = session.sessionId?.trim() || `${campaign.id}:session`;

  return {
    id: sessionId,
    campaignId: campaign.id,
    ...optionalCampaignInboundSessionField("userId", session.userId ?? ""),
    url: session.url,
    ...optionalCampaignInboundSessionField(
      "channelId",
      session.channelId ?? "",
    ),
    ...optionalCampaignInboundSessionField(
      "touchpointId",
      session.touchpointId ?? "",
    ),
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    utm: {
      ...session.utm,
    },
    attributionParameters: session.attributionParameters.map((parameter) => ({
      ...parameter,
    })),
  };
}

function upsertCampaignTrackedSession(
  sessions: CampaignTrackedSession[],
  trackedSession: CampaignTrackedSession,
): CampaignTrackedSession[] {
  const existingSession = sessions.find(
    (session) => session.id === trackedSession.id,
  );

  if (!existingSession) {
    return [...sessions, trackedSession];
  }

  return sessions.map((session) =>
    session.id === trackedSession.id
      ? {
          ...trackedSession,
          firstSeenAt: session.firstSeenAt,
        }
      : session,
  );
}

function findReturningCampaignSessionMatches(
  sessions: CampaignTrackedSession[],
  sessionId: string | undefined,
): CampaignReturningAttributionMatch[] {
  const normalizedSessionId = sessionId?.trim() ?? "";

  if (normalizedSessionId === "") {
    return [];
  }

  return sessions
    .filter((session) => session.id === normalizedSessionId)
    .map((session) => ({
      type: "session" as const,
      identifier: session.id,
      firstSeenAt: session.firstSeenAt,
      lastSeenAt: session.lastSeenAt,
    }));
}

function findReturningCampaignUserMatches(
  records: CampaignAnalyticsEventRecord[],
  userId: string | undefined,
): CampaignReturningAttributionMatch[] {
  const normalizedUserId = userId?.trim() ?? "";

  if (normalizedUserId === "") {
    return [];
  }

  return createReturningCampaignEventIdentityMatch(
    records.filter((record) => record.event.context.userId === normalizedUserId),
    "user",
    normalizedUserId,
  );
}

function findReturningCampaignClickMatches(
  records: CampaignAnalyticsEventRecord[],
  clickId: string | undefined,
): CampaignReturningAttributionMatch[] {
  const normalizedClickId = clickId?.trim() ?? "";

  if (normalizedClickId === "") {
    return [];
  }

  return createReturningCampaignEventIdentityMatch(
    records.filter(
      (record) =>
        record.event.type === "click" &&
        record.event.click.id === normalizedClickId,
    ),
    "click",
    normalizedClickId,
  );
}

function findReturningCampaignAttributionParameterMatches(
  sessions: CampaignTrackedSession[],
  attributionParameters: CampaignAttributionParameter[],
): CampaignReturningAttributionMatch[] {
  return attributionParameters.flatMap((parameter) => {
    const key = parameter.key.trim();
    const value = parameter.value.trim();

    if (key === "" || value === "") {
      return [];
    }

    return sessions
      .filter((session) =>
        session.attributionParameters.some(
          (candidate) =>
            candidate.key.trim() === key && candidate.value.trim() === value,
        ),
      )
      .map((session) => ({
        type: "attribution_parameter" as const,
        key,
        identifier: value,
        firstSeenAt: session.firstSeenAt,
        lastSeenAt: session.lastSeenAt,
      }));
  });
}

function createReturningCampaignEventIdentityMatch(
  records: CampaignAnalyticsEventRecord[],
  type: "user" | "click",
  identifier: string,
): CampaignReturningAttributionMatch[] {
  if (records.length === 0) {
    return [];
  }

  const occurredAtValues = records
    .map((record) => record.event.occurredAt)
    .sort((left, right) => Date.parse(left) - Date.parse(right));

  return [
    {
      type,
      identifier,
      firstSeenAt: occurredAtValues[0],
      lastSeenAt: occurredAtValues[occurredAtValues.length - 1],
    },
  ];
}

function dedupeReturningCampaignAttributionMatches(
  matches: CampaignReturningAttributionMatch[],
) {
  const seen = new Set<string>();

  return matches.filter((match) => {
    const key = [
      match.type,
      match.key ?? "",
      match.identifier,
      match.firstSeenAt,
      match.lastSeenAt,
    ].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function isReservedCampaignInboundSessionParameter(key: string) {
  return (
    key.startsWith("utm_") ||
    [
      "oc_campaign_id",
      "campaign_id",
      "oc_session_id",
      "session_id",
      "oc_user_id",
      "user_id",
      "oc_channel_id",
      "channel_id",
      "oc_touchpoint_id",
      "touchpoint_id",
    ].includes(key)
  );
}

function isCurrencyCode(value: string) {
  return /^[A-Z]{3}$/.test(value);
}

function nextBlockPosition(index: number) {
  const column = index % 2;
  const row = Math.floor(index / 2);

  return {
    x: 360 + column * 400,
    y: 170 + row * 260,
  };
}
