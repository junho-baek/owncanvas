import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaignRecord,
  createCampaignMeasurementGoal,
  getPersistedCampaignRecord,
} from "../features/creative-canvas/model/creative-canvas.ts";
import { action as saveCampaignMeasurementGoal } from "./api.campaign-measurement-goals.ts";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

test("POST /api/campaigns/:campaignId/measurement-goals creates a measurement goal from API inputs", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_measurement_goals",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const response = await saveCampaignMeasurementGoal({
    params: { campaignId: "campaign_api_measurement_goals" },
    storage,
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_measurement_goals/measurement-goals",
      {
        method: "POST",
        body: JSON.stringify({
          name: "purchase_conversion_rate",
          target: 3.5,
          unit: "percent",
          successCriteria:
            "Purchase conversion rate reaches 3.5% with checkout attribution.",
          reportingTimeframe: {
            startsAt: "2026-05-12T00:00:00.000Z",
            endsAt: "2026-05-19T00:00:00.000Z",
            timezone: "America/Los_Angeles",
          },
        }),
        headers: { "content-type": "application/json" },
      },
    ),
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.equal(body.schemaVersion, "owncanvas.campaign-measurement-goals.v1");
  assert.deepEqual(body.goal, {
    id: "measurement_goal_0",
    name: "purchase_conversion_rate",
    target: 3.5,
    unit: "percent",
    successCriteria:
      "Purchase conversion rate reaches 3.5% with checkout attribution.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-19T00:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_api_measurement_goals")
      ?.tracking.measurementGoals,
    [body.goal],
  );
});

test("POST /api/campaigns/:campaignId/measurement-goals accepts metric name target and unit inputs", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_metric_inputs",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const response = await saveCampaignMeasurementGoal({
    params: { campaignId: "campaign_api_metric_inputs" },
    storage,
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_metric_inputs/measurement-goals",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Purchase conversion rate",
          target: 4.5,
          unit: "percent",
          successCriteria:
            "Purchase conversion rate reaches 4.5% with checkout attribution.",
          reportingTimeframe: {
            startsAt: "2026-05-12T00:00:00.000Z",
            endsAt: "2026-05-19T00:00:00.000Z",
            timezone: "America/Los_Angeles",
          },
        }),
        headers: { "content-type": "application/json" },
      },
    ),
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body.goal, {
    id: "measurement_goal_0",
    name: "Purchase conversion rate",
    target: 4.5,
    unit: "percent",
    successCriteria:
      "Purchase conversion rate reaches 4.5% with checkout attribution.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-19T00:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
  });
});

test("POST /api/campaigns/:campaignId/measurement-goals accepts legacy target metric aliases", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_legacy_metric_inputs",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const response = await saveCampaignMeasurementGoal({
    params: { campaignId: "campaign_api_legacy_metric_inputs" },
    storage,
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_legacy_metric_inputs/measurement-goals",
      {
        method: "POST",
        body: JSON.stringify({
          targetMetric: "purchase_conversion_rate",
          targetValue: 3.5,
          unit: "percent",
          successCriteria:
            "Purchase conversion rate reaches 3.5% with checkout attribution.",
          reportingTimeframe: {
            startsAt: "2026-05-12T00:00:00.000Z",
            endsAt: "2026-05-19T00:00:00.000Z",
            timezone: "America/Los_Angeles",
          },
        }),
        headers: { "content-type": "application/json" },
      },
    ),
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body.goal, {
    id: "measurement_goal_0",
    name: "purchase_conversion_rate",
    target: 3.5,
    unit: "percent",
    successCriteria:
      "Purchase conversion rate reaches 3.5% with checkout attribution.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-19T00:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
  });
});

test("PATCH /api/campaigns/:campaignId/measurement-goals edits an existing measurement goal", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_edit_measurement_goal",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const originalGoal = createCampaignMeasurementGoal({
    id: "goal_purchase_conversion",
    name: "purchase_conversion_rate",
    target: 3.5,
    unit: "percent",
    successCriteria: "Purchase conversion rate reaches 3.5%.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-19T00:00:00.000Z",
      timezone: "UTC",
    },
  });

  await saveCampaignMeasurementGoal({
    params: { campaignId: "campaign_api_edit_measurement_goal" },
    storage,
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_edit_measurement_goal/measurement-goals",
      {
        method: "POST",
        body: JSON.stringify(originalGoal),
        headers: { "content-type": "application/json" },
      },
    ),
  });

  const response = await saveCampaignMeasurementGoal({
    params: { campaignId: "campaign_api_edit_measurement_goal" },
    storage,
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_edit_measurement_goal/measurement-goals",
      {
        method: "PATCH",
        body: JSON.stringify({
          id: "goal_purchase_conversion",
          target: 4.2,
          successCriteria:
            "Purchase conversion rate reaches 4.2% with checkout attribution.",
          reportingTimeframe: {
            endsAt: "2026-05-21T00:00:00.000Z",
            timezone: "America/Los_Angeles",
          },
        }),
        headers: { "content-type": "application/json" },
      },
    ),
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body.goal, {
    ...originalGoal,
    target: 4.2,
    successCriteria:
      "Purchase conversion rate reaches 4.2% with checkout attribution.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-21T00:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
  });
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
