import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseCampaignSpecJsonEdit,
  serializeCampaignSpecJson,
  validateCampaignCanvasEdit,
  createBlankCampaign,
  ingestInstagramCommentEventIntoCampaignWorkflow,
  loadActivatedPluginsIntoAgentWorkflowRuntime,
} from "../../creative-canvas/model/creative-canvas.ts";
import {
  INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD,
  LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
  createInstagramDmTrackedLandingUrl,
  createInstagramDmDispatchAdapter,
  executeInstagramCommentDmLandingFlow,
  mapDmResponseEventToLandingDestinationMetadata,
  resolveInstagramDmGateActionOutcome,
  selectInstagramDmResponseForCommentEvent,
  validateInstagramDmActionConfiguration,
  validateLandingFlowDestinationMappingAction,
} from "./plugin-representation.ts";
import {
  COMMENT_TO_DM_ACCOUNT_ID,
  COMMENT_TO_DM_CAMPAIGN_ID,
  COMMENT_TO_DM_CAPABILITY_ID,
  COMMENT_TO_DM_GATE_RESOURCE_URL,
  COMMENT_TO_DM_LANDING_URL,
  COMMENT_TO_DM_PLUGIN_ID,
  commentToDmFixturePluginMetadata,
  commentToDmActionConfigurationFixture,
  commentToDmAppliedConfigurationFixture,
  commentToDmLandingWorkflowPluginCatalogFixture,
  commentToDmLandingWorkflowConfigurationFixture,
  commentToDmLandingSampleIoFixture,
  commentToDmPluginFixture,
  createDmExecutionRequestFromSelectionFixture,
  instagramDmGateActionConfigurationFixture,
  matchingCommentEventFixture,
  nonMatchingCommentEventFixture,
} from "./instagram-comment-dm-flow.fixtures.ts";

test("fixture plugin metadata defines the comment trigger DM response and landing action", () => {
  assert.deepEqual(commentToDmFixturePluginMetadata, {
    trigger: {
      pluginId: COMMENT_TO_DM_PLUGIN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      nodeKind: "instagram.comment.trigger",
      title: "Instagram comment trigger",
      schemaVersion: "owncanvas.instagram-comment-trigger-configuration.v1",
      eventSchemaVersion: "owncanvas.instagram-comment-trigger-event.v1",
      inputPorts: [],
      outputPorts: [{ id: "outputs.comment", dataType: "event" }],
    },
    dmResponseAction: {
      pluginId: COMMENT_TO_DM_PLUGIN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      nodeKind: "instagram.dm.response",
      title: "Instagram DM response action",
      schemaVersion: "owncanvas.instagram-dm-action-configuration.v1",
      executionSchemaVersion: "owncanvas.instagram-dm-action-execution.v1",
      inputPorts: [{ id: "inputs.event", dataType: "event" }],
      outputPorts: [{ id: "outputs.delivery", dataType: "event" }],
    },
    landingPageAction: {
      pluginId: "plugin.landing-page.fixture",
      capabilityId: "cap.publish-landing-page",
      nodeKind: "landing.page.publish-redirect",
      title: "Landing-page publish and redirect action",
      schemaVersion: "owncanvas.landing-page-handoff-payload.v1",
      actionSchemaVersion: "owncanvas.landing-flow-destination-mapping.v1",
      inputPorts: [
        { id: "inputs.creative", dataType: "json" },
        { id: "inputs.dmReferralContext", dataType: "json" },
      ],
      outputPorts: [
        { id: "outputs.url", dataType: "url" },
        { id: "outputs.conversionEvent", dataType: "event" },
      ],
    },
  });
});

