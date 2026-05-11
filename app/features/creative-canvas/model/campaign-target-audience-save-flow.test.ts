import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaignRecord,
  createCampaignTargetAudience,
  getPersistedCampaignRecord,
  saveCampaignTargetAudienceDetails,
} from "./creative-canvas.ts";

test("campaign save flow persists and retrieves target audience details", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_target_audience_save_flow",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const targetAudience = createCampaignTargetAudience({
    age: "25-34",
    gender: "all",
    interests: "AI tools, skincare, creator commerce",
    behavior: "comments on short-form product demos before buying",
    region: "United States",
    platform: "Instagram",
  });

  const savedCampaign = saveCampaignTargetAudienceDetails(
    storage,
    "campaign_target_audience_save_flow",
    targetAudience,
    {
      now: () => "2026-05-11T00:05:00.000Z",
    },
  );
  const retrievedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_target_audience_save_flow",
  );

  assert.deepEqual(savedCampaign.targetAudience, targetAudience);
  assert.equal(savedCampaign.updatedAt, "2026-05-11T00:05:00.000Z");
  assert.deepEqual(retrievedCampaign?.targetAudience, targetAudience);
  assert.equal(retrievedCampaign?.updatedAt, "2026-05-11T00:05:00.000Z");
});

test("campaign target audience save flow rejects missing campaigns", () => {
  const storage = new MemoryStorage();

  assert.throws(
    () =>
      saveCampaignTargetAudienceDetails(
        storage,
        "missing_campaign",
        createCampaignTargetAudience({
          age: "35-44",
          platform: "TikTok",
        }),
      ),
    /Campaign "missing_campaign" was not found./,
  );
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
