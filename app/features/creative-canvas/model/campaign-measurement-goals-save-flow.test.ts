import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaignRecord,
  createCampaignMeasurementGoal,
  createCampaignMeasurementMetric,
  editCampaignMeasurementGoal,
  getCampaignMeasurementCycleCompletion,
  getPersistedCampaignRecord,
  hasCampaignCompletedMeasurementCycle,
  saveCampaignMeasurementGoals,
  saveCampaignMeasurementMetrics,
} from "./creative-canvas.ts";

test("campaign measurement goals save flow persists metric names targets units success criteria and reporting timeframe", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_measurement_goals",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const goals = [
    createCampaignMeasurementGoal({
      id: "goal_purchase_conversion",
      name: "purchase_conversion_rate",
      target: 3.5,
      unit: "percent",
      successCriteria:
        "Purchase conversion rate reaches or exceeds 3.5% with tracked checkout attribution.",
      reportingTimeframe: {
        startsAt: "2026-05-12T00:00:00.000Z",
        endsAt: "2026-05-19T00:00:00.000Z",
        timezone: "America/Los_Angeles",
      },
    }),
    createCampaignMeasurementGoal({
      id: "goal_dm_to_landing",
      name: "dm_to_landing_click_rate",
      target: 18,
      unit: "percent",
      successCriteria:
        "Instagram comment-to-DM traffic clicks through to the immersive landing page.",
      reportingTimeframe: {
        startsAt: "2026-05-12T00:00:00.000Z",
        endsAt: "2026-05-19T00:00:00.000Z",
        timezone: "America/Los_Angeles",
      },
    }),
  ];

  const savedCampaign = saveCampaignMeasurementGoals(
    storage,
    "campaign_measurement_goals",
    goals,
    {
      now: () => "2026-05-11T00:15:00.000Z",
    },
  );
  const retrievedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_measurement_goals",
  );

  assert.deepEqual(savedCampaign.tracking.measurementGoals, goals);
  assert.equal(savedCampaign.updatedAt, "2026-05-11T00:15:00.000Z");
  assert.deepEqual(retrievedCampaign?.tracking.measurementGoals, goals);
});

test("campaign measurement goals save flow rejects invalid goals without overwriting", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_invalid_measurement_goals",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.throws(
    () =>
      saveCampaignMeasurementGoals(
        storage,
        "campaign_invalid_measurement_goals",
        [
          createCampaignMeasurementGoal({
            id: "",
            name: "",
            target: -1,
            unit: "",
            successCriteria: "",
            reportingTimeframe: {
              startsAt: "not-a-date",
              endsAt: "2026-05-10T00:00:00.000Z",
              timezone: "",
            },
          }),
        ],
      ),
    /Invalid campaign measurement goals: measurement_goal.id_required, measurement_goal.name_required, measurement_goal.target_invalid, measurement_goal.unit_required, measurement_goal.success_criteria_required, measurement_goal.reporting_starts_at_invalid, measurement_goal.reporting_timezone_required/,
  );

  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_invalid_measurement_goals")
      ?.tracking.measurementGoals,
    campaign.tracking.measurementGoals,
  );
});

test("campaign measurement goals save flow rejects missing campaigns", () => {
  const storage = new MemoryStorage();

  assert.throws(
    () =>
      saveCampaignMeasurementGoals(
        storage,
        "missing_campaign",
        [
          createCampaignMeasurementGoal({
            name: "purchase_conversion_rate",
            target: 3.5,
            unit: "percent",
            successCriteria: "Purchase conversion rate reaches 3.5%.",
            reportingTimeframe: {
              startsAt: "2026-05-12T00:00:00.000Z",
              endsAt: "2026-05-19T00:00:00.000Z",
              timezone: "UTC",
            },
          }),
        ],
      ),
    /Campaign "missing_campaign" was not found./,
  );
});

test("campaign measurement goals save flow edits an existing goal without changing its identity", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_edit_measurement_goal",
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

  saveCampaignMeasurementGoals(
    storage,
    "campaign_edit_measurement_goal",
    [originalGoal],
  );

  const editedCampaign = editCampaignMeasurementGoal(
    storage,
    "campaign_edit_measurement_goal",
    "goal_purchase_conversion",
    {
      target: 4.2,
      successCriteria:
        "Purchase conversion rate reaches 4.2% with checkout attribution.",
      reportingTimeframe: {
        endsAt: "2026-05-21T00:00:00.000Z",
        timezone: "America/Los_Angeles",
      },
    },
    {
      now: () => "2026-05-11T00:20:00.000Z",
    },
  );

  assert.deepEqual(editedCampaign.tracking.measurementGoals, [
    {
      ...originalGoal,
      target: 4.2,
      successCriteria:
        "Purchase conversion rate reaches 4.2% with checkout attribution.",
      reportingTimeframe: {
        startsAt: "2026-05-12T00:00:00.000Z",
        endsAt: "2026-05-21T00:00:00.000Z",
        timezone: "America/Los_Angeles",
      },
    },
  ]);
  assert.equal(editedCampaign.updatedAt, "2026-05-11T00:20:00.000Z");
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_edit_measurement_goal")
      ?.tracking.measurementGoals,
    editedCampaign.tracking.measurementGoals,
  );
});

