import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ComponentType, DragEvent, KeyboardEvent, ReactNode } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Handle,
  NodeResizer,
  PanOnScrollMode,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type EdgeChange,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Blocks,
  Bot,
  Captions,
  Clock3,
  Globe2,
  Grid2X2,
  Hand,
  ImageIcon,
  Link2,
  Maximize2,
  MessageSquare,
  Mic2,
  MousePointer2,
  Pause,
  Play,
  Plug,
  Redo2,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Target,
  Trash2,
  Type,
  Upload,
  Volume2,
  Undo2,
  Video,
  X,
} from "lucide-react";

import { cn } from "~/core/lib/cn";
import {
  createImageGenerationFanOutPlan,
  createImageGenerationSingleNodeRetryPlan,
} from "~/features/creative-canvas/adapters/image-generation-fanout";
import { createVideoGenerationRunPlan } from "~/features/creative-canvas/adapters/video-generation-run";
import {
  applyImageOutputNextNodeActionToCanvas,
  createGenerationFlowNode,
  createCreativeCanvasSnapshotFromCampaignSpecJsonEdit,
  syncCampaignFromCreativeCanvasInteraction,
  toCreativeFlowEdges,
  toCreativeFlowNodes,
  type CreativeCanvasSpecJsonSyncResult,
  type CreativeFlowEdge,
  type CreativeFlowNode,
} from "~/features/creative-canvas/adapters/react-flow-canvas";
import {
  CAMPAIGN_TARGET_AUDIENCE_FIELDS,
  CAMPAIGN_LANDING_PAGE_CONVERSION_PLACEMENT_OPTIONS,
  CAMPAIGN_LANDING_PAGE_ELEMENT_TIMING_OPTIONS,
  CAMPAIGN_LANDING_PAGE_ELEMENT_VISIBILITY_OPTIONS,
  CAMPAIGN_LANDING_PAGE_BEHAVIOR_MODES,
  CAMPAIGN_LANDING_PAGE_NAVIGATION_PLACEMENT_OPTIONS,
  CAMPAIGN_LANDING_PAGE_PLAYBACK_INTERRUPTION_OPTIONS,
  addCampaignAsset,
  archiveCampaignAsset,
  createCampaignAsset,
  createCampaignMeasurementGoal,
  createCampaignPublishingChannel,
  editCampaignAsset,
  getCampaignAssetDetails,
  getCampaignLandingPageBehaviorConfiguration,
  getCampaignLandingPageConversionElements,
  getCampaignLandingPageNavigationConfiguration,
  createCampaignShortFormContentControlModel,
  generationPalette,
  listCampaignAssets,
  removeCampaignAsset,
  replaceCampaignAsset,
  serializeCampaignSpecJson,
  setCampaignLandingPageAuthoringControls,
  setCampaignLandingPageBehaviorMode,
  type CampaignAsset,
  type CampaignAssetMediaType,
  type CampaignAssetStatus,
  type CampaignAssetSummary,
  type CampaignAssetUsage,
  type CampaignLandingPageConversionElementConfiguration,
  type CampaignLandingPageConversionElementPlacement,
  type CampaignLandingPageBehaviorMode,
  type CampaignLandingPageElementTiming,
  type CampaignLandingPageElementVisibility,
  type CampaignDraft,
  type CampaignMeasurementGoal,
  type CampaignLandingPageNavigationPlacement,
  type CampaignLandingPagePlaybackInterruptionBehavior,
  type CampaignProductOffer,
  type CampaignPublishingChannelType,
  type CampaignPublishingStatus,
  type CampaignShortFormContentControlModel,
  type CampaignSpecJsonEditValidationError,
  type CampaignTargetAudienceField,
  type GenerationBlockKind,
  type GenerationBlockTone,
} from "~/features/creative-canvas/model/creative-canvas";
import {
  isGenerationBatchResponse,
  type GenerationBatchRequest,
  type GenerationBatchResponse,
  type GenerationJobResult,
} from "~/features/creative-canvas/model/generation-batch";
import { persistGenerationBatchResponseToCampaign } from "~/features/creative-canvas/model/generation-batch-persistence";
import {
  IMAGE_GENERATION_COMPACT_FRAME_LIMITS,
  attachImageGenerationNodeReferenceTransition,
  closeImageGenerationNodeInspectorTransition,
  failImageGenerationNodeV2Transition,
  isImageGenerationNodeProperties,
  listImageGenerationReferenceTrayAttachments,
  openImageGenerationNodeInspectorTransition,
  parseImageGenerationModelPickerValue,
  queueImageGenerationNodeV2Transition,
  reorderImageGenerationNodeReferenceTransition,
  removeImageGenerationNodeReferenceTransition,
  resolveImageGenerationModelPickerOptions,
  resolveImageGenerationDocsPanelMetadata,
  resolveImageGenerationAspectRatioSelectorOptions,
  resolveImageGenerationOutputNextNodeActions,
  resolveImageGenerationNodeModelCapability,
  resolveImageGenerationReferenceTrayCapability,
  resolveImageGenerationReferenceTrayEmptyState,
  resolveImageGenerationNodeStatus,
  resolveImageGenerationNodeStatusView,
  selectImageGenerationNodeAspectRatioTransition,
  selectImageGenerationNodeModelTransition,
  succeedImageGenerationNodeV2Transition,
  validateImageGenerationReferenceAttachmentDraft,
  validateImageGenerationFanOutReadiness,
  type ImageGenerationAspectRatio,
  type ImageGenerationInputControlDefaultValue,
  type ImageGenerationOutputNextNodeActionKind,
  type ImageGenerationNodeReferenceInput,
  type ImageGenerationNodeProperties,
  type ImageGenerationProviderId,
  type ImageGenerationReferenceTrayAttachment,
} from "~/features/creative-canvas/model/image-generation-node";
import {
  createVideoGenerationNodeProperties,
  createVideoGenerationFailureDetails,
  failVideoGenerationNodeTransition,
  isVideoGenerationNodeProperties,
  queueVideoGenerationNodeTransition,
  resolveVideoGenerationModelPickerOptions,
  selectVideoGenerationNodeModelTransition,
  succeedVideoGenerationNodeTransition,
  validateVideoGenerationRunReadiness,
  type VideoGenerationModelSlug,
  type VideoGenerationNodeProperties,
  type VideoGenerationResolution,
} from "~/features/creative-canvas/model/video-generation-node";

const blockIcons = {
  text: Type,
  llm: Sparkles,
  image: ImageIcon,
  video: Video,
  voice: Mic2,
  agent: Bot,
  dm: MessageSquare,
  landing: Globe2,
  custom: Plug,
} satisfies Record<GenerationBlockKind, typeof Type>;

const GENERATION_BLOCK_DRAG_TYPE = "application/x-owncanvas-generation-block";

const NON_IMAGE_GENERATION_NODE_FRAME = {
  width: 360,
  height: 420,
} as const;

const VIDEO_GENERATION_NODE_FRAME = {
  width: 360,
  height: 640,
} as const;

type NonImageGenerationNodePortMediaType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "web"
  | "action";

type NonImageGenerationNodePort = {
  id: string;
  label: string;
  direction: "input" | "output";
  mediaType: NonImageGenerationNodePortMediaType;
  connectable: boolean;
};

function isGenerationBlockKind(value: string): value is GenerationBlockKind {
  return generationPalette.some((item) => item.kind === value);
}

const imageOutputNextNodeActionIcons = {
  "image-edit": ImageIcon,
  "style-variant": Sparkles,
  upscale: Maximize2,
  video: Video,
  "output-card": Captions,
  "landing-asset": ShoppingBag,
} satisfies Record<ImageGenerationOutputNextNodeActionKind, typeof ImageIcon>;

type PendingImageOutputConnection = {
  sourceNodeId: string;
  selectedResultAssetId: string;
};

type ImageOutputDropMenuState = PendingImageOutputConnection & {
  x: number;
  y: number;
};

function formatCampaignSpecJson(
  campaign: Pick<CampaignDraft, "campaignSpec">,
) {
  return serializeCampaignSpecJson(campaign);
}

function formatImageGenerationControlDefaultValue(
  defaultValue: ImageGenerationInputControlDefaultValue,
) {
  if (Array.isArray(defaultValue)) {
    return defaultValue.length === 0 ? "None" : defaultValue.join(", ");
  }

  if (defaultValue === null) {
    return "None";
  }

  return String(defaultValue);
}

const audienceFieldLabels = {
  age: "Age",
  gender: "Gender",
  interests: "Interests",
  behavior: "Behavior",
  region: "Region",
  platform: "Platform",
} satisfies Record<CampaignTargetAudienceField, string>;

const audienceFieldPlaceholders = {
  age: "25-34",
  gender: "All genders",
  interests: "AI tools, skincare, creator commerce",
  behavior: "Comments on short-form product demos",
  region: "United States",
  platform: "Instagram",
} satisfies Record<CampaignTargetAudienceField, string>;

const productFieldLabels = {
  id: "Product ID",
  title: "Product title",
  brand: "Brand",
  category: "Category",
  canonicalUrl: "Canonical URL",
} satisfies Record<
  Extract<
    keyof CampaignProductOffer["product"],
    "id" | "title" | "brand" | "category" | "canonicalUrl"
  >,
  string
>;

const offerFieldLabels = {
  headline: "Offer headline",
  summary: "Offer summary",
  discount: "Discount",
  terms: "Terms",
  destinationUrl: "Destination URL",
  callToAction: "Call to action",
} satisfies Record<
  Extract<
    keyof CampaignProductOffer["offer"],
    | "headline"
    | "summary"
    | "discount"
    | "terms"
    | "destinationUrl"
    | "callToAction"
  >,
  string
>;

const attributionFieldLabels = {
  source: "Offer source",
  externalId: "External ID",
  affiliateNetwork: "Affiliate network",
  trackingUrl: "Tracking URL",
} satisfies Record<
  Extract<
    keyof CampaignProductOffer["attribution"],
    "source" | "externalId" | "affiliateNetwork" | "trackingUrl"
  >,
  string
>;

const assetMediaTypeOptions = [
  "image",
  "video",
  "audio",
  "document",
  "text",
  "other",
] satisfies CampaignAssetMediaType[];

const assetUsageOptions = [
  "product",
  "reference",
  "generated",
  "ad",
  "landing",
] satisfies CampaignAssetUsage[];

const assetStatusOptions = [
  "draft",
  "ready",
  "approved",
  "archived",
] satisfies CampaignAssetStatus[];

const publishingChannelTypeOptions = [
  "social",
  "direct-message",
  "landing",
  "email",
  "paid-ad",
  "custom",
] satisfies CampaignPublishingChannelType[];

const publishingStatusOptions = [
  "draft",
  "configured",
  "scheduled",
  "published",
  "paused",
] satisfies CampaignPublishingStatus[];

const publishingScheduleModeOptions = [
  "manual",
  "scheduled",
  "recurring",
] as const;

type ImageGenerationBatchCount = ImageGenerationNodeProperties["batchCount"];

function createDefaultLandingPageConversionElement(
  campaign: CampaignDraft,
): CampaignLandingPageConversionElementConfiguration {
  return {
    id: "conversion_primary_offer",
    label: campaign.productOffer.offer.callToAction.trim() || "Open offer",
    conversionEventName:
      campaign.channels[0]?.tracking.conversionEvent.trim() || "purchase",
    destinationUrl:
      campaign.productOffer.offer.destinationUrl.trim() ||
      "https://example.com/checkout",
    visibility: "visible",
    placement: "side-panel",
    timing: "after-playback-complete",
    interruptionBehavior: "non-blocking",
  };
}

function applyImageGenerationJobResult(
  properties: ImageGenerationNodeProperties,
  result: GenerationJobResult,
): ImageGenerationNodeProperties {
  if (
    result.status === "succeeded" &&
    result.persistedCreativeOutputAssetId !== undefined
  ) {
    return succeedImageGenerationNodeV2Transition(properties, {
      generatedAssetIds: [result.persistedCreativeOutputAssetId],
      metadataRunId: result.providerRequestId || null,
      costUsageRunId: null,
    });
  }

  if (result.status === "succeeded") {
    return failImageGenerationNodeV2Transition(properties, {
      name: "GenerationPersistenceMissing",
      message: "Generated Creative Output was not persisted.",
      providerId: properties.providerId,
      modelSlug: properties.modelSlug,
      providerRequestId: result.providerRequestId || null,
      retryable: true,
    });
  }

  if (result.status === "failed") {
    return failImageGenerationNodeV2Transition(properties, {
      name: result.error?.name ?? "provider_error",
      category: result.error?.category,
      message: result.error?.message ?? "Generation failed.",
      providerId: properties.providerId,
      modelSlug: properties.modelSlug,
      providerRequestId: result.providerRequestId || null,
      retryable: result.error?.retryable ?? null,
    });
  }

  return properties;
}

function applyVideoGenerationJobResult(
  properties: VideoGenerationNodeProperties,
  result: GenerationJobResult,
): VideoGenerationNodeProperties {
  if (
    result.status === "succeeded" &&
    result.persistedCreativeOutputAssetId !== undefined
  ) {
    return succeedVideoGenerationNodeTransition(properties, {
      generatedAssetIds: [result.persistedCreativeOutputAssetId],
      metadataRunId: result.providerRequestId || null,
      costUsageRunId: null,
    });
  }

  if (result.status === "succeeded") {
    return failVideoGenerationNodeTransition(
      properties,
      createVideoGenerationFailureDetails(properties, {
        name: "GenerationPersistenceMissing",
        message: "Generated Creative Output was not persisted.",
        providerRequestId: result.providerRequestId || null,
        retryable: true,
      }),
    );
  }

  if (result.status === "failed") {
    return failVideoGenerationNodeTransition(
      properties,
      createVideoGenerationFailureDetails(properties, {
        name: result.error?.name ?? "provider_error",
        category: result.error?.category,
        message: result.error?.message ?? "Generation failed.",
        providerRequestId: result.providerRequestId || null,
        retryable: result.error?.retryable ?? null,
      }),
    );
  }

  return properties;
}

