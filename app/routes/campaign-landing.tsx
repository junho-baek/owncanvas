import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { CampaignLandingPageRenderer } from "~/features/creative-canvas/components/landing-page-renderer";
import {
  getPersistedCampaignRecord,
  type CampaignRecord,
} from "~/features/creative-canvas/model/creative-canvas";

export function meta() {
  return [
    { title: "OwnCanvas Campaign Landing" },
    {
      name: "description",
      content: "Responsive campaign landing page preview.",
    },
  ];
}

export default function CampaignLanding() {
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
      <main className="grid min-h-dvh place-items-center bg-[#101014] text-white">
        <p className="text-sm font-semibold">Opening landing preview...</p>
      </main>
    );
  }

  return <CampaignLandingPageRenderer campaign={campaign} />;
}