test("sample workflow fixture models comment-to-DM-to-landing orchestration with synced canvas JSON", () => {
  const fixture = commentToDmLandingWorkflowConfigurationFixture;

  assert.equal(fixture.id, COMMENT_TO_DM_CAMPAIGN_ID);
  assert.equal(fixture.title, "Instagram comment-to-DM landing workflow");
  assert.deepEqual(
    fixture.canvasState,
    {
      nodes: fixture.campaignSpec.nodes,
      edges: fixture.campaignSpec.edges,
    },
  );
  assert.deepEqual(validateCampaignCanvasEdit(fixture.canvasState), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(
    fixture.campaignSpec.nodes.map((node) => [node.id, node.kind]),
    [
      ["node.instagram-comment", "dm"],
      ["node.instagram-dm", "dm"],
      ["node.landing-page", "landing"],
      ["node.conversion-tracking", "custom"],
    ],
  );
  assert.deepEqual(
    fixture.campaignSpec.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourcePort: edge.sourcePort,
      target: edge.target,
      targetPort: edge.targetPort,
    })),
    [
      {
        id: "edge.comment-to-dm",
        source: "node.instagram-comment",
        sourcePort: "outputs.comment",
        target: "node.instagram-dm",
        targetPort: "inputs.event",
      },
      {
        id: "edge.dm-to-landing",
        source: "node.instagram-dm",
        sourcePort: "outputs.delivery",
        target: "node.landing-page",
        targetPort: "inputs.dmReferralContext",
      },
      {
        id: "edge.landing-to-conversion",
        source: "node.landing-page",
        sourcePort: "outputs.conversionEvent",
        target: "node.conversion-tracking",
        targetPort: "inputs.event",
      },
    ],
  );
  assert.deepEqual(
    fixture.plugins.map((plugin) => ({
      pluginId: plugin.pluginId,
      lifecycleState: plugin.lifecycleState,
      permissionMode: plugin.permissionMode,
      installedBy: plugin.installedBy,
      configuredBy: plugin.configuredBy,
      activatedBy: plugin.activatedBy,
    })),
    [
      {
        pluginId: COMMENT_TO_DM_PLUGIN_ID,
        lifecycleState: "active",
        permissionMode: "basic",
        installedBy: "agent",
        configuredBy: "agent",
        activatedBy: "agent",
      },
      {
        pluginId: "plugin.landing-page.fixture",
        lifecycleState: "active",
        permissionMode: "basic",
        installedBy: "human",
        configuredBy: "agent",
        activatedBy: "agent",
      },
      {
        pluginId: "plugin.tracking.fixture",
        lifecycleState: "active",
        permissionMode: "advanced",
        installedBy: "agent",
        configuredBy: "agent",
        activatedBy: "agent",
      },
    ],
  );
  assert.deepEqual(fixture.tracking.conversions, ["purchase"]);
  assert.deepEqual(fixture.tracking.attribution.touchpoints, [
    "instagram.comment",
    "instagram.dm",
    "landing.page",
    "checkout.purchase",
  ]);

  const roundTrip = parseCampaignSpecJsonEdit(
    fixture,
    serializeCampaignSpecJson(fixture),
  );

  assert.equal(roundTrip.valid, true);
  if (!roundTrip.valid) {
    assert.fail("Expected workflow fixture campaign spec to round-trip.");
  }
  assert.deepEqual(roundTrip.campaign.campaignSpec, fixture.campaignSpec);
});

