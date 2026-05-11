# Plugin Representation

OwnCanvas plugins use the shared `BasePluginManifest` shape behind
`PluginManifest` in `plugin-representation.ts`. Plugin types do not copy
identity, lifecycle, origin, metadata, permissions, capabilities, or
configuration fields into separate top-level schemas. They extend the shared
representation by choosing a `type`, declaring capabilities, exposing explicit
input/output ports, and adding only type-specific detail or configuration fields
that are unique to the integration.

## Shared Manifest Contract

Every plugin uses these common fields once:

- `schemaVersion`, `id`, `name`, `version`: stable package identity.
- `type`: the plugin category used by the canvas and installer.
- `lifecycle`: install, configure, activate, deactivate, error, and uninstall
  state.
- `origin`: built-in or external package provenance.
- `metadata`: display name, description, documentation, license, author, icon,
  and tags.
- `permissions`: basic or advanced mode, human/agent install and configuration
  rights, and approval requirements.
- `capabilities`: executable or representable behavior with concurrency and
  ports.
- `configuration`: user, workspace, or campaign-scoped settings.

## Registry and Agent Discovery

The plugin kind registry API is the source of truth for supported plugin
categories:

- `PluginKindDefinition` describes one supported kind/type, its campaign role,
  allowed capability kinds, built-in/external origin support, default permission
  mode, and any required type-specific detail key.
- `registerPluginKind()` and `createPluginKindRegistry()` build immutable
  registries while rejecting duplicate kind registrations.
- `DEFAULT_PLUGIN_KIND_REGISTRY` registers every supported OwnCanvas plugin
  kind: `provider`, `commission`, `agent`, `dashboard`, `direct-message`,
  `landing`, `tracking`, and `custom`.
- `listPluginKindDefinitions()`, `getPluginKindDefinition()`, and
  `isSupportedPluginType()` expose the registry to installers, canvas palette
  code, agents, and future catalog APIs without requiring them to inspect
  individual plugin manifests.
- `GET /api/plugin-kinds` enumerates the registered kinds as stable discovery
  JSON with metadata, and `GET /api/plugin-kinds/:pluginType` returns one kind
  or a `plugin_kind.not_found` 404 payload.

Plugin registries/catalogs use `PluginCatalog`, an appendable list of
`PluginManifest` entries with a catalog ID and update timestamp. Agents list
catalog options through `listDiscoverablePluginsForAgent()`, which returns a
safe summary of plugins whose lifecycle is `available` and whose permissions
include `agent` in `installableBy`.

The discovery summary exposes identity, type, lifecycle state, built-in or
external origin, display metadata, permission mode, approval requirements,
capability kinds, and whether any capability supports parallel or bulk
execution. It does not expose configuration values or secrets, so agents can
choose install candidates without reading user/workspace credentials.

`createPluginDefaultConfigurationSchema()` derives safe configuration metadata
from a manifest for installer UIs and agent configuration flows. It exposes the
plugin ID/type, permission mode, configurable actors, field labels/types/scopes,
required keys, non-secret `defaultValue` entries, and `secretRef` pointers.
Secret field default values are never copied into the returned `defaults.values`
object; callers receive only the secret reference metadata needed to request or
bind credentials.

When an agent installs a plugin, OwnCanvas applies this default configuration
schema to `appliedConfiguration`. Non-secret defaults become values, secret
defaults become `secretRefs`, and required fields without either remain listed
as `missingRequiredKeys`; plugins with no missing required keys enter the
`configured` lifecycle state immediately.

Durable plugin storage keeps installed catalog/runtime metadata and applied
configuration settings in separate records. `persistPluginCatalog()` writes the
catalog to `PLUGIN_CATALOG_STORAGE_KEY` without embedding `appliedConfiguration`,
then writes applied settings by plugin ID to `PLUGIN_CONFIGURATION_STORAGE_KEY`.
`getPersistedPluginCatalog()` rehydrates those settings onto the manifest view
for callers that need the configured plugin model.

Agents can also list installed inventory through `listInstalledPluginsForAgent()`.
That summary includes installed/configured/active/inactive/error lifecycle
states, the current activation state, lifecycle timestamps, agent configuration
eligibility, approval requirements, and capability kinds. It intentionally keeps
configuration schemas, configured values, and secret references out of the
response.

After installation, agents list selectable workflow behavior through
`listSelectableWorkflowCapabilitiesForAgent()`. It only returns capabilities
from plugins whose lifecycle is `installed`, `configured`, or `active`, whose
configuration permissions include `agent`, whose capabilities expose explicit
input/output ports, and whose type-specific validation passes. Basic mode only
returns basic plugins; advanced mode can return both basic and advanced plugins.
Each selectable capability includes plugin identity, type, origin, approval
requirements, port definitions, concurrency flags, and a `canvas.node.create`
selection payload. It does not expose configuration values or secrets.

