import { MarkerType, type Edge, type Node } from "@xyflow/react";

import {
  createCampaignCanvasEdit,
  createCampaignBlock,
  initialCampaignBlocks,
  initialCampaignEdges,
  parseCampaignSpecJsonEdit,
  type CampaignDraft,
  type CampaignCanvasBlock,
  type CampaignCanvasEdge,
  type CampaignSpecJsonEditOptions,
  type CampaignSpecJsonEditValidationError,
  type GenerationBlockKind,
} from "../model/creative-canvas.ts";
import {
  attachImageGenerationNodeReferenceTransition,
  createImageGenerationReferenceAttachmentId,
  createImageGenerationFrame,
  createImageGenerationNodeProperties,
  type ImageGenerationNodeProperties,
  type ImageGenerationNodeReferenceInput,
  type ImageGenerationOutputNextNodeActionKind,
  isImageGenerationNodeProperties,
  resizeImageGenerationNodeFrameTransition,
  resolveImageGenerationNodeModelCapability,
  resolveImageGenerationOutputNextNodeMapping,
  validateImageGenerationReferenceAttachmentDraft,
} from "../model/image-generation-node.ts";

export type CreativeFlowNode = Node<
  CampaignCanvasBlock & Record<string, unknown>
>;

export type CreativeFlowEdge = Edge<Record<string, unknown>>;

export type CreativeCanvasSnapshot = {
  nodes: CreativeFlowNode[];
  edges: CreativeFlowEdge[];
};

export const imageOutputNextNodeActionTargetPorts = {
  "image-edit": resolveImageGenerationOutputNextNodeMapping("image-edit")
    .targetInputPort,
  "style-variant": resolveImageGenerationOutputNextNodeMapping("style-variant")
    .targetInputPort,
  upscale: resolveImageGenerationOutputNextNodeMapping("upscale")
    .targetInputPort,
  video: resolveImageGenerationOutputNextNodeMapping("video").targetInputPort,
  "output-card": resolveImageGenerationOutputNextNodeMapping("output-card")
    .targetInputPort,
  "landing-asset": resolveImageGenerationOutputNextNodeMapping("landing-asset")
    .targetInputPort,
} satisfies Record<ImageGenerationOutputNextNodeActionKind, string>;

export const imageOutputNextNodeActionEdgeLabels = {
  "image-edit": resolveImageGenerationOutputNextNodeMapping("image-edit")
    .edgeLabel,
  "style-variant": resolveImageGenerationOutputNextNodeMapping("style-variant")
    .edgeLabel,
  upscale: resolveImageGenerationOutputNextNodeMapping("upscale").edgeLabel,
  video: resolveImageGenerationOutputNextNodeMapping("video").edgeLabel,
  "output-card": resolveImageGenerationOutputNextNodeMapping("output-card")
    .edgeLabel,
  "landing-asset": resolveImageGenerationOutputNextNodeMapping("landing-asset")
    .edgeLabel,
} satisfies Record<ImageGenerationOutputNextNodeActionKind, string>;

export type ImageOutputNextNodeActionCanvasResult = {
  nodes: CreativeFlowNode[];
  edges: CreativeFlowEdge[];
  createdNode: CreativeFlowNode | null;
};

export type CreativeCanvasSpecJsonSyncOptions =
  CampaignSpecJsonEditOptions & {
    lastValidCanvasSnapshot?: CreativeCanvasSnapshot;
  };

export type CreativeCanvasSpecJsonSyncResult =
  | {
      valid: true;
      campaign: CampaignDraft;
      nodes: CreativeFlowNode[];
      edges: CreativeFlowEdge[];
      errors: [];
    }
  | {
      valid: false;
      campaign: CampaignDraft;
      nodes: CreativeFlowNode[];
      edges: CreativeFlowEdge[];
      errors: CampaignSpecJsonEditValidationError[];
    };

export const initialCreativeFlowNodes = initialCampaignBlocks.map(toFlowNode);

export const initialCreativeFlowEdges = initialCampaignEdges.map(toFlowEdge);

export function toCreativeCanvasSnapshot(
  campaign: Pick<CampaignDraft, "canvasState">,
): CreativeCanvasSnapshot {
  return {
    nodes: toCreativeFlowNodes(campaign.canvasState.nodes),
    edges: toCreativeFlowEdges(campaign.canvasState.edges),
  };
}