test("sample workflow fixture includes plugin definitions required by configured workflow plugins", () => {
  const fixture = commentToDmLandingWorkflowConfigurationFixture;
  const catalog = commentToDmLandingWorkflowPluginCatalogFixture;

  assert.deepEqual(
    fixture.plugins.map((plugin) => plugin.pluginId),
    catalog.plugins.map((plugin) => plugin.id),
  );

  fixture.plugins.forEach((workflowPlugin) => {
    const manifest = catalog.plugins.find(
      (plugin) => plugin.id === workflowPlugin.pluginId,
    );

    assert.ok(manifest, `Expected manifest for ${workflowPlugin.pluginId}`);
    assert.equal(manifest.type, workflowPlugin.type);
    assert.deepEqual(
      workflowPlugin.capabilityIds,
      manifest.capabilities.map((capability) => capability.id),
    );
  });

  const runtime = loadActivatedPluginsIntoAgentWorkflowRuntime(
    fixture,
    catalog,
    {
      mode: "advanced",
      now: () => "2026-05-11T00:04:00.000Z",
    },
  );

  assert.deepEqual(runtime.errors, []);
  assert.deepEqual(
    runtime.plugins.map((plugin) => ({
      pluginId: plugin.pluginId,
      type: plugin.type,
      capabilities: plugin.capabilities.map((capability) => capability.id),
    })),
    [
      {
        pluginId: COMMENT_TO_DM_PLUGIN_ID,
        type: "direct-message",
        capabilities: [COMMENT_TO_DM_CAPABILITY_ID],
      },
      {
        pluginId: "plugin.landing-page.fixture",
        type: "landing",
        capabilities: ["cap.publish-landing-page"],
      },
      {
        pluginId: "plugin.tracking.fixture",
        type: "tracking",
        capabilities: ["cap.track-purchase-conversion"],
      },
    ],
  );
});

test("sample workflow fixture loads from JSON and interprets comment-to-DM-to-landing end-to-end", async () => {
  const loadedFixture = JSON.parse(
    JSON.stringify(commentToDmLandingWorkflowConfigurationFixture),
  ) as typeof commentToDmLandingWorkflowConfigurationFixture;
  const specRoundTrip = parseCampaignSpecJsonEdit(
    loadedFixture,
    serializeCampaignSpecJson(loadedFixture),
  );

  assert.equal(specRoundTrip.valid, true);
  if (!specRoundTrip.valid) {
    assert.fail("Expected serialized fixture campaign spec to load.");
  }

  const loadedCampaign = specRoundTrip.campaign;
  const runtime = loadActivatedPluginsIntoAgentWorkflowRuntime(
    loadedCampaign,
    commentToDmLandingWorkflowPluginCatalogFixture,
    {
      mode: "advanced",
      now: () => "2026-05-11T00:04:00.000Z",
    },
  );
  const workflowEdges = loadedCampaign.campaignSpec.edges.map((edge) => ({
    source: edge.source,
    sourcePort: edge.sourcePort,
    target: edge.target,
    targetPort: edge.targetPort,
  }));

  assert.deepEqual(runtime.errors, []);
  assert.deepEqual(workflowEdges, [
    {
      source: "node.instagram-comment",
      sourcePort: "outputs.comment",
      target: "node.instagram-dm",
      targetPort: "inputs.event",
    },
    {
      source: "node.instagram-dm",
      sourcePort: "outputs.delivery",
      target: "node.landing-page",
      targetPort: "inputs.dmReferralContext",
    },
    {
      source: "node.landing-page",
      sourcePort: "outputs.conversionEvent",
      target: "node.conversion-tracking",
      targetPort: "inputs.event",
    },
  ]);

  const sentMessages: unknown[] = [];
  const adapter = createInstagramDmDispatchAdapter({
    async sendDirectMessage(message) {
      sentMessages.push(message);

      return {
        messageId: "ig.dm.fixture",
        metadata: {
          providerRequestId: "req.instagram.fixture",
        },
      };
    },
  });
  const interpretedFlow = await executeInstagramCommentDmLandingFlow({
    configuration: commentToDmActionConfigurationFixture,
    commentEvent: matchingCommentEventFixture,
    dmExecutor: adapter,
    dmContext: {
      plugin: commentToDmPluginFixture,
      configuration: commentToDmAppliedConfigurationFixture,
      now: () => "2026-05-11T00:02:01.000Z",
    },
    landingAction: commentToDmLandingSampleIoFixture.output
      .landingPageDestinationState,
    createDmExecutionRequest: createDmExecutionRequestFromSelectionFixture,
  });

  assert.equal(interpretedFlow.ok, true);
  if (!interpretedFlow.ok) {
    assert.fail("Expected loaded workflow fixture to interpret end-to-end.");
  }

  assert.deepEqual(sentMessages, [
    {
      accountId: COMMENT_TO_DM_ACCOUNT_ID,
      recipientId: "ig.user.fixture",
      text: `Here is your private launch link: ${COMMENT_TO_DM_LANDING_URL}`,
      landingUrl: COMMENT_TO_DM_LANDING_URL,
      metadata: {
        campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
        capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
        executionId: "exec.instagram-dm.fixture",
        requestedBy: "agent",
        triggerEventId: "evt.instagram-comment.matching",
        matcherId: "condition.drop-link",
        mappingId: "mapping.drop-link",
      },
    },
  ]);
  assert.deepEqual(interpretedFlow.landingDestination, {
    ...commentToDmLandingSampleIoFixture.output.landingPageDestinationState,
    sourceDmResponse: {
      pluginId: COMMENT_TO_DM_PLUGIN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      responseEventId: "exec.instagram-dm.fixture",
      channel: "instagram",
      status: "delivered",
      messageId: "ig.dm.fixture",
    },
  });
});