Most type-specific behavior belongs in `capabilities` and `configuration`, not
in duplicate manifest fields. For example, both a built-in image provider and an
external attribution vendor use the same lifecycle and permission structures;
they differ through capability kinds, port data types, concurrency, and required
configuration fields. A provider also has a narrow `provider` detail object for
provider kind, media types, execution mode, and advanced-provider status because
the canvas and installer need those facts before a capability runs.

## Plugin Type Mapping

| Plugin type | Campaign role | Extension through shared representation |
| --- | --- | --- |
| `provider` | Supplies generation or model execution for text, image, video, voice, or mixed media blocks. | Extends the shared manifest with the `provider` detail object for built-in/external provenance, media coverage, execution mode, and advanced-provider status. Uses `generate.text`, `generate.image`, `generate.video`, or `generate.voice` capabilities. Bulk image/video providers set `concurrency.supportsParallel` and `supportsBulk`, then expose prompt/storyboard/reference input ports and asset output ports. Typed provider configuration stores credentials, model defaults, endpoints, budgets, webhooks, rate limits, and safety controls. |
| `commission` | Resolves product offers, affiliate terms, referral links, and payout rules for commerce campaigns. | Extends the shared manifest with the `commission` detail object for commission model, supported offer sources, payout currencies, and attribution requirements. Uses `commission.offer` capabilities with `audience`, `product`, `url`, or `json` ports. Typed commission configuration stores network credentials/IDs, offer source rules, payout models, attribution windows, and approval rules. Tracking IDs flow through ports or campaign tracking config instead of being copied into a separate commission schema. |
| `agent` | Lets an autonomous agent inspect or mutate the campaign canvas using the same actions a human can perform. | Extends the shared manifest with the `agent` detail object for autonomy level, supported canvas actions, safety mode, and human approval requirement. Requires at least one `agent.action` capability with explicit action input and result output ports. Typed agent configuration stores instruction profiles, model selection, action policy, approval policy, and memory settings. Permissions decide whether basic mode allows read-only actions or advanced mode requires approval for execution, external publish, spend, or secret access. |
| `dashboard` | Adds analysis views, reporting panels, or experiment summaries over campaign results. | Extends the shared manifest with the `dashboard` detail object for report types, supported visualizations, realtime support, and export support. Requires `dashboard.report` capabilities, normally consuming `event` or `json` ports and returning `json` report data. Typed dashboard configuration stores metric definitions, attribution windows, report filters, visualization defaults, and export rules. It reads shared campaign tracking instead of redefining conversion fields. |
| `direct-message` | Represents comment-to-DM, keyword reply, and private-message delivery flows. | Extends the shared manifest with the `directMessage` detail object for channel, supported triggers, delivery modes, and compliance-review requirement. Requires `channel.dm` capabilities with input ports for campaign events or tracked landing URLs and a delivery event output port. Typed direct-message configuration stores channel account IDs, message templates, throttles, and compliance settings. |
| `landing` | Publishes immersive campaign landing destinations that preserve the creative-to-commerce path. | Extends the shared manifest with the `landing` detail object for page types, publish targets, checkout support, and immersion preservation. Requires `landing.page` capabilities with creative/product inputs and a URL output port. Typed landing configuration stores domains, page templates, checkout destinations, and publish defaults. Conversion tracking remains a shared tracking concern passed through ports or campaign config. |
| `tracking` | Captures UTM, analytics, attribution, funnel, and conversion events. | Uses `track.event` and `track.conversion` capabilities with `event`, `url`, and `json` ports. Configuration stores pixel IDs, API keys, attribution models, conversion event names, and privacy settings. This plugin type is the canonical extension point for final KPI measurement. |
| `custom` | Allows experimental or community-defined integrations that do not yet fit a stable category. | Uses `custom` capabilities until the behavior stabilizes into a first-class type. Custom plugins still use the shared lifecycle, permission, origin, capability, port, and configuration structures so they can be installed, activated, represented on the canvas, and audited consistently. |

## Extension Rules

1. Add a new plugin type only when its campaign role is stable and cannot be
   represented by an existing type plus capability kinds.
2. Add a new capability kind when the canvas needs to route, execute, or inspect
   a behavior distinctly.
3. Add a new port data type only when existing data types cannot describe the
   value exchanged between nodes.
4. Add provider-specific settings as typed provider `configuration.fields`; keep
   the top-level `provider` detail object limited to facts the canvas and
   installer need before execution.