export function createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
  campaign: CampaignDraft,
  serializedCampaignSpec: string,
  options: CreativeCanvasSpecJsonSyncOptions = {},
): CreativeCanvasSpecJsonSyncResult {
  const { lastValidCanvasSnapshot, ...parseOptions } = options;
  const result = parseCampaignSpecJsonEdit(
    campaign,
    serializedCampaignSpec,
    parseOptions,
  );

  if (!result.valid) {
    return {
      ...result,
      ...(lastValidCanvasSnapshot ?? toCreativeCanvasSnapshot(campaign)),
    };
  }

  return {
    ...result,
    ...toCreativeCanvasSnapshot(result.campaign),
  };
}

export function syncCampaignFromCreativeCanvasInteraction(
  campaign: CampaignDraft,
  nodes: CreativeFlowNode[],
  edges: CreativeFlowEdge[],
): CampaignDraft {
  return createCampaignCanvasEdit(campaign, {
    nodes: toCampaignCanvasBlocks(nodes),
    edges: toCampaignCanvasEdges(edges),
  });
}

export function applyImageOutputNextNodeActionToCanvas(input: {
  nodes: CreativeFlowNode[];
  edges: CreativeFlowEdge[];
  sourceNodeId: string;
  actionKind: ImageGenerationOutputNextNodeActionKind;
  selectedResultAssetId: string;
}): ImageOutputNextNodeActionCanvasResult {
  const sourceNode = input.nodes.find((node) => node.id === input.sourceNodeId);

  if (sourceNode === undefined) {
    return {
      nodes: input.nodes,
      edges: input.edges,
      createdNode: null,
    };
  }

  const mapping = resolveImageGenerationOutputNextNodeMapping(input.actionKind);
  const targetKind = mapping.targetNodeKind;
  const existingTarget = findExistingImageOutputNextNodeTarget({
    nodes: input.nodes,
    edges: input.edges,
    sourceNodeId: sourceNode.id,
    actionKind: input.actionKind,
  });

  if (existingTarget !== null) {
    const configuredNode = applyImageOutputNextNodeSettingsToFlowNode({
      node: existingTarget.node,
      sourceNode,
      actionKind: input.actionKind,
      selectedResultAssetId: input.selectedResultAssetId,
    });
    const selectedConfiguredNode = { ...configuredNode, selected: true };
    const nextNodes = input.nodes.map((node) =>
      node.id === existingTarget.node.id
        ? selectedConfiguredNode
        : { ...node, selected: false },
    );
    const nextEdges = input.edges.map((edge) =>
      edge.id === existingTarget.edge.id
        ? createImageOutputNextNodeEdge({
            edgeId: edge.id,
            sourceNodeId: sourceNode.id,
            targetNodeId: existingTarget.node.id,
            actionKind: input.actionKind,
            selectedResultAssetId: input.selectedResultAssetId,
          })
        : edge,
    );

    return {
      nodes: nextNodes,
      edges: nextEdges,
      createdNode: selectedConfiguredNode,
    };
  }

  const nextIndex = findNextImageOutputNodeIndex(
    input.nodes,
    input.actionKind === "output-card" ? "output_card" : `${targetKind}_block`,
  );
  const createdNode =
    input.actionKind === "output-card"
      ? createImageOutputResultCardFlowNode({
          index: nextIndex,
        sourceNode,
        selectedResultAssetId: input.selectedResultAssetId,
      })
      : createImageOutputGenerationFlowNode({
          kind: targetKind,
          index: nextIndex,
          sourceNode,
          actionKind: input.actionKind,
          selectedResultAssetId: input.selectedResultAssetId,
        });
  const configuredNode = applyImageOutputNextNodeSettingsToFlowNode({
    node: createdNode,
    sourceNode,
    actionKind: input.actionKind,
    selectedResultAssetId: input.selectedResultAssetId,
  });
  const selectedCreatedNode = { ...configuredNode, selected: true };
  const nextNodes = [
    ...input.nodes.map((node) => ({ ...node, selected: false })),
    selectedCreatedNode,
  ];
  const nextEdges = [
    ...input.edges,
    createImageOutputNextNodeEdge({
      edgeId: `edge_${sourceNode.id}_${createdNode.id}_${input.actionKind}`,
      sourceNodeId: sourceNode.id,
      targetNodeId: createdNode.id,
      actionKind: input.actionKind,
      selectedResultAssetId: input.selectedResultAssetId,
    }),
  ];

  return {
    nodes: nextNodes,
    edges: nextEdges,
    createdNode: selectedCreatedNode,
  };
}

