import { CreativeCanvasScreen } from "~/features/creative-canvas/components/creative-canvas-screen";

export function meta() {
  return [
    { title: "OwnCanvas Creative Canvas" },
    {
      name: "description",
      content: "Local-first creative campaign canvas.",
    },
  ];
}

export default function Home() {
  return <CreativeCanvasScreen />;
}