export function CreativeCanvasScreen({
  campaign,
  onCampaignChange,
  onBackToDashboard,
  onOpenReporting,
}: {
  campaign?: CampaignDraft;
  onCampaignChange?: (campaign: CampaignDraft) => void;
  onBackToDashboard?: () => void;
  onOpenReporting?: () => void;
}) {
  const initialNodes = campaign
    ? toCreativeFlowNodes(campaign.canvasState.nodes)
    : [];
  const initialEdges = campaign
    ? toCreativeFlowEdges(campaign.canvasState.edges)
    : [];
  const [nodes, setNodes] = useNodesState<CreativeFlowNode>(
    initialNodes,
  );
  const [edges, setEdges] = useEdgesState<CreativeFlowEdge>(initialEdges);
  const [activeTool, setActiveTool] = useState("select");
  const selectedNodeIdRef = useRef<string | null>(null);
  const reactFlowInstanceRef =
    useRef<ReactFlowInstance<CreativeFlowNode, CreativeFlowEdge> | null>(null);
  const campaignRef = useRef(campaign);
  const canvasSnapshotRef = useRef<{
    nodes: CreativeFlowNode[];
    edges: CreativeFlowEdge[];
  }>({
    nodes: initialNodes,
    edges: initialEdges,
  });
  const pendingImageOutputConnectionRef = useRef<PendingImageOutputConnection | null>(null);
  const suppressImageOutputPaneClickRef = useRef(false);
  const [imageOutputDropMenu, setImageOutputDropMenu] =
    useState<ImageOutputDropMenuState | null>(null);
  const [imageOutputDropMenuQuery, setImageOutputDropMenuQuery] = useState("");
  const closeImageOutputDropMenu = useCallback(() => {
    setImageOutputDropMenu(null);
    setImageOutputDropMenuQuery("");
  }, []);
  const visibleBlocks = useMemo(() => nodes.length, [nodes.length]);
  const campaignAssetReferences = useMemo(
    () =>
      campaign === undefined
        ? []
        : listCampaignAssets(campaign).filter(
            (asset) => asset.mediaType === "image",
          ),
    [campaign],
  );
  const campaignImageAssets = useMemo(
    () =>
      campaign === undefined
        ? []
        : campaign.assets.filter((asset) => asset.mediaType === "image"),
    [campaign],
  );
  const campaignVideoAssets = useMemo(
    () =>
      campaign === undefined
        ? []
        : campaign.assets.filter((asset) => asset.mediaType === "video"),
    [campaign],
  );
  const openImageGenerationInspector = useMemo(() => {
    for (const node of nodes) {
      const properties = node.data.properties;

      if (
        isImageGenerationNodeProperties(properties) &&
        (properties.uiState.inspectorOpen || properties.uiState.docsPanelOpen)
      ) {
        return {
          nodeId: node.id,
          title: node.data.title,
          properties,
        };
      }
    }

    return null;
  }, [nodes]);

  useEffect(() => {
    campaignRef.current = campaign;

    if (!campaign) {
      canvasSnapshotRef.current = {
        nodes: [],
        edges: [],
      };
      pendingImageOutputConnectionRef.current = null;
      closeImageOutputDropMenu();
      setNodes([]);
      setEdges([]);
      return;
    }

    const nextNodes = toCreativeFlowNodes(campaign.canvasState.nodes).map((node) => ({
      ...node,
      selected: node.id === selectedNodeIdRef.current,
    }));
    canvasSnapshotRef.current = {
      nodes: nextNodes,
      edges: toCreativeFlowEdges(campaign.canvasState.edges),
    };
    setNodes(canvasSnapshotRef.current.nodes);
    setEdges(canvasSnapshotRef.current.edges);
  }, [campaign, closeImageOutputDropMenu, setEdges, setNodes]);

  const updateCampaignCanvas = useCallback((
    nextNodes: CreativeFlowNode[],
    nextEdges: CreativeFlowEdge[],
  ) => {
    canvasSnapshotRef.current = {
      nodes: nextNodes,
      edges: nextEdges,
    };

    const currentCampaign = campaignRef.current;

    if (!currentCampaign) {
      return;
    }

    const nextCampaign = syncCampaignFromCreativeCanvasInteraction(
      currentCampaign,
      nextNodes,
      nextEdges,
    );

    campaignRef.current = nextCampaign;
    onCampaignChange?.(nextCampaign);
  }, [onCampaignChange]);

  const submitImageGenerationBatch = async (
    batch: GenerationBatchRequest,
  ): Promise<GenerationBatchResponse | null> => {
    const currentCampaign = campaignRef.current;

    if (!currentCampaign) {
      return null;
    }

    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(currentCampaign.id)}/generation/batches`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(batch),
        },
      );

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as {
        batch?: unknown;
      };

      return isGenerationBatchResponse(body.batch) ? body.batch : null;
    } catch {
      return null;
    }
  };

  const applyImageGenerationBatchResults = useCallback((
    batchResponse: GenerationBatchResponse,
    expectedNodeIds: string[],
  ) => {
    const resultsByNodeId = new Map(
      batchResponse.results.map((result) => [result.nodeId, result]),
    );
    const expectedNodeIdSet = new Set(expectedNodeIds);
    const nextNodes = canvasSnapshotRef.current.nodes.map((node) => {
      const properties = node.data.properties;

      if (
        !expectedNodeIdSet.has(node.id) ||
        !isImageGenerationNodeProperties(properties)
      ) {
        return node;
      }

      const result = resultsByNodeId.get(node.id);

      if (result === undefined) {
        return {
          ...node,
          data: {
            ...node.data,
            properties: failImageGenerationNodeV2Transition(properties, {
              name: "GenerationServiceResultMissing",
              message: "Generation batch did not return a result for this node.",
              providerId: properties.providerId,
              modelSlug: properties.modelSlug,
              providerRequestId: null,
              retryable: true,
            }),
          },
        };
      }

      return {
        ...node,
        data: {
          ...node.data,
          properties: applyImageGenerationJobResult(properties, result),
        },
      };
    });

    setNodes(nextNodes);
    updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
  }, [setNodes, updateCampaignCanvas]);

  const applyImageGenerationBatchFailure = useCallback((
    nodeIds: string[],
    message: string,
  ) => {
    const failedNodeIds = new Set(nodeIds);
    const nextNodes = canvasSnapshotRef.current.nodes.map((node) => {
      const properties = node.data.properties;

      if (
        !failedNodeIds.has(node.id) ||
        !isImageGenerationNodeProperties(properties)
      ) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          properties: failImageGenerationNodeV2Transition(properties, {
            name: "GenerationServiceError",
            message,
            providerId: properties.providerId,
            modelSlug: properties.modelSlug,
            providerRequestId: null,
            retryable: true,
          }),
        },
      };
    });

    setNodes(nextNodes);
    updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
  }, [setNodes, updateCampaignCanvas]);

  const applyVideoGenerationBatchResults = useCallback((
    batchResponse: GenerationBatchResponse,
    expectedNodeIds: string[],
  ) => {
    const resultsByNodeId = new Map(
      batchResponse.results.map((result) => [result.nodeId, result]),
    );
    const expectedNodeIdSet = new Set(expectedNodeIds);
    const nextNodes = canvasSnapshotRef.current.nodes.map((node) => {
      const properties = node.data.properties;

      if (
        !expectedNodeIdSet.has(node.id) ||
        !isVideoGenerationNodeProperties(properties)
      ) {
        return node;
      }

      const result = resultsByNodeId.get(node.id);

      if (result === undefined) {
        return {
          ...node,
          data: {
            ...node.data,
            properties: failVideoGenerationNodeTransition(
              properties,
              createVideoGenerationFailureDetails(properties, {
                name: "GenerationServiceResultMissing",
                message:
                  "Generation batch did not return a result for this node.",
                retryable: true,
              }),
            ),
          },
        };
      }

      return {
        ...node,
        data: {
          ...node.data,
          properties: applyVideoGenerationJobResult(properties, result),
        },
      };
    });

    setNodes(nextNodes);
    updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
  }, [setNodes, updateCampaignCanvas]);

  const applyVideoGenerationBatchFailure = useCallback((
    nodeIds: string[],
    message: string,
  ) => {
    const failedNodeIds = new Set(nodeIds);
    const nextNodes = canvasSnapshotRef.current.nodes.map((node) => {
      const properties = node.data.properties;

      if (
        !failedNodeIds.has(node.id) ||
        !isVideoGenerationNodeProperties(properties)
      ) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          properties: failVideoGenerationNodeTransition(
            properties,
            createVideoGenerationFailureDetails(properties, {
              name: "GenerationServiceError",
              message,
              retryable: true,
            }),
          ),
        },
      };
    });

    setNodes(nextNodes);
    updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
  }, [setNodes, updateCampaignCanvas]);

  const handleNodesChange = (changes: NodeChange<CreativeFlowNode>[]) => {
    const selectedChange = changes.find(
      (change): change is Extract<NodeChange<CreativeFlowNode>, { type: "select" }> =>
        change.type === "select" && change.selected,
    );

    if (selectedChange) {
      selectedNodeIdRef.current = selectedChange.id;
    }

    setNodes((currentNodes) => {
      const nextNodes = applyNodeChanges(changes, currentNodes);
      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });
      return nextNodes;
    });
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    setEdges((currentEdges) => {
      const nextEdges = applyEdgeChanges(changes, currentEdges);
      queueMicrotask(() => {
        updateCampaignCanvas(canvasSnapshotRef.current.nodes, nextEdges);
      });
      return nextEdges;
    });
  };

  const addGenerationBlock = useCallback((
    kind: GenerationBlockKind,
    position?: { x: number; y: number },
  ) => {
    setNodes((current) => {
      const createdNode = createGenerationFlowNode(kind, current.length, position);
      selectedNodeIdRef.current = createdNode.id;
      const nextNodes = [
        ...current.map((node) => ({ ...node, selected: false })),
        { ...createdNode, selected: true },
      ];

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handlePaletteDragStart = useCallback((
    event: DragEvent<HTMLButtonElement>,
    kind: GenerationBlockKind,
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(GENERATION_BLOCK_DRAG_TYPE, kind);
  }, []);

  const handleCanvasDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes(GENERATION_BLOCK_DRAG_TYPE)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleCanvasDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    const kind = event.dataTransfer.getData(GENERATION_BLOCK_DRAG_TYPE);

    if (!isGenerationBlockKind(kind)) {
      return;
    }

    event.preventDefault();
    closeImageOutputDropMenu();
    addGenerationBlock(
      kind,
      reactFlowInstanceRef.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    );
  }, [addGenerationBlock, closeImageOutputDropMenu]);

  const handleImageOutputNextNodeAction = useCallback((
    sourceNodeId: string,
    actionKind: ImageGenerationOutputNextNodeActionKind,
    selectedResultAssetId: string,
  ) => {
    setNodes((currentNodes) => {
      const nextCanvas = applyImageOutputNextNodeActionToCanvas({
        nodes: currentNodes,
        edges: canvasSnapshotRef.current.edges,
        sourceNodeId,
        actionKind,
        selectedResultAssetId,
      });

      if (nextCanvas.createdNode === null) {
        return currentNodes;
      }

      selectedNodeIdRef.current = nextCanvas.createdNode.id;
      setEdges(nextCanvas.edges);
      queueMicrotask(() => {
        updateCampaignCanvas(nextCanvas.nodes, nextCanvas.edges);
      });

      return nextCanvas.nodes;
    });
  }, [setEdges, setNodes, updateCampaignCanvas]);

  const runImageGenerationNode = useCallback(async (nodeId: string) => {
    try {
      const currentCampaign = campaignRef.current;
      const sourceNode = canvasSnapshotRef.current.nodes.find(
        (node) => node.id === nodeId,
      );

      if (
        !currentCampaign ||
        !sourceNode ||
        !isImageGenerationNodeProperties(sourceNode.data.properties)
      ) {
        return;
      }

      const sourceProperties = sourceNode.data.properties;

      if (sourceProperties.uiState.status === "failed") {
        const plan = createImageGenerationSingleNodeRetryPlan({
          campaignId: currentCampaign.id,
          sourceNode,
          existingNodes: canvasSnapshotRef.current.nodes,
          now: () => new Date().toISOString(),
        });
        const nextNodes = canvasSnapshotRef.current.nodes.map((node) => {
          if (node.id !== sourceNode.id) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              properties: queueImageGenerationNodeV2Transition(sourceProperties),
            },
          };
        });
        const nextCampaign = syncCampaignFromCreativeCanvasInteraction(
          currentCampaign,
          nextNodes,
          canvasSnapshotRef.current.edges,
        );

        canvasSnapshotRef.current = {
          nodes: nextNodes,
          edges: canvasSnapshotRef.current.edges,
        };
        campaignRef.current = nextCampaign;
        setNodes(nextNodes);
        onCampaignChange?.(nextCampaign);

        const response = await submitImageGenerationBatch(plan.batch);

        if (response === null) {
          applyImageGenerationBatchFailure(
            [sourceNode.id],
            "Generation batch did not complete.",
          );
          return;
        }

        const persisted = persistGenerationBatchResponseToCampaign({
          campaign: campaignRef.current ?? nextCampaign,
          request: plan.batch,
          response,
        });

        campaignRef.current = persisted.campaign;
        onCampaignChange?.(persisted.campaign);

        applyImageGenerationBatchResults(persisted.response, [sourceNode.id]);
        return;
      }

      const readiness = validateImageGenerationFanOutReadiness(sourceProperties);

      if (!readiness.valid && readiness.error !== null) {
        const compatibilityError = readiness.error;
        const nextNodes = canvasSnapshotRef.current.nodes.map((node) => {
          if (node.id !== sourceNode.id) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              properties: failImageGenerationNodeV2Transition(
                sourceProperties,
                compatibilityError,
              ),
            },
          };
        });

        setNodes(nextNodes);
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
        return;
      }

      const plan = createImageGenerationFanOutPlan({
        campaignId: currentCampaign.id,
        sourceNode,
        existingNodes: canvasSnapshotRef.current.nodes,
        existingEdges: canvasSnapshotRef.current.edges,
        now: () => new Date().toISOString(),
      });
      const fanOutCreatesNodes = plan.createdNodes.length > 0;
      const nextNodes = fanOutCreatesNodes
        ? [
            ...canvasSnapshotRef.current.nodes.map((node) => ({
              ...node,
              selected: false,
            })),
            ...plan.createdNodes,
          ]
        : canvasSnapshotRef.current.nodes.map((node) => {
            if (node.id !== sourceNode.id) {
              return {
                ...node,
                selected: false,
              };
            }

            return {
              ...node,
              selected: true,
              data: {
                ...node.data,
                properties: queueImageGenerationNodeV2Transition(sourceProperties),
              },
            };
          });
      const nextEdges = fanOutCreatesNodes
        ? [
            ...canvasSnapshotRef.current.edges,
            ...plan.createdEdges,
          ]
        : canvasSnapshotRef.current.edges;
      const nextCampaign = syncCampaignFromCreativeCanvasInteraction(
        currentCampaign,
        nextNodes,
        nextEdges,
      );

      selectedNodeIdRef.current = fanOutCreatesNodes
        ? plan.createdNodes[0]?.id ?? null
        : sourceNode.id;
      canvasSnapshotRef.current = {
        nodes: nextNodes,
        edges: nextEdges,
      };
      campaignRef.current = nextCampaign;
      setNodes(nextNodes);
      setEdges(nextEdges);
      onCampaignChange?.(nextCampaign);

      if (fanOutCreatesNodes) {
        window.setTimeout(() => {
          reactFlowInstanceRef.current?.fitView({
            nodes: plan.createdNodes.map((node) => ({ id: node.id })),
            padding: 0.24,
            duration: 420,
          });
        }, 0);
      }

      const response = await submitImageGenerationBatch(plan.batch);

      if (response === null) {
        applyImageGenerationBatchFailure(
          plan.targetNodeIds,
          "Generation batch did not complete.",
        );
        return;
      }

      const persisted = persistGenerationBatchResponseToCampaign({
        campaign: campaignRef.current ?? nextCampaign,
        request: plan.batch,
        response,
      });

      campaignRef.current = persisted.campaign;
      onCampaignChange?.(persisted.campaign);

      applyImageGenerationBatchResults(
        persisted.response,
        plan.targetNodeIds,
      );
    } catch {
      return;
    }
  }, [
    applyImageGenerationBatchFailure,
    applyImageGenerationBatchResults,
    onCampaignChange,
    setEdges,
    setNodes,
    updateCampaignCanvas,
  ]);

  const runVideoGenerationNode = useCallback(async (nodeId: string) => {
    try {
      const currentCampaign = campaignRef.current;
      const sourceNode = canvasSnapshotRef.current.nodes.find(
        (node) => node.id === nodeId,
      );

      if (
        !currentCampaign ||
        !sourceNode ||
        !isVideoGenerationNodeProperties(sourceNode.data.properties)
      ) {
        return;
      }

      const sourceProperties = sourceNode.data.properties;
      const referenceImageUri =
        sourceProperties.referenceImageUri ??
        currentCampaign.assets.find(
          (asset) =>
            asset.id ===
            (sourceProperties.referenceImageAssetId ??
              sourceProperties.sourceOutputAssetId),
        )?.uri ??
        null;
      const readiness = validateVideoGenerationRunReadiness({
        properties: sourceProperties,
        referenceImageUri,
      });

      if (!readiness.valid) {
        const nextNodes = canvasSnapshotRef.current.nodes.map((node) =>
          node.id !== sourceNode.id
            ? node
            : {
                ...node,
                data: {
                  ...node.data,
                  properties: failVideoGenerationNodeTransition(
                    sourceProperties,
                    readiness.error,
                  ),
                },
              },
        );

        setNodes(nextNodes);
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
        return;
      }

      const plan = createVideoGenerationRunPlan({
        campaignId: currentCampaign.id,
        sourceNode,
        existingNodes: canvasSnapshotRef.current.nodes,
        campaignAssets: currentCampaign.assets,
        now: () => new Date().toISOString(),
      });
      const nextNodes = canvasSnapshotRef.current.nodes.map((node) => {
        if (node.id !== sourceNode.id) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            properties: queueVideoGenerationNodeTransition(sourceProperties),
          },
        };
      });
      const nextCampaign = syncCampaignFromCreativeCanvasInteraction(
        currentCampaign,
        nextNodes,
        canvasSnapshotRef.current.edges,
      );

      canvasSnapshotRef.current = {
        nodes: nextNodes,
        edges: canvasSnapshotRef.current.edges,
      };
      campaignRef.current = nextCampaign;
      setNodes(nextNodes);
      onCampaignChange?.(nextCampaign);

      const response = await submitImageGenerationBatch(plan.batch);

      if (response === null) {
        applyVideoGenerationBatchFailure(
          [sourceNode.id],
          "Generation batch did not complete.",
        );
        return;
      }

      const persisted = persistGenerationBatchResponseToCampaign({
        campaign: campaignRef.current ?? nextCampaign,
        request: plan.batch,
        response,
      });

      campaignRef.current = persisted.campaign;
      onCampaignChange?.(persisted.campaign);

      applyVideoGenerationBatchResults(persisted.response, [sourceNode.id]);
    } catch {
      return;
    }
  }, [
    applyVideoGenerationBatchFailure,
    applyVideoGenerationBatchResults,
    onCampaignChange,
    setNodes,
    updateCampaignCanvas,
  ]);

  const getConnectionEventPoint = (event: MouseEvent | TouchEvent) => {
    const clampDropMenuPoint = (point: { x: number; y: number }) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuOffset = 8;
      const menuWidth = 320;
      const menuMaxHeight = 360;

      return {
        x: Math.min(Math.max(point.x, 0), Math.max(viewportWidth - menuWidth - menuOffset, 0)),
        y: Math.min(Math.max(point.y, 0), Math.max(viewportHeight - menuMaxHeight - menuOffset, 0)),
      };
    };

    if ("changedTouches" in event) {
      const touch = event.changedTouches[0];
      return touch ? clampDropMenuPoint({ x: touch.clientX, y: touch.clientY }) : null;
    }

    return clampDropMenuPoint({ x: event.clientX, y: event.clientY });
  };

  const handleImageAspectRatioChange = useCallback((
    nodeId: string,
    aspectRatio: ImageGenerationAspectRatio,
  ) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (node.id !== nodeId || !isImageGenerationNodeProperties(properties)) {
          return node;
        }

        const nextProperties = selectImageGenerationNodeAspectRatioTransition(
          properties,
          aspectRatio,
        );

        return {
          ...node,
          width: nextProperties.frame.width,
          height: nextProperties.frame.height,
          data: {
            ...node.data,
            properties: nextProperties,
          },
        };
      });

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleImageModelChange = useCallback((
    nodeId: string,
    selection: { providerId: ImageGenerationProviderId; modelSlug: string },
  ) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (node.id !== nodeId || !isImageGenerationNodeProperties(properties)) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            properties: selectImageGenerationNodeModelTransition(
              properties,
              selection,
            ),
          },
        };
      });

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleImageBatchCountChange = useCallback((
    nodeId: string,
    direction: -1 | 1,
  ) => {
    setNodes((currentNodes) => {
      let didUpdate = false;
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (node.id !== nodeId || !isImageGenerationNodeProperties(properties)) {
          return node;
        }

        const nextBatchCount = Math.min(
          10,
          Math.max(1, properties.batchCount + direction),
        ) as ImageGenerationBatchCount;

        if (nextBatchCount === properties.batchCount) {
          return node;
        }

        didUpdate = true;

        return {
          ...node,
          data: {
            ...node.data,
            properties: {
              ...properties,
              batchCount: nextBatchCount,
            },
          },
        };
      });

      if (!didUpdate) {
        return currentNodes;
      }

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleImageInspectorOpen = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (!isImageGenerationNodeProperties(properties)) {
          return node;
        }

        if (node.id !== nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              properties: closeImageGenerationNodeInspectorTransition(properties),
            },
          };
        }

        return {
          ...node,
          data: {
            ...node.data,
            properties: openImageGenerationNodeInspectorTransition(properties),
          },
        };
      });

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleImageInspectorClose = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (node.id !== nodeId || !isImageGenerationNodeProperties(properties)) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            properties: closeImageGenerationNodeInspectorTransition(properties),
          },
        };
      });

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleImageReferenceAttach = useCallback((
    nodeId: string,
    referenceInput: ImageGenerationNodeReferenceInput,
  ) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (node.id !== nodeId || !isImageGenerationNodeProperties(properties)) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            properties: attachImageGenerationNodeReferenceTransition(
              properties,
              referenceInput,
            ),
          },
        };
      });

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleImageReferenceRemove = useCallback((
    nodeId: string,
    referenceInput:
      | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
      | Pick<ImageGenerationNodeReferenceInput, "id">,
  ) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (node.id !== nodeId || !isImageGenerationNodeProperties(properties)) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            properties: removeImageGenerationNodeReferenceTransition(
              properties,
              referenceInput,
            ),
          },
        };
      });

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleImageReferenceReorder = useCallback((
    nodeId: string,
    referenceInput:
      | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
      | Pick<ImageGenerationNodeReferenceInput, "id">,
    direction: "up" | "down",
  ) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (node.id !== nodeId || !isImageGenerationNodeProperties(properties)) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            properties: reorderImageGenerationNodeReferenceTransition(
              properties,
              referenceInput,
              direction,
            ),
          },
        };
      });

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleImagePromptChange = useCallback((nodeId: string, prompt: string) => {
    setNodes((currentNodes) => {
      let didUpdate = false;
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (
          node.id !== nodeId ||
          !isImageGenerationNodeProperties(properties) ||
          (properties.prompt ?? "") === prompt
        ) {
          return node;
        }

        didUpdate = true;

        return {
          ...node,
          data: {
            ...node.data,
            properties: {
              ...properties,
              prompt,
            },
          },
        };
      });

      if (!didUpdate) {
        return currentNodes;
      }

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleNonImagePromptChange = useCallback((nodeId: string, prompt: string) => {
    setNodes((currentNodes) => {
      let didUpdate = false;
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (
          node.id !== nodeId ||
          isImageGenerationNodeProperties(properties) ||
          (typeof properties?.prompt === "string" ? properties.prompt : "") === prompt
        ) {
          return node;
        }

        didUpdate = true;

        return {
          ...node,
          data: {
            ...node.data,
            properties: {
              ...(properties ?? {}),
              prompt,
            },
          },
        };
      });

      if (!didUpdate) {
        return currentNodes;
      }

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleVideoModelChange = useCallback((
    nodeId: string,
    modelSlug: VideoGenerationModelSlug,
  ) => {
    setNodes((currentNodes) => {
      let didUpdate = false;
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (
          node.id !== nodeId ||
          !isVideoGenerationNodeProperties(properties) ||
          properties.modelSlug === modelSlug
        ) {
          return node;
        }

        didUpdate = true;

        return {
          ...node,
          data: {
            ...node.data,
            properties: selectVideoGenerationNodeModelTransition(
              properties,
              modelSlug,
            ),
          },
        };
      });

      if (!didUpdate) {
        return currentNodes;
      }

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleVideoDurationChange = useCallback((
    nodeId: string,
    durationSeconds: number,
  ) => {
    setNodes((currentNodes) => {
      let didUpdate = false;
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (
          node.id !== nodeId ||
          !isVideoGenerationNodeProperties(properties) ||
          properties.durationSeconds === durationSeconds
        ) {
          return node;
        }

        didUpdate = true;

        return {
          ...node,
          data: {
            ...node.data,
            properties: createVideoGenerationNodeProperties({
              ...properties,
              durationSeconds,
            }),
          },
        };
      });

      if (!didUpdate) {
        return currentNodes;
      }

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const handleVideoResolutionChange = useCallback((
    nodeId: string,
    resolution: VideoGenerationResolution,
  ) => {
    setNodes((currentNodes) => {
      let didUpdate = false;
      const nextNodes = currentNodes.map((node) => {
        const properties = node.data.properties;

        if (
          node.id !== nodeId ||
          !isVideoGenerationNodeProperties(properties) ||
          properties.resolution === resolution
        ) {
          return node;
        }

        didUpdate = true;

        return {
          ...node,
          data: {
            ...node.data,
            properties: createVideoGenerationNodeProperties({
              ...properties,
              resolution,
            }),
          },
        };
      });

      if (!didUpdate) {
        return currentNodes;
      }

      queueMicrotask(() => {
        updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
      });

      return nextNodes;
    });
  }, [setNodes, updateCampaignCanvas]);

  const creativeNodeTypes = useMemo<NodeTypes>(
    () => ({
      generation: (props) => (
        <GenerationBlockNode
          {...(props as NodeProps<CreativeFlowNode>)}
          onImageAspectRatioChange={handleImageAspectRatioChange}
          onImageBatchCountChange={handleImageBatchCountChange}
          onImageModelChange={handleImageModelChange}
          onImageInspectorOpen={handleImageInspectorOpen}
          onImageReferenceAttach={handleImageReferenceAttach}
          onImageReferenceRemove={handleImageReferenceRemove}
          onImageReferenceReorder={handleImageReferenceReorder}
          onRunImageGeneration={runImageGenerationNode}
          onImagePromptChange={handleImagePromptChange}
          onNonImagePromptChange={handleNonImagePromptChange}
          onVideoModelChange={handleVideoModelChange}
          onVideoDurationChange={handleVideoDurationChange}
          onVideoResolutionChange={handleVideoResolutionChange}
          onRunVideoGeneration={runVideoGenerationNode}
          campaignAssetReferences={campaignAssetReferences}
          campaignImageAssets={campaignImageAssets}
          campaignVideoAssets={campaignVideoAssets}
        />
      ),
    }),
    [
      handleImageAspectRatioChange,
      handleImageBatchCountChange,
      handleImageModelChange,
      handleImageInspectorOpen,
      handleImageReferenceAttach,
      handleImageReferenceRemove,
      handleImageReferenceReorder,
      runImageGenerationNode,
      handleImagePromptChange,
      handleNonImagePromptChange,
      handleVideoModelChange,
      handleVideoDurationChange,
      handleVideoResolutionChange,
      runVideoGenerationNode,
      campaignAssetReferences,
      campaignImageAssets,
      campaignVideoAssets,
    ],
  );

  const applyCampaignSpecJsonEdit = (
    value: string,
  ): CreativeCanvasSpecJsonSyncResult => {
    const currentCampaign = campaignRef.current;

    if (!currentCampaign) {
      throw new Error("Cannot apply campaign spec JSON without a campaign.");
    }

    const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
      currentCampaign,
      value,
      { lastValidCanvasSnapshot: canvasSnapshotRef.current },
    );

    if (!result.valid) {
      setNodes(result.nodes);
      setEdges(result.edges);
      return result;
    }

    canvasSnapshotRef.current = {
      nodes: result.nodes,
      edges: result.edges,
    };
    setNodes(result.nodes);
    setEdges(result.edges);
    campaignRef.current = result.campaign;

    return result;
  };
  const imageOutputDropMenuSourceNode =
    imageOutputDropMenu === null
      ? null
      : nodes.find((node) => node.id === imageOutputDropMenu.sourceNodeId) ?? null;
  const imageOutputDropMenuSourceProperties =
    imageOutputDropMenuSourceNode?.data.properties;
  const imageOutputDropMenuActions =
    imageOutputDropMenu !== null &&
    isImageGenerationNodeProperties(imageOutputDropMenuSourceProperties)
      ? resolveImageGenerationOutputNextNodeActions(imageOutputDropMenuSourceProperties)
      : [];
  const normalizedImageOutputDropMenuQuery =
    imageOutputDropMenuQuery.trim().toLowerCase();
  const visibleImageOutputDropMenuActions =
    normalizedImageOutputDropMenuQuery === ""
      ? imageOutputDropMenuActions
      : imageOutputDropMenuActions.filter((action) => {
          const searchable = `${action.label} ${action.description} ${action.kind}`.toLowerCase();
          return searchable.includes(normalizedImageOutputDropMenuQuery);
        });

  return (
    <main className="canvas-shell min-h-dvh bg-[#fbfaf7] text-[#171717]">
      <AppSidebar />
      <TopBar
        campaignTitle={campaign?.title ?? "OwnCanvas · Launch creative pack"}
        onBackToDashboard={onBackToDashboard}
        onOpenReporting={onOpenReporting}
      />

      <div className="canvas-overlays">
        <FloatingToolbar activeTool={activeTool} onToolChange={setActiveTool} />
        <GenerationPalette onDragBlockStart={handlePaletteDragStart} />
        {campaign ? (
          <CampaignMetadataPanel
            campaign={campaign}
            onCampaignChange={onCampaignChange}
            onCampaignSpecJsonEdit={applyCampaignSpecJsonEdit}
          />
        ) : null}
        {openImageGenerationInspector === null ? null : (
          <ImageGenerationInspectorPanel
            nodeId={openImageGenerationInspector.nodeId}
            title={openImageGenerationInspector.title}
            details={openImageGenerationInspector.properties}
            onClose={handleImageInspectorClose}
          />
        )}
        {imageOutputDropMenu === null || imageOutputDropMenuActions.length === 0 ? null : (
          <div
            className="canvas-output-drop-menu nodrag"
            role="menu"
            aria-label="Create next generation block from output"
            data-placement="line-end"
            style={{ left: imageOutputDropMenu.x, top: imageOutputDropMenu.y }}
          >
            <label className="canvas-output-drop-search">
              <Search className="size-4" aria-hidden="true" />
              <input
                type="search"
                aria-label="Filter next generation blocks"
                placeholder="Search"
                value={imageOutputDropMenuQuery}
                onChange={(event) => {
                  setImageOutputDropMenuQuery(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    closeImageOutputDropMenu();
                  }
                }}
              />
            </label>
            <div className="canvas-output-drop-menu-list" role="none">
              {visibleImageOutputDropMenuActions.map((action) => {
                const ActionIcon = imageOutputNextNodeActionIcons[action.kind];
                const disabled = action.availability === "disabled";

                return (
                  <button
                    key={action.kind}
                    type="button"
                    role="menuitem"
                    className="canvas-output-drop-menu-item"
                    data-next-node-kind={action.kind}
                    data-provider-availability={action.availability}
                    aria-disabled={disabled}
                    disabled={disabled}
                    title={action.disabledReason ?? action.description}
                    onClick={() => {
                      handleImageOutputNextNodeAction(
                        imageOutputDropMenu.sourceNodeId,
                        action.kind,
                        imageOutputDropMenu.selectedResultAssetId,
                      );
                      closeImageOutputDropMenu();
                    }}
                  >
                    <span className="canvas-output-drop-menu-icon" aria-hidden="true">
                      <ActionIcon className="size-4" />
                    </span>
                    <span className="canvas-output-drop-menu-copy">
                      <span>{action.label}</span>
                      {action.disabledReason === null ? null : (
                        <small>{action.disabledReason}</small>
                      )}
                    </span>
                  </button>
                );
              })}
              {visibleImageOutputDropMenuActions.length === 0 ? (
                <p className="canvas-output-drop-menu-empty" role="status">
                  No matching blocks
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <section className="canvas-stage">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={creativeNodeTypes}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onNodeClick={(_, node) => {
              selectedNodeIdRef.current = node.id;
            }}
            onPaneClick={() => {
              if (suppressImageOutputPaneClickRef.current) {
                suppressImageOutputPaneClickRef.current = false;
                return;
              }

              selectedNodeIdRef.current = null;
              closeImageOutputDropMenu();
            }}
            onConnectStart={(_, connection) => {
              pendingImageOutputConnectionRef.current = null;
              closeImageOutputDropMenu();

              if (
                connection.handleType !== "source" ||
                connection.handleId !== "outputs.generated_image_asset" ||
                connection.nodeId === null
              ) {
                return;
              }

              const sourceNode = canvasSnapshotRef.current.nodes.find(
                (node) => node.id === connection.nodeId,
              );
              const properties = sourceNode?.data.properties;

              if (
                !isImageGenerationNodeProperties(properties) ||
                !properties.uiState.outputConnectionReady ||
                properties.uiState.selectedResultAssetId === null
              ) {
                return;
              }

              pendingImageOutputConnectionRef.current = {
                sourceNodeId: connection.nodeId,
                selectedResultAssetId: properties.uiState.selectedResultAssetId,
              };
            }}
            onConnectEnd={(event, connectionState) => {
              const pendingConnection = pendingImageOutputConnectionRef.current;
              pendingImageOutputConnectionRef.current = null;

              if (pendingConnection === null || connectionState.isValid) {
                return;
              }

              const eventPoint = getConnectionEventPoint(event);

              if (eventPoint === null) {
                return;
              }

              setImageOutputDropMenu({
                ...pendingConnection,
                x: eventPoint.x,
                y: eventPoint.y,
              });
              suppressImageOutputPaneClickRef.current = true;
              window.setTimeout(() => {
                suppressImageOutputPaneClickRef.current = false;
              }, 0);
            }}
            fitView
            fitViewOptions={{ padding: 0.24 }}
            minZoom={0.45}
            maxZoom={1.35}
            panOnScroll
            panOnScrollMode={PanOnScrollMode.Free}
            zoomOnScroll={false}
            nodesConnectable
            nodesDraggable
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#dedbd4"
            />
          </ReactFlow>
        </ReactFlowProvider>
        <CanvasStatus visibleBlocks={visibleBlocks} />
      </section>
    </main>
  );
}

function ImageGenerationInspectorPanel({
  nodeId,
  title,
  details,
  onClose,
}: {
  nodeId: string;
  title: string;
  details: ImageGenerationNodeProperties;
  onClose: (nodeId: string) => void;
}) {
  const capability = resolveImageGenerationNodeModelCapability(details);
  const docsMetadata = resolveImageGenerationDocsPanelMetadata(details);
  const inspectorControls =
    docsMetadata.optionalControls.filter(
      (control) => control.visibility === "inspector",
    );
  const schemaRows = capability
    ? [
        ["Prompt", capability.schemaAdapter.promptField],
        ["Reference", capability.schemaAdapter.referenceImagesField ?? "Not supported"],
        ["Aspect ratio", capability.schemaAdapter.aspectRatioField ?? "Not supported"],
        ["Size", capability.schemaAdapter.sizeField ?? "Frame dimensions"],
        ["Seed", capability.schemaAdapter.seedField ?? "Not supported"],
        ["Quality", capability.schemaAdapter.qualityField ?? "Not supported"],
        ["Format", capability.schemaAdapter.outputFormatField ?? "Not supported"],
      ]
    : [];
  const statusView = resolveImageGenerationNodeStatusView(
    resolveImageGenerationNodeStatus({
      selected: true,
      uiState: details.uiState,
    }),
  );

  return (
    <aside
      className="image-generation-inspector-panel nodrag"
      aria-label="Image Block setup"
      data-node-id={nodeId}
      data-panel-state="open"
    >
      <header className="image-generation-inspector-header">
        <span>Image setup</span>
        <strong>{title}</strong>
        <button
          type="button"
          aria-label="Close Image Block setup"
          onClick={() => onClose(nodeId)}
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="image-generation-inspector-grid">
        <section
          className="image-generation-inspector-section"
          aria-label="Image Block model summary"
        >
          <h2>Model summary</h2>
          <dl>
            <div>
              <dt>Model</dt>
              <dd>{docsMetadata.selectedModel.name}</dd>
            </div>
            <div>
              <dt>Served by</dt>
              <dd>{docsMetadata.provider.name}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{statusView.label}</dd>
            </div>
          </dl>

        </section>

        <section
          className="image-generation-docs-panel"
          aria-label="Image Block inputs"
        >
          <h2>Inputs</h2>
          <ul className="image-generation-docs-required-inputs">
            {docsMetadata.requiredInputs.length === 0 ? (
              <li>
                <span>Prompt</span>
                <strong>Describe what to create</strong>
                <em>Text</em>
              </li>
            ) : (
              docsMetadata.requiredInputs.map((control) => (
                <li key={control.id}>
                  <span>{control.label}</span>
                  <strong>{control.required ? "Needed to generate" : "Optional"}</strong>
                  <em>{control.kind.replaceAll("_", " ")}</em>
                </li>
              ))
            )}
          </ul>
        </section>

        <section
          className="image-generation-inspector-section"
          aria-label="Image Block creative controls"
        >
          <h2>Creative controls</h2>
          <ul className="image-generation-inspector-list">
            {inspectorControls.map((control) => (
              <li key={control.id}>
                <span>{control.label}</span>
                <strong>
                  {control.options.length > 0
                    ? control.options.join(", ")
                    : formatImageGenerationControlDefaultValue(control.defaultValue)}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <details className="image-generation-developer-details">
        <summary>Developer details</summary>
        <section aria-label="Model service diagnostics">
          <h2>Service diagnostics</h2>
          <dl>
            <div>
              <dt>Credential env</dt>
              <dd>
                <code>
                  {docsMetadata.provider.credentialStatus.envName ??
                    "No provider env var"}
                </code>
              </dd>
            </div>
            <div>
              <dt>Frame source</dt>
              <dd>{details.frame.source === "user-resize" ? "Manual resize" : "Aspect ratio"}</dd>
            </div>
            <div>
              <dt>Supported ratios</dt>
              <dd>
                {docsMetadata.supportedRatios.length === 0
                  ? "No documented ratios"
                  : docsMetadata.supportedRatios.join(", ")}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-label="Adapter mapping">
          <h2>Adapter mapping</h2>
          <dl>
            {schemaRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Model limits">
          <h2>Model limits</h2>
          <ul className="image-generation-inspector-list">
            {docsMetadata.compatibilityWarnings.length === 0 ? (
              <li>
                <span>Current setup</span>
                <strong>Ready for current settings</strong>
              </li>
            ) : (
              docsMetadata.compatibilityWarnings.map((warning) => (
                <li key={warning} data-warning="model-limit">
                  <span>Warning</span>
                  <strong>{warning}</strong>
                </li>
              ))
            )}
          </ul>
        </section>
      </details>
    </aside>
  );
}

function PersistentShortFormPlayer({
  campaign,
}: {
  campaign: CampaignDraft;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const controlModel = useMemo(
    () => createCampaignShortFormContentControlModel(campaign),
    [campaign],
  );

  if (controlModel === null) {
    return null;
  }

  const togglePlayback = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
      setIsPlaying(true);
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const toggleMuted = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const toggleCaptions = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    Array.from(video.textTracks).forEach((track) => {
      track.mode = track.mode === "showing" ? "hidden" : "showing";
    });
  };

  return (
    <aside
      className="campaign-short-form-player"
      aria-label={controlModel.accessibility.ariaLabel}
      data-available-while={controlModel.availableWhileBrowsing.join(" ")}
    >
      <div className="campaign-short-form-preview">
        <video
          ref={videoRef}
          src={controlModel.activeAsset.uri}
          controls={controlModel.playback.nativeControls}
          muted={isMuted}
          loop={controlModel.playback.loop}
          playsInline
          preload="metadata"
          controlsList="nodownload"
          aria-label={controlModel.activeAsset.title}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
      <div className="campaign-short-form-player-copy">
        <span>SHORT-FORM PREVIEW</span>
        <strong>{controlModel.activeAsset.title}</strong>
        <small>
          {formatDuration(controlModel)} /{" "}
          {controlModel.commerceContext.productTitle}
        </small>
      </div>
      <div
        className="campaign-short-form-controls"
        aria-label="Short-form playback and campaign controls"
      >
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={controlModel.actions[0].ariaLabel}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          <span>{isPlaying ? "Pause" : "Play"}</span>
        </button>
        <button
          type="button"
          onClick={toggleMuted}
          aria-label={controlModel.actions[1].ariaLabel}
        >
          <Volume2 className="size-4" />
          <span>{isMuted ? "Muted" : "Sound"}</span>
        </button>
        <button
          type="button"
          onClick={toggleCaptions}
          aria-label={controlModel.actions[2].ariaLabel}
        >
          <Captions className="size-4" />
          <span>Captions</span>
        </button>
        <a
          href={controlModel.commerceContext.destinationUrl || undefined}
          aria-label={controlModel.actions[3].ariaLabel}
        >
          <ShoppingBag className="size-4" />
          <span>{controlModel.commerceContext.callToAction}</span>
        </a>
        <span className="campaign-short-form-action-chip">
          {controlModel.campaignActionContext.primaryChannelLabel}
        </span>
      </div>
    </aside>
  );
}

function formatDuration(controlModel: CampaignShortFormContentControlModel) {
  const durationSeconds =
    controlModel.activeAsset.generatedMetadata?.durationSeconds;

  if (durationSeconds === undefined || durationSeconds <= 0) {
    return "Playable";
  }

  return `${Math.round(durationSeconds)}s`;
}

function getCampaignBriefReadiness(campaign: CampaignDraft): {
  completed: number;
  total: number;
  label: string;
} {
  const requiredValues = [
    campaign.title,
    campaign.objective,
    campaign.targetAudience.interests,
    campaign.productOffer.offer.summary,
    campaign.tracking.measurementGoals[0]?.name ?? "",
  ];
  const completed = requiredValues.filter((value) => value.trim().length > 0).length;
  const total = requiredValues.length;

  return {
    completed,
    total,
    label: completed === total ? "Ready to create" : "Draft brief",
  };
}

function CampaignMetadataPanel({
  campaign,
  onCampaignChange,
  onCampaignSpecJsonEdit,
}: {
  campaign: CampaignDraft;
  onCampaignChange?: (campaign: CampaignDraft) => void;
  onCampaignSpecJsonEdit: (value: string) => CreativeCanvasSpecJsonSyncResult;
}) {
  const [assetDraft, setAssetDraft] = useState({
    title: "",
    uri: "",
    mediaType: "image" as CampaignAssetMediaType,
    usage: "reference" as CampaignAssetUsage,
    status: "draft" as CampaignAssetStatus,
    altText: "",
    rightsOwner: "",
    rightsLicense: "",
    rightsSourceUrl: "",
  });
  const [publishingDraft, setPublishingDraft] = useState({
    type: "direct-message" as CampaignPublishingChannelType,
    platform: "instagram",
    label: "",
    providerPluginId: "",
    accountId: "",
    accountHandle: "",
    placement: "comment-trigger",
    destinationUrl: "",
    landingPageId: "",
    scheduleMode: "manual" as (typeof publishingScheduleModeOptions)[number],
    startsAt: "",
    timezone: "UTC",
    utmSource: "instagram",
    utmMedium: "dm",
    utmCampaign: "",
    utmContent: "",
    conversionEvent: "purchase",
    status: "draft" as CampaignPublishingStatus,
  });
  const [measurementGoalDraft, setMeasurementGoalDraft] = useState({
    name: "Purchase conversion rate",
    target: "",
    unit: "percent",
    successCriteria: "",
    startsAt: "",
    endsAt: "",
    timezone: "UTC",
  });
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedMeasurementGoalId, setSelectedMeasurementGoalId] = useState<
    string | null
  >(null);
  const [campaignSpecJson, setCampaignSpecJson] = useState(() =>
    formatCampaignSpecJson(campaign),
  );
  const [
    campaignSpecValidationErrors,
    setCampaignSpecValidationErrors,
  ] = useState<CampaignSpecJsonEditValidationError[]>([]);
  const assetSummaries = useMemo(
    () => listCampaignAssets(campaign),
    [campaign],
  );
  const activeAssetId = selectedAssetId ?? assetSummaries[0]?.id ?? null;
  const selectedAsset = activeAssetId
    ? getCampaignAssetDetails(campaign, activeAssetId)
    : null;
  const measurementGoals = campaign.tracking.measurementGoals ?? [];
  const selectedMeasurementGoal =
    measurementGoals.find((goal) => goal.id === selectedMeasurementGoalId) ??
    null;
  const landingPageBehavior = getCampaignLandingPageBehaviorConfiguration(
    campaign,
  );
  const landingPageNavigation = getCampaignLandingPageNavigationConfiguration(
    campaign,
  );
  const landingPageConversionElement =
    getCampaignLandingPageConversionElements(campaign)[0] ??
    createDefaultLandingPageConversionElement(campaign);

  useEffect(() => {
    if (campaignSpecValidationErrors.length > 0) {
      return;
    }

    setCampaignSpecJson(formatCampaignSpecJson(campaign));
  }, [campaign, campaignSpecValidationErrors.length]);

  const updateCampaignField = (
    field: "title" | "objective",
    value: string,
  ) => {
    onCampaignChange?.({
      ...campaign,
      [field]: value,
    });
  };

  const updateAudienceField = (
    field: keyof CampaignDraft["targetAudience"],
    value: string,
  ) => {
    onCampaignChange?.({
      ...campaign,
      targetAudience: {
        ...campaign.targetAudience,
        [field]: value,
      },
    });
  };

  const updateProductField = (
    field: keyof Pick<
      CampaignProductOffer["product"],
      "id" | "title" | "brand" | "category" | "description" | "canonicalUrl"
    >,
    value: string,
  ) => {
    onCampaignChange?.({
      ...campaign,
      productOffer: {
        ...campaign.productOffer,
        product: {
          ...campaign.productOffer.product,
          [field]: value,
        },
      },
    });
  };

  const updateOfferField = (
    field: keyof Omit<CampaignProductOffer["offer"], "price">,
    value: string,
  ) => {
    onCampaignChange?.({
      ...campaign,
      productOffer: {
        ...campaign.productOffer,
        offer: {
          ...campaign.productOffer.offer,
          [field]: value,
        },
      },
    });
  };

  const updateProductTags = (value: string) => {
    onCampaignChange?.({
      ...campaign,
      productOffer: {
        ...campaign.productOffer,
        product: {
          ...campaign.productOffer.product,
          tags: value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
      },
    });
  };

  const updateOfferPriceDisplay = (value: string) => {
    onCampaignChange?.({
      ...campaign,
      productOffer: {
        ...campaign.productOffer,
        offer: {
          ...campaign.productOffer.offer,
          price: {
            ...campaign.productOffer.offer.price,
            display: value,
          },
        },
      },
    });
  };

  const updateOfferPriceAmount = (value: string) => {
    const normalizedValue = value.trim();
    const parsedValue = Number(normalizedValue);

    onCampaignChange?.({
      ...campaign,
      productOffer: {
        ...campaign.productOffer,
        offer: {
          ...campaign.productOffer.offer,
          price: {
            ...campaign.productOffer.offer.price,
            amount:
              normalizedValue === "" || !Number.isFinite(parsedValue)
                ? null
                : parsedValue,
          },
        },
      },
    });
  };

  const updateOfferPriceCurrency = (value: string) => {
    onCampaignChange?.({
      ...campaign,
      productOffer: {
        ...campaign.productOffer,
        offer: {
          ...campaign.productOffer.offer,
          price: {
            ...campaign.productOffer.offer.price,
            currency: value.toUpperCase(),
          },
        },
      },
    });
  };

  const updateAttributionField = (
    field: keyof Pick<
      CampaignProductOffer["attribution"],
      "source" | "externalId" | "affiliateNetwork" | "trackingUrl"
    >,
    value: string,
  ) => {
    onCampaignChange?.({
      ...campaign,
      productOffer: {
        ...campaign.productOffer,
        attribution: {
          ...campaign.productOffer.attribution,
          [field]: value,
        },
      },
    });
  };

  const updateCommissionRate = (value: string) => {
    const normalizedValue = value.trim();
    const parsedValue = Number(normalizedValue);

    onCampaignChange?.({
      ...campaign,
      productOffer: {
        ...campaign.productOffer,
        attribution: {
          ...campaign.productOffer.attribution,
          commissionRate:
            normalizedValue === "" || !Number.isFinite(parsedValue)
              ? null
              : parsedValue,
        },
      },
    });
  };

  const addAssetToCampaign = (assetInput: {
    source: "upload" | "link";
    uri: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number | null;
  }) => {
    const asset = createCampaignAsset({
      id: `asset_${Date.now()}`,
      source: assetInput.source,
      mediaType: assetDraft.mediaType,
      title: assetDraft.title.trim() || assetInput.fileName || "Campaign asset",
      uri: assetInput.uri,
      usage: assetDraft.usage,
      status: assetDraft.status,
      altText: assetDraft.altText,
      fileName: assetInput.fileName,
      mimeType: assetInput.mimeType,
      sizeBytes: assetInput.sizeBytes,
      rights: {
        owner: assetDraft.rightsOwner.trim() || "Unknown owner",
        license: assetDraft.rightsLicense,
        ...(assetDraft.rightsSourceUrl.trim() === ""
          ? {}
          : { sourceUrl: assetDraft.rightsSourceUrl }),
      },
      createdBy: "human",
    });

    onCampaignChange?.(addCampaignAsset(campaign, asset));
    setSelectedAssetId(asset.id);
    setAssetDraft((currentDraft) => ({
      ...currentDraft,
      title: "",
      uri: "",
      altText: "",
    }));
  };

  const addLinkedAsset = () => {
    if (assetDraft.uri.trim() === "") {
      return;
    }

    addAssetToCampaign({
      source: "link",
      uri: assetDraft.uri,
    });
  };

  const addUploadedAsset = (file: File | null) => {
    if (!file) {
      return;
    }

    addAssetToCampaign({
      source: "upload",
      uri:
        typeof URL === "undefined" || !URL.createObjectURL
          ? `upload:${file.name}`
          : URL.createObjectURL(file),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  };

  const loadSelectedAssetForEditing = () => {
    if (!selectedAsset) {
      return;
    }

    setAssetDraft({
      title: selectedAsset.title,
      uri: selectedAsset.uri,
      mediaType: selectedAsset.mediaType,
      usage: selectedAsset.usage,
      status: selectedAsset.status ?? "draft",
      altText: selectedAsset.altText,
      rightsOwner: selectedAsset.rights.owner,
      rightsLicense: selectedAsset.rights.license,
      rightsSourceUrl: selectedAsset.rights.sourceUrl ?? "",
    });
  };

  const saveSelectedAssetEdits = () => {
    if (!selectedAsset) {
      return;
    }

    onCampaignChange?.(
      editCampaignAsset(campaign, selectedAsset.id, {
        title: assetDraft.title.trim() || selectedAsset.title,
        mediaType: assetDraft.mediaType,
        usage: assetDraft.usage,
        status: assetDraft.status,
        altText: assetDraft.altText,
        rights: {
          owner: assetDraft.rightsOwner.trim() || selectedAsset.rights.owner,
          license: assetDraft.rightsLicense,
          sourceUrl: assetDraft.rightsSourceUrl,
        },
      }),
    );
  };

  const replaceSelectedLinkedAsset = () => {
    if (!selectedAsset || assetDraft.uri.trim() === "") {
      return;
    }

    onCampaignChange?.(
      replaceCampaignAsset(campaign, selectedAsset.id, {
        source: "link",
        uri: assetDraft.uri,
        mediaType: assetDraft.mediaType,
        title: assetDraft.title.trim() || selectedAsset.title,
        usage: assetDraft.usage,
        status: assetDraft.status,
        altText: assetDraft.altText,
        rights: {
          owner: assetDraft.rightsOwner.trim() || selectedAsset.rights.owner,
          license: assetDraft.rightsLicense,
          sourceUrl: assetDraft.rightsSourceUrl,
        },
      }),
    );
  };

  const replaceSelectedUploadedAsset = (file: File | null) => {
    if (!selectedAsset || !file) {
      return;
    }

    onCampaignChange?.(
      replaceCampaignAsset(campaign, selectedAsset.id, {
        source: "upload",
        uri:
          typeof URL === "undefined" || !URL.createObjectURL
            ? `upload:${file.name}`
            : URL.createObjectURL(file),
        mediaType: assetDraft.mediaType,
        title: assetDraft.title.trim() || file.name,
        usage: assetDraft.usage,
        status: assetDraft.status,
        altText: assetDraft.altText,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        rights: {
          owner: assetDraft.rightsOwner.trim() || selectedAsset.rights.owner,
          license: assetDraft.rightsLicense,
          sourceUrl: assetDraft.rightsSourceUrl,
        },
      }),
    );
  };

  const removeSelectedAsset = () => {
    if (!selectedAsset) {
      return;
    }

    onCampaignChange?.(removeCampaignAsset(campaign, selectedAsset.id));
    setSelectedAssetId(null);
  };

  const archiveSelectedAsset = () => {
    if (!selectedAsset) {
      return;
    }

    onCampaignChange?.(archiveCampaignAsset(campaign, selectedAsset.id));
  };

  const addPublishingChannel = () => {
    if (
      publishingDraft.label.trim() === "" ||
      publishingDraft.destinationUrl.trim() === ""
    ) {
      return;
    }

    const channel = createCampaignPublishingChannel({
      id: `channel_${Date.now()}`,
      type: publishingDraft.type,
      platform: publishingDraft.platform,
      label: publishingDraft.label,
      providerPluginId: publishingDraft.providerPluginId,
      account: {
        id: publishingDraft.accountId,
        handle: publishingDraft.accountHandle,
      },
      placement: publishingDraft.placement,
      destinationUrl: publishingDraft.destinationUrl,
      landingPageId: publishingDraft.landingPageId,
      schedule: {
        mode: publishingDraft.scheduleMode,
        startsAt: publishingDraft.startsAt,
        timezone: publishingDraft.timezone,
      },
      tracking: {
        utmSource: publishingDraft.utmSource,
        utmMedium: publishingDraft.utmMedium,
        utmCampaign: publishingDraft.utmCampaign,
        utmContent: publishingDraft.utmContent,
        conversionEvent: publishingDraft.conversionEvent,
      },
      status: publishingDraft.status,
    });

    onCampaignChange?.({
      ...campaign,
      channels: [...campaign.channels, channel],
    });
    setPublishingDraft((currentDraft) => ({
      ...currentDraft,
      label: "",
      destinationUrl: "",
      landingPageId: "",
      utmCampaign: "",
      utmContent: "",
      startsAt: "",
    }));
  };

  const removePublishingChannel = (channelId: string) => {
    onCampaignChange?.({
      ...campaign,
      channels: campaign.channels.filter((channel) => channel.id !== channelId),
    });
  };

  const updateLandingPageBehaviorMode = (
    mode: CampaignLandingPageBehaviorMode,
  ) => {
    onCampaignChange?.(setCampaignLandingPageBehaviorMode(campaign, mode));
  };

  const updateLandingPageNavigation = (
    patch: Partial<typeof landingPageNavigation>,
  ) => {
    onCampaignChange?.(
      setCampaignLandingPageAuthoringControls(campaign, {
        navigation: {
          ...landingPageNavigation,
          ...patch,
        },
      }),
    );
  };

  const updateLandingPageConversionElement = (
    patch: Partial<CampaignLandingPageConversionElementConfiguration>,
  ) => {
    onCampaignChange?.(
      setCampaignLandingPageAuthoringControls(campaign, {
        conversionElements: [
          {
            ...landingPageConversionElement,
            ...patch,
          },
        ],
      }),
    );
  };

  const addMeasurementGoal = () => {
    if (
      measurementGoalDraft.name.trim() === "" ||
      measurementGoalDraft.successCriteria.trim() === "" ||
      measurementGoalDraft.startsAt.trim() === "" ||
      measurementGoalDraft.endsAt.trim() === ""
    ) {
      return;
    }

    const normalizedTarget = measurementGoalDraft.target.trim();
    const parsedTarget = Number(normalizedTarget);
    const goal = createCampaignMeasurementGoal({
      id: `measurement_goal_${Date.now()}`,
      name: measurementGoalDraft.name,
      target:
        normalizedTarget === "" || !Number.isFinite(parsedTarget)
          ? null
          : parsedTarget,
      unit: measurementGoalDraft.unit,
      successCriteria: measurementGoalDraft.successCriteria,
      reportingTimeframe: {
        startsAt: measurementGoalDraft.startsAt,
        endsAt: measurementGoalDraft.endsAt,
        timezone: measurementGoalDraft.timezone,
      },
    });

    onCampaignChange?.({
      ...campaign,
      tracking: {
        ...campaign.tracking,
        measurementGoals: [...measurementGoals, goal],
      },
    });
    setMeasurementGoalDraft((currentDraft) => ({
      ...currentDraft,
      target: "",
      successCriteria: "",
    }));
    setSelectedMeasurementGoalId(goal.id);
  };

  const loadMeasurementGoalForEditing = (goal: CampaignMeasurementGoal) => {
    setSelectedMeasurementGoalId(goal.id);
    setMeasurementGoalDraft({
      name: goal.name,
      target: goal.target?.toString() ?? "",
      unit: goal.unit,
      successCriteria: goal.successCriteria,
      startsAt: goal.reportingTimeframe.startsAt,
      endsAt: goal.reportingTimeframe.endsAt,
      timezone: goal.reportingTimeframe.timezone,
    });
  };

  const saveSelectedMeasurementGoalEdits = () => {
    if (!selectedMeasurementGoal) {
      return;
    }

    const normalizedTarget = measurementGoalDraft.target.trim();
    const parsedTarget = Number(normalizedTarget);

    onCampaignChange?.({
      ...campaign,
      tracking: {
        ...campaign.tracking,
        measurementGoals: measurementGoals.map((goal) =>
          goal.id === selectedMeasurementGoal.id
            ? {
                ...goal,
                name: measurementGoalDraft.name.trim() || goal.name,
                target:
                  normalizedTarget === "" ||
                  !Number.isFinite(parsedTarget)
                    ? null
                    : parsedTarget,
                unit: measurementGoalDraft.unit.trim() || goal.unit,
                successCriteria:
                  measurementGoalDraft.successCriteria.trim() ||
                  goal.successCriteria,
                reportingTimeframe: {
                  startsAt:
                    measurementGoalDraft.startsAt.trim() ||
                    goal.reportingTimeframe.startsAt,
                  endsAt:
                    measurementGoalDraft.endsAt.trim() ||
                    goal.reportingTimeframe.endsAt,
                  timezone:
                    measurementGoalDraft.timezone.trim() ||
                    goal.reportingTimeframe.timezone,
                },
              }
            : goal,
        ),
      },
    });
  };

  const removeMeasurementGoal = (goalId: CampaignMeasurementGoal["id"]) => {
    onCampaignChange?.({
      ...campaign,
      tracking: {
        ...campaign.tracking,
        measurementGoals: measurementGoals.filter((goal) => goal.id !== goalId),
      },
    });
    if (selectedMeasurementGoalId === goalId) {
      setSelectedMeasurementGoalId(null);
    }
  };

  const updateCampaignSpecJson = (value: string) => {
    setCampaignSpecJson(value);

    const result = onCampaignSpecJsonEdit(value);

    if (!result.valid) {
      setCampaignSpecValidationErrors(result.errors);
      return;
    }

    setCampaignSpecValidationErrors([]);
    onCampaignChange?.(result.campaign);
  };
  const briefReadiness = getCampaignBriefReadiness(campaign);

  return (
    <aside className="campaign-metadata-panel" aria-label="Campaign brief">
      <div className="metadata-panel-header">
        <span>BRIEF</span>
        <strong>Campaign basics</strong>
      </div>

      <div className="campaign-brief-readiness" aria-label="Campaign brief readiness">
        <span>
          {briefReadiness.completed}/{briefReadiness.total} ready
        </span>
        <strong>{briefReadiness.label}</strong>
      </div>

      <div className="metadata-field-stack">
        <MetadataTextField
          id="campaign-title"
          label="Campaign title"
          value={campaign.title}
          onChange={(value) => updateCampaignField("title", value)}
          required
        />
        <MetadataTextArea
          id="campaign-objective"
          label="Objective"
          value={campaign.objective}
          onChange={(value) => updateCampaignField("objective", value)}
          placeholder="Define the conversion goal and campaign outcome"
          required
        />
      </div>

      <MetadataSection title="Audience">
        {CAMPAIGN_TARGET_AUDIENCE_FIELDS.map((field) => (
          <MetadataTextField
            key={field}
            id={`audience-${field}`}
            label={audienceFieldLabels[field]}
            value={campaign.targetAudience[field]}
            onChange={(value) => updateAudienceField(field, value)}
            placeholder={audienceFieldPlaceholders[field]}
          />
        ))}
      </MetadataSection>

      <MetadataSection title="Offer product">
        {(Object.keys(productFieldLabels) as Array<keyof typeof productFieldLabels>).map(
          (field) => (
            <MetadataTextField
              key={field}
              id={`product-${field}`}
              label={productFieldLabels[field]}
              value={campaign.productOffer.product[field]}
              onChange={(value) => updateProductField(field, value)}
              placeholder={
                field === "canonicalUrl"
                  ? "https://shop.example.com/products/kit"
                  : undefined
              }
            />
          ),
        )}
        <MetadataTextArea
          id="product-description"
          label="Product description"
          value={campaign.productOffer.product.description}
          onChange={(value) => updateProductField("description", value)}
          placeholder="Product details, bundle contents, and buyer promise"
        />
        <MetadataTextField
          id="product-tags"
          label="Product tags"
          value={campaign.productOffer.product.tags.join(", ")}
          onChange={updateProductTags}
          placeholder="ugc, skincare, starter"
        />
      </MetadataSection>

      <MetadataSection title="Offer">
        {(Object.keys(offerFieldLabels) as Array<keyof typeof offerFieldLabels>).map(
          (field) =>
            field === "summary" || field === "terms" ? (
              <MetadataTextArea
                key={field}
                id={`offer-${field}`}
                label={offerFieldLabels[field]}
                value={campaign.productOffer.offer[field]}
                onChange={(value) => updateOfferField(field, value)}
                placeholder={
                  field === "terms"
                    ? "Eligibility, expiration, redemption limits, and exclusions"
                    : "Terms, urgency, and why this offer fits the audience"
                }
              />
            ) : (
              <MetadataTextField
                key={field}
                id={`offer-${field}`}
                label={offerFieldLabels[field]}
                value={campaign.productOffer.offer[field]}
                onChange={(value) => updateOfferField(field, value)}
                placeholder={
                  field === "destinationUrl"
                    ? "https://shop.example.com/offer?utm_campaign=..."
                    : undefined
                }
              />
            ),
        )}
        <MetadataTextField
          id="offer-price-display"
          label="Price display"
          value={campaign.productOffer.offer.price.display}
          onChange={updateOfferPriceDisplay}
        />
        <MetadataTextField
          id="offer-price-amount"
          label="Price amount"
          type="number"
          value={campaign.productOffer.offer.price.amount?.toString() ?? ""}
          onChange={updateOfferPriceAmount}
          placeholder="4900"
        />
        <MetadataTextField
          id="offer-price-currency"
          label="Currency"
          value={campaign.productOffer.offer.price.currency}
          onChange={updateOfferPriceCurrency}
          placeholder="USD"
        />
      </MetadataSection>

      <MetadataSection title="Commerce attribution">
        {(
          Object.keys(attributionFieldLabels) as Array<
            keyof typeof attributionFieldLabels
          >
        ).map((field) => (
          <MetadataTextField
            key={field}
            id={`attribution-${field}`}
            label={attributionFieldLabels[field]}
            value={campaign.productOffer.attribution[field]}
            onChange={(value) => updateAttributionField(field, value)}
          />
        ))}
        <MetadataTextField
          id="attribution-commission-rate"
          label="Commission rate"
          type="number"
          value={campaign.productOffer.attribution.commissionRate?.toString() ?? ""}
          onChange={updateCommissionRate}
          placeholder="12.5"
        />
      </MetadataSection>

      <MetadataSection title="Channels">
        <MetadataSelect
          id="publishing-type"
          label="Channel type"
          value={publishingDraft.type}
          options={publishingChannelTypeOptions}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              type: value as CampaignPublishingChannelType,
            }))
          }
        />
        <MetadataSelect
          id="publishing-status"
          label="Status"
          value={publishingDraft.status}
          options={publishingStatusOptions}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              status: value as CampaignPublishingStatus,
            }))
          }
        />
        <MetadataTextField
          id="publishing-platform"
          label="Platform"
          value={publishingDraft.platform}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              platform: value,
            }))
          }
          placeholder="instagram"
          required
        />
        <MetadataTextField
          id="publishing-label"
          label="Channel label"
          value={publishingDraft.label}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              label: value,
            }))
          }
          placeholder="Instagram comment to DM"
          required
        />
        <MetadataTextField
          id="publishing-account-handle"
          label="Account handle"
          value={publishingDraft.accountHandle}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              accountHandle: value,
            }))
          }
          placeholder="@owncanvas"
        />
        <MetadataTextField
          id="publishing-placement"
          label="Placement"
          value={publishingDraft.placement}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              placement: value,
            }))
          }
          placeholder="comment-trigger"
          required
        />
        <MetadataTextField
          id="publishing-destination-url"
          label="Destination URL"
          value={publishingDraft.destinationUrl}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              destinationUrl: value,
            }))
          }
          placeholder="https://go.example.com/creator-kit"
          required
        />
        <MetadataSelect
          id="publishing-schedule-mode"
          label="Schedule"
          value={publishingDraft.scheduleMode}
          options={publishingScheduleModeOptions}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              scheduleMode: value as (typeof publishingScheduleModeOptions)[number],
            }))
          }
        />
        <MetadataTextField
          id="publishing-starts-at"
          label="Starts at"
          value={publishingDraft.startsAt}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              startsAt: value,
            }))
          }
          placeholder="2026-05-12T15:00:00.000Z"
        />
        <MetadataTextField
          id="publishing-timezone"
          label="Timezone"
          value={publishingDraft.timezone}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              timezone: value,
            }))
          }
          placeholder="America/Los_Angeles"
        />
        <MetadataTextField
          id="publishing-conversion-event"
          label="Conversion event"
          value={publishingDraft.conversionEvent}
          onChange={(value) =>
            setPublishingDraft((currentDraft) => ({
              ...currentDraft,
              conversionEvent: value,
            }))
          }
          required
        />
        <div className="metadata-asset-actions metadata-field-wide">
          <button type="button" onClick={addPublishingChannel}>
            <Link2 className="size-4" />
            Add channel
          </button>
        </div>
        <div className="metadata-asset-list metadata-field-wide">
          {campaign.channels.length === 0 ? (
            <span>No publishing channels</span>
          ) : (
            campaign.channels.map((channel) => (
              <div key={channel.id} className="metadata-asset-row">
                <strong>{channel.label}</strong>
                <small>
                  {channel.platform} / {channel.type} / {channel.placement}
                </small>
                <small>
                  {channel.status} / {channel.tracking.conversionEvent}
                </small>
                <button
                  type="button"
                  onClick={() => removePublishingChannel(channel.id)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </MetadataSection>

      <MetadataSection title="Assets">
        <MetadataTextField
          id="asset-title"
          label="Asset title"
          value={assetDraft.title}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              title: value,
            }))
          }
          placeholder="Primary product shot"
          required
        />
        <MetadataTextField
          id="asset-uri"
          label="Asset link"
          value={assetDraft.uri}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              uri: value,
            }))
          }
          placeholder="https://cdn.example.com/asset.jpg"
        />
        <MetadataSelect
          id="asset-media-type"
          label="Media type"
          value={assetDraft.mediaType}
          options={assetMediaTypeOptions}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              mediaType: value as CampaignAssetMediaType,
            }))
          }
        />
        <MetadataSelect
          id="asset-usage"
          label="Usage"
          value={assetDraft.usage}
          options={assetUsageOptions}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              usage: value as CampaignAssetUsage,
            }))
          }
        />
        <MetadataSelect
          id="asset-status"
          label="Status"
          value={assetDraft.status}
          options={assetStatusOptions}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              status: value as CampaignAssetStatus,
            }))
          }
        />
        <MetadataTextField
          id="asset-rights-owner"
          label="Rights owner"
          value={assetDraft.rightsOwner}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              rightsOwner: value,
            }))
          }
          placeholder="Brand, creator, or studio"
          required
        />
        <MetadataTextField
          id="asset-rights-license"
          label="License"
          value={assetDraft.rightsLicense}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              rightsLicense: value,
            }))
          }
          placeholder="brand-owned"
        />
        <MetadataTextField
          id="asset-rights-source-url"
          label="Rights source"
          value={assetDraft.rightsSourceUrl}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              rightsSourceUrl: value,
            }))
          }
          placeholder="https://shop.example.com/product"
        />
        <MetadataTextArea
          id="asset-alt-text"
          label="Alt text"
          value={assetDraft.altText}
          onChange={(value) =>
            setAssetDraft((currentDraft) => ({
              ...currentDraft,
              altText: value,
            }))
          }
          placeholder="Describe the asset for generation and accessibility"
        />
        <div className="metadata-asset-actions metadata-field-wide">
          <button type="button" onClick={addLinkedAsset}>
            <Link2 className="size-4" />
            Add link
          </button>
          <label>
            <Upload className="size-4" />
            Upload file
            <input
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.txt"
              onChange={(event) =>
                addUploadedAsset(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <button
            type="button"
            onClick={loadSelectedAssetForEditing}
            disabled={!selectedAsset}
          >
            <Undo2 className="size-4" />
            Load selected
          </button>
          <button
            type="button"
            onClick={saveSelectedAssetEdits}
            disabled={!selectedAsset}
          >
            <Sparkles className="size-4" />
            Save edits
          </button>
          <button
            type="button"
            onClick={replaceSelectedLinkedAsset}
            disabled={!selectedAsset}
          >
            <Link2 className="size-4" />
            Replace link
          </button>
          <label className={!selectedAsset ? "disabled" : undefined}>
            <Upload className="size-4" />
            Replace file
            <input
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.txt"
              disabled={!selectedAsset}
              onChange={(event) =>
                replaceSelectedUploadedAsset(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <button
            type="button"
            onClick={removeSelectedAsset}
            disabled={!selectedAsset}
          >
            <Trash2 className="size-4" />
            Remove
          </button>
          <button
            type="button"
            onClick={archiveSelectedAsset}
            disabled={!selectedAsset || selectedAsset.status === "archived"}
          >
            <Archive className="size-4" />
            Archive
          </button>
        </div>
        <div className="metadata-asset-list metadata-field-wide">
          {assetSummaries.length === 0 ? (
            <span>No campaign assets</span>
          ) : (
            assetSummaries.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className={cn(
                  "metadata-asset-row",
                  activeAssetId === asset.id && "active",
                )}
                onClick={() => setSelectedAssetId(asset.id)}
              >
                <strong>{asset.title}</strong>
                <small>
                  {asset.source} / {asset.mediaType} / {asset.usage}
                </small>
                <small>
                  {asset.status} / {asset.createdBy} / {asset.rightsOwner}
                </small>
              </button>
            ))
          )}
        </div>
        {selectedAsset ? (
          <div className="metadata-asset-details metadata-field-wide">
            <div>
              <span>Status</span>
              <strong>{selectedAsset.status ?? "draft"}</strong>
            </div>
            <div>
              <span>URI</span>
              <a href={selectedAsset.uri} target="_blank" rel="noreferrer">
                {selectedAsset.uri}
              </a>
            </div>
            <div>
              <span>Rights</span>
              <strong>
                {selectedAsset.rights.owner} / {selectedAsset.rights.license || "No license"}
              </strong>
            </div>
            {selectedAsset.rights.sourceUrl ? (
              <div>
                <span>Rights source</span>
                <a
                  href={selectedAsset.rights.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedAsset.rights.sourceUrl}
                </a>
              </div>
            ) : null}
            <div>
              <span>File</span>
              <strong>
                {selectedAsset.fileName || "Linked asset"}
                {selectedAsset.mimeType ? ` / ${selectedAsset.mimeType}` : ""}
                {selectedAsset.sizeBytes === null
                  ? ""
                  : ` / ${selectedAsset.sizeBytes} bytes`}
              </strong>
            </div>
            {selectedAsset.altText ? (
              <div>
                <span>Alt text</span>
                <p>{selectedAsset.altText}</p>
              </div>
            ) : null}
            <div>
              <span>Created</span>
              <strong>
                {selectedAsset.createdBy} / {selectedAsset.createdAt}
              </strong>
            </div>
          </div>
        ) : null}
      </MetadataSection>

      <MetadataSection title="Goals">
        <MetadataTextField
          id="measurement-target-metric"
          label="Metric name"
          value={measurementGoalDraft.name}
          onChange={(value) =>
            setMeasurementGoalDraft((currentDraft) => ({
              ...currentDraft,
              name: value,
            }))
          }
          placeholder="Purchase conversion rate"
          required
        />
        <MetadataTextField
          id="measurement-target-value"
          label="Target"
          type="number"
          value={measurementGoalDraft.target}
          onChange={(value) =>
            setMeasurementGoalDraft((currentDraft) => ({
              ...currentDraft,
              target: value,
            }))
          }
          placeholder="3.5"
        />
        <MetadataTextField
          id="measurement-unit"
          label="Unit"
          value={measurementGoalDraft.unit}
          onChange={(value) =>
            setMeasurementGoalDraft((currentDraft) => ({
              ...currentDraft,
              unit: value,
            }))
          }
          placeholder="percent"
          required
        />
        <MetadataTextField
          id="measurement-starts-at"
          label="Reporting starts"
          value={measurementGoalDraft.startsAt}
          onChange={(value) =>
            setMeasurementGoalDraft((currentDraft) => ({
              ...currentDraft,
              startsAt: value,
            }))
          }
          placeholder="2026-05-12T00:00:00.000Z"
          required
        />
        <MetadataTextField
          id="measurement-ends-at"
          label="Reporting ends"
          value={measurementGoalDraft.endsAt}
          onChange={(value) =>
            setMeasurementGoalDraft((currentDraft) => ({
              ...currentDraft,
              endsAt: value,
            }))
          }
          placeholder="2026-05-19T00:00:00.000Z"
          required
        />
        <MetadataTextField
          id="measurement-timezone"
          label="Timezone"
          value={measurementGoalDraft.timezone}
          onChange={(value) =>
            setMeasurementGoalDraft((currentDraft) => ({
              ...currentDraft,
              timezone: value,
            }))
          }
          placeholder="America/Los_Angeles"
          required
        />
        <MetadataTextArea
          id="measurement-success-criteria"
          label="Success criteria"
          value={measurementGoalDraft.successCriteria}
          onChange={(value) =>
            setMeasurementGoalDraft((currentDraft) => ({
              ...currentDraft,
              successCriteria: value,
            }))
          }
          placeholder="Purchase conversion rate reaches the target with tracked checkout attribution"
          required
        />
        <div className="metadata-asset-actions metadata-field-wide">
          <button type="button" onClick={addMeasurementGoal}>
            <Target className="size-4" />
            Add goal
          </button>
          <button
            type="button"
            onClick={saveSelectedMeasurementGoalEdits}
            disabled={!selectedMeasurementGoal}
          >
            <Target className="size-4" />
            Save goal
          </button>
        </div>
        <div className="metadata-asset-list metadata-field-wide">
          {measurementGoals.length === 0 ? (
            <span>No measurement goals</span>
          ) : (
            measurementGoals.map((goal) => (
              <div key={goal.id} className="metadata-asset-row">
                <strong>{goal.name}</strong>
                <small>
                  {goal.target ?? "No target"} {goal.unit} /{" "}
                  {goal.reportingTimeframe.startsAt} to{" "}
                  {goal.reportingTimeframe.endsAt}
                </small>
                <small>{goal.successCriteria}</small>
                <button
                  type="button"
                  onClick={() => loadMeasurementGoalForEditing(goal)}
                >
                  <Target className="size-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeMeasurementGoal(goal.id)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </MetadataSection>

      <details className="metadata-developer-details">
        <summary>Developer details</summary>
        <MetadataSection title="Channel routing">
          <MetadataTextField
            id="publishing-provider-plugin-id"
            label="Provider plugin"
            value={publishingDraft.providerPluginId}
            onChange={(value) =>
              setPublishingDraft((currentDraft) => ({
                ...currentDraft,
                providerPluginId: value,
              }))
            }
            placeholder="plugin.dm.instagram"
          />
          <MetadataTextField
            id="publishing-account-id"
            label="Account ID"
            value={publishingDraft.accountId}
            onChange={(value) =>
              setPublishingDraft((currentDraft) => ({
                ...currentDraft,
                accountId: value,
              }))
            }
          />
          <MetadataTextField
            id="publishing-landing-page-id"
            label="Landing page ID"
            value={publishingDraft.landingPageId}
            onChange={(value) =>
              setPublishingDraft((currentDraft) => ({
                ...currentDraft,
                landingPageId: value,
              }))
            }
            placeholder="landing_creator_kit"
          />
        </MetadataSection>
        <MetadataSection title="Channel attribution">
          <MetadataTextField
            id="publishing-utm-source"
            label="UTM source"
            value={publishingDraft.utmSource}
            onChange={(value) =>
              setPublishingDraft((currentDraft) => ({
                ...currentDraft,
                utmSource: value,
              }))
            }
            required
          />
          <MetadataTextField
            id="publishing-utm-medium"
            label="UTM medium"
            value={publishingDraft.utmMedium}
            onChange={(value) =>
              setPublishingDraft((currentDraft) => ({
                ...currentDraft,
                utmMedium: value,
              }))
            }
            required
          />
          <MetadataTextField
            id="publishing-utm-campaign"
            label="UTM campaign"
            value={publishingDraft.utmCampaign}
            onChange={(value) =>
              setPublishingDraft((currentDraft) => ({
                ...currentDraft,
                utmCampaign: value,
              }))
            }
            required
          />
          <MetadataTextField
            id="publishing-utm-content"
            label="UTM content"
            value={publishingDraft.utmContent}
            onChange={(value) =>
              setPublishingDraft((currentDraft) => ({
                ...currentDraft,
                utmContent: value,
              }))
            }
          />
        </MetadataSection>
        <MetadataSection title="Landing behavior">
          <MetadataSelect
            id="landing-behavior-mode"
            label="Mode"
            value={landingPageBehavior.mode}
            options={CAMPAIGN_LANDING_PAGE_BEHAVIOR_MODES}
            onChange={(value) =>
              updateLandingPageBehaviorMode(
                value as CampaignLandingPageBehaviorMode,
              )
            }
          />
          <div className="metadata-mode-summary metadata-field-wide">
            <span
              data-active={landingPageBehavior.preserveInlineContext}
            >
              Inline context
            </span>
            <span
              data-active={landingPageBehavior.allowTraditionalRedirect}
            >
              Redirect allowed
            </span>
          </div>
          <MetadataSelect
            id="landing-navigation-visibility"
            label="Navigation visibility"
            value={landingPageNavigation.visibility}
            options={CAMPAIGN_LANDING_PAGE_ELEMENT_VISIBILITY_OPTIONS}
            onChange={(value) =>
              updateLandingPageNavigation({
                visibility: value as CampaignLandingPageElementVisibility,
              })
            }
          />
          <MetadataSelect
            id="landing-navigation-placement"
            label="Navigation placement"
            value={landingPageNavigation.placement}
            options={CAMPAIGN_LANDING_PAGE_NAVIGATION_PLACEMENT_OPTIONS}
            onChange={(value) =>
              updateLandingPageNavigation({
                placement: value as CampaignLandingPageNavigationPlacement,
              })
            }
          />
          <MetadataSelect
            id="landing-navigation-timing"
            label="Navigation timing"
            value={landingPageNavigation.timing}
            options={CAMPAIGN_LANDING_PAGE_ELEMENT_TIMING_OPTIONS}
            onChange={(value) =>
              updateLandingPageNavigation({
                timing: value as CampaignLandingPageElementTiming,
              })
            }
          />
          <MetadataSelect
            id="landing-navigation-interruption"
            label="Navigation interruption"
            value={landingPageNavigation.interruptionBehavior}
            options={CAMPAIGN_LANDING_PAGE_PLAYBACK_INTERRUPTION_OPTIONS}
            onChange={(value) =>
              updateLandingPageNavigation({
                interruptionBehavior:
                  value as CampaignLandingPagePlaybackInterruptionBehavior,
              })
            }
          />
          <MetadataTextField
            id="landing-conversion-label"
            label="Conversion label"
            value={landingPageConversionElement.label}
            onChange={(value) =>
              updateLandingPageConversionElement({ label: value })
            }
            placeholder="Open offer"
          />
          <MetadataTextField
            id="landing-conversion-url"
            label="Conversion URL"
            value={landingPageConversionElement.destinationUrl}
            onChange={(value) =>
              updateLandingPageConversionElement({ destinationUrl: value })
            }
            placeholder="https://shop.example.com/checkout"
          />
          <MetadataSelect
            id="landing-conversion-placement"
            label="Conversion placement"
            value={landingPageConversionElement.placement}
            options={CAMPAIGN_LANDING_PAGE_CONVERSION_PLACEMENT_OPTIONS}
            onChange={(value) =>
              updateLandingPageConversionElement({
                placement: value as CampaignLandingPageConversionElementPlacement,
              })
            }
          />
          <MetadataSelect
            id="landing-conversion-timing"
            label="Conversion timing"
            value={landingPageConversionElement.timing}
            options={CAMPAIGN_LANDING_PAGE_ELEMENT_TIMING_OPTIONS}
            onChange={(value) =>
              updateLandingPageConversionElement({
                timing: value as CampaignLandingPageElementTiming,
              })
            }
          />
          <MetadataSelect
            id="landing-conversion-interruption"
            label="Conversion interruption"
            value={landingPageConversionElement.interruptionBehavior}
            options={CAMPAIGN_LANDING_PAGE_PLAYBACK_INTERRUPTION_OPTIONS}
            onChange={(value) =>
              updateLandingPageConversionElement({
                interruptionBehavior:
                  value as CampaignLandingPagePlaybackInterruptionBehavior,
              })
            }
          />
        </MetadataSection>
        <MetadataSection title="Source JSON">
          <MetadataJsonArea
            id="campaign-spec-json"
            label="Canvas source"
            value={campaignSpecJson}
            onChange={updateCampaignSpecJson}
            invalid={campaignSpecValidationErrors.length > 0}
          />
          {campaignSpecValidationErrors.length > 0 ? (
            <div
              className="metadata-validation-errors metadata-field-wide"
              role="status"
              aria-live="polite"
            >
              {campaignSpecValidationErrors.map((error) => (
                <p key={`${error.path}-${error.code}`}>
                  <strong>{error.path}</strong>
                  <span>{error.message}</span>
                </p>
              ))}
            </div>
          ) : null}
        </MetadataSection>
      </details>
    </aside>
  );
}

function MetadataSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="metadata-section">
      <h2>{title}</h2>
      <div className="metadata-field-grid">{children}</div>
    </section>
  );
}

function MetadataTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "number";
}) {
  return (
    <label className="metadata-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required ? "true" : undefined}
      />
    </label>
  );
}

function MetadataSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="metadata-field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetadataTextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="metadata-field metadata-field-wide" htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required ? "true" : undefined}
        rows={3}
      />
    </label>
  );
}

function MetadataJsonArea({
  id,
  label,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <label className="metadata-field metadata-field-wide" htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        className="metadata-json-editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={12}
        spellCheck={false}
        aria-invalid={invalid ? "true" : "false"}
      />
    </label>
  );
}

function AppSidebar() {
  return (
    <aside className="canvas-sidebar fixed inset-y-0 left-0 z-30 flex w-12 flex-col items-center bg-[#11101a] text-white">
      <div className="grid h-[53px] w-full place-items-center border-b border-white/10">
        <div className="grid size-8 place-items-center rounded-lg bg-white">
          <div className="grid size-6 place-items-center rounded-md bg-[#7c2cff] text-white">
            <Play className="ml-0.5 size-4 fill-current" />
          </div>
        </div>
      </div>
      <nav className="mt-6 flex flex-1 flex-col items-center gap-5 text-white/68">
        <Grid2X2 className="size-4" />
        <Type className="size-4" />
        <button
          className="grid size-9 place-items-center rounded-xl bg-[#7c2cff]/35 text-white"
          type="button"
          aria-label="Creative Canvas"
        >
          <Blocks className="size-4" />
        </button>
        <Clock3 className="size-4" />
      </nav>
      <div className="mb-4 grid size-10 place-items-center rounded-xl border border-white/16 bg-white/8">
        <Sparkles className="size-4" />
      </div>
    </aside>
  );
}

function TopBar({
  campaignTitle,
  onBackToDashboard,
  onOpenReporting,
}: {
  campaignTitle: string;
  onBackToDashboard?: () => void;
  onOpenReporting?: () => void;
}) {
  return (
    <header className="canvas-topbar fixed left-12 right-0 top-0 z-20 flex h-[53px] items-center justify-between border-b border-[#e6e1d7] bg-[#fbfaf7] px-7">
      <div className="canvas-topbar-breadcrumbs flex min-w-0 items-center gap-4 text-sm font-semibold text-[#6f687a]">
        <button
          className="breadcrumb-icon-button"
          type="button"
          aria-label="Back to campaigns"
          onClick={onBackToDashboard}
        >
          <ArrowLeft className="size-4" />
        </button>
        <span>Campaigns</span>
        <span>/</span>
        <span className="max-w-[320px] truncate text-[#25212b]">
          {campaignTitle}
        </span>
        <span>/</span>
        <span>Canvas</span>
      </div>
      <div className="canvas-topbar-actions flex items-center gap-2">
        <button
          className="topbar-button soft"
          type="button"
          onClick={onOpenReporting}
        >
          <Target className="size-4" />
          Reporting
        </button>
        <button className="topbar-button neutral" type="button">
          Save campaign
        </button>
        <button className="topbar-button soft" type="button">
          Preview outputs
        </button>
        <button className="topbar-button primary" type="button">
          Export
        </button>
      </div>
    </header>
  );
}

function FloatingToolbar({
  activeTool,
  onToolChange,
}: {
  activeTool: string;
  onToolChange: (tool: string) => void;
}) {
  const tools = [
    { id: "select", icon: MousePointer2 },
    { id: "hand", icon: Hand },
    { id: "comment", icon: MessageSquare },
    { id: "undo", icon: Undo2 },
    { id: "redo", icon: Redo2 },
    { id: "trash", icon: Trash2 },
  ];

  return (
    <div className="canvas-toolbar fixed left-[76px] top-[66px] z-20 rounded-full border border-[#ebe6dc] bg-white p-2 shadow-[0_18px_40px_rgba(42,31,18,0.08)]">
      <div className="canvas-toolbar-inner flex flex-col items-center gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={cn("tool-button", activeTool === tool.id && "active")}
            type="button"
            onClick={() => onToolChange(tool.id)}
            aria-label={tool.id}
          >
            <tool.icon className="size-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

function GenerationPalette({
  onDragBlockStart,
}: {
  onDragBlockStart: (
    event: DragEvent<HTMLButtonElement>,
    kind: GenerationBlockKind,
  ) => void;
}) {
  return (
    <section className="generation-palette canvas-generation-palette" aria-label="Campaign blocks">
      <div className="palette-header">
        <strong>Blocks</strong>
      </div>
      <div className="mt-3 grid gap-2">
        {generationPalette.map((item) => {
          const Icon = blockIcons[item.kind];

          return (
            <button
              key={item.kind}
              className={cn("palette-item", item.kind)}
              type="button"
              draggable
              onDragStart={(event) => onDragBlockStart(event, item.kind)}
              aria-label={`Drag ${item.title} block to canvas`}
            >
              <span className="palette-icon">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <strong>{item.title}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CanvasStatus({ visibleBlocks }: { visibleBlocks: number }) {
  return (
    <div className="canvas-status pointer-events-none fixed bottom-6 right-5 z-20 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm shadow-[0_14px_34px_rgba(40,32,20,0.08)]">
      <span className="font-semibold text-[#2f2937]">Campaign draft</span>
      <span className="text-[#b6ad9e]">/</span>
      <span className="font-semibold text-[#6c6474]">Focus</span>
      <span className="text-[#6c6474]">Creative Canvas</span>
      <span className="text-[#b6ad9e]">/</span>
      <span className="text-[#6c6474]">{visibleBlocks} blocks</span>
      <span className="text-[#b6ad9e]">/</span>
      <span className="text-[#6c6474]">Local-first</span>
    </div>
  );
}

function resolveNonImageGenerationNodePorts(
  kind: GenerationBlockKind,
): NonImageGenerationNodePort[] {
  switch (kind) {
    case "text":
      return [
        {
          id: "brief",
          label: "Brief",
          direction: "input",
          mediaType: "text",
          connectable: false,
        },
        {
          id: "copy",
          label: "Copy",
          direction: "output",
          mediaType: "text",
          connectable: false,
        },
      ];
    case "llm":
      return [
        {
          id: "brief",
          label: "Brief",
          direction: "input",
          mediaType: "text",
          connectable: false,
        },
        {
          id: "prompt",
          label: "Prompt",
          direction: "output",
          mediaType: "text",
          connectable: false,
        },
      ];
    case "video":
      return [
        {
          id: "prompt",
          label: "Prompt",
          direction: "input",
          mediaType: "text",
          connectable: false,
        },
        {
          id: "frame",
          label: "Frame",
          direction: "input",
          mediaType: "image",
          connectable: false,
        },
        {
          id: "video",
          label: "Video",
          direction: "output",
          mediaType: "video",
          connectable: false,
        },
      ];
    case "voice":
      return [
        {
          id: "script",
          label: "Script",
          direction: "input",
          mediaType: "text",
          connectable: false,
        },
        {
          id: "voice",
          label: "Voice",
          direction: "output",
          mediaType: "audio",
          connectable: false,
        },
      ];
    case "agent":
      return [
        {
          id: "campaign",
          label: "Campaign",
          direction: "input",
          mediaType: "action",
          connectable: false,
        },
        {
          id: "action",
          label: "Action",
          direction: "output",
          mediaType: "action",
          connectable: false,
        },
      ];
    case "dm":
      return [
        {
          id: "trigger",
          label: "Trigger",
          direction: "input",
          mediaType: "text",
          connectable: false,
        },
        {
          id: "dm",
          label: "DM",
          direction: "output",
          mediaType: "text",
          connectable: false,
        },
      ];
    case "landing":
      return [
        {
          id: "offer",
          label: "Offer",
          direction: "input",
          mediaType: "text",
          connectable: false,
        },
        {
          id: "page",
          label: "Landing",
          direction: "output",
          mediaType: "web",
          connectable: false,
        },
      ];
    case "custom":
      return [
        {
          id: "input",
          label: "Input",
          direction: "input",
          mediaType: "action",
          connectable: false,
        },
        {
          id: "output",
          label: "Output",
          direction: "output",
          mediaType: "action",
          connectable: false,
        },
      ];
    case "image":
      return [];
  }
}

function resolveNonImageGenerationPortIcon(
  mediaType: NonImageGenerationNodePortMediaType,
) {
  switch (mediaType) {
    case "text":
      return Type;
    case "image":
      return ImageIcon;
    case "video":
      return Video;
    case "audio":
      return Volume2;
    case "web":
      return Globe2;
    case "action":
      return Plug;
  }
}

function resolveNonImageGenerationPrimaryIcon(kind: GenerationBlockKind) {
  switch (kind) {
    case "video":
      return Video;
    case "voice":
      return Volume2;
    case "agent":
      return Bot;
    case "dm":
      return MessageSquare;
    case "landing":
      return Globe2;
    case "custom":
      return Plug;
    case "text":
    case "llm":
    case "image":
      return Type;
  }
}

function nonImageGenerationNodeNeedsPrompt(kind: GenerationBlockKind) {
  switch (kind) {
    case "text":
    case "llm":
    case "video":
    case "voice":
      return true;
    case "agent":
    case "dm":
    case "landing":
    case "custom":
    case "image":
      return false;
  }
}

function resolveNonImageGenerationPromptPlaceholder(
  data: CreativeFlowNode["data"],
) {
  switch (data.kind) {
    case "text":
      return "Brief";
    case "llm":
    case "video":
      return "Prompt";
    case "voice":
      return "Script";
    case "agent":
    case "dm":
    case "landing":
    case "custom":
    case "image":
      return data.title;
  }
}

function resolveNonImageGenerationPromptValue(
  data: CreativeFlowNode["data"],
) {
  return typeof data.properties?.prompt === "string" ? data.properties.prompt : "";
}

function GenerationBlockNode({
  data,
  selected,
  onImageAspectRatioChange,
  onImageBatchCountChange,
  onImageModelChange,
  onImageInspectorOpen,
  onImageReferenceAttach,
  onImageReferenceRemove,
  onImageReferenceReorder,
  onImagePromptChange,
  onNonImagePromptChange,
  onVideoModelChange,
  onVideoDurationChange,
  onVideoResolutionChange,
  onRunImageGeneration,
  onRunVideoGeneration,
  campaignAssetReferences,
  campaignImageAssets,
  campaignVideoAssets,
}: NodeProps<CreativeFlowNode> & {
  onImageAspectRatioChange: (
    nodeId: string,
    aspectRatio: ImageGenerationAspectRatio,
  ) => void;
  onImageBatchCountChange: (nodeId: string, direction: -1 | 1) => void;
  onImageModelChange: (
    nodeId: string,
    selection: { providerId: ImageGenerationProviderId; modelSlug: string },
  ) => void;
  onImageInspectorOpen: (nodeId: string) => void;
  onImageReferenceAttach: (
    nodeId: string,
    referenceInput: ImageGenerationNodeReferenceInput,
  ) => void;
  onImageReferenceRemove: (
    nodeId: string,
    referenceInput:
      | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
      | Pick<ImageGenerationNodeReferenceInput, "id">,
  ) => void;
  onImageReferenceReorder: (
    nodeId: string,
    referenceInput:
      | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
      | Pick<ImageGenerationNodeReferenceInput, "id">,
    direction: "up" | "down",
  ) => void;
  onImagePromptChange: (nodeId: string, prompt: string) => void;
  onNonImagePromptChange: (nodeId: string, prompt: string) => void;
  onVideoModelChange: (
    nodeId: string,
    modelSlug: VideoGenerationModelSlug,
  ) => void;
  onVideoDurationChange: (nodeId: string, durationSeconds: number) => void;
  onVideoResolutionChange: (
    nodeId: string,
    resolution: VideoGenerationResolution,
  ) => void;
  onRunImageGeneration: (nodeId: string) => void;
  onRunVideoGeneration: (nodeId: string) => void;
  campaignAssetReferences: CampaignAssetSummary[];
  campaignImageAssets: CampaignAsset[];
  campaignVideoAssets: CampaignAsset[];
}) {
  const Icon = blockIcons[data.kind];
  const imageGeneration = isImageGenerationNodeProperties(data.properties)
    ? data.properties
    : null;

  if (imageGeneration) {
    const storedFrameWidth = imageGeneration.frame.width;
    const storedFrameHeight = imageGeneration.frame.height;
    const frameWidth = Math.min(
      IMAGE_GENERATION_COMPACT_FRAME_LIMITS.maxWidth,
      Math.max(
        IMAGE_GENERATION_COMPACT_FRAME_LIMITS.minWidth,
        storedFrameWidth,
      ),
    );
    const frameHeight = Math.min(
      IMAGE_GENERATION_COMPACT_FRAME_LIMITS.maxHeight,
      Math.max(
        IMAGE_GENERATION_COMPACT_FRAME_LIMITS.minHeight,
        storedFrameHeight,
      ),
    );

    return (
      <article
        className={cn(
          "generation-node",
          data.tone,
          "image-generation-node",
          selected && "selected",
        )}
        data-image-aspect-ratio={imageGeneration.aspectRatio}
        data-image-frame-height={imageGeneration.frame.height}
        data-image-frame-source={imageGeneration.frame.source}
        data-image-frame-width={imageGeneration.frame.width}
        style={{ width: frameWidth, height: frameHeight }}
      >
        <NodeResizer
          color="#1877f2"
          handleClassName="space-node-resize-handle"
          isVisible={selected}
          keepAspectRatio
          lineClassName="space-node-resize-line"
          maxHeight={IMAGE_GENERATION_COMPACT_FRAME_LIMITS.maxHeight}
          maxWidth={IMAGE_GENERATION_COMPACT_FRAME_LIMITS.maxWidth}
          minHeight={IMAGE_GENERATION_COMPACT_FRAME_LIMITS.minHeight}
          minWidth={IMAGE_GENERATION_COMPACT_FRAME_LIMITS.minWidth}
        />
        <FreepikReferenceImageNode
          details={imageGeneration}
          Icon={Icon}
          onAspectRatioChange={(aspectRatio) => {
            onImageAspectRatioChange(data.id, aspectRatio);
          }}
          onBatchCountChange={(direction) => {
            onImageBatchCountChange(data.id, direction);
          }}
          onModelChange={(selection) => {
            onImageModelChange(data.id, selection);
          }}
          onOpenInspector={() => {
            onImageInspectorOpen(data.id);
          }}
          onReferenceAttach={(referenceInput) => {
            onImageReferenceAttach(data.id, referenceInput);
          }}
          onReferenceRemove={(referenceInput) => {
            onImageReferenceRemove(data.id, referenceInput);
          }}
          onReferenceReorder={(referenceInput, direction) => {
            onImageReferenceReorder(data.id, referenceInput, direction);
          }}
          onPromptChange={(prompt) => {
            onImagePromptChange(data.id, prompt);
          }}
          onRunImageGeneration={() => onRunImageGeneration(data.id)}
          campaignAssetReferences={campaignAssetReferences}
          campaignImageAssets={campaignImageAssets}
          recentGeneratedAssetIds={imageGeneration.latestResultRefs.generatedAssetIds}
          sourceImageNodeId={data.id}
          selected={selected}
          tone={data.tone}
        />
      </article>
    );
  }

  return (
    <NonImageGenerationNodeShell
      data={data}
      Icon={Icon}
      onPromptChange={(prompt) => {
        onNonImagePromptChange(data.id, prompt);
      }}
      onVideoModelChange={(modelSlug) => {
        onVideoModelChange(data.id, modelSlug);
      }}
      onVideoDurationChange={(durationSeconds) => {
        onVideoDurationChange(data.id, durationSeconds);
      }}
      onVideoResolutionChange={(resolution) => {
        onVideoResolutionChange(data.id, resolution);
      }}
      onRunVideoGeneration={() => onRunVideoGeneration(data.id)}
      campaignImageAssets={campaignImageAssets}
      campaignVideoAssets={campaignVideoAssets}
      selected={selected}
    />
  );
}

function NonImageGenerationNodeShell({
  data,
  Icon,
  onPromptChange,
  onVideoModelChange,
  onVideoDurationChange,
  onVideoResolutionChange,
  onRunVideoGeneration,
  campaignImageAssets,
  campaignVideoAssets,
  selected,
}: {
  data: CreativeFlowNode["data"];
  Icon: ComponentType<{ className?: string }>;
  onPromptChange: (prompt: string) => void;
  onVideoModelChange: (modelSlug: VideoGenerationModelSlug) => void;
  onVideoDurationChange: (durationSeconds: number) => void;
  onVideoResolutionChange: (resolution: VideoGenerationResolution) => void;
  onRunVideoGeneration: () => void;
  campaignImageAssets: CampaignAsset[];
  campaignVideoAssets: CampaignAsset[];
  selected: boolean;
}) {
  const ports = resolveNonImageGenerationNodePorts(data.kind);
  const inputPorts = ports.filter((port) => port.direction === "input");
  const outputPorts = ports.filter((port) => port.direction === "output");
  const PrimaryIcon = resolveNonImageGenerationPrimaryIcon(data.kind);
  const needsPrompt = nonImageGenerationNodeNeedsPrompt(data.kind);
  const videoGeneration = isVideoGenerationNodeProperties(data.properties)
    ? data.properties
    : null;
  const promptPlaceholder = resolveNonImageGenerationPromptPlaceholder(data);
  const promptValue =
    videoGeneration === null
      ? resolveNonImageGenerationPromptValue(data)
      : videoGeneration.prompt;
  const videoModelOptions =
    videoGeneration === null
      ? []
      : resolveVideoGenerationModelPickerOptions({
          selectedModelSlug: videoGeneration.modelSlug,
          hasReferenceImage:
            videoGeneration.referenceImageUri !== null ||
            videoGeneration.referenceImageAssetId !== null ||
            videoGeneration.sourceOutputAssetId !== undefined,
        });
  const selectedGeneratedVideo =
    videoGeneration === null
      ? null
      : campaignVideoAssets.find(
          (asset) =>
            asset.id ===
            (videoGeneration.uiState.selectedResultAssetId ??
              videoGeneration.latestResultRefs.generatedAssetIds[0]),
        ) ?? null;
  const videoReferenceAsset =
    videoGeneration === null
      ? null
      : campaignImageAssets.find(
          (asset) =>
            asset.id ===
            (videoGeneration.referenceImageAssetId ??
              videoGeneration.sourceOutputAssetId),
        ) ?? null;
  const videoPosterUri =
    videoGeneration?.referenceImageUri?.trim() ||
    videoReferenceAsset?.outputLocations?.primaryUri?.trim() ||
    videoReferenceAsset?.uri.trim() ||
    undefined;
  const nodeFrame =
    data.kind === "video"
      ? VIDEO_GENERATION_NODE_FRAME
      : NON_IMAGE_GENERATION_NODE_FRAME;
  const shellClassName = cn(
    "space-image-node-shell",
    "space-generation-node-shell",
    selected && "selected",
  );

  return (
    <article
      className={cn(
        "generation-node",
        data.tone,
        "image-generation-node",
        "non-image-generation-node",
        selected && "selected",
      )}
      data-video-aspect-ratio={
        videoGeneration === null ? undefined : videoGeneration.aspectRatio
      }
      style={{
        width: nodeFrame.width,
        height: nodeFrame.height,
      }}
    >
      <div className={shellClassName} aria-label={`${data.title} node`}>
        <div className="space-image-node-label">
          <Icon className="size-3" />
          <span>{data.title}</span>
        </div>

        <div className="space-node-toolbar nodrag" aria-label="Node actions">
          <button
            type="button"
            aria-label={`Run ${data.title} node`}
            onClick={videoGeneration === null ? undefined : onRunVideoGeneration}
          >
            <Play className="size-4" fill="currentColor" />
          </button>
          <button type="button" aria-label="Action menu">⌄</button>
          <button type="button" aria-label="Connect node">
            <Link2 className="size-4" />
          </button>
          <button type="button" aria-label="Connection menu">⌄</button>
          <button type="button" aria-label="Delete node">
            <Trash2 className="size-4" />
          </button>
          <button type="button" aria-label="More actions">•••</button>
        </div>

        <div
          className={cn(
            "space-image-node-card",
            "space-generation-node-card",
            data.kind,
            !needsPrompt && "promptless",
          )}
        >
          {selectedGeneratedVideo === null ? null : (
            <figure
              className="space-generated-video-preview"
              data-generated-asset-id={selectedGeneratedVideo.id}
              aria-label={selectedGeneratedVideo.title}
            >
              <video
                src={selectedGeneratedVideo.uri}
                poster={videoPosterUri}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </figure>
          )}

          <GenerationNodePortStack ports={inputPorts} tone={data.tone} />

          <div
            className="space-generation-node-primary"
            aria-hidden="true"
            data-hidden={selectedGeneratedVideo !== null}
          >
            <PrimaryIcon className="size-8" />
          </div>

          {needsPrompt ? (
            <textarea
              className={cn(
                "space-node-prompt space-generation-node-prompt nodrag nowheel",
                selectedGeneratedVideo !== null && "over-image",
              )}
              aria-label={`${data.title} brief`}
              placeholder={promptPlaceholder}
              value={promptValue}
              onChange={(event) => onPromptChange(event.target.value)}
              rows={2}
            />
          ) : null}

          <div
            className="space-node-controls nodrag"
            aria-label={`${data.title} settings`}
          >
            {videoGeneration === null ? (
              <button
                className="space-control-chip model"
                type="button"
                aria-label={`${data.title} mode`}
              >
                <span>Draft</span>
                <em>⌄</em>
              </button>
            ) : (
              <>
                <label
                  className="space-control-chip model"
                  aria-label="Video model selector"
                >
                  <select
                    className="space-control-select"
                    value={videoGeneration.modelSlug}
                    onChange={(event) => {
                      onVideoModelChange(
                        event.currentTarget.value as VideoGenerationModelSlug,
                      );
                    }}
                    aria-label="Video model"
                  >
                    {videoModelOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        data-service-adapter-id={option.serviceAdapterId}
                        data-service-model-ref={option.serviceModelRef}
                        title={option.disabledReason ?? undefined}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <em>⌄</em>
                </label>
                <label
                  className="space-control-chip quality"
                  aria-label="Video duration selector"
                >
                  <select
                    className="space-control-select compact"
                    value={videoGeneration.durationSeconds}
                    onChange={(event) => {
                      onVideoDurationChange(Number(event.currentTarget.value));
                    }}
                    aria-label="Video duration"
                  >
                    {[2, 5, 10, 15].map((durationSeconds) => (
                      <option key={durationSeconds} value={durationSeconds}>
                        {durationSeconds}s
                      </option>
                    ))}
                  </select>
                  <em>⌄</em>
                </label>
                <label
                  className="space-control-chip quality"
                  aria-label="Video resolution selector"
                >
                  <select
                    className="space-control-select compact"
                    value={videoGeneration.resolution}
                    onChange={(event) => {
                      onVideoResolutionChange(
                        event.currentTarget.value as VideoGenerationResolution,
                      );
                    }}
                    aria-label="Video resolution"
                  >
                    {["480p", "720p", "1080p"].map((resolution) => (
                      <option key={resolution} value={resolution}>
                        {resolution}
                      </option>
                    ))}
                  </select>
                  <em>⌄</em>
                </label>
              </>
            )}
            <button
              className="space-control-chip icon"
              type="button"
              aria-label={`${data.title} setup`}
            >
              <Settings2 className="size-3" />
            </button>
          </div>

          <button
            className="space-run-button nodrag"
            type="button"
            aria-label={`Run ${data.title}`}
            onClick={videoGeneration === null ? undefined : onRunVideoGeneration}
          >
            <Play className="size-4" fill="currentColor" />
          </button>

          <GenerationNodePortStack ports={outputPorts} tone={data.tone} output />
        </div>
      </div>
    </article>
  );
}

function GenerationNodePortStack({
  ports,
  tone,
  output = false,
}: {
  ports: NonImageGenerationNodePort[];
  tone: GenerationBlockTone;
  output?: boolean;
}) {
  const stackClassName = output
    ? "space-side-port-stack output"
    : "space-side-port-stack";

  return (
    <div
      className={stackClassName}
      aria-label={output ? "Node output connections" : "Node input connections"}
    >
      {ports.map((port) => {
        const PortIcon = resolveNonImageGenerationPortIcon(port.mediaType);

        return (
          <div
            key={port.id}
            className={cn("space-side-port", `${port.mediaType}-port`)}
            aria-label={port.label}
            title={port.label}
          >
            <PortIcon className="size-3" />
            <Handle
              id={`${output ? "outputs" : "inputs"}.${port.id}`}
              type={output ? "source" : "target"}
              position={output ? Position.Right : Position.Left}
              className={cn("space-embedded-port-handle", `${tone}-handle`)}
              title={port.label}
              isConnectable={port.connectable}
            />
          </div>
        );
      })}
    </div>
  );
}

function FreepikReferenceImageNode({
  details,
  Icon,
  onAspectRatioChange,
  onBatchCountChange,
  onModelChange,
  onOpenInspector,
  onReferenceAttach,
  onReferenceRemove,
  onReferenceReorder,
  onPromptChange,
  onRunImageGeneration,
  campaignAssetReferences,
  campaignImageAssets,
  recentGeneratedAssetIds,
  selected,
  sourceImageNodeId,
  tone,
}: {
  details: ImageGenerationNodeProperties;
  Icon: ComponentType<{ className?: string }>;
  onAspectRatioChange: (aspectRatio: ImageGenerationAspectRatio) => void;
  onBatchCountChange: (direction: -1 | 1) => void;
  onModelChange: (
    selection: { providerId: ImageGenerationProviderId; modelSlug: string },
  ) => void;
  onOpenInspector: () => void;
  onReferenceAttach: (referenceInput: ImageGenerationNodeReferenceInput) => void;
  onReferenceRemove: (
    referenceInput:
      | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
      | Pick<ImageGenerationNodeReferenceInput, "id">,
  ) => void;
  onReferenceReorder: (
    referenceInput:
      | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
      | Pick<ImageGenerationNodeReferenceInput, "id">,
    direction: "up" | "down",
  ) => void;
  onPromptChange: (prompt: string) => void;
  onRunImageGeneration: () => void;
  campaignAssetReferences: CampaignAssetSummary[];
  campaignImageAssets: CampaignAsset[];
  recentGeneratedAssetIds: string[];
  selected: boolean;
  sourceImageNodeId: string;
  tone: GenerationBlockTone;
}) {
  const promptPort = details.inputs.find((port) => port.id === "prompt");
  const referencePort =
    details.inputs.find((port) => port.id === "reference_image" && port.dataType === "asset");
  const generatedPort = details.outputs.find(
    (port) => port.id === "generated_image_asset" && port.dataType === "asset",
  );
  const canOpenNextNodeMenu =
    details.uiState.outputConnectionReady &&
    details.uiState.selectedResultAssetId !== null;
  const selectedGeneratedAsset =
    details.uiState.selectedResultAssetId === null
      ? null
      : campaignImageAssets.find(
          (asset) =>
            asset.id === details.uiState.selectedResultAssetId &&
            asset.status !== "archived",
        ) ?? null;
  const selectedGeneratedAssetUri =
    selectedGeneratedAsset?.outputLocations?.primaryUri.trim() ||
    selectedGeneratedAsset?.uri.trim() ||
    "";
  const selectedGeneratedAssetPreview =
    selectedGeneratedAsset !== null && selectedGeneratedAssetUri !== ""
      ? {
          id: selectedGeneratedAsset.id,
          title: selectedGeneratedAsset.title,
          uri: selectedGeneratedAssetUri,
          altText:
            selectedGeneratedAsset.altText.trim() ||
            selectedGeneratedAsset.title,
        }
      : null;
  const referenceTrayVisible = selected || details.uiState.referenceTrayOpen;
  const modelCapability = resolveImageGenerationNodeModelCapability(details);
  const modelPickerOptions = resolveImageGenerationModelPickerOptions(details);
  const selectedModelValue = `${modelCapability?.provider.providerId ?? details.providerId}:${modelCapability?.model.slug ?? details.modelSlug}`;
  const [referenceUrlDraft, setReferenceUrlDraft] = useState("");
  const [referenceAttachmentMessage, setReferenceAttachmentMessage] = useState<
    string | null
  >(null);
  const [referenceAttachmentState, setReferenceAttachmentState] = useState<
    "idle" | "ready" | "invalid"
  >("idle");
  const [campaignAssetDraft, setCampaignAssetDraft] = useState("");
  const [recentOutputDraft, setRecentOutputDraft] = useState("");
  const referenceTrayAttachments =
    listImageGenerationReferenceTrayAttachments(details);
  const referenceTrayCapability =
    resolveImageGenerationReferenceTrayCapability(details);
  const referenceTrayEmptyState =
    resolveImageGenerationReferenceTrayEmptyState(details);
  const invalidReferenceAttachment =
    referenceTrayAttachments.find(
      (attachment) => attachment.validation.state === "error",
    ) ?? null;
  const referenceTrayValidationState =
    invalidReferenceAttachment === null ? referenceAttachmentState : "invalid";
  const referenceTrayValidationMessage =
    invalidReferenceAttachment?.validation.message ?? referenceAttachmentMessage;
  const aspectRatioSelectorOptions =
    resolveImageGenerationAspectRatioSelectorOptions(modelCapability);
  const defaultCampaignAssetId = campaignAssetReferences[0]?.id ?? "";
  const selectedCampaignAsset =
    campaignAssetReferences.find((asset) => asset.id === campaignAssetDraft) ??
    campaignAssetReferences[0] ??
    null;
  const selectedCampaignAssetId = selectedCampaignAsset?.id ?? defaultCampaignAssetId;
  const canAttachReference =
    referenceTrayCapability.canAddReferences &&
    referenceTrayCapability.acceptedTypes.includes("asset");
  const canAttachUrlReference =
    referenceTrayCapability.canAddReferences &&
    referenceTrayCapability.acceptedTypes.includes("url");
  const canAttachRecentReference =
    referenceTrayCapability.canAddReferences &&
    referenceTrayCapability.acceptedTypes.includes("recent_output");
  const referenceAddDisabledReason =
    referenceTrayCapability.addDisabledReason ??
    "This reference type is not supported by the selected model.";
  const canAttachCampaignAsset = selectedCampaignAsset !== null && canAttachReference;
  const defaultRecentGeneratedAssetId = recentGeneratedAssetIds[0] ?? "";
  const selectedRecentGeneratedAssetId = recentGeneratedAssetIds.includes(
    recentOutputDraft,
  )
    ? recentOutputDraft
    : defaultRecentGeneratedAssetId;
  const canAttachRecentGeneratedAsset =
    selectedRecentGeneratedAssetId !== "" && canAttachRecentReference;
  const cleanupStaleReferenceSelections = useCallback(() => {
    if (
      campaignAssetDraft !== "" &&
      !campaignAssetReferences.some((asset) => asset.id === campaignAssetDraft)
    ) {
      setCampaignAssetDraft("");
    }

    if (
      recentOutputDraft !== "" &&
      !recentGeneratedAssetIds.includes(recentOutputDraft)
    ) {
      setRecentOutputDraft("");
    }
  }, [
    campaignAssetDraft,
    campaignAssetReferences,
    recentGeneratedAssetIds,
    recentOutputDraft,
  ]);

  useEffect(() => {
    cleanupStaleReferenceSelections();
  }, [cleanupStaleReferenceSelections]);
  const handleAspectRatioChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onAspectRatioChange(event.currentTarget.value as ImageGenerationAspectRatio);
  };
  const handleModelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const parsedSelection = parseImageGenerationModelPickerValue(
      event.currentTarget.value,
    );

    if (parsedSelection === null) {
      return;
    }

    onModelChange(parsedSelection);
  };
  const applyReferenceAttachmentValidation = (
    validation: ReturnType<typeof validateImageGenerationReferenceAttachmentDraft>,
  ) => {
    setReferenceAttachmentState(validation.valid ? "ready" : "invalid");
    setReferenceAttachmentMessage(
      validation.valid ? "Reference image is ready to attach." : validation.message,
    );
  };
  const attachValidatedReference = (
    validation: ReturnType<typeof validateImageGenerationReferenceAttachmentDraft>,
    successMessage: string,
  ) => {
    if (!referenceTrayCapability.canAddReferences) {
      setReferenceAttachmentState("invalid");
      setReferenceAttachmentMessage(referenceAddDisabledReason);
      return;
    }

    applyReferenceAttachmentValidation(validation);

    if (!validation.valid || validation.referenceInput === null) {
      return;
    }

    onReferenceAttach(validation.referenceInput);
    setReferenceAttachmentState("ready");
    setReferenceAttachmentMessage(successMessage);
  };
  const handleReferenceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!canAttachReference) {
      setReferenceAttachmentState("invalid");
      setReferenceAttachmentMessage(referenceAddDisabledReason);
      event.currentTarget.value = "";
      return;
    }

    attachValidatedReference(
      validateImageGenerationReferenceAttachmentDraft(
        {
          kind: "file",
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
        modelCapability,
      ),
      "Uploaded reference attached.",
    );
    event.currentTarget.value = "";
  };
  const attachReferenceUrlDraft = () => {
    if (!canAttachUrlReference) {
      setReferenceAttachmentState("invalid");
      setReferenceAttachmentMessage(referenceAddDisabledReason);
      return;
    }

    attachValidatedReference(
      validateImageGenerationReferenceAttachmentDraft(
        {
          kind: "url",
          url: referenceUrlDraft,
        },
        modelCapability,
      ),
      "URL reference attached.",
    );
  };
  const handleReferenceUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setReferenceUrlDraft(event.currentTarget.value);

    if (referenceAttachmentState === "invalid") {
      setReferenceAttachmentState("idle");
      setReferenceAttachmentMessage(null);
    }
  };
  const handleReferenceUrlKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    attachReferenceUrlDraft();
  };
  const handleRecentOutputChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRecentOutputDraft(event.currentTarget.value);

    if (referenceAttachmentState === "invalid") {
      setReferenceAttachmentState("idle");
      setReferenceAttachmentMessage(null);
    }
  };
  const handleCampaignAssetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setCampaignAssetDraft(event.currentTarget.value);

    if (referenceAttachmentState === "invalid") {
      setReferenceAttachmentState("idle");
      setReferenceAttachmentMessage(null);
    }
  };
  const attachSelectedCampaignAsset = () => {
    if (selectedCampaignAsset === null || !canAttachReference) {
      if (!canAttachReference) {
        setReferenceAttachmentState("invalid");
        setReferenceAttachmentMessage(referenceAddDisabledReason);
      }
      return;
    }

    const validation = validateImageGenerationReferenceAttachmentDraft(
      {
        kind: "asset",
        assetId: selectedCampaignAsset.id,
        title: selectedCampaignAsset.title,
        mediaType: selectedCampaignAsset.mediaType,
      },
      modelCapability,
    );

    attachValidatedReference(validation, "Campaign asset attached as reference.");
  };
  const attachRecentGeneratedOutput = () => {
    if (!canAttachRecentReference) {
      setReferenceAttachmentState("invalid");
      setReferenceAttachmentMessage(referenceAddDisabledReason);
      return;
    }

    const validation = validateImageGenerationReferenceAttachmentDraft(
      {
        kind: "recent_output",
        assetId: selectedRecentGeneratedAssetId,
        sourceNodeId: sourceImageNodeId,
        outputPortId: "generated_image_asset",
      },
      modelCapability,
    );

    attachValidatedReference(validation, "Recent output attached as reference.");
  };
  const handleReferenceRemove = (
    referenceInput:
      | Pick<ImageGenerationNodeReferenceInput, "type" | "ref">
      | Pick<ImageGenerationNodeReferenceInput, "id">,
  ) => {
    onReferenceRemove(referenceInput);
    cleanupStaleReferenceSelections();
    setReferenceAttachmentState("idle");
    setReferenceAttachmentMessage(null);
  };

  return (
    <div
      className={cn("space-image-node-shell", selected && "selected")}
      aria-label="Image generator node"
    >
      <div className="space-image-node-label">
        <Icon className="size-3" />
        <span>이미지 생성기 #1</span>
      </div>

      <div className="space-node-toolbar nodrag" aria-label="Node actions">
        <button type="button" aria-label="Run image node" onClick={onRunImageGeneration}>
          <Play className="size-4" fill="currentColor" />
        </button>
        <button type="button" aria-label="Action menu">⌄</button>
        <button type="button" aria-label="Connect node"><Link2 className="size-4" /></button>
        <button type="button" aria-label="Connection menu">⌄</button>
        <button type="button" aria-label="Delete node"><Trash2 className="size-4" /></button>
        <button type="button" aria-label="More actions">•••</button>
      </div>

      <div className="space-image-node-card">
        {selectedGeneratedAssetPreview === null ? null : (
          <figure
            className="space-generated-image-preview"
            data-generated-asset-id={selectedGeneratedAssetPreview.id}
            aria-label={selectedGeneratedAssetPreview.title}
          >
            <img
              src={selectedGeneratedAssetPreview.uri}
              alt={selectedGeneratedAssetPreview.altText}
            />
          </figure>
        )}

        <div className="space-side-port-stack" aria-label="Image node input connections">
          <div
            className="space-side-port text-port prompt-input-affordance"
            aria-label={promptPort?.label ?? "Prompt text connection"}
            title={promptPort?.label ?? "Prompt text connection"}
          >
            <Type className="size-3" />
            {promptPort === undefined ? null : (
              <Handle
                id={`inputs.${promptPort.id}`}
                type="target"
                position={Position.Left}
                className={cn(
                  "space-embedded-port-handle",
                  "prompt-input-handle",
                  `${tone}-handle`,
                )}
                title={promptPort.label}
                isConnectable={false}
              />
            )}
          </div>
          {referencePort === undefined ? null : (
            <div
              className="space-side-port image-port"
              aria-label={referencePort.label}
              title={referencePort.label}
            >
              <ImageIcon className="size-3" />
              <Handle
                id={`inputs.${referencePort.id}`}
                type="target"
                position={Position.Left}
                className={cn(
                  "space-embedded-port-handle",
                  "reference-image-handle",
                  `${tone}-handle`,
                )}
                title={referencePort.label}
                isConnectable={false}
              />
            </div>
          )}
        </div>

        <textarea
          className={cn(
            "space-node-prompt nodrag nowheel",
            selectedGeneratedAssetPreview !== null && "over-image",
          )}
          aria-label="Prompt"
          placeholder="어떤 이미지를 생성하고 싶은지 설명해주세요..."
          value={details.prompt ?? ""}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={2}
        />

        <div className="space-node-controls nodrag" aria-label="Image generation settings">
          <div className="space-control-chip count" role="group" aria-label="Output count">
            <button
              className="space-count-stepper"
              type="button"
              aria-label="Decrease output count"
              onClick={() => onBatchCountChange(-1)}
              disabled={details.batchCount <= 1}
            >
              −
            </button>
            <strong>x{details.batchCount}</strong>
            <button
              className="space-count-stepper"
              type="button"
              aria-label="Increase output count"
              onClick={() => onBatchCountChange(1)}
              disabled={details.batchCount >= 10}
            >
              ＋
            </button>
          </div>
          <label className="space-control-chip model" aria-label="Model selector">
            <select
              className="space-control-select"
              value={selectedModelValue}
              onChange={handleModelChange}
              aria-label="Image model"
            >
              {modelPickerOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  data-service-adapter-id={option.serviceAdapterId}
                  data-service-model-ref={option.serviceModelRef}
                  title={option.disabledReason ?? undefined}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <em>⌄</em>
          </label>
          <label className="space-control-chip ratio" aria-label="Aspect ratio selector">
            <Maximize2 className="size-3" />
            <select
              className="space-control-select"
              value={details.aspectRatio}
              onChange={handleAspectRatioChange}
              aria-label="Output aspect ratio"
            >
              {aspectRatioSelectorOptions.map((option) => (
                <option
                  key={option.aspectRatio}
                  value={option.aspectRatio}
                  disabled={option.disabled}
                  data-provider-ratio={option.providerAspectRatio}
                  data-provider-ratio-availability={option.availability}
                  title={option.compatibilityMessage ?? undefined}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <em>⌄</em>
          </label>
          <button className="space-control-chip quality" type="button" aria-label="Resolution selector">
            <span>1K</span>
            <em>⌄</em>
          </button>
          <button
            className="space-control-chip icon"
            type="button"
            aria-label="Open image inspector and docs"
            aria-expanded={details.uiState.inspectorOpen || details.uiState.docsPanelOpen}
            data-inspector-trigger="image-generation"
            onClick={onOpenInspector}
          >
            <Settings2 className="size-3" />
          </button>
        </div>

        <button
          className="space-run-button nodrag"
          type="button"
          aria-label="Generate image"
          onClick={onRunImageGeneration}
        >
          <Play className="size-4" fill="currentColor" />
        </button>
        {generatedPort === undefined ? null : (
          <div
            className="space-side-port space-output-port"
            aria-label={generatedPort.label}
            title={generatedPort.label}
          >
            <ImageIcon className="size-3" />
            <Handle
              id={`outputs.${generatedPort.id}`}
              type="source"
              position={Position.Right}
              className={cn(
                "space-embedded-port-handle",
                "generated-output-handle",
                `${tone}-handle`,
              )}
              title={generatedPort.label}
              isConnectable={canOpenNextNodeMenu}
            />
          </div>
        )}
        <span className="space-node-resize-corner" aria-hidden="true" />
      </div>

      {referencePort === undefined || !referenceTrayVisible ? null : (
        <div
          className="space-reference-tray nodrag"
          aria-label="Reference attachments"
          data-validation-state={referenceTrayValidationState}
          data-reference-capability={referenceTrayCapability.state}
          data-reference-selection-state={
            invalidReferenceAttachment === null ? "valid" : "error"
          }
          data-reference-count={referenceTrayCapability.attachedReferenceCount}
          data-reference-max={referenceTrayCapability.maxReferenceCount}
        >
          <label
            className="space-reference-upload"
            aria-disabled={!canAttachReference}
            title={canAttachReference ? "Upload reference image" : referenceAddDisabledReason}
          >
            <Upload className="size-3" />
            <span>Upload</span>
            <input
              type="file"
              accept="image/*"
              aria-label="Upload reference image"
              aria-invalid={referenceAttachmentState === "invalid"}
              aria-describedby="image-reference-attachment-feedback"
              disabled={!canAttachReference}
              onChange={handleReferenceFileChange}
            />
          </label>
          <label
            className="space-reference-url"
            aria-disabled={!canAttachUrlReference}
            title={canAttachUrlReference ? "Attach reference image URL" : referenceAddDisabledReason}
          >
            <Link2 className="size-3" />
            <input
              type="url"
              placeholder="Paste image URL"
              aria-label="Attach reference image URL"
              value={referenceUrlDraft}
              aria-invalid={referenceAttachmentState === "invalid"}
              aria-describedby="image-reference-attachment-feedback"
              disabled={!canAttachUrlReference}
              onChange={handleReferenceUrlChange}
              onKeyDown={handleReferenceUrlKeyDown}
            />
            <button
              type="button"
              aria-label="Attach reference image URL"
              disabled={!canAttachUrlReference || referenceUrlDraft.trim() === ""}
              title={
                canAttachUrlReference ? "Attach reference image URL" : referenceAddDisabledReason
              }
              onClick={attachReferenceUrlDraft}
            >
              Attach
            </button>
          </label>
          <div className="space-reference-recent" aria-label="Recent generated assets">
            <ImageIcon className="size-3" />
            <select
              aria-label="Recent generated asset"
              value={selectedRecentGeneratedAssetId}
              aria-disabled={!canAttachRecentReference}
              disabled={!canAttachRecentReference || recentGeneratedAssetIds.length === 0}
              title={
                canAttachRecentReference ? "Recent generated asset" : referenceAddDisabledReason
              }
              onChange={handleRecentOutputChange}
            >
              {recentGeneratedAssetIds.length === 0 ? (
                <option value="">No recent outputs</option>
              ) : (
                recentGeneratedAssetIds.map((assetId, index) => (
                  <option key={assetId} value={assetId}>
                    {`Output ${index + 1}`}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              aria-label="Attach recent generated asset as reference"
              disabled={!canAttachRecentGeneratedAsset}
              title={
                canAttachRecentReference
                  ? "Attach recent generated asset as reference"
                  : referenceAddDisabledReason
              }
              onClick={attachRecentGeneratedOutput}
            >
              Attach
            </button>
          </div>
          <div className="space-reference-existing" aria-label="Campaign assets">
            <ImageIcon className="size-3" />
            <select
              aria-label="Selected campaign asset"
              value={selectedCampaignAssetId}
              aria-disabled={!canAttachReference}
              disabled={!canAttachReference || campaignAssetReferences.length === 0}
              title={
                canAttachReference ? "Selected campaign asset" : referenceAddDisabledReason
              }
              onChange={handleCampaignAssetChange}
            >
              {campaignAssetReferences.length === 0 ? (
                <option value="">No image assets</option>
              ) : (
                campaignAssetReferences.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              aria-label="Attach selected campaign asset as reference"
              disabled={!canAttachCampaignAsset}
              title={
                canAttachReference
                  ? "Attach selected campaign asset as reference"
                  : referenceAddDisabledReason
              }
              onClick={attachSelectedCampaignAsset}
            >
              Attach
            </button>
          </div>
          {referenceTrayAttachments.length === 0 && referenceTrayEmptyState !== null ? (
            <div className="space-reference-empty-state" aria-live="polite">
              <strong>{referenceTrayEmptyState.label}</strong>
              <span>{referenceTrayEmptyState.description}</span>
            </div>
          ) : (
            <div
              className="space-reference-attachment-list"
              aria-label="Attached reference images"
            >
              {referenceTrayAttachments.map((attachment) => (
                <ReferenceTrayAttachmentItem
                  key={attachment.id}
                  attachment={attachment}
                  canRemove={referenceTrayCapability.canRemoveReferences}
                  removeDisabledReason={referenceTrayCapability.removeDisabledReason}
                  onMoveDown={() => {
                    onReferenceReorder(
                      {
                        id: attachment.id,
                      },
                      "down",
                    );
                  }}
                  onMoveUp={() => {
                    onReferenceReorder(
                      {
                        id: attachment.id,
                      },
                      "up",
                    );
                  }}
                  onRemove={() => {
                    handleReferenceRemove({
                      id: attachment.id,
                    });
                  }}
                />
              ))}
            </div>
          )}
          {referenceTrayValidationMessage === null ? null : (
            <p
              id="image-reference-attachment-feedback"
              className="space-reference-attachment-feedback"
              role={referenceTrayValidationState === "invalid" ? "alert" : "status"}
            >
              {referenceTrayValidationMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReferenceTrayAttachmentItem({
  attachment,
  canRemove,
  removeDisabledReason,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  attachment: ImageGenerationReferenceTrayAttachment;
  canRemove: boolean;
  removeDisabledReason: string | null;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "space-reference-attachment",
        attachment.validation.state === "error" && "invalid",
      )}
      data-reference-order={attachment.insertionOrder}
      data-reference-source={attachment.source}
      data-reference-validation={attachment.validation.state}
      aria-invalid={attachment.validation.state === "error"}
      title={attachment.validation.message ?? undefined}
    >
      <div
        className="space-reference-preview"
        data-preview-state={attachment.preview.state}
        aria-label={attachment.preview.alt}
      >
        {attachment.preview.src === null ? (
          <ImageIcon className="size-3" />
        ) : (
          <img src={attachment.preview.src} alt={attachment.preview.alt} />
        )}
      </div>
      <div className="space-reference-copy">
        <strong>{attachment.label}</strong>
        <span>{attachment.detail}</span>
      </div>
      <div className="space-reference-order-controls" aria-label="Reference order controls">
        <button
          type="button"
          aria-label={attachment.reorder.moveUpAriaLabel}
          disabled={!attachment.reorder.canMoveUp}
          onClick={onMoveUp}
        >
          <ArrowUp className="size-3" />
        </button>
        <button
          type="button"
          aria-label={attachment.reorder.moveDownAriaLabel}
          disabled={!attachment.reorder.canMoveDown}
          onClick={onMoveDown}
        >
          <ArrowDown className="size-3" />
        </button>
      </div>
      <button
        type="button"
        aria-label={attachment.remove.ariaLabel}
        aria-disabled={!canRemove}
        disabled={!canRemove}
        title={removeDisabledReason ?? attachment.remove.ariaLabel}
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