export function toCreativeFlowNodes(
  blocks: CampaignCanvasBlock[],
): CreativeFlowNode[] {
  return blocks.map(toFlowNode);
}

export function toCreativeFlowEdges(
  edges: CampaignCanvasEdge[],
): CreativeFlowEdge[] {
  return edges.map(toFlowEdge);
}

export function toCampaignCanvasBlocks(
  nodes: CreativeFlowNode[],
): CampaignCanvasBlock[] {
  return nodes.map((node) => {
    const data = node.data;
    let properties = data.properties;

    if (isImageGenerationNodeProperties(data.properties)) {
      const frameWidth = node.width ?? data.properties.frame.width;
      const frameHeight = node.height ?? data.properties.frame.height;
      const frameMatchesStoredSize =
        frameWidth === data.properties.frame.width &&
        frameHeight === data.properties.frame.height;

      properties = frameMatchesStoredSize
        ? data.properties
        : resizeImageGenerationNodeFrameTransition(data.properties, {
            width: frameWidth,
            height: frameHeight,
          });
    }

    return {
      ...data,
      id: node.id,
      position: node.position,
      ...(properties === undefined ? {} : { properties }),
    };
  });
}

export function toCampaignCanvasEdges(
  edges: CreativeFlowEdge[],
): CampaignCanvasEdge[] {
  return edges.map((edge) => {
    const edgeData = isRecord(edge.data) ? edge.data : {};

    return {
      id: edge.id,
      source: edge.source,
      ...(typeof edge.sourceHandle === "string" &&
      edge.sourceHandle.trim() !== ""
        ? { sourcePort: edge.sourceHandle }
        : {}),
      target: edge.target,
      ...(typeof edge.targetHandle === "string" &&
      edge.targetHandle.trim() !== ""
        ? { targetPort: edge.targetHandle }
        : {}),
      ...(typeof edgeData.edgeType === "string" &&
      edgeData.edgeType.trim() !== ""
        ? { type: edgeData.edgeType }
        : {}),
      label: typeof edge.label === "string" ? edge.label : "",
      ...(isRecord(edgeData.properties)
        ? { properties: edgeData.properties }
        : {}),
    };
  });
}

export function createGenerationFlowNode(
  kind: GenerationBlockKind,
  index: number,
  position?: CampaignCanvasBlock["position"],
): CreativeFlowNode {
  const defaultPosition =
    kind === "image"
      ? { x: 220, y: 140 + Math.max(index - 1, 0) * 40 }
      : undefined;

  return toFlowNode(createCampaignBlock(kind, index, position ?? defaultPosition));
}

function createImageOutputGenerationFlowNode({
  kind,
  index,
  sourceNode,
  actionKind,
  selectedResultAssetId,
}: {
  kind: GenerationBlockKind;
  index: number;
  sourceNode: CreativeFlowNode;
  actionKind: ImageGenerationOutputNextNodeActionKind;
  selectedResultAssetId: string;
}): CreativeFlowNode {
  const mapping = resolveImageGenerationOutputNextNodeMapping(actionKind);
  const createdNode = createGenerationFlowNode(
    kind,
    index,
    createImageOutputNextNodePosition(sourceNode, actionKind),
  );
  const createdProperties = prepareImageOutputNextNodeProperties(
    createdNode.data.properties,
    actionKind,
  );

  return {
    ...createdNode,
    data: {
      ...createdNode.data,
      title: mapping.defaultConfig.nodeTitle,
      subtitle: mapping.defaultConfig.nodeSubtitle,
      description: mapping.defaultConfig.nodeDescription,
      status: mapping.defaultConfig.nodeStatus,
      properties: {
        ...(createdProperties ?? {}),
        sourceImageNodeId: sourceNode.id,
        sourceOutputAssetId: selectedResultAssetId,
        nextNodeActionKind: actionKind,
        nextNodeDefaultConfig: { ...mapping.defaultConfig },
        selectedOutputPayloadFields: [...mapping.selectedOutputPayloadFields],
      },
    },
  };
}