5. Add commission-specific settings as typed commission `configuration.fields`;
   keep the top-level `commission` detail object limited to facts the canvas,
   installer, and offer resolver need before a tracked offer is selected.
6. Store cross-cutting safety and lifecycle behavior in `permissions` and
   `lifecycle`; do not redefine install, activation, approval, or actor fields
   per plugin type.
7. Keep campaign attribution and conversion semantics in tracking capabilities
   and campaign tracking config, then pass identifiers through ports when another
   plugin needs them.

## Configuration Validation

Provider configuration has both type-level schemas and runtime rules in
`plugin-representation.ts`.

- `ProviderConfigurationSchema`, `BuiltInProviderConfigurationSchema`, and
  `ExternalProviderConfigurationSchema` require at least one typed provider
  configuration field.
- `PROVIDER_CONFIGURATION_RULES` and
  `validateProviderPluginConfiguration()` validate installable provider
  manifests before activation.
- Provider origin and `provider.providerKind` must match.
- Provider plugins must expose at least one generation capability.
- Built-in providers cannot declare external-only endpoint, budget, or webhook
  configuration fields.
- Provider configuration keys must be unique.
- Each `providerConfigType` can only use compatible field types, such as
  `credential` with `secret`, `rate-limit` with `number`, and `safety` with
  `boolean`, `select`, or `json`.
- Numeric provider defaults must be greater than zero.

Commission configuration follows the same pattern with type-level schemas and
runtime rules.

- `CommissionConfigurationSchema` requires at least one typed commission
  configuration field.
- `COMMISSION_CONFIG_FIELD_TYPES`, `COMMISSION_CONFIGURATION_RULES`, and
  `validateCommissionPluginConfiguration()` validate commission manifests before
  activation.
- Commission plugins must expose a `commission.offer` capability so campaigns
  can resolve product offers and tracked commerce URLs.
- Commission configuration keys must be unique.
- Each `commissionConfigType` must be one of `network`, `offer`, `payout`,
  `attribution-window`, or `approval`.
- Network fields must match the plugin commission model.
- Offer source fields must be listed in `commission.supportedOfferSources`.
- Payout currency fields must be listed in `commission.payoutCurrencies`.
- Each `commissionConfigType` can only use compatible field types, such as
  `network` with `string`, `select`, or `secret`, `payout` with `number`,
  `select`, or `json`, and `attribution-window` with `number`.
- Commission plugins that require attribution must declare an
  `attribution-window` field.
- Numeric commission defaults must be greater than zero.

Agent configuration follows the same pattern with type-level schemas and runtime
rules.

- `AgentPluginManifest` requires an `agent` detail object, at least one
  `agent.action` capability, and at least one typed agent configuration field.
- `AgentPluginDetails` records autonomy, supported canvas actions, safety mode,
  and whether human approval is required.
- Supported actions are explicit canvas or campaign commands such as
  `canvas.node.create`, `canvas.node.update`, `canvas.edge.connect`, and
  `campaign.improve`.
- Each `agentConfigType` must be one of `instruction`, `model`,
  `action-policy`, `approval-policy`, or `memory`.
- Every `agent.action` capability must expose an `action` JSON input port and a
  `result` event output port so agent operations use the same explicit
  input/output port model as the canvas.
- `validateAgentPluginConfiguration()` rejects manifests that omit
  `agent.action`, omit configuration fields, duplicate configuration keys, use
  unknown agent configuration types, pair an agent configuration type with an
  incompatible field type, or omit the required action/result ports.

Dashboard configuration follows the same pattern with type-level schemas and
runtime rules.

- `DashboardPluginManifest` requires a `dashboard` detail object, at least one
  `dashboard.report` capability, and at least one typed dashboard configuration
  field.
- `DashboardPluginDetails` records supported report types, supported
  visualizations, realtime support, and export support.
- Each `dashboardConfigType` must be one of `metric`,
  `attribution-window`, `filter`, `visualization`, or `export`.
- `DASHBOARD_CONFIG_FIELD_TYPES`, `DASHBOARD_CONFIGURATION_RULES`, and
  `validateDashboardPluginConfiguration()` reject manifests that omit
  `dashboard.report`, omit configuration fields, duplicate configuration keys,
  use unknown dashboard configuration types, reference unsupported metric or
  visualization settings, pair a dashboard configuration type with an
  incompatible field type, or use non-positive numeric defaults.

Direct-message configuration follows the same pattern with type-level schemas
and runtime rules.

- `DirectMessagePluginManifest` requires a `directMessage` detail object, at
  least one `channel.dm` capability, and at least one typed direct-message
  configuration field.
