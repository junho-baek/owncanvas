import {
  createCampaignTrackingConfiguration,
  getCampaignMeasurementBasedImprovementStatus,
  getCampaignMeasurementCycleCompletion,
  getPersistedCampaignRecord,
  updatePersistedCampaignRecord,
  validateCampaignMeasurementGoals,
  validateCampaignMeasurementMetrics,
  validateCampaignCompletion,
  validateCampaignTrackingConfiguration,
  type CampaignAssetGenerationExecutionRecord,
  type CampaignAssetGenerationExecutionStatus,
  type CampaignAssetGenerationJob,
  type CampaignAssetGenerationJobLifecycle,
  type CampaignCompletionValidationError,
  type CampaignRecord,
  type CampaignStatus,
  type CampaignTracking,
  type CampaignTrackingInput,
  type UpdateCampaignRecordOptions,
} from "../features/creative-canvas/model/creative-canvas.ts";

export const CAMPAIGN_API_SCHEMA_VERSION = "owncanvas.campaign-api.v1";

type CampaignApiStorage = Pick<Storage, "getItem" | "setItem">;

type CampaignLoaderArgs = {
  params: {
    campaignId?: string;
  };
  storage?: Pick<Storage, "getItem">;
};

type CampaignActionArgs = {
  request: Request;
  params: {
    campaignId?: string;
  };
  storage?: CampaignApiStorage;
  now?: UpdateCampaignRecordOptions["now"];
};

type CampaignApiError = {
  code: string;
  message: string;
  errors?: Array<{
    code: string;
    path: string;
    message: string;
  }>;
  completionGatingReasons?: CampaignCompletionGatingReason[];
  completionState?: CampaignCompletionState;
};

type CampaignCompletionGatingReason = CampaignCompletionValidationError & {
  gate:
    | "measurement_cycle"
    | "measurement_criteria"
    | "improvement_criteria"
    | "measurement_based_improvement";
  requiredAction:
    | "record_completed_measurement_cycle"
    | "configure_required_measurement_criteria"
    | "complete_required_improvement_criteria"
    | "complete_measurement_based_improvement";
};

type CampaignCompletionState = {
  measurementCycleCompletion: ReturnType<
    typeof getCampaignMeasurementCycleCompletion
  >;
  improvementStatus: ReturnType<
    typeof getCampaignMeasurementBasedImprovementStatus
  >;
};

const fallbackCampaignStorage = new Map<string, string>();

export function loader({ params, storage }: CampaignLoaderArgs) {
  const campaignId = params.campaignId ?? "";
  const campaign = getPersistedCampaignRecord(
    storage ?? createFallbackCampaignStorage(),
    campaignId,
  );

  if (campaign === null) {
    return campaignErrorResponse(
      {
        code: "campaign.not_found",
        message: `Campaign "${campaignId}" was not found.`,
      },
      404,
    );
  }

  return Response.json({
    schemaVersion: CAMPAIGN_API_SCHEMA_VERSION,
    campaign: toCampaignApiCampaign(campaign),
  });
}

