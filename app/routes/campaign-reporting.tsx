import { ArrowLeft, BarChart3, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import {
  getCampaignCanvasPath,
  getCampaignMetricQueryReport,
  getPersistedCampaignRecord,
  type CampaignMetricQueryReport,
  type CampaignRecord,
} from "~/features/creative-canvas/model/creative-canvas";
import { createCampaignReportingViewModel } from "./campaign-reporting-view-model";

export function meta() {
  return [
    { title: "OwnCanvas Campaign Reporting" },
    {
      name: "description",
      content: "Campaign reporting with purchase conversion as the primary KPI.",
    },
  ];
}

export default function CampaignReporting() {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [report, setReport] = useState<CampaignMetricQueryReport | null>(null);

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
    setReport(
      getCampaignMetricQueryReport(
        window.localStorage,
        campaignId,
        { metric: "all" },
        { now: () => new Date().toISOString() },
      ),
    );
  }, [campaignId, navigate]);

  const reportingModel = useMemo(() => {
    if (!report?.conversionMetrics) {
      return null;
    }

    return createCampaignReportingViewModel(report.conversionMetrics);
  }, [report]);

  if (!campaign || !reportingModel) {
    return (
      <main className="campaign-reporting-page">
        <p className="campaign-reporting-loading">Opening campaign reporting...</p>
      </main>
    );
  }

  return (
    <main className="campaign-reporting-page">
      <section className="campaign-reporting-shell">
        <header className="campaign-reporting-header">
          <button
            className="campaign-reporting-back"
            type="button"
            onClick={() => navigate(getCampaignCanvasPath(campaign.id))}
          >
            <ArrowLeft className="size-4" />
            Canvas
          </button>
          <div>
            <p>Campaign reporting</p>
            <h1>{campaign.title}</h1>
          </div>
        </header>

        <section
          className="campaign-reporting-primary"
          aria-label="Primary success metric"
        >
          <div className="campaign-reporting-primary-label">
            <Target className="size-4" />
            <span>Primary success metric</span>
          </div>
          <div className="campaign-reporting-primary-value">
            {reportingModel.primarySuccessMetric.value}
          </div>
          <div className="campaign-reporting-primary-copy">
            <h2>{reportingModel.primarySuccessMetric.label}</h2>
            <p>{reportingModel.primarySuccessMetric.helpText}</p>
          </div>
        </section>

        <section
          className="campaign-reporting-summaries"
          aria-label="Reporting summary sections"
        >
          {reportingModel.summarySections.map((section) => (
            <article className="campaign-reporting-summary" key={section.key}>
              <header>
                <div>
                  <BarChart3 className="size-4" />
                  <span>Summary</span>
                </div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </header>
              <div className="campaign-reporting-summary-metrics">
                {section.metrics.map((metric) => (
                  <div className="campaign-reporting-metric" key={metric.key}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <p>{metric.helpText}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section
          className="campaign-reporting-detail"
          aria-label="Campaign reporting detail"
        >
          <header>
            <div>
              <BarChart3 className="size-4" />
              <span>Detail</span>
            </div>
            <h2>Metric table</h2>
          </header>
          <div className="campaign-reporting-table-wrap">
            <table className="campaign-reporting-table">
              <thead>
                <tr>
                  <th scope="col">Priority</th>
                  <th scope="col">Metric</th>
                  <th scope="col">Value</th>
                  <th scope="col">Attribution detail</th>
                </tr>
              </thead>
              <tbody>
                {reportingModel.tableRows.map((row) => (
                  <tr key={row.metric.key}>
                    <td>{row.priority === "primary" ? "Primary" : "Secondary"}</td>
                    <th scope="row">{row.metric.label}</th>
                    <td>{row.metric.value}</td>
                    <td>{row.metric.helpText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
