import assert from "node:assert/strict";
import { test } from "node:test";

import routeConfig from "../../../routes.ts";
import {
  validateCampaignCanvasEdit,
  validateCampaignTrackingConfiguration,
} from "../../creative-canvas/model/creative-canvas.ts";
import {
  createPluginKindRegistry,
  createLandingConversionEventFromFlow,
  generateDmAutomationReply,
  listPluginKindDefinitions,
  parseLandingDmReferralContext,
  validateLandingConversionEvent,
  validateLandingDmReferralContext,
  validateDmAutomationConfiguration,
} from "./plugin-representation.ts";
import {
  COMMENT_TO_DM_FULL_CAMPAIGN_WORKFLOW_FIXTURE,
  COMMENT_TO_DM_PLUGIN_REGISTRATION_FIXTURES,
  COMMENT_TO_DM_REFERRAL_CONVERSION_FIXTURE,
  COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE,
} from "./plugin-workflow-fixtures.ts";

test("plugin registration fixture preserves required commerce workflow plugin kinds", () => {
  const registry = createPluginKindRegistry(
    COMMENT_TO_DM_PLUGIN_REGISTRATION_FIXTURES,
  );

  assert.deepEqual(
    listPluginKindDefinitions(registry).map((definition) => ({
      type: definition.type,
      requiredDetailKey: definition.requiredDetailKey,
      defaultPermissionMode: definition.defaultPermissionMode,
    })),
    [
      {
        type: "direct-message",
        requiredDetailKey: "directMessage",
        defaultPermissionMode: "advanced",
      },
      {
        type: "landing",
        requiredDetailKey: "landing",
        defaultPermissionMode: "advanced",
      },
      {
        type: "tracking",
        requiredDetailKey: undefined,
        defaultPermissionMode: "basic",
      },
    ],
  );
});

test("template personalization fixture renders a routed tracked landing URL", () => {
  const { configuration, variables, attribution } =
    COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE;

  assert.deepEqual(validateDmAutomationConfiguration(configuration), {
    ok: true,
    errors: [],
  });

  const generated = generateDmAutomationReply({
    configuration,
    variables,
    attribution,
  });

  assert.equal(generated.ok, true);

  if (!generated.ok) {
    return;
  }

  assert.equal(generated.templateId, "template.comment-drop-link");
  assert.equal(generated.landingRouteId, "route.creator-kit");
  assert.equal(
    generated.landingUrl,
    "https://shop.example.test/creator-kit?campaign=campaign.creator-kit&offer=Creator+Kit&utm_source=instagram&utm_medium=dm&utm_campaign=campaign.creator-kit&utm_content=ig.media.42&utm_term=send+kit",
  );
  assert.equal(
    generated.text,
    "Hi creativebuyer, your Creator Kit link is https://shop.example.test/creator-kit?campaign=campaign.creator-kit&offer=Creator+Kit&utm_source=instagram&utm_medium=dm&utm_campaign=campaign.creator-kit&utm_content=ig.media.42&utm_term=send+kit",
  );
});

test("commerce workflow fixture covers plugin registration referral handoff and conversion emission", () => {
  const {
    pluginRegistration,
    referral,
    conversion,
    expected,
  } = COMMENT_TO_DM_REFERRAL_CONVERSION_FIXTURE;

  const registry = createPluginKindRegistry(pluginRegistration.kinds);
  const registeredKinds = listPluginKindDefinitions(registry).map(
    (definition) => definition.type,
  );
  const parsedReferral = parseLandingDmReferralContext(referral.parseInput);
  const emittedConversion = createLandingConversionEventFromFlow(
    conversion.eventInput,
  );

  assert.deepEqual(registeredKinds, expected.registeredPluginTypes);
  assert.deepEqual(parsedReferral, {
    ok: true,
    context: expected.referralContext,
    errors: [],
  });
  if (!parsedReferral.ok) {
    assert.fail("Expected referral fixture to parse successfully.");
  }
  assert.deepEqual(validateLandingDmReferralContext(parsedReferral.context), {
    ok: true,
    errors: [],
  });
  assert.deepEqual(emittedConversion, expected.conversionEvent);
  assert.deepEqual(validateLandingConversionEvent(emittedConversion), {
    ok: true,
    errors: [],
  });
});

test("example workflow wires fixture plugins into a full comment-to-DM-to-landing campaign flow", () => {
  const { campaign, expected } = COMMENT_TO_DM_FULL_CAMPAIGN_WORKFLOW_FIXTURE;

  assert.equal(campaign.id, "campaign.creator-kit");
  assert.deepEqual(campaign.campaignSpec.nodes, campaign.canvasState.nodes);
  assert.deepEqual(campaign.campaignSpec.edges, campaign.canvasState.edges);
  assert.deepEqual(validateCampaignCanvasEdit(campaign.canvasState), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(validateCampaignTrackingConfiguration(campaign.tracking), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(
    campaign.canvasState.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      pluginId: node.properties?.pluginId,
      capabilityId: node.properties?.capabilityId,
    })),
    expected.nodes,
  );
  assert.deepEqual(
    campaign.canvasState.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourcePort: edge.sourcePort,
      target: edge.target,
      targetPort: edge.targetPort,
    })),
    expected.edges,
  );
  assert.deepEqual(
    campaign.plugins.map((plugin) => ({
      pluginId: plugin.pluginId,
      type: plugin.type,
      lifecycleState: plugin.lifecycleState,
      permissionMode: plugin.permissionMode,
      capabilityIds: plugin.capabilityIds,
    })),
    expected.plugins,
  );
});

test("URL routing fixture has matching app routes for plugin APIs and canvas entry", () => {
  assert.deepEqual(
    routeConfig.map((route) => route.path),
    [
      undefined,
      "api/agent/plugins",
      "api/campaigns/:campaignId",
      "api/campaigns/:campaignId/measurement-goals",
      "api/plugin-kinds",
      "api/plugin-kinds/:pluginType",
      "campaigns/:campaignId/canvas",
    ],
  );
});
