import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createCampaignComparisonViewModel,
  createCampaignReportingViewModel,
  type CampaignReportingMetricsSource,
} from "./campaign-reporting-view-model.ts";

test("campaign reporting view model promotes purchase conversion as the primary success metric", () => {
  const metrics: CampaignReportingMetricsSource = {
    schemaVersion: "owncanvas.campaign-conversion-metrics.v1",
    campaignId: "campaign_reporting_primary_conversion",
    generatedAt: "2026-05-11T06:00:00.000Z",
    query: {
      filters: {
        campaignId: "campaign_reporting_primary_conversion",
      },
    },
    funnel: {
      exposures: 100,
      exposureSessions: 90,
      clicks: 25,
      clickSessions: 20,
      conversions: 8,
      conversionSessions: 7,
      purchaseConversions: 5,
      purchaseConversionSessions: 5,
    },
    rates: {
      clickThroughRate: 0.25,
      sessionClickThroughRate: 0.2222,
      purchaseConversionRate: 0.2,
      sessionPurchaseConversionRate: 0.25,
    },
    reportableMetrics: [
      {
        key: "purchase_conversion_rate",
        label: "Purchase conversion rate",
        source: "rates.purchaseConversionRate",
        unit: "percent",
        numerator: "funnel.purchaseConversions",
        denominator: "funnel.clicks",
      },
      {
        key: "purchase_conversions",
        label: "Purchase conversions",
        source: "funnel.purchaseConversions",
        unit: "count",
      },
    ],
    successScore: {
      score: 20,
      primaryMetric: "purchase_conversion_rate",
      value: 0.2,
      unit: "percent",
      purchaseConversions: 5,
      purchaseConversionRate: 0.2,
      denominator: "clicks",
    },
    value: {
      totalValue: 625,
      averageOrderValue: 125,
      revenuePerClick: 25,
      revenuePerClickSession: 31.25,
      currencyBreakdown: {
        USD: 625,
      },
    },
  };

  const model = createCampaignReportingViewModel(metrics);

  assert.equal(model.primarySuccessMetric.key, "purchase_conversion_rate");
  assert.equal(model.primarySuccessMetric.label, "Purchase conversion");
  assert.equal(model.primarySuccessMetric.value, "20.0%");
  assert.equal(model.primarySuccessMetric.helpText, "5 purchases from 25 clicks");
  assert.deepEqual(
    model.summarySections.map((section) => section.key),
    ["primary_purchase_conversion", "purchase_value", "traffic_quality"],
  );
  assert.equal(model.summarySections[0]?.title, "Purchase conversion");
  assert.equal(model.summarySections[0]?.metrics[0]?.key, "purchase_conversion_rate");
  assert.equal(model.summarySections[0]?.metrics[0]?.value, "20.0%");
  assert.equal(model.secondaryMetrics[0]?.key, "purchase_conversions");
  assert.equal(model.secondaryMetrics[0]?.value, "5");
});

test("campaign reporting detail and table rows list purchase conversion before secondary metrics", () => {
  const metrics = createConversionMetricsFixture({
    campaignId: "campaign_reporting_detail_order",
    clicks: 25,
    purchaseConversions: 5,
    totalValue: 625,
  });

  const model = createCampaignReportingViewModel(metrics);

  assert.deepEqual(
    model.detailMetrics.map((metric) => metric.key),
    [
      "purchase_conversion_rate",
      "purchase_conversions",
      "total_purchase_value",
      "revenue_per_click",
      "click_through_rate",
    ],
  );
  assert.deepEqual(
    model.tableRows.map((row) => row.metric.key),
    [
      "purchase_conversion_rate",
      "purchase_conversions",
      "total_purchase_value",
      "revenue_per_click",
      "click_through_rate",
    ],
  );
  assert.equal(model.tableRows[0]?.priority, "primary");
  assert.equal(model.tableRows[1]?.priority, "secondary");
});