export async function action({
  request,
  params,
  storage,
  now,
}: CampaignActionArgs) {
  if (request.method !== "PATCH") {
    return campaignErrorResponse(
      {
        code: "method_not_allowed",
        message: "Campaign updates must use PATCH.",
      },
      405,
    );
  }

  const campaignId = params.campaignId ?? "";
  const campaignStorage = storage ?? createFallbackCampaignStorage();
  const campaign = getPersistedCampaignRecord(campaignStorage, campaignId);

  if (campaign === null) {
    return campaignErrorResponse(
      {
        code: "campaign.not_found",
        message: `Campaign "${campaignId}" was not found.`,
      },
      404,
    );
  }

  const body = await readCampaignUpdateBody(request);

  if (body === null) {
    return campaignErrorResponse(
      {
        code: "campaign.invalid_json",
        message: "Campaign update body must be valid JSON.",
      },
      400,
    );
  }

  const statusValidation = validateCampaignStatusInput(body.status);

  if (!statusValidation.valid) {
    return campaignErrorResponse(
      {
        code: "campaign.validation_failed",
        message: "Campaign status is invalid.",
        errors: statusValidation.errors,
      },
      400,
    );
  }

  const tracking = mergeCampaignTracking(campaign.tracking, body.tracking);
  const status = body.status ?? campaign.status;
  const measurementGoalValidation = validateCampaignMeasurementGoals(
    tracking.measurementGoals,
  );

  if (!measurementGoalValidation.valid) {
    return campaignErrorResponse(
      {
        code: "campaign.validation_failed",
        message: "Campaign measurement goals are invalid.",
        errors: measurementGoalValidation.errors,
      },
      400,
    );
  }

  const measurementMetricValidation = validateCampaignMeasurementMetrics(
    tracking.metrics,
  );

  if (!measurementMetricValidation.valid) {
    return campaignErrorResponse(
      {
        code: "campaign.validation_failed",
        message: "Campaign measurement metrics are invalid.",
        errors: measurementMetricValidation.errors,
      },
      400,
    );
  }

  const trackingValidation = validateCampaignTrackingConfiguration(tracking);

  if (!trackingValidation.valid) {
    return campaignErrorResponse(
      {
        code: "campaign.validation_failed",
        message: "Campaign tracking configuration is invalid.",
        errors: trackingValidation.errors,
      },
      400,
    );
  }

  const completionValidation = validateCampaignCompletion({
    status,
    tracking,
  });

  if (!completionValidation.valid) {
    const completionCandidate = { status, tracking };

    return campaignErrorResponse(
      {
        code: "campaign.validation_failed",
        message: "Campaign completion is invalid.",
        errors: completionValidation.errors,
        completionGatingReasons: toCampaignCompletionGatingReasons(
          completionValidation.errors,
        ),
        completionState: {
          measurementCycleCompletion:
            getCampaignMeasurementCycleCompletion(completionCandidate),
          improvementStatus:
            getCampaignMeasurementBasedImprovementStatus(completionCandidate),
        },
      },
      400,
    );
  }

  const updatedCampaign = updatePersistedCampaignRecord(
    campaignStorage,
    {
      ...campaign,
      status,
      tracking,
    },
    { now },
  );

  return Response.json({
    schemaVersion: CAMPAIGN_API_SCHEMA_VERSION,
    campaign: toCampaignApiCampaign(updatedCampaign),
  });
}

function toCampaignApiCampaign(campaign: CampaignRecord) {
  const assetGeneration = toCampaignAssetGenerationApiContract(campaign);
  const publishing = toCampaignPublishingApiContract(campaign);
  const measurementResults = toCampaignMeasurementResultsApiContract(campaign);

  return {
    id: campaign.id,
    title: campaign.title,
    objective: campaign.objective,
    status: campaign.status,
    updatedAt: campaign.updatedAt,
    tracking: campaign.tracking,
    measurementCycleCompletion: getCampaignMeasurementCycleCompletion(campaign),
    improvementStatus: getCampaignMeasurementBasedImprovementStatus(campaign),
    ...(assetGeneration === null ? {} : { assetGeneration }),
    ...(publishing === null ? {} : { publishing }),
    ...(measurementResults === null ? {} : { measurementResults }),
  };
}

function toCampaignCompletionGatingReasons(
  errors: CampaignCompletionValidationError[],
): CampaignCompletionGatingReason[] {
  return errors.map((error) => {
    if (error.code === "campaign_completion.measurement_record_required") {
      return {
        ...error,
        gate: "measurement_cycle",
        requiredAction: "record_completed_measurement_cycle",
      };
    }

    if (error.code === "campaign_completion.measurement_criteria_required") {
      return {
        ...error,
        gate: "measurement_criteria",
        requiredAction: "configure_required_measurement_criteria",
      };
    }

    if (error.code === "campaign_completion.improvement_criteria_required") {
      return {
        ...error,
        gate: "improvement_criteria",
        requiredAction: "complete_required_improvement_criteria",
      };
    }

    return {
      ...error,
      gate: "measurement_based_improvement",
      requiredAction: "complete_measurement_based_improvement",
    };
  });
}

