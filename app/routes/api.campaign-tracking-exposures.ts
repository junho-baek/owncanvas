import { createCampaignTrackingMetricReportLoader } from "./api.campaign-tracking-metric-report.ts";
import { action } from "./api.campaign-tracking-events.ts";

export { action };

export const loader = createCampaignTrackingMetricReportLoader("exposure");
