export type GenerationBlockKind = "text" | "image" | "video" | "voice";

export type GenerationBlockTone = "ink" | "blue" | "violet" | "green";

export type GenerationBlockContract = {
  label: string;
  value: string;
  state: "READY" | "OPTIONAL" | "WAITING" | "BYO";
};

export type CampaignCanvasBlock = {
  id: string;
  kind: GenerationBlockKind;
  title: string;
  subtitle: string;
  description: string;
  tone: GenerationBlockTone;
  status: "READY" | "DRAFT" | "NEEDS INPUT";
  position: { x: number; y: number };
  contracts: GenerationBlockContract[];
};

export type CampaignCanvasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type GenerationPaletteItem = {
  kind: GenerationBlockKind;
  title: string;
  description: string;
  badge: string;
};

type GenerationBlockDefinition = Omit<
  CampaignCanvasBlock,
  "id" | "position"
>;

export const generationPalette = [
  {
    kind: "text",
    title: "Text Block",
    description: "Briefs, hooks, copy, prompts",
    badge: "LLM",
  },
  {
    kind: "image",
    title: "Image Block",
    description: "Generate, edit, vary images",
    badge: "IMG",
  },
  {
    kind: "video",
    title: "Video Block",
    description: "Turn prompts or frames into motion",
    badge: "VID",
  },
  {
    kind: "voice",
    title: "Voice Block",
    description: "Narration and voice variants",
    badge: "VO",
  },
] satisfies GenerationPaletteItem[];

const generationBlockDefinitions = {
  text: {
    kind: "text",
    title: "Text Block",
    subtitle: "campaign angles + prompt copy",
    description: "Turns a campaign brief into hooks, captions, and prompts.",
    tone: "ink",
    status: "READY",
    contracts: [
      { label: "INPUT", value: "Campaign brief", state: "READY" },
      { label: "MODEL", value: "BYO LLM account", state: "BYO" },
      { label: "OUTPUT", value: "Hooks + prompt variants", state: "READY" },
    ],
  },
  image: {
    kind: "image",
    title: "Image Block",
    subtitle: "product shots + visual variants",
    description: "Creates still images from prompts, references, and edits.",
    tone: "blue",
    status: "DRAFT",
    contracts: [
      { label: "INPUT", value: "Prompt or reference image", state: "READY" },
      { label: "MODEL", value: "BYO image provider", state: "BYO" },
      { label: "OUTPUT", value: "Image candidates", state: "WAITING" },
    ],
  },
  video: {
    kind: "video",
    title: "Video Block",
    subtitle: "motion drafts + short-form cuts",
    description: "Extends prompts or frames into campaign video drafts.",
    tone: "violet",
    status: "NEEDS INPUT",
    contracts: [
      { label: "INPUT", value: "Prompt, frame, or image", state: "OPTIONAL" },
      { label: "MODEL", value: "BYO video provider", state: "BYO" },
      { label: "OUTPUT", value: "Video candidates", state: "WAITING" },
    ],
  },
  voice: {
    kind: "voice",
    title: "Voice Block",
    subtitle: "narration + voice variants",
    description: "Creates voiceover reads for ads, shorts, and product clips.",
    tone: "green",
    status: "DRAFT",
    contracts: [
      { label: "INPUT", value: "Script or caption", state: "READY" },
      { label: "MODEL", value: "BYO voice provider", state: "BYO" },
      { label: "OUTPUT", value: "Voice takes", state: "WAITING" },
    ],
  },
} satisfies Record<GenerationBlockKind, GenerationBlockDefinition>;

export const initialCampaignBlocks = [
  createCampaignBlock("text", 0, { x: 360, y: 170 }),
  createCampaignBlock("image", 1, { x: 760, y: 150 }),
  createCampaignBlock("video", 2, { x: 760, y: 420 }),
  createCampaignBlock("voice", 3, { x: 360, y: 455 }),
] satisfies CampaignCanvasBlock[];

export const initialCampaignEdges = [
  { id: "text-image", source: "text_block_1", target: "image_block_2", label: "prompts" },
  { id: "image-video", source: "image_block_2", target: "video_block_3", label: "frames" },
  { id: "text-voice", source: "text_block_1", target: "voice_block_4", label: "script" },
] satisfies CampaignCanvasEdge[];

export function createCampaignBlock(
  kind: GenerationBlockKind,
  index: number,
  position = nextBlockPosition(index),
): CampaignCanvasBlock {
  const definition = generationBlockDefinitions[kind];

  return {
    ...definition,
    id: `${kind}_block_${index + 1}`,
    position,
  };
}

export function getGenerationBlockDefinition(kind: GenerationBlockKind) {
  return generationBlockDefinitions[kind];
}

function nextBlockPosition(index: number) {
  const column = index % 2;
  const row = Math.floor(index / 2);

  return {
    x: 360 + column * 400,
    y: 170 + row * 260,
  };
}