test("sample IO fixture shows Instagram comment input DM payload output and landing destination state", () => {
  const sample = commentToDmLandingSampleIoFixture;

  assert.deepEqual(sample.input.instagramCommentEvent, matchingCommentEventFixture);
  assert.equal(sample.output.generatedDmPayload.triggerEvent.commentId, "ig.comment.matching");
  assert.equal(
    sample.output.generatedDmPayload.message.text,
    `Here is your private launch link: ${COMMENT_TO_DM_LANDING_URL}`,
  );
  assert.deepEqual(sample.output.generatedDmPayload.metadata, {
    matcherId: "condition.drop-link",
    mappingId: "mapping.drop-link",
  });
  assert.deepEqual(sample.output.landingPageDestinationState.sourceDmResponse, {
    pluginId: COMMENT_TO_DM_PLUGIN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    responseEventId: "exec.instagram-dm.fixture",
    channel: "instagram",
    status: "delivered",
    messageId: "ig.dm.fixture",
  });
  assert.deepEqual(sample.output.landingPageDestinationState.landingDestination, {
    landingPageId: "landing.fixture.drop",
    pageType: "content-commerce",
    url: COMMENT_TO_DM_LANDING_URL,
    checkoutUrl: "https://shop.example.test/checkout/drop",
    preserveImmersion: true,
  });
  assert.deepEqual(
    validateLandingFlowDestinationMappingAction(
      sample.output.landingPageDestinationState,
    ),
    {
      ok: true,
      errors: [],
    },
  );
});

test("comment ingestion fixture appends a normalized workflow event with attribution", () => {
  const campaign = {
    ...createBlankCampaign(),
    id: COMMENT_TO_DM_CAMPAIGN_ID,
  };

  const result = ingestInstagramCommentEventIntoCampaignWorkflow(
    campaign,
    matchingCommentEventFixture,
    {
      pluginId: COMMENT_TO_DM_PLUGIN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      sourceNodeId: "node.instagram-comment",
      outputPort: "outputs.comment",
      targetNodeId: "node.instagram-dm",
      targetInputPort: "inputs.event",
      now: () => "2026-05-11T00:00:02.000Z",
    },
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail("Expected comment ingestion fixture to be valid.");
  }

  assert.deepEqual(result.event.source, {
    pluginId: COMMENT_TO_DM_PLUGIN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    channel: "instagram",
    trigger: "comment",
    providerEventId: "evt.instagram-comment.matching",
    accountId: COMMENT_TO_DM_ACCOUNT_ID,
    mediaId: "ig.media.fixture",
    commentId: "ig.comment.matching",
    permalink: "https://www.instagram.com/p/DROP001/c/ig.comment.matching/",
  });
  assert.deepEqual(result.event.workflow, {
    sourceNodeId: "node.instagram-comment",
    outputPort: "outputs.comment",
    targetNodeId: "node.instagram-dm",
    targetInputPort: "inputs.event",
  });
  assert.deepEqual(result.event.attribution, {
    source: "instagram",
    medium: "comment",
    campaign: COMMENT_TO_DM_CAMPAIGN_ID,
    content: "ig.media.fixture",
    term: "Please send the DROP link",
    touchpoint: "instagram.comment",
  });
  assert.deepEqual(result.campaign.tracking.events, [
    "instagram.comment.created",
  ]);
  assert.deepEqual(result.campaign.tracking.attribution.touchpoints, [
    "instagram.comment",
  ]);
});