test("campaign comparison view model displays purchase conversion as the primary success metric", () => {
  const lowerConversionMetrics = createConversionMetricsFixture({
    campaignId: "campaign_comparison_lower_conversion",
    clicks: 50,
    purchaseConversions: 5,
    totalValue: 1_000,
  });
  const higherConversionMetrics = createConversionMetricsFixture({
    campaignId: "campaign_comparison_higher_conversion",
    clicks: 40,
    purchaseConversions: 6,
    totalValue: 900,
  });

  const model = createCampaignComparisonViewModel([
    {
      campaignId: "campaign_comparison_lower_conversion",
      title: "Volume offer",
      metrics: lowerConversionMetrics,
    },
    {
      campaignId: "campaign_comparison_higher_conversion",
      title: "Checkout offer",
      metrics: higherConversionMetrics,
    },
  ]);

  assert.deepEqual(model.primarySuccessMetric, {
    key: "purchase_conversion_rate",
    label: "Purchase conversion",
    unit: "percent",
  });
  assert.equal(model.columns[0]?.key, "purchase_conversion_rate");
  assert.equal(model.rows[0]?.campaignId, "campaign_comparison_higher_conversion");
  assert.equal(model.rows[0]?.primarySuccessMetric.value, "15.0%");
  assert.equal(
    model.rows[0]?.primarySuccessMetric.helpText,
    "6 purchases from 40 clicks",
  );
  assert.equal(model.rows[1]?.primarySuccessMetric.value, "10.0%");
  assert.equal(model.rows[0]?.secondaryMetrics.purchaseValue, "$900");
});

function createConversionMetricsFixture(input: {
  campaignId: string;
  clicks: number;
  purchaseConversions: number;
  totalValue: number;
}): CampaignReportingMetricsSource {
  const purchaseConversionRate =
    input.clicks === 0 ? 0 : input.purchaseConversions / input.clicks;

  return {
    schemaVersion: "owncanvas.campaign-conversion-metrics.v1",
    campaignId: input.campaignId,
    generatedAt: "2026-05-11T06:00:00.000Z",
    query: {
      filters: {
        campaignId: input.campaignId,
      },
    },
    funnel: {
      exposures: 100,
      exposureSessions: 90,
      clicks: input.clicks,
      clickSessions: input.clicks,
      conversions: input.purchaseConversions,
      conversionSessions: input.purchaseConversions,
      purchaseConversions: input.purchaseConversions,
      purchaseConversionSessions: input.purchaseConversions,
    },
    rates: {
      clickThroughRate: input.clicks / 100,
      sessionClickThroughRate: input.clicks / 90,
      purchaseConversionRate,
      sessionPurchaseConversionRate: purchaseConversionRate,
    },
    reportableMetrics: [
      {
        key: "purchase_conversion_rate",
        label: "Purchase conversion rate",
        source: "rates.purchaseConversionRate",
        unit: "percent",
        numerator: "funnel.purchaseConversions",
        denominator: "funnel.clicks",
      },
      {
        key: "purchase_conversions",
        label: "Purchase conversions",
        source: "funnel.purchaseConversions",
        unit: "count",
      },
    ],
    successScore: {
      score: purchaseConversionRate * 100,
      primaryMetric: "purchase_conversion_rate",
      value: purchaseConversionRate,
      unit: "percent",
      purchaseConversions: input.purchaseConversions,
      purchaseConversionRate,
      denominator: "clicks",
    },
    value: {
      totalValue: input.totalValue,
      averageOrderValue:
        input.purchaseConversions === 0
          ? 0
          : input.totalValue / input.purchaseConversions,
      revenuePerClick: input.clicks === 0 ? 0 : input.totalValue / input.clicks,
      revenuePerClickSession:
        input.clicks === 0 ? 0 : input.totalValue / input.clicks,
      currencyBreakdown: {
        USD: input.totalValue,
      },
    },
  };
}
