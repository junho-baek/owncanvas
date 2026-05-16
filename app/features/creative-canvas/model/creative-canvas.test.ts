import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMPAIGN_PUBLISHING_CHANNEL_FIELDS,
  CAMPAIGN_REQUIRED_FIELDS,
  CAMPAIGN_IMMERSIVE_LANDING_PAGE_BLOCK_TYPES,
  CAMPAIGN_LANDING_PAGE_PUBLISHING_PREVIEW_VALIDATION_RULES,
  CAMPAIGN_PRODUCT_OFFER_FIELDS,
  CAMPAIGN_STORAGE_KEY,
  CAMPAIGN_TARGET_AUDIENCE_FIELDS,
  CAMPAIGN_WORKSPACE_STORAGE_KEY,
  addCampaignAsset,
  applyCampaignAssetGenerationExecutionResult,
  applyCampaignImageAssetGenerationExecutionResult,
  applyCampaignVideoAssetGenerationExecutionResult,
  archiveCampaignAsset,
  createBlankCampaign,
  createBlankCampaignRecord,
  createCampaignAsset,
  createCampaignAssetGenerationJob,
  createCampaignBlock,
  createCampaignCanvasEdit,
  createCampaignEvaluationModel,
  getCampaignImmersiveLandingPageBlockTypeDefinition,
  applyCampaignCanvasEditAction,
  createCampaignMeasurementGoal,
  createCampaignMeasurementMetric,
  createCampaignPublishingChannel,
  createCampaignTrackingConfiguration,
  createCampaignProductOffer,
  createCampaignShortFormContentControlModel,
  createCampaignTargetAudience,
  createCampaignWorkflowPluginConfiguration,
  CampaignCompletionActionError,
  createCampaignLandingPageRenderModel,
  validateCampaignLandingPagePreviewAccessibility,
  validateCampaignLandingPagePublishingPreview,
  createCampaignLandingPageBehaviorConfiguration,
  createCampaignLandingPageExposureEvent,
  createEmbeddedShortFormLandingPageTemplateModule,
  createInlineShortFormContinuationLandingPageTemplateModule,
  editCampaignAsset,
  getCampaignAssetDetails,
  getCampaignLandingPageBehaviorConfiguration,
  getCampaignLandingPageAspectRatioCssValue,
  getCampaignMeasurementBasedImprovementStatus,
  getCampaignPublishingChannelDetails,
  listCampaignAssets,
  listCampaignPublishingChannels,
  getCampaignCanvasPath,
  getPersistedCampaignRecord,
  getPersistedCampaignWorkspaceState,
  executeCampaignImageAssetGenerationJobs,
  executeCampaignAssetGenerationJobs,
  executeCampaignImageAssetGenerationWorkflow,
  ingestInstagramCommentEventIntoCampaignWorkflow,
  executeCampaignVideoAssetGenerationJobs,
  executeCampaignVideoAssetGenerationWorkflow,
  loadCampaignAssetGenerationWorkflow,
  loadActivatedPluginsIntoAgentWorkflowRuntime,
  parseCampaignSpecJsonEdit,
  removeCampaignAsset,
  replaceCampaignAsset,
  saveCampaignMeasurementMetrics,
  saveCampaignMeasurementGoals,
  saveCampaignAssetGenerationExecutionResult,
  saveCampaignImageAssetGenerationExecutionResult,
  saveCampaignVideoAssetGenerationExecutionResult,
  serializeCampaignSpecJson,
  setCampaignLandingPageAuthoringControls,
  setCampaignLandingPageBehaviorMode,
  setCampaignWorkflowPluginActivation,
  updatePersistedCampaignRecord,
  validateCampaignAssets,
  validateCampaignAssetGenerationJobs,
  validateCampaignLandingPageTemplateSchema,
  validateCampaignCanvasEdit,
  validateCampaignMeasurementGoals,
  validateCampaignPublishingConfiguration,
  validateCampaignProductOffer,
  validateCampaignCompletion,
} from "./creative-canvas.ts";
import {
  INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  definePluginManifest,
  type PluginCatalog,
  type PluginManifest,
} from "../../plugins/model/plugin-representation.ts";

test("createBlankCampaign starts with an empty canvas and synced JSON spec", () => {
  const campaign = createBlankCampaign();

  assert.equal(campaign.schemaVersion, "owncanvas.campaign.v1");
  assert.equal(campaign.title, "Untitled campaign");
  assert.equal(campaign.objective, "");
  assert.equal(campaign.status, "draft");
  assert.deepEqual(campaign.targetAudience, {
    age: "",
    gender: "",
    interests: "",
    behavior: "",
    region: "",
    platform: "",
  });
  assert.deepEqual(campaign.productOffer, {
    product: {
      id: "",
      title: "",
      brand: "",
      category: "",
      description: "",
      tags: [],
      canonicalUrl: "",
      media: [],
      variants: [],
    },
    offer: {
      headline: "",
      summary: "",
      price: {
        amount: null,
        currency: "USD",
        display: "",
      },
      discount: "",
      terms: "",
      destinationUrl: "",
      callToAction: "",
    },
    attribution: {
      source: "",
      externalId: "",
      affiliateNetwork: "",
      commissionRate: null,
      trackingUrl: "",
    },
  });
  assert.deepEqual(campaign.canvasState.nodes, []);
  assert.deepEqual(campaign.canvasState.edges, []);
  assert.deepEqual(campaign.campaignSpec, {
    nodes: [],
    edges: [],
    assetGenerationJobs: [],
  });
  assert.deepEqual(campaign.plugins, []);
  assert.deepEqual(campaign.tracking, {
    utm: {
      source: "",
      medium: "",
      campaign: "",
      content: "",
      term: "",
    },
    attributionParameters: [],
    pixelEvents: [],
    analyticsDestinations: [],
    analytics: [],
    events: [],
    conversions: [],
    evaluation: {
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
      },
      secondaryMetrics: [],
    },
    measurementGoals: [],
    metrics: [],
    measurementCycles: [],
    improvementActions: [],
    attribution: {
      model: "last-touch",
      touchpoints: [],
    },
  });
});

test("short-form content controls stay available across commerce and campaign actions", () => {
  const videoAsset = createCampaignAsset(
    {
      id: "asset_short_form_demo",
      source: "link",
      mediaType: "video",
      title: "Creator offer demo",
      uri: "https://cdn.example.com/creator-offer-demo.mp4",
      usage: "ad",
      status: "ready",
      rights: {
        owner: "OwnCanvas",
        license: "brand-owned",
      },
      createdBy: "human",
      generatedMetadata: {
        jobId: "job_video",
        resultId: "result_video",
        assetId: "asset_short_form_demo",
        mediaType: "video",
        providerPluginId: "plugin.provider.openai-media",
        capabilityId: "cap.bulk-video",
        providerRequestId: "provider_video_1",
        outputUri: "https://cdn.example.com/creator-offer-demo.mp4",
        mimeType: "video/mp4",
        fileName: "creator-offer-demo.mp4",
        sizeBytes: 2048,
        model: "video-model",
        promptHash: "prompt_hash",
        seed: null,
        generatedAt: "2026-05-11T00:00:00.000Z",
        durationMs: 3000,
        costUsd: null,
        finishReason: "completed",
        dimensions: {
          width: 1080,
          height: 1920,
        },
        durationSeconds: 15,
        inputSources: [],
        outputTargets: [{ assetId: "asset_short_form_demo", field: "uri" }],
      },
    },
    { now: () => "2026-05-11T00:00:00.000Z" },
  );
  const campaign = {
    ...createBlankCampaign(),
    productOffer: createCampaignProductOffer({
      product: {
        title: "Creator Commerce Kit",
        canonicalUrl: "https://shop.example.com/kit",
      },
      offer: {
        headline: "Launch bundle",
        callToAction: "Shop the kit",
        destinationUrl: "https://shop.example.com/offer",
      },
    }),
    assets: [videoAsset],
    channels: [
      createCampaignPublishingChannel({
        id: "channel_dm_landing",
        type: "direct-message",
        platform: "instagram",
        label: "Instagram DM landing",
        placement: "direct-message",
        destinationUrl: "https://go.example.com/kit",
        tracking: {
          utmSource: "instagram",
          utmMedium: "dm",
          utmCampaign: "kit-launch",
          utmContent: "comment-trigger",
          conversionEvent: "purchase",
        },
      }),
    ],
  };

  const controls = createCampaignShortFormContentControlModel(campaign, {
    selectedAssetId: "asset_short_form_demo",
  });

  assert.equal(controls?.activeAsset.id, "asset_short_form_demo");
  assert.equal(controls?.activeAsset.mediaType, "video");
  assert.equal(controls?.playback.loop, true);
  assert.equal(controls?.accessibility.keyboardAccessible, true);
  assert.equal(controls?.accessibility.remainsAvailableWhileBrowsing, true);
  assert.deepEqual(controls?.availableWhileBrowsing, [
    "commerce",
    "campaign-actions",
    "canvas",
  ]);
  assert.deepEqual(
    controls?.actions.map((action) => action.id),
    [
      "play-pause",
      "mute",
      "captions",
      "open-product",
      "open-campaign-action",
      "track-conversion",
    ],
  );
  assert.equal(
    controls?.commerceContext.productTitle,
    "Creator Commerce Kit",
  );
  assert.equal(controls?.campaignActionContext.primaryChannelId, "channel_dm_landing");
});

test("campaign workflow schema declares multiple asset generation jobs", () => {
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_generate_images",
    mediaType: "image",
    providerPluginId: "plugin.provider.openai-media",
    capabilityId: "cap.bulk-image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Image prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
      {
        key: "reference",
        label: "Reference product image",
        source: "asset:asset_product_reference.uri",
        dataType: "image",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_generated_image_1",
        field: "uri",
      },
      {
        assetId: "asset_generated_image_1",
        field: "altText",
      },
    ],
  });
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_generate_videos",
    mediaType: "video",
    providerPluginId: "plugin.provider.openai-media",
    capabilityId: "cap.bulk-video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:text_block_1.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_generated_video_1",
        field: "uri",
      },
      {
        assetId: "asset_generated_video_1",
        field: "mimeType",
      },
    ],
  });
  const campaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [imageJob, videoJob],
    },
  };

  assert.deepEqual(campaign.campaignSpec.assetGenerationJobs, [
    {
      id: "job_generate_images",
      mediaType: "image",
      providerPluginId: "plugin.provider.openai-media",
      capabilityId: "cap.bulk-image",
      requiredInputs: [
        {
          key: "prompt",
          label: "Image prompt",
          source: "node:text_block_1.outputs.prompt",
          dataType: "text",
        },
        {
          key: "reference",
          label: "Reference product image",
          source: "asset:asset_product_reference.uri",
          dataType: "image",
        },
      ],
      outputTargets: [
        {
          assetId: "asset_generated_image_1",
          field: "uri",
        },
        {
          assetId: "asset_generated_image_1",
          field: "altText",
        },
      ],
      status: "draft",
      lifecycle: imageJob.lifecycle,
    },
    {
      id: "job_generate_videos",
      mediaType: "video",
      providerPluginId: "plugin.provider.openai-media",
      capabilityId: "cap.bulk-video",
      requiredInputs: [
        {
          key: "storyboard",
          label: "Storyboard",
          source: "node:text_block_1.outputs.storyboard",
          dataType: "json",
        },
      ],
      outputTargets: [
        {
          assetId: "asset_generated_video_1",
          field: "uri",
        },
        {
          assetId: "asset_generated_video_1",
          field: "mimeType",
        },
      ],
      status: "draft",
      lifecycle: videoJob.lifecycle,
    },
  ]);
  assert.deepEqual(
    validateCampaignAssetGenerationJobs(
      campaign.campaignSpec.assetGenerationJobs,
    ),
    { valid: true, errors: [] },
  );
});

test("Instagram comment events ingest into normalized campaign workflow events", () => {
  const campaign = createBlankCampaign();

  const result = ingestInstagramCommentEventIntoCampaignWorkflow(
    campaign,
    {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
      id: "evt.instagram-comment.1",
      campaignId: campaign.id,
      occurredAt: "2026-05-11T00:00:00.000Z",
      channel: "instagram",
      trigger: "comment",
      accountId: "ig.account.1",
      mediaId: "ig.media.1",
      commentId: "ig.comment.1",
      parentCommentId: "ig.comment.parent",
      commenter: {
        id: "ig.user.1",
        username: "creativebuyer",
      },
      text: "send me the link",
      permalink: "https://www.instagram.com/p/DROP001/c/ig.comment.1/",
      attribution: {
        source: "instagram",
        medium: "comment",
        campaign: campaign.id,
        content: "ig.media.1",
        term: "send me the link",
      },
      metadata: {
        sourceNodeId: "node.instagram-comment",
        productOfferId: "offer.launch-1",
      },
    },
    {
      pluginId: "plugin.instagram.dm",
      capabilityId: "cap.comment-to-dm",
      sourceNodeId: "node.instagram-comment",
      outputPort: "outputs.comment",
      targetNodeId: "dm_instagram_handoff",
      targetInputPort: "inputs.trigger",
      now: () => "2026-05-11T00:00:01.000Z",
    },
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail("Expected Instagram comment ingestion to succeed.");
  }

  assert.deepEqual(result.event, {
    schemaVersion: "owncanvas.workflow-event.v1",
    id: "workflow.event.evt.instagram-comment.1",
    campaignId: campaign.id,
    type: "instagram.comment.created",
    occurredAt: "2026-05-11T00:00:00.000Z",
    ingestedAt: "2026-05-11T00:00:01.000Z",
    source: {
      pluginId: "plugin.instagram.dm",
      capabilityId: "cap.comment-to-dm",
      channel: "instagram",
      trigger: "comment",
      providerEventId: "evt.instagram-comment.1",
      accountId: "ig.account.1",
      mediaId: "ig.media.1",
      commentId: "ig.comment.1",
      permalink: "https://www.instagram.com/p/DROP001/c/ig.comment.1/",
    },
    subject: {
      type: "instagram.comment",
      id: "ig.comment.1",
      parentId: "ig.comment.parent",
      text: "send me the link",
      actor: {
        id: "ig.user.1",
        username: "creativebuyer",
      },
    },
    workflow: {
      sourceNodeId: "node.instagram-comment",
      outputPort: "outputs.comment",
      targetNodeId: "dm_instagram_handoff",
      targetInputPort: "inputs.trigger",
    },
    attribution: {
      source: "instagram",
      medium: "comment",
      campaign: campaign.id,
      content: "ig.media.1",
      term: "send me the link",
      touchpoint: "instagram.comment",
    },
    payload: {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
      event: {
        accountId: "ig.account.1",
        mediaId: "ig.media.1",
        commentId: "ig.comment.1",
        commenterId: "ig.user.1",
        commenterUsername: "creativebuyer",
        text: "send me the link",
      },
    },
    metadata: {
      sourceNodeId: "node.instagram-comment",
      productOfferId: "offer.launch-1",
    },
  });
  assert.deepEqual(result.campaign.campaignSpec.workflowEvents, [result.event]);
  assert.deepEqual(result.campaign.canvasState, campaign.canvasState);
  assert.deepEqual(result.campaign.tracking.events, ["instagram.comment.created"]);
  assert.deepEqual(result.campaign.tracking.attribution.touchpoints, [
    "instagram.comment",
  ]);
  assert.ok(
    result.campaign.logs.includes(
      "2026-05-11T00:00:01.000Z workflow.event.ingested:workflow.event.evt.instagram-comment.1",
    ),
  );
});

test("Instagram comment event ingestion rejects malformed and cross-campaign events", () => {
  const campaign = createBlankCampaign();

  const result = ingestInstagramCommentEventIntoCampaignWorkflow(campaign, {
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
    id: "evt.instagram-comment.1",
    campaignId: "campaign.other",
    occurredAt: "not-a-date",
    channel: "instagram",
    trigger: "comment",
    accountId: "",
    mediaId: "ig.media.1",
    commentId: "",
    commenter: {
      id: "",
    },
    text: "",
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected Instagram comment ingestion to fail.");
  }
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-comment.occurred_at_invalid",
      "instagram-comment.account_id_required",
      "instagram-comment.comment_id_required",
      "instagram-comment.commenter_id_required",
      "instagram-comment.text_required",
      "workflow-event.campaign_mismatch",
    ],
  );
  assert.deepEqual(result.campaign, campaign);
});

test("asset generation jobs expose shared status lifecycle metadata", () => {
  const job = createCampaignAssetGenerationJob({
    id: "job_lifecycle_image",
    mediaType: "image",
    providerPluginId: "plugin.provider.media",
    capabilityId: "cap.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_generated_image",
        field: "uri",
      },
    ],
    status: "running",
    lifecycle: {
      createdAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:02:00.000Z",
      queuedAt: "2026-05-11T00:01:00.000Z",
      startedAt: "2026-05-11T00:02:00.000Z",
      completedAt: null,
      failedAt: null,
      canceledAt: null,
      actor: "agent",
      attempt: 2,
      progress: 45,
      error: null,
    },
  });

  assert.deepEqual(job.lifecycle, {
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:02:00.000Z",
    queuedAt: "2026-05-11T00:01:00.000Z",
    startedAt: "2026-05-11T00:02:00.000Z",
    completedAt: null,
    failedAt: null,
    canceledAt: null,
    actor: "agent",
    attempt: 2,
    progress: 45,
    error: null,
  });
  assert.deepEqual(validateCampaignAssetGenerationJobs([job]), {
    valid: true,
    errors: [],
  });
});

test("image asset generation jobs define provider-ready inputs and result metadata", () => {
  const job = createCampaignAssetGenerationJob({
    id: "job_generate_product_images",
    mediaType: "image",
    providerPluginId: "plugin.provider.openai-media",
    capabilityId: "cap.bulk-image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
      {
        key: "productReference",
        label: "Product reference",
        source: "asset:asset_product_reference.uri",
        dataType: "image",
      },
    ],
    imageInputs: {
      prompt: "Studio product photo on a matte graphite table",
      negativePrompt: "logos, watermarks, extra packaging",
      referenceAssetIds: ["asset_product_reference"],
      productAssetIds: ["asset_product_reference"],
      count: 4,
      aspectRatio: "1:1",
      size: {
        width: 1024,
        height: 1024,
      },
      style: "premium ecommerce",
      seed: 2481,
      providerParameters: {
        quality: "high",
        background: "transparent",
      },
    },
    outputTargets: [
      {
        assetId: "asset_generated_image_1",
        field: "uri",
      },
    ],
    resultMetadata: [
      {
        id: "result_generated_image_1",
        assetId: "asset_generated_image_1",
        uri: "https://cdn.example.com/generated/product-image-1.png",
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        sizeBytes: 842100,
        model: "gpt-image-1",
        seed: 2481,
        promptHash: "sha256:product-image-prompt",
        providerRequestId: "req_image_001",
        generatedAt: "2026-05-11T00:05:00.000Z",
        durationMs: 8200,
        costUsd: 0.08,
        finishReason: "completed",
      },
    ],
  });

  assert.deepEqual(job.imageInputs, {
    prompt: "Studio product photo on a matte graphite table",
    negativePrompt: "logos, watermarks, extra packaging",
    referenceAssetIds: ["asset_product_reference"],
    productAssetIds: ["asset_product_reference"],
    count: 4,
    aspectRatio: "1:1",
    size: {
      width: 1024,
      height: 1024,
    },
    style: "premium ecommerce",
    seed: 2481,
    providerParameters: {
      quality: "high",
      background: "transparent",
    },
  });
  assert.deepEqual(job.resultMetadata, [
    {
      id: "result_generated_image_1",
      assetId: "asset_generated_image_1",
      uri: "https://cdn.example.com/generated/product-image-1.png",
      mimeType: "image/png",
      width: 1024,
      height: 1024,
      sizeBytes: 842100,
      model: "gpt-image-1",
      seed: 2481,
      promptHash: "sha256:product-image-prompt",
      providerRequestId: "req_image_001",
      generatedAt: "2026-05-11T00:05:00.000Z",
      durationMs: 8200,
      costUsd: 0.08,
      finishReason: "completed",
    },
  ]);
  assert.deepEqual(validateCampaignAssetGenerationJobs([job]), {
    valid: true,
    errors: [],
  });
});

test("video asset generation jobs define provider-ready inputs and result metadata", () => {
  const job = createCampaignAssetGenerationJob({
    id: "job_generate_product_videos",
    mediaType: "video",
    providerPluginId: "plugin.provider.openai-media",
    capabilityId: "cap.bulk-video",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:storyboard_block_1.outputs.frames",
        dataType: "json",
      },
      {
        key: "productReference",
        label: "Product reference",
        source: "asset:asset_product_reference.uri",
        dataType: "image",
      },
    ],
    videoInputs: {
      prompt: "Six-second vertical product reveal with a purchase CTA",
      negativePrompt: "logos, watermarks, warped hands",
      storyboard: {
        beats: [
          { second: 0, shot: "package on counter" },
          { second: 3, shot: "product in use" },
          { second: 5, shot: "CTA end frame" },
        ],
      },
      script: "Tap to claim the launch offer before it ends.",
      referenceAssetIds: ["asset_product_reference"],
      productAssetIds: ["asset_product_reference"],
      count: 3,
      aspectRatio: "9:16",
      durationSeconds: 6,
      resolution: {
        width: 1080,
        height: 1920,
      },
      frameRate: 24,
      style: "ugc commerce short",
      seed: 4812,
      providerParameters: {
        motionStrength: "medium",
        safetyMode: "standard",
      },
    },
    outputTargets: [
      {
        assetId: "asset_generated_video_1",
        field: "uri",
      },
      {
        assetId: "asset_generated_video_1",
        field: "mimeType",
      },
    ],
    resultMetadata: [
      {
        id: "result_generated_video_1",
        assetId: "asset_generated_video_1",
        uri: "https://cdn.example.com/generated/product-video-1.mp4",
        mimeType: "video/mp4",
        width: 1080,
        height: 1920,
        durationSeconds: 6,
        frameRate: 24,
        codec: "h264",
        thumbnailUri:
          "https://cdn.example.com/generated/product-video-1-poster.jpg",
        sizeBytes: 4_821_000,
        model: "sora-2",
        seed: 4812,
        promptHash: "sha256:product-video-prompt",
        providerRequestId: "req_video_001",
        generatedAt: "2026-05-11T00:06:00.000Z",
        durationMs: 42000,
        costUsd: 0.42,
        finishReason: "completed",
      },
    ],
  });

  assert.deepEqual(job.videoInputs, {
    prompt: "Six-second vertical product reveal with a purchase CTA",
    negativePrompt: "logos, watermarks, warped hands",
    storyboard: {
      beats: [
        { second: 0, shot: "package on counter" },
        { second: 3, shot: "product in use" },
        { second: 5, shot: "CTA end frame" },
      ],
    },
    script: "Tap to claim the launch offer before it ends.",
    referenceAssetIds: ["asset_product_reference"],
    productAssetIds: ["asset_product_reference"],
    count: 3,
    aspectRatio: "9:16",
    durationSeconds: 6,
    resolution: {
      width: 1080,
      height: 1920,
    },
    frameRate: 24,
    style: "ugc commerce short",
    seed: 4812,
    providerParameters: {
      motionStrength: "medium",
      safetyMode: "standard",
    },
  });
  assert.deepEqual(job.resultMetadata, [
    {
      id: "result_generated_video_1",
      assetId: "asset_generated_video_1",
      uri: "https://cdn.example.com/generated/product-video-1.mp4",
      mimeType: "video/mp4",
      width: 1080,
      height: 1920,
      durationSeconds: 6,
      frameRate: 24,
      codec: "h264",
      thumbnailUri:
        "https://cdn.example.com/generated/product-video-1-poster.jpg",
      sizeBytes: 4_821_000,
      model: "sora-2",
      seed: 4812,
      promptHash: "sha256:product-video-prompt",
      providerRequestId: "req_video_001",
      generatedAt: "2026-05-11T00:06:00.000Z",
      durationMs: 42000,
      costUsd: 0.42,
      finishReason: "completed",
    },
  ]);
  assert.deepEqual(validateCampaignAssetGenerationJobs([job]), {
    valid: true,
    errors: [],
  });
});

test("workflow validation rejects asset generation jobs missing inputs or output targets", () => {
  const malformedJobs = [
    {
      id: "job_missing_inputs",
      mediaType: "image",
      providerPluginId: "plugin.provider.media",
      capabilityId: "cap.image",
      outputTargets: [
        {
          assetId: "asset_generated_image",
          field: "uri",
        },
      ],
      status: "draft",
    },
    {
      id: "job_missing_outputs",
      mediaType: "video",
      providerPluginId: "plugin.provider.media",
      capabilityId: "cap.video",
      requiredInputs: [
        {
          key: "prompt",
          label: "Prompt",
          source: "node:text_block_1.outputs.prompt",
          dataType: "text",
        },
      ],
      status: "draft",
    },
  ] as any;

  assert.deepEqual(validateCampaignAssetGenerationJobs(malformedJobs), {
    valid: false,
    errors: [
      {
        code: "asset_generation_job.required_input_required",
        path: "campaignSpec.assetGenerationJobs.0.requiredInputs",
        message: "Asset generation job requires at least one input.",
      },
      {
        code: "asset_generation_job.output_target_required",
        path: "campaignSpec.assetGenerationJobs.1.outputTargets",
        message: "Asset generation job requires at least one output target.",
      },
    ],
  });
});

test("updatePersistedCampaignRecord rejects workflows with incomplete asset generation jobs", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_invalid_asset_generation_workflow",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.throws(
    () =>
      updatePersistedCampaignRecord(
        storage,
        {
          ...campaign,
          campaignSpec: {
            ...campaign.campaignSpec,
            assetGenerationJobs: [
              {
                id: "job_missing_inputs",
                mediaType: "image",
                providerPluginId: "plugin.provider.media",
                capabilityId: "cap.image",
                outputTargets: [
                  {
                    assetId: "asset_generated_image",
                    field: "uri",
                  },
                ],
                status: "draft",
              },
              {
                id: "job_missing_outputs",
                mediaType: "video",
                providerPluginId: "plugin.provider.media",
                capabilityId: "cap.video",
                requiredInputs: [
                  {
                    key: "prompt",
                    label: "Prompt",
                    source: "node:text_block_1.outputs.prompt",
                    dataType: "text",
                  },
                ],
                status: "draft",
              },
            ] as any,
          },
        },
        {
          now: () => "2026-05-11T00:01:00.000Z",
        },
      ),
    /asset_generation_job.required_input_required, asset_generation_job.output_target_required/,
  );
  assert.deepEqual(
    getPersistedCampaignRecord(
      storage,
      "campaign_invalid_asset_generation_workflow",
    )?.campaignSpec.assetGenerationJobs,
    [],
  );
});

test("updatePersistedCampaignRecord rejects completed campaigns without measurement records", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_completion_without_measurement_record",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.throws(
    () =>
      updatePersistedCampaignRecord(
        storage,
        {
          ...campaign,
          status: "completed",
        } as any,
        {
          now: () => "2026-05-11T00:01:00.000Z",
        },
      ),
    /campaign_completion.measurement_record_required/,
  );
  assert.equal(
    getPersistedCampaignRecord(
      storage,
      "campaign_completion_without_measurement_record",
    )?.status,
    "draft",
  );
});