test("comment-to-DM rule fixture selects a mapped response and skips unmatched comments", () => {
  const matchedSelection = selectInstagramDmResponseForCommentEvent(
    commentToDmActionConfigurationFixture,
    matchingCommentEventFixture,
  );

  assert.deepEqual(matchedSelection, {
    matched: true,
    matcherId: "condition.drop-link",
    mappingId: "mapping.drop-link",
    message: {
      templateId: "template.drop-link",
      text: "Here is your private launch link: {{landingUrl}}",
    },
    landingUrl: COMMENT_TO_DM_LANDING_URL,
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      content: "ig.media.fixture",
      term: "Please send the DROP link",
    },
  });

  assert.deepEqual(
    selectInstagramDmResponseForCommentEvent(
      commentToDmActionConfigurationFixture,
      nonMatchingCommentEventFixture,
    ),
    {
      matched: false,
      reason: "no_matching_response_mapping",
    },
  );
});

test("DM Gate fixture uses the canonical Instagram DM action configuration", () => {
  assert.deepEqual(
    validateInstagramDmActionConfiguration(
      instagramDmGateActionConfigurationFixture,
    ),
    {
      ok: true,
      errors: [],
    },
  );
  assert.equal(
    instagramDmGateActionConfigurationFixture.schemaVersion,
    "owncanvas.instagram-dm-action-configuration.v1",
  );
  assert.equal(
    instagramDmGateActionConfigurationFixture.capabilityId,
    COMMENT_TO_DM_CAPABILITY_ID,
  );
  assert.equal(
    instagramDmGateActionConfigurationFixture.responseMappings.length,
    1,
  );

  assert.deepEqual(
    selectInstagramDmResponseForCommentEvent(
      instagramDmGateActionConfigurationFixture,
      matchingCommentEventFixture,
    ),
    {
      matched: true,
      matcherId: "condition.drop-link",
      mappingId: "mapping.drop-guide",
      message: {
        templateId: "template.drop-guide",
        text: "Your private launch guide is ready: {{resourceUrl}}",
      },
      landingUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
      resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: COMMENT_TO_DM_CAMPAIGN_ID,
        content: "ig.media.fixture",
        term: "Please send the DROP link",
      },
    },
  );

  assert.deepEqual(
    resolveInstagramDmGateActionOutcome(
      instagramDmGateActionConfigurationFixture,
      matchingCommentEventFixture,
    ),
    {
      matched: true,
      matcherId: "condition.drop-link",
      mappingId: "mapping.drop-guide",
      events: ["prompt_sent"],
      message: {
        templateId: "template.follow-prompt",
        text: "Follow @owncanvas.fixture, then tap I follow to get the private launch guide.",
      },
      resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
      quickReplies: [
        {
          contentType: "text",
          title: "I follow",
          payload: INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD,
        },
      ],
    },
  );
  assert.deepEqual(
    resolveInstagramDmGateActionOutcome(
      instagramDmGateActionConfigurationFixture,
      matchingCommentEventFixture,
      { quickReplyPayload: INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD },
    ),
    {
      matched: true,
      matcherId: "condition.drop-link",
      mappingId: "mapping.drop-guide",
      events: [
        "follow_check_requested",
        "resource_link_ready",
        "resource_link_sent",
      ],
      followStatus: "following",
      message: {
        text: "You are following. Here is the guide: {{resourceUrl}}",
      },
      resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
      checkQuickReply: {
        contentType: "text",
        title: "I follow",
        payload: INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD,
      },
    },
  );
  assert.deepEqual(
    resolveInstagramDmGateActionOutcome(
      instagramDmGateActionConfigurationFixture,
      nonMatchingCommentEventFixture,
    ),
    {
      matched: false,
      reason: "no_matching_response_mapping",
      events: ["no_match"],
    },
  );
});

