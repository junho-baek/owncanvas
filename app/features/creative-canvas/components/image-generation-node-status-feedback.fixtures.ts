import {
  createImageGenerationNodeProperties,
  createImageGenerationNodeUiState,
  failImageGenerationNodeTransition,
  imageGenerationNodeV2Statuses,
  queueImageGenerationNodeV2Transition,
  resolveImageGenerationNodeOutputView,
  resolveImageGenerationNodeStatusView,
  succeedImageGenerationNodeV2Transition,
  type ImageGenerationNodeUiStatus,
} from "../model/image-generation-node.ts";

type ImageGenerationNodeStatusFeedbackBadgeFixture = {
  role: "status";
  className: string;
  dataStatus: ImageGenerationNodeUiStatus;
  ariaLabel: string;
  text: string;
};

type ImageGenerationNodeStatusFeedbackStoryFixture = {
  id: string;
  status: ImageGenerationNodeUiStatus;
  badge: ImageGenerationNodeStatusFeedbackBadgeFixture;
  renderedHtml: string;
};

type ImageGenerationNodeRecoveryFeedbackFixture = {
  id: string;
  phase: "error" | "recovery";
  retryable: boolean;
  status: ImageGenerationNodeUiStatus;
  statusMessage: string | null;
  errorReason: string | null;
  selectedResultAssetId: string | null;
  outputConnectionReady: boolean;
  statusBadge: ImageGenerationNodeStatusFeedbackBadgeFixture;
  outputBadge: {
    className: string;
    dataOutputState: string;
    ariaLabel: string;
    text: string;
  };
  renderedHtml: string;
};

function renderStatusFeedbackBadgeFixture(
  badge: ImageGenerationNodeStatusFeedbackBadgeFixture,
): string {
  return `<span class="${badge.className}" data-status="${badge.dataStatus}" role="${badge.role}" aria-label="${badge.ariaLabel}">${badge.text}</span>`;
}

function createStatusFeedbackBadgeFixture(
  status: ImageGenerationNodeUiStatus,
): ImageGenerationNodeStatusFeedbackBadgeFixture {
  const view = resolveImageGenerationNodeStatusView(status);

  return {
    role: "status",
    className: `space-node-status ${view.className}`,
    dataStatus: view.status,
    ariaLabel: view.ariaLabel,
    text: view.label,
  };
}

function renderRecoveryFeedbackFixture(
  fixture: Omit<ImageGenerationNodeRecoveryFeedbackFixture, "renderedHtml">,
): string {
  return [
    renderStatusFeedbackBadgeFixture(fixture.statusBadge),
    `<div class="${fixture.outputBadge.className}" data-output-state="${fixture.outputBadge.dataOutputState}" aria-label="${fixture.outputBadge.ariaLabel}"><span>${fixture.outputBadge.text}</span></div>`,
  ].join("");
}

export const imageGenerationNodeStatusFeedbackStoryFixtures =
  imageGenerationNodeV2Statuses.map((status) => {
    const badge = createStatusFeedbackBadgeFixture(status);

    return {
      id: `image-generation-node-status-${status}`,
      status,
      badge,
      renderedHtml: renderStatusFeedbackBadgeFixture(badge),
    };
  }) satisfies readonly ImageGenerationNodeStatusFeedbackStoryFixture[];

const retryableErrorNode = failImageGenerationNodeTransition(
  createImageGenerationNodeProperties({
    uiState: createImageGenerationNodeUiState({
      status: "running",
      progressPercent: 64,
      statusMessage: "Provider is rendering",
      outputConnectionReady: true,
    }),
  }),
  {
    name: "ProviderRateLimitError",
    message: "Replicate is temporarily rate limited",
    providerId: "replicate",
    modelSlug: "google/nano-banana",
    providerRequestId: "prediction_retryable_1",
    retryable: true,
  },
);
const nonRetryableErrorNode = failImageGenerationNodeTransition(
  createImageGenerationNodeProperties({
    uiState: createImageGenerationNodeUiState({
      status: "running",
      progressPercent: 42,
      statusMessage: "Provider is rendering",
    }),
  }),
  {
    name: "ProviderSafetyError",
    message: "Provider rejected unsafe reference image",
    providerId: "replicate",
    modelSlug: "google/nano-banana",
    providerRequestId: "prediction_blocked_1",
    retryable: false,
  },
);
const recoveryQueuedNode = queueImageGenerationNodeV2Transition(retryableErrorNode);
const recoverySucceededNode = succeedImageGenerationNodeV2Transition(
  recoveryQueuedNode,
  {
    generatedAssetIds: ["asset_vertical_recovered_1"],
    metadataRunId: "run_recovered_metadata_1",
    costUsageRunId: "run_recovered_cost_1",
  },
);

const imageGenerationNodeErrorRecoveryFeedbackFixtureCases = [
  {
    id: "image-generation-node-error-retryable-provider",
    phase: "error",
    retryable: true,
    node: retryableErrorNode,
  },
  {
    id: "image-generation-node-error-non-retryable-provider",
    phase: "error",
    retryable: false,
    node: nonRetryableErrorNode,
  },
  {
    id: "image-generation-node-recovery-queued",
    phase: "recovery",
    retryable: true,
    node: recoveryQueuedNode,
  },
  {
    id: "image-generation-node-recovery-succeeded",
    phase: "recovery",
    retryable: true,
    node: recoverySucceededNode,
  },
] as const;

export const imageGenerationNodeErrorRecoveryFeedbackFixtures =
  imageGenerationNodeErrorRecoveryFeedbackFixtureCases.map(
    ({ id, phase, retryable, node }) => {
      const statusBadge = createStatusFeedbackBadgeFixture(node.uiState.status);
      const outputView = resolveImageGenerationNodeOutputView(node);
      const fixture = {
        id,
        phase,
        retryable,
        status: node.uiState.status,
        statusMessage: node.uiState.statusMessage,
        errorReason: node.uiState.errorReason,
        selectedResultAssetId: node.uiState.selectedResultAssetId,
        outputConnectionReady: node.uiState.outputConnectionReady,
        statusBadge,
        outputBadge: {
          className: `space-primary-output-preview ${outputView.className}`,
          dataOutputState: outputView.state,
          ariaLabel: outputView.ariaLabel,
          text: outputView.label,
        },
      } as const satisfies Omit<ImageGenerationNodeRecoveryFeedbackFixture, "renderedHtml">;

      return {
        ...fixture,
        renderedHtml: renderRecoveryFeedbackFixture(fixture),
      };
    },
  ) satisfies readonly ImageGenerationNodeRecoveryFeedbackFixture[];