test("updatePersistedCampaignRecord rejects completed campaigns without improvement records", () => {
  const storage = new MemoryStorage();
  createBlankCampaignRecord(storage, {
    id: "campaign_completion_without_improvement_record",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  saveCampaignMeasurementGoals(
    storage,
    "campaign_completion_without_improvement_record",
    [
      createCampaignMeasurementGoal({
        id: "goal_purchase_conversion",
        name: "purchase_conversion_rate",
        target: 3.5,
        unit: "percent",
        successCriteria:
          "Purchase conversion reaches the tracked checkout threshold.",
        reportingTimeframe: {
          startsAt: "2026-05-12T00:00:00.000Z",
          endsAt: "2026-05-19T00:00:00.000Z",
          timezone: "UTC",
        },
      }),
    ],
    { now: () => "2026-05-11T00:01:00.000Z" },
  );
  const measuredCampaign = saveCampaignMeasurementMetrics(
    storage,
    "campaign_completion_without_improvement_record",
    [
      createCampaignMeasurementMetric({
        id: "metric_purchase_conversion_rate",
        metric: "purchase_conversion_rate",
        value: 3.8,
        unit: "percent",
        source: "plugin.tracking.active-conversion",
        attributionTouchpoint: "checkout",
        observedAt: "2026-05-12T00:00:00.000Z",
      }),
    ],
    { now: () => "2026-05-12T00:05:00.000Z" },
  );

  assert.throws(
    () =>
      updatePersistedCampaignRecord(
        storage,
        {
          ...measuredCampaign,
          status: "completed",
        } as any,
        {
          now: () => "2026-05-12T00:06:00.000Z",
        },
      ),
    /campaign_completion.improvement_record_required/,
  );
  assert.equal(
    getPersistedCampaignRecord(
      storage,
      "campaign_completion_without_improvement_record",
    )?.status,
    "draft",
  );
});

test("validateCampaignCompletion rejects completed campaigns whose measurement cycle is not tied to measurement criteria", () => {
  const measurementMetric = createCampaignMeasurementMetric({
    id: "metric_purchase_conversion_rate",
    metric: "purchase_conversion_rate",
    value: 3.8,
    unit: "percent",
    source: "plugin.tracking.active-conversion",
    attributionTouchpoint: "checkout",
    observedAt: "2026-05-12T00:00:00.000Z",
  });
  const tracking = createCampaignTrackingConfiguration({
    measurementGoals: [],
    metrics: [measurementMetric],
    measurementCycles: [
      {
        schemaVersion: "owncanvas.campaign-measurement-cycle.v1",
        id: "measurement_cycle_unscoped",
        status: "completed",
        goalIds: [],
        startedAt: "2026-05-12T00:00:00.000Z",
        completedAt: "2026-05-12T00:05:00.000Z",
        resultCount: 1,
        performanceResults: [measurementMetric],
        primaryResult: measurementMetric,
      },
    ],
    improvementActions: [
      {
        schemaVersion: "owncanvas.campaign-improvement-action.v1",
        id: "improvement_measurement_cycle_unscoped",
        status: "completed",
        priority: "medium",
        actionType: "scale_winning_path",
        sourceMeasurementCycleId: "measurement_cycle_unscoped",
        goalIds: [],
        metric: "purchase_conversion_rate",
        observedValue: 3.8,
        targetValue: null,
        unit: "percent",
        recommendation:
          "Scale the winning conversion path into the next campaign iteration.",
        rationale:
          "purchase_conversion_rate recorded 3.8 percent without configured criteria.",
        createdAt: "2026-05-12T00:05:00.000Z",
        measurementResultUsage: {
          schemaVersion: "owncanvas.campaign-measurement-result-usage.v1",
          usedAt: "2026-05-12T00:06:00.000Z",
          usedMetricIds: ["metric_purchase_conversion_rate"],
          appliedChange: "Created a follow-up conversion-path iteration.",
        },
      },
    ],
  });

  assert.deepEqual(validateCampaignCompletion({ status: "completed", tracking }), {
    valid: false,
    errors: [
      {
        code: "campaign_completion.measurement_criteria_required",
        path: "tracking.measurementGoals",
        message:
          "Campaign completion requires at least one measurement goal tied to the completed measurement cycle.",
      },
    ],
  });
});

test("validateCampaignCompletion rejects completed campaigns whose improvement action is not tied to required criteria", () => {
  const measurementGoal = createCampaignMeasurementGoal({
    id: "goal_purchase_conversion",
    name: "purchase_conversion_rate",
    target: 3.5,
    unit: "percent",
    successCriteria: "Purchase conversion reaches the tracked checkout threshold.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-19T00:00:00.000Z",
      timezone: "UTC",
    },
  });
  const measurementMetric = createCampaignMeasurementMetric({
    id: "metric_purchase_conversion_rate",
    metric: "purchase_conversion_rate",
    value: 3.8,
    unit: "percent",
    source: "plugin.tracking.active-conversion",
    attributionTouchpoint: "checkout",
    observedAt: "2026-05-12T00:00:00.000Z",
  });
  const tracking = createCampaignTrackingConfiguration({
    measurementGoals: [measurementGoal],
    metrics: [measurementMetric],
    measurementCycles: [
      {
        schemaVersion: "owncanvas.campaign-measurement-cycle.v1",
        id: "measurement_cycle_goal_purchase_conversion",
        status: "completed",
        goalIds: ["goal_purchase_conversion"],
        startedAt: "2026-05-12T00:00:00.000Z",
        completedAt: "2026-05-12T00:05:00.000Z",
        resultCount: 1,
        performanceResults: [measurementMetric],
        primaryResult: measurementMetric,
      },
    ],
    improvementActions: [
      {
        schemaVersion: "owncanvas.campaign-improvement-action.v1",
        id: "improvement_missing_required_criteria",
        status: "completed",
        priority: "medium",
        actionType: "scale_winning_path",
        sourceMeasurementCycleId: "measurement_cycle_goal_purchase_conversion",
        goalIds: [],
        metric: "purchase_conversion_rate",
        observedValue: 3.8,
        targetValue: 3.5,
        unit: "percent",
        recommendation:
          "Scale the winning conversion path into the next campaign iteration.",
        rationale:
          "purchase_conversion_rate recorded 3.8 percent against the configured target.",
        createdAt: "2026-05-12T00:05:00.000Z",
        measurementResultUsage: {
          schemaVersion: "owncanvas.campaign-measurement-result-usage.v1",
          usedAt: "2026-05-12T00:06:00.000Z",
          usedMetricIds: ["metric_purchase_conversion_rate"],
          appliedChange: "Created a follow-up conversion-path iteration.",
        },
      },
    ],
  });

  assert.deepEqual(validateCampaignCompletion({ status: "completed", tracking }), {
    valid: false,
    errors: [
      {
        code: "campaign_completion.improvement_criteria_required",
        path: "tracking.improvementActions",
        message:
          "Campaign completion requires at least one completed improvement tied to the required measurement criteria.",
      },
    ],
  });
});

test("updatePersistedCampaignRecord exposes structured completion action failure reasons", () => {
  const storage = new MemoryStorage();
  const measurementMetric = createCampaignMeasurementMetric({
    id: "metric_purchase_conversion_rate",
    metric: "purchase_conversion_rate",
    value: 3.8,
    unit: "percent",
    source: "plugin.tracking.active-conversion",
    attributionTouchpoint: "checkout",
    observedAt: "2026-05-12T00:00:00.000Z",
  });
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_completion_structured_failure_reasons",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const tracking = createCampaignTrackingConfiguration({
    measurementGoals: [],
    metrics: [measurementMetric],
    measurementCycles: [
      {
        schemaVersion: "owncanvas.campaign-measurement-cycle.v1",
        id: "measurement_cycle_unscoped",
        status: "completed",
        goalIds: [],
        startedAt: "2026-05-12T00:00:00.000Z",
        completedAt: "2026-05-12T00:05:00.000Z",
        resultCount: 1,
        performanceResults: [measurementMetric],
        primaryResult: measurementMetric,
      },
    ],
    improvementActions: [],
  });

  let thrown: unknown;

  try {
    updatePersistedCampaignRecord(
      storage,
      {
        ...campaign,
        status: "completed",
        tracking,
      },
      {
        now: () => "2026-05-12T00:06:00.000Z",
      },
    );
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof CampaignCompletionActionError);
  assert.deepEqual(thrown.reasons, [
    {
      code: "campaign_completion.measurement_criteria_required",
      path: "tracking.measurementGoals",
      message:
        "Campaign completion requires at least one measurement goal tied to the completed measurement cycle.",
    },
    {
      code: "campaign_completion.improvement_record_required",
      path: "tracking.improvementActions",
      message:
        "Campaign completion requires at least one completed improvement record.",
    },
  ]);
  assert.equal(
    thrown.completionState.measurementCycleCompletion
      .hasCompletedMeasurementCycle,
    true,
  );
  assert.equal(
    thrown.completionState.improvementStatus
      .hasCompletedMeasurementBasedImprovementCycle,
    false,
  );
  assert.equal(
    getPersistedCampaignRecord(
      storage,
      "campaign_completion_structured_failure_reasons",
    )?.status,
    "draft",
  );
});

test("workflow loading preserves separate image and video generation job declarations", () => {
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_image_variants",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_image_variant_1",
        field: "uri",
      },
    ],
    status: "ready",
  });
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_video_variants",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:text_block_1.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_video_variant_1",
        field: "uri",
      },
    ],
    status: "queued",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_media_workflow",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [imageJob, videoJob],
    },
  };

  const workflow = loadCampaignAssetGenerationWorkflow(campaign);

  assert.equal(workflow.campaignId, "campaign_media_workflow");
  assert.deepEqual(workflow.jobs, [imageJob, videoJob]);
  assert.deepEqual(workflow.imageJobs, [imageJob]);
  assert.deepEqual(workflow.videoJobs, [videoJob]);
  assert.notEqual(workflow.jobs[0], imageJob);
  assert.notEqual(workflow.imageJobs[0], imageJob);
  assert.notEqual(workflow.videoJobs[0], videoJob);
});

test("image asset generation jobs execute concurrently and return completed job snapshots", async () => {
  const firstImageJob = createCampaignAssetGenerationJob({
    id: "job_image_variant_1",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_image_variant_1", field: "uri" }],
    status: "ready",
  });
  const secondImageJob = createCampaignAssetGenerationJob({
    id: "job_image_variant_2",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_2.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_image_variant_2", field: "uri" }],
    status: "queued",
  });
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_video_variant_1",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:text_block_1.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_video_variant_1", field: "uri" }],
    status: "ready",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_parallel_images",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [firstImageJob, secondImageJob, videoJob],
    },
  };
  const workflow = loadCampaignAssetGenerationWorkflow(campaign);
  let inFlight = 0;
  let maxInFlight = 0;
  const startedJobs: string[] = [];
  const timestamps = [
    "2026-05-11T01:00:00.000Z",
    "2026-05-11T01:00:01.000Z",
    "2026-05-11T01:00:02.000Z",
    "2026-05-11T01:00:03.000Z",
  ];

  const result = await executeCampaignImageAssetGenerationJobs(
    workflow,
    async (job) => {
      startedJobs.push(job.id);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;

      return [
        {
          id: `result_${job.id}`,
          assetId: job.outputTargets[0].assetId,
          uri: `https://cdn.example.test/${job.id}.png`,
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sizeBytes: 2048,
          model: "image-fast",
          seed: null,
          promptHash: `hash_${job.id}`,
          providerRequestId: `request_${job.id}`,
          generatedAt: "2026-05-11T01:00:10.000Z",
          durationMs: 10,
          costUsd: 0.01,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => timestamps.shift() ?? "2026-05-11T01:00:04.000Z",
    },
  );

  assert.equal(maxInFlight, 2);
  assert.deepEqual(startedJobs.sort(), [
    "job_image_variant_1",
    "job_image_variant_2",
  ]);
  assert.equal(result.campaignId, "campaign_parallel_images");
  assert.deepEqual(
    result.completedJobs.map((job) => job.id),
    ["job_image_variant_1", "job_image_variant_2"],
  );
  assert.deepEqual(result.failedJobs, []);
  assert.deepEqual(result.skippedJobs, [videoJob]);
  assert.equal(result.completedJobs[0].status, "completed");
  assert.equal(result.completedJobs[0].lifecycle?.actor, "agent");
  assert.equal(result.completedJobs[0].lifecycle?.attempt, 1);
  assert.equal(result.completedJobs[0].lifecycle?.progress, 100);
  assert.equal(
    result.completedJobs[0].resultMetadata?.[0].assetId,
    "asset_image_variant_1",
  );
  assert.equal(firstImageJob.status, "ready");
  assert.equal(firstImageJob.resultMetadata, undefined);
});

test("asset generation workflow orchestrates image and video jobs concurrently", async () => {
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_orchestrate_image",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text.outputs.imagePrompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_orchestrated_image", field: "uri" }],
    status: "ready",
  });
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_orchestrate_video",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:text.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_orchestrated_video", field: "uri" }],
    status: "queued",
  });
  const draftJob = createCampaignAssetGenerationJob({
    id: "job_orchestrate_draft",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text.outputs.draftPrompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_orchestrated_draft", field: "uri" }],
    status: "draft",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_parallel_media_orchestration",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [imageJob, videoJob, draftJob],
    },
  };
  let inFlight = 0;
  let maxInFlight = 0;
  const startedJobs: string[] = [];

  const result = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaign),
    async (job) => {
      startedJobs.push(`${job.mediaType}:${job.id}`);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;

      return [
        {
          id: `result_${job.id}`,
          assetId: job.outputTargets[0].assetId,
          uri: `https://cdn.example.test/${job.id}.${job.mediaType === "video" ? "mp4" : "png"}`,
          mimeType: job.mediaType === "video" ? "video/mp4" : "image/png",
          width: job.mediaType === "video" ? 1080 : 1024,
          height: job.mediaType === "video" ? 1920 : 1024,
          durationSeconds: job.mediaType === "video" ? 6 : undefined,
          frameRate: job.mediaType === "video" ? 30 : undefined,
          sizeBytes: 4096,
          model: job.mediaType === "video" ? "video-fast" : "image-fast",
          seed: null,
          promptHash: `hash_${job.id}`,
          providerRequestId: `request_${job.id}`,
          generatedAt: "2026-05-11T02:00:10.000Z",
          durationMs: 10,
          costUsd: 0.03,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T02:00:00.000Z",
    },
  );

  assert.equal(maxInFlight, 2);
  assert.deepEqual(startedJobs.sort(), [
    "image:job_orchestrate_image",
    "video:job_orchestrate_video",
  ]);
  assert.deepEqual(
    result.completedJobs.map((job) => `${job.mediaType}:${job.id}`),
    ["image:job_orchestrate_image", "video:job_orchestrate_video"],
  );
  assert.deepEqual(result.skippedJobs, [draftJob]);
  assert.deepEqual(
    result.jobStatuses.map((status) => ({
      jobId: status.jobId,
      mediaType: status.mediaType,
      executionStatus: status.executionStatus,
    })),
    [
      {
        jobId: "job_orchestrate_image",
        mediaType: "image",
        executionStatus: "completed",
      },
      {
        jobId: "job_orchestrate_video",
        mediaType: "video",
        executionStatus: "completed",
      },
      {
        jobId: "job_orchestrate_draft",
        mediaType: "image",
        executionStatus: "skipped",
      },
    ],
  );
  assert.equal(videoJob.status, "queued");
  assert.equal(videoJob.resultMetadata, undefined);
});

test("video asset generation jobs execute concurrently without running image jobs", async () => {
  const firstVideoJob = createCampaignAssetGenerationJob({
    id: "job_video_parallel_1",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:text.outputs.storyboardA",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_video_parallel_1", field: "uri" }],
    status: "ready",
  });
  const secondVideoJob = createCampaignAssetGenerationJob({
    id: "job_video_parallel_2",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "script",
        label: "Script",
        source: "node:text.outputs.scriptB",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_video_parallel_2", field: "uri" }],
    status: "queued",
  });
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_image_not_video",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text.outputs.imagePrompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_image_not_video", field: "uri" }],
    status: "ready",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_parallel_videos",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [firstVideoJob, secondVideoJob, imageJob],
    },
  };
  const workflow = loadCampaignAssetGenerationWorkflow(campaign);
  let inFlight = 0;
  let maxInFlight = 0;
  const startedJobs: string[] = [];

  const result = await executeCampaignVideoAssetGenerationJobs(
    workflow,
    async (job) => {
      startedJobs.push(`${job.mediaType}:${job.id}`);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;

      return [
        {
          id: `result_${job.id}`,
          assetId: job.outputTargets[0].assetId,
          uri: `https://cdn.example.test/${job.id}.mp4`,
          mimeType: "video/mp4",
          width: 1080,
          height: 1920,
          durationSeconds: 8,
          frameRate: 30,
          codec: "h264",
          sizeBytes: 8192,
          model: "video-fast",
          seed: null,
          promptHash: `hash_${job.id}`,
          providerRequestId: `request_${job.id}`,
          generatedAt: "2026-05-11T03:00:10.000Z",
          durationMs: 10,
          costUsd: 0.08,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T03:00:00.000Z",
    },
  );

  assert.equal(maxInFlight, 2);
  assert.deepEqual(startedJobs.sort(), [
    "video:job_video_parallel_1",
    "video:job_video_parallel_2",
  ]);
  assert.deepEqual(
    result.completedJobs.map((job) => job.id),
    ["job_video_parallel_1", "job_video_parallel_2"],
  );
  assert.deepEqual(result.failedJobs, []);
  assert.deepEqual(result.skippedJobs, [imageJob]);
  assert.deepEqual(
    result.jobStatuses.map((status) => ({
      jobId: status.jobId,
      mediaType: status.mediaType,
      executionStatus: status.executionStatus,
      jobStatus: status.jobStatus,
    })),
    [
      {
        jobId: "job_video_parallel_1",
        mediaType: "video",
        executionStatus: "completed",
        jobStatus: "completed",
      },
      {
        jobId: "job_video_parallel_2",
        mediaType: "video",
        executionStatus: "completed",
        jobStatus: "completed",
      },
      {
        jobId: "job_image_not_video",
        mediaType: "image",
        executionStatus: "skipped",
        jobStatus: "ready",
      },
    ],
  );
  assert.equal(firstVideoJob.status, "ready");
  assert.equal(secondVideoJob.resultMetadata, undefined);
});

test("concurrent video generation reports running progress completion and failures", async () => {
  const completedVideoJob = createCampaignAssetGenerationJob({
    id: "job_video_progress_completed",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:video_a.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_video_progress_completed", field: "uri" }],
    status: "ready",
  });
  const failedVideoJob = createCampaignAssetGenerationJob({
    id: "job_video_progress_failed",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:video_b.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_video_progress_failed", field: "uri" }],
    status: "queued",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_video_progress",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [completedVideoJob, failedVideoJob],
    },
  };

  const result = await executeCampaignVideoAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaign),
    async (job, context) => {
      context.reportProgress(35);
      await new Promise((resolve) => setTimeout(resolve, 5));

      if (job.id === "job_video_progress_failed") {
        context.reportProgress(60);
        throw new Error("Video render timed out");
      }

      context.reportProgress(82);
      return [
        {
          id: "result_video_progress_completed",
          assetId: job.outputTargets[0].assetId,
          uri: "https://cdn.example.test/progress/completed.mp4",
          mimeType: "video/mp4",
          width: 1080,
          height: 1920,
          durationSeconds: 8,
          frameRate: 30,
          codec: "h264",
          sizeBytes: 8192,
          model: "video-fast",
          seed: null,
          promptHash: "hash_video_progress_completed",
          providerRequestId: "request_video_progress_completed",
          generatedAt: "2026-05-11T03:10:10.000Z",
          durationMs: 20,
          costUsd: 0.08,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T03:10:00.000Z",
    },
  );

  assert.deepEqual(
    result.progressUpdates.map((status) => ({
      jobId: status.jobId,
      executionStatus: status.executionStatus,
      progress: status.progress,
      error: status.error,
    })),
    [
      {
        jobId: "job_video_progress_completed",
        executionStatus: "running",
        progress: 0,
        error: null,
      },
      {
        jobId: "job_video_progress_completed",
        executionStatus: "running",
        progress: 35,
        error: null,
      },
      {
        jobId: "job_video_progress_failed",
        executionStatus: "running",
        progress: 0,
        error: null,
      },
      {
        jobId: "job_video_progress_failed",
        executionStatus: "running",
        progress: 35,
        error: null,
      },
      {
        jobId: "job_video_progress_completed",
        executionStatus: "running",
        progress: 82,
        error: null,
      },
      {
        jobId: "job_video_progress_completed",
        executionStatus: "completed",
        progress: 100,
        error: null,
      },
      {
        jobId: "job_video_progress_failed",
        executionStatus: "running",
        progress: 60,
        error: null,
      },
      {
        jobId: "job_video_progress_failed",
        executionStatus: "failed",
        progress: 60,
        error: "Video render timed out",
      },
    ],
  );
  assert.deepEqual(
    result.jobStatuses.map((status) => ({
      jobId: status.jobId,
      executionStatus: status.executionStatus,
      progress: status.progress,
      error: status.error,
    })),
    [
      {
        jobId: "job_video_progress_completed",
        executionStatus: "completed",
        progress: 100,
        error: null,
      },
      {
        jobId: "job_video_progress_failed",
        executionStatus: "failed",
        progress: 60,
        error: "Video render timed out",
      },
    ],
  );
});

test("parallel asset generation exposes failure details per job without blocking siblings", async () => {
  const completedImageJob = createCampaignAssetGenerationJob({
    id: "job_failure_details_image",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:image.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_failure_details_image", field: "uri" }],
    status: "ready",
  });
  const failedVideoJob = createCampaignAssetGenerationJob({
    id: "job_failure_details_video",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:video.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_failure_details_video", field: "uri" }],
    status: "ready",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_failure_details",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [completedImageJob, failedVideoJob],
    },
  };
  let maxInFlight = 0;
  let inFlight = 0;

  const result = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaign),
    async (job, context) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      context.reportProgress(25);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;

      if (job.id === "job_failure_details_video") {
        const error = new Error("Provider rejected unsafe frame");
        error.name = "ProviderSafetyError";
        throw error;
      }

      return [
        {
          id: "result_failure_details_image",
          assetId: job.outputTargets[0].assetId,
          uri: "https://cdn.example.test/failure-details/image.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sizeBytes: 4096,
          model: "image-fast",
          seed: null,
          promptHash: "hash_failure_details_image",
          providerRequestId: "request_failure_details_image",
          generatedAt: "2026-05-11T03:30:05.000Z",
          durationMs: 25,
          costUsd: 0.02,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T03:30:00.000Z",
    },
  );

  assert.equal(maxInFlight, 2);
  assert.deepEqual(
    result.jobStatuses.map((status) => ({
      jobId: status.jobId,
      executionStatus: status.executionStatus,
      error: status.error,
      failureName: status.failureDetails?.name ?? null,
      failureMessage: status.failureDetails?.message ?? null,
    })),
    [
      {
        jobId: "job_failure_details_image",
        executionStatus: "completed",
        error: null,
        failureName: null,
        failureMessage: null,
      },
      {
        jobId: "job_failure_details_video",
        executionStatus: "failed",
        error: "Provider rejected unsafe frame",
        failureName: "ProviderSafetyError",
        failureMessage: "Provider rejected unsafe frame",
      },
    ],
  );
  assert.deepEqual(
    result.executionRecords.map((record) => ({
      jobId: record.jobId,
      status: record.status,
      error: record.error,
      failureName: record.failureDetails?.name ?? null,
    })),
    [
      {
        jobId: "job_failure_details_image",
        status: "completed",
        error: null,
        failureName: null,
      },
      {
        jobId: "job_failure_details_video",
        status: "failed",
        error: "Provider rejected unsafe frame",
        failureName: "ProviderSafetyError",
      },
    ],
  );
});

test("asset generation retries transient provider failures without surfacing intermediate failed status", async () => {
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_retry_transient_image",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:image.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_retry_transient_image", field: "uri" }],
    status: "ready",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_retry_transient",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [imageJob],
    },
  };
  const attempts: number[] = [];

  const result = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaign),
    async (job, context) => {
      attempts.push(job.lifecycle?.attempt ?? 0);
      context.reportProgress(job.lifecycle?.attempt === 1 ? 34 : 72);

      if (job.lifecycle?.attempt === 1) {
        throw new Error("Provider returned 503");
      }

      return [
        {
          id: "result_retry_transient_image",
          assetId: "asset_retry_transient_image",
          uri: "https://cdn.example.test/retry/image.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sizeBytes: 4096,
          model: "image-fast",
          seed: null,
          promptHash: "hash_retry_transient_image",
          providerRequestId: "request_retry_transient_image",
          generatedAt: "2026-05-11T03:35:05.000Z",
          durationMs: 25,
          costUsd: 0.02,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxAttempts: 2,
      now: () => "2026-05-11T03:35:00.000Z",
    },
  );

  assert.deepEqual(attempts, [1, 2]);
  assert.deepEqual(result.failedJobs, []);
  assert.deepEqual(
    result.jobStatuses.map((status) => ({
      jobId: status.jobId,
      executionStatus: status.executionStatus,
      attempt: status.attempt,
      progress: status.progress,
      error: status.error,
    })),
    [
      {
        jobId: "job_retry_transient_image",
        executionStatus: "completed",
        attempt: 2,
        progress: 100,
        error: null,
      },
    ],
  );
  assert.deepEqual(
    result.progressUpdates.map((status) => ({
      executionStatus: status.executionStatus,
      attempt: status.attempt,
      progress: status.progress,
      error: status.error,
    })),
    [
      { executionStatus: "running", attempt: 1, progress: 0, error: null },
      { executionStatus: "running", attempt: 1, progress: 34, error: null },
      { executionStatus: "running", attempt: 2, progress: 34, error: null },
      { executionStatus: "running", attempt: 2, progress: 72, error: null },
      { executionStatus: "completed", attempt: 2, progress: 100, error: null },
    ],
  );
  assert.deepEqual(
    result.executionRecords.map((record) => ({
      jobId: record.jobId,
      status: record.status,
      attempt: record.attempt,
      error: record.error,
      statusEvents: record.statusEvents.map((event) => ({
        status: event.status,
        progress: event.progress,
        error: event.error,
      })),
    })),
    [
      {
        jobId: "job_retry_transient_image",
        status: "completed",
        attempt: 2,
        error: null,
        statusEvents: [
          { status: "running", progress: 0, error: null },
          { status: "running", progress: 34, error: null },
          { status: "running", progress: 34, error: null },
          { status: "running", progress: 72, error: null },
          { status: "completed", progress: 100, error: null },
        ],
      },
    ],
  );
});

test("parallel asset generation persists an independent execution record for each job", async () => {
  const storage = new MemoryStorage();
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_execution_record_image",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:image.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_execution_record_image", field: "uri" }],
    status: "ready",
  });
  const failedVideoJob = createCampaignAssetGenerationJob({
    id: "job_execution_record_video",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:video.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_execution_record_video", field: "uri" }],
    status: "queued",
  });
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_parallel_execution_records",
    now: () => "2026-05-11T03:20:00.000Z",
  });
  const campaignWithWorkflow = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        assetGenerationJobs: [imageJob, failedVideoJob],
      },
    },
    {
      now: () => "2026-05-11T03:20:01.000Z",
    },
  );

  const executionResult = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaignWithWorkflow),
    async (job, context) => {
      context.reportProgress(40);

      if (job.id === "job_execution_record_video") {
        throw new Error("Video provider queue expired");
      }

      return [
        {
          id: "result_execution_record_image",
          assetId: job.outputTargets[0].assetId,
          uri: "https://cdn.example.test/execution-records/image.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sizeBytes: 4096,
          model: "image-fast",
          seed: null,
          promptHash: "hash_execution_record_image",
          providerRequestId: "request_execution_record_image",
          generatedAt: "2026-05-11T03:20:05.000Z",
          durationMs: 25,
          costUsd: 0.02,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T03:20:02.000Z",
    },
  );

  assert.deepEqual(
    executionResult.executionRecords.map((record) => ({
      id: record.id,
      campaignId: record.campaignId,
      jobId: record.jobId,
      mediaType: record.mediaType,
      status: record.status,
      actor: record.actor,
      attempt: record.attempt,
      progress: record.progress,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      failedAt: record.failedAt,
      error: record.error,
      resultIds: record.resultIds,
      assetIds: record.assetIds,
      providerRequestIds: record.providerRequestIds,
    })),
    [
      {
        id: "exec_campaign_parallel_execution_records_job_execution_record_image_1",
        campaignId: "campaign_parallel_execution_records",
        jobId: "job_execution_record_image",
        mediaType: "image",
        status: "completed",
        actor: "agent",
        attempt: 1,
        progress: 100,
        startedAt: "2026-05-11T03:20:02.000Z",
        completedAt: "2026-05-11T03:20:02.000Z",
        failedAt: null,
        error: null,
        resultIds: ["result_execution_record_image"],
        assetIds: ["asset_execution_record_image"],
        providerRequestIds: ["request_execution_record_image"],
      },
      {
        id: "exec_campaign_parallel_execution_records_job_execution_record_video_1",
        campaignId: "campaign_parallel_execution_records",
        jobId: "job_execution_record_video",
        mediaType: "video",
        status: "failed",
        actor: "agent",
        attempt: 1,
        progress: 40,
        startedAt: "2026-05-11T03:20:02.000Z",
        completedAt: null,
        failedAt: "2026-05-11T03:20:02.000Z",
        error: "Video provider queue expired",
        resultIds: [],
        assetIds: [],
        providerRequestIds: [],
      },
    ],
  );
  assert.deepEqual(
    executionResult.executionRecords.map((record) => ({
      jobId: record.jobId,
      statusEvents: record.statusEvents.map((event) => ({
        status: event.status,
        progress: event.progress,
        observedAt: event.observedAt,
        error: event.error,
      })),
    })),
    [
      {
        jobId: "job_execution_record_image",
        statusEvents: [
          {
            status: "running",
            progress: 0,
            observedAt: "2026-05-11T03:20:02.000Z",
            error: null,
          },
          {
            status: "running",
            progress: 40,
            observedAt: "2026-05-11T03:20:02.000Z",
            error: null,
          },
          {
            status: "completed",
            progress: 100,
            observedAt: "2026-05-11T03:20:02.000Z",
            error: null,
          },
        ],
      },
      {
        jobId: "job_execution_record_video",
        statusEvents: [
          {
            status: "running",
            progress: 0,
            observedAt: "2026-05-11T03:20:02.000Z",
            error: null,
          },
          {
            status: "running",
            progress: 40,
            observedAt: "2026-05-11T03:20:02.000Z",
            error: null,
          },
          {
            status: "failed",
            progress: 40,
            observedAt: "2026-05-11T03:20:02.000Z",
            error: "Video provider queue expired",
          },
        ],
      },
    ],
  );

  const persistedCampaign = saveCampaignAssetGenerationExecutionResult(
    storage,
    "campaign_parallel_execution_records",
    executionResult,
    {
      now: () => "2026-05-11T03:20:10.000Z",
    },
  );

  assert.deepEqual(
    persistedCampaign.campaignSpec.assetGenerationExecutions?.map(
      (record) => ({
        id: record.id,
        jobId: record.jobId,
        status: record.status,
        statusEvents: record.statusEvents.map((event) => ({
          status: event.status,
          progress: event.progress,
          error: event.error,
        })),
        resultIds: record.resultIds,
        assetIds: record.assetIds,
        error: record.error,
      }),
    ),
    [
      {
        id: "exec_campaign_parallel_execution_records_job_execution_record_image_1",
        jobId: "job_execution_record_image",
        status: "completed",
        statusEvents: [
          { status: "running", progress: 0, error: null },
          { status: "running", progress: 40, error: null },
          { status: "completed", progress: 100, error: null },
        ],
        resultIds: ["result_execution_record_image"],
        assetIds: ["asset_execution_record_image"],
        error: null,
      },
      {
        id: "exec_campaign_parallel_execution_records_job_execution_record_video_1",
        jobId: "job_execution_record_video",
        status: "failed",
        statusEvents: [
          { status: "running", progress: 0, error: null },
          { status: "running", progress: 40, error: null },
          { status: "failed", progress: 40, error: "Video provider queue expired" },
        ],
        resultIds: [],
        assetIds: [],
        error: "Video provider queue expired",
      },
    ],
  );
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_parallel_execution_records")
      ?.campaignSpec.assetGenerationExecutions,
    persistedCampaign.campaignSpec.assetGenerationExecutions,
  );
  assert.equal(imageJob.status, "ready");
  assert.equal(imageJob.resultMetadata, undefined);
});

