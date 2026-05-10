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
  Clock3,
  Grid2X2,
  Hand,
  ImageIcon,
  MessageSquare,
  Mic2,
  MousePointer2,
  Play,
  Redo2,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Video,
} from "lucide-react";

import { cn } from "~/core/lib/cn";
import {
  createGenerationFlowNode,
  initialCreativeFlowEdges,
  initialCreativeFlowNodes,
  type CreativeFlowNode,
} from "~/features/creative-canvas/adapters/react-flow-canvas";
import {
  generationPalette,
  type GenerationBlockKind,
  type GenerationBlockTone,
} from "~/features/creative-canvas/model/creative-canvas";

const blockIcons = {
  text: Type,
  image: ImageIcon,
  video: Video,
  voice: Mic2,
} satisfies Record<GenerationBlockKind, typeof Type>;

export function CreativeCanvasScreen() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<CreativeFlowNode>(initialCreativeFlowNodes);
  const [activeTool, setActiveTool] = useState("select");
  const visibleBlocks = useMemo(() => nodes.length, [nodes.length]);

  const addGenerationBlock = (kind: GenerationBlockKind) => {
    setNodes((current) => [
      ...current,
      createGenerationFlowNode(kind, current.length),
    ]);
  };

  return (
    <main className="min-h-dvh bg-[#fbfaf7] text-[#171717]">
      <AppSidebar />
      <TopBar />
      <FloatingToolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <GenerationPalette onAddBlock={addGenerationBlock} />

      <section className="fixed inset-0 left-12 top-[53px]">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={initialCreativeFlowEdges}
            nodeTypes={creativeNodeTypes}
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
        <CanvasStatus visibleBlocks={visibleBlocks} />
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

function TopBar() {
  return (
    <header className="fixed left-12 right-0 top-0 z-20 flex h-[53px] items-center justify-between border-b border-[#e6e1d7] bg-[#fbfaf7] px-7">
      <div className="flex min-w-0 items-center gap-4 text-sm font-semibold text-[#6f687a]">
        <ArrowLeft className="size-4" />
        <span>Campaigns</span>
        <span>/</span>
        <span className="max-w-[320px] truncate text-[#25212b]">
          OwnCanvas · Launch creative pack
        </span>
        <span>/</span>
        <span>Canvas</span>
      </div>
      <div className="flex items-center gap-2">
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
    <div className="fixed left-[76px] top-[66px] z-20 rounded-full border border-[#ebe6dc] bg-white p-2 shadow-[0_18px_40px_rgba(42,31,18,0.08)]">
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
  );
}

function GenerationPalette({
  onAddBlock,
}: {
  onAddBlock: (kind: GenerationBlockKind) => void;
}) {
  return (
    <section className="generation-palette" aria-label="Generation Palette">
      <div className="palette-header">
        <span className="palette-kicker">GENERATION PALETTE</span>
        <strong>Campaign blocks</strong>
      </div>
      <div className="mt-3 grid gap-2">
        {generationPalette.map((item) => {
          const Icon = blockIcons[item.kind];

          return (
            <button
              key={item.kind}
              className={cn("palette-item", item.kind)}
              type="button"
              onClick={() => onAddBlock(item.kind)}
            >
              <span className="palette-icon">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span className="palette-badge">{item.badge}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CanvasStatus({ visibleBlocks }: { visibleBlocks: number }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-5 z-20 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm shadow-[0_14px_34px_rgba(40,32,20,0.08)]">
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

function GenerationBlockNode({
  data,
  selected,
}: NodeProps<CreativeFlowNode>) {
  const Icon = blockIcons[data.kind];

  return (
    <article className={cn("generation-node", data.tone, selected && "selected")}>
      <Handle
        type="target"
        position={Position.Left}
        className={cn("canvas-handle", `${data.tone}-handle`)}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn("canvas-handle", `${data.tone}-handle`)}
      />

      <header className="generation-node-header">
        <span className={cn("generation-node-icon", data.tone)}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="node-kicker-inline">GENERATION BLOCK</span>
          <strong>{data.title}</strong>
          <small>{data.subtitle}</small>
        </span>
        <span className={cn("generation-status", statusTone(data.status))}>
          {data.status}
        </span>
      </header>

      <p className="generation-description">{data.description}</p>

      <div className="generation-contracts">
        {data.contracts.map((contract) => (
          <ContractRow
            key={`${data.id}-${contract.label}`}
            label={contract.label}
            value={contract.value}
            state={contract.state}
            tone={data.tone}
          />
        ))}
      </div>

      <footer className="generation-node-footer">
        <span>BYO provider</span>
        <button className="run-button" type="button">
          Run block
        </button>
      </footer>
    </article>
  );
}

function ContractRow({
  label,
  value,
  state,
  tone,
}: {
  label: string;
  value: string;
  state: string;
  tone: GenerationBlockTone;
}) {
  return (
    <div className="generation-contract-row">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={tone}>{state}</em>
    </div>
  );
}

function statusTone(status: string) {
  if (status === "READY") return "ready";
  if (status === "NEEDS INPUT") return "needs-input";
  return "draft";
}

const creativeNodeTypes = {
  generation: GenerationBlockNode,
};