function toCampaignMeasurementResultsApiContract(campaign: CampaignRecord) {
  const metrics = campaign.tracking.metrics ?? [];
  const measurementCycles = campaign.tracking.measurementCycles ?? [];
  const improvementActions = campaign.tracking.improvementActions ?? [];
  const publishedLinks = campaign.channels.flatMap((channel) =>
    channel.publishedLinks.map((link) => ({
      channelId: channel.id,
      publishedAt: link.publishedAt,
    })),
  );

  if (publishedLinks.length === 0) {
    return null;
  }

  const latestCycle = measurementCycles
    .filter((cycle) => cycle.status === "completed" && cycle.resultCount > 0)
    .slice()
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt))
    .at(-1);

  if (metrics.length === 0 && latestCycle === undefined) {
    return null;
  }

  const firstPublishedAt = publishedLinks
    .map((link) => link.publishedAt)
    .filter((publishedAt) => !Number.isNaN(Date.parse(publishedAt)))
    .sort()
    .at(0);
  const channelIds = Array.from(
    new Set(publishedLinks.map((link) => link.channelId)),
  ).sort();
  const primaryMetric = campaign.tracking.evaluation.primarySuccessMetric.metric;
  const primaryResult =
    latestCycle?.primaryResult ??
    metrics.find((metric) => metric.metric === primaryMetric) ??
    metrics[0];
  const recordedAt =
    latestCycle?.completedAt ??
    metrics
      .map((metric) => metric.observedAt)
      .filter((observedAt) => !Number.isNaN(Date.parse(observedAt)))
      .sort()
      .at(-1) ??
    "";

  return {
    state: "recorded",
    publication: {
      published: true,
      firstPublishedAt: firstPublishedAt ?? null,
      publishedLinkCount: publishedLinks.length,
      channelIds,
    },
    summary: {
      resultCount: latestCycle?.resultCount ?? metrics.length,
      metricCount: metrics.length,
      goalCount: campaign.tracking.measurementGoals.length,
      primaryMetric,
      primaryResult,
      recordedAt,
    },
    ...(latestCycle === undefined ? {} : { latestCycle }),
    improvementActions,
  };
}

function toCampaignPublishingApiContract(campaign: CampaignRecord) {
  if (campaign.channels.length === 0) {
    return null;
  }

  return {
    channels: campaign.channels.map((channel) => ({
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
      publishedLinks: channel.publishedLinks.map((link) => ({
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
      })),
    })),
  };
}

function toCampaignAssetGenerationApiContract(campaign: CampaignRecord) {
  const jobs = campaign.campaignSpec.assetGenerationJobs ?? [];
  const executions = campaign.campaignSpec.assetGenerationExecutions ?? [];

  if (jobs.length === 0 && executions.length === 0) {
    return null;
  }

  const jobStates = jobs.map((job) =>
    toCampaignAssetGenerationJobApiState(job, executions),
  );
  const completedJobs = jobStates.filter(
    (job) => job.executionStatus === "completed",
  ).length;
  const failedJobs = jobStates.filter(
    (job) => job.executionStatus === "failed",
  ).length;
  const runningJobs = jobStates.filter(
    (job) => job.executionStatus === "running",
  ).length;
  const pendingJobs = jobStates.filter(
    (job) => job.executionStatus === "pending",
  ).length;
  const totalJobs = jobStates.length;
  const finishedJobs = completedJobs + failedJobs;
  const percentComplete =
    totalJobs === 0 ? 0 : Math.round((finishedJobs / totalJobs) * 100);

  return {
    summary: {
      totalJobs,
      pendingJobs,
      runningJobs,
      completedJobs,
      failedJobs,
      percentComplete,
      state: getAssetGenerationApiSummaryState({
        totalJobs,
        pendingJobs,
        runningJobs,
        completedJobs,
        failedJobs,
      }),
    },
    jobs: jobStates,
    executions: executions.map(toCampaignAssetGenerationExecutionApiState),
  };
}

function toCampaignAssetGenerationJobApiState(
  job: CampaignAssetGenerationJob,
  executions: CampaignAssetGenerationExecutionRecord[],
) {
  const latestExecution = findLatestCampaignAssetGenerationExecution(
    job.id,
    executions,
  );
  const lifecycle = job.lifecycle;

  return {
    jobId: job.id,
    mediaType: job.mediaType,
    providerPluginId: job.providerPluginId,
    capabilityId: job.capabilityId,
    jobStatus: latestExecution?.jobStatus ?? job.status,
    executionStatus:
      latestExecution?.status ?? getAssetGenerationApiExecutionStatus(job),
    progress:
      latestExecution?.progress ?? getAssetGenerationLifecycleProgress(lifecycle),
    startedAt: latestExecution?.startedAt ?? lifecycle?.startedAt ?? null,
    completedAt: latestExecution?.completedAt ?? lifecycle?.completedAt ?? null,
    failedAt: latestExecution?.failedAt ?? lifecycle?.failedAt ?? null,
    error: latestExecution?.error ?? lifecycle?.error ?? null,
    latestExecutionId: latestExecution?.id ?? null,
  };
}

