import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  type NodeProps,
} from "@xyflow/react";
import {
  ArrowLeft,
  Blocks,
  Box,
  Check,
  Clock3,
  Crop,
  Grid2X2,
  Hand,
  ImageIcon,
  List,
  MessageSquare,
  MousePointer2,
  Play,
  Plus,
  Redo2,
  Scissors,
  Sparkles,
  Split,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

import { cn } from "~/core/lib/cn";
import {
  createImageCandidateNode,
  initialWorkflowEdges,
  initialWorkflowNodes,
  type WorkflowFlowNode,
} from "~/features/workflow-canvas/model/workflow-canvas";

export function WorkflowCanvasScreen() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<WorkflowFlowNode>(initialWorkflowNodes);
  const [activeTool, setActiveTool] = useState("select");
  const visibleNodes = useMemo(() => nodes.length, [nodes.length]);

  const addRailNode = () => {
    setNodes((current) => [
      ...current,
      createImageCandidateNode(current.length),
    ]);
  };

  return (
    <main className="min-h-dvh bg-[#fbfaf7] text-[#171717]">
      <AppSidebar />
      <TopBar />
      <FloatingToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onAdd={addRailNode}
      />

      <section className="fixed inset-0 left-12 top-[53px]">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={initialWorkflowEdges}
            nodeTypes={workflowNodeTypes}
            onNodesChange={onNodesChange}
            fitView
            fitViewOptions={{ padding: 0.24 }}
            minZoom={0.45}
            maxZoom={1.35}
            nodesConnectable={false}
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
        <CanvasStatus visibleNodes={visibleNodes} />
      </section>
    </main>
  );
}

function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-12 flex-col items-center bg-[#11101a] text-white">
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
        >
          <Blocks className="size-4" />
        </button>
        <Clock3 className="size-4" />
      </nav>
      <div className="mb-4 grid size-10 place-items-center rounded-xl border border-white/16 bg-white/8">
        <Split className="size-4" />
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="fixed left-12 right-0 top-0 z-20 flex h-[53px] items-center justify-between border-b border-[#e6e1d7] bg-[#fbfaf7] px-7">
      <div className="flex min-w-0 items-center gap-4 text-sm font-semibold text-[#6f687a]">
        <ArrowLeft className="size-4" />
        <span>Templates</span>
        <span>/</span>
        <span className="max-w-[320px] truncate text-[#25212b]">
          OwnCanvas · Creator video lite
        </span>
        <span>/</span>
        <span>Workflow</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="topbar-button neutral" type="button">
          Save draft
        </button>
        <button className="topbar-button soft" type="button">
          Preview runtime
        </button>
        <button className="topbar-button primary" type="button">
          Publish
        </button>
      </div>
    </header>
  );
}

function FloatingToolbar({
  activeTool,
  onToolChange,
  onAdd,
}: {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onAdd: () => void;
}) {
  const tools = [
    { id: "select", icon: MousePointer2 },
    { id: "hand", icon: Hand },
    { id: "trash", icon: Trash2 },
    { id: "blocks", icon: Blocks },
    { id: "comment", icon: MessageSquare },
    { id: "undo", icon: Undo2 },
    { id: "redo", icon: Redo2 },
    { id: "split", icon: Split },
  ];

  return (
    <div className="fixed left-[76px] top-[66px] z-20 flex flex-col items-center gap-3">
      <button
        className="tool-plus"
        type="button"
        onClick={onAdd}
        aria-label="Add node"
      >
        <Plus className="size-5" />
      </button>
      <div className="rounded-full border border-[#ebe6dc] bg-white p-2 shadow-[0_18px_40px_rgba(42,31,18,0.08)]">
        <div className="flex flex-col items-center gap-2">
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
    </div>
  );
}

function CanvasStatus({ visibleNodes }: { visibleNodes: number }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-5 z-20 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm shadow-[0_14px_34px_rgba(40,32,20,0.08)]">
      <span className="font-semibold text-[#2f2937]">Draft v1</span>
      <span className="text-[#b6ad9e]">·</span>
      <span className="font-semibold text-[#6c6474]">Focus</span>
      <span className="text-[#6c6474]">Timed Segment Split</span>
      <span className="text-[#b6ad9e]">·</span>
      <span className="text-[#6c6474]">{visibleNodes} visible</span>
      <span className="text-[#b6ad9e]">·</span>
      <span className="text-[#6c6474]">84%</span>
    </div>
  );
}

function WorkflowNode(props: NodeProps<WorkflowFlowNode>) {
  if (props.data.kind === "segment_set") return <SegmentSetNode {...props} />;
  if (props.data.kind === "fill_properties") {
    return <FillPropertiesNode {...props} />;
  }
  if (props.data.kind === "property_rail") return <PropertyRailNode />;
  return <TimedSegmentNode {...props} />;
}

function TimedSegmentNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  return (
    <article className={cn("timed-node", selected && "selected")}>
      <p className="node-kicker">TIMING</p>
      <Handle
        type="target"
        position={Position.Left}
        className="canvas-handle text-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="canvas-handle action-handle"
      />

      <header className="flex items-start justify-between gap-4 border-b border-[#ece8df] px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="node-symbol blue">
            <Scissors className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-[#15131a]">
              {data.title}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#7d7485]">
              {data.subtitle}
            </p>
          </div>
        </div>
        <span className="state-pill">READY</span>
      </header>

      <div className="divide-y divide-[#ece8df]">
        <ContractRow
          label="INPUT"
          value="Text or TTS alignment"
          state="CONNECTABLE"
        />
        <ContractRow
          label="CUT SIZE"
          value="3s target · 12 reserved slots"
          state="CONFIGURED"
        />
        <ContractRow
          label="OUTPUT"
          value="Segment Set + slot fields"
          state="READY"
        />
        <ContractRow
          label="NEXT"
          value="Fill reference_ids and prompts"
          state="WAITING"
        />
      </div>

      <footer className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#6f687a]">
          <span>컷 길이</span>
          <button className="mini-select" type="button">
            3s
          </button>
          <span>슬롯</span>
          <button className="mini-select" type="button">
            12
          </button>
        </div>
        <button className="run-button" type="button">
          테스트 실행
        </button>
      </footer>
    </article>
  );
}

function ContractRow({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: string;
}) {
  return (
    <div className="grid h-[34px] grid-cols-[80px_1fr_auto] items-center gap-3 px-4 text-xs">
      <span className="font-bold tracking-[0.14em] text-[#aaa1b1]">
        {label}
      </span>
      <span className="truncate font-semibold text-[#24202a]">{value}</span>
      <span className="rounded-full bg-[#edf2fb] px-2 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[#6d7d9f]">
        {state}
      </span>
    </div>
  );
}

function SegmentSetNode({ data }: NodeProps<WorkflowFlowNode>) {
  return (
    <article className="segment-node">
      <Handle
        type="source"
        position={Position.Bottom}
        className="canvas-handle blue-handle"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-extrabold text-[#25212b]">
            {data.title}
          </h3>
          <p className="mt-1 max-w-[156px] truncate text-[10px] font-semibold text-[#6d6475]">
            {data.subtitle}
          </p>
        </div>
        <span className="rounded-full bg-[#dbeafe] px-2 py-1 text-[10px] font-extrabold text-[#3b82f6]">
          0/12
        </span>
      </div>
      <div className="mt-4 grid grid-cols-6 gap-2">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} className="slot-chip">
            {String(index + 1).padStart(2, "0")}
          </span>
        ))}
      </div>
    </article>
  );
}

function FillPropertiesNode({ data }: NodeProps<WorkflowFlowNode>) {
  return (
    <article className="fill-node">
      <Handle
        type="target"
        position={Position.Left}
        className="canvas-handle blue-handle"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="canvas-handle blue-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="canvas-handle blue-handle"
      />
      <span className="node-symbol small">
        <Blocks className="size-4" />
      </span>
      <div className="min-w-0">
        <h3 className="truncate text-xs font-extrabold text-[#25212b]">
          {data.title}
        </h3>
        <p className="mt-0.5 max-w-[118px] truncate text-[10px] font-semibold text-[#8a8191]">
          {data.subtitle}
        </p>
      </div>
    </article>
  );
}

function PropertyRailNode() {
  const rows = [
    { label: "길이", detail: "컷 시간", icon: List, tone: "blue" },
    { label: "레퍼런스", detail: "장면 매칭", icon: Blocks, tone: "blue" },
    { label: "이미지", detail: "생성 참조", icon: ImageIcon, tone: "violet" },
    { label: "장면", detail: "시각 방향", icon: Sparkles, tone: "green" },
    { label: "이미지", detail: "프롬프트", icon: Crop, tone: "green" },
    { label: "움직임", detail: "프롬프트", icon: Box, tone: "violet" },
  ];

  return (
    <article className="property-rail">
      <Handle
        type="target"
        position={Position.Left}
        className="canvas-handle blue-handle"
      />
      {rows.map((row) => (
        <div key={`${row.label}-${row.detail}`} className="property-row">
          <span className="rail-port" />
          <span className={`field-icon ${row.tone}`}>
            <row.icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <strong>{row.label}</strong>
            <small>{row.detail}</small>
          </span>
          <span className={`field-action ${row.tone}`}>
            {row.tone === "green" ? (
              <Type className="size-3" />
            ) : (
              <Check className="size-3" />
            )}
          </span>
        </div>
      ))}
    </article>
  );
}

const workflowNodeTypes = {
  workflow: WorkflowNode,
};
