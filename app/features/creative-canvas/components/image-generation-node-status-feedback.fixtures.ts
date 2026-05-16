import {
  createImageGenerationNodeProperties,
  createImageGenerationNodeUiState,
  failImageGenerationNodeTransition,
  imageGenerationNodeV2Statuses,
  queueImageGenerationNodeV2Transition,
  succeedImageGenerationNodeV2Transition,
  type ImageGenerationNodeUiStatus,
} from "../model/image-generation-node.ts";

type ImageGenerationNodeStatusFeedbackStoryFixture = {
  id: string;
  status: ImageGenerationNodeUiStatus;
  renderedHtml: "";
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
  renderedHtml: "";
};

export const imageGenerationNodeStatusFeedbackStoryFixtures =
  imageGenerationNodeV2Statuses.map((status) => ({
    id: `image-generation-node-status-${status}`,
    status,
    renderedHtml: "",
  })) satisfies readonly ImageGenerationNodeStatusFeedbackStoryFixture[];

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
      const fixture = {
        id,
        phase,
        retryable,
        status: node.uiState.status,
        statusMessage: node.uiState.statusMessage,
        errorReason: node.uiState.errorReason,
        selectedResultAssetId: node.uiState.selectedResultAssetId,
        outputConnectionReady: node.uiState.outputConnectionReady,
      } as const satisfies Omit<ImageGenerationNodeRecoveryFeedbackFixture, "renderedHtml">;

      return {
        ...fixture,
        renderedHtml: "",
      };
    },
  ) satisfies readonly ImageGenerationNodeRecoveryFeedbackFixture[];
