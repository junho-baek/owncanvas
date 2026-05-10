import { WorkflowCanvasScreen } from "~/features/workflow-canvas/components/workflow-canvas-screen";

export function meta() {
  return [
    { title: "OwnCanvas Workflow" },
    {
      name: "description",
      content: "Local-first creative workflow canvas.",
    },
  ];
}

export default function Home() {
  return <WorkflowCanvasScreen />;
}
