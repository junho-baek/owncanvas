import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { CreativeCanvasScreen } from "~/features/creative-canvas/components/creative-canvas-screen";
import {
  getPersistedCampaignRecord,
  updatePersistedCampaignRecord,
  type CampaignRecord,
} from "~/features/creative-canvas/model/creative-canvas";

export function meta() {
  return [
    { title: "OwnCanvas Campaign Canvas" },
    {
      name: "description",
      content: "Campaign creative canvas workspace.",
    },
  ];
}

export default function CampaignCanvas() {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);

  useEffect(() => {
    if (!campaignId) {
      navigate("/", { replace: true });
      return;
    }

    const persistedCampaign = getPersistedCampaignRecord(
      window.localStorage,
      campaignId,
    );

    if (!persistedCampaign) {
      navigate("/", { replace: true });
      return;
    }

    setCampaign(persistedCampaign);
  }, [campaignId, navigate]);

  if (!campaign) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#fbfaf7] text-[#181d26]">
        <p className="text-sm font-semibold">Opening campaign canvas...</p>
      </main>
    );
  }

  return (
    <CreativeCanvasScreen
      campaign={campaign}
      onCampaignChange={(updatedCampaign) => {
        setCampaign((currentCampaign) => {
          if (!currentCampaign) {
            return currentCampaign;
          }

          return updatePersistedCampaignRecord(window.localStorage, {
            ...currentCampaign,
            ...updatedCampaign,
          });
        });
      }}
      onBackToDashboard={() => navigate("/")}
      onOpenReporting={() => navigate(`/campaigns/${campaign.id}/reporting`)}
    />
  );
}
