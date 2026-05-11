import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaignRecord,
  createCampaignAssetGenerationJob,
  createCampaignMeasurementGoal,
  createCampaignMeasurementMetric,
  createCampaignPublishingChannel,
  createCampaignTrackingConfiguration,
  executeCampaignAssetGenerationJobs,
  getPersistedCampaignRecord,
  loadCampaignAssetGenerationWorkflow,
  saveCampaignAssetGenerationExecutionResult,
  saveCampaignMeasurementGoals,
  saveCampaignMeasurementMetrics,
  saveCampaignPublishedLink,
  saveCampaignPublishingConfiguration,
  saveCampaignTrackingConfiguration,
  updatePersistedCampaignRecord,
} from "../features/creative-canvas/model/creative-canvas.ts";
import {
  action as updateCampaign,
  loader as readCampaign,
} from "./api.campaign.ts";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

test("GET /api/campaigns/:campaignId exposes measurement goals and tracking configuration", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_measurement_tracking",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const measurementGoals = [
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
        timezone: "America/Los_Angeles",
      },
    }),
  ];
  const metrics = [
    createCampaignMeasurementMetric({
      id: "metric_purchase_conversion_rate",
      metric: "purchase_conversion_rate",
      value: 3.8,
      unit: "percent",
      source: "plugin.tracking.active-conversion",
      attributionTouchpoint: "checkout",
      observedAt: "2026-05-13T00:00:00.000Z",
    }),
  ];
  const tracking = createCampaignTrackingConfiguration({
    measurementGoals,
    metrics,
    events: ["comment_submitted", "dm_link_clicked", "purchase"],
    conversions: ["purchase"],
    attribution: {
      model: "linear",
      touchpoints: ["comment", "dm", "landing", "checkout"],
    },
  });

  saveCampaignTrackingConfiguration(
    storage,
    "campaign_api_measurement_tracking",
    tracking,
    {
      now: () => "2026-05-11T00:05:00.000Z",
    },
  );

  const response = await readCampaign({
    params: {
      campaignId: "campaign_api_measurement_tracking",
    },
    storage,
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-api.v1",
    campaign: {
      id: "campaign_api_measurement_tracking",
      title: "Untitled campaign",
      objective: "",
      status: "draft",
      updatedAt: "2026-05-11T00:05:00.000Z",
      tracking,
      measurementCycleCompletion: {
        schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
        hasCompletedMeasurementCycle: true,
        completedCycleCount: 1,
        latestCompletedCycle: tracking.measurementCycles?.[0],
      },
      improvementStatus: {
        schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1",
        state: "proposed",
        hasCompletedMeasurementBasedImprovementCycle: false,
        completedImprovementCycleCount: 0,
      },
    },
  });
});

test("GET /api/campaigns/:campaignId reports pending measurement state before measurement", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_before_measurement",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const response = await readCampaign({
    params: { campaignId: "campaign_api_before_measurement" },
    storage,
  });
  const body = (await readJson(response)) as {
    campaign?: Record<string, unknown>;
  };

  assert.equal(response.status, 200);
  assert.deepEqual(body.campaign?.measurementCycleCompletion, {
    schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
    hasCompletedMeasurementCycle: false,
    completedCycleCount: 0,
  });
  assert.deepEqual(body.campaign?.improvementStatus, {
    schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1",
    state: "pending",
    hasCompletedMeasurementBasedImprovementCycle: false,
    completedImprovementCycleCount: 0,
  });
  assert.equal("measurementResults" in (body.campaign ?? {}), false);
});

test("GET /api/campaigns/:campaignId reports proposed improvement after measurement only", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_after_measurement_only";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T00:00:00.000Z",
  });
  saveCampaignMeasurementGoals(
    storage,
    campaignId,
    [
      createCampaignMeasurementGoal({
        id: "goal_purchase_conversion",
        name: "purchase_conversion_rate",
        target: 4,
        unit: "percent",
        successCriteria:
          "Purchase conversion reaches four percent after publication.",
        reportingTimeframe: {
          startsAt: "2026-05-11T00:42:00.000Z",
          endsAt: "2026-05-18T00:42:00.000Z",
          timezone: "UTC",
        },
      }),
    ],
    { now: () => "2026-05-11T00:01:00.000Z" },
  );
  saveCampaignMeasurementMetrics(
    storage,
    campaignId,
    [
      createCampaignMeasurementMetric({
        id: "metric_purchase_conversion_rate_after_measurement",
        metric: "purchase_conversion_rate",
        value: 4.6,
        unit: "percent",
        source: "plugin.tracking.active-conversion",
        attributionTouchpoint: "checkout",
        observedAt: "2026-05-12T00:42:00.000Z",
      }),
    ],
    { now: () => "2026-05-12T00:45:00.000Z" },
  );

  const response = await readCampaign({
    params: { campaignId },
    storage,
  });
  const body = (await readJson(response)) as {
    campaign?: Record<string, unknown>;
  };
  const campaign = getPersistedCampaignRecord(storage, campaignId);

  assert.equal(response.status, 200);
  assert.deepEqual(body.campaign?.measurementCycleCompletion, {
    schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
    hasCompletedMeasurementCycle: true,
    completedCycleCount: 1,
    latestCompletedCycle: campaign?.tracking.measurementCycles?.[0],
  });
  assert.deepEqual(body.campaign?.improvementStatus, {
    schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1",
    state: "proposed",
    hasCompletedMeasurementBasedImprovementCycle: false,
    completedImprovementCycleCount: 0,
  });
  assert.equal("measurementResults" in (body.campaign ?? {}), false);
});

