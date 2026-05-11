import type { CampaignConversionMetricsReport } from "../features/creative-canvas/model/creative-canvas.ts";

export type CampaignReportingMetricsSource = CampaignConversionMetricsReport;

export type CampaignReportingMetricView = {
  key: string;
  label: string;
  value: string;
  helpText: string;
};

export type CampaignReportingSummarySection = {
  key: string;
  title: string;
  description: string;
  metrics: CampaignReportingMetricView[];
};

export type CampaignReportingMetricTableRow = {
  metric: CampaignReportingMetricView;
  priority: "primary" | "secondary";
};

export type CampaignReportingViewModel = {
  primarySuccessMetric: CampaignReportingMetricView;
  secondaryMetrics: CampaignReportingMetricView[];
  detailMetrics: CampaignReportingMetricView[];
  tableRows: CampaignReportingMetricTableRow[];
  summarySections: CampaignReportingSummarySection[];
};

export type CampaignComparisonMetricsSource = {
  campaignId: string;
  title: string;
  metrics: CampaignReportingMetricsSource;
};

export type CampaignComparisonMetricColumn = {
  key:
    | "purchase_conversion_rate"
    | "purchase_conversions"
    | "total_purchase_value"
    | "revenue_per_click";
  label: string;
  unit: "percent" | "count" | "currency";
};

export type CampaignComparisonRow = {
  campaignId: string;
  title: string;
  primarySuccessMetric: CampaignReportingMetricView;
  secondaryMetrics: {
    purchaseConversions: string;
    purchaseValue: string;
    revenuePerClick: string;
  };
  score: number;
};

export type CampaignComparisonViewModel = {
  primarySuccessMetric: CampaignComparisonMetricColumn;
  columns: CampaignComparisonMetricColumn[];
  rows: CampaignComparisonRow[];
};

export function createCampaignReportingViewModel(
  metrics: CampaignReportingMetricsSource,
): CampaignReportingViewModel {
  const primarySuccessMetric: CampaignReportingMetricView = {
    key: "purchase_conversion_rate",
    label: "Purchase conversion",
    value: formatPercent(metrics.rates.purchaseConversionRate),
    helpText: `${formatInteger(
      metrics.funnel.purchaseConversions,
    )} purchases from ${formatInteger(metrics.funnel.clicks)} clicks`,
  };
  const secondaryMetrics: CampaignReportingMetricView[] = [
    {
      key: "purchase_conversions",
      label: "Purchases",
      value: formatInteger(metrics.funnel.purchaseConversions),
      helpText: `${formatInteger(
        metrics.funnel.purchaseConversionSessions,
      )} converting sessions`,
    },
    {
      key: "total_purchase_value",
      label: "Purchase value",
      value: formatCurrency(metrics.value.totalValue, metrics),
      helpText: `${formatCurrency(
        metrics.value.averageOrderValue,
        metrics,
      )} average order value`,
    },
    {
      key: "revenue_per_click",
      label: "Revenue per click",
      value: formatCurrency(metrics.value.revenuePerClick, metrics),
      helpText: `${formatInteger(metrics.funnel.clicks)} checkout clicks`,
    },
    {
      key: "click_through_rate",
      label: "Click-through",
      value: formatPercent(metrics.rates.clickThroughRate),
      helpText: `${formatInteger(metrics.funnel.clicks)} clicks from ${formatInteger(
        metrics.funnel.exposures,
      )} exposures`,
    },
  ];
  const detailMetrics = [primarySuccessMetric, ...secondaryMetrics];

  return {
    primarySuccessMetric,
    secondaryMetrics,
    detailMetrics,
    tableRows: detailMetrics.map((metric, index) => ({
      metric,
      priority: index === 0 ? "primary" : "secondary",
    })),
    summarySections: [
      {
        key: "primary_purchase_conversion",
        title: "Purchase conversion",
        description: "Primary success metric for campaign reporting.",
        metrics: [primarySuccessMetric, secondaryMetrics[0]],
      },
      {
        key: "purchase_value",
        title: "Purchase value",
        description: "Revenue created by attributed purchases.",
        metrics: [secondaryMetrics[1], secondaryMetrics[2]],
      },
      {
        key: "traffic_quality",
        title: "Traffic quality",
        description: "Upstream response that feeds purchase conversion.",
        metrics: [secondaryMetrics[3]],
      },
    ],
  };
}

export function createCampaignComparisonViewModel(
  campaigns: CampaignComparisonMetricsSource[],
): CampaignComparisonViewModel {
  return {
    primarySuccessMetric: PURCHASE_CONVERSION_RATE_COLUMN,
    columns: [
      PURCHASE_CONVERSION_RATE_COLUMN,
      {
        key: "purchase_conversions",
        label: "Purchases",
        unit: "count",
      },
      {
        key: "total_purchase_value",
        label: "Purchase value",
        unit: "currency",
      },
      {
        key: "revenue_per_click",
        label: "Revenue per click",
        unit: "currency",
      },
    ],
    rows: campaigns
      .map(createCampaignComparisonRow)
      .sort(compareCampaignComparisonRowsByPurchaseConversion),
  };
}

const PURCHASE_CONVERSION_RATE_COLUMN: CampaignComparisonMetricColumn = {
  key: "purchase_conversion_rate",
  label: "Purchase conversion",
  unit: "percent",
};

function createCampaignComparisonRow(
  campaign: CampaignComparisonMetricsSource,
): CampaignComparisonRow {
  const reportingModel = createCampaignReportingViewModel(campaign.metrics);

  return {
    campaignId: campaign.campaignId,
    title: campaign.title,
    primarySuccessMetric: reportingModel.primarySuccessMetric,
    secondaryMetrics: {
      purchaseConversions: formatInteger(
        campaign.metrics.funnel.purchaseConversions,
      ),
      purchaseValue: formatCurrency(
        campaign.metrics.value.totalValue,
        campaign.metrics,
      ),
      revenuePerClick: formatCurrency(
        campaign.metrics.value.revenuePerClick,
        campaign.metrics,
      ),
    },
    score: campaign.metrics.rates.purchaseConversionRate * 100,
  };
}

function compareCampaignComparisonRowsByPurchaseConversion(
  left: CampaignComparisonRow,
  right: CampaignComparisonRow,
) {
  return right.score - left.score || left.title.localeCompare(right.title);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(
  value: number,
  metrics: Pick<CampaignConversionMetricsReport, "value">,
) {
  const [currency = "USD"] = Object.keys(metrics.value.currencyBreakdown);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}