- `DirectMessagePluginDetails` records channel, supported triggers, delivery
  modes, whether compliance review is required, and optional
  `automationConfigurationSchemas`, `actionConfigurationSchemas`,
  `triggerConfigurationSchemas`, and `triggerEventSchemas` for reusable DM
  automation setup, channel-specific action setup, trigger setup, and event
  contracts.
- `DM_AUTOMATION_CONFIGURATION_SCHEMA` defines the canonical
  `owncanvas.dm-automation-configuration.v1` setup shape for automated DM
  replies. It covers reusable reply templates, personalization variables
  sourced from profile, trigger, campaign, product offer, landing route, or
  custom data, and tracked landing URL routing with a default route.
- `validateDmAutomationConfiguration()` verifies campaign-time DM automation
  setup before a DM capability executes. Templates must provide IDs and body
  text, required template variables must reference configured personalization
  variables, landing routes must provide http(s) URL templates, and default
  template/route IDs must point at configured entries.
- `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA` defines the canonical
  `owncanvas.instagram-dm-action-configuration.v1` campaign action setup shape
  for Instagram comment-to-DM actions, including campaign ID, selected
  capability ID, trigger configuration, response mappings from comment matcher
  IDs to DM template/text plus tracked landing URL, legacy single-message
  fallback fields, and attribution fields.
- `validateInstagramDmActionConfiguration()` verifies campaign-time DM action
  setup before an Instagram DM capability can execute. Response mappings must
  reference configured comment matcher IDs and provide non-empty DM text plus an
  http(s) landing URL.
- `INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA` defines the canonical
  `owncanvas.instagram-comment-trigger-configuration.v1` configuration shape
  for Instagram comment triggers, including monitored account, optional media
  scope, matched post references, post selection filters, comment condition
  matchers, legacy keyword matchers, and attribution templates. Post matching
  advertises reference fields (`mediaId`, `postId`, `permalink`, and
  `caption`) plus filter fields (`mediaIds`, `permalinkUrls`,
  `captionKeywords`, `hashtags`, `publishedAfter`, and `publishedBefore`).
  Condition matching advertises the supported operators
  (`equals`, `contains`, `starts_with`, `ends_with`, `regex`, `any_keyword`,
  and `all_keywords`), supported fields (`text`, `commenter.username`,
  `mentions`, and `metadata`), keyword arrays, mention arrays, and canonical
  metadata fields (`sourceNodeId`, `creativeAssetId`, `productOfferId`, and
  `attributionTerm`).
- `validateInstagramCommentTriggerConfiguration()` verifies install-time or
  campaign-time comment trigger settings before the DM capability consumes
  comment events. It validates matched post identifiers, http(s) post
  permalinks, caption references, include/exclude filter mode, post filter
  values, and timestamps. It accepts the newer `conditionMatchers` shape while
  still accepting existing `keywordMatchers` for backwards-compatible campaign
  specs.
- `INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA` defines the canonical
  `owncanvas.instagram-comment-trigger-event.v1` event shape for Instagram
  comment triggers, including campaign ID, account/media/comment IDs,
  commenter identity, comment text, timestamp, and UTM-ready attribution fields.
- `validateInstagramCommentTriggerEvent()` verifies incoming comment trigger
  payloads before they enter a comment-to-DM-to-landing workflow.
- Each `directMessageConfigType` must be one of `account`, `template`,
  `personalization`, `landing-routing`, `throttle`, or `compliance`.
- `validateDirectMessagePluginConfiguration()` rejects manifests that omit
  `channel.dm`, omit the `delivery` event output port, omit configuration
  fields, duplicate configuration keys, use unknown direct-message
  configuration types, mismatch account channel with plugin channel, pair a
  direct-message configuration type with an incompatible field type, omit
  compliance config when compliance review is required, use non-positive
  numeric defaults, or advertise automation configuration, action
  configuration, trigger configuration, or trigger event schemas whose
  channel/trigger do not match the plugin.

Landing configuration follows the same pattern with type-level schemas and
runtime rules.

- `LandingPluginManifest` requires a `landing` detail object, at least one
  `landing.page` capability, and at least one typed landing configuration
  field.
- `LandingPluginDetails` records supported page types, publish targets,
  checkout support, whether the landing preserves content immersion, and
  optional `handoffEventSchemas` that advertise supported landing handoff event
  contracts.
- `LANDING_PAGE_HANDOFF_EVENT_SCHEMA` defines the canonical
  `owncanvas.landing-page-handoff-event.v1` event shape for handing tracked
  traffic from a channel or agent action into a landing page. The event includes
  campaign ID, source plugin/capability, destination URL, optional checkout URL,
  visitor/offer context, and UTM-ready attribution fields.