test("parallel asset generation stores completion outputs on each job execution record", async () => {
  const storage = new MemoryStorage();
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_completion_output_image",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:image.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_completion_output_image", field: "uri" }],
    status: "ready",
  });
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_completion_output_video",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:video.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_completion_output_video", field: "uri" }],
    status: "queued",
  });
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_completion_outputs",
    now: () => "2026-05-11T03:40:00.000Z",
  });
  const campaignWithWorkflow = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        assetGenerationJobs: [imageJob, videoJob],
      },
    },
    {
      now: () => "2026-05-11T03:40:01.000Z",
    },
  );

  const executionResult = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaignWithWorkflow),
    async (job) => [
      {
        id:
          job.mediaType === "image"
            ? "result_completion_output_image"
            : "result_completion_output_video",
        assetId: job.outputTargets[0].assetId,
        uri:
          job.mediaType === "image"
            ? "https://cdn.example.test/completion/image.png"
            : "https://cdn.example.test/completion/video.mp4",
        mimeType: job.mediaType === "image" ? "image/png" : "video/mp4",
        width: job.mediaType === "image" ? 1024 : 1080,
        height: job.mediaType === "image" ? 1024 : 1920,
        ...(job.mediaType === "video"
          ? {
              durationSeconds: 8,
              frameRate: 30,
              codec: "h264",
              thumbnailUri:
                "https://cdn.example.test/completion/video-thumb.jpg",
            }
          : {}),
        sizeBytes: job.mediaType === "image" ? 4096 : 8096,
        model: job.mediaType === "image" ? "image-fast" : "video-fast",
        seed: job.mediaType === "image" ? 101 : 202,
        promptHash:
          job.mediaType === "image"
            ? "hash_completion_output_image"
            : "hash_completion_output_video",
        providerRequestId:
          job.mediaType === "image"
            ? "request_completion_output_image"
            : "request_completion_output_video",
        storageReferences: [
          {
            provider: "s3",
            bucket: "owncanvas-assets",
            objectKey:
              job.mediaType === "image"
                ? "campaigns/completion/image.png"
                : "campaigns/completion/video.mp4",
            publicUri:
              job.mediaType === "image"
                ? "https://storage.example.test/completion/image.png"
                : "https://storage.example.test/completion/video.mp4",
            contentHash:
              job.mediaType === "image"
                ? "sha256:image-output"
                : "sha256:video-output",
          },
        ],
        generatedAt: "2026-05-11T03:40:05.000Z",
        durationMs: job.mediaType === "image" ? 25 : 250,
        costUsd: job.mediaType === "image" ? 0.02 : 0.2,
        finishReason: "completed",
      },
    ],
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T03:40:02.000Z",
    },
  );

  assert.deepEqual(
    executionResult.executionRecords.map((record) => ({
      jobId: record.jobId,
      outputs: record.outputs.map((output) => ({
        id: output.id,
        assetId: output.assetId,
        uri: output.uri,
        mimeType: output.mimeType,
        width: output.width,
        height: output.height,
        durationSeconds: output.durationSeconds,
        thumbnailUri: output.thumbnailUri,
        providerRequestId: output.providerRequestId,
        storageReferences: output.storageReferences,
      })),
    })),
    [
      {
        jobId: "job_completion_output_image",
        outputs: [
          {
            id: "result_completion_output_image",
            assetId: "asset_completion_output_image",
            uri: "https://cdn.example.test/completion/image.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            durationSeconds: undefined,
            thumbnailUri: undefined,
            providerRequestId: "request_completion_output_image",
            storageReferences: [
              {
                provider: "s3",
                bucket: "owncanvas-assets",
                objectKey: "campaigns/completion/image.png",
                publicUri: "https://storage.example.test/completion/image.png",
                contentHash: "sha256:image-output",
              },
            ],
          },
        ],
      },
      {
        jobId: "job_completion_output_video",
        outputs: [
          {
            id: "result_completion_output_video",
            assetId: "asset_completion_output_video",
            uri: "https://cdn.example.test/completion/video.mp4",
            mimeType: "video/mp4",
            width: 1080,
            height: 1920,
            durationSeconds: 8,
            thumbnailUri: "https://cdn.example.test/completion/video-thumb.jpg",
            providerRequestId: "request_completion_output_video",
            storageReferences: [
              {
                provider: "s3",
                bucket: "owncanvas-assets",
                objectKey: "campaigns/completion/video.mp4",
                publicUri: "https://storage.example.test/completion/video.mp4",
                contentHash: "sha256:video-output",
              },
            ],
          },
        ],
      },
    ],
  );

  const persistedCampaign = saveCampaignAssetGenerationExecutionResult(
    storage,
    "campaign_completion_outputs",
    executionResult,
    {
      now: () => "2026-05-11T03:40:10.000Z",
    },
  );

  assert.deepEqual(
    persistedCampaign.campaignSpec.assetGenerationExecutions?.map(
      (record) => ({
        jobId: record.jobId,
        outputs: record.outputs.map((output) => ({
          id: output.id,
          assetId: output.assetId,
          uri: output.uri,
          providerRequestId: output.providerRequestId,
        })),
      }),
    ),
    [
      {
        jobId: "job_completion_output_image",
        outputs: [
          {
            id: "result_completion_output_image",
            assetId: "asset_completion_output_image",
            uri: "https://cdn.example.test/completion/image.png",
            providerRequestId: "request_completion_output_image",
          },
        ],
      },
      {
        jobId: "job_completion_output_video",
        outputs: [
          {
            id: "result_completion_output_video",
            assetId: "asset_completion_output_video",
            uri: "https://cdn.example.test/completion/video.mp4",
            providerRequestId: "request_completion_output_video",
          },
        ],
      },
    ],
  );
});

test("persisted parallel generation updates workflow nodes with generated asset references and completion status", async () => {
  const storage = new MemoryStorage();
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_workflow_state_image",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:campaign_media_block.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_workflow_state_image", field: "uri" }],
    status: "ready",
  });
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_workflow_state_video",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:campaign_media_block.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_workflow_state_video", field: "uri" }],
    status: "queued",
  });
  const mediaBlock = {
    ...createCampaignBlock("image", 0),
    id: "campaign_media_block",
    properties: {
      assetGenerationJobIds: [imageJob.id, videoJob.id],
    },
  };
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_workflow_state_asset_refs",
    now: () => "2026-05-11T03:40:00.000Z",
  });
  const campaignWithWorkflow = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      canvasState: {
        nodes: [mediaBlock],
        edges: [],
      },
      campaignSpec: {
        nodes: [mediaBlock],
        edges: [],
        assetGenerationJobs: [imageJob, videoJob],
      },
    },
    {
      now: () => "2026-05-11T03:40:01.000Z",
    },
  );
  const executionResult = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaignWithWorkflow),
    async (job) => [
      {
        id: `result_${job.id}`,
        assetId: job.outputTargets[0].assetId,
        uri:
          job.mediaType === "image"
            ? "https://cdn.example.test/workflow-state/image.png"
            : "https://cdn.example.test/workflow-state/video.mp4",
        mimeType: job.mediaType === "image" ? "image/png" : "video/mp4",
        width: job.mediaType === "image" ? 1200 : 1080,
        height: job.mediaType === "image" ? 1200 : 1920,
        sizeBytes: job.mediaType === "image" ? 4096 : 8192,
        model: `${job.mediaType}-fast`,
        seed: null,
        promptHash: `hash_${job.id}`,
        providerRequestId: `request_${job.id}`,
        generatedAt: "2026-05-11T03:40:05.000Z",
        durationMs: 30,
        costUsd: job.mediaType === "image" ? 0.02 : 0.08,
        finishReason: "completed",
      },
    ],
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T03:40:02.000Z",
    },
  );

  const persistedCampaign = saveCampaignAssetGenerationExecutionResult(
    storage,
    "campaign_workflow_state_asset_refs",
    executionResult,
    {
      now: () => "2026-05-11T03:40:10.000Z",
    },
  );

  const expectedWorkflowState = {
    completed: 2,
    failed: 0,
    jobIds: ["job_workflow_state_image", "job_workflow_state_video"],
    status: "completed",
    assetIds: ["asset_workflow_state_image", "asset_workflow_state_video"],
    resultIds: [
      "result_job_workflow_state_image",
      "result_job_workflow_state_video",
    ],
    outputLocations: [
      {
        assetId: "asset_workflow_state_image",
        primaryUri: "https://cdn.example.test/workflow-state/image.png",
      },
      {
        assetId: "asset_workflow_state_video",
        primaryUri: "https://cdn.example.test/workflow-state/video.mp4",
      },
    ],
  };
  assert.deepEqual(
    persistedCampaign.canvasState.nodes[0].properties?.assetGeneration,
    expectedWorkflowState,
  );
  assert.deepEqual(
    persistedCampaign.campaignSpec.nodes[0].properties?.assetGeneration,
    expectedWorkflowState,
  );
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_workflow_state_asset_refs")
      ?.campaignSpec.nodes[0].properties?.assetGeneration,
    expectedWorkflowState,
  );
});

test("completed image generation persists asset metadata and output references to the campaign workflow", async () => {
  const storage = new MemoryStorage();
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_persist_image_variant",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:hook.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_generated_image_persisted", field: "uri" }],
    status: "ready",
  });
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_persist_generated_images",
    now: () => "2026-05-11T01:10:00.000Z",
  });
  const campaignWithWorkflow = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        assetGenerationJobs: [imageJob],
      },
    },
    {
      now: () => "2026-05-11T01:11:00.000Z",
    },
  );
  const executionResult = await executeCampaignImageAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaignWithWorkflow),
    async (job) => [
      {
        id: "result_persisted_image",
        assetId: job.outputTargets[0].assetId,
        uri: "https://cdn.example.test/generated/persisted-image.png",
        mimeType: "image/png",
        width: 1200,
        height: 1200,
        sizeBytes: 4096,
        model: "image-fast",
        seed: 42,
        promptHash: "sha256:persisted-image",
        providerRequestId: "request_persisted_image",
        generatedAt: "2026-05-11T01:12:00.000Z",
        durationMs: 20,
        costUsd: 0.02,
        finishReason: "completed",
      },
    ],
    {
      actor: "agent",
      now: () => "2026-05-11T01:12:01.000Z",
    },
  );

  const appliedCampaign = applyCampaignImageAssetGenerationExecutionResult(
    campaignWithWorkflow,
    executionResult,
    {
      now: () => "2026-05-11T01:12:02.000Z",
      rightsOwner: "OwnCanvas Studio",
      rightsLicense: "campaign-generated",
    },
  );
  assert.equal(
    appliedCampaign.campaignSpec.assetGenerationJobs[0].status,
    "completed",
  );
  assert.deepEqual(
    appliedCampaign.campaignSpec.assetGenerationJobs[0].resultMetadata?.map(
      (result) => ({
        assetId: result.assetId,
        uri: result.uri,
        providerRequestId: result.providerRequestId,
      }),
    ),
    [
      {
        assetId: "asset_generated_image_persisted",
        uri: "https://cdn.example.test/generated/persisted-image.png",
        providerRequestId: "request_persisted_image",
      },
    ],
  );
  assert.deepEqual(appliedCampaign.assets, [
    {
      id: "asset_generated_image_persisted",
      source: "link",
      mediaType: "image",
      title: "Generated image asset_generated_image_persisted",
      uri: "https://cdn.example.test/generated/persisted-image.png",
      usage: "generated",
      status: "ready",
      altText: "Generated image output from job_persist_image_variant",
      fileName: "persisted-image.png",
      mimeType: "image/png",
      sizeBytes: 4096,
      rights: {
        owner: "OwnCanvas Studio",
        license: "campaign-generated",
      },
      createdBy: "agent",
      createdAt: "2026-05-11T01:12:00.000Z",
      outputLocations: {
        primaryUri: "https://cdn.example.test/generated/persisted-image.png",
      },
      generatedMetadata: {
        jobId: "job_persist_image_variant",
        resultId: "result_persisted_image",
        assetId: "asset_generated_image_persisted",
        mediaType: "image",
        providerPluginId: "plugin.runtime.media",
        capabilityId: "cap.runtime.image",
        providerRequestId: "request_persisted_image",
        outputUri: "https://cdn.example.test/generated/persisted-image.png",
        mimeType: "image/png",
        fileName: "persisted-image.png",
        sizeBytes: 4096,
        model: "image-fast",
        promptHash: "sha256:persisted-image",
        seed: 42,
        generatedAt: "2026-05-11T01:12:00.000Z",
        durationMs: 20,
        costUsd: 0.02,
        finishReason: "completed",
        dimensions: {
          width: 1200,
          height: 1200,
        },
        inputSources: ["node:hook.outputs.prompt"],
        outputTargets: [{ assetId: "asset_generated_image_persisted", field: "uri" }],
      },
    },
  ]);

  const persistedCampaign = saveCampaignImageAssetGenerationExecutionResult(
    storage,
    "campaign_persist_generated_images",
    executionResult,
    {
      now: () => "2026-05-11T01:12:03.000Z",
      rightsOwner: "OwnCanvas Studio",
      rightsLicense: "campaign-generated",
    },
  );

  assert.equal(persistedCampaign.updatedAt, "2026-05-11T01:12:03.000Z");
  assert.equal(
    persistedCampaign.campaignSpec.assetGenerationJobs[0].resultMetadata?.[0]
      .uri,
    "https://cdn.example.test/generated/persisted-image.png",
  );
  assert.equal(
    persistedCampaign.assets[0].uri,
    "https://cdn.example.test/generated/persisted-image.png",
  );
  assert.ok(
    persistedCampaign.logs.includes(
      "2026-05-11T01:12:03.000Z asset_generation.image_assets.persisted:asset_generated_image_persisted",
    ),
  );
  assert.equal(
    getPersistedCampaignRecord(storage, "campaign_persist_generated_images")
      ?.campaignSpec.assetGenerationJobs[0].resultMetadata?.[0].assetId,
    "asset_generated_image_persisted",
  );
});

test("completed video generation persists asset metadata and output references to the campaign workflow", async () => {
  const storage = new MemoryStorage();
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_persist_video_variant",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:hook.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_generated_video_persisted", field: "uri" }],
    status: "ready",
  });
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_persist_generated_videos",
    now: () => "2026-05-11T02:10:00.000Z",
  });
  const campaignWithWorkflow = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        assetGenerationJobs: [videoJob],
      },
    },
    {
      now: () => "2026-05-11T02:11:00.000Z",
    },
  );
  const executionResult = await executeCampaignVideoAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaignWithWorkflow),
    async (job) => [
      {
        id: "result_persisted_video",
        assetId: job.outputTargets[0].assetId,
        uri: "https://cdn.example.test/generated/persisted-video.mp4",
        mimeType: "video/mp4",
        width: 1080,
        height: 1920,
        durationSeconds: 8,
        frameRate: 30,
        codec: "h264",
        thumbnailUri: "https://cdn.example.test/generated/persisted-video.jpg",
        sizeBytes: 8192,
        model: "video-fast",
        seed: 42,
        promptHash: "sha256:persisted-video",
        providerRequestId: "request_persisted_video",
        storageReferences: [
          {
            provider: "s3",
            bucket: "owncanvas-generated-assets",
            objectKey:
              "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.mp4",
            publicUri: "https://cdn.example.test/generated/persisted-video.mp4",
            contentHash: "sha256:video-storage-reference",
          },
          {
            provider: "s3",
            bucket: "owncanvas-generated-assets",
            objectKey:
              "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.jpg",
            publicUri: "https://cdn.example.test/generated/persisted-video.jpg",
            contentHash: "sha256:video-thumbnail-storage-reference",
          },
        ],
        generatedAt: "2026-05-11T02:12:00.000Z",
        durationMs: 200,
        costUsd: 0.08,
        finishReason: "completed",
      },
    ],
    {
      actor: "agent",
      now: () => "2026-05-11T02:12:01.000Z",
    },
  );

  const appliedCampaign = applyCampaignVideoAssetGenerationExecutionResult(
    campaignWithWorkflow,
    executionResult,
    {
      now: () => "2026-05-11T02:12:02.000Z",
      rightsOwner: "OwnCanvas Studio",
      rightsLicense: "campaign-generated",
    },
  );
  assert.equal(
    appliedCampaign.campaignSpec.assetGenerationJobs[0].status,
    "completed",
  );
  assert.deepEqual(
    appliedCampaign.campaignSpec.assetGenerationJobs[0].resultMetadata?.map(
      (result) => ({
        assetId: result.assetId,
        uri: result.uri,
        providerRequestId: result.providerRequestId,
        durationSeconds: result.durationSeconds,
        frameRate: result.frameRate,
        codec: result.codec,
        storageReferences: result.storageReferences,
      }),
    ),
    [
      {
        assetId: "asset_generated_video_persisted",
        uri: "https://cdn.example.test/generated/persisted-video.mp4",
        providerRequestId: "request_persisted_video",
        durationSeconds: 8,
        frameRate: 30,
        codec: "h264",
        storageReferences: [
          {
            provider: "s3",
            bucket: "owncanvas-generated-assets",
            objectKey:
              "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.mp4",
            publicUri: "https://cdn.example.test/generated/persisted-video.mp4",
            contentHash: "sha256:video-storage-reference",
          },
          {
            provider: "s3",
            bucket: "owncanvas-generated-assets",
            objectKey:
              "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.jpg",
            publicUri: "https://cdn.example.test/generated/persisted-video.jpg",
            contentHash: "sha256:video-thumbnail-storage-reference",
          },
        ],
      },
    ],
  );
  assert.deepEqual(appliedCampaign.assets, [
    {
      id: "asset_generated_video_persisted",
      source: "link",
      mediaType: "video",
      title: "Generated video asset_generated_video_persisted",
      uri: "https://cdn.example.test/generated/persisted-video.mp4",
      usage: "generated",
      status: "ready",
      altText: "Generated video output from job_persist_video_variant",
      fileName: "persisted-video.mp4",
      mimeType: "video/mp4",
      sizeBytes: 8192,
      rights: {
        owner: "OwnCanvas Studio",
        license: "campaign-generated",
      },
      createdBy: "agent",
      createdAt: "2026-05-11T02:12:00.000Z",
      outputLocations: {
        primaryUri: "https://cdn.example.test/generated/persisted-video.mp4",
        thumbnailUri: "https://cdn.example.test/generated/persisted-video.jpg",
      },
      generatedMetadata: {
        jobId: "job_persist_video_variant",
        resultId: "result_persisted_video",
        assetId: "asset_generated_video_persisted",
        mediaType: "video",
        providerPluginId: "plugin.runtime.media",
        capabilityId: "cap.runtime.video",
        providerRequestId: "request_persisted_video",
        storageReferences: [
          {
            provider: "s3",
            bucket: "owncanvas-generated-assets",
            objectKey:
              "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.mp4",
            publicUri: "https://cdn.example.test/generated/persisted-video.mp4",
            contentHash: "sha256:video-storage-reference",
          },
          {
            provider: "s3",
            bucket: "owncanvas-generated-assets",
            objectKey:
              "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.jpg",
            publicUri: "https://cdn.example.test/generated/persisted-video.jpg",
            contentHash: "sha256:video-thumbnail-storage-reference",
          },
        ],
        outputUri: "https://cdn.example.test/generated/persisted-video.mp4",
        thumbnailUri: "https://cdn.example.test/generated/persisted-video.jpg",
        mimeType: "video/mp4",
        fileName: "persisted-video.mp4",
        sizeBytes: 8192,
        model: "video-fast",
        promptHash: "sha256:persisted-video",
        seed: 42,
        generatedAt: "2026-05-11T02:12:00.000Z",
        durationMs: 200,
        costUsd: 0.08,
        finishReason: "completed",
        dimensions: {
          width: 1080,
          height: 1920,
        },
        durationSeconds: 8,
        frameRate: 30,
        codec: "h264",
        inputSources: ["node:hook.outputs.storyboard"],
        outputTargets: [{ assetId: "asset_generated_video_persisted", field: "uri" }],
      },
      storageReferences: [
        {
          provider: "s3",
          bucket: "owncanvas-generated-assets",
          objectKey:
            "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.mp4",
          publicUri: "https://cdn.example.test/generated/persisted-video.mp4",
          contentHash: "sha256:video-storage-reference",
        },
        {
          provider: "s3",
          bucket: "owncanvas-generated-assets",
          objectKey:
            "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.jpg",
          publicUri: "https://cdn.example.test/generated/persisted-video.jpg",
          contentHash: "sha256:video-thumbnail-storage-reference",
        },
      ],
    },
  ]);

  const persistedCampaign = saveCampaignVideoAssetGenerationExecutionResult(
    storage,
    "campaign_persist_generated_videos",
    executionResult,
    {
      now: () => "2026-05-11T02:12:03.000Z",
      rightsOwner: "OwnCanvas Studio",
      rightsLicense: "campaign-generated",
    },
  );

  assert.equal(persistedCampaign.updatedAt, "2026-05-11T02:12:03.000Z");
  assert.equal(
    persistedCampaign.campaignSpec.assetGenerationJobs[0].resultMetadata?.[0]
      .uri,
    "https://cdn.example.test/generated/persisted-video.mp4",
  );
  assert.equal(
    persistedCampaign.assets[0].mediaType,
    "video",
  );
  assert.deepEqual(persistedCampaign.assets[0].outputLocations, {
    primaryUri: "https://cdn.example.test/generated/persisted-video.mp4",
    thumbnailUri: "https://cdn.example.test/generated/persisted-video.jpg",
  });
  assert.equal(
    persistedCampaign.assets[0].generatedMetadata?.providerRequestId,
    "request_persisted_video",
  );
  assert.deepEqual(persistedCampaign.assets[0].storageReferences, [
    {
      provider: "s3",
      bucket: "owncanvas-generated-assets",
      objectKey:
        "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.mp4",
      publicUri: "https://cdn.example.test/generated/persisted-video.mp4",
      contentHash: "sha256:video-storage-reference",
    },
    {
      provider: "s3",
      bucket: "owncanvas-generated-assets",
      objectKey:
        "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.jpg",
      publicUri: "https://cdn.example.test/generated/persisted-video.jpg",
      contentHash: "sha256:video-thumbnail-storage-reference",
    },
  ]);
  assert.ok(
    persistedCampaign.logs.includes(
      "2026-05-11T02:12:03.000Z asset_generation.video_assets.persisted:asset_generated_video_persisted",
    ),
  );
  assert.equal(
    getPersistedCampaignRecord(storage, "campaign_persist_generated_videos")
      ?.campaignSpec.assetGenerationJobs[0].resultMetadata?.[0].assetId,
    "asset_generated_video_persisted",
  );
  assert.equal(
    getPersistedCampaignRecord(storage, "campaign_persist_generated_videos")
      ?.assets[0].storageReferences?.[0].objectKey,
    "campaign_persist_generated_videos/job_persist_video_variant/persisted-video.mp4",
  );
});

test("campaign image generation workflow executes parallel image jobs and persists generated assets", async () => {
  const firstImageJob = createCampaignAssetGenerationJob({
    id: "job_workflow_image_1",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_workflow_image_1", field: "uri" }],
    status: "ready",
  });
  const secondImageJob = createCampaignAssetGenerationJob({
    id: "job_workflow_image_2",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_2.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_workflow_image_2", field: "uri" }],
    status: "queued",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_image_workflow_execution",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [firstImageJob, secondImageJob],
    },
  };
  let inFlight = 0;
  let maxInFlight = 0;

  const result = await executeCampaignImageAssetGenerationWorkflow(
    campaign,
    async (job) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;

      return [
        {
          id: `result_${job.id}`,
          assetId: job.outputTargets[0].assetId,
          uri: `https://cdn.example.test/workflow/${job.id}.png`,
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sizeBytes: 2048,
          model: "image-fast",
          seed: null,
          promptHash: `hash_${job.id}`,
          providerRequestId: `request_${job.id}`,
          generatedAt: "2026-05-11T01:30:10.000Z",
          durationMs: 10,
          costUsd: 0.01,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T01:30:00.000Z",
      rightsOwner: "OwnCanvas Studio",
      rightsLicense: "campaign-generated",
    },
  );

  assert.equal(maxInFlight, 2);
  assert.deepEqual(
    result.executionResult.completedJobs.map((job) => job.id),
    ["job_workflow_image_1", "job_workflow_image_2"],
  );
  assert.deepEqual(
    result.campaign.campaignSpec.assetGenerationJobs.map((job) => ({
      id: job.id,
      status: job.status,
      resultAssetId: job.resultMetadata?.[0].assetId,
    })),
    [
      {
        id: "job_workflow_image_1",
        status: "completed",
        resultAssetId: "asset_workflow_image_1",
      },
      {
        id: "job_workflow_image_2",
        status: "completed",
        resultAssetId: "asset_workflow_image_2",
      },
    ],
  );
  assert.deepEqual(
    result.campaign.assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      rights: asset.rights,
      createdBy: asset.createdBy,
    })),
    [
      {
        id: "asset_workflow_image_1",
        uri: "https://cdn.example.test/workflow/job_workflow_image_1.png",
        rights: {
          owner: "OwnCanvas Studio",
          license: "campaign-generated",
        },
        createdBy: "agent",
      },
      {
        id: "asset_workflow_image_2",
        uri: "https://cdn.example.test/workflow/job_workflow_image_2.png",
        rights: {
          owner: "OwnCanvas Studio",
          license: "campaign-generated",
        },
        createdBy: "agent",
      },
    ],
  );
  assert.deepEqual(campaign.assets, []);
});

test("campaign video generation workflow executes parallel video jobs and persists generated assets", async () => {
  const firstVideoJob = createCampaignAssetGenerationJob({
    id: "job_workflow_video_1",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:text_block_1.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_workflow_video_1", field: "uri" }],
    status: "ready",
  });
  const secondVideoJob = createCampaignAssetGenerationJob({
    id: "job_workflow_video_2",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "script",
        label: "Script",
        source: "node:text_block_2.outputs.script",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_workflow_video_2", field: "uri" }],
    status: "queued",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_video_workflow_execution",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [firstVideoJob, secondVideoJob],
    },
  };
  let inFlight = 0;
  let maxInFlight = 0;

  const result = await executeCampaignVideoAssetGenerationWorkflow(
    campaign,
    async (job) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;

      return [
        {
          id: `result_${job.id}`,
          assetId: job.outputTargets[0].assetId,
          uri: `https://cdn.example.test/workflow/${job.id}.mp4`,
          mimeType: "video/mp4",
          width: 1080,
          height: 1920,
          durationSeconds: 8,
          frameRate: 30,
          codec: "h264",
          sizeBytes: 8192,
          model: "video-fast",
          seed: null,
          promptHash: `hash_${job.id}`,
          providerRequestId: `request_${job.id}`,
          generatedAt: "2026-05-11T02:30:10.000Z",
          durationMs: 10,
          costUsd: 0.08,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T02:30:00.000Z",
      rightsOwner: "OwnCanvas Studio",
      rightsLicense: "campaign-generated",
    },
  );

  assert.equal(maxInFlight, 2);
  assert.deepEqual(
    result.executionResult.completedJobs.map((job) => job.id),
    ["job_workflow_video_1", "job_workflow_video_2"],
  );
  assert.deepEqual(
    result.campaign.campaignSpec.assetGenerationJobs.map((job) => ({
      id: job.id,
      status: job.status,
      resultAssetId: job.resultMetadata?.[0].assetId,
      durationSeconds: job.resultMetadata?.[0].durationSeconds,
    })),
    [
      {
        id: "job_workflow_video_1",
        status: "completed",
        resultAssetId: "asset_workflow_video_1",
        durationSeconds: 8,
      },
      {
        id: "job_workflow_video_2",
        status: "completed",
        resultAssetId: "asset_workflow_video_2",
        durationSeconds: 8,
      },
    ],
  );
  assert.deepEqual(
    result.campaign.assets.map((asset) => ({
      id: asset.id,
      mediaType: asset.mediaType,
      uri: asset.uri,
      rights: asset.rights,
      createdBy: asset.createdBy,
    })),
    [
      {
        id: "asset_workflow_video_1",
        mediaType: "video",
        uri: "https://cdn.example.test/workflow/job_workflow_video_1.mp4",
        rights: {
          owner: "OwnCanvas Studio",
          license: "campaign-generated",
        },
        createdBy: "agent",
      },
      {
        id: "asset_workflow_video_2",
        mediaType: "video",
        uri: "https://cdn.example.test/workflow/job_workflow_video_2.mp4",
        rights: {
          owner: "OwnCanvas Studio",
          license: "campaign-generated",
        },
        createdBy: "agent",
      },
    ],
  );
  assert.deepEqual(campaign.assets, []);
});

test("concurrent image generation tracks completed failed and skipped job statuses", async () => {
  const completedImageJob = createCampaignAssetGenerationJob({
    id: "job_image_status_completed",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_image_status_completed", field: "uri" }],
    status: "ready",
  });
  const failedImageJob = createCampaignAssetGenerationJob({
    id: "job_image_status_failed",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_2.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_image_status_failed", field: "uri" }],
    status: "queued",
  });
  const skippedVideoJob = createCampaignAssetGenerationJob({
    id: "job_video_status_skipped",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:text_block_1.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_video_status_skipped", field: "uri" }],
    status: "ready",
  });
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_mixed_image_statuses",
    campaignSpec: {
      nodes: [],
      edges: [],
      assetGenerationJobs: [
        completedImageJob,
        failedImageJob,
        skippedVideoJob,
      ],
    },
  };
  const executionResult = await executeCampaignImageAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaign),
    async (job) => {
      if (job.id === "job_image_status_failed") {
        throw new Error("Provider quota exhausted");
      }

      return [
        {
          id: "result_image_status_completed",
          assetId: job.outputTargets[0].assetId,
          uri: "https://cdn.example.test/status/completed.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sizeBytes: 2048,
          model: "image-fast",
          seed: null,
          promptHash: "hash_image_status_completed",
          providerRequestId: "request_image_status_completed",
          generatedAt: "2026-05-11T01:20:10.000Z",
          durationMs: 10,
          costUsd: 0.01,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T01:20:00.000Z",
    },
  );

  assert.deepEqual(
    executionResult.jobStatuses.map((status) => ({
      jobId: status.jobId,
      mediaType: status.mediaType,
      executionStatus: status.executionStatus,
      jobStatus: status.jobStatus,
      actor: status.actor,
      attempt: status.attempt,
      progress: status.progress,
      startedAt: status.startedAt,
      completedAt: status.completedAt,
      failedAt: status.failedAt,
      error: status.error,
      failureDetails: status.failureDetails
        ? {
            name: status.failureDetails.name,
            message: status.failureDetails.message,
            jobId: status.failureDetails.jobId,
            providerPluginId: status.failureDetails.providerPluginId,
            capabilityId: status.failureDetails.capabilityId,
          }
        : null,
    })),
    [
    {
      jobId: "job_image_status_completed",
      mediaType: "image",
      executionStatus: "completed",
      jobStatus: "completed",
      actor: "agent",
      attempt: 1,
      progress: 100,
      startedAt: "2026-05-11T01:20:00.000Z",
      completedAt: "2026-05-11T01:20:00.000Z",
      failedAt: null,
      error: null,
      failureDetails: null,
    },
    {
      jobId: "job_image_status_failed",
      mediaType: "image",
      executionStatus: "failed",
      jobStatus: "failed",
      actor: "agent",
      attempt: 1,
      progress: 0,
      startedAt: "2026-05-11T01:20:00.000Z",
      completedAt: null,
      failedAt: "2026-05-11T01:20:00.000Z",
      error: "Provider quota exhausted",
      failureDetails: {
        name: "Error",
        message: "Provider quota exhausted",
        jobId: "job_image_status_failed",
        providerPluginId: "plugin.runtime.media",
        capabilityId: "cap.runtime.image",
      },
    },
    {
      jobId: "job_video_status_skipped",
      mediaType: "video",
      executionStatus: "skipped",
      jobStatus: "ready",
      actor: "system",
      attempt: 0,
      progress: 0,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      error: null,
      failureDetails: null,
    },
  ]);

  const appliedCampaign = applyCampaignImageAssetGenerationExecutionResult(
    campaign,
    executionResult,
    {
      now: () => "2026-05-11T01:20:30.000Z",
    },
  );

  assert.deepEqual(
    appliedCampaign.campaignSpec.assetGenerationJobs.map((job) => ({
      id: job.id,
      status: job.status,
      error: job.lifecycle?.error,
    })),
    [
      {
        id: "job_image_status_completed",
        status: "completed",
        error: null,
      },
      {
        id: "job_image_status_failed",
        status: "failed",
        error: "Provider quota exhausted",
      },
      {
        id: "job_video_status_skipped",
        status: "ready",
        error: null,
      },
    ],
  );
  assert.ok(
    appliedCampaign.logs.includes(
      "2026-05-11T01:20:30.000Z asset_generation.image_job_statuses:job_image_status_completed=completed,job_image_status_failed=failed,job_video_status_skipped=skipped",
    ),
  );
});

