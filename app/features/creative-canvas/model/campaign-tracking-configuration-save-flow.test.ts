import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaignRecord,
  createCampaignTrackingConfiguration,
  getPersistedCampaignRecord,
  saveCampaignTrackingConfiguration,
} from "./creative-canvas.ts";

test("campaign tracking configuration save flow persists attribution parameters pixels events and analytics destinations", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_tracking_configuration",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const tracking = createCampaignTrackingConfiguration({
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "comment-trigger",
      term: "creator-tools",
    },
    attributionParameters: [
      {
        key: "click_id",
        value: "{{ig_click_id}}",
        source: "instagram",
      },
      {
        key: "affiliate_id",
        value: "impact_creator_123",
        source: "impact",
      },
    ],
    pixelEvents: [
      {
        id: "pixel_meta_purchase",
        provider: "meta",
        pixelId: "1234567890",
        eventName: "Purchase",
        conversion: true,
      },
      {
        id: "pixel_tiktok_view_content",
        provider: "tiktok",
        pixelId: "TT-998877",
        eventName: "ViewContent",
        conversion: false,
      },
    ],
    analyticsDestinations: [
      {
        id: "analytics_ga4",
        provider: "google-analytics-4",
        destinationId: "G-OWNCANVAS1",
        label: "GA4 campaign property",
        enabled: true,
      },
      {
        id: "analytics_posthog",
        provider: "posthog",
        destinationId: "ph_project_123",
        label: "PostHog funnel",
        enabled: true,
      },
    ],
    events: ["comment_submitted", "dm_link_clicked", "checkout_started"],
    conversions: ["purchase"],
    attribution: {
      model: "linear",
      touchpoints: ["comment", "dm", "landing", "checkout"],
    },
  });

  const savedCampaign = saveCampaignTrackingConfiguration(
    storage,
    "campaign_tracking_configuration",
    tracking,
    {
      now: () => "2026-05-11T00:25:00.000Z",
    },
  );
  const retrievedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_tracking_configuration",
  );

  assert.deepEqual(savedCampaign.tracking, tracking);
  assert.equal(savedCampaign.updatedAt, "2026-05-11T00:25:00.000Z");
  assert.deepEqual(retrievedCampaign?.tracking, tracking);
});

test("campaign tracking configuration save flow rejects invalid tracking without overwriting", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_invalid_tracking_configuration",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.throws(
    () =>
      saveCampaignTrackingConfiguration(
        storage,
        "campaign_invalid_tracking_configuration",
        createCampaignTrackingConfiguration({
          attributionParameters: [
            {
              key: "",
              value: "abc123",
              source: "instagram",
            },
          ],
          pixelEvents: [
            {
              id: "",
              provider: "meta",
              pixelId: "",
              eventName: "",
              conversion: true,
            },
          ],
          analyticsDestinations: [
            {
              id: "",
              provider: "",
              destinationId: "",
              label: "",
              enabled: true,
            },
          ],
          conversions: [""],
          attribution: {
            model: "last-touch",
            touchpoints: [],
          },
        }),
      ),
    /Invalid campaign tracking configuration: tracking.attribution_parameter_key_required, tracking.pixel_event_id_required, tracking.pixel_id_required, tracking.pixel_event_name_required, tracking.analytics_destination_id_required, tracking.analytics_provider_required, tracking.analytics_destination_identifier_required, tracking.analytics_destination_label_required, tracking.conversion_event_required, tracking.attribution_touchpoint_required/,
  );

  assert.deepEqual(
    getPersistedCampaignRecord(
      storage,
      "campaign_invalid_tracking_configuration",
    )?.tracking,
    campaign.tracking,
  );
});

test("campaign tracking configuration save flow rejects missing campaigns", () => {
  const storage = new MemoryStorage();

  assert.throws(
    () =>
      saveCampaignTrackingConfiguration(
        storage,
        "missing_campaign",
        createCampaignTrackingConfiguration({
          events: ["purchase"],
          conversions: ["purchase"],
          attribution: {
            model: "last-touch",
            touchpoints: ["checkout"],
          },
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