function createImageOutputResultCardFlowNode({
  index,
  sourceNode,
  selectedResultAssetId,
}: {
  index: number;
  sourceNode: CreativeFlowNode;
  selectedResultAssetId: string;
}): CreativeFlowNode {
  const id = `output_card_${index + 1}`;
  const mapping = resolveImageGenerationOutputNextNodeMapping("output-card");

  return {
    id,
    type: "generation",
    position: createImageOutputNextNodePosition(sourceNode, "output-card"),
    data: {
      id,
      kind: "custom",
      type: "custom",
      title: mapping.defaultConfig.nodeTitle,
      subtitle: mapping.defaultConfig.nodeSubtitle,
      description: mapping.defaultConfig.nodeDescription,
      tone: "ink",
      status: mapping.defaultConfig.nodeStatus,
      contracts: [
        { label: "INPUT", value: "Generated image output", state: "READY" },
        { label: "ASSET", value: selectedResultAssetId, state: "READY" },
        { label: "OUTPUT", value: "Reusable Creative Output", state: "READY" },
      ],
      position: createImageOutputNextNodePosition(sourceNode, "output-card"),
      properties: {
        sourceImageNodeId: sourceNode.id,
        sourceOutputAssetId: selectedResultAssetId,
        nextNodeActionKind: "output-card",
        nextNodeDefaultConfig: { ...mapping.defaultConfig },
        selectedOutputPayloadFields: [...mapping.selectedOutputPayloadFields],
      },
    },
  };
}

function findExistingImageOutputNextNodeTarget(input: {
  nodes: CreativeFlowNode[];
  edges: CreativeFlowEdge[];
  sourceNodeId: string;
  actionKind: ImageGenerationOutputNextNodeActionKind;
}): { node: CreativeFlowNode; edge: CreativeFlowEdge } | null {
  const matchingEdge = input.edges.find((edge) => {
    const edgeProperties = isRecord(edge.data)
      ? isRecord(edge.data.properties)
        ? edge.data.properties
        : null
      : null;

    return (
      edge.source === input.sourceNodeId &&
      edgeProperties?.actionKind === input.actionKind
    );
  });

  if (matchingEdge === undefined) {
    return null;
  }

  const targetNode =
    input.nodes.find((node) => node.id === matchingEdge.target) ?? null;

  return targetNode === null ? null : { node: targetNode, edge: matchingEdge };
}

function applyImageOutputNextNodeSettingsToFlowNode(input: {
  node: CreativeFlowNode;
  sourceNode: CreativeFlowNode;
  actionKind: ImageGenerationOutputNextNodeActionKind;
  selectedResultAssetId: string;
}): CreativeFlowNode {
  const mapping = resolveImageGenerationOutputNextNodeMapping(input.actionKind);
  const existingProperties = prepareImageOutputNextNodeProperties(
    input.node.data.properties,
    input.actionKind,
  );
  const nextProperties = {
    ...(isRecord(existingProperties) ? existingProperties : {}),
    sourceImageNodeId: input.sourceNode.id,
    sourceOutputAssetId: input.selectedResultAssetId,
    nextNodeActionKind: input.actionKind,
    nextNodeDefaultConfig: { ...mapping.defaultConfig },
    selectedOutputPayloadFields: [...mapping.selectedOutputPayloadFields],
  };

  return {
    ...input.node,
    data: {
      ...input.node.data,
      title: mapping.defaultConfig.nodeTitle,
      subtitle: mapping.defaultConfig.nodeSubtitle,
      description: mapping.defaultConfig.nodeDescription,
      status: mapping.defaultConfig.nodeStatus,
      properties: applyImageOutputReferenceSettings({
        properties: nextProperties,
        sourceNodeId: input.sourceNode.id,
        actionKind: input.actionKind,
        selectedResultAssetId: input.selectedResultAssetId,
      }),
    },
  };
}

function prepareImageOutputNextNodeProperties(
  properties: unknown,
  actionKind: ImageGenerationOutputNextNodeActionKind,
) {
  if (
    !["image-edit", "style-variant", "upscale"].includes(actionKind) ||
    !isImageGenerationNodeProperties(properties)
  ) {
    return properties;
  }

  const capability = resolveImageGenerationNodeModelCapability(properties);

  if (capability?.referenceSupport.supported) {
    return properties;
  }

  return createImageGenerationNodeProperties({
    batchCount: properties.batchCount,
    aspectRatio: properties.aspectRatio,
    frame: properties.frame,
    referenceImages: properties.referenceImages,
    providerPresets: properties.providerPresets,
    latestResultRefs: properties.latestResultRefs,
    uiState: properties.uiState,
  });
}