test("selected DM response inputs render recipient message and audit metadata", () => {
  const selection = selectInstagramDmResponseForCommentEvent(
    commentToDmActionConfigurationFixture,
    matchingCommentEventFixture,
  );

  assert.equal(selection.matched, true);
  if (!selection.matched) {
    assert.fail("Expected comment-to-DM fixture to select a response.");
  }

  assert.deepEqual(createDmExecutionRequestFromSelectionFixture(selection), {
    schemaVersion: "owncanvas.instagram-dm-action-execution.v1",
    id: "exec.instagram-dm.fixture",
    campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    requestedAt: "2026-05-11T00:02:00.000Z",
    requestedBy: "agent",
    triggerEvent: matchingCommentEventFixture,
    recipient: {
      instagramUserId: "ig.user.fixture",
      username: "creativebuyer",
    },
    message: {
      templateId: "template.drop-link",
      text: `Here is your private launch link: ${COMMENT_TO_DM_LANDING_URL}`,
    },
    landingUrl: COMMENT_TO_DM_LANDING_URL,
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      content: "ig.media.fixture",
      term: "Please send the DROP link",
    },
    metadata: {
      matcherId: "condition.drop-link",
      mappingId: "mapping.drop-link",
    },
  });
});

test("DM tracking parameters include campaign attribution and referral context", () => {
  const trackedUrl = createInstagramDmTrackedLandingUrl({
    landingUrl: "https://shop.example.test/drop?variant=short",
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      content: "ig.media.fixture",
      term: "Please send the DROP link",
    },
    sourceDm: {
      pluginId: COMMENT_TO_DM_PLUGIN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      deliveryEventId: "exec.instagram-dm.fixture",
      triggerEventId: "evt.instagram-comment.matching",
    },
    visitor: {
      platformUserId: "ig.user.fixture",
      username: "creativebuyer",
    },
    offer: {
      productId: "product.fixture",
      offerId: "offer.fixture",
    },
    touchpointId: "touch.instagram-dm.fixture",
  });

  assert.equal(
    trackedUrl,
    "https://shop.example.test/drop?variant=short&utm_source=instagram&utm_medium=dm&utm_campaign=campaign.comment-to-dm.fixture&utm_content=ig.media.fixture&utm_term=Please+send+the+DROP+link&oc_dm_plugin_id=plugin.instagram-comment-dm.fixture&oc_dm_capability_id=cap.instagram-comment-to-dm&oc_dm_delivery_event_id=exec.instagram-dm.fixture&oc_dm_trigger_event_id=evt.instagram-comment.matching&oc_platform_user_id=ig.user.fixture&oc_username=creativebuyer&oc_touchpoint_id=touch.instagram-dm.fixture&oc_product_id=product.fixture&oc_offer_id=offer.fixture",
  );
});

