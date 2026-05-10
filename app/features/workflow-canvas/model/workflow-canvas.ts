import { MarkerType, type Edge, type Node } from "@xyflow/react";

export type WorkflowNodeKind =
  | "timed_segment_split"
  | "segment_set"
  | "fill_properties"
  | "property_rail";

export type WorkflowNodeData = {
  kind: WorkflowNodeKind;
  title: string;
  subtitle: string;
};

export type WorkflowFlowNode = Node<WorkflowNodeData & Record<string, unknown>>;
export type WorkflowFlowEdge = Edge<Record<string, unknown>>;

export const initialWorkflowNodes = [
  {
    id: "timed_segment_split",
    type: "workflow",
    position: { x: 320, y: 340 },
    data: {
      kind: "timed_segment_split",
      title: "Timed Segment Split",
      subtitle: "3s 기준",
    },
  },
  {
    id: "segment_set",
    type: "workflow",
    position: { x: 872, y: 210 },
    data: {
      kind: "segment_set",
      title: "Segment Set",
      subtitle: "12 expected · 12 reserved segment slots",
    },
  },
  {
    id: "fill_properties",
    type: "workflow",
    position: { x: 900, y: 360 },
    data: {
      kind: "fill_properties",
      title: "Fill properties",
      subtitle: "fills reference_ids · visual prompts",
    },
  },
  {
    id: "property_rail",
    type: "workflow",
    position: { x: 1136, y: 210 },
    data: {
      kind: "property_rail",
      title: "Segment fields",
      subtitle: "길이 · 레퍼런스 · 이미지 · 장면 · 움직임",
    },
  },
] satisfies WorkflowFlowNode[];

export const initialWorkflowEdges = [
  workflowEdge("timed_segment_split", "fill_properties", "cut-fields"),
  workflowEdge("segment_set", "fill_properties", "slots"),
  workflowEdge("fill_properties", "property_rail", "properties"),
] satisfies WorkflowFlowEdge[];

export function createImageCandidateNode(index: number): WorkflowFlowNode {
  return {
    id: `image_generation_${index}`,
    type: "workflow",
    position: { x: 1136, y: 540 + index * 10 },
    data: {
      kind: "fill_properties",
      title: "Image candidates",
      subtitle: "parallel draft generation",
    },
  };
}

function workflowEdge(
  source: string,
  target: string,
  label: string,
): WorkflowFlowEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    label,
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

