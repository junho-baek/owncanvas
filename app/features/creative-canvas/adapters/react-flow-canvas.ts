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

export type CreativeFlowNode = Node<
  CampaignCanvasBlock & Record<string, unknown>
>;

export type CreativeFlowEdge = Edge<Record<string, unknown>>;

export type CreativeCanvasSnapshot = {
  nodes: CreativeFlowNode[];
  edges: CreativeFlowEdge[];
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
  return nodes.map((node) => ({
    ...node.data,
    id: node.id,
    position: node.position,
  }));
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
): CreativeFlowNode {
  return toFlowNode(createCampaignBlock(kind, index));
}

function toFlowNode(block: CampaignCanvasBlock): CreativeFlowNode {
  return {
    id: block.id,
    type: "generation",
    position: block.position,
    data: block,
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
