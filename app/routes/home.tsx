import { FilePlus2, PanelTopOpen, Play } from "lucide-react";
import { useNavigate } from "react-router";

import {
  createBlankCampaignRecord,
  getCampaignCanvasPath,
} from "~/features/creative-canvas/model/creative-canvas";

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
  const navigate = useNavigate();
  const createCampaign = () => {
    const campaign = createBlankCampaignRecord(window.localStorage);
    navigate(getCampaignCanvasPath(campaign.id));
  };

  return (
    <main className="campaign-dashboard min-h-dvh bg-[#fbfaf7] text-[#181d26]">
      <section className="campaign-dashboard-main">
        <header className="campaign-dashboard-header">
          <div className="campaign-dashboard-mark">
            <Play className="ml-0.5 size-4 fill-current" />
          </div>
          <div>
            <p>OwnCanvas</p>
            <h1>Campaigns</h1>
          </div>
        </header>

        <div className="campaign-create-panel">
          <div>
            <span className="campaign-panel-kicker">CREATIVE CANVAS</span>
            <h2>Start with a blank campaign</h2>
          </div>
          <button
            className="campaign-create-button"
            type="button"
            onClick={createCampaign}
          >
            <FilePlus2 className="size-4" />
            New blank campaign
          </button>
        </div>

        <div className="campaign-dashboard-empty" aria-label="Campaign dashboard">
          <PanelTopOpen className="size-5" />
          <span>No campaigns yet</span>
        </div>
      </section>
    </main>
  );
}