test("DM dispatch fixture sends the selected response through the configured account", async () => {
  const selection = selectInstagramDmResponseForCommentEvent(
    commentToDmActionConfigurationFixture,
    matchingCommentEventFixture,
  );

  assert.equal(selection.matched, true);
  if (!selection.matched) {
    assert.fail("Expected comment-to-DM fixture to select a response.");
  }

  const sentMessages: unknown[] = [];
  const adapter = createInstagramDmDispatchAdapter({
    async sendDirectMessage(message) {
      sentMessages.push(message);

      return {
        messageId: "ig.dm.fixture",
        metadata: {
          providerRequestId: "req.instagram.fixture",
        },
      };
    },
  });

  const response = await adapter.execute(
    createDmExecutionRequestFromSelectionFixture(selection),
    {
      plugin: commentToDmPluginFixture,
      configuration: commentToDmAppliedConfigurationFixture,
      now: () => "2026-05-11T00:02:01.000Z",
    },
  );

  assert.deepEqual(sentMessages, [
    {
      accountId: COMMENT_TO_DM_ACCOUNT_ID,
      recipientId: "ig.user.fixture",
      text: `Here is your private launch link: ${COMMENT_TO_DM_LANDING_URL}`,
      landingUrl: COMMENT_TO_DM_LANDING_URL,
      metadata: {
        campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
        capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
        executionId: "exec.instagram-dm.fixture",
        requestedBy: "agent",
        triggerEventId: "evt.instagram-comment.matching",
        matcherId: "condition.drop-link",
        mappingId: "mapping.drop-link",
      },
    },
  ]);
  assert.deepEqual(response, {
    schemaVersion: "owncanvas.instagram-dm-action-execution.v1",
    requestId: "exec.instagram-dm.fixture",
    campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    status: "delivered",
    occurredAt: "2026-05-11T00:02:01.000Z",
    delivery: {
      channel: "instagram",
      recipientId: "ig.user.fixture",
      messageId: "ig.dm.fixture",
      landingUrl: COMMENT_TO_DM_LANDING_URL,
    },
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      content: "ig.media.fixture",
      term: "Please send the DROP link",
    },
    metadata: {
      providerRequestId: "req.instagram.fixture",
    },
  });
});

test("delivered DM responses select the sent landing destination for handoff", () => {
  const mapping = mapDmResponseEventToLandingDestinationMetadata({
    dmResponse: {
      schemaVersion: "owncanvas.instagram-dm-action-execution.v1",
      requestId: "exec.instagram-dm.fixture",
      campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      status: "delivered",
      occurredAt: "2026-05-11T00:02:01.000Z",
      delivery: {
        channel: "instagram",
        recipientId: "ig.user.fixture",
        messageId: "ig.dm.fixture",
        landingUrl: COMMENT_TO_DM_LANDING_URL,
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: COMMENT_TO_DM_CAMPAIGN_ID,
        content: "ig.media.fixture",
        term: "Please send the DROP link",
      },
    },
    action: {
      schemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
      id: "landing-flow.map.fixture",
      campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
      requestedAt: "2026-05-11T00:02:02.000Z",
      requestedBy: "agent",
      sourceDmResponse: {
        pluginId: COMMENT_TO_DM_PLUGIN_ID,
        capabilityId: "placeholder.capability",
        responseEventId: "placeholder.response",
        status: "queued",
      },
      landingDestination: {
        landingPageId: "landing.fixture.drop",
        pageType: "content-commerce",
        url: "https://placeholder.example.test/landing",
        checkoutUrl: "https://shop.example.test/checkout/drop",
        preserveImmersion: true,
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      },
    },
  });

  assert.deepEqual(mapping.sourceDmResponse, {
    pluginId: COMMENT_TO_DM_PLUGIN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    responseEventId: "exec.instagram-dm.fixture",
    channel: "instagram",
    status: "delivered",
    messageId: "ig.dm.fixture",
  });
  assert.deepEqual(mapping.landingDestination, {
    landingPageId: "landing.fixture.drop",
    pageType: "content-commerce",
    url: COMMENT_TO_DM_LANDING_URL,
    checkoutUrl: "https://shop.example.test/checkout/drop",
    preserveImmersion: true,
  });
  assert.deepEqual(mapping.attribution, {
    source: "instagram",
    medium: "dm",
    campaign: COMMENT_TO_DM_CAMPAIGN_ID,
    content: "ig.media.fixture",
    term: "Please send the DROP link",
  });
});