function toCampaignAssetGenerationExecutionApiState(
  execution: CampaignAssetGenerationExecutionRecord,
) {
  return {
    id: execution.id,
    jobId: execution.jobId,
    mediaType: execution.mediaType,
    status: execution.status,
    jobStatus: execution.jobStatus,
    progress: execution.progress,
    error: execution.error,
    statusEvents: execution.statusEvents.map((event) => ({
      status: event.status,
      progress: event.progress,
      error: event.error,
    })),
  };
}

function findLatestCampaignAssetGenerationExecution(
  jobId: CampaignAssetGenerationJob["id"],
  executions: CampaignAssetGenerationExecutionRecord[],
) {
  return executions
    .filter((execution) => execution.jobId === jobId)
    .at(-1);
}

function getAssetGenerationApiExecutionStatus(
  job: CampaignAssetGenerationJob,
): CampaignAssetGenerationExecutionStatus | "pending" {
  if (job.status === "completed") {
    return "completed";
  }

  if (job.status === "failed") {
    return "failed";
  }

  if (job.status === "running") {
    return "running";
  }

  return "pending";
}

function getAssetGenerationLifecycleProgress(
  lifecycle: CampaignAssetGenerationJobLifecycle | undefined,
) {
  return lifecycle?.progress ?? 0;
}

function getAssetGenerationApiSummaryState(summary: {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
}) {
  if (summary.totalJobs === 0) {
    return "empty";
  }

  if (summary.runningJobs > 0) {
    return "running";
  }

  if (summary.failedJobs > 0 && summary.pendingJobs === 0) {
    return summary.completedJobs > 0 ? "completed_with_errors" : "failed";
  }

  if (summary.completedJobs === summary.totalJobs) {
    return "completed";
  }

  return "pending";
}

function mergeCampaignTracking(
  currentTracking: CampaignTracking,
  trackingInput: CampaignTrackingInput | undefined,
) {
  if (trackingInput === undefined) {
    return currentTracking;
  }

  const mergedTracking = {
    ...currentTracking,
    ...trackingInput,
    utm: {
      ...currentTracking.utm,
      ...trackingInput.utm,
    },
    attribution: {
      ...currentTracking.attribution,
      ...trackingInput.attribution,
    },
  };

  if (
    trackingInput.metrics !== undefined &&
    trackingInput.measurementCycles === undefined
  ) {
    const {
      measurementCycles: _measurementCycles,
      improvementActions: _improvementActions,
      ...trackingWithoutMeasurementDerivatives
    } = mergedTracking;

    return createCampaignTrackingConfiguration(
      trackingInput.improvementActions === undefined
        ? trackingWithoutMeasurementDerivatives
        : {
            ...trackingWithoutMeasurementDerivatives,
            improvementActions: trackingInput.improvementActions,
          },
    );
  }

  return createCampaignTrackingConfiguration(mergedTracking);
}

function validateCampaignStatusInput(status: unknown):
  | { valid: true; errors: [] }
  | {
      valid: false;
      errors: Array<{ code: string; path: string; message: string }>;
    } {
  if (
    status === undefined ||
    status === "draft" ||
    status === "completed"
  ) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        code: "campaign.status_invalid",
        path: "status",
        message: "Campaign status must be draft or completed.",
      },
    ],
  };
}

async function readCampaignUpdateBody(
  request: Request,
): Promise<{ status?: CampaignStatus; tracking?: CampaignTrackingInput } | null> {
  try {
    const body = (await request.json()) as {
      status?: CampaignStatus;
      tracking?: CampaignTrackingInput;
    };

    return {
      ...(body.status === undefined ? {} : { status: body.status }),
      ...(body.tracking === undefined ? {} : { tracking: body.tracking }),
    };
  } catch {
    return null;
  }
}

function campaignErrorResponse(error: CampaignApiError, status: number) {
  return Response.json(
    {
      schemaVersion: CAMPAIGN_API_SCHEMA_VERSION,
      error,
    },
    { status },
  );
}

function createFallbackCampaignStorage(): CampaignApiStorage {
  return {
    getItem(key: string) {
      return fallbackCampaignStorage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      fallbackCampaignStorage.set(key, value);
    },
  };
}