test("parallel media generation aggregation writes results errors and statuses back to campaign workflow state", async () => {
  const storage = new MemoryStorage();
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_aggregate_image",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:image_node.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_aggregate_image", field: "uri" }],
    status: "ready",
  });
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_aggregate_video",
    mediaType: "video",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.video",
    requiredInputs: [
      {
        key: "storyboard",
        label: "Storyboard",
        source: "node:video_node.outputs.storyboard",
        dataType: "json",
      },
    ],
    outputTargets: [{ assetId: "asset_aggregate_video", field: "uri" }],
    status: "queued",
  });
  const failedJob = createCampaignAssetGenerationJob({
    id: "job_aggregate_failed",
    mediaType: "image",
    providerPluginId: "plugin.runtime.media",
    capabilityId: "cap.runtime.image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:failed_node.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [{ assetId: "asset_aggregate_failed", field: "uri" }],
    status: "ready",
  });
  const imageNode = {
    ...createCampaignBlock("image", 0),
    id: "image_node",
    properties: {
      assetGenerationJobId: "job_aggregate_image",
    },
  };
  const videoNode = {
    ...createCampaignBlock("video", 1),
    id: "video_node",
    properties: {
      assetGenerationJobIds: ["job_aggregate_video"],
    },
  };
  const failedNode = {
    ...createCampaignBlock("image", 2),
    id: "failed_node",
    properties: {
      assetGenerationJobId: "job_aggregate_failed",
    },
  };
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_aggregate_parallel_media",
    now: () => "2026-05-11T04:00:00.000Z",
  });
  const campaignWithWorkflow = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        nodes: [imageNode, videoNode, failedNode],
        assetGenerationJobs: [imageJob, videoJob, failedJob],
      },
      canvasState: {
        ...campaign.canvasState,
        nodes: [imageNode, videoNode, failedNode],
      },
    },
    {
      now: () => "2026-05-11T04:01:00.000Z",
    },
  );

  const executionResult = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaignWithWorkflow),
    async (job) => {
      if (job.id === "job_aggregate_failed") {
        throw new Error("Image provider rejected prompt");
      }

      return [
        {
          id: `result_${job.id}`,
          assetId: job.outputTargets[0].assetId,
          uri: `https://cdn.example.test/aggregate/${job.id}.${job.mediaType === "video" ? "mp4" : "png"}`,
          mimeType: job.mediaType === "video" ? "video/mp4" : "image/png",
          width: job.mediaType === "video" ? 1080 : 1024,
          height: job.mediaType === "video" ? 1920 : 1024,
          durationSeconds: job.mediaType === "video" ? 8 : undefined,
          frameRate: job.mediaType === "video" ? 30 : undefined,
          codec: job.mediaType === "video" ? "h264" : undefined,
          sizeBytes: job.mediaType === "video" ? 8192 : 4096,
          model: job.mediaType === "video" ? "video-fast" : "image-fast",
          seed: null,
          promptHash: `hash_${job.id}`,
          providerRequestId: `request_${job.id}`,
          generatedAt: "2026-05-11T04:02:00.000Z",
          durationMs: 20,
          costUsd: 0.05,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 3,
      now: () => "2026-05-11T04:02:01.000Z",
    },
  );

  const appliedCampaign = applyCampaignAssetGenerationExecutionResult(
    campaignWithWorkflow,
    executionResult,
    {
      now: () => "2026-05-11T04:03:00.000Z",
      rightsOwner: "OwnCanvas Studio",
      rightsLicense: "campaign-generated",
    },
  );

  assert.deepEqual(
    appliedCampaign.campaignSpec.assetGenerationJobs.map((job) => ({
      id: job.id,
      status: job.status,
      error: job.lifecycle?.error,
      resultAssetId: job.resultMetadata?.[0]?.assetId,
    })),
    [
      {
        id: "job_aggregate_image",
        status: "completed",
        error: null,
        resultAssetId: "asset_aggregate_image",
      },
      {
        id: "job_aggregate_video",
        status: "completed",
        error: null,
        resultAssetId: "asset_aggregate_video",
      },
      {
        id: "job_aggregate_failed",
        status: "failed",
        error: "Image provider rejected prompt",
        resultAssetId: undefined,
      },
    ],
  );
  assert.deepEqual(
    appliedCampaign.assets.map((asset) => ({
      id: asset.id,
      mediaType: asset.mediaType,
      uri: asset.uri,
      createdBy: asset.createdBy,
      rights: asset.rights,
    })),
    [
      {
        id: "asset_aggregate_image",
        mediaType: "image",
        uri: "https://cdn.example.test/aggregate/job_aggregate_image.png",
        createdBy: "agent",
        rights: {
          owner: "OwnCanvas Studio",
          license: "campaign-generated",
        },
      },
      {
        id: "asset_aggregate_video",
        mediaType: "video",
        uri: "https://cdn.example.test/aggregate/job_aggregate_video.mp4",
        createdBy: "agent",
        rights: {
          owner: "OwnCanvas Studio",
          license: "campaign-generated",
        },
      },
    ],
  );
  assert.deepEqual(appliedCampaign.campaignSpec.assetGenerationWorkflowState, {
    status: "completed_with_errors",
    totalJobs: 3,
    runningJobs: 0,
    completedJobs: 2,
    failedJobs: 1,
    skippedJobs: 0,
    finishedJobs: 3,
    percentComplete: 100,
    jobIds: [
      "job_aggregate_image",
      "job_aggregate_video",
      "job_aggregate_failed",
    ],
    completedJobIds: ["job_aggregate_image", "job_aggregate_video"],
    failedJobIds: ["job_aggregate_failed"],
    skippedJobIds: [],
    assetIds: ["asset_aggregate_image", "asset_aggregate_video"],
    resultIds: ["result_job_aggregate_image", "result_job_aggregate_video"],
    providerRequestIds: [
      "request_job_aggregate_image",
      "request_job_aggregate_video",
    ],
    outputs: [
      {
        jobId: "job_aggregate_image",
        mediaType: "image",
        resultId: "result_job_aggregate_image",
        assetId: "asset_aggregate_image",
        uri: "https://cdn.example.test/aggregate/job_aggregate_image.png",
        mimeType: "image/png",
        providerRequestId: "request_job_aggregate_image",
        generatedAt: "2026-05-11T04:02:00.000Z",
      },
      {
        jobId: "job_aggregate_video",
        mediaType: "video",
        resultId: "result_job_aggregate_video",
        assetId: "asset_aggregate_video",
        uri: "https://cdn.example.test/aggregate/job_aggregate_video.mp4",
        mimeType: "video/mp4",
        providerRequestId: "request_job_aggregate_video",
        generatedAt: "2026-05-11T04:02:00.000Z",
      },
    ],
    errors: [
      {
        jobId: "job_aggregate_failed",
        mediaType: "image",
        message: "Image provider rejected prompt",
        providerPluginId: "plugin.runtime.media",
        capabilityId: "cap.runtime.image",
      },
    ],
  });
  assert.deepEqual(
    appliedCampaign.canvasState.nodes.map((node) => ({
      id: node.id,
      status: node.status,
      assetGeneration: node.properties?.assetGeneration,
    })),
    [
      {
        id: "image_node",
        status: "READY",
        assetGeneration: {
          completed: 1,
          failed: 0,
          jobIds: ["job_aggregate_image"],
          status: "completed",
          assetIds: ["asset_aggregate_image"],
          resultIds: ["result_job_aggregate_image"],
          outputLocations: [
            {
              assetId: "asset_aggregate_image",
              primaryUri:
                "https://cdn.example.test/aggregate/job_aggregate_image.png",
            },
          ],
        },
      },
      {
        id: "video_node",
        status: "READY",
        assetGeneration: {
          completed: 1,
          failed: 0,
          jobIds: ["job_aggregate_video"],
          status: "completed",
          assetIds: ["asset_aggregate_video"],
          resultIds: ["result_job_aggregate_video"],
          outputLocations: [
            {
              assetId: "asset_aggregate_video",
              primaryUri:
                "https://cdn.example.test/aggregate/job_aggregate_video.mp4",
            },
          ],
        },
      },
      {
        id: "failed_node",
        status: "NEEDS INPUT",
        assetGeneration: {
          completed: 0,
          failed: 1,
          jobIds: ["job_aggregate_failed"],
          status: "failed",
        },
      },
    ],
  );
  assert.deepEqual(
    appliedCampaign.campaignSpec.nodes,
    appliedCampaign.canvasState.nodes,
  );
  assert.ok(
    appliedCampaign.logs.includes(
      "2026-05-11T04:03:00.000Z asset_generation.job_statuses:job_aggregate_image=completed,job_aggregate_video=completed,job_aggregate_failed=failed",
    ),
  );
  assert.ok(
    appliedCampaign.logs.includes(
      "2026-05-11T04:03:00.000Z asset_generation.errors:job_aggregate_failed=Image provider rejected prompt",
    ),
  );

  const persistedCampaign = saveCampaignAssetGenerationExecutionResult(
    storage,
    "campaign_aggregate_parallel_media",
    executionResult,
    {
      now: () => "2026-05-11T04:04:00.000Z",
      rightsOwner: "OwnCanvas Studio",
      rightsLicense: "campaign-generated",
    },
  );

  assert.equal(persistedCampaign.updatedAt, "2026-05-11T04:04:00.000Z");
  assert.equal(
    getPersistedCampaignRecord(storage, "campaign_aggregate_parallel_media")
      ?.campaignSpec.assetGenerationJobs[2].lifecycle?.error,
    "Image provider rejected prompt",
  );
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_aggregate_parallel_media")
      ?.campaignSpec.assetGenerationWorkflowState,
    persistedCampaign.campaignSpec.assetGenerationWorkflowState,
  );
});

test("workflow plugin configuration records activation state and scoped settings", () => {
  const workflowPlugin = createCampaignWorkflowPluginConfiguration(
    {
      pluginId: "plugin.provider.openai-media",
      type: "provider",
      lifecycleState: "active",
      permissionMode: "advanced",
      capabilityIds: ["cap.bulk-image", "cap.bulk-video"],
      configuration: {
        values: {
          imageModel: "gpt-image-1",
          videoModel: "sora-2",
          maxParallel: 4,
        },
        secretRefs: {
          apiKey: "secretref_user_openai",
        },
      },
      installedBy: "human",
      configuredBy: "agent",
      activatedBy: "agent",
    },
    {
      now: () => "2026-05-11T00:10:00.000Z",
    },
  );

  assert.deepEqual(workflowPlugin, {
    pluginId: "plugin.provider.openai-media",
    type: "provider",
    lifecycleState: "active",
    permissionMode: "advanced",
    capabilityIds: ["cap.bulk-image", "cap.bulk-video"],
    configuration: {
      values: {
        imageModel: "gpt-image-1",
        videoModel: "sora-2",
        maxParallel: 4,
      },
      secretRefs: {
        apiKey: "secretref_user_openai",
      },
      updatedAt: "2026-05-11T00:10:00.000Z",
    },
    installedBy: "human",
    configuredBy: "agent",
    activatedBy: "agent",
    installedAt: "2026-05-11T00:10:00.000Z",
    configuredAt: "2026-05-11T00:10:00.000Z",
    activatedAt: "2026-05-11T00:10:00.000Z",
    updatedAt: "2026-05-11T00:10:00.000Z",
  });
});

test("campaign model exposes the required source-of-truth fields", () => {
  assert.deepEqual(CAMPAIGN_REQUIRED_FIELDS, [
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
  ]);

  const campaign = createBlankCampaign();

  for (const field of CAMPAIGN_REQUIRED_FIELDS) {
    assert.ok(field in campaign, `missing campaign field: ${field}`);
  }
});

test("campaign measurement goal model exposes conversion-first reporting goals", () => {
  const measurementGoal = createCampaignMeasurementGoal({
    id: "goal_purchase_conversion",
    name: "purchase_conversion_rate",
    target: 3.5,
    unit: "percent",
    successCriteria:
      "Purchase conversion rate reaches or exceeds 3.5% with tracked checkout attribution.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-19T00:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
  });

  assert.deepEqual(measurementGoal, {
    id: "goal_purchase_conversion",
    name: "purchase_conversion_rate",
    target: 3.5,
    unit: "percent",
    successCriteria:
      "Purchase conversion rate reaches or exceeds 3.5% with tracked checkout attribution.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-19T00:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
  });
});

test("campaign evaluation model defines purchase conversion as the primary success metric", () => {
  assert.deepEqual(createCampaignEvaluationModel(), {
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
    },
    secondaryMetrics: [],
  });
});

test("validateCampaignMeasurementGoals reports required goal and reporting fields", () => {
  assert.deepEqual(
    validateCampaignMeasurementGoals([
      createCampaignMeasurementGoal({
        id: "",
        name: "",
        target: -1,
        unit: "",
        successCriteria: "",
        reportingTimeframe: {
          startsAt: "",
          endsAt: "not-a-date",
          timezone: "",
        },
      }),
      createCampaignMeasurementGoal({
        id: "",
        name: "purchase_conversion_rate",
        unit: "percent",
        successCriteria: "Reach the conversion target.",
        reportingTimeframe: {
          startsAt: "2026-05-12T00:00:00.000Z",
          endsAt: "",
          timezone: "UTC",
        },
      }),
    ]),
    {
      valid: false,
      errors: [
        {
          code: "measurement_goal.id_required",
          path: "tracking.measurementGoals.0.id",
          message: "Measurement goal id is required.",
        },
        {
          code: "measurement_goal.name_required",
          path: "tracking.measurementGoals.0.name",
          message: "Measurement metric name is required.",
        },
        {
          code: "measurement_goal.target_invalid",
          path: "tracking.measurementGoals.0.target",
          message: "Measurement target cannot be negative.",
        },
        {
          code: "measurement_goal.unit_required",
          path: "tracking.measurementGoals.0.unit",
          message: "Measurement goal unit is required.",
        },
        {
          code: "measurement_goal.success_criteria_required",
          path: "tracking.measurementGoals.0.successCriteria",
          message: "Measurement success criteria are required.",
        },
        {
          code: "measurement_goal.reporting_starts_at_required",
          path: "tracking.measurementGoals.0.reportingTimeframe.startsAt",
          message: "Measurement reporting start time is required.",
        },
        {
          code: "measurement_goal.reporting_ends_at_invalid",
          path: "tracking.measurementGoals.0.reportingTimeframe.endsAt",
          message: "Measurement reporting end time must be a valid timestamp.",
        },
        {
          code: "measurement_goal.reporting_timezone_required",
          path: "tracking.measurementGoals.0.reportingTimeframe.timezone",
          message: "Measurement reporting timezone is required.",
        },
        {
          code: "measurement_goal.id_required",
          path: "tracking.measurementGoals.1.id",
          message: "Measurement goal id is required.",
        },
        {
          code: "measurement_goal.reporting_ends_at_required",
          path: "tracking.measurementGoals.1.reportingTimeframe.endsAt",
          message: "Measurement reporting end time is required.",
        },
      ],
    },
  );
});

test("campaign target audience model exposes all audience profile fields", () => {
  assert.deepEqual(CAMPAIGN_TARGET_AUDIENCE_FIELDS, [
    "age",
    "gender",
    "interests",
    "behavior",
    "region",
    "platform",
  ]);

  assert.deepEqual(createCampaignTargetAudience(), {
    age: "",
    gender: "",
    interests: "",
    behavior: "",
    region: "",
    platform: "",
  });
  assert.deepEqual(createCampaignTargetAudience({
    age: "25-34",
    gender: "all",
    interests: "AI tools, skincare, creator commerce",
    behavior: "comments on short-form product demos",
    region: "United States",
    platform: "Instagram",
  }), {
    age: "25-34",
    gender: "all",
    interests: "AI tools, skincare, creator commerce",
    behavior: "comments on short-form product demos",
    region: "United States",
    platform: "Instagram",
  });
});

test("campaign product offer model supports structured product commerce details", () => {
  const campaign = createBlankCampaign();

  assert.deepEqual(CAMPAIGN_PRODUCT_OFFER_FIELDS, {
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
  });
  assert.deepEqual(campaign.productOffer, {
    product: {
      id: "",
      title: "",
      brand: "",
      category: "",
      description: "",
      tags: [],
      canonicalUrl: "",
      media: [],
      variants: [],
    },
    offer: {
      headline: "",
      summary: "",
      price: {
        amount: null,
        currency: "USD",
        display: "",
      },
      discount: "",
      terms: "",
      destinationUrl: "",
      callToAction: "",
    },
    attribution: {
      source: "",
      externalId: "",
      affiliateNetwork: "",
      commissionRate: null,
      trackingUrl: "",
    },
  });
});

test("createCampaignProductOffer merges partial structured offer information with defaults", () => {
  const productOffer = createCampaignProductOffer({
    product: {
      id: "prod_123",
      title: "Creator Starter Kit",
      tags: ["ugc", "starter"],
    },
    offer: {
      headline: "Creator launch bundle",
      price: {
        amount: 4900,
        display: "$49",
      },
      callToAction: "Shop the kit",
    },
    attribution: {
      source: "affiliate-feed",
      affiliateNetwork: "impact",
      commissionRate: 12.5,
    },
  });

  assert.deepEqual(productOffer, {
    product: {
      id: "prod_123",
      title: "Creator Starter Kit",
      brand: "",
      category: "",
      description: "",
      tags: ["ugc", "starter"],
      canonicalUrl: "",
      media: [],
      variants: [],
    },
    offer: {
      headline: "Creator launch bundle",
      summary: "",
      price: {
        amount: 4900,
        currency: "USD",
        display: "$49",
      },
      discount: "",
      terms: "",
      destinationUrl: "",
      callToAction: "Shop the kit",
    },
    attribution: {
      source: "affiliate-feed",
      externalId: "",
      affiliateNetwork: "impact",
      commissionRate: 12.5,
      trackingUrl: "",
    },
  });
});

test("campaign publishing channel model exposes destinations schedules and conversion tracking", () => {
  const channel = createCampaignPublishingChannel({
    id: "pub_instagram_dm_landing",
    type: "direct-message",
    platform: "instagram",
    label: "Instagram comment to DM",
    providerPluginId: "plugin.dm.instagram",
    account: {
      id: "ig_creator_123",
      handle: "@owncanvas",
    },
    placement: "comment-trigger",
    destinationUrl: "https://go.example.com/creator-kit",
    landingPageId: "landing_creator_kit",
    schedule: {
      mode: "scheduled",
      startsAt: "2026-05-12T15:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
    tracking: {
      utmSource: "instagram",
      utmMedium: "dm",
      utmCampaign: "creator-kit-launch",
      utmContent: "comment-keyword",
      conversionEvent: "purchase",
    },
    status: "configured",
  });

  assert.deepEqual(CAMPAIGN_PUBLISHING_CHANNEL_FIELDS, [
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
  ]);
  assert.deepEqual(channel, {
    id: "pub_instagram_dm_landing",
    type: "direct-message",
    platform: "instagram",
    label: "Instagram comment to DM",
    providerPluginId: "plugin.dm.instagram",
    account: {
      id: "ig_creator_123",
      handle: "@owncanvas",
    },
    placement: "comment-trigger",
    destinationUrl: "https://go.example.com/creator-kit",
    landingPageId: "landing_creator_kit",
    schedule: {
      mode: "scheduled",
      startsAt: "2026-05-12T15:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
    tracking: {
      utmSource: "instagram",
      utmMedium: "dm",
      utmCampaign: "creator-kit-launch",
      utmContent: "comment-keyword",
      conversionEvent: "purchase",
    },
    publishedLinks: [],
    status: "configured",
  });
});

test("immersive landing page block types define embedded and continued short-form content", () => {
  assert.deepEqual(CAMPAIGN_IMMERSIVE_LANDING_PAGE_BLOCK_TYPES, [
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
            description: "Engagement event emitted when the embedded short is viewed.",
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
          description: "Touchpoint id used to join embed engagement to conversion.",
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
            description: "Conversion call-to-action rendered after the continuation.",
          },
          {
            key: "offerAssetIds",
            type: "array",
            required: false,
            itemType: "asset-ref",
            description: "Optional product or offer assets used inside the continuation.",
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
          description: "Landing-native transition pattern between continuation segments.",
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
  ]);

  assert.deepEqual(
    getCampaignImmersiveLandingPageBlockTypeDefinition("short-form-embed"),
    CAMPAIGN_IMMERSIVE_LANDING_PAGE_BLOCK_TYPES[0],
  );
  assert.equal(
    getCampaignImmersiveLandingPageBlockTypeDefinition("unsupported"),
    undefined,
  );
});

test("landing page template schema defines configurable embedded short-form modules with provider metadata", () => {
  const module = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_reel",
    label: "Source reel",
    provider: {
      providerPluginId: "plugin.landing.instagram-embed",
      providerKind: "external",
      sourcePlatform: "instagram",
      sourceType: "social-post",
      sourceContentId: "ig.reel.123",
      sourceUrl: "https://www.instagram.com/reel/source-reel/",
      sourceAssetId: "asset_source_reel",
      embedMode: "oembed",
    },
    configuration: {
      autoplay: false,
      muted: true,
      loop: false,
      showCaptions: true,
      preserveSourceChrome: true,
      aspectRatio: "9:16",
      maxDurationSeconds: 45,
    },
  });

  const templateSchema = {
    schemaVersion: "owncanvas.landing-page-template.v1" as const,
    id: "template_immersive_dm_landing",
    title: "DM handoff landing",
    pageType: "immersive" as const,
    modules: [module],
  };

  assert.deepEqual(module, {
    id: "module_source_reel",
    type: "embedded-short-form-content",
    blockType: "short-form-embed",
    label: "Source reel",
    required: true,
    order: 0,
    acceptedInputPorts: ["inputs.short_form_asset", "inputs.tracking_context"],
    outputPorts: ["outputs.viewer_context"],
    mediaTypes: ["video"],
    attributionRole: "source-touchpoint",
    provider: {
      providerPluginId: "plugin.landing.instagram-embed",
      providerKind: "external",
      sourcePlatform: "instagram",
      sourceType: "social-post",
      sourceContentId: "ig.reel.123",
      sourceUrl: "https://www.instagram.com/reel/source-reel/",
      sourceAssetId: "asset_source_reel",
      embedMode: "oembed",
    },
    configuration: {
      autoplay: false,
      muted: true,
      loop: false,
      showCaptions: true,
      preserveSourceChrome: true,
      aspectRatio: "9:16",
      maxDurationSeconds: 45,
    },
  });
  assert.deepEqual(validateCampaignLandingPageTemplateSchema(templateSchema), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(
    validateCampaignLandingPageTemplateSchema({
      ...templateSchema,
      modules: [
        {
          ...module,
          provider: {
            ...module.provider,
            providerPluginId: "",
            sourceUrl: "notaurl",
          },
        },
      ],
    }).errors.map((error) => error.code),
    [
      "landing-template.provider_plugin_id_required",
      "landing-template.source_url_invalid",
    ],
  );
});

test("landing page template preview and validation cover supported short-form embed sources", () => {
  const instagramModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_instagram_reel",
    label: "Instagram reel",
    provider: {
      providerPluginId: "plugin.landing.instagram-embed",
      providerKind: "external",
      sourcePlatform: "instagram",
      sourceType: "social-post",
      sourceContentId: "ig.reel.123",
      sourceUrl: "https://www.instagram.com/reel/source-reel/",
      embedMode: "oembed",
    },
  });
  const tiktokModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_tiktok_short",
    label: "TikTok short",
    provider: {
      providerPluginId: "plugin.landing.tiktok-embed",
      providerKind: "external",
      sourcePlatform: "tiktok",
      sourceType: "social-post",
      sourceContentId: "tt.video.123",
      sourceUrl: "https://www.tiktok.com/@owncanvas/video/123",
      embedMode: "iframe",
    },
    order: 1,
  });
  const youtubeModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_youtube_short",
    label: "YouTube short",
    provider: {
      providerPluginId: "plugin.landing.youtube-embed",
      providerKind: "external",
      sourcePlatform: "youtube",
      sourceType: "social-post",
      sourceContentId: "yt.short.123",
      sourceUrl: "https://www.youtube.com/shorts/abc123",
      embedMode: "iframe",
    },
    order: 2,
  });
  const generatedModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_generated_short",
    label: "Generated short",
    provider: {
      providerPluginId: "plugin.landing.owncanvas-native",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_generated_short",
      sourceUrl: "https://cdn.example.test/generated-short.mp4",
      sourceAssetId: "asset_generated_short",
      embedMode: "native-player",
    },
    order: 3,
  });
  const customModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_custom_embed",
    label: "Custom embed",
    provider: {
      providerPluginId: "plugin.landing.custom-iframe",
      providerKind: "external",
      sourcePlatform: "custom",
      sourceType: "external-url",
      sourceContentId: "custom.embed.123",
      sourceUrl: "https://video.example.test/embed/123",
      embedMode: "iframe",
    },
    order: 4,
  });
  const modules = [
    instagramModule,
    tiktokModule,
    youtubeModule,
    generatedModule,
    customModule,
  ];

  assert.deepEqual(
    validateCampaignLandingPageTemplateSchema({
      schemaVersion: "owncanvas.landing-page-template.v1",
      id: "template_supported_sources",
      title: "Supported source preview",
      pageType: "immersive",
      modules,
    }),
    { valid: true, errors: [] },
  );

  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_supported_sources",
    title: "Supported source preview",
    pageType: "immersive",
    modules,
  });

  assert.deepEqual(
    renderModel.modules.map((module) =>
      module.type === "embedded-short-form-content"
        ? module.preview
        : undefined,
    ),
    [
      {
        sourcePlatform: "instagram",
        sourceType: "social-post",
        embedMode: "oembed",
        previewSurface: "social-oembed",
        sourceUrl: "https://www.instagram.com/reel/source-reel/",
        supported: true,
      },
      {
        sourcePlatform: "tiktok",
        sourceType: "social-post",
        embedMode: "iframe",
        previewSurface: "social-iframe",
        sourceUrl: "https://www.tiktok.com/@owncanvas/video/123",
        supported: true,
      },
      {
        sourcePlatform: "youtube",
        sourceType: "social-post",
        embedMode: "iframe",
        previewSurface: "social-iframe",
        sourceUrl: "https://www.youtube.com/shorts/abc123",
        supported: true,
      },
      {
        sourcePlatform: "owncanvas",
        sourceType: "generated-asset",
        embedMode: "native-player",
        previewSurface: "native-video",
        sourceUrl: "https://cdn.example.test/generated-short.mp4",
        supported: true,
      },
      {
        sourcePlatform: "custom",
        sourceType: "external-url",
        embedMode: "iframe",
        previewSurface: "custom-iframe",
        sourceUrl: "https://video.example.test/embed/123",
        supported: true,
      },
    ],
  );

  assert.deepEqual(
    validateCampaignLandingPageTemplateSchema({
      schemaVersion: "owncanvas.landing-page-template.v1",
      id: "template_invalid_sources",
      title: "Invalid source preview",
      pageType: "immersive",
      modules: [
        {
          ...instagramModule,
          provider: {
            ...instagramModule.provider,
            sourceUrl: "https://www.tiktok.com/@owncanvas/video/123",
          },
        },
        {
          ...generatedModule,
          provider: {
            ...generatedModule.provider,
            sourceType: "external-url",
          },
        },
        {
          ...customModule,
          provider: {
            ...customModule.provider,
            sourcePlatform: "shopify",
          },
        },
      ],
    }).errors.map((error) => error.code),
    [
      "landing-template.source_url_unsupported",
      "landing-template.embed_configuration_unsupported",
      "landing-template.source_platform_unsupported",
    ],
  );
});

test("landing page template schema defines inline continuation modules that keep short-form consumption on the same page", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_short_001",
      sourceUrl: "https://cdn.example.test/shorts/asset_short_001.mp4",
      sourceAssetId: "asset_short_001",
      embedMode: "native-player",
    },
  });
  const continuationModule =
    createInlineShortFormContinuationLandingPageTemplateModule({
      id: "module_inline_continuation",
      label: "Inline continuation",
      sourceModuleId: "module_source_short",
      segments: [
        {
          id: "segment_product_proof",
          assetId: "asset_demo_clip",
          mediaType: "video",
          headline: "See the campaign kit in use",
          trackingEventName: "landing.continuation.segment_viewed",
        },
      ],
      cta: {
        label: "Get the campaign kit",
        url: "https://shop.example.test/checkout/creator-kit",
        conversionEventName: "purchase",
      },
    });

  assert.deepEqual(continuationModule, {
    id: "module_inline_continuation",
    type: "inline-short-form-continuation",
    blockType: "short-form-continuation",
    label: "Inline continuation",
    required: true,
    order: 1,
    acceptedInputPorts: ["inputs.viewer_context", "inputs.offer_context"],
    outputPorts: ["outputs.conversion_intent"],
    mediaTypes: ["video", "image", "text"],
    attributionRole: "landing-engagement",
    sourceModuleId: "module_source_short",
    continuationBehavior: {
      consumptionSurface: "same-page",
      navigationPolicy: "inline-only",
      trigger: "after-source-engagement",
      transitionStyle: "scroll",
      requiresSeparatePage: false,
    },
    segments: [
      {
        id: "segment_product_proof",
        assetId: "asset_demo_clip",
        mediaType: "video",
        headline: "See the campaign kit in use",
        trackingEventName: "landing.continuation.segment_viewed",
      },
    ],
    cta: {
      label: "Get the campaign kit",
      url: "https://shop.example.test/checkout/creator-kit",
      conversionEventName: "purchase",
    },
    configuration: {
      maxSegments: 3,
      transitionStyle: "scroll",
      conversionEventName: "purchase",
      preserveInlineContext: true,
    },
  });
  assert.deepEqual(
    validateCampaignLandingPageTemplateSchema({
      schemaVersion: "owncanvas.landing-page-template.v1",
      id: "template_inline_continuation",
      title: "Inline continuation landing",
      pageType: "immersive",
      modules: [sourceModule, continuationModule],
    }),
    {
      valid: true,
      errors: [],
    },
  );
  assert.deepEqual(
    validateCampaignLandingPageTemplateSchema({
      schemaVersion: "owncanvas.landing-page-template.v1",
      id: "template_invalid_inline_continuation",
      title: "Invalid inline continuation landing",
      pageType: "immersive",
      modules: [
        sourceModule,
        {
          ...continuationModule,
          sourceModuleId: "module_missing",
          continuationBehavior: {
            ...continuationModule.continuationBehavior,
            requiresSeparatePage: true,
          },
          cta: {
            ...continuationModule.cta,
            url: "/checkout",
          },
        },
      ],
    }).errors.map((error) => error.code),
    [
      "landing-template.inline_source_module_missing",
      "landing-template.inline_continuation_requires_same_page",
      "landing-template.inline_continuation_cta_url_invalid",
    ],
  );
});

