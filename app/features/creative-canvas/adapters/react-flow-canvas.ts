import { MarkerType, type Edge, type Node } from "@xyflow/react";

import {
  createCampaignBlock,
  initialCampaignBlocks,
  initialCampaignEdges,
  type CampaignCanvasBlock,
  type CampaignCanvasEdge,
  type GenerationBlockKind,
} from "~/features/creative-canvas/model/creative-canvas";

export type CreativeFlowNode = Node<
  CampaignCanvasBlock & Record<string, unknown>
>;

export type CreativeFlowEdge = Edge<Record<string, unknown>>;

export const initialCreativeFlowNodes = initialCampaignBlocks.map(toFlowNode);

export const initialCreativeFlowEdges = initialCampaignEdges.map(toFlowEdge);

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
    target: edge.target,
    type: "smoothstep",
    label: edge.label,
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