test("qualifying DM responses trigger tracked landing-page destination mappings", async () => {
  const sentMessages: unknown[] = [];
  const adapter = createInstagramDmDispatchAdapter({
    async sendDirectMessage(message) {
      sentMessages.push(message);

      return {
        messageId: "ig.dm.fixture",
        metadata: {
          providerRequestId: "req.instagram.fixture",
        },
      };
    },
  });

  const result = await executeInstagramCommentDmLandingFlow({
    configuration: commentToDmActionConfigurationFixture,
    commentEvent: matchingCommentEventFixture,
    dmExecutor: adapter,
    dmContext: {
      plugin: commentToDmPluginFixture,
      configuration: commentToDmAppliedConfigurationFixture,
      now: () => "2026-05-11T00:02:01.000Z",
    },
    landingAction: {
      schemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
      id: "landing-flow.map.fixture",
      campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
      requestedAt: "2026-05-11T00:02:02.000Z",
      requestedBy: "agent",
      sourceDmResponse: {
        pluginId: COMMENT_TO_DM_PLUGIN_ID,
        capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
        responseEventId: "",
        status: "queued",
      },
      landingDestination: {
        landingPageId: "landing.fixture.drop",
        pageType: "content-commerce",
        url: "https://placeholder.example.test/landing",
        checkoutUrl: "https://shop.example.test/checkout/drop",
        preserveImmersion: true,
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      },
      offer: {
        productId: "product.fixture",
        offerId: "offer.fixture",
      },
    },
    createDmExecutionRequest: createDmExecutionRequestFromSelectionFixture,
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail("Expected a matching comment to trigger a landing mapping.");
  }

  assert.equal(sentMessages.length, 1);
  assert.equal(result.dmResponse.status, "delivered");
  assert.deepEqual(
    validateLandingFlowDestinationMappingAction(result.landingDestination),
    {
      ok: true,
      errors: [],
    },
  );
  assert.deepEqual(result.landingDestination.sourceDmResponse, {
    pluginId: COMMENT_TO_DM_PLUGIN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    responseEventId: "exec.instagram-dm.fixture",
    channel: "instagram",
    status: "delivered",
    messageId: "ig.dm.fixture",
  });
  assert.deepEqual(result.landingDestination.landingDestination, {
    landingPageId: "landing.fixture.drop",
    pageType: "content-commerce",
    url: COMMENT_TO_DM_LANDING_URL,
    checkoutUrl: "https://shop.example.test/checkout/drop",
    preserveImmersion: true,
  });
  assert.deepEqual(result.landingDestination.attribution, {
    source: "instagram",
    medium: "dm",
    campaign: COMMENT_TO_DM_CAMPAIGN_ID,
    content: "ig.media.fixture",
    term: "Please send the DROP link",
  });
});

test("non-qualifying DM responses do not send DMs or map landing destinations", async () => {
  const sentMessages: unknown[] = [];
  let executionRequestCreated = false;
  const adapter = createInstagramDmDispatchAdapter({
    async sendDirectMessage(message) {
      sentMessages.push(message);

      return {
        messageId: "ig.dm.unexpected",
      };
    },
  });

  const result = await executeInstagramCommentDmLandingFlow({
    configuration: commentToDmActionConfigurationFixture,
    commentEvent: nonMatchingCommentEventFixture,
    dmExecutor: adapter,
    dmContext: {
      plugin: commentToDmPluginFixture,
      configuration: commentToDmAppliedConfigurationFixture,
      now: () => "2026-05-11T00:02:01.000Z",
    },
    landingAction: {
      schemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
      id: "landing-flow.map.fixture",
      campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
      requestedAt: "2026-05-11T00:02:02.000Z",
      requestedBy: "agent",
      sourceDmResponse: {
        pluginId: COMMENT_TO_DM_PLUGIN_ID,
        capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
        responseEventId: "",
        status: "queued",
      },
      landingDestination: {
        landingPageId: "landing.fixture.drop",
        pageType: "content-commerce",
        url: "https://placeholder.example.test/landing",
        preserveImmersion: true,
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      },
    },
    createDmExecutionRequest(selection) {
      executionRequestCreated = true;

      return createDmExecutionRequestFromSelectionFixture(selection);
    },
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "no_matching_response_mapping",
    selection: {
      matched: false,
      reason: "no_matching_response_mapping",
    },
  });
  assert.deepEqual(sentMessages, []);
  assert.equal(executionRequestCreated, false);
});