test("campaign measurement metrics save flow persists observed attribution values", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_measurement_metrics",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const metrics = [
    createCampaignMeasurementMetric({
      id: "metric_purchase_conversion_rate",
      metric: "purchase_conversion_rate",
      value: 3.8,
      unit: "percent",
      source: "plugin.tracking.active-conversion",
      attributionTouchpoint: "checkout",
      observedAt: "2026-05-13T00:00:00.000Z",
    }),
    createCampaignMeasurementMetric({
      id: "metric_revenue",
      metric: "attributed_revenue",
      value: 1480,
      unit: "USD",
      source: "plugin.tracking.active-conversion",
      attributionTouchpoint: "landing",
      observedAt: "2026-05-13T00:00:00.000Z",
    }),
  ];

  const savedCampaign = saveCampaignMeasurementMetrics(
    storage,
    "campaign_measurement_metrics",
    metrics,
    {
      now: () => "2026-05-13T00:05:00.000Z",
    },
  );
  const retrievedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_measurement_metrics",
  );

  assert.deepEqual(savedCampaign.tracking.metrics, metrics);
  assert.equal(savedCampaign.updatedAt, "2026-05-13T00:05:00.000Z");
  assert.deepEqual(retrievedCampaign?.tracking.metrics, metrics);
});

test("campaign measurement metrics save flow completes a measurement cycle with performance results", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_measurement_cycle_completed",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const goal = createCampaignMeasurementGoal({
    id: "goal_purchase_conversion",
    name: "purchase_conversion_rate",
    target: 0.04,
    unit: "percent",
    successCriteria:
      "Purchase conversion rate reaches the target with checkout attribution.",
    reportingTimeframe: {
      startsAt: "2026-05-12T00:00:00.000Z",
      endsAt: "2026-05-19T00:00:00.000Z",
      timezone: "UTC",
    },
  });
  const metrics = [
    createCampaignMeasurementMetric({
      id: "metric_purchase_conversion_rate",
      metric: "purchase_conversion_rate",
      value: 0.047,
      unit: "percent",
      source: "plugin.tracking.active-conversion",
      attributionTouchpoint: "checkout",
      observedAt: "2026-05-19T00:01:00.000Z",
    }),
    createCampaignMeasurementMetric({
      id: "metric_purchase_revenue",
      metric: "attributed_revenue",
      value: 2450,
      unit: "USD",
      source: "plugin.tracking.active-conversion",
      attributionTouchpoint: "checkout",
      observedAt: "2026-05-19T00:01:00.000Z",
    }),
  ];

  saveCampaignMeasurementGoals(
    storage,
    "campaign_measurement_cycle_completed",
    [goal],
  );
  const campaign = saveCampaignMeasurementMetrics(
    storage,
    "campaign_measurement_cycle_completed",
    metrics,
    {
      now: () => "2026-05-19T00:05:00.000Z",
    },
  );
  const completion = getCampaignMeasurementCycleCompletion(campaign);

  assert.equal(hasCampaignCompletedMeasurementCycle(campaign), true);
  assert.deepEqual(completion, {
    schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
    hasCompletedMeasurementCycle: true,
    completedCycleCount: 1,
    latestCompletedCycle: {
      schemaVersion: "owncanvas.campaign-measurement-cycle.v1",
      id: "measurement_cycle_goal_purchase_conversion_2026_05_19T00_05_00_000Z",
      status: "completed",
      goalIds: ["goal_purchase_conversion"],
      startedAt: "2026-05-12T00:00:00.000Z",
      completedAt: "2026-05-19T00:05:00.000Z",
      resultCount: 2,
      performanceResults: metrics,
      primaryResult: metrics[0],
    },
  });
  assert.deepEqual(campaign.tracking.improvementActions, [
    {
      schemaVersion: "owncanvas.campaign-improvement-action.v1",
      id: "improvement_measurement_cycle_goal_purchase_conversion_2026_05_19T00_05_00_000Z",
      status: "proposed",
      priority: "medium",
      actionType: "scale_winning_path",
      sourceMeasurementCycleId:
        "measurement_cycle_goal_purchase_conversion_2026_05_19T00_05_00_000Z",
      goalIds: ["goal_purchase_conversion"],
      metric: "purchase_conversion_rate",
      observedValue: 0.047,
      targetValue: 0.04,
      unit: "percent",
      recommendation:
        "Scale the winning conversion path into the next campaign iteration.",
      rationale:
        "purchase_conversion_rate recorded 0.047 percent against a target of 0.04 percent.",
      createdAt: "2026-05-19T00:05:00.000Z",
    },
  ]);
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_measurement_cycle_completed")
      ?.tracking.measurementCycles,
    campaign.tracking.measurementCycles,
  );
});

test("blank campaign has not completed a measurement cycle until performance results are recorded", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_measurement_cycle_pending",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.equal(hasCampaignCompletedMeasurementCycle(campaign), false);
  assert.deepEqual(getCampaignMeasurementCycleCompletion(campaign), {
    schemaVersion: "owncanvas.campaign-measurement-cycle-completion.v1",
    hasCompletedMeasurementCycle: false,
    completedCycleCount: 0,
  });
});

test("campaign measurement metrics save flow rejects invalid metrics without overwriting", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_invalid_measurement_metrics",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.throws(
    () =>
      saveCampaignMeasurementMetrics(
        storage,
        "campaign_invalid_measurement_metrics",
        [
          createCampaignMeasurementMetric({
            id: "",
            metric: "",
            value: Number.NaN,
            unit: "",
            source: "",
            attributionTouchpoint: "",
            observedAt: "not-a-date",
          }),
        ],
      ),
    /Invalid campaign measurement metrics: measurement_metric.id_required, measurement_metric.metric_required, measurement_metric.value_invalid, measurement_metric.unit_required, measurement_metric.source_required, measurement_metric.attribution_touchpoint_required, measurement_metric.observed_at_invalid/,
  );

  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_invalid_measurement_metrics")
      ?.tracking.metrics,
    campaign.tracking.metrics,
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