test("landing page render model defines responsive layout and interaction requirements for immersive blocks", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_short_001",
      sourceUrl: "https://cdn.example.test/shorts/asset_short_001.mp4",
      sourceAssetId: "asset_short_001",
      embedMode: "native-player",
    },
    configuration: {
      aspectRatio: "9:16",
    },
  });
  const continuationModule =
    createInlineShortFormContinuationLandingPageTemplateModule({
      id: "module_inline_continuation",
      label: "Inline continuation",
      sourceModuleId: "module_source_short",
      segments: [
        {
          id: "segment_product_proof",
          mediaType: "video",
          headline: "Watch the proof",
          trackingEventName: "landing.continuation.segment_viewed",
        },
      ],
      cta: {
        label: "Buy now",
        url: "https://shop.example.test/checkout/creator-kit",
        conversionEventName: "purchase",
      },
      configuration: {
        transitionStyle: "snap",
      },
    });

  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_responsive_immersive",
    title: "Responsive immersive landing",
    pageType: "immersive",
    modules: [continuationModule, sourceModule],
  });

  assert.deepEqual(renderModel.modules.map((module) => module.id), [
    "module_source_short",
    "module_inline_continuation",
  ]);
  assert.deepEqual(renderModel.modules[0].responsiveLayoutRequirements, [
    {
      breakpoint: "mobile",
      minWidth: 0,
      maxWidth: 639,
      layout: "single-column",
      mediaAspectRatio: "9 / 16",
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
      mediaAspectRatio: "9 / 16",
      mediaMaxInlineSize: "420px",
      continuationPlacement: "below-source",
      ctaPlacement: "below-content",
      safeAreaPadding: "24px",
    },
    {
      breakpoint: "desktop",
      minWidth: 1024,
      maxWidth: null,
      layout: "immersive-desktop",
      mediaAspectRatio: "9 / 16",
      mediaMaxInlineSize: "420px",
      continuationPlacement: "adjacent-rail",
      ctaPlacement: "side-panel",
      safeAreaPadding: "32px",
    },
  ]);
  assert.deepEqual(renderModel.modules[0].interactionRequirements, [
    {
      breakpoint: "mobile",
      primaryInput: "touch",
      playbackActivation: "tap",
      scrollBehavior: "snap",
      preservesInlineContext: true,
      supportsKeyboardNavigation: true,
      conversionAction: "sticky-cta",
    },
    {
      breakpoint: "tablet",
      primaryInput: "touch",
      playbackActivation: "tap",
      scrollBehavior: "snap",
      preservesInlineContext: true,
      supportsKeyboardNavigation: true,
      conversionAction: "inline-cta",
    },
    {
      breakpoint: "desktop",
      primaryInput: "pointer",
      playbackActivation: "click",
      scrollBehavior: "snap",
      preservesInlineContext: true,
      supportsKeyboardNavigation: true,
      conversionAction: "side-panel-cta",
    },
  ]);
  assert.deepEqual(
    renderModel.modules[1].responsiveLayoutRequirements,
    renderModel.modules[0].responsiveLayoutRequirements,
  );
  assert.deepEqual(
    renderModel.modules[1].interactionRequirements,
    renderModel.modules[0].interactionRequirements,
  );
});

test("landing page renderer preserves embedded short-form native aspect ratio across responsive breakpoints", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_reel",
    label: "Source reel",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_reel",
      sourceUrl: "https://cdn.example.test/source-reel.mp4",
      sourceAssetId: "asset_source_reel",
      embedMode: "native-player",
    },
    configuration: {
      aspectRatio: "9:16",
      autoplay: true,
      muted: true,
      loop: true,
      showCaptions: true,
      preserveSourceChrome: true,
    },
  });
  const squareModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_square_short",
    label: "Square proof short",
    provider: {
      providerPluginId: "plugin.landing.iframe",
      providerKind: "external",
      sourcePlatform: "instagram",
      sourceType: "social-post",
      sourceContentId: "ig.square.123",
      sourceUrl: "https://www.instagram.com/reel/square-proof/",
      embedMode: "iframe",
    },
    configuration: {
      aspectRatio: "1:1",
      autoplay: false,
      muted: true,
      loop: false,
      showCaptions: true,
      preserveSourceChrome: true,
    },
    order: 1,
  });

  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_renderer_aspect_ratio",
    title: "Renderer aspect ratio",
    pageType: "immersive",
    modules: [squareModule, sourceModule],
  });

  assert.equal(getCampaignLandingPageAspectRatioCssValue("9:16"), "9 / 16");
  assert.deepEqual(
    renderModel.modules.map((module) => module.id),
    ["module_source_reel", "module_square_short"],
  );

  const [verticalRenderModule, squareRenderModule] = renderModel.modules;

  assert.equal(verticalRenderModule.type, "embedded-short-form-content");
  assert.equal(squareRenderModule.type, "embedded-short-form-content");

  if (
    verticalRenderModule.type !== "embedded-short-form-content" ||
    squareRenderModule.type !== "embedded-short-form-content"
  ) {
    assert.fail("Expected embedded short-form render modules.");
  }

  assert.equal(verticalRenderModule.id, "module_source_reel");
  assert.equal(verticalRenderModule.mediaElement, "video");
  assert.equal(
    verticalRenderModule.mediaUrl,
    "https://cdn.example.test/source-reel.mp4",
  );
  assert.equal(verticalRenderModule.aspectRatio, "9:16");
  assert.equal(verticalRenderModule.cssAspectRatio, "9 / 16");
  assert.equal(verticalRenderModule.className, "landing-short-form-embed");
  assert.deepEqual(verticalRenderModule.style, {
    aspectRatio: "9 / 16",
    width: "100%",
    maxWidth: "420px",
  });
  assert.deepEqual(verticalRenderModule.responsiveBreakpoints, [
      {
        name: "mobile",
        minWidth: 0,
        maxWidth: 639,
        aspectRatio: "9 / 16",
        maxInlineSize: "100%",
      },
      {
        name: "tablet",
        minWidth: 640,
        maxWidth: 1023,
        aspectRatio: "9 / 16",
        maxInlineSize: "420px",
      },
      {
        name: "desktop",
        minWidth: 1024,
        maxWidth: null,
        aspectRatio: "9 / 16",
        maxInlineSize: "420px",
      },
    ],
  );
  assert.deepEqual(verticalRenderModule.playback, {
    autoplay: true,
    muted: true,
    loop: true,
    showCaptions: true,
    preserveSourceChrome: true,
  });
  assert.deepEqual(verticalRenderModule.tracking, {
    attributionRole: "source-touchpoint",
    sourceContentId: "asset_source_reel",
    sourceAssetId: "asset_source_reel",
  });
  assert.deepEqual(
    squareRenderModule.responsiveBreakpoints.map(
      (breakpoint) => breakpoint.aspectRatio,
    ),
    ["1 / 1", "1 / 1", "1 / 1"],
  );
  assert.equal(squareRenderModule.mediaElement, "iframe");
  assert.equal(squareRenderModule.style.maxWidth, "560px");
});

test("landing page render model exposes playback controls and page-safe embedded interaction policies", () => {
  const nativeModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_native_short",
    label: "Native short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_native_short",
      sourceUrl: "https://cdn.example.test/native-short.mp4",
      sourceAssetId: "asset_native_short",
      embedMode: "native-player",
    },
    configuration: {
      autoplay: true,
      muted: true,
      loop: true,
      showCaptions: true,
      preserveSourceChrome: true,
    },
  });
  const iframeModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_social_embed",
    label: "Social embed",
    provider: {
      providerPluginId: "plugin.landing.instagram-embed",
      providerKind: "external",
      sourcePlatform: "instagram",
      sourceType: "social-post",
      sourceContentId: "ig.reel.social",
      sourceUrl: "https://www.instagram.com/reel/social/",
      embedMode: "iframe",
    },
    configuration: {
      autoplay: false,
      muted: true,
      loop: false,
      showCaptions: true,
      preserveSourceChrome: true,
    },
    order: 1,
  });

  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_embedded_interactions",
    title: "Embedded interaction landing",
    pageType: "immersive",
    modules: [nativeModule, iframeModule],
  });

  const [nativeRenderModule, iframeRenderModule] = renderModel.modules;

  assert.equal(nativeRenderModule.type, "embedded-short-form-content");
  assert.equal(iframeRenderModule.type, "embedded-short-form-content");

  if (
    nativeRenderModule.type !== "embedded-short-form-content" ||
    iframeRenderModule.type !== "embedded-short-form-content"
  ) {
    assert.fail("Expected embedded short-form render modules.");
  }

  assert.deepEqual(nativeRenderModule.playbackControls, {
    nativeControls: true,
    keyboardAccessible: true,
    captions: "show-when-available",
    fullscreen: true,
    pictureInPicture: true,
  });
  assert.deepEqual(nativeRenderModule.pageInteractionPolicy, {
    pointerEvents: "media-controls",
    pageScroll: "preserve",
    iframeActivation: "not-applicable",
    focusTrap: false,
  });
  assert.deepEqual(iframeRenderModule.playbackControls, {
    nativeControls: false,
    keyboardAccessible: true,
    captions: "provider-managed",
    fullscreen: true,
    pictureInPicture: true,
  });
  assert.deepEqual(iframeRenderModule.pageInteractionPolicy, {
    pointerEvents: "activate-on-focus-or-hover",
    pageScroll: "preserve",
    iframeActivation: "explicit",
    focusTrap: false,
  });
});

test("landing page render model defines navigation and conversion element playback policies", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });

  const templateSchema = {
    schemaVersion: "owncanvas.landing-page-template.v1" as const,
    id: "template_navigation_conversion_controls",
    title: "Navigation and conversion controls",
    pageType: "immersive" as const,
    navigation: {
      visibility: "visible" as const,
      placement: "top-overlay" as const,
      timing: "during-playback" as const,
      interruptionBehavior: "non-blocking" as const,
    },
    conversionElements: [
      {
        id: "conversion_checkout",
        label: "Buy the kit",
        conversionEventName: "purchase",
        destinationUrl: "https://shop.example.test/checkout/kit",
        visibility: "visible" as const,
        placement: "sticky-bottom" as const,
        timing: "after-playback-start" as const,
        interruptionBehavior: "pause-on-activate" as const,
      },
    ],
    modules: [sourceModule],
  };

  assert.deepEqual(validateCampaignLandingPageTemplateSchema(templateSchema), {
    valid: true,
    errors: [],
  });

  const renderModel = createCampaignLandingPageRenderModel(templateSchema);

  assert.deepEqual(renderModel.navigation, {
    visibility: "visible",
    placement: "top-overlay",
    timing: "during-playback",
    interruptionBehavior: "non-blocking",
  });
  assert.deepEqual(renderModel.conversionElements, [
    {
      id: "conversion_checkout",
      label: "Buy the kit",
      conversionEventName: "purchase",
      destinationUrl: "https://shop.example.test/checkout/kit",
      visibility: "visible",
      placement: "sticky-bottom",
      timing: "after-playback-start",
      interruptionBehavior: "pause-on-activate",
    },
  ]);
  assert.deepEqual(
    validateCampaignLandingPageTemplateSchema({
      ...templateSchema,
      navigation: {
        ...templateSchema.navigation,
        placement: "modal",
      },
      conversionElements: [
        {
          ...templateSchema.conversionElements[0],
          destinationUrl: "/checkout",
          timing: "before-page-load",
        },
      ],
    }).errors.map((error) => error.code),
    [
      "landing-template.navigation_configuration_invalid",
      "landing-template.conversion_element_invalid",
    ],
  );
});

test("landing page preview validation confirms navigation and conversion stay accessible without interrupting active short-form content", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });
  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_preview_accessibility",
    title: "Preview accessibility",
    pageType: "immersive",
    behavior: {
      mode: "immersion-preserving",
      preserveInlineContext: true,
      allowTraditionalRedirect: false,
    },
    navigation: {
      visibility: "visible",
      placement: "top-overlay",
      timing: "during-playback",
      interruptionBehavior: "non-blocking",
    },
    conversionElements: [
      {
        id: "conversion_checkout",
        label: "Buy the kit",
        conversionEventName: "purchase",
        destinationUrl: "https://shop.example.test/checkout/kit",
        visibility: "visible",
        placement: "sticky-bottom",
        timing: "after-playback-start",
        interruptionBehavior: "pause-on-activate",
      },
    ],
    modules: [sourceModule],
  });

  assert.deepEqual(
    validateCampaignLandingPagePreviewAccessibility(renderModel),
    {
      valid: true,
      checks: [
        {
          id: "short-form-active-content",
          target: "module_source_short",
          accessible: true,
          nonDisruptive: true,
          previewPlacement: "media",
          activation: "native-controls",
        },
        {
          id: "landing-navigation",
          target: "navigation",
          accessible: true,
          nonDisruptive: true,
          previewPlacement: "inline",
          activation: "manual",
        },
        {
          id: "conversion-element:conversion_checkout",
          target: "conversion_checkout",
          accessible: true,
          nonDisruptive: true,
          previewPlacement: "side-panel",
          activation: "new-context",
        },
      ],
      errors: [],
    },
  );
});

test("publishing preview validation defines short-form landing immersion rules", () => {
  assert.deepEqual(
    CAMPAIGN_LANDING_PAGE_PUBLISHING_PREVIEW_VALIDATION_RULES.map(
      (rule) => rule.id,
    ),
    [
      "short-form-source-context",
      "inline-immersion-behavior",
      "non-blocking-page-chrome",
      "same-page-continuation",
      "conversion-path-accessible",
      "desktop-immersive-layout",
      "mobile-immersive-layout",
    ],
  );

  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });
  const continuationModule =
    createInlineShortFormContinuationLandingPageTemplateModule({
      id: "module_inline_continuation",
      label: "Inline continuation",
      sourceModuleId: "module_source_short",
      segments: [
        {
          id: "segment_product_proof",
          mediaType: "video",
          headline: "Watch the product proof",
          trackingEventName: "landing.continuation.segment_viewed",
        },
      ],
      cta: {
        label: "Buy the kit",
        url: "https://shop.example.test/checkout/kit",
        conversionEventName: "purchase",
      },
    });

  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_publish_preview_immersion",
    title: "Publishing preview immersion",
    pageType: "immersive",
    behavior: {
      mode: "immersion-preserving",
      preserveInlineContext: true,
      allowTraditionalRedirect: false,
    },
    navigation: {
      visibility: "visible",
      placement: "top-overlay",
      timing: "during-playback",
      interruptionBehavior: "non-blocking",
    },
    conversionElements: [
      {
        id: "conversion_checkout",
        label: "Buy the kit",
        conversionEventName: "purchase",
        destinationUrl: "https://shop.example.test/checkout/kit",
        visibility: "visible",
        placement: "sticky-bottom",
        timing: "after-playback-start",
        interruptionBehavior: "pause-on-activate",
      },
    ],
    modules: [sourceModule, continuationModule],
  });

  assert.deepEqual(validateCampaignLandingPagePublishingPreview(renderModel), {
    valid: true,
    rules: CAMPAIGN_LANDING_PAGE_PUBLISHING_PREVIEW_VALIDATION_RULES.map(
      (rule) => ({ ...rule }),
    ),
    accessibility: validateCampaignLandingPagePreviewAccessibility(renderModel),
    errors: [],
  });
});

test("publishing preview validation validates desktop short-form immersion layout", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });
  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_publish_preview_desktop_immersion",
    title: "Publishing preview desktop immersion",
    pageType: "immersive",
    behavior: {
      mode: "immersion-preserving",
      preserveInlineContext: true,
      allowTraditionalRedirect: false,
    },
    navigation: {
      visibility: "visible",
      placement: "top-overlay",
      timing: "during-playback",
      interruptionBehavior: "non-blocking",
    },
    conversionElements: [
      {
        id: "conversion_checkout",
        label: "Buy the kit",
        conversionEventName: "purchase",
        destinationUrl: "https://shop.example.test/checkout/kit",
        visibility: "visible",
        placement: "sticky-bottom",
        timing: "after-playback-start",
        interruptionBehavior: "pause-on-activate",
      },
    ],
    modules: [sourceModule],
  });
  const invalidDesktopRenderModel = {
    ...renderModel,
    modules: renderModel.modules.map((module) => ({
      ...module,
      responsiveLayoutRequirements: module.responsiveLayoutRequirements.map(
        (requirement) =>
          requirement.breakpoint === "desktop"
            ? {
                ...requirement,
                layout: "centered-column" as const,
                continuationPlacement: "below-source" as const,
                ctaPlacement: "below-content" as const,
              }
            : requirement,
      ),
      interactionRequirements: module.interactionRequirements.map(
        (requirement) =>
          requirement.breakpoint === "desktop"
            ? {
                ...requirement,
                primaryInput: "touch" as const,
                playbackActivation: "tap" as const,
                conversionAction: "inline-cta" as const,
              }
            : requirement,
      ),
    })),
  };

  assert.deepEqual(validateCampaignLandingPagePublishingPreview(renderModel), {
    valid: true,
    rules: CAMPAIGN_LANDING_PAGE_PUBLISHING_PREVIEW_VALIDATION_RULES.map(
      (rule) => ({ ...rule }),
    ),
    accessibility: validateCampaignLandingPagePreviewAccessibility(renderModel),
    errors: [],
  });
  assert.deepEqual(
    validateCampaignLandingPagePublishingPreview(invalidDesktopRenderModel)
      .errors.map((error) => [error.ruleId, error.code, error.path]),
    [
      [
        "desktop-immersive-layout",
        "landing-preview.desktop_layout_not_immersive",
        "modules.module_source_short.responsiveLayoutRequirements.desktop",
      ],
    ],
  );
});

test("publishing preview validation validates mobile short-form immersion layout", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });
  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_publish_preview_mobile_immersion",
    title: "Publishing preview mobile immersion",
    pageType: "immersive",
    behavior: {
      mode: "immersion-preserving",
      preserveInlineContext: true,
      allowTraditionalRedirect: false,
    },
    navigation: {
      visibility: "visible",
      placement: "top-overlay",
      timing: "during-playback",
      interruptionBehavior: "non-blocking",
    },
    conversionElements: [
      {
        id: "conversion_checkout",
        label: "Buy the kit",
        conversionEventName: "purchase",
        destinationUrl: "https://shop.example.test/checkout/kit",
        visibility: "visible",
        placement: "sticky-bottom",
        timing: "after-playback-start",
        interruptionBehavior: "pause-on-activate",
      },
    ],
    modules: [sourceModule],
  });
  const invalidMobileRenderModel = {
    ...renderModel,
    modules: renderModel.modules.map((module) => ({
      ...module,
      responsiveLayoutRequirements: module.responsiveLayoutRequirements.filter(
        (requirement) => requirement.breakpoint !== "mobile",
      ),
      interactionRequirements: module.interactionRequirements.map(
        (requirement) =>
          requirement.breakpoint === "mobile"
            ? {
                ...requirement,
                primaryInput: "pointer" as const,
                playbackActivation: "click" as const,
                preservesInlineContext: false as never,
              }
            : requirement,
      ),
    })),
  };

  assert.deepEqual(
    validateCampaignLandingPagePublishingPreview(invalidMobileRenderModel)
      .errors.map((error) => [error.ruleId, error.code, error.path]),
    [
      [
        "mobile-immersive-layout",
        "landing-preview.mobile_layout_not_immersive",
        "modules.module_source_short.responsiveLayoutRequirements.mobile",
      ],
    ],
  );
});

test("publishing preview validation reports layout-specific remediation guidance for immersion failures", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });
  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_publish_preview_guidance",
    title: "Publishing preview guidance",
    pageType: "immersive",
    behavior: {
      mode: "immersion-preserving",
      preserveInlineContext: true,
      allowTraditionalRedirect: false,
    },
    navigation: {
      visibility: "visible",
      placement: "top-overlay",
      timing: "during-playback",
      interruptionBehavior: "non-blocking",
    },
    conversionElements: [
      {
        id: "conversion_checkout",
        label: "Buy the kit",
        conversionEventName: "purchase",
        destinationUrl: "https://shop.example.test/checkout/kit",
        visibility: "visible",
        placement: "sticky-bottom",
        timing: "after-playback-start",
        interruptionBehavior: "pause-on-activate",
      },
    ],
    modules: [sourceModule],
  });
  const invalidRenderModel = {
    ...renderModel,
    modules: renderModel.modules.map((module) => ({
      ...module,
      responsiveLayoutRequirements: module.responsiveLayoutRequirements.map(
        (requirement) =>
          requirement.breakpoint === "desktop"
            ? {
                ...requirement,
                layout: "centered-column" as const,
                continuationPlacement: "below-source" as const,
                ctaPlacement: "below-content" as const,
              }
            : requirement.breakpoint === "mobile"
              ? {
                  ...requirement,
                  ctaPlacement: "below-content" as const,
                }
              : requirement,
      ),
    })),
  };

  assert.deepEqual(
    validateCampaignLandingPagePublishingPreview(invalidRenderModel).errors.map(
      (error) => ({
        code: error.code,
        layoutScope: error.guidance.layoutScope,
        primaryAction: error.guidance.actions[0],
      }),
    ),
    [
      {
        code: "landing-preview.desktop_layout_not_immersive",
        layoutScope: "desktop",
        primaryAction:
          "Use the immersive-desktop layout with source playback in the media region, continuation in the adjacent rail, and conversion controls in the side panel.",
      },
      {
        code: "landing-preview.mobile_layout_not_immersive",
        layoutScope: "mobile",
        primaryAction:
          "Use the single-column mobile layout with full-width media, same-page continuation below the source, and a sticky-bottom conversion action.",
      },
    ],
  );
});

test("publishing preview validation rejects landing previews that break short-form immersion", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });

  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_publish_preview_traditional",
    title: "Publishing preview traditional",
    pageType: "immersive",
    behavior: {
      mode: "traditional",
      preserveInlineContext: false,
      allowTraditionalRedirect: true,
    },
    navigation: {
      visibility: "visible",
      placement: "top-overlay",
      timing: "during-playback",
      interruptionBehavior: "block-until-complete",
    },
    conversionElements: [
      {
        id: "conversion_checkout",
        label: "Buy the kit",
        conversionEventName: "purchase",
        destinationUrl: "https://shop.example.test/checkout/kit",
        visibility: "visible",
        placement: "sticky-bottom",
        timing: "after-playback-start",
        interruptionBehavior: "block-until-complete",
      },
    ],
    modules: [sourceModule],
  });

  assert.deepEqual(
    validateCampaignLandingPagePublishingPreview(renderModel).errors.map(
      (error) => [error.ruleId, error.code, error.path],
    ),
    [
      [
        "inline-immersion-behavior",
        "landing-preview.inline_context_not_preserved",
        "behavior",
      ],
      [
        "non-blocking-page-chrome",
        "landing-preview.page_chrome_blocks_playback",
        "navigation.interruptionBehavior",
      ],
      [
        "non-blocking-page-chrome",
        "landing-preview.page_chrome_blocks_playback",
        "conversionElements.0.interruptionBehavior",
      ],
    ],
  );
});

test("campaign landing page authoring controls persist non-interruptive navigation and conversion behavior", () => {
  const campaign = createBlankCampaign();
  const configuredCampaign = setCampaignLandingPageAuthoringControls(campaign, {
    navigation: {
      visibility: "visible",
      placement: "inline",
      timing: "manual",
      interruptionBehavior: "non-blocking",
    },
    conversionElements: [
      {
        id: "conversion_primary_offer",
        label: "Open offer",
        conversionEventName: "purchase",
        destinationUrl: "https://shop.example.test/checkout",
        visibility: "visible",
        placement: "side-panel",
        timing: "after-playback-complete",
        interruptionBehavior: "non-blocking",
      },
    ],
  });

  assert.deepEqual(configuredCampaign.campaignSpec.landingPageNavigation, {
    visibility: "visible",
    placement: "inline",
    timing: "manual",
    interruptionBehavior: "non-blocking",
  });
  assert.deepEqual(configuredCampaign.campaignSpec.landingPageConversionElements, [
    {
      id: "conversion_primary_offer",
      label: "Open offer",
      conversionEventName: "purchase",
      destinationUrl: "https://shop.example.test/checkout",
      visibility: "visible",
      placement: "side-panel",
      timing: "after-playback-complete",
      interruptionBehavior: "non-blocking",
    },
  ]);

  const serializedSpec = JSON.parse(serializeCampaignSpecJson(configuredCampaign));

  assert.deepEqual(serializedSpec.landingPageNavigation, {
    visibility: "visible",
    placement: "inline",
    timing: "manual",
    interruptionBehavior: "non-blocking",
  });
  assert.deepEqual(serializedSpec.landingPageConversionElements, [
    {
      id: "conversion_primary_offer",
      label: "Open offer",
      conversionEventName: "purchase",
      destinationUrl: "https://shop.example.test/checkout",
      visibility: "visible",
      placement: "side-panel",
      timing: "after-playback-complete",
      interruptionBehavior: "non-blocking",
    },
  ]);

  const parsedEdit = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify(serializedSpec),
  );

  assert.equal(parsedEdit.valid, true);
  assert.deepEqual(
    parsedEdit.campaign.campaignSpec.landingPageNavigation,
    configuredCampaign.campaignSpec.landingPageNavigation,
  );
  assert.deepEqual(
    parsedEdit.campaign.campaignSpec.landingPageConversionElements,
    configuredCampaign.campaignSpec.landingPageConversionElements,
  );
});

test("landing page template schema selects immersion-preserving or traditional behavior", () => {
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });

  const templateSchema = {
    schemaVersion: "owncanvas.landing-page-template.v1" as const,
    id: "template_landing_behavior",
    title: "Landing behavior selection",
    pageType: "immersive" as const,
    behavior: {
      mode: "immersion-preserving" as const,
      preserveInlineContext: true,
      allowTraditionalRedirect: false,
    },
    modules: [sourceModule],
  };

  assert.deepEqual(validateCampaignLandingPageTemplateSchema(templateSchema), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(createCampaignLandingPageRenderModel(templateSchema).behavior, {
    mode: "immersion-preserving",
    preserveInlineContext: true,
    allowTraditionalRedirect: false,
  });

  const traditionalTemplateSchema = {
    ...templateSchema,
    id: "template_traditional_landing_behavior",
    behavior: {
      mode: "traditional" as const,
      preserveInlineContext: false,
      allowTraditionalRedirect: true,
    },
  };

  assert.deepEqual(
    createCampaignLandingPageRenderModel(traditionalTemplateSchema).behavior,
    {
      mode: "traditional",
      preserveInlineContext: false,
      allowTraditionalRedirect: true,
    },
  );
  assert.deepEqual(
    validateCampaignLandingPageTemplateSchema({
      ...templateSchema,
      behavior: {
        mode: "redirect-first",
        preserveInlineContext: true,
        allowTraditionalRedirect: false,
      },
    }).errors.map((error) => error.code),
    ["landing-template.behavior_configuration_invalid"],
  );
});

test("campaign landing behavior mode can be set before or after a landing template exists", () => {
  const blankCampaign = createBlankCampaign();
  const traditionalCampaign = setCampaignLandingPageBehaviorMode(
    blankCampaign,
    "traditional",
  );

  assert.deepEqual(
    traditionalCampaign.campaignSpec.landingPageBehavior,
    createCampaignLandingPageBehaviorConfiguration("traditional"),
  );
  assert.deepEqual(getCampaignLandingPageBehaviorConfiguration(traditionalCampaign), {
    mode: "traditional",
    preserveInlineContext: false,
    allowTraditionalRedirect: true,
  });
  assert.equal(
    JSON.parse(serializeCampaignSpecJson(traditionalCampaign))
      .landingPageBehavior.mode,
    "traditional",
  );

  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });
  const templatedCampaign: typeof traditionalCampaign = {
    ...traditionalCampaign,
    campaignSpec: {
      ...traditionalCampaign.campaignSpec,
      landingPageTemplate: {
        schemaVersion: "owncanvas.landing-page-template.v1" as const,
        id: "template_creator_landing",
        title: "Creator landing",
        pageType: "immersive" as const,
        modules: [sourceModule],
      },
    },
  };
  const immersionCampaign = setCampaignLandingPageBehaviorMode(
    templatedCampaign,
    "immersion-preserving",
  );

  assert.deepEqual(
    immersionCampaign.campaignSpec.landingPageBehavior,
    createCampaignLandingPageBehaviorConfiguration("immersion-preserving"),
  );
  assert.deepEqual(
    immersionCampaign.campaignSpec.landingPageTemplate?.behavior,
    createCampaignLandingPageBehaviorConfiguration("immersion-preserving"),
  );
  assert.equal(
    JSON.parse(serializeCampaignSpecJson(immersionCampaign))
      .landingPageTemplate.behavior.mode,
    "immersion-preserving",
  );
});

test("agent canvas edit actions can set the same landing behavior mode used by human authoring controls", () => {
  const blankCampaign = createBlankCampaign();
  const traditionalCampaign = applyCampaignCanvasEditAction(blankCampaign, {
    type: "campaign.landing.behavior.set",
    mode: "traditional",
  });

  assert.deepEqual(
    traditionalCampaign.campaignSpec.landingPageBehavior,
    createCampaignLandingPageBehaviorConfiguration("traditional"),
  );
  assert.deepEqual(
    traditionalCampaign.canvasState,
    blankCampaign.canvasState,
  );
  assert.equal(
    JSON.parse(serializeCampaignSpecJson(traditionalCampaign))
      .landingPageBehavior.mode,
    "traditional",
  );

  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_agent_source_short",
    label: "Agent source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_agent_source_short",
      sourceUrl: "https://cdn.example.test/agent-source-short.mp4",
      sourceAssetId: "asset_agent_source_short",
      embedMode: "native-player",
    },
  });
  const templatedCampaign: typeof traditionalCampaign = {
    ...traditionalCampaign,
    campaignSpec: {
      ...traditionalCampaign.campaignSpec,
      landingPageTemplate: {
        schemaVersion: "owncanvas.landing-page-template.v1" as const,
        id: "template_agent_creator_landing",
        title: "Agent creator landing",
        pageType: "immersive" as const,
        modules: [sourceModule],
      },
    },
  };
  const immersionCampaign = applyCampaignCanvasEditAction(templatedCampaign, {
    type: "campaign.landing.behavior.set",
    mode: "immersion-preserving",
  });

  assert.deepEqual(
    getCampaignLandingPageBehaviorConfiguration(immersionCampaign),
    createCampaignLandingPageBehaviorConfiguration("immersion-preserving"),
  );
  assert.deepEqual(
    immersionCampaign.campaignSpec.landingPageTemplate?.behavior,
    createCampaignLandingPageBehaviorConfiguration("immersion-preserving"),
  );
});

