import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("api/agent/plugins", "./routes/api.agent-plugins.ts"),
  route("api/campaigns/:campaignId", "./routes/api.campaign.ts"),
  route(
    "api/campaigns/:campaignId/generation/batches",
    "./routes/api.campaign-generation.ts",
  ),
  route(
    "api/campaigns/:campaignId/measurement-goals",
    "./routes/api.campaign-measurement-goals.ts",
  ),
  route(
    "api/campaigns/:campaignId/tracking/exposures",
    "./routes/api.campaign-tracking-exposures.ts",
  ),
  route(
    "api/campaigns/:campaignId/tracking/clicks",
    "./routes/api.campaign-tracking-clicks.ts",
  ),
  route(
    "api/campaigns/:campaignId/tracking/conversions",
    "./routes/api.campaign-tracking-conversions.ts",
  ),
  route(
    "api/campaigns/:campaignId/tracking/engagement",
    "./routes/api.campaign-tracking-engagement.ts",
  ),
  route(
    "api/campaigns/:campaignId/tracking/immersion",
    "./routes/api.campaign-tracking-immersion.ts",
  ),
  route(
    "api/campaigns/:campaignId/tracking/metrics",
    "./routes/api.campaign-tracking-metrics.ts",
  ),
  route(
    "api/campaigns/:campaignId/tracking/revisits",
    "./routes/api.campaign-tracking-revisits.ts",
  ),
  route("api/plugin-kinds", "./routes/api.plugin-kinds.ts"),
  route("api/plugin-kinds/:pluginType", "./routes/api.plugin-kind.ts"),
  route("campaigns/:campaignId/canvas", "./routes/campaign-canvas.tsx"),
  route("campaigns/:campaignId/landing", "./routes/campaign-landing.tsx"),
  route("campaigns/:campaignId/reporting", "./routes/campaign-reporting.tsx"),
] satisfies RouteConfig;