test("PATCH /api/campaigns/:campaignId completes after a measurement-based improvement cycle", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_completed_measurement_improvement_cycle";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T00:00:00.000Z",
  });
  saveCampaignMeasurementGoals(
    storage,
    campaignId,
    [
      createCampaignMeasurementGoal({
        id: "goal_purchase_conversion",
        name: "purchase_conversion_rate",
        target: 4,
        unit: "percent",
        successCriteria:
          "Purchase conversion reaches four percent after publication.",
        reportingTimeframe: {
          startsAt: "2026-05-11T00:42:00.000Z",
          endsAt: "2026-05-18T00:42:00.000Z",
          timezone: "UTC",
        },
      }),
    ],
    { now: () => "2026-05-11T00:01:00.000Z" },
  );
  const measuredCampaign = saveCampaignMeasurementMetrics(
    storage,
    campaignId,
    [
      createCampaignMeasurementMetric({
        id: "metric_purchase_conversion_rate_completed_cycle",
        metric: "purchase_conversion_rate",
        value: 4.6,
        unit: "percent",
        source: "plugin.tracking.active-conversion",
        attributionTouchpoint: "checkout",
        observedAt: "2026-05-12T00:42:00.000Z",
      }),
    ],
    { now: () => "2026-05-12T00:45:00.000Z" },
  );
  const proposedImprovementActions = Array.isArray(
    measuredCampaign.tracking.improvementActions,
  )
    ? measuredCampaign.tracking.improvementActions
    : [];
  assert.equal(proposedImprovementActions.length, 1);
  const completedImprovementActions = proposedImprovementActions.map((action) => ({
    ...action,
    status: "completed" as const,
    measurementResultUsage: {
      schemaVersion: "owncanvas.campaign-measurement-result-usage.v1" as const,
      usedAt: "2026-05-13T00:42:00.000Z",
      usedMetricIds: ["metric_purchase_conversion_rate_completed_cycle"],
      appliedChange:
        "Scaled the winning checkout path into the next campaign iteration.",
    },
  }));

  const response = await updateCampaign({
    request: new Request(`http://localhost/api/campaigns/${campaignId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        tracking: {
          improvementActions: completedImprovementActions,
        },
      }),
      headers: { "content-type": "application/json" },
    }),
    params: { campaignId },
    storage,
    now: () => "2026-05-13T00:45:00.000Z",
  });
  const body = (await readJson(response)) as {
    campaign?: Record<string, unknown>;
  };

  assert.equal(response.status, 200);
  assert.equal(body.campaign?.status, "completed");
  assert.deepEqual(body.campaign?.improvementStatus, {
    schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1",
    state: "completed",
    hasCompletedMeasurementBasedImprovementCycle: true,
    completedImprovementCycleCount: 1,
    latestCompletedMeasurementCycleId:
      measuredCampaign.tracking.measurementCycles?.[0]?.id,
    latestCompletedImprovementActionId: completedImprovementActions[0]?.id,
    completedAt: "2026-05-13T00:42:00.000Z",
  });
  assert.equal(
    getPersistedCampaignRecord(storage, campaignId)?.status,
    "completed",
  );
});

test("GET /api/campaigns/:campaignId exposes asset-generation progress and completion state", async () => {
  const storage = new MemoryStorage();
  const imageJob = createCampaignAssetGenerationJob({
    id: "job_api_progress_image",
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
    outputTargets: [{ assetId: "asset_api_progress_image", field: "uri" }],
    status: "ready",
  });
  const videoJob = createCampaignAssetGenerationJob({
    id: "job_api_progress_video",
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
    outputTargets: [{ assetId: "asset_api_progress_video", field: "uri" }],
    status: "queued",
  });
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_api_asset_generation_progress",
    now: () => "2026-05-11T04:00:00.000Z",
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
    { now: () => "2026-05-11T04:00:01.000Z" },
  );

  const executionResult = await executeCampaignAssetGenerationJobs(
    loadCampaignAssetGenerationWorkflow(campaignWithWorkflow),
    async (job, context) => {
      context.reportProgress(job.mediaType === "image" ? 45 : 30);

      if (job.mediaType === "video") {
        throw new Error("Video provider queue expired");
      }

      return [
        {
          id: "result_api_progress_image",
          assetId: "asset_api_progress_image",
          uri: "https://cdn.example.test/api-progress/image.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sizeBytes: 4096,
          model: "image-fast",
          seed: null,
          promptHash: "hash_api_progress_image",
          providerRequestId: "request_api_progress_image",
          generatedAt: "2026-05-11T04:00:05.000Z",
          durationMs: 25,
          costUsd: 0.02,
          finishReason: "completed",
        },
      ];
    },
    {
      actor: "agent",
      maxConcurrency: 2,
      now: () => "2026-05-11T04:00:02.000Z",
    },
  );

  saveCampaignAssetGenerationExecutionResult(
    storage,
    "campaign_api_asset_generation_progress",
    executionResult,
    { now: () => "2026-05-11T04:00:10.000Z" },
  );

  const response = await readCampaign({
    params: { campaignId: "campaign_api_asset_generation_progress" },
    storage,
  });
  const body = (await readJson(response)) as {
    campaign?: { assetGeneration?: unknown };
  };

  assert.equal(response.status, 200);
  assert.deepEqual(body.campaign?.assetGeneration, {
    summary: {
      totalJobs: 2,
      pendingJobs: 0,
      runningJobs: 0,
      completedJobs: 1,
      failedJobs: 1,
      percentComplete: 100,
      state: "completed_with_errors",
    },
    jobs: [
      {
        jobId: "job_api_progress_image",
        mediaType: "image",
        providerPluginId: "plugin.runtime.media",
        capabilityId: "cap.runtime.image",
        jobStatus: "completed",
        executionStatus: "completed",
        progress: 100,
        startedAt: "2026-05-11T04:00:02.000Z",
        completedAt: "2026-05-11T04:00:02.000Z",
        failedAt: null,
        error: null,
        latestExecutionId:
          "exec_campaign_api_asset_generation_progress_job_api_progress_image_1",
      },
      {
        jobId: "job_api_progress_video",
        mediaType: "video",
        providerPluginId: "plugin.runtime.media",
        capabilityId: "cap.runtime.video",
        jobStatus: "failed",
        executionStatus: "failed",
        progress: 30,
        startedAt: "2026-05-11T04:00:02.000Z",
        completedAt: null,
        failedAt: "2026-05-11T04:00:02.000Z",
        error: "Video provider queue expired",
        latestExecutionId:
          "exec_campaign_api_asset_generation_progress_job_api_progress_video_1",
      },
    ],
    executions: [
      {
        id: "exec_campaign_api_asset_generation_progress_job_api_progress_image_1",
        jobId: "job_api_progress_image",
        mediaType: "image",
        status: "completed",
        jobStatus: "completed",
        progress: 100,
        error: null,
        statusEvents: [
          { status: "running", progress: 0, error: null },
          { status: "running", progress: 45, error: null },
          { status: "completed", progress: 100, error: null },
        ],
      },
      {
        id: "exec_campaign_api_asset_generation_progress_job_api_progress_video_1",
        jobId: "job_api_progress_video",
        mediaType: "video",
        status: "failed",
        jobStatus: "failed",
        progress: 30,
        error: "Video provider queue expired",
        statusEvents: [
          { status: "running", progress: 0, error: null },
          { status: "running", progress: 30, error: null },
          { status: "failed", progress: 30, error: "Video provider queue expired" },
        ],
      },
    ],
  });
});

test("GET /api/campaigns/:campaignId exposes UTM-enriched published links", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_published_links",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  saveCampaignTrackingConfiguration(
    storage,
    "campaign_api_published_links",
    createCampaignTrackingConfiguration({
      utm: {
        source: "campaign-default",
        medium: "campaign-medium",
        campaign: "creator-kit-launch",
        content: "campaign-content",
        term: "creator-tools",
      },
      attributionParameters: [
        {
          key: "affiliate_id",
          value: "impact_creator_123",
          source: "impact",
        },
      ],
    }),
  );
  saveCampaignPublishingConfiguration(
    storage,
    "campaign_api_published_links",
    [
      createCampaignPublishingChannel({
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
        destinationUrl: "https://go.example.com/creator-kit?existing=1",
        landingPageId: "landing_creator_kit",
        tracking: {
          utmSource: "instagram",
          utmMedium: "dm",
          utmCampaign: "creator-kit-launch",
          utmContent: "comment-trigger",
          conversionEvent: "purchase",
        },
        status: "configured",
      }),
    ],
  );
  saveCampaignPublishedLink(
    storage,
    "campaign_api_published_links",
    "pub_instagram_dm_landing",
    {
      responderId: "agent_dm_responder",
      messageId: "msg welcome 01",
      id: "published_link_ig_dm_001",
      publishedAt: "2026-05-11T00:42:00.000Z",
    },
    {
      now: () => "2026-05-11T00:45:00.000Z",
    },
  );

  const response = await readCampaign({
    params: { campaignId: "campaign_api_published_links" },
    storage,
  });
  const body = (await readJson(response)) as {
    campaign?: {
      publishing?: {
        channels?: Array<{
          id: string;
          status: string;
          publishedLinks: unknown[];
        }>;
      };
    };
  };

  assert.equal(response.status, 200);
  assert.deepEqual(body.campaign?.publishing?.channels, [
    {
      id: "pub_instagram_dm_landing",
      type: "direct-message",
      platform: "instagram",
      label: "Instagram comment to DM",
      providerPluginId: "plugin.dm.instagram",
      accountHandle: "@owncanvas",
      placement: "comment-trigger",
      destinationUrl: "https://go.example.com/creator-kit?existing=1",
      landingPageId: "landing_creator_kit",
      scheduleMode: "manual",
      startsAt: "",
      timezone: "UTC",
      utmSource: "instagram",
      utmMedium: "dm",
      utmCampaign: "creator-kit-launch",
      conversionEvent: "purchase",
      status: "published",
      publishedLinks: [
        {
          id: "published_link_ig_dm_001",
          channelId: "pub_instagram_dm_landing",
          destinationUrl: "https://go.example.com/creator-kit?existing=1",
          publishedUrl:
            "https://go.example.com/creator-kit?existing=1&utm_source=instagram&utm_medium=dm&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=creator-tools&oc_campaign_id=campaign_api_published_links&oc_channel_id=pub_instagram_dm_landing&oc_responder_id=agent_dm_responder&oc_message_id=msg+welcome+01&oc_conversion_event=purchase&affiliate_id=impact_creator_123",
          utm: {
            source: "instagram",
            medium: "dm",
            campaign: "creator-kit-launch",
            content: "comment-trigger",
            term: "creator-tools",
          },
          owncanvasParameters: {
            campaignId: "campaign_api_published_links",
            channelId: "pub_instagram_dm_landing",
            responderId: "agent_dm_responder",
            messageId: "msg welcome 01",
            conversionEvent: "purchase",
          },
          attributionParameters: [
            {
              key: "affiliate_id",
              value: "impact_creator_123",
              source: "impact",
            },
          ],
          publishedAt: "2026-05-11T00:42:00.000Z",
        },
      ],
    },
  ]);
});

test("PATCH /api/campaigns/:campaignId records measurement results after publication", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_post_publish_measurement",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  saveCampaignPublishingConfiguration(
    storage,
    "campaign_api_post_publish_measurement",
    [
      createCampaignPublishingChannel({
        id: "pub_instagram_dm_checkout",
        type: "direct-message",
        platform: "instagram",
        label: "Instagram DM checkout",
        providerPluginId: "plugin.dm.instagram",
        account: {
          id: "ig_creator_123",
          handle: "@owncanvas",
        },
        placement: "comment-trigger",
        destinationUrl: "https://go.example.com/checkout",
        landingPageId: "landing_checkout",
        tracking: {
          utmSource: "instagram",
          utmMedium: "dm",
          utmCampaign: "creator-kit-launch",
          utmContent: "comment-trigger",
          conversionEvent: "purchase",
        },
        status: "configured",
      }),
    ],
  );
  saveCampaignPublishedLink(
    storage,
    "campaign_api_post_publish_measurement",
    "pub_instagram_dm_checkout",
    {
      responderId: "agent_dm_responder",
      messageId: "msg checkout 01",
      id: "published_link_checkout_001",
      publishedAt: "2026-05-11T00:42:00.000Z",
    },
  );

  const measurementGoals = [
    createCampaignMeasurementGoal({
      id: "goal_purchase_conversion",
      name: "purchase_conversion_rate",
      target: 4,
      unit: "percent",
      successCriteria:
        "Purchase conversion reaches four percent after publication.",
      reportingTimeframe: {
        startsAt: "2026-05-11T00:42:00.000Z",
        endsAt: "2026-05-18T00:42:00.000Z",
        timezone: "UTC",
      },
    }),
  ];
  const metrics = [
    createCampaignMeasurementMetric({
      id: "metric_purchase_conversion_rate_after_publish",
      metric: "purchase_conversion_rate",
      value: 4.6,
      unit: "percent",
      source: "plugin.tracking.active-conversion",
      attributionTouchpoint: "checkout",
      observedAt: "2026-05-12T00:42:00.000Z",
    }),
    createCampaignMeasurementMetric({
      id: "metric_attributed_revenue_after_publish",
      metric: "attributed_revenue",
      value: 920,
      unit: "USD",
      source: "plugin.tracking.active-conversion",
      attributionTouchpoint: "landing",
      observedAt: "2026-05-12T00:42:00.000Z",
    }),
  ];

  const updateResponse = await updateCampaign({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_post_publish_measurement",
      {
        method: "PATCH",
        body: JSON.stringify({
          tracking: {
            measurementGoals,
            metrics,
            conversions: ["purchase"],
            attribution: {
              model: "last-touch",
              touchpoints: ["dm", "landing", "checkout"],
            },
          },
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: { campaignId: "campaign_api_post_publish_measurement" },
    storage,
    now: () => "2026-05-12T00:45:00.000Z",
  });
  const updateBody = (await readJson(updateResponse)) as {
    campaign?: {
      measurementResults?: unknown;
      improvementStatus?: unknown;
    };
  };

  assert.equal(updateResponse.status, 200);
  assert.deepEqual(updateBody.campaign?.measurementResults, {
    state: "recorded",
    publication: {
      published: true,
      firstPublishedAt: "2026-05-11T00:42:00.000Z",
      publishedLinkCount: 1,
      channelIds: ["pub_instagram_dm_checkout"],
    },
    summary: {
      resultCount: 2,
      metricCount: 2,
      goalCount: 1,
      primaryMetric: "purchase_conversion_rate",
      primaryResult: metrics[0],
      recordedAt: "2026-05-12T00:42:00.000Z",
    },
    latestCycle: {
      schemaVersion: "owncanvas.campaign-measurement-cycle.v1",
      id: "measurement_cycle_goal_purchase_conversion_2026_05_12T00_42_00_000Z",
      status: "completed",
      goalIds: ["goal_purchase_conversion"],
      startedAt: "2026-05-11T00:42:00.000Z",
      completedAt: "2026-05-12T00:42:00.000Z",
      resultCount: 2,
      performanceResults: metrics,
      primaryResult: metrics[0],
    },
    improvementActions: [
      {
        schemaVersion: "owncanvas.campaign-improvement-action.v1",
        id: "improvement_measurement_cycle_goal_purchase_conversion_2026_05_12T00_42_00_000Z",
        status: "proposed",
        priority: "medium",
        actionType: "scale_winning_path",
        sourceMeasurementCycleId:
          "measurement_cycle_goal_purchase_conversion_2026_05_12T00_42_00_000Z",
        goalIds: ["goal_purchase_conversion"],
        metric: "purchase_conversion_rate",
        observedValue: 4.6,
        targetValue: 4,
        unit: "percent",
        recommendation:
          "Scale the winning conversion path into the next campaign iteration.",
        rationale:
          "purchase_conversion_rate recorded 4.6 percent against a target of 4 percent.",
        createdAt: "2026-05-12T00:42:00.000Z",
      },
    ],
  });
  assert.deepEqual(updateBody.campaign?.improvementStatus, {
    schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1",
    state: "proposed",
    hasCompletedMeasurementBasedImprovementCycle: false,
    completedImprovementCycleCount: 0,
  });

  const readResponse = await readCampaign({
    params: { campaignId: "campaign_api_post_publish_measurement" },
    storage,
  });
  const readBody = (await readJson(readResponse)) as {
    campaign?: {
      measurementResults?: unknown;
      measurementCycleCompletion?: unknown;
      improvementStatus?: unknown;
    };
  };

  assert.deepEqual(readBody.campaign?.measurementCycleCompletion, {
    schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
    hasCompletedMeasurementCycle: true,
    completedCycleCount: 1,
    latestCompletedCycle:
      updateBody.campaign?.measurementResults === undefined ||
      !(
        "latestCycle" in
        (updateBody.campaign.measurementResults as Record<string, unknown>)
      )
        ? undefined
        : (updateBody.campaign.measurementResults as { latestCycle: unknown })
            .latestCycle,
  });
  assert.deepEqual(
    readBody.campaign?.measurementResults,
    updateBody.campaign?.measurementResults,
  );
  assert.deepEqual(
    readBody.campaign?.improvementStatus,
    updateBody.campaign?.improvementStatus,
  );
});

test("PATCH /api/campaigns/:campaignId rejects completion without measurement results", async () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_api_completion_without_measurement",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const response = await updateCampaign({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_completion_without_measurement",
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "completed",
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: { campaignId: "campaign_api_completion_without_measurement" },
    storage,
  });
  const body = (await readJson(response)) as {
    error?: {
      completionGatingReasons?: unknown;
      completionState?: {
        measurementCycleCompletion?: {
          hasCompletedMeasurementCycle?: boolean;
        };
        improvementStatus?: {
          hasCompletedMeasurementBasedImprovementCycle?: boolean;
        };
      };
    };
  };

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-api.v1",
    error: {
      code: "campaign.validation_failed",
      message: "Campaign completion is invalid.",
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
      completionGatingReasons: [
        {
          code: "campaign_completion.measurement_record_required",
          gate: "measurement_cycle",
          path: "tracking.measurementCycles",
          message:
            "Campaign completion requires at least one completed measurement record.",
          requiredAction: "record_completed_measurement_cycle",
        },
        {
          code: "campaign_completion.improvement_record_required",
          gate: "measurement_based_improvement",
          path: "tracking.improvementActions",
          message:
            "Campaign completion requires at least one completed improvement record.",
          requiredAction: "complete_measurement_based_improvement",
        },
      ],
      completionState: {
        measurementCycleCompletion: {
          schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
          hasCompletedMeasurementCycle: false,
          completedCycleCount: 0,
        },
        improvementStatus: {
          schemaVersion:
            "owncanvas.campaign-measurement-based-improvement-status.v1",
          state: "pending",
          hasCompletedMeasurementBasedImprovementCycle: false,
          completedImprovementCycleCount: 0,
        },
      },
    },
  });
  assert.equal(
    getPersistedCampaignRecord(
      storage,
      "campaign_api_completion_without_measurement",
    )?.status,
    campaign.status,
  );
});

test("PATCH /api/campaigns/:campaignId rejects completion without improvement records", async () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_api_completion_without_improvement",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  saveCampaignMeasurementGoals(
    storage,
    "campaign_api_completion_without_improvement",
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
  saveCampaignMeasurementMetrics(
    storage,
    "campaign_api_completion_without_improvement",
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

  const response = await updateCampaign({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_completion_without_improvement",
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "completed",
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: { campaignId: "campaign_api_completion_without_improvement" },
    storage,
  });
  const body = (await readJson(response)) as {
    error?: {
      completionGatingReasons?: unknown;
      completionState?: {
        measurementCycleCompletion?: {
          hasCompletedMeasurementCycle?: boolean;
        };
        improvementStatus?: {
          hasCompletedMeasurementBasedImprovementCycle?: boolean;
        };
      };
    };
  };

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-api.v1",
    error: {
      code: "campaign.validation_failed",
      message: "Campaign completion is invalid.",
      errors: [
        {
          code: "campaign_completion.improvement_record_required",
          path: "tracking.improvementActions",
          message:
            "Campaign completion requires at least one completed improvement record.",
        },
      ],
      completionGatingReasons: [
        {
          code: "campaign_completion.improvement_record_required",
          gate: "measurement_based_improvement",
          path: "tracking.improvementActions",
          message:
            "Campaign completion requires at least one completed improvement record.",
          requiredAction: "complete_measurement_based_improvement",
        },
      ],
      completionState: {
        measurementCycleCompletion: {
          schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
          hasCompletedMeasurementCycle: true,
          completedCycleCount: 1,
          latestCompletedCycle: getPersistedCampaignRecord(
            storage,
            "campaign_api_completion_without_improvement",
          )?.tracking.measurementCycles?.[0],
        },
        improvementStatus: {
          schemaVersion:
            "owncanvas.campaign-measurement-based-improvement-status.v1",
          state: "proposed",
          hasCompletedMeasurementBasedImprovementCycle: false,
          completedImprovementCycleCount: 0,
        },
      },
    },
  });
  assert.equal(
    getPersistedCampaignRecord(
      storage,
      "campaign_api_completion_without_improvement",
    )?.status,
    campaign.status,
  );
});

test("PATCH /api/campaigns/:campaignId rejects completion when measurement is not tied to criteria", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_completion_without_measurement_criteria",
    now: () => "2026-05-11T00:00:00.000Z",
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
  saveCampaignTrackingConfiguration(
    storage,
    "campaign_api_completion_without_measurement_criteria",
    createCampaignTrackingConfiguration({
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
    }),
    { now: () => "2026-05-12T00:07:00.000Z" },
  );

  const response = await updateCampaign({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_completion_without_measurement_criteria",
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "completed",
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_completion_without_measurement_criteria",
    },
    storage,
  });
  const body = (await readJson(response)) as {
    error?: {
      completionGatingReasons?: unknown;
    };
  };

  assert.equal(response.status, 400);
  assert.deepEqual(body.error?.completionGatingReasons, [
    {
      code: "campaign_completion.measurement_criteria_required",
      gate: "measurement_criteria",
      path: "tracking.measurementGoals",
      message:
        "Campaign completion requires at least one measurement goal tied to the completed measurement cycle.",
      requiredAction: "configure_required_measurement_criteria",
    },
  ]);
  assert.equal(
    getPersistedCampaignRecord(
      storage,
      "campaign_api_completion_without_measurement_criteria",
    )?.status,
    "draft",
  );
});

test("PATCH /api/campaigns/:campaignId rejects completion when improvement is not tied to required criteria", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_completion_without_improvement_criteria",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const measurementGoal = createCampaignMeasurementGoal({
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
  saveCampaignTrackingConfiguration(
    storage,
    "campaign_api_completion_without_improvement_criteria",
    createCampaignTrackingConfiguration({
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
    }),
    { now: () => "2026-05-12T00:07:00.000Z" },
  );

  const response = await updateCampaign({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_completion_without_improvement_criteria",
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "completed",
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_completion_without_improvement_criteria",
    },
    storage,
  });
  const body = (await readJson(response)) as {
    error?: {
      completionGatingReasons?: unknown;
    };
  };

  assert.equal(response.status, 400);
  assert.deepEqual(body.error?.completionGatingReasons, [
    {
      code: "campaign_completion.improvement_criteria_required",
      gate: "improvement_criteria",
      path: "tracking.improvementActions",
      message:
        "Campaign completion requires at least one completed improvement tied to the required measurement criteria.",
      requiredAction: "complete_required_improvement_criteria",
    },
  ]);
  assert.equal(
    getPersistedCampaignRecord(
      storage,
      "campaign_api_completion_without_improvement_criteria",
    )?.status,
    "draft",
  );
});

test("PATCH /api/campaigns/:campaignId surfaces completion gating reasons", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_completion_gating_reasons",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  saveCampaignMeasurementGoals(
    storage,
    "campaign_api_completion_gating_reasons",
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
  saveCampaignMeasurementMetrics(
    storage,
    "campaign_api_completion_gating_reasons",
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

  const response = await updateCampaign({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_completion_gating_reasons",
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "completed",
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: { campaignId: "campaign_api_completion_gating_reasons" },
    storage,
  });
  const body = (await readJson(response)) as {
    error?: {
      completionGatingReasons?: unknown;
      completionState?: {
        measurementCycleCompletion?: {
          hasCompletedMeasurementCycle?: boolean;
        };
        improvementStatus?: {
          hasCompletedMeasurementBasedImprovementCycle?: boolean;
        };
      };
    };
  };

  assert.equal(response.status, 400);
  assert.deepEqual(body.error?.completionGatingReasons, [
    {
      code: "campaign_completion.improvement_record_required",
      gate: "measurement_based_improvement",
      path: "tracking.improvementActions",
      message:
        "Campaign completion requires at least one completed improvement record.",
      requiredAction: "complete_measurement_based_improvement",
    },
  ]);
  assert.equal(
    body.error?.completionState?.measurementCycleCompletion
      ?.hasCompletedMeasurementCycle,
    true,
  );
  assert.equal(
    body.error?.completionState?.improvementStatus
      ?.hasCompletedMeasurementBasedImprovementCycle,
    false,
  );
});

test("PATCH /api/campaigns/:campaignId validates measurement goals before saving", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_invalid_goals",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const existingGoals = [
    createCampaignMeasurementGoal({
      id: "goal_existing_conversion",
      name: "purchase_conversion_rate",
      target: 2.5,
      unit: "percent",
      successCriteria: "Existing valid goal stays persisted.",
      reportingTimeframe: {
        startsAt: "2026-05-12T00:00:00.000Z",
        endsAt: "2026-05-19T00:00:00.000Z",
        timezone: "UTC",
      },
    }),
  ];

  saveCampaignMeasurementGoals(
    storage,
    "campaign_api_invalid_goals",
    existingGoals,
    {
      now: () => "2026-05-11T00:02:00.000Z",
    },
  );

  const response = await updateCampaign({
    request: new Request("http://localhost/api/campaigns/campaign_api_invalid_goals", {
      method: "PATCH",
      body: JSON.stringify({
        tracking: {
          measurementGoals: [
            {
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
            },
          ],
        },
      }),
      headers: { "content-type": "application/json" },
    }),
    params: {
      campaignId: "campaign_api_invalid_goals",
    },
    storage,
  });
  const body = (await readJson(response)) as {
    error?: {
      completionGatingReasons?: unknown;
      completionState?: {
        measurementCycleCompletion?: {
          hasCompletedMeasurementCycle?: boolean;
        };
        improvementStatus?: {
          hasCompletedMeasurementBasedImprovementCycle?: boolean;
        };
      };
    };
  };

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-api.v1",
    error: {
      code: "campaign.validation_failed",
      message: "Campaign measurement goals are invalid.",
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
      ],
    },
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_api_invalid_goals")?.tracking
      .measurementGoals,
    existingGoals,
  );
});

test("PATCH /api/campaigns/:campaignId validates measurement metrics before saving", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_invalid_metrics",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const existingTracking = createCampaignTrackingConfiguration({
    metrics: [
      createCampaignMeasurementMetric({
        id: "metric_existing_conversion_rate",
        metric: "purchase_conversion_rate",
        value: 3.4,
        unit: "percent",
        source: "plugin.tracking.active-conversion",
        attributionTouchpoint: "checkout",
        observedAt: "2026-05-13T00:00:00.000Z",
      }),
    ],
  });

  saveCampaignTrackingConfiguration(
    storage,
    "campaign_api_invalid_metrics",
    existingTracking,
    {
      now: () => "2026-05-11T00:03:00.000Z",
    },
  );

  const response = await updateCampaign({
    request: new Request("http://localhost/api/campaigns/campaign_api_invalid_metrics", {
      method: "PATCH",
      body: JSON.stringify({
        tracking: {
          metrics: [
            {
              id: "",
              metric: "",
              value: -1,
              unit: "",
              source: "",
              attributionTouchpoint: "",
              observedAt: "not-a-date",
            },
          ],
        },
      }),
      headers: { "content-type": "application/json" },
    }),
    params: {
      campaignId: "campaign_api_invalid_metrics",
    },
    storage,
  });
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-api.v1",
    error: {
      code: "campaign.validation_failed",
      message: "Campaign measurement metrics are invalid.",
      errors: [
        {
          code: "measurement_metric.id_required",
          path: "tracking.metrics.0.id",
          message: "Measurement metric id is required.",
        },
        {
          code: "measurement_metric.metric_required",
          path: "tracking.metrics.0.metric",
          message: "Measurement metric name is required.",
        },
        {
          code: "measurement_metric.value_invalid",
          path: "tracking.metrics.0.value",
          message: "Measurement metric value cannot be negative.",
        },
        {
          code: "measurement_metric.unit_required",
          path: "tracking.metrics.0.unit",
          message: "Measurement metric unit is required.",
        },
        {
          code: "measurement_metric.source_required",
          path: "tracking.metrics.0.source",
          message: "Measurement metric source is required.",
        },
        {
          code: "measurement_metric.attribution_touchpoint_required",
          path: "tracking.metrics.0.attributionTouchpoint",
          message: "Measurement metric attribution touchpoint is required.",
        },
        {
          code: "measurement_metric.observed_at_invalid",
          path: "tracking.metrics.0.observedAt",
          message: "Measurement metric observed time must be a valid timestamp.",
        },
      ],
    },
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_api_invalid_metrics")
      ?.tracking,
    existingTracking,
  );
});

test("PATCH /api/campaigns/:campaignId validates tracking configuration before saving", async () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_api_invalid_tracking",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const response = await updateCampaign({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_invalid_tracking",
      {
        method: "PATCH",
        body: JSON.stringify({
          tracking: {
            conversions: ["purchase"],
            attribution: {
              touchpoints: [],
            },
          },
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_invalid_tracking",
    },
    storage,
  });
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-api.v1",
    error: {
      code: "campaign.validation_failed",
      message: "Campaign tracking configuration is invalid.",
      errors: [
        {
          code: "tracking.attribution_touchpoint_required",
          path: "tracking.attribution.touchpoints",
          message:
            "At least one attribution touchpoint is required when conversions are tracked.",
        },
      ],
    },
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_api_invalid_tracking")
      ?.tracking,
    campaign.tracking,
  );
});

test("PATCH /api/campaigns/:campaignId saves validated measurement goals and tracking", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_valid_measurement_tracking",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const measurementGoals = [
    createCampaignMeasurementGoal({
      id: "goal_checkout_purchase",
      name: "purchase_conversion_rate",
      target: 4,
      unit: "percent",
      successCriteria: "Checkout purchase conversion reaches four percent.",
      reportingTimeframe: {
        startsAt: "2026-05-12T00:00:00.000Z",
        endsAt: "2026-05-19T00:00:00.000Z",
        timezone: "UTC",
      },
    }),
  ];
  const metrics = [
    createCampaignMeasurementMetric({
      id: "metric_checkout_purchase",
      metric: "purchase_conversion_rate",
      value: 4.3,
      unit: "percent",
      source: "plugin.tracking.active-conversion",
      attributionTouchpoint: "checkout",
      observedAt: "2026-05-13T00:00:00.000Z",
    }),
  ];
  const tracking = createCampaignTrackingConfiguration({
    measurementGoals,
    metrics,
    events: ["dm_link_clicked", "purchase"],
    conversions: ["purchase"],
    attribution: {
      model: "last-touch",
      touchpoints: ["dm", "landing", "checkout"],
    },
  });

  const response = await updateCampaign({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_valid_measurement_tracking",
      {
        method: "PATCH",
        body: JSON.stringify({ tracking }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_valid_measurement_tracking",
    },
    storage,
    now: () => "2026-05-11T00:10:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-api.v1",
    campaign: {
      id: "campaign_api_valid_measurement_tracking",
      title: "Untitled campaign",
      objective: "",
      status: "draft",
      updatedAt: "2026-05-11T00:10:00.000Z",
      tracking,
      measurementCycleCompletion: {
        schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
        hasCompletedMeasurementCycle: true,
        completedCycleCount: 1,
        latestCompletedCycle: tracking.measurementCycles?.[0],
      },
      improvementStatus: {
        schemaVersion: "owncanvas.campaign-measurement-based-improvement-status.v1",
        state: "proposed",
        hasCompletedMeasurementBasedImprovementCycle: false,
        completedImprovementCycleCount: 0,
      },
    },
  });
  assert.deepEqual(
    getPersistedCampaignRecord(
      storage,
      "campaign_api_valid_measurement_tracking",
    )?.tracking,
    tracking,
  );
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