test("landing page exposure events capture rendered module impression attribution", () => {
  const storage = new MemoryStorage();
  const blankCampaign = createBlankCampaign();
  const campaign = {
    ...createBlankCampaignRecord(storage, {
      id: "campaign_landing_exposure_capture",
      now: () => "2026-05-11T05:00:00.000Z",
    }),
    productOffer: {
      ...blankCampaign.productOffer,
      product: {
        ...blankCampaign.productOffer.product,
        id: "product_creator_kit",
        title: "Creator Kit",
      },
      offer: {
        ...blankCampaign.productOffer.offer,
        headline: "Launch discount",
        destinationUrl: "https://shop.example.test/checkout",
      },
      attribution: {
        ...blankCampaign.productOffer.attribution,
        externalId: "offer_launch_discount",
      },
    },
    tracking: {
      ...blankCampaign.tracking,
      utm: {
        source: "instagram",
        medium: "dm",
        campaign: "creator-kit-launch",
        content: "hero-short",
        term: "creator-tools",
      },
    },
  };
  const sourceModule = createEmbeddedShortFormLandingPageTemplateModule({
    id: "module_source_short",
    label: "Source short",
    provider: {
      providerPluginId: "plugin.landing.native-player",
      providerKind: "built-in",
      sourcePlatform: "owncanvas",
      sourceType: "generated-asset",
      sourceContentId: "asset_source_short",
      sourceUrl: "https://cdn.example.test/source-short.mp4",
      sourceAssetId: "asset_source_short",
      embedMode: "native-player",
    },
  });
  const renderModel = createCampaignLandingPageRenderModel({
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: "template_landing_exposure_capture",
    title: "Landing exposure capture",
    pageType: "immersive",
    modules: [sourceModule],
  });
  const [renderedModule] = renderModel.modules;
  const sessionUrl =
    "https://go.example.test/campaigns/campaign_landing_exposure_capture/landing" +
    "?oc_session_id=session_render_1" +
    "&oc_channel_id=instagram_dm" +
    "&oc_touchpoint_id=comment_to_dm" +
    "&utm_source=instagram" +
    "&utm_medium=dm" +
    "&utm_campaign=creator-kit-launch" +
    "&utm_content=hero-short";
  const event = createCampaignLandingPageExposureEvent(campaign, renderedModule, {
    sessionUrl,
    occurredAt: "2026-05-11T05:01:00.000Z",
  });

  assert.deepEqual(event, {
    schemaVersion: "owncanvas.tracking-event.v1",
    type: "exposure",
    id:
      "event_exposure_campaign_landing_exposure_capture_module_source_short_session_render_1",
    campaignId: "campaign_landing_exposure_capture",
    sessionId: "session_render_1",
    context: {
      actor: "human",
      userId: "landing-viewer",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T05:01:00.000Z",
    content: {
      type: "short_video",
      id: "asset_source_short",
      nodeId: "module_source_short",
      channelId: "instagram_dm",
      assetId: "asset_source_short",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      metadata: {
        landingTemplateId: "landing_template_campaign_landing_exposure_capture",
        moduleType: "embedded-short-form-content",
        sourcePlatform: "owncanvas",
        embedMode: "native-player",
      },
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: "module_source_short",
      metadata: {
        nodeId: "module_source_short",
        outputPortId: "outputs.exposure",
        channelId: "instagram_dm",
        assetId: "asset_source_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: sessionUrl,
        label: "Source short",
        metadata: {
          landingTemplateId: "landing_template_campaign_landing_exposure_capture",
          touchpointId: "comment_to_dm",
        },
      },
    },
    exposure: {
      surface: "landing",
      placement: "short-form-render",
      viewId:
        "campaign_landing_exposure_capture:module_source_short:session_render_1",
    },
  });
});

test("validateCampaignPublishingConfiguration accepts complete channel configuration", () => {
  assert.deepEqual(
    validateCampaignPublishingConfiguration([
      createCampaignPublishingChannel({
        id: "pub_social_tiktok",
        type: "social",
        platform: "tiktok",
        label: "TikTok launch post",
        providerPluginId: "plugin.social.tiktok",
        account: {
          id: "tt_creator_123",
          handle: "@owncanvas",
        },
        placement: "short-form-post",
        destinationUrl: "https://go.example.com/tiktok",
        tracking: {
          utmSource: "tiktok",
          utmMedium: "social",
          utmCampaign: "creator-kit-launch",
          conversionEvent: "purchase",
        },
      }),
    ]),
    {
      valid: true,
      errors: [],
    },
  );
});

test("validateCampaignPublishingConfiguration reports destination schedule and tracking errors", () => {
  assert.deepEqual(
    validateCampaignPublishingConfiguration([
      createCampaignPublishingChannel({
        id: "",
        type: "direct-message",
        platform: "",
        label: "",
        placement: "",
        destinationUrl: "go.example.com/landing",
        schedule: {
          mode: "scheduled",
          startsAt: "not-a-date",
          timezone: "",
        },
        tracking: {
          utmSource: "",
          utmMedium: "",
          utmCampaign: "",
          conversionEvent: "",
        },
        status: "configured",
      }),
      createCampaignPublishingChannel({
        id: "",
        type: "landing",
        platform: "web",
        label: "Landing page",
        providerPluginId: "plugin.landing.web",
        placement: "bio-link",
        destinationUrl: "https://go.example.com/landing",
        tracking: {
          utmSource: "instagram",
          utmMedium: "landing",
          utmCampaign: "creator-kit-launch",
          conversionEvent: "purchase",
        },
        status: "configured",
      }),
    ]),
    {
      valid: false,
      errors: [
        {
          code: "channel.id_required",
          path: "channels.0.id",
          message: "Publishing channel id is required.",
        },
        {
          code: "channel.platform_required",
          path: "channels.0.platform",
          message: "Publishing platform is required.",
        },
        {
          code: "channel.label_required",
          path: "channels.0.label",
          message: "Publishing channel label is required.",
        },
        {
          code: "channel.provider_plugin_id_required",
          path: "channels.0.providerPluginId",
          message: "Publishing provider plugin id is required.",
        },
        {
          code: "channel.account_id_required",
          path: "channels.0.account.id",
          message: "Publishing account id is required for this channel type.",
        },
        {
          code: "channel.account_handle_required",
          path: "channels.0.account.handle",
          message: "Publishing account handle is required for this channel type.",
        },
        {
          code: "channel.placement_required",
          path: "channels.0.placement",
          message: "Publishing placement is required.",
        },
        {
          code: "channel.destination_url_invalid",
          path: "channels.0.destinationUrl",
          message: "Publishing destination URL must be a valid http or https URL.",
        },
        {
          code: "channel.landing_page_id_required",
          path: "channels.0.landingPageId",
          message:
            "Publishing landing page id is required for DM and landing channels.",
        },
        {
          code: "channel.schedule_starts_at_invalid",
          path: "channels.0.schedule.startsAt",
          message: "Publishing schedule start time must be a valid timestamp.",
        },
        {
          code: "channel.schedule_timezone_required",
          path: "channels.0.schedule.timezone",
          message: "Publishing schedule timezone is required.",
        },
        {
          code: "channel.utm_source_required",
          path: "channels.0.tracking.utmSource",
          message: "Publishing UTM source is required.",
        },
        {
          code: "channel.utm_medium_required",
          path: "channels.0.tracking.utmMedium",
          message: "Publishing UTM medium is required.",
        },
        {
          code: "channel.utm_campaign_required",
          path: "channels.0.tracking.utmCampaign",
          message: "Publishing UTM campaign is required.",
        },
        {
          code: "channel.conversion_event_required",
          path: "channels.0.tracking.conversionEvent",
          message: "Publishing conversion event is required.",
        },
        {
          code: "channel.id_required",
          path: "channels.1.id",
          message: "Publishing channel id is required.",
        },
        {
          code: "channel.landing_page_id_required",
          path: "channels.1.landingPageId",
          message:
            "Publishing landing page id is required for DM and landing channels.",
        },
      ],
    },
  );
});

test("createCampaignAsset records linked campaign assets with required metadata", () => {
  const asset = createCampaignAsset(
    {
      id: "asset_link_primary",
      source: "link",
      mediaType: "image",
      title: "Primary product reference",
      uri: "https://cdn.example.com/products/kit.jpg",
      usage: "product",
      altText: "Creator Starter Kit on a studio table",
      rights: {
        owner: "OwnCanvas Goods",
        license: "brand-owned",
        sourceUrl: "https://shop.example.com/products/kit",
      },
      createdBy: "human",
    },
    {
      now: () => "2026-05-11T01:00:00.000Z",
    },
  );

  assert.deepEqual(asset, {
    id: "asset_link_primary",
    source: "link",
    mediaType: "image",
    title: "Primary product reference",
    uri: "https://cdn.example.com/products/kit.jpg",
    usage: "product",
    status: "draft",
    altText: "Creator Starter Kit on a studio table",
    fileName: "",
    mimeType: "",
    sizeBytes: null,
    rights: {
      owner: "OwnCanvas Goods",
      license: "brand-owned",
      sourceUrl: "https://shop.example.com/products/kit",
    },
    createdBy: "human",
    createdAt: "2026-05-11T01:00:00.000Z",
  });
});

test("campaigns can add uploaded assets and persist required metadata", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_uploaded_assets",
    now: () => "2026-05-11T01:00:00.000Z",
  });
  const uploadedAsset = createCampaignAsset(
    {
      id: "asset_upload_video",
      source: "upload",
      mediaType: "video",
      title: "Unboxing reel source",
      uri: "blob:owncanvas/unboxing-reel",
      usage: "reference",
      fileName: "unboxing-reel.mp4",
      mimeType: "video/mp4",
      sizeBytes: 4821000,
      rights: {
        owner: "Creator Studio",
        license: "creator-approved",
      },
      createdBy: "agent",
    },
    {
      now: () => "2026-05-11T01:02:00.000Z",
    },
  );

  const campaignWithAsset = addCampaignAsset(campaign, uploadedAsset, {
    now: () => "2026-05-11T01:03:00.000Z",
  });
  const persistedCampaign = updatePersistedCampaignRecord(
    storage,
    campaignWithAsset,
    {
      now: () => "2026-05-11T01:04:00.000Z",
    },
  );

  assert.deepEqual(persistedCampaign.assets, [uploadedAsset]);
  assert.ok(
    persistedCampaign.logs.includes(
      "2026-05-11T01:03:00.000Z asset.added:asset_upload_video",
    ),
  );
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_uploaded_assets")?.assets,
    [uploadedAsset],
  );
});

test("campaigns can list asset summaries and view full asset details by id", () => {
  const campaign = createBlankCampaign();
  const primaryImage = createCampaignAsset(
    {
      id: "asset_primary_image",
      source: "link",
      mediaType: "image",
      title: "Primary product image",
      uri: "https://cdn.example.com/products/primary.jpg",
      usage: "product",
      status: "approved",
      altText: "Studio product image on a white background",
      rights: {
        owner: "OwnCanvas Goods",
        license: "brand-owned",
        sourceUrl: "https://shop.example.com/products/primary",
      },
      createdBy: "human",
    },
    {
      now: () => "2026-05-11T02:00:00.000Z",
    },
  );
  const generatedVideo = createCampaignAsset(
    {
      id: "asset_generated_video",
      source: "upload",
      mediaType: "video",
      title: "Generated unboxing variant",
      uri: "blob:owncanvas/generated-unboxing",
      usage: "generated",
      status: "ready",
      fileName: "generated-unboxing.mp4",
      mimeType: "video/mp4",
      sizeBytes: 2814000,
      rights: {
        owner: "Creator Studio",
        license: "campaign-use",
      },
      createdBy: "agent",
    },
    {
      now: () => "2026-05-11T02:01:00.000Z",
    },
  );
  const campaignWithAssets = {
    ...campaign,
    assets: [primaryImage, generatedVideo],
  };

  assert.deepEqual(listCampaignAssets(campaignWithAssets), [
    {
      id: "asset_primary_image",
      title: "Primary product image",
      source: "link",
      mediaType: "image",
      usage: "product",
      status: "approved",
      createdBy: "human",
      createdAt: "2026-05-11T02:00:00.000Z",
      rightsOwner: "OwnCanvas Goods",
    },
    {
      id: "asset_generated_video",
      title: "Generated unboxing variant",
      source: "upload",
      mediaType: "video",
      usage: "generated",
      status: "ready",
      createdBy: "agent",
      createdAt: "2026-05-11T02:01:00.000Z",
      rightsOwner: "Creator Studio",
    },
  ]);
  assert.deepEqual(
    getCampaignAssetDetails(campaignWithAssets, "asset_generated_video"),
    generatedVideo,
  );
  assert.equal(getCampaignAssetDetails(campaignWithAssets, "missing_asset"), null);
});

test("campaigns can edit, replace, and remove associated assets", () => {
  const originalAsset = createCampaignAsset(
    {
      id: "asset_primary_reference",
      source: "link",
      mediaType: "image",
      title: "Primary product reference",
      uri: "https://cdn.example.com/products/reference.jpg",
      usage: "reference",
      status: "draft",
      altText: "Reference image",
      rights: {
        owner: "Original Studio",
        license: "review-only",
        sourceUrl: "https://shop.example.com/products/reference",
      },
      createdBy: "human",
    },
    {
      now: () => "2026-05-11T03:00:00.000Z",
    },
  );
  const campaign = {
    ...createBlankCampaign(),
    assets: [originalAsset],
    logs: [] as string[],
    versions: [] as string[],
  };

  const editedCampaign = editCampaignAsset(
    campaign,
    "asset_primary_reference",
    {
      title: "Primary campaign product image",
      usage: "product",
      status: "ready",
      altText: "Studio product image with offer props",
      rights: {
        owner: "Brand Studio",
        license: "campaign-owned",
      },
    },
    {
      now: () => "2026-05-11T03:01:00.000Z",
    },
  );

  assert.deepEqual(editedCampaign.assets[0], {
    ...originalAsset,
    title: "Primary campaign product image",
    usage: "product",
    status: "ready",
    altText: "Studio product image with offer props",
    rights: {
      owner: "Brand Studio",
      license: "campaign-owned",
      sourceUrl: "https://shop.example.com/products/reference",
    },
  });
  assert.ok(
    editedCampaign.logs.includes(
      "2026-05-11T03:01:00.000Z asset.edited:asset_primary_reference",
    ),
  );

  const replacedCampaign = replaceCampaignAsset(
    editedCampaign,
    "asset_primary_reference",
    {
      source: "upload",
      mediaType: "video",
      title: "Primary campaign video",
      uri: "blob:owncanvas/primary-video",
      usage: "ad",
      status: "approved",
      fileName: "primary-video.mp4",
      mimeType: "video/mp4",
      sizeBytes: 3821000,
      rights: {
        sourceUrl: "",
      },
    },
    {
      now: () => "2026-05-11T03:02:00.000Z",
    },
  );

  assert.deepEqual(replacedCampaign.assets[0], {
    ...originalAsset,
    source: "upload",
    mediaType: "video",
    title: "Primary campaign video",
    uri: "blob:owncanvas/primary-video",
    usage: "ad",
    status: "approved",
    altText: "Studio product image with offer props",
    fileName: "primary-video.mp4",
    mimeType: "video/mp4",
    sizeBytes: 3821000,
    rights: {
      owner: "Brand Studio",
      license: "campaign-owned",
    },
  });
  assert.ok(
    replacedCampaign.versions.includes(
      "2026-05-11T03:02:00.000Z asset.replaced:asset_primary_reference",
    ),
  );

  const removedCampaign = removeCampaignAsset(
    replacedCampaign,
    "asset_primary_reference",
    {
      now: () => "2026-05-11T03:03:00.000Z",
    },
  );

  assert.deepEqual(removedCampaign.assets, []);
  assert.ok(
    removedCampaign.logs.includes(
      "2026-05-11T03:03:00.000Z asset.removed:asset_primary_reference",
    ),
  );
});

test("campaigns can archive associated assets without removing attribution history", () => {
  const generatedAsset = createCampaignAsset(
    {
      id: "asset_generated_variant",
      source: "upload",
      mediaType: "image",
      title: "Generated campaign image",
      uri: "blob:owncanvas/generated-campaign-image",
      usage: "generated",
      status: "ready",
      fileName: "generated-campaign-image.png",
      mimeType: "image/png",
      sizeBytes: 641000,
      rights: {
        owner: "Creator Studio",
        license: "campaign-use",
      },
      createdBy: "agent",
    },
    {
      now: () => "2026-05-11T04:00:00.000Z",
    },
  );
  const campaign = {
    ...createBlankCampaign(),
    assets: [generatedAsset],
    logs: [] as string[],
    versions: [] as string[],
  };

  const archivedCampaign = archiveCampaignAsset(
    campaign,
    "asset_generated_variant",
    {
      now: () => "2026-05-11T04:01:00.000Z",
    },
  );

  assert.deepEqual(archivedCampaign.assets, [
    {
      ...generatedAsset,
      status: "archived",
    },
  ]);
  assert.ok(
    archivedCampaign.logs.includes(
      "2026-05-11T04:01:00.000Z asset.archived:asset_generated_variant",
    ),
  );
  assert.ok(
    archivedCampaign.versions.includes(
      "2026-05-11T04:01:00.000Z asset.archived:asset_generated_variant",
    ),
  );
});

test("validateCampaignAssets rejects assets missing required metadata", () => {
  assert.deepEqual(
    validateCampaignAssets([
      createCampaignAsset({
        id: "",
        source: "link",
        mediaType: "image",
        title: "",
        uri: "cdn.example.com/image.jpg",
        usage: "product",
        rights: {
          owner: "",
          license: "",
          sourceUrl: "shop.example.com/product",
        },
        createdBy: "human",
      }),
    ]),
    {
      valid: false,
      errors: [
        {
          code: "asset.id_required",
          path: "assets.0.id",
          message: "Campaign asset id is required.",
        },
        {
          code: "asset.title_required",
          path: "assets.0.title",
          message: "Campaign asset title is required.",
        },
        {
          code: "asset.uri_invalid",
          path: "assets.0.uri",
          message: "Linked campaign asset URI must be a valid http or https URL.",
        },
        {
          code: "asset.rights_owner_required",
          path: "assets.0.rights.owner",
          message: "Campaign asset rights owner is required.",
        },
        {
          code: "asset.rights_source_url_invalid",
          path: "assets.0.rights.sourceUrl",
          message: "Campaign asset rights source URL must be a valid http or https URL.",
        },
      ],
    },
  );
});

test("createBlankCampaignRecord persists a blank campaign with required default metadata", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_test",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.equal(campaign.id, "campaign_test");
  assert.equal(campaign.createdAt, "2026-05-11T00:00:00.000Z");
  assert.equal(campaign.updatedAt, "2026-05-11T00:00:00.000Z");
  assert.equal(campaign.title, "Untitled campaign");
  assert.equal(campaign.objective, "");
  assert.equal(campaign.status, "draft");
  assert.deepEqual(campaign.logs, [
    "2026-05-11T00:00:00.000Z campaign.created",
  ]);
  assert.deepEqual(campaign.versions, [
    "2026-05-11T00:00:00.000Z draft.created",
  ]);
  assert.deepEqual(campaign.campaignSpec, {
    nodes: [],
    edges: [],
    assetGenerationJobs: [],
  });
  assert.deepEqual(campaign.canvasState, { nodes: [], edges: [] });

  assert.deepEqual(JSON.parse(storage.getItem(CAMPAIGN_STORAGE_KEY) ?? ""), [
    campaign,
  ]);
});

test("createBlankCampaignRecord initializes and persists an empty workspace state", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_workspace",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.deepEqual(
    JSON.parse(storage.getItem(CAMPAIGN_WORKSPACE_STORAGE_KEY) ?? ""),
    [{
      schemaVersion: "owncanvas.workspace.v1",
      id: campaign.workspaceState.workspaceId,
      campaignId: campaign.id,
      mode: "basic",
      activeTool: "select",
      canvas: {
        nodes: [],
        edges: [],
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        selectedNodeIds: [],
        selectedEdgeIds: [],
      },
      initializedAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    }],
  );
});

test("campaign improvement status waits until completed actions use measurement results", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_completed_improvement_cycle",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  saveCampaignMeasurementGoals(
    storage,
    "campaign_completed_improvement_cycle",
    [
      createCampaignMeasurementGoal({
        id: "goal_purchase_conversion",
        name: "purchase_conversion_rate",
        target: 4,
        unit: "percent",
        successCriteria: "Purchase conversion improves after the first report.",
        reportingTimeframe: {
          startsAt: "2026-05-11T00:00:00.000Z",
          endsAt: "2026-05-18T00:00:00.000Z",
          timezone: "UTC",
        },
      }),
    ],
  );

  const measuredCampaign = saveCampaignMeasurementMetrics(
    storage,
    "campaign_completed_improvement_cycle",
    [
      createCampaignMeasurementMetric({
        id: "metric_purchase_conversion_rate",
        metric: "purchase_conversion_rate",
        value: 4.6,
        unit: "percent",
        source: "plugin.tracking.active-conversion",
        attributionTouchpoint: "checkout",
        observedAt: "2026-05-12T00:00:00.000Z",
      }),
    ],
    { now: () => "2026-05-12T00:05:00.000Z" },
  );
  const actionCompletedWithoutMeasurementUsage = {
    ...measuredCampaign,
    tracking: {
      ...measuredCampaign.tracking,
      improvementActions: measuredCampaign.tracking.improvementActions?.map(
        (action) => ({ ...action, status: "completed" as const }),
      ),
    },
  };

  assert.deepEqual(
    getCampaignMeasurementBasedImprovementStatus(
      actionCompletedWithoutMeasurementUsage,
    ),
    {
      schemaVersion:
        "owncanvas.campaign-measurement-based-improvement-status.v1",
      state: "proposed",
      hasCompletedMeasurementBasedImprovementCycle: false,
      completedImprovementCycleCount: 0,
    },
  );

  const completedCampaign = {
    ...measuredCampaign,
    tracking: {
      ...measuredCampaign.tracking,
      improvementActions: measuredCampaign.tracking.improvementActions?.map(
        (action) => ({
          ...action,
          status: "completed" as const,
          measurementResultUsage: {
            schemaVersion:
              "owncanvas.campaign-measurement-result-usage.v1" as const,
            usedAt: "2026-05-12T00:30:00.000Z",
            usedMetricIds: ["metric_purchase_conversion_rate"],
            appliedChange:
              "Scaled the checkout path into the next campaign iteration.",
          },
        }),
      ),
    },
  };

  assert.deepEqual(getCampaignMeasurementBasedImprovementStatus(completedCampaign), {
    schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1",
    state: "completed",
    hasCompletedMeasurementBasedImprovementCycle: true,
    completedImprovementCycleCount: 1,
    latestCompletedMeasurementCycleId:
      "measurement_cycle_goal_purchase_conversion_2026_05_12T00_05_00_000Z",
    latestCompletedImprovementActionId:
      "improvement_measurement_cycle_goal_purchase_conversion_2026_05_12T00_05_00_000Z",
    completedAt: "2026-05-12T00:30:00.000Z",
  });
});

test("campaign completion stays blocked until measurement and improvement records both exist", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_completion_requires_measurement_and_improvement",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const incompleteCampaign = { ...campaign, status: "completed" as const };

  assert.deepEqual(validateCampaignCompletion(incompleteCampaign), {
    valid: false,
    errors: [
      {
        code: "campaign_completion.measurement_record_required",
        path: "tracking.measurementCycles",
        message:
          "Campaign completion requires at least one completed measurement record.",
      },
      {
        code: "campaign_completion.improvement_record_required",
        path: "tracking.improvementActions",
        message:
          "Campaign completion requires at least one completed improvement record.",
      },
    ],
  });
});

test("getPersistedCampaignRecord retrieves a newly created campaign by id", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_retrievable",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_retrievable"),
    campaign,
  );
  assert.equal(getPersistedCampaignRecord(storage, "missing_campaign"), null);
});

test("campaign retrieval APIs expose publishing channel summaries and details", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_publishing_retrieval",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const publishingChannel = createCampaignPublishingChannel({
    id: "pub_instagram_dm_landing",
    type: "direct-message",
    platform: "instagram",
    label: "Instagram comment to DM",
    providerPluginId: "plugin.dm.instagram",
    account: {
      id: "ig_creator_123",
      handle: "@owncanvas",
    },
    placement: "comment-trigger",
    destinationUrl: "https://go.example.com/creator-kit",
    landingPageId: "landing_creator_kit",
    schedule: {
      mode: "scheduled",
      startsAt: "2026-05-12T15:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
    tracking: {
      utmSource: "instagram",
      utmMedium: "dm",
      utmCampaign: "creator-kit-launch",
      utmContent: "comment-auto-reply",
      conversionEvent: "purchase",
    },
    status: "configured",
  });

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      channels: [publishingChannel],
    },
    {
      now: () => "2026-05-11T00:10:00.000Z",
    },
  );

  const retrievedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_publishing_retrieval",
  );

  assert.ok(retrievedCampaign);
  assert.deepEqual(listCampaignPublishingChannels(retrievedCampaign), [
    {
      id: "pub_instagram_dm_landing",
      type: "direct-message",
      platform: "instagram",
      label: "Instagram comment to DM",
      providerPluginId: "plugin.dm.instagram",
      accountHandle: "@owncanvas",
      placement: "comment-trigger",
      destinationUrl: "https://go.example.com/creator-kit",
      landingPageId: "landing_creator_kit",
      scheduleMode: "scheduled",
      startsAt: "2026-05-12T15:00:00.000Z",
      timezone: "America/Los_Angeles",
      utmSource: "instagram",
      utmMedium: "dm",
      utmCampaign: "creator-kit-launch",
      conversionEvent: "purchase",
      status: "configured",
    },
  ]);
  assert.deepEqual(
    getCampaignPublishingChannelDetails(
      retrievedCampaign,
      "pub_instagram_dm_landing",
    ),
    publishingChannel,
  );
  assert.equal(
    getCampaignPublishingChannelDetails(retrievedCampaign, "missing_channel"),
    null,
  );
});

test("newly created campaigns have a canvas route path", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_route",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.equal(getCampaignCanvasPath(campaign.id), "/campaigns/campaign_route/canvas");
});

test("persisted campaign links to its initialized workspace for retrieval", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_linked_workspace",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.deepEqual(campaign.workspaceState, {
    storageKey: CAMPAIGN_WORKSPACE_STORAGE_KEY,
    workspaceId: "workspace_campaign_linked_workspace",
    initializedAt: "2026-05-11T00:00:00.000Z",
  });
  assert.deepEqual(getPersistedCampaignWorkspaceState(storage, campaign.id), {
    schemaVersion: "owncanvas.workspace.v1",
    id: "workspace_campaign_linked_workspace",
    campaignId: campaign.id,
    mode: "basic",
    activeTool: "select",
    canvas: {
      nodes: [],
      edges: [],
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      selectedNodeIds: [],
      selectedEdgeIds: [],
    },
    initializedAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
  });
  assert.equal(
    getPersistedCampaignWorkspaceState(storage, "missing_campaign"),
    null,
  );
});

test("persisted campaign canvas state survives reloads and later campaign edits", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_canvas_state_round_trip",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const canvasEdge = {
    id: "edge_text_to_image",
    source: textNode.id,
    target: imageNode.id,
    label: "prompt",
  };
  const syncedCanvas = {
    nodes: [textNode, imageNode],
    edges: [canvasEdge],
  };
  const syncedCampaignSpec = {
    ...syncedCanvas,
    assetGenerationJobs: [],
  };

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: syncedCampaignSpec,
      canvasState: syncedCanvas,
    },
    {
      now: () => "2026-05-11T00:03:00.000Z",
    },
  );

  const campaignForViewing = getPersistedCampaignRecord(
    storage,
    "campaign_canvas_state_round_trip",
  );

  assert.ok(campaignForViewing);
  assert.deepEqual(campaignForViewing.campaignSpec, syncedCampaignSpec);
  assert.deepEqual(campaignForViewing.canvasState, syncedCanvas);
  assert.equal(campaignForViewing.updatedAt, "2026-05-11T00:03:00.000Z");

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaignForViewing,
      title: "Creator kit canvas test",
    },
    {
      now: () => "2026-05-11T00:06:00.000Z",
    },
  );

  const campaignForEditing = getPersistedCampaignRecord(
    storage,
    "campaign_canvas_state_round_trip",
  );

  assert.equal(campaignForEditing?.title, "Creator kit canvas test");
  assert.deepEqual(campaignForEditing?.campaignSpec, syncedCampaignSpec);
  assert.deepEqual(campaignForEditing?.canvasState, syncedCanvas);
});

test("canvas edit events update campaign spec and canvas state together", () => {
  const campaign = createBlankCampaign();
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const movedTextNode = {
    ...textNode,
    position: {
      x: 240,
      y: 320,
    },
  };

  const editedCampaign = createCampaignCanvasEdit(campaign, {
    nodes: [movedTextNode],
    edges: [],
  });

  assert.deepEqual(editedCampaign.canvasState, {
    nodes: [movedTextNode],
    edges: [],
  });
  assert.deepEqual(editedCampaign.campaignSpec, {
    nodes: [movedTextNode],
    edges: [],
    assetGenerationJobs: [],
  });
  assert.deepEqual(campaign.canvasState, {
    nodes: [],
    edges: [],
  });
});

test("canvas action edits immediately synchronize deterministic JSON spec updates", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 420, y: 160 });

  const campaignWithText = applyCampaignCanvasEditAction(createBlankCampaign(), {
    type: "canvas.node.create",
    node: textNode,
  });
  const campaignWithImage = applyCampaignCanvasEditAction(campaignWithText, {
    type: "canvas.node.create",
    node: imageNode,
  });
  const campaignWithUpdatedText = applyCampaignCanvasEditAction(
    campaignWithImage,
    {
      type: "canvas.node.update",
      nodeId: textNode.id,
      patch: {
        title: "Prompt brief",
        position: { x: 160, y: 220 },
        properties: {
          zeta: "later",
          alpha: {
            nestedZ: 2,
            nestedA: 1,
          },
        },
      },
    },
  );
  const editedCampaign = applyCampaignCanvasEditAction(
    campaignWithUpdatedText,
    {
      type: "canvas.edge.connect",
      edge: {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "prompt.out",
        target: imageNode.id,
        targetPort: "prompt.in",
        label: "prompt",
      },
    },
  );

  const expectedTextNode = {
    ...textNode,
    title: "Prompt brief",
    position: { x: 160, y: 220 },
    properties: {
      alpha: {
        nestedA: 1,
        nestedZ: 2,
      },
      zeta: "later",
    },
  };
  const expectedCanvas = {
    nodes: [expectedTextNode, imageNode],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "prompt.out",
        target: imageNode.id,
        targetPort: "prompt.in",
        label: "prompt",
      },
    ],
  };

  assert.deepEqual(editedCampaign.canvasState, expectedCanvas);
  assert.deepEqual(editedCampaign.campaignSpec, {
    ...expectedCanvas,
    assetGenerationJobs: [],
  });
  const serializedSpec = serializeCampaignSpecJson(editedCampaign);

  assert.equal(serializedSpec, serializeCampaignSpecJson(editedCampaign));
  assert.deepEqual(JSON.parse(serializedSpec), {
    nodes: expectedCanvas.nodes,
    edges: expectedCanvas.edges,
    assetGenerationJobs: [],
  });
});

test("canvas node deletion deterministically removes dependent edges from JSON spec", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 420, y: 160 });
  const landingNode = createCampaignBlock("landing", 2, { x: 720, y: 160 });
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode, imageNode, landingNode],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "prompt.out",
        target: imageNode.id,
        targetPort: "prompt.in",
        label: "prompt",
      },
      {
        id: "edge_image_to_landing",
        source: imageNode.id,
        sourcePort: "asset.out",
        target: landingNode.id,
        targetPort: "hero.in",
        label: "hero asset",
      },
    ],
  });

  const editedCampaign = applyCampaignCanvasEditAction(campaign, {
    type: "canvas.node.delete",
    nodeId: imageNode.id,
  });

  const expectedCanvas = {
    nodes: [textNode, landingNode],
    edges: [],
  };

  assert.deepEqual(editedCampaign.canvasState, expectedCanvas);
  assert.deepEqual(editedCampaign.campaignSpec, {
    ...expectedCanvas,
    assetGenerationJobs: [],
  });
  const serializedSpec = serializeCampaignSpecJson(editedCampaign);

  assert.equal(serializedSpec, serializeCampaignSpecJson(editedCampaign));
  assert.deepEqual(JSON.parse(serializedSpec), {
    nodes: expectedCanvas.nodes,
    edges: [],
    assetGenerationJobs: [],
  });
});