function applyImageOutputReferenceSettings(input: {
  properties: Record<string, unknown>;
  sourceNodeId: string;
  actionKind: ImageGenerationOutputNextNodeActionKind;
  selectedResultAssetId: string;
}): Record<string, unknown> {
  if (
    !["image-edit", "style-variant", "upscale"].includes(input.actionKind) ||
    !isImageGenerationNodeProperties(input.properties)
  ) {
    return input.properties;
  }

  const capability = resolveImageGenerationNodeModelCapability(input.properties);
  const validation = validateImageGenerationReferenceAttachmentDraft(
    {
      kind: "recent_output",
      assetId: input.selectedResultAssetId,
      sourceNodeId: input.sourceNodeId,
      outputPortId: "generated_image_asset",
    },
    capability,
  );

  if (!validation.valid || validation.referenceInput === null) {
    return input.properties;
  }

  return attachImageGenerationNodeReferenceTransition(
    input.properties,
    validation.referenceInput,
  );
}

function createImageOutputNextNodeEdge(input: {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  actionKind: ImageGenerationOutputNextNodeActionKind;
  selectedResultAssetId: string;
}): CreativeFlowEdge {
  const mapping = resolveImageGenerationOutputNextNodeMapping(input.actionKind);

  return {
    id: input.edgeId,
    source: input.sourceNodeId,
    sourceHandle: "outputs.generated_image_asset",
    target: input.targetNodeId,
    targetHandle: mapping.targetInputPort,
    type: "smoothstep",
    label: mapping.edgeLabel,
    data: {
      edgeType: "asset-generation",
      properties: {
        actionKind: input.actionKind,
        connectionPurpose: mapping.defaultConfig.connectionPurpose,
        selectedResultAssetId: input.selectedResultAssetId,
      },
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: "#93c5fd",
    },
    style: {
      stroke: "#93c5fd",
      strokeWidth: 2,
    },
    labelStyle: {
      fill: "#6b7280",
      fontSize: 10,
      fontWeight: 700,
    },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 999,
    labelBgStyle: {
      fill: "#ffffff",
      fillOpacity: 0.92,
    },
  };
}

function createImageOutputNextNodePosition(
  sourceNode: CreativeFlowNode,
  actionKind: ImageGenerationOutputNextNodeActionKind,
) {
  const offsetIndex = [
    "image-edit",
    "style-variant",
    "upscale",
    "video",
    "output-card",
    "landing-asset",
  ].indexOf(actionKind);

  return {
    x: sourceNode.position.x + (sourceNode.width ?? 360) + 180,
    y: sourceNode.position.y + Math.max(offsetIndex, 0) * 44,
  };
}

function findNextImageOutputNodeIndex(
  nodes: CreativeFlowNode[],
  idPrefix: string,
): number {
  const existingNodeIds = new Set(nodes.map((node) => node.id));
  let nextIndex = nodes.length;

  while (existingNodeIds.has(`${idPrefix}_${nextIndex + 1}`)) {
    nextIndex += 1;
  }

  return nextIndex;
}

function toFlowNode(block: CampaignCanvasBlock): CreativeFlowNode {
  const properties = block.properties;
  const frame = isImageGenerationNodeProperties(properties)
    ? properties.frame ?? createImageGenerationFrame(properties.aspectRatio)
    : null;

  return {
    id: block.id,
    type: "generation",
    position: block.position,
    data: block,
    ...(frame === null ? {} : { width: frame.width, height: frame.height }),
  };
}

function toFlowEdge(edge: CampaignCanvasEdge): CreativeFlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    ...(edge.sourcePort === undefined ? {} : { sourceHandle: edge.sourcePort }),
    target: edge.target,
    ...(edge.targetPort === undefined ? {} : { targetHandle: edge.targetPort }),
    type: "smoothstep",
    label: edge.label,
    data: {
      ...(edge.type === undefined ? {} : { edgeType: edge.type }),
      ...(edge.properties === undefined ? {} : { properties: edge.properties }),
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: "#93c5fd",
    },
    style: {
      stroke: "#93c5fd",
      strokeWidth: 2,
    },
    labelStyle: {
      fill: "#6b7280",
      fontSize: 10,
      fontWeight: 700,
    },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 999,
    labelBgStyle: {
      fill: "#ffffff",
      fillOpacity: 0.92,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