- `validateLandingPageHandoffEvent()` verifies landing handoff payloads before
  they enter the landing capability or conversion attribution flow.
- `LANDING_DM_REFERRAL_CONTEXT_SCHEMA` defines the canonical
  `owncanvas.landing-dm-referral-context.v1` context passed from a DM delivery
  into a landing capability. Landing plugins that advertise
  `dmReferralContextSchemas` must expose a `dmReferralContext` JSON input port,
  list supported DM referral channels, and only advertise page types present in
  the plugin's `landing.pageTypes`.
- `validateLandingDmReferralContext()` verifies source DM plugin/capability,
  delivery event, tracked landing URL, visitor identity linkage, and
  UTM-compatible attribution before conversion tracking consumes the referral.
- Each `landingConfigType` must be one of `domain`, `template`, `checkout`, or
  `publish`.
- `validateLandingPluginConfiguration()` rejects manifests that omit
  `landing.page`, omit the `url` output port, omit configuration fields,
  duplicate configuration keys, use unknown landing configuration types,
  reference unsupported publish targets or page types, pair a landing
  configuration type with an incompatible field type, omit checkout config when
  checkout is supported, fail the immersion-preservation requirement, or
  advertise landing handoff or DM referral page types the plugin does not
  support.

## Canvas and JSON Implications

Canvas nodes reference plugin capabilities rather than plugin-specific schemas.
A provider image block, Instagram DM block, landing block, and attribution block
can all be represented as nodes with explicit ports because each plugin exposes
the same capability shape. The campaign JSON remains the source of truth: canvas
state stores node placement and port connections, while the plugin manifest
describes what those nodes can do.

This keeps built-in providers and advanced external providers compatible with
the same installer, permission model, audit trail, and agent action surface.

## Example Workflow Inspection

The canonical plugin-system example is the comment-to-DM-to-landing commerce
workflow in `plugin-workflow-fixtures.ts`. It models an Instagram comment
trigger, personalized DM reply, immersive landing handoff, and final purchase
conversion tracking as plugin-backed canvas nodes with explicit ports.

Run the focused workflow regression from the repository root:

```bash
node --experimental-strip-types --test app/features/plugins/model/plugin-registration-template-routing.test.ts
```

That test verifies:

- plugin kind registration for `direct-message`, `landing`, and `tracking`;
- DM template routing with UTM attribution appended to the landing URL;
- referral context parsing from the DM handoff URL;
- conversion event emission for the final `purchase` KPI;
- full Campaign JSON and canvas-state sync for the example workflow;
- route registration for plugin discovery APIs and the campaign canvas entry.

Inspect the fixture directly when checking the example workflow shape:

```bash
sed -n '1,260p' app/features/plugins/model/plugin-workflow-fixtures.ts
sed -n '260,620p' app/features/plugins/model/plugin-workflow-fixtures.ts
```

The reusable fixture exports are:

- `COMMENT_TO_DM_PLUGIN_REGISTRATION_FIXTURES`: the plugin kind registry slice
  required by the flow.
- `COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE`: DM automation configuration,
  personalization variables, landing routes, and attribution input.
- `COMMENT_TO_DM_REFERRAL_CONVERSION_FIXTURE`: referral URL parsing and
  purchase conversion emission.
- `COMMENT_TO_DM_FULL_CAMPAIGN_WORKFLOW_FIXTURE`: the full Campaign draft with
  synchronized `campaignSpec` and `canvasState`, active plugin configurations,
  publishing channel, tracking config, logs, versions, and draft status.

To inspect the plugin system through the HTTP route layer, start the app and
query the plugin APIs:

```bash
npm run dev
curl http://localhost:5173/api/plugin-kinds
curl http://localhost:5173/api/plugin-kinds/direct-message
curl http://localhost:5173/api/agent/plugins
curl http://localhost:5173/api/agent/plugins?view=installed
curl -X POST http://localhost:5173/api/agent/plugins \
  -H 'content-type: application/json' \
  -d '{"pluginId":"plugin.provider.parallel-media"}'
curl -X POST http://localhost:5173/api/agent/plugins \
  -H 'content-type: application/json' \
  -d '{"action":"activate","pluginId":"plugin.provider.installed-media"}'
```

The agent plugin discovery response is intentionally sanitized: it exposes
identity, plugin type, permission mode, approval requirements, capability
kinds, and parallel/bulk support, but not configuration fields, secret names, or
credential values. The installed view exposes lifecycle and configuration
readiness only.