test("canvas node reorder deterministically synchronizes node order into JSON spec", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 420, y: 160 });
  const landingNode = createCampaignBlock("landing", 2, { x: 720, y: 160 });
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode, imageNode, landingNode],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "prompt.out",
        target: imageNode.id,
        targetPort: "prompt.in",
        label: "prompt",
      },
      {
        id: "edge_image_to_landing",
        source: imageNode.id,
        sourcePort: "asset.out",
        target: landingNode.id,
        targetPort: "hero.in",
        label: "hero asset",
      },
    ],
  });

  const editedCampaign = applyCampaignCanvasEditAction(campaign, {
    type: "canvas.node.reorder",
    nodeIds: [landingNode.id, textNode.id, imageNode.id],
  });

  const expectedCanvas = {
    nodes: [landingNode, textNode, imageNode],
    edges: campaign.canvasState.edges,
  };

  assert.deepEqual(editedCampaign.canvasState, expectedCanvas);
  assert.deepEqual(editedCampaign.campaignSpec, {
    ...expectedCanvas,
    assetGenerationJobs: [],
  });
  assert.deepEqual(JSON.parse(serializeCampaignSpecJson(editedCampaign)), {
    nodes: [landingNode, textNode, imageNode],
    edges: campaign.canvasState.edges,
    assetGenerationJobs: [],
  });
  assert.deepEqual(campaign.canvasState.nodes, [
    textNode,
    imageNode,
    landingNode,
  ]);
});

test("canvas edit validation rejects malformed JSON structure before sync", () => {
  assert.deepEqual(
    validateCampaignCanvasEdit({
      nodes: [
        {
          id: "",
          kind: "prompt",
          title: "Bad node",
          position: { x: Number.NaN, y: 0 },
        },
      ],
      edges: [
        {
          id: "edge_missing_target",
          source: "node_a",
          target: "",
        },
      ],
    }),
    {
      valid: false,
      errors: [
        {
          code: "canvas.node_id_required",
          path: "canvas.nodes.0.id",
          message: "Canvas node id is required.",
        },
        {
          code: "canvas.node_kind_invalid",
          path: "canvas.nodes.0.kind",
          message: "Canvas node kind or type must be a supported campaign node type.",
        },
        {
          code: "canvas.node_position_invalid",
          path: "canvas.nodes.0.position.x",
          message: "Canvas node position must use finite x and y numbers.",
        },
        {
          code: "canvas.edge_target_required",
          path: "canvas.edges.0.target",
          message: "Canvas edge target is required.",
        },
        {
          code: "canvas.edge_source_missing",
          path: "canvas.edges.0.source",
          message: "Canvas edge source must reference an existing node.",
        },
      ],
    },
  );
});

test("canvas edit sync normalizes JSON spec structure and preserves generation jobs", () => {
  const campaign = createBlankCampaign();
  const existingJob = createCampaignAssetGenerationJob({
    id: "job_bulk_images",
    mediaType: "image",
    providerPluginId: "plugin.provider.openai-media",
    capabilityId: "cap.bulk-image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_generated_image_1",
        field: "uri",
      },
    ],
  });
  const textNode = createCampaignBlock("text", 0, { x: 50, y: 60 });
  const imageNode = {
    id: "image_custom",
    kind: "image",
    title: "Image variants",
    position: { x: 300, y: 80 },
  };
  const imageDefaults = createCampaignBlock("image", 1);

  const editedCampaign = createCampaignCanvasEdit(
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        assetGenerationJobs: [existingJob],
      },
    },
    {
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          target: imageNode.id,
        },
      ],
    },
  );

  const normalizedImageNode = {
    ...imageNode,
    subtitle: imageDefaults.subtitle,
    description: imageDefaults.description,
    tone: imageDefaults.tone,
    status: imageDefaults.status,
    contracts: imageDefaults.contracts,
    id: "image_custom",
    title: "Image variants",
    position: { x: 300, y: 80 },
  };

  assert.deepEqual(editedCampaign.canvasState, {
    nodes: [textNode, normalizedImageNode],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        target: imageNode.id,
        label: "",
      },
    ],
  });
  assert.deepEqual(editedCampaign.campaignSpec, {
    nodes: [textNode, normalizedImageNode],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        target: imageNode.id,
        label: "",
      },
    ],
    assetGenerationJobs: [existingJob],
  });
});

test("campaign spec JSON edit reports parse errors without updating the canvas", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode],
    edges: [],
  });

  const result = parseCampaignSpecJsonEdit(
    campaign,
    `{"nodes":[{"id":"image_block_2","kind":"image","position":{"x":320,"y":120}}],`,
  );

  assert.deepEqual(result, {
    valid: false,
    campaign,
    errors: [
      {
        code: "campaign_spec.json_invalid",
        path: "campaignSpec",
        message: "Campaign spec JSON is invalid.",
      },
    ],
  });
  assert.deepEqual(campaign.canvasState, {
    nodes: [textNode],
    edges: [],
  });
  assert.deepEqual(campaign.campaignSpec.nodes, [textNode]);
});

test("campaign spec JSON streaming edits do not commit parseable partial frames", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode, imageNode],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "prompt.out",
        target: imageNode.id,
        targetPort: "prompt.in",
        label: "prompt",
      },
    ],
  });

  const partialResult = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [],
      edges: [],
      assetGenerationJobs: [],
    }),
    { commit: false },
  );

  assert.equal(partialResult.valid, false);
  assert.deepEqual(partialResult.campaign, campaign);
  assert.deepEqual(partialResult.errors, [
    {
      code: "campaign_spec.json_incomplete",
      path: "campaignSpec",
      message: "Campaign spec JSON input is incomplete.",
    },
  ]);

  const finalResult = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [textNode],
      edges: [],
      assetGenerationJobs: [],
    }),
    { commit: true },
  );

  assert.equal(finalResult.valid, true);
  assert.deepEqual(finalResult.campaign.canvasState, {
    nodes: [textNode],
    edges: [],
  });
});

test("campaign spec JSON edit reports validation errors without updating the canvas", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode],
    edges: [],
  });

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [
        {
          id: "image_block_2",
          kind: "image",
          position: { x: 320, y: 120 },
        },
      ],
      edges: [
        {
          id: "edge_missing_source",
          source: "missing_text",
          target: "image_block_2",
        },
      ],
      assetGenerationJobs: {},
    }),
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.campaign, campaign);
  assert.deepEqual(result.errors, [
    {
      code: "canvas.edge_source_missing",
      path: "canvas.edges.0.source",
      message: "Canvas edge source must reference an existing node.",
    },
    {
      code: "asset_generation_job.list_required",
      path: "campaignSpec.assetGenerationJobs",
      message: "Asset generation jobs must be an array.",
    },
  ]);
  assert.deepEqual(campaign.canvasState, {
    nodes: [textNode],
    edges: [],
  });
  assert.deepEqual(campaign.campaignSpec.nodes, [textNode]);
});

test("campaign spec JSON edit rejects schema-invalid asset jobs before canvas sync", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode],
    edges: [],
  });

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [
        {
          id: "image_block_2",
          kind: "image",
          position: { x: 320, y: 120 },
        },
      ],
      edges: [],
      assetGenerationJobs: [
        null,
        {
          id: 123,
          mediaType: "image",
          providerPluginId: false,
          capabilityId: "",
          requiredInputs: [0],
          outputTargets: [null],
          status: "draft",
        },
      ],
    }),
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.campaign, campaign);
  assert.deepEqual(result.errors, [
    {
      code: "asset_generation_job.object_required",
      path: "campaignSpec.assetGenerationJobs.0",
      message: "Asset generation jobs must be objects.",
    },
    {
      code: "asset_generation_job.id_required",
      path: "campaignSpec.assetGenerationJobs.1.id",
      message: "Asset generation job id is required.",
    },
    {
      code: "asset_generation_job.provider_plugin_id_required",
      path: "campaignSpec.assetGenerationJobs.1.providerPluginId",
      message: "Asset generation job provider plugin id is required.",
    },
    {
      code: "asset_generation_job.capability_id_required",
      path: "campaignSpec.assetGenerationJobs.1.capabilityId",
      message: "Asset generation job capability id is required.",
    },
    {
      code: "asset_generation_job.required_input_key_required",
      path: "campaignSpec.assetGenerationJobs.1.requiredInputs.0.key",
      message: "Asset generation required input key is required.",
    },
    {
      code: "asset_generation_job.required_input_source_required",
      path: "campaignSpec.assetGenerationJobs.1.requiredInputs.0.source",
      message: "Asset generation required input source is required.",
    },
    {
      code: "asset_generation_job.output_target_asset_id_required",
      path: "campaignSpec.assetGenerationJobs.1.outputTargets.0.assetId",
      message: "Asset generation output target asset id is required.",
    },
    {
      code: "asset_generation_job.output_target_field_required",
      path: "campaignSpec.assetGenerationJobs.1.outputTargets.0.field",
      message: "Asset generation output target field is required.",
    },
  ]);
  assert.deepEqual(campaign.canvasState, {
    nodes: [textNode],
    edges: [],
  });
  assert.deepEqual(campaign.campaignSpec.nodes, [textNode]);
});

test("valid campaign spec JSON edit synchronizes canvas state and canonical spec", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const existingJob = createCampaignAssetGenerationJob({
    id: "job_parallel_images",
    mediaType: "image",
    providerPluginId: "plugin.provider.openai-media",
    capabilityId: "cap.bulk-image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_generated_image_1",
        field: "uri",
      },
    ],
  });
  const campaign = {
    ...createCampaignCanvasEdit(createBlankCampaign(), {
      nodes: [textNode],
      edges: [],
    }),
    campaignSpec: {
      nodes: [textNode],
      edges: [],
      assetGenerationJobs: [existingJob],
    },
  };
  const edge = {
    id: "edge_prompt_to_image",
    source: textNode.id,
    target: imageNode.id,
    label: "prompt",
  };

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [textNode, imageNode],
      edges: [edge],
      assetGenerationJobs: [],
    }),
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.campaign.canvasState, {
    nodes: [textNode, imageNode],
    edges: [edge],
  });
  assert.deepEqual(result.campaign.campaignSpec, {
    nodes: [textNode, imageNode],
    edges: [edge],
    assetGenerationJobs: [],
  });
  assert.deepEqual(campaign.canvasState, {
    nodes: [textNode],
    edges: [],
  });
});

test("campaign spec JSON edits preserve existing node positions when layout is omitted", () => {
  const textNode = createCampaignBlock("text", 0, { x: 180, y: 260 });
  const imageNode = createCampaignBlock("image", 1, { x: 620, y: 340 });
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode, imageNode],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "outputs.prompt",
        target: imageNode.id,
        targetPort: "inputs.prompt",
        label: "prompt",
      },
    ],
  });

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [
        {
          id: textNode.id,
          kind: textNode.kind,
          title: "Updated prompt brief",
        },
        {
          id: imageNode.id,
          kind: imageNode.kind,
          title: "Updated image variants",
        },
      ],
      edges: campaign.canvasState.edges,
    }),
  );

  const expectedTextNode = {
    ...createCampaignBlock("text", 0, textNode.position),
    id: textNode.id,
    title: "Updated prompt brief",
  };
  const expectedImageNode = {
    ...createCampaignBlock("image", 1, imageNode.position),
    id: imageNode.id,
    title: "Updated image variants",
  };

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.campaign.canvasState.nodes, [
    expectedTextNode,
    expectedImageNode,
  ]);
  assert.deepEqual(result.campaign.campaignSpec.nodes, [
    expectedTextNode,
    expectedImageNode,
  ]);
});

test("campaign spec JSON edits preserve existing node configuration properties when unrelated fields change", () => {
  const imageNode = {
    ...createCampaignBlock("image", 0, { x: 220, y: 180 }),
    id: "image_bulk_generator",
    title: "Image variants",
    properties: {
      providerPluginId: "plugin.provider.openai-media",
      capabilityId: "cap.bulk-image",
      mode: "advanced",
      configuration: {
        promptTemplate: "Create four shoppable lifestyle frames.",
        variantCount: 4,
        safety: {
          requireHumanApproval: true,
        },
      },
    },
  };
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [imageNode],
    edges: [],
  });

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [
        {
          id: imageNode.id,
          kind: imageNode.kind,
          title: "Updated image variants",
        },
      ],
      edges: [],
    }),
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.campaign.canvasState.nodes[0]?.properties, {
    capabilityId: "cap.bulk-image",
    configuration: {
      promptTemplate: "Create four shoppable lifestyle frames.",
      safety: {
        requireHumanApproval: true,
      },
      variantCount: 4,
    },
    mode: "advanced",
    providerPluginId: "plugin.provider.openai-media",
  });
  assert.equal(
    result.campaign.canvasState.nodes[0]?.title,
    "Updated image variants",
  );
  assert.deepEqual(
    result.campaign.campaignSpec.nodes,
    result.campaign.canvasState.nodes,
  );
});

test("campaign spec JSON structural edits are detected and applied to the canvas graph", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const landingNode = createCampaignBlock("landing", 2, { x: 920, y: 160 });
  const videoNode = createCampaignBlock("video", 3, { x: 520, y: 360 });
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode, imageNode, landingNode],
    edges: [
      {
        id: "edge_prompt_to_media",
        source: textNode.id,
        sourcePort: "outputs.prompt",
        target: imageNode.id,
        targetPort: "inputs.prompt",
        label: "image prompt",
      },
      {
        id: "edge_media_to_landing",
        source: imageNode.id,
        sourcePort: "outputs.asset",
        target: landingNode.id,
        targetPort: "inputs.hero",
        label: "hero image",
      },
    ],
  });
  const updatedTextNode = {
    ...textNode,
    title: "Campaign prompt brief",
    position: { x: 180, y: 220 },
    properties: {
      channel: "instagram",
    },
  };
  const updatedPromptEdge = {
    id: "edge_prompt_to_media",
    source: textNode.id,
    sourcePort: "outputs.storyboard",
    target: videoNode.id,
    targetPort: "inputs.prompt",
    label: "video prompt",
  };
  const landingEdge = {
    id: "edge_video_to_landing",
    source: videoNode.id,
    sourcePort: "outputs.asset",
    target: landingNode.id,
    targetPort: "inputs.hero",
    label: "hero video",
  };

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [updatedTextNode, landingNode, videoNode],
      edges: [updatedPromptEdge, landingEdge],
    }),
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.structuralEdits, [
    { type: "canvas.node.update", nodeId: textNode.id },
    { type: "canvas.node.delete", nodeId: imageNode.id },
    { type: "canvas.node.create", nodeId: videoNode.id },
    { type: "canvas.edge.connect", edgeId: "edge_prompt_to_media" },
    { type: "canvas.edge.disconnect", edgeId: "edge_media_to_landing" },
    { type: "canvas.edge.connect", edgeId: "edge_video_to_landing" },
  ]);
  assert.deepEqual(result.campaign.canvasState, {
    nodes: [updatedTextNode, landingNode, videoNode],
    edges: [updatedPromptEdge, landingEdge],
  });
  assert.deepEqual(result.campaign.campaignSpec, {
    nodes: [updatedTextNode, landingNode, videoNode],
    edges: [updatedPromptEdge, landingEdge],
    assetGenerationJobs: [],
  });
});

test("campaign spec JSON node deletion removes dependent edges from the canvas graph", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const landingNode = createCampaignBlock("landing", 2, { x: 920, y: 160 });
  const promptEdge = {
    id: "edge_prompt_to_image",
    source: textNode.id,
    sourcePort: "outputs.prompt",
    target: imageNode.id,
    targetPort: "inputs.prompt",
    label: "image prompt",
  };
  const landingEdge = {
    id: "edge_image_to_landing",
    source: imageNode.id,
    sourcePort: "outputs.asset",
    target: landingNode.id,
    targetPort: "inputs.hero",
    label: "hero image",
  };
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode, imageNode, landingNode],
    edges: [promptEdge, landingEdge],
  });

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [textNode, landingNode],
      edges: [],
      assetGenerationJobs: [],
    }),
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.structuralEdits, [
    { type: "canvas.node.delete", nodeId: imageNode.id },
    { type: "canvas.edge.disconnect", edgeId: promptEdge.id },
    { type: "canvas.edge.disconnect", edgeId: landingEdge.id },
  ]);
  assert.deepEqual(result.campaign.canvasState, {
    nodes: [textNode, landingNode],
    edges: [],
  });
  assert.deepEqual(result.campaign.campaignSpec, {
    nodes: [textNode, landingNode],
    edges: [],
    assetGenerationJobs: [],
  });
  assert.deepEqual(campaign.canvasState.nodes, [
    textNode,
    imageNode,
    landingNode,
  ]);
});

test("campaign spec JSON node reorder projects the new order to the canvas graph", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const landingNode = createCampaignBlock("landing", 2, { x: 920, y: 160 });
  const edges = [
    {
      id: "edge_prompt_to_image",
      source: textNode.id,
      sourcePort: "outputs.prompt",
      target: imageNode.id,
      targetPort: "inputs.prompt",
      label: "image prompt",
    },
    {
      id: "edge_image_to_landing",
      source: imageNode.id,
      sourcePort: "outputs.asset",
      target: landingNode.id,
      targetPort: "inputs.hero",
      label: "hero image",
    },
  ];
  const campaign = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode, imageNode, landingNode],
    edges,
  });

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [landingNode, textNode, imageNode],
      edges,
      assetGenerationJobs: [],
    }),
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.structuralEdits, [
    {
      type: "canvas.node.reorder",
      nodeIds: [landingNode.id, textNode.id, imageNode.id],
    },
  ]);
  assert.deepEqual(result.campaign.canvasState, {
    nodes: [landingNode, textNode, imageNode],
    edges,
  });
  assert.deepEqual(result.campaign.campaignSpec, {
    nodes: [landingNode, textNode, imageNode],
    edges,
    assetGenerationJobs: [],
  });
  assert.deepEqual(campaign.canvasState.nodes, [
    textNode,
    imageNode,
    landingNode,
  ]);
});

test("repeated canvas and JSON edits converge without stale state or update loops", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const landingNode = createCampaignBlock("landing", 2, { x: 920, y: 160 });
  const campaignWithNodes = createCampaignCanvasEdit(createBlankCampaign(), {
    nodes: [textNode, imageNode],
    edges: [],
  });
  const campaignAfterCanvasEdit = applyCampaignCanvasEditAction(
    campaignWithNodes,
    {
      type: "canvas.edge.connect",
      edge: {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "outputs.prompt",
        target: imageNode.id,
        targetPort: "inputs.prompt",
        label: "prompt",
      },
    },
  );
  const jsonEdit = JSON.stringify({
    nodes: [
      textNode,
      {
        ...imageNode,
        title: "Bulk image generator",
        position: { x: 620, y: 220 },
      },
      landingNode,
    ],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "outputs.prompt",
        target: imageNode.id,
        targetPort: "inputs.prompt",
        label: "prompt",
      },
      {
        id: "edge_image_to_landing",
        source: imageNode.id,
        sourcePort: "outputs.asset",
        target: landingNode.id,
        targetPort: "inputs.hero",
        label: "landing hero",
      },
    ],
  });

  const firstJsonResult = parseCampaignSpecJsonEdit(
    campaignAfterCanvasEdit,
    jsonEdit,
  );

  assert.equal(firstJsonResult.valid, true);
  assert.deepEqual(firstJsonResult.structuralEdits, [
    { type: "canvas.node.update", nodeId: imageNode.id },
    { type: "canvas.node.create", nodeId: landingNode.id },
    { type: "canvas.edge.connect", edgeId: "edge_image_to_landing" },
  ]);

  const canonicalJson = serializeCampaignSpecJson(firstJsonResult.campaign);
  const replayResult = parseCampaignSpecJsonEdit(
    firstJsonResult.campaign,
    canonicalJson,
  );

  assert.equal(replayResult.valid, true);
  assert.deepEqual(replayResult.structuralEdits, []);
  assert.strictEqual(replayResult.campaign, firstJsonResult.campaign);
  assert.equal(serializeCampaignSpecJson(replayResult.campaign), canonicalJson);
  assert.deepEqual(replayResult.campaign.canvasState, {
    nodes: replayResult.campaign.campaignSpec.nodes,
    edges: replayResult.campaign.campaignSpec.edges,
  });
});

test("valid campaign spec node definitions map to canvas nodes with labels, types, positions, and properties", () => {
  const campaign = createBlankCampaign();

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [
        {
          id: "llm_brief_writer",
          type: "llm",
          label: "Brief writer",
          position: { x: 120, y: 140 },
          properties: {
            model: "gpt-4.1",
            prompt: "Write campaign angles",
          },
        },
        {
          id: "dm_instagram_handoff",
          type: "dm",
          label: "Instagram DM",
          title: "Instagram DM handoff",
          position: { x: 500, y: 140 },
          properties: {
            accountId: "ig_123",
            trigger: "comment.keyword",
          },
        },
        {
          id: "landing_checkout",
          type: "landing",
          label: "Offer landing",
          position: { x: 880, y: 140 },
          properties: {
            checkoutUrl: "https://shop.example.com/checkout",
            conversionEvent: "purchase",
          },
        },
      ],
      edges: [
        {
          id: "edge_brief_to_dm",
          source: "llm_brief_writer",
          sourcePort: "outputs.copy",
          target: "dm_instagram_handoff",
          targetPort: "inputs.message",
          label: "message copy",
        },
        {
          id: "edge_dm_to_landing",
          source: "dm_instagram_handoff",
          sourcePort: "outputs.link",
          target: "landing_checkout",
          targetPort: "inputs.visitor",
          label: "tracked visit",
        },
      ],
    }),
  );

  const expectedNodes = [
    {
      ...createCampaignBlock("llm", 0, { x: 120, y: 140 }),
      id: "llm_brief_writer",
      type: "llm",
      label: "Brief writer",
      title: "Brief writer",
      properties: {
        model: "gpt-4.1",
        prompt: "Write campaign angles",
      },
    },
    {
      ...createCampaignBlock("dm", 1, { x: 500, y: 140 }),
      id: "dm_instagram_handoff",
      type: "dm",
      label: "Instagram DM",
      title: "Instagram DM handoff",
      properties: {
        accountId: "ig_123",
        trigger: "comment.keyword",
      },
    },
    {
      ...createCampaignBlock("landing", 2, { x: 880, y: 140 }),
      id: "landing_checkout",
      type: "landing",
      label: "Offer landing",
      title: "Offer landing",
      properties: {
        checkoutUrl: "https://shop.example.com/checkout",
        conversionEvent: "purchase",
      },
    },
  ];
  const expectedEdges = [
    {
      id: "edge_brief_to_dm",
      source: "llm_brief_writer",
      sourcePort: "outputs.copy",
      target: "dm_instagram_handoff",
      targetPort: "inputs.message",
      label: "message copy",
    },
    {
      id: "edge_dm_to_landing",
      source: "dm_instagram_handoff",
      sourcePort: "outputs.link",
      target: "landing_checkout",
      targetPort: "inputs.visitor",
      label: "tracked visit",
    },
  ];

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.campaign.canvasState, {
    nodes: expectedNodes,
    edges: expectedEdges,
  });
  assert.deepEqual(result.campaign.campaignSpec, {
    nodes: expectedNodes,
    edges: expectedEdges,
    assetGenerationJobs: [],
  });
});

test("valid campaign spec edge definitions map to canvas edges with types and properties", () => {
  const campaign = createBlankCampaign();
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 140 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 140 });

  const result = parseCampaignSpecJsonEdit(
    campaign,
    JSON.stringify({
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          sourcePort: "outputs.prompt",
          target: imageNode.id,
          targetPort: "inputs.prompt",
          type: "asset-generation",
          label: "prompt variants",
          properties: {
            attributionTouchpoint: "creative.prompt",
            required: true,
            retryPolicy: {
              maxAttempts: 2,
            },
          },
        },
      ],
    }),
  );

  const expectedEdges = [
    {
      id: "edge_prompt_to_image",
      source: textNode.id,
      sourcePort: "outputs.prompt",
      target: imageNode.id,
      targetPort: "inputs.prompt",
      type: "asset-generation",
      label: "prompt variants",
      properties: {
        attributionTouchpoint: "creative.prompt",
        required: true,
        retryPolicy: {
          maxAttempts: 2,
        },
      },
    },
  ];

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.campaign.canvasState.edges, expectedEdges);
  assert.deepEqual(result.campaign.campaignSpec.edges, expectedEdges);
});

test("supported canvas edit actions map deterministically to JSON spec mutations", () => {
  const existingJob = createCampaignAssetGenerationJob({
    id: "job_bulk_images",
    mediaType: "image",
    providerPluginId: "plugin.provider.openai-media",
    capabilityId: "cap.bulk-image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_generated_image_1",
        field: "uri",
      },
    ],
  });
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const voiceNode = createCampaignBlock("voice", 2, { x: 520, y: 380 });
  const campaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode],
      edges: [],
      assetGenerationJobs: [existingJob],
    },
    canvasState: {
      nodes: [textNode],
      edges: [],
    },
  };

  const withImage = applyCampaignCanvasEditAction(campaign, {
    type: "canvas.node.create",
    node: imageNode,
  });
  const withMovedImage = applyCampaignCanvasEditAction(withImage, {
    type: "canvas.node.update",
    nodeId: imageNode.id,
    patch: {
      title: "Image variants",
      position: { x: 640, y: 220 },
    },
  });
  const withPromptEdge = applyCampaignCanvasEditAction(withMovedImage, {
    type: "canvas.edge.connect",
    edge: {
      id: "edge_prompt_to_image",
      source: textNode.id,
      sourcePort: "outputs.prompt",
      target: imageNode.id,
      targetPort: "inputs.prompt",
      label: "prompt",
    },
  });
  const withVoice = applyCampaignCanvasEditAction(withPromptEdge, {
    type: "canvas.node.create",
    node: voiceNode,
  });
  const withoutPromptEdge = applyCampaignCanvasEditAction(withVoice, {
    type: "canvas.edge.disconnect",
    edgeId: "edge_prompt_to_image",
  });
  const withoutVoice = applyCampaignCanvasEditAction(withoutPromptEdge, {
    type: "canvas.node.delete",
    nodeId: voiceNode.id,
  });

  const expectedImageNode = {
    ...imageNode,
    title: "Image variants",
    position: { x: 640, y: 220 },
  };

  assert.deepEqual(withoutVoice.canvasState, {
    nodes: [textNode, expectedImageNode],
    edges: [],
  });
  assert.deepEqual(withoutVoice.campaignSpec, {
    nodes: [textNode, expectedImageNode],
    edges: [],
    assetGenerationJobs: [existingJob],
  });
  assert.deepEqual(withPromptEdge.campaignSpec.edges, [
    {
      id: "edge_prompt_to_image",
      source: textNode.id,
      sourcePort: "outputs.prompt",
      target: imageNode.id,
      targetPort: "inputs.prompt",
      label: "prompt",
    },
  ]);
  assert.deepEqual(campaign.canvasState.nodes, [textNode]);
});

test("campaign spec serialization is stable for identical canvas edit sequences", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const campaign = createBlankCampaign();
  const actions = [
    {
      type: "canvas.node.create",
      node: {
        ...textNode,
        contracts: [
          {
            value: "node:text_block_1.outputs.prompt",
            state: "READY",
            label: "Prompt",
          },
        ],
      },
    },
    {
      type: "canvas.node.create",
      node: {
        contracts: [],
        position: imageNode.position,
        status: imageNode.status,
        tone: imageNode.tone,
        description: imageNode.description,
        subtitle: imageNode.subtitle,
        title: imageNode.title,
        kind: imageNode.kind,
        id: imageNode.id,
      },
    },
    {
      type: "canvas.edge.connect",
      edge: {
        targetPort: "inputs.prompt",
        sourcePort: "outputs.prompt",
        label: "prompt",
        target: imageNode.id,
        source: textNode.id,
        id: "edge_prompt_to_image",
      },
    },
  ] as const;

  const firstCampaign = actions.reduce<ReturnType<typeof createBlankCampaign>>(
    (nextCampaign, action) =>
      applyCampaignCanvasEditAction(nextCampaign, action),
    campaign,
  );
  const secondCampaign = actions.reduce<ReturnType<typeof createBlankCampaign>>(
    (nextCampaign, action) =>
      applyCampaignCanvasEditAction(nextCampaign, action),
    createBlankCampaign(),
  );

  assert.equal(
    serializeCampaignSpecJson(firstCampaign),
    serializeCampaignSpecJson(secondCampaign),
  );
  assert.equal(
    serializeCampaignSpecJson(firstCampaign),
    `{
  "nodes": [
    {
      "id": "text_block_1",
      "kind": "text",
      "title": "Copy",
      "subtitle": "campaign angles + captions",
      "description": "Turns a campaign brief into hooks, captions, and prompts.",
      "tone": "ink",
      "status": "READY",
      "position": {
        "x": 120,
        "y": 160
      },
      "contracts": [
        {
          "label": "Prompt",
          "value": "node:text_block_1.outputs.prompt",
          "state": "READY"
        }
      ]
    },
    {
      "id": "image_block_2",
      "kind": "image",
      "title": "Image Block",
      "subtitle": "prompt + reference + image assets",
      "description": "Creates still images from prompt, reference image, and style/template variables.",
      "tone": "blue",
      "status": "READY",
      "position": {
        "x": 520,
        "y": 160
      },
      "contracts": []
    }
  ],
  "edges": [
    {
      "id": "edge_prompt_to_image",
      "source": "text_block_1",
      "sourcePort": "outputs.prompt",
      "target": "image_block_2",
      "targetPort": "inputs.prompt",
      "label": "prompt"
    }
  ],
  "assetGenerationJobs": []
}`,
  );
});

test("updatePersistedCampaignRecord saves edited target audience details", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_audience_details",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const updatedCampaign = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      targetAudience: {
        age: "25-34",
        gender: "all",
        interests: "AI tools, skincare, creator commerce",
        behavior: "comments on short-form product demos",
        region: "United States",
        platform: "Instagram",
      },
    },
    {
      now: () => "2026-05-11T00:05:00.000Z",
    },
  );

  assert.equal(updatedCampaign.updatedAt, "2026-05-11T00:05:00.000Z");
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_audience_details")
      ?.targetAudience,
    {
      age: "25-34",
      gender: "all",
      interests: "AI tools, skincare, creator commerce",
      behavior: "comments on short-form product demos",
      region: "United States",
      platform: "Instagram",
    },
  );
});

test("persisted target audience details are returned across view and edit cycles", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_audience_round_trip",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const targetAudience = createCampaignTargetAudience({
    age: "35-44",
    gender: "women",
    interests: "home fitness, wellness subscriptions",
    behavior: "saves creator discount reels before purchase",
    region: "Canada",
    platform: "Instagram",
  });

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      targetAudience,
    },
    {
      now: () => "2026-05-11T00:04:00.000Z",
    },
  );

  const campaignForViewing = getPersistedCampaignRecord(
    storage,
    "campaign_audience_round_trip",
  );

  assert.deepEqual(campaignForViewing?.targetAudience, targetAudience);
  assert.equal(campaignForViewing?.updatedAt, "2026-05-11T00:04:00.000Z");

  assert.ok(campaignForViewing);

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaignForViewing,
      title: "Fitness creator conversion test",
    },
    {
      now: () => "2026-05-11T00:08:00.000Z",
    },
  );

  const campaignForEditing = getPersistedCampaignRecord(
    storage,
    "campaign_audience_round_trip",
  );

  assert.equal(campaignForEditing?.title, "Fitness creator conversion test");
  assert.equal(campaignForEditing?.updatedAt, "2026-05-11T00:08:00.000Z");
  assert.deepEqual(campaignForEditing?.targetAudience, targetAudience);
});

test("persisted campaign measurement goals survive later campaign edits", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_measurement_goal_round_trip",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const measurementGoals = [
    createCampaignMeasurementGoal({
      id: "goal_purchase_conversion",
      name: "purchase_conversion_rate",
      target: 3.5,
      unit: "percent",
      successCriteria:
        "Purchase conversion rate reaches or exceeds 3.5% with checkout attribution.",
      reportingTimeframe: {
        startsAt: "2026-05-12T00:00:00.000Z",
        endsAt: "2026-05-19T00:00:00.000Z",
        timezone: "America/Los_Angeles",
      },
    }),
  ];

  saveCampaignMeasurementGoals(
    storage,
    "campaign_measurement_goal_round_trip",
    measurementGoals,
    {
      now: () => "2026-05-11T00:09:00.000Z",
    },
  );

  const campaignForViewing = getPersistedCampaignRecord(
    storage,
    "campaign_measurement_goal_round_trip",
  );

  assert.ok(campaignForViewing);
  assert.deepEqual(campaignForViewing.tracking.measurementGoals, measurementGoals);

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaignForViewing,
      objective: "Improve Instagram DM purchase conversion",
    },
    {
      now: () => "2026-05-11T00:12:00.000Z",
    },
  );

  const campaignForEditing = getPersistedCampaignRecord(
    storage,
    "campaign_measurement_goal_round_trip",
  );

  assert.equal(
    campaignForEditing?.objective,
    "Improve Instagram DM purchase conversion",
  );
  assert.equal(campaignForEditing?.updatedAt, "2026-05-11T00:12:00.000Z");
  assert.deepEqual(campaignForEditing?.tracking.measurementGoals, measurementGoals);
});

test("updatePersistedCampaignRecord saves edited product and offer details", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_product_offer_details",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const productOffer = createCampaignProductOffer({
    product: {
      id: "prod_creator_kit",
      title: "Creator Starter Kit",
      brand: "OwnCanvas Goods",
      category: "Creator tools",
      description: "A bundled kit for creators launching shoppable content.",
      tags: ["ugc", "starter", "commerce"],
      canonicalUrl: "https://shop.example.com/products/creator-starter-kit",
    },
    offer: {
      headline: "Creator launch bundle",
      summary: "Bundle the product, prompts, and short-form campaign assets.",
      price: {
        amount: 4900,
        currency: "USD",
        display: "$49",
      },
      discount: "20% launch discount",
      destinationUrl: "https://shop.example.com/offers/creator-starter-kit",
      callToAction: "Shop the kit",
    },
    attribution: {
      source: "affiliate-feed",
      externalId: "impact_123",
      affiliateNetwork: "impact",
      commissionRate: 12.5,
      trackingUrl: "https://trk.example.com/c/impact_123",
    },
  });

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      productOffer,
    },
    {
      now: () => "2026-05-11T00:06:00.000Z",
    },
  );

  const persistedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_product_offer_details",
  );

  assert.equal(persistedCampaign?.updatedAt, "2026-05-11T00:06:00.000Z");
  assert.deepEqual(persistedCampaign?.productOffer, productOffer);
});

test("validateCampaignProductOffer accepts complete commerce information", () => {
  const productOffer = createCampaignProductOffer({
    product: {
      id: "prod_creator_kit",
      title: "Creator Starter Kit",
      canonicalUrl: "https://shop.example.com/products/creator-starter-kit",
      media: [
        {
          id: "media_primary",
          type: "image",
          url: "https://cdn.example.com/creator-kit.jpg",
          altText: "Creator Starter Kit product box",
          role: "primary",
        },
      ],
      variants: [
        {
          id: "variant_base",
          title: "Starter Kit",
          sku: "KIT-001",
          attributes: {
            size: "standard",
          },
          price: {
            amount: 4900,
            currency: "USD",
            display: "$49",
          },
          availability: "in-stock",
        },
      ],
    },
    offer: {
      headline: "Creator launch bundle",
      price: {
        amount: 4900,
        currency: "USD",
        display: "$49",
      },
      destinationUrl: "https://shop.example.com/offers/creator-starter-kit",
      callToAction: "Shop the kit",
    },
    attribution: {
      commissionRate: 12.5,
      trackingUrl: "https://trk.example.com/c/impact_123",
    },
  });

  assert.deepEqual(validateCampaignProductOffer(productOffer), {
    valid: true,
    errors: [],
  });
});

test("validateCampaignProductOffer reports invalid product and offer fields", () => {
  const productOffer = createCampaignProductOffer({
    product: {
      title: "  ",
      canonicalUrl: "not-a-url",
      media: [
        {
          id: "",
          type: "image",
          url: "cdn.example.com/creator-kit.jpg",
          altText: "",
          role: "primary",
        },
      ],
      variants: [
        {
          id: "",
          title: "",
          sku: "",
          attributes: {},
          price: {
            amount: -1,
            currency: "usd",
            display: "",
          },
          availability: "in-stock",
        },
      ],
    },
    offer: {
      headline: "",
      price: {
        amount: -4900,
        currency: "US",
        display: "",
      },
      destinationUrl: "shop.example.com/offers/creator-starter-kit",
      callToAction: "",
    },
    attribution: {
      commissionRate: 120,
      trackingUrl: "trk.example.com/c/impact_123",
    },
  });

  assert.deepEqual(validateCampaignProductOffer(productOffer), {
    valid: false,
    errors: [
      {
        code: "product.title_required",
        path: "product.title",
        message: "Product title is required.",
      },
      {
        code: "product.canonical_url_invalid",
        path: "product.canonicalUrl",
        message: "Product canonical URL must be a valid http or https URL.",
      },
      {
        code: "product.media_id_required",
        path: "product.media.0.id",
        message: "Product media id is required.",
      },
      {
        code: "product.media_url_invalid",
        path: "product.media.0.url",
        message: "Product media URL must be a valid http or https URL.",
      },
      {
        code: "product.variant_id_required",
        path: "product.variants.0.id",
        message: "Product variant id is required.",
      },
      {
        code: "product.variant_title_required",
        path: "product.variants.0.title",
        message: "Product variant title is required.",
      },
      {
        code: "product.variant_price_invalid",
        path: "product.variants.0.price.amount",
        message: "Product variant price amount cannot be negative.",
      },
      {
        code: "product.variant_currency_invalid",
        path: "product.variants.0.price.currency",
        message: "Product variant price currency must be a three-letter uppercase code.",
      },
      {
        code: "offer.headline_required",
        path: "offer.headline",
        message: "Offer headline is required.",
      },
      {
        code: "offer.destination_url_invalid",
        path: "offer.destinationUrl",
        message: "Offer destination URL must be a valid http or https URL.",
      },
      {
        code: "offer.call_to_action_required",
        path: "offer.callToAction",
        message: "Offer call to action is required.",
      },
      {
        code: "offer.price_invalid",
        path: "offer.price.amount",
        message: "Offer price amount cannot be negative.",
      },
      {
        code: "offer.currency_invalid",
        path: "offer.price.currency",
        message: "Offer price currency must be a three-letter uppercase code.",
      },
      {
        code: "attribution.commission_rate_invalid",
        path: "attribution.commissionRate",
        message: "Commission rate must be between 0 and 100.",
      },
      {
        code: "attribution.tracking_url_invalid",
        path: "attribution.trackingUrl",
        message: "Attribution tracking URL must be a valid http or https URL.",
      },
    ],
  });
});

test("updatePersistedCampaignRecord rejects invalid persisted product and offer details", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_invalid_product_offer",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const invalidProductOffer = createCampaignProductOffer({
    product: {
      title: "",
    },
    offer: {
      headline: "",
      destinationUrl: "shop.example.com/offer",
      callToAction: "",
      price: {
        amount: -100,
        currency: "US",
      },
    },
  });

  assert.throws(
    () =>
      updatePersistedCampaignRecord(
        storage,
        {
          ...campaign,
          productOffer: invalidProductOffer,
        },
        {
          now: () => "2026-05-11T00:04:00.000Z",
        },
      ),
    /Invalid campaign product offer: product.title_required, offer.headline_required, offer.destination_url_invalid, offer.call_to_action_required, offer.price_invalid, offer.currency_invalid/,
  );

  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_invalid_product_offer")
      ?.productOffer,
    campaign.productOffer,
  );
});

test("persisted product and offer details survive later campaign edits", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_product_offer_round_trip",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const productOffer = createCampaignProductOffer({
    product: {
      title: "Wellness Refill Pack",
      brand: "Northstar Labs",
      category: "Wellness",
      description: "Monthly refill pack for creator-led replenishment offers.",
      tags: ["wellness", "subscription"],
    },
    offer: {
      headline: "Subscribe and save",
      summary: "Recurring offer tuned for returning creator traffic.",
      price: {
        amount: 2900,
        currency: "USD",
        display: "$29/mo",
      },
      discount: "First month 15% off",
      destinationUrl: "https://shop.example.com/subscribe",
      callToAction: "Start subscription",
    },
    attribution: {
      source: "manual",
      externalId: "wellness_refill_001",
      affiliateNetwork: "direct",
      commissionRate: 8,
      trackingUrl: "https://shop.example.com/subscribe?aff=creator",
    },
  });

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      productOffer,
    },
    {
      now: () => "2026-05-11T00:07:00.000Z",
    },
  );

  const campaignForViewing = getPersistedCampaignRecord(
    storage,
    "campaign_product_offer_round_trip",
  );

  assert.ok(campaignForViewing);
  assert.deepEqual(campaignForViewing.productOffer, productOffer);

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaignForViewing,
      objective: "Convert Instagram DM traffic to subscription purchases",
    },
    {
      now: () => "2026-05-11T00:11:00.000Z",
    },
  );

  const campaignForEditing = getPersistedCampaignRecord(
    storage,
    "campaign_product_offer_round_trip",
  );

  assert.equal(
    campaignForEditing?.objective,
    "Convert Instagram DM traffic to subscription purchases",
  );
  assert.equal(campaignForEditing?.updatedAt, "2026-05-11T00:11:00.000Z");
  assert.deepEqual(campaignForEditing?.productOffer, productOffer);
});

test("persisted campaign workflow keeps plugin activation state across edits", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_plugin_activation",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const configuredPlugin = createCampaignWorkflowPluginConfiguration(
    {
      pluginId: "plugin.provider.parallel-media",
      type: "provider",
      lifecycleState: "configured",
      permissionMode: "advanced",
      capabilityIds: ["cap.bulk-image", "cap.bulk-video"],
      configuration: {
        values: {
          maxParallelImages: 8,
          maxParallelVideos: 4,
        },
        secretRefs: {
          apiKey: "secretref_workspace_parallel_media",
        },
      },
      installedBy: "agent",
      configuredBy: "human",
    },
    {
      now: () => "2026-05-11T00:02:00.000Z",
    },
  );

  const campaignWithPlugin = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      plugins: [configuredPlugin],
    },
    {
      now: () => "2026-05-11T00:03:00.000Z",
    },
  );
  const activatedCampaign = updatePersistedCampaignRecord(
    storage,
    setCampaignWorkflowPluginActivation(
      campaignWithPlugin,
      "plugin.provider.parallel-media",
      {
        active: true,
        actor: "agent",
        now: () => "2026-05-11T00:04:00.000Z",
      },
    ),
    {
      now: () => "2026-05-11T00:05:00.000Z",
    },
  );

  assert.equal(activatedCampaign.plugins[0]?.lifecycleState, "active");
  assert.equal(activatedCampaign.plugins[0]?.activatedBy, "agent");
  assert.equal(
    activatedCampaign.plugins[0]?.activatedAt,
    "2026-05-11T00:04:00.000Z",
  );
  assert.deepEqual(activatedCampaign.plugins[0]?.configuration, {
    values: {
      maxParallelImages: 8,
      maxParallelVideos: 4,
    },
    secretRefs: {
      apiKey: "secretref_workspace_parallel_media",
    },
    updatedAt: "2026-05-11T00:02:00.000Z",
  });

  const campaignForEditing = getPersistedCampaignRecord(
    storage,
    "campaign_plugin_activation",
  );

  assert.deepEqual(campaignForEditing?.plugins, activatedCampaign.plugins);
  assert.ok(campaignForEditing);

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaignForEditing,
      objective: "Improve content-commerce conversion",
    },
    {
      now: () => "2026-05-11T00:06:00.000Z",
    },
  );

  const campaignAfterEdit = getPersistedCampaignRecord(
    storage,
    "campaign_plugin_activation",
  );

  assert.equal(
    campaignAfterEdit?.plugins[0]?.pluginId,
    "plugin.provider.parallel-media",
  );
  assert.equal(campaignAfterEdit?.plugins[0]?.lifecycleState, "active");
  assert.equal(
    campaignAfterEdit?.plugins[0]?.configuration.secretRefs.apiKey,
    "secretref_workspace_parallel_media",
  );
  assert.ok(
    campaignAfterEdit?.logs.includes(
      "2026-05-11T00:04:00.000Z plugin.activated:plugin.provider.parallel-media",
    ),
  );
});

test("workflow plugin activation can be deactivated without losing configuration", () => {
  const campaign = {
    ...createBlankCampaign(),
    plugins: [
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.dashboard.conversion",
          type: "dashboard",
          lifecycleState: "active",
          permissionMode: "basic",
          capabilityIds: ["cap.report"],
          configuration: {
            values: {
              metric: "conversion",
            },
            secretRefs: {},
          },
          installedBy: "human",
          configuredBy: "human",
          activatedBy: "human",
        },
        {
          now: () => "2026-05-11T00:07:00.000Z",
        },
      ),
    ],
  };

  const deactivatedCampaign = setCampaignWorkflowPluginActivation(
    campaign,
    "plugin.dashboard.conversion",
    {
      active: false,
      actor: "human",
      now: () => "2026-05-11T00:08:00.000Z",
    },
  );

  assert.equal(deactivatedCampaign.plugins[0]?.lifecycleState, "inactive");
  assert.equal(
    deactivatedCampaign.plugins[0]?.deactivatedAt,
    "2026-05-11T00:08:00.000Z",
  );
  assert.deepEqual(deactivatedCampaign.plugins[0]?.configuration.values, {
    metric: "conversion",
  });
  assert.throws(
    () =>
      setCampaignWorkflowPluginActivation(campaign, "plugin.missing", {
        active: true,
        actor: "agent",
        now: () => "2026-05-11T00:09:00.000Z",
      }),
    /not configured/,
  );
});

test("workflow plugin activation validates actor permissions from the catalog", () => {
  const campaign = {
    ...createBlankCampaign(),
    plugins: [
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.runtime.dashboard",
          type: "dashboard",
          lifecycleState: "configured",
          permissionMode: "basic",
          capabilityIds: ["cap.runtime.report"],
          installedBy: "human",
          configuredBy: "human",
        },
        {
          now: () => "2026-05-11T00:18:00.000Z",
        },
      ),
    ],
  };
  const humanOnlyDashboard = {
    ...createRuntimeDashboardPlugin(),
    permissions: {
      ...createRuntimeDashboardPlugin().permissions,
      configurableBy: ["human"],
    },
  } as PluginManifest;
  const catalog = {
    id: "catalog.activation",
    updatedAt: "2026-05-11T00:18:00.000Z",
    plugins: [humanOnlyDashboard],
  } satisfies PluginCatalog;

  assert.throws(
    () =>
      setCampaignWorkflowPluginActivation(
        campaign,
        "plugin.runtime.dashboard",
        {
          active: true,
          actor: "agent",
          catalog,
          now: () => "2026-05-11T00:19:00.000Z",
        },
      ),
    /does not allow agent activation/,
  );

  const activatedCampaign = setCampaignWorkflowPluginActivation(
    campaign,
    "plugin.runtime.dashboard",
    {
      active: true,
      actor: "human",
      catalog,
      now: () => "2026-05-11T00:20:00.000Z",
    },
  );

  assert.equal(activatedCampaign.plugins[0]?.lifecycleState, "active");
  assert.equal(activatedCampaign.plugins[0]?.activatedBy, "human");
});

test("workflow plugin activation rejects missing unavailable or uninstalled catalog plugins", () => {
  const campaign = {
    ...createBlankCampaign(),
    plugins: [
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.runtime.media",
          type: "provider",
          lifecycleState: "configured",
          permissionMode: "basic",
          capabilityIds: ["cap.runtime.image"],
          installedBy: "agent",
          configuredBy: "agent",
        },
        {
          now: () => "2026-05-11T00:21:00.000Z",
        },
      ),
    ],
  };
  const availableMedia = {
    ...createRuntimeMediaPlugin(),
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:22:00.000Z",
    },
  } as PluginManifest;
  const uninstalledMedia = {
    ...createRuntimeMediaPlugin(),
    lifecycle: {
      state: "uninstalled",
      updatedAt: "2026-05-11T00:23:00.000Z",
    },
  } as PluginManifest;

  assert.throws(
    () =>
      setCampaignWorkflowPluginActivation(campaign, "plugin.runtime.media", {
        active: true,
        actor: "agent",
        catalog: {
          id: "catalog.activation.missing",
          updatedAt: "2026-05-11T00:24:00.000Z",
          plugins: [],
        },
        now: () => "2026-05-11T00:24:00.000Z",
      }),
    /has no installed catalog manifest/,
  );
  assert.throws(
    () =>
      setCampaignWorkflowPluginActivation(campaign, "plugin.runtime.media", {
        active: true,
        actor: "agent",
        catalog: {
          id: "catalog.activation.available",
          updatedAt: "2026-05-11T00:25:00.000Z",
          plugins: [availableMedia],
        },
        now: () => "2026-05-11T00:25:00.000Z",
      }),
    /catalog lifecycle state "available" cannot be activated/,
  );
  assert.throws(
    () =>
      setCampaignWorkflowPluginActivation(campaign, "plugin.runtime.media", {
        active: true,
        actor: "agent",
        catalog: {
          id: "catalog.activation.uninstalled",
          updatedAt: "2026-05-11T00:26:00.000Z",
          plugins: [uninstalledMedia],
        },
        now: () => "2026-05-11T00:26:00.000Z",
      }),
    /catalog lifecycle state "uninstalled" cannot be activated/,
  );
});

test("agent workflow runtime loads active campaign plugins from the catalog", () => {
  const catalog = createRuntimePluginCatalog();
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_runtime_plugins",
    plugins: [
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.runtime.media",
          type: "provider",
          lifecycleState: "active",
          permissionMode: "basic",
          capabilityIds: ["cap.runtime.image", "cap.runtime.video"],
          configuration: {
            values: {
              model: "runtime-media-v1",
              maxParallel: 4,
            },
            secretRefs: {
              apiKey: "secretref_runtime_media",
            },
          },
          installedBy: "agent",
          configuredBy: "agent",
          activatedBy: "agent",
        },
        {
          now: () => "2026-05-11T00:10:00.000Z",
        },
      ),
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.runtime.dashboard",
          type: "dashboard",
          lifecycleState: "inactive",
          permissionMode: "basic",
          capabilityIds: ["cap.runtime.report"],
          installedBy: "human",
          configuredBy: "human",
        },
        {
          now: () => "2026-05-11T00:11:00.000Z",
        },
      ),
    ],
  };

  const runtime = loadActivatedPluginsIntoAgentWorkflowRuntime(
    campaign,
    catalog,
    {
      mode: "basic",
      now: () => "2026-05-11T00:12:00.000Z",
    },
  );

  assert.equal(runtime.campaignId, "campaign_runtime_plugins");
  assert.equal(runtime.loadedAt, "2026-05-11T00:12:00.000Z");
  assert.equal(runtime.mode, "basic");
  assert.deepEqual(runtime.errors, []);
  assert.equal(runtime.plugins.length, 1);
  assert.deepEqual(runtime.plugins[0], {
    pluginId: "plugin.runtime.media",
    manifestId: "plugin.runtime.media",
    name: "Runtime Media",
    displayName: "Runtime Media",
    type: "provider",
    originKind: "built-in",
    permissionMode: "basic",
    requiresApprovalFor: [],
    activatedBy: "agent",
    activatedAt: "2026-05-11T00:10:00.000Z",
    configuration: {
      values: {
        model: "runtime-media-v1",
        maxParallel: 4,
      },
      secretRefs: {
        apiKey: "secretref_runtime_media",
      },
      updatedAt: "2026-05-11T00:10:00.000Z",
    },
    capabilities: [
      {
        id: "cap.runtime.image",
        kind: "generate.image",
        title: "Runtime image generation",
        description: "Generates image candidates for the active campaign.",
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
        supportsParallel: true,
        supportsBulk: true,
        maxParallel: 8,
      },
      {
        id: "cap.runtime.video",
        kind: "generate.video",
        title: "Runtime video generation",
        description: "Generates video candidates for the active campaign.",
        inputPorts: [{ id: "storyboard", dataType: "json", required: true }],
        outputPorts: [{ id: "videos", dataType: "video", multiple: true }],
        supportsParallel: true,
        supportsBulk: true,
        maxParallel: 4,
      },
    ],
  });
});

test("agent workflow runtime can be retrieved from persisted campaign state", () => {
  const storage = new MemoryStorage();
  const catalog = createRuntimePluginCatalog();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_agent_runtime_retrieval",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const textNode = createCampaignBlock("text", 0, { x: 160, y: 180 });
  const videoNode = createCampaignBlock("video", 1, { x: 560, y: 180 });
  const syncedCanvas = {
    nodes: [textNode, videoNode],
    edges: [
      {
        id: "edge_text_to_video",
        source: textNode.id,
        target: videoNode.id,
        label: "storyboard",
      },
    ],
  };
  const syncedCampaignSpec = {
    ...syncedCanvas,
    assetGenerationJobs: [],
  };
  const activeMediaPlugin = createCampaignWorkflowPluginConfiguration(
    {
      pluginId: "plugin.runtime.media",
      type: "provider",
      lifecycleState: "active",
      permissionMode: "basic",
      capabilityIds: ["cap.runtime.video"],
      configuration: {
        values: {
          model: "runtime-media-v1",
          maxParallel: 4,
        },
        secretRefs: {
          apiKey: "secretref_agent_runtime_media",
        },
      },
      installedBy: "agent",
      configuredBy: "agent",
      activatedBy: "agent",
    },
    {
      now: () => "2026-05-11T00:02:00.000Z",
    },
  );

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: syncedCampaignSpec,
      canvasState: syncedCanvas,
      plugins: [activeMediaPlugin],
    },
    {
      now: () => "2026-05-11T00:03:00.000Z",
    },
  );

  const persistedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_agent_runtime_retrieval",
  );

  assert.ok(persistedCampaign);
  assert.deepEqual(persistedCampaign.canvasState, syncedCanvas);

  const runtime = loadActivatedPluginsIntoAgentWorkflowRuntime(
    persistedCampaign,
    catalog,
    {
      mode: "basic",
      now: () => "2026-05-11T00:04:00.000Z",
    },
  );

  assert.equal(runtime.campaignId, "campaign_agent_runtime_retrieval");
  assert.equal(runtime.loadedAt, "2026-05-11T00:04:00.000Z");
  assert.deepEqual(runtime.errors, []);
  assert.deepEqual(
    runtime.plugins.map((plugin) => ({
      pluginId: plugin.pluginId,
      activatedBy: plugin.activatedBy,
      capabilityIds: plugin.capabilities.map((capability) => capability.id),
      secretRefs: plugin.configuration.secretRefs,
    })),
    [
      {
        pluginId: "plugin.runtime.media",
        activatedBy: "agent",
        capabilityIds: ["cap.runtime.video"],
        secretRefs: {
          apiKey: "secretref_agent_runtime_media",
        },
      },
    ],
  );
});

test("agent workflow runtime reports blocked or missing active plugin dependencies", () => {
  const catalog = createRuntimePluginCatalog();
  const campaign = {
    ...createBlankCampaign(),
    id: "campaign_runtime_errors",
    plugins: [
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.runtime.advanced-tracking",
          type: "tracking",
          lifecycleState: "active",
          permissionMode: "advanced",
          capabilityIds: ["cap.runtime.conversion"],
          installedBy: "agent",
          configuredBy: "agent",
          activatedBy: "agent",
        },
        {
          now: () => "2026-05-11T00:13:00.000Z",
        },
      ),
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.runtime.media",
          type: "provider",
          lifecycleState: "active",
          permissionMode: "basic",
          capabilityIds: ["cap.runtime.missing"],
          installedBy: "agent",
          configuredBy: "agent",
          activatedBy: "agent",
        },
        {
          now: () => "2026-05-11T00:14:00.000Z",
        },
      ),
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.runtime.missing",
          type: "landing",
          lifecycleState: "active",
          permissionMode: "basic",
          installedBy: "agent",
          configuredBy: "agent",
          activatedBy: "agent",
        },
        {
          now: () => "2026-05-11T00:15:00.000Z",
        },
      ),
    ],
  };

  const basicRuntime = loadActivatedPluginsIntoAgentWorkflowRuntime(
    campaign,
    catalog,
    {
      mode: "basic",
      now: () => "2026-05-11T00:16:00.000Z",
    },
  );

  assert.deepEqual(
    basicRuntime.errors.map((error) => error.code),
    [
      "runtime.permission_mode_blocked",
      "runtime.capability_not_found",
      "runtime.plugin_manifest_not_found",
    ],
  );
  assert.deepEqual(
    basicRuntime.plugins.map((plugin) => ({
      pluginId: plugin.pluginId,
      capabilities: plugin.capabilities.map((capability) => capability.id),
    })),
    [
      {
        pluginId: "plugin.runtime.media",
        capabilities: [],
      },
    ],
  );

  const advancedRuntime = loadActivatedPluginsIntoAgentWorkflowRuntime(
    campaign,
    catalog,
    {
      mode: "advanced",
      now: () => "2026-05-11T00:17:00.000Z",
    },
  );

  assert.equal(
    advancedRuntime.plugins.some(
      (plugin) => plugin.pluginId === "plugin.runtime.advanced-tracking",
    ),
    true,
  );
  assert.deepEqual(
    advancedRuntime.errors.map((error) => error.code),
    ["runtime.capability_not_found", "runtime.plugin_manifest_not_found"],
  );
});

function createRuntimePluginCatalog(): PluginCatalog {
  return {
    id: "catalog.runtime",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: [
      createRuntimeMediaPlugin(),
      createRuntimeDashboardPlugin(),
      createRuntimeAdvancedTrackingPlugin(),
    ],
  };
}

function createRuntimeMediaPlugin(): PluginManifest {
  return definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.runtime.media",
    name: "Runtime Media",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "configured",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      updatedAt: "2026-05-11T00:01:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/runtime-media",
    },
    metadata: {
      displayName: "Runtime Media",
      description: "Provides campaign image and video generation at runtime.",
      tags: ["runtime", "media"],
    },
    permissions: {
      mode: "basic",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: [],
    },
    provider: {
      providerKind: "built-in",
      mediaTypes: ["image", "video"],
      execution: "hosted",
      advanced: false,
    },
    capabilities: [
      {
        id: "cap.runtime.image",
        kind: "generate.image",
        title: "Runtime image generation",
        description: "Generates image candidates for the active campaign.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 8,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
      },
      {
        id: "cap.runtime.video",
        kind: "generate.video",
        title: "Runtime video generation",
        description: "Generates video candidates for the active campaign.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 4,
        },
        inputPorts: [{ id: "storyboard", dataType: "json", required: true }],
        outputPorts: [{ id: "videos", dataType: "video", multiple: true }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
          mediaType: "image",
          defaultValue: "runtime-media-v1",
        },
      ],
    },
  }) as PluginManifest;
}

function createRuntimeDashboardPlugin(): PluginManifest {
  return definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.runtime.dashboard",
    name: "Runtime Dashboard",
    version: "0.1.0",
    type: "dashboard",
    lifecycle: {
      state: "configured",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      updatedAt: "2026-05-11T00:01:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/runtime-dashboard",
    },
    metadata: {
      displayName: "Runtime Dashboard",
      description: "Reports conversion attribution for runtime campaigns.",
      tags: ["runtime", "conversion"],
    },
    permissions: {
      mode: "basic",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: [],
    },
    dashboard: {
      reportTypes: ["conversion", "attribution"],
      supportedVisualizations: ["table"],
      realtime: true,
      exportable: true,
    },
    capabilities: [
      {
        id: "cap.runtime.report",
        kind: "dashboard.report",
        title: "Runtime conversion report",
        description: "Reports runtime campaign conversions.",
        concurrency: {
          supportsParallel: false,
          supportsBulk: false,
        },
        inputPorts: [{ id: "events", dataType: "event", required: true }],
        outputPorts: [{ id: "report", dataType: "json", multiple: false }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "metric",
          label: "Metric",
          type: "select",
          required: true,
          scope: "campaign",
          dashboardConfigType: "metric",
          metricKind: "conversion",
        },
      ],
    },
  }) as PluginManifest;
}

function createRuntimeAdvancedTrackingPlugin(): PluginManifest {
  return definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.runtime.advanced-tracking",
    name: "Runtime Advanced Tracking",
    version: "0.1.0",
    type: "tracking",
    lifecycle: {
      state: "active",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      activatedAt: "2026-05-11T00:02:00.000Z",
      updatedAt: "2026-05-11T00:02:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/runtime-tracking",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Runtime Advanced Tracking",
      description: "Tracks external conversion attribution at runtime.",
      tags: ["runtime", "tracking"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["network_access"],
    },
    capabilities: [
      {
        id: "cap.runtime.conversion",
        kind: "track.conversion",
        title: "Runtime conversion tracking",
        description: "Tracks final campaign conversion events.",
        concurrency: {
          supportsParallel: false,
          supportsBulk: true,
        },
        inputPorts: [{ id: "event", dataType: "event", required: true }],
        outputPorts: [{ id: "attribution", dataType: "json", multiple: false }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "pixelId",
          label: "Pixel ID",
          type: "string",
          required: true,
          scope: "workspace",
        },
      ],
    },
  }) as PluginManifest;
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
