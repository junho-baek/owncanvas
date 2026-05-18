export type PluginSchemaVersion = "owncanvas.plugin.v1";

export const ALL_PLUGIN_TYPES = [
  "provider",
  "commission",
  "agent",
  "dashboard",
  "direct-message",
  "landing",
  "tracking",
  "custom",
] as const;

export type PluginType = (typeof ALL_PLUGIN_TYPES)[number];

export type PluginKindDefinition<TType extends PluginType = PluginType> = {
  type: TType;
  title: string;
  description: string;
  campaignRole: string;
  capabilityKinds: readonly PluginCapabilityKind[];
  supportsBuiltInOrigin: boolean;
  supportsExternalOrigin: boolean;
  defaultPermissionMode: PluginPermissionMode;
  requiredDetailKey?: string;
};

export type PluginKindRegistry = Readonly<
  Partial<Record<PluginType, PluginKindDefinition>>
>;

export type CompletePluginKindRegistry = Readonly<
  Record<PluginType, PluginKindDefinition>
>;

export function registerPluginKind(
  registry: PluginKindRegistry,
  definition: PluginKindDefinition,
): PluginKindRegistry {
  if (registry[definition.type] !== undefined) {
    throw new Error(`Plugin kind "${definition.type}" is already registered.`);
  }

  return Object.freeze({
    ...registry,
    [definition.type]: Object.freeze({ ...definition }),
  });
}

export function createPluginKindRegistry(
  definitions: readonly PluginKindDefinition[],
): PluginKindRegistry {
  return definitions.reduce<PluginKindRegistry>(
    (registry, definition) => registerPluginKind(registry, definition),
    Object.freeze({}),
  );
}

export function listPluginKindDefinitions(
  registry: PluginKindRegistry = DEFAULT_PLUGIN_KIND_REGISTRY,
): PluginKindDefinition[] {
  return ALL_PLUGIN_TYPES.flatMap((type) => {
    const definition = registry[type];

    return definition === undefined ? [] : [definition];
  });
}

export function getPluginKindDefinition<const TType extends PluginType>(
  type: TType,
  registry: PluginKindRegistry = DEFAULT_PLUGIN_KIND_REGISTRY,
): PluginKindDefinition<TType> | undefined {
  return registry[type] as PluginKindDefinition<TType> | undefined;
}

export function isSupportedPluginType(
  type: string,
  registry: PluginKindRegistry = DEFAULT_PLUGIN_KIND_REGISTRY,
): type is PluginType {
  return Object.prototype.hasOwnProperty.call(registry, type);
}

export type PluginLifecycleState =
  | "available"
  | "installed"
  | "configured"
  | "active"
  | "inactive"
  | "error"
  | "uninstalled";

export type PluginLifecycleError = {
  code: string;
  message: string;
  occurredAt: string;
};

export type PluginLifecycle = {
  state: PluginLifecycleState;
  installedAt?: string;
  configuredAt?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  error?: PluginLifecycleError;
  updatedAt: string;
};

export const PLUGIN_LIFECYCLE_TRANSITIONS = {
  available: ["installed"],
  installed: ["configured", "uninstalled", "error"],
  configured: ["active", "inactive", "uninstalled", "error"],
  active: ["configured", "inactive", "uninstalled", "error"],
  inactive: ["configured", "active", "uninstalled", "error"],
  error: ["installed", "configured", "inactive", "uninstalled"],
  uninstalled: ["installed"],
} as const satisfies Record<PluginLifecycleState, readonly PluginLifecycleState[]>;

type PluginLifecycleTransitionAllowed<
  TFrom extends PluginLifecycleState,
  TTo extends PluginLifecycleState,
> = TTo extends (typeof PLUGIN_LIFECYCLE_TRANSITIONS)[TFrom][number]
  ? true
  : false;

export function isPluginLifecycleTransitionAllowed<
  const TFrom extends PluginLifecycleState,
  const TTo extends PluginLifecycleState,
>(
  from: TFrom,
  to: TTo,
): PluginLifecycleTransitionAllowed<TFrom, TTo> {
  const allowedTransitions = PLUGIN_LIFECYCLE_TRANSITIONS[from] as readonly PluginLifecycleState[];

  return allowedTransitions.includes(to) as PluginLifecycleTransitionAllowed<
    TFrom,
    TTo
  >;
}

export type PluginActor = "human" | "agent";

export type PluginPermissionMode = "basic" | "advanced";

export type PluginApprovalRequirement =
  | "network_access"
  | "external_publish"
  | "spend_budget"
  | "secret_access"
  | "agent_execution";

export type PluginOrigin = {
  kind: "built-in" | "external";
  packageName: string;
  registryUrl?: string;
};

export type PluginMetadata = {
  displayName: string;
  description: string;
  homepageUrl?: string;
  documentationUrl?: string;
  iconUrl?: string;
  author?: string;
  license?: string;
  tags: readonly string[];
};

export type PluginPermissions = {
  mode: PluginPermissionMode;
  installableBy: readonly PluginActor[];
  configurableBy: readonly PluginActor[];
  requiresApprovalFor: readonly PluginApprovalRequirement[];
};

export type PluginCapabilityKind =
  | "generate.text"
  | "generate.image"
  | "generate.video"
  | "generate.voice"
  | "agent.action"
  | "channel.dm"
  | "channel.publish"
  | "landing.page"
  | "track.event"
  | "track.conversion"
  | "commission.offer"
  | "dashboard.report"
  | "custom";

export type PluginPortDataType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "json"
  | "event"
  | "url"
  | "product"
  | "audience";

export type PluginInputPort = {
  id: string;
  dataType: PluginPortDataType;
  required: boolean;
  label?: string;
  multiple?: boolean;
};

export type PluginOutputPort = {
  id: string;
  dataType: PluginPortDataType;
  multiple: boolean;
  label?: string;
};

export type PluginCapabilityConcurrency = {
  supportsParallel: boolean;
  supportsBulk: boolean;
  maxParallel?: number;
};

export type PluginCapability = {
  id: string;
  kind: PluginCapabilityKind;
  title: string;
  description: string;
  concurrency: PluginCapabilityConcurrency;
  inputPorts: readonly PluginInputPort[];
  outputPorts: readonly PluginOutputPort[];
};

export const DEFAULT_PLUGIN_KIND_REGISTRY = Object.freeze({
  provider: Object.freeze({
    type: "provider",
    title: "Provider",
    description:
      "Generation or model execution plugin for text, image, video, or voice blocks.",
    campaignRole:
      "Supplies creative generation capabilities for campaign canvas nodes.",
    capabilityKinds: [
      "generate.text",
      "generate.image",
      "generate.video",
      "generate.voice",
    ] as const,
    supportsBuiltInOrigin: true,
    supportsExternalOrigin: true,
    defaultPermissionMode: "advanced",
    requiredDetailKey: "provider",
  }),
  commission: Object.freeze({
    type: "commission",
    title: "Commission",
    description:
      "Commerce plugin for product offers, affiliate terms, referral links, and payout rules.",
    campaignRole:
      "Resolves tracked product offers and commission data for conversion campaigns.",
    capabilityKinds: ["commission.offer"] as const,
    supportsBuiltInOrigin: true,
    supportsExternalOrigin: true,
    defaultPermissionMode: "advanced",
    requiredDetailKey: "commission",
  }),
  agent: Object.freeze({
    type: "agent",
    title: "Agent",
    description:
      "Autonomous or supervised agent plugin that performs explicit canvas and campaign actions.",
    campaignRole:
      "Lets agents use the same canvas action surface available to humans.",
    capabilityKinds: ["agent.action"] as const,
    supportsBuiltInOrigin: true,
    supportsExternalOrigin: true,
    defaultPermissionMode: "advanced",
    requiredDetailKey: "agent",
  }),
  dashboard: Object.freeze({
    type: "dashboard",
    title: "Dashboard",
    description:
      "Analysis and reporting plugin for campaign performance, attribution, and experiments.",
    campaignRole:
      "Measures campaign performance and exposes conversion-first reporting views.",
    capabilityKinds: ["dashboard.report"] as const,
    supportsBuiltInOrigin: true,
    supportsExternalOrigin: true,
    defaultPermissionMode: "basic",
    requiredDetailKey: "dashboard",
  }),
  "direct-message": Object.freeze({
    type: "direct-message",
    title: "Direct Message",
    description:
      "Channel plugin for comment-to-DM, keyword reply, and private-message delivery flows.",
    campaignRole:
      "Represents compliant DM handoffs from public engagement to tracked landing links.",
    capabilityKinds: ["channel.dm"] as const,
    supportsBuiltInOrigin: true,
    supportsExternalOrigin: true,
    defaultPermissionMode: "advanced",
    requiredDetailKey: "directMessage",
  }),
  landing: Object.freeze({
    type: "landing",
    title: "Landing",
    description:
      "Publishing plugin for immersive campaign landing destinations and checkout handoffs.",
    campaignRole:
      "Publishes content-commerce destinations while preserving the creative-to-conversion path.",
    capabilityKinds: ["landing.page"] as const,
    supportsBuiltInOrigin: true,
    supportsExternalOrigin: true,
    defaultPermissionMode: "advanced",
    requiredDetailKey: "landing",
  }),
  tracking: Object.freeze({
    type: "tracking",
    title: "Tracking",
    description:
      "Attribution plugin for UTM, analytics, funnel, event, and purchase conversion tracking.",
    campaignRole:
      "Closes the measurement loop from campaign exposure through final conversion.",
    capabilityKinds: ["track.event", "track.conversion"] as const,
    supportsBuiltInOrigin: true,
    supportsExternalOrigin: true,
    defaultPermissionMode: "basic",
  }),
  custom: Object.freeze({
    type: "custom",
    title: "Custom",
    description:
      "Experimental plugin kind for integrations that have not stabilized into a first-class type.",
    campaignRole:
      "Allows community-defined campaign behavior while keeping shared lifecycle and permissions.",
    capabilityKinds: ["custom"] as const,
    supportsBuiltInOrigin: true,
    supportsExternalOrigin: true,
    defaultPermissionMode: "advanced",
  }),
} as const satisfies CompletePluginKindRegistry);

export type PluginConfigurationFieldType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "secret"
  | "json";

export type PluginConfigurationScope = "user" | "workspace" | "campaign";

export type PluginConfigurationField = {
  key: string;
  label: string;
  type: PluginConfigurationFieldType;
  required: boolean;
  scope: PluginConfigurationScope;
  description?: string;
  defaultValue?: string | number | boolean | Record<string, unknown>;
  options?: readonly {
    label: string;
    value: string;
  }[];
};

export type PluginConfigurationSchema = {
  fields: readonly PluginConfigurationField[];
};

export type PluginConfigurationDefaultValue = Exclude<
  PluginConfigurationField["defaultValue"],
  undefined
>;

export type PluginDefaultConfigurationField = Pick<
  PluginConfigurationField,
  "key" | "label" | "type" | "required" | "scope" | "description" | "options"
> & {
  sensitive: boolean;
  hasDefaultValue: boolean;
  hasSecretRef: boolean;
};

export type PluginDefaultConfigurationSchema<
  TType extends PluginType = PluginType,
> = {
  pluginId: string;
  pluginType: TType;
  permissionMode: PluginPermissionMode;
  configurableBy: readonly PluginActor[];
  fields: readonly PluginDefaultConfigurationField[];
  requiredKeys: readonly string[];
  defaults: {
    values: Record<string, PluginConfigurationDefaultValue>;
    secretRefs: Record<string, string>;
  };
};

export type PluginAppliedConfiguration = {
  appliedAt: string;
  appliedBy: PluginActor;
  source: "plugin.default";
  values: Record<string, PluginConfigurationDefaultValue>;
  secretRefs: Record<string, string>;
  missingRequiredKeys: readonly string[];
};

export function createPluginDefaultConfigurationSchema<
  TPlugin extends Pick<
    PluginManifest,
    "id" | "type" | "permissions" | "configuration"
  >,
>(plugin: TPlugin): PluginDefaultConfigurationSchema<TPlugin["type"]> {
  const fields = plugin.configuration.fields.map((field) =>
    createPluginDefaultConfigurationField(field),
  );
  const requiredKeys = fields.flatMap((field) =>
    field.required ? [field.key] : [],
  );
  const defaults = plugin.configuration.fields.reduce<
    PluginDefaultConfigurationSchema["defaults"]
  >(
    (accumulator, field) => {
      const secretRef = readConfigurationFieldSecretRef(field);

      if (secretRef !== undefined) {
        accumulator.secretRefs[field.key] = secretRef;
      }

      if (field.type !== "secret" && field.defaultValue !== undefined) {
        accumulator.values[field.key] = field.defaultValue;
      }

      return accumulator;
    },
    { values: {}, secretRefs: {} },
  );

  return {
    pluginId: plugin.id,
    pluginType: plugin.type,
    permissionMode: plugin.permissions.mode,
    configurableBy: plugin.permissions.configurableBy,
    fields,
    requiredKeys,
    defaults,
  };
}

function createPluginDefaultConfigurationField(
  field: PluginConfigurationField,
): PluginDefaultConfigurationField {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    scope: field.scope,
    ...(field.description === undefined
      ? {}
      : { description: field.description }),
    sensitive: field.type === "secret",
    hasDefaultValue: field.type !== "secret" && field.defaultValue !== undefined,
    hasSecretRef: readConfigurationFieldSecretRef(field) !== undefined,
    ...(field.options === undefined ? {} : { options: field.options }),
  };
}

function readConfigurationFieldSecretRef(
  field: PluginConfigurationField,
): string | undefined {
  const fieldWithSecretRef = field as PluginConfigurationField & {
    secretRef?: string;
  };

  return fieldWithSecretRef.secretRef;
}

type NonEmptyArray<T> = readonly [T, ...T[]];

export type ProviderMediaType = "text" | "image" | "video" | "voice";

export type ProviderExecutionMode = "local" | "hosted" | "remote";

export type ProviderPluginDetails<
  TKind extends PluginOrigin["kind"] = PluginOrigin["kind"],
> = {
  providerKind: TKind;
  mediaTypes: NonEmptyArray<ProviderMediaType>;
  execution: ProviderExecutionMode;
  advanced: boolean;
};

export type ProviderCapabilityKind = Extract<
  PluginCapabilityKind,
  "generate.text" | "generate.image" | "generate.video" | "generate.voice"
>;

export type ProviderPluginCapability = PluginCapability & {
  kind: ProviderCapabilityKind;
};

export type ProviderCredentialConfigurationField = PluginConfigurationField & {
  providerConfigType: "credential";
  type: "secret";
  secretRef?: string;
};

export type ProviderModelConfigurationField = PluginConfigurationField & {
  providerConfigType: "model";
  type: "string" | "select";
  mediaType?: ProviderMediaType;
  modelIds?: readonly string[];
};

export type ProviderEndpointConfigurationField = PluginConfigurationField & {
  providerConfigType: "endpoint";
  type: "string";
};

export type ProviderBudgetConfigurationField = PluginConfigurationField & {
  providerConfigType: "budget";
  type: "number";
  currency?: string;
};

export type ProviderWebhookConfigurationField = PluginConfigurationField & {
  providerConfigType: "webhook";
  type: "string";
};

export type ProviderRateLimitConfigurationField = PluginConfigurationField & {
  providerConfigType: "rate-limit";
  type: "number";
};

export type ProviderSafetyConfigurationField = PluginConfigurationField & {
  providerConfigType: "safety";
  type: "boolean" | "select" | "json";
};

export type BuiltInProviderConfigurationField =
  | ProviderCredentialConfigurationField
  | ProviderModelConfigurationField
  | ProviderRateLimitConfigurationField
  | ProviderSafetyConfigurationField;

export type ExternalProviderConfigurationField =
  | ProviderCredentialConfigurationField
  | ProviderModelConfigurationField
  | ProviderEndpointConfigurationField
  | ProviderBudgetConfigurationField
  | ProviderWebhookConfigurationField
  | ProviderRateLimitConfigurationField
  | ProviderSafetyConfigurationField;

export type ProviderConfigurationField =
  | BuiltInProviderConfigurationField
  | ExternalProviderConfigurationField;

export type ProviderConfigurationSchema = {
  fields: NonEmptyArray<ProviderConfigurationField>;
};

export type BuiltInProviderConfigurationSchema = {
  fields: NonEmptyArray<BuiltInProviderConfigurationField>;
};

export type ExternalProviderConfigurationSchema = {
  fields: NonEmptyArray<ExternalProviderConfigurationField>;
};

export type ProviderConfigurationValidationErrorCode =
  | "provider.kind_mismatch"
  | "provider.missing_generation_capability"
  | "provider.configuration_required"
  | "provider.duplicate_config_key"
  | "provider.builtin_disallowed_config"
  | "provider.field_type_mismatch"
  | "provider.numeric_default_must_be_positive";

export type ProviderConfigurationValidationError = {
  code: ProviderConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type ProviderConfigurationValidationResult = {
  ok: boolean;
  errors: ProviderConfigurationValidationError[];
};

type ProviderConfigurationValidationInput = {
  origin: Pick<PluginOrigin, "kind">;
  provider: Pick<ProviderPluginDetails, "providerKind">;
  capabilities: readonly unknown[];
  configuration: {
    fields: readonly (PluginConfigurationField & {
      providerConfigType?: ProviderConfigurationField["providerConfigType"];
    })[];
  };
};

type ProviderConfigurationRule = {
  code: ProviderConfigurationValidationErrorCode;
  validate: (
    plugin: ProviderConfigurationValidationInput,
  ) => ProviderConfigurationValidationError[];
};

const PROVIDER_CONFIG_FIELD_TYPES: Record<
  string,
  readonly PluginConfigurationFieldType[]
> = {
  credential: ["secret"],
  model: ["string", "select"],
  endpoint: ["string"],
  budget: ["number"],
  webhook: ["string"],
  "rate-limit": ["number"],
  safety: ["boolean", "select", "json"],
};

const BUILT_IN_PROVIDER_DISALLOWED_CONFIG_TYPES = [
  "endpoint",
  "budget",
  "webhook",
] as const;

export const PROVIDER_CONFIGURATION_RULES: readonly ProviderConfigurationRule[] = [
  {
    code: "provider.kind_mismatch",
    validate: (plugin) =>
      plugin.origin.kind === plugin.provider.providerKind
        ? []
        : [
            {
              code: "provider.kind_mismatch",
              message: "Provider kind must match plugin origin kind.",
              path: "provider.providerKind",
            },
          ],
  },
  {
    code: "provider.missing_generation_capability",
    validate: (plugin) =>
      plugin.capabilities.length > 0
        ? []
        : [
            {
              code: "provider.missing_generation_capability",
              message: "Provider plugins must expose at least one generation capability.",
              path: "capabilities",
            },
          ],
  },
  {
    code: "provider.configuration_required",
    validate: (plugin) =>
      plugin.configuration.fields.length > 0
        ? []
        : [
            {
              code: "provider.configuration_required",
              message: "Provider plugins must declare at least one configuration field.",
              path: "configuration.fields",
            },
          ],
  },
  {
    code: "provider.duplicate_config_key",
    validate: (plugin) => {
      const seen = new Set<string>();

      return plugin.configuration.fields.flatMap((field, index) => {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          return [];
        }

        return [
          {
            code: "provider.duplicate_config_key" as const,
            message: `Provider configuration key "${field.key}" is duplicated.`,
            path: `configuration.fields.${index}.key`,
          },
        ];
      });
    },
  },
  {
    code: "provider.builtin_disallowed_config",
    validate: (plugin) =>
      plugin.origin.kind === "built-in"
        ? plugin.configuration.fields.flatMap((field, index) =>
            BUILT_IN_PROVIDER_DISALLOWED_CONFIG_TYPES.includes(
              field.providerConfigType as (typeof BUILT_IN_PROVIDER_DISALLOWED_CONFIG_TYPES)[number],
            )
              ? [
                  {
                    code: "provider.builtin_disallowed_config" as const,
                    message: `Built-in providers cannot declare ${field.providerConfigType} configuration fields.`,
                    path: `configuration.fields.${index}.providerConfigType`,
                  },
                ]
              : [],
          )
        : [],
  },
  {
    code: "provider.field_type_mismatch",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        const allowedTypes =
          field.providerConfigType === undefined
            ? undefined
            : PROVIDER_CONFIG_FIELD_TYPES[field.providerConfigType];

        if (
          allowedTypes === undefined ||
          allowedTypes.includes(field.type)
        ) {
          return [];
        }

        return [
          {
            code: "provider.field_type_mismatch" as const,
            message: `${field.providerConfigType} provider configuration cannot use ${field.type} fields.`,
            path: `configuration.fields.${index}.type`,
          },
        ];
      }),
  },
  {
    code: "provider.numeric_default_must_be_positive",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.type !== "number" ||
          typeof field.defaultValue !== "number" ||
          field.defaultValue > 0
        ) {
          return [];
        }

        return [
          {
            code: "provider.numeric_default_must_be_positive" as const,
            message: "Provider numeric defaults must be greater than zero.",
            path: `configuration.fields.${index}.defaultValue`,
          },
        ];
      }),
  },
] as const;

export function validateProviderPluginConfiguration(
  plugin: ProviderConfigurationValidationInput,
): ProviderConfigurationValidationResult {
  const errors = PROVIDER_CONFIGURATION_RULES.flatMap((rule) =>
    rule.validate(plugin),
  );

  return {
    ok: errors.length === 0,
    errors,
  };
}

export type CommissionModel =
  | "affiliate"
  | "referral"
  | "revenue-share"
  | "marketplace";

export type CommissionOfferSource =
  | "catalog"
  | "manual"
  | "feed"
  | "api";

export type CommissionPluginDetails = {
  model: CommissionModel;
  supportedOfferSources: NonEmptyArray<CommissionOfferSource>;
  payoutCurrencies: NonEmptyArray<string>;
  requiresAttribution: boolean;
};

export type CommissionCapabilityKind = Extract<
  PluginCapabilityKind,
  "commission.offer"
>;

export type CommissionPluginCapability = PluginCapability & {
  kind: CommissionCapabilityKind;
};

export type CommissionNetworkConfigurationField = PluginConfigurationField & {
  commissionConfigType: "network";
  type: "string" | "select" | "secret";
  networkKind: CommissionModel;
  secretRef?: string;
};

export type CommissionOfferConfigurationField = PluginConfigurationField & {
  commissionConfigType: "offer";
  type: "string" | "select" | "json";
  offerSource: CommissionOfferSource;
};

export type CommissionPayoutConfigurationField = PluginConfigurationField & {
  commissionConfigType: "payout";
  type: "number" | "select" | "json";
  payoutModel: "fixed" | "percentage" | "tiered" | "custom";
  currency?: string;
};

export type CommissionAttributionWindowConfigurationField =
  PluginConfigurationField & {
    commissionConfigType: "attribution-window";
    type: "number";
    windowUnit: "hour" | "day";
  };

export type CommissionApprovalConfigurationField = PluginConfigurationField & {
  commissionConfigType: "approval";
  type: "boolean" | "select" | "json";
};

export type CommissionConfigurationField =
  | CommissionNetworkConfigurationField
  | CommissionOfferConfigurationField
  | CommissionPayoutConfigurationField
  | CommissionAttributionWindowConfigurationField
  | CommissionApprovalConfigurationField;

export type CommissionConfigurationSchema = {
  fields: NonEmptyArray<CommissionConfigurationField>;
};

export type CommissionConfigurationValidationErrorCode =
  | "commission.offer_capability_required"
  | "commission.configuration_required"
  | "commission.duplicate_config_key"
  | "commission.unknown_config_type"
  | "commission.network_kind_mismatch"
  | "commission.unsupported_offer_source"
  | "commission.unsupported_payout_currency"
  | "commission.field_type_mismatch"
  | "commission.attribution_window_required"
  | "commission.numeric_default_must_be_positive";

export type CommissionConfigurationValidationError = {
  code: CommissionConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type CommissionConfigurationValidationResult = {
  ok: boolean;
  errors: CommissionConfigurationValidationError[];
};

type CommissionConfigurationValidationInput = {
  commission: CommissionPluginDetails;
  capabilities: readonly {
    kind: PluginCapabilityKind;
  }[];
  configuration: {
    fields: readonly (PluginConfigurationField & {
      commissionConfigType?: string;
      networkKind?: string;
      offerSource?: string;
      currency?: string;
    })[];
  };
};

type CommissionConfigurationRule = {
  code: CommissionConfigurationValidationErrorCode;
  validate: (
    plugin: CommissionConfigurationValidationInput,
  ) => CommissionConfigurationValidationError[];
};

export const COMMISSION_CONFIG_FIELD_TYPES: Record<
  string,
  readonly PluginConfigurationFieldType[]
> = {
  network: ["string", "select", "secret"],
  offer: ["string", "select", "json"],
  payout: ["number", "select", "json"],
  "attribution-window": ["number"],
  approval: ["boolean", "select", "json"],
};

export const COMMISSION_CONFIGURATION_RULES: readonly CommissionConfigurationRule[] = [
  {
    code: "commission.offer_capability_required",
    validate: (plugin) =>
      plugin.capabilities.some((capability) => capability.kind === "commission.offer")
        ? []
        : [
            {
              code: "commission.offer_capability_required",
              message: "Commission plugins must declare a commission.offer capability.",
              path: "capabilities",
            },
          ],
  },
  {
    code: "commission.configuration_required",
    validate: (plugin) =>
      plugin.configuration.fields.length > 0
        ? []
        : [
            {
              code: "commission.configuration_required",
              message: "Commission plugins must declare at least one configuration field.",
              path: "configuration.fields",
            },
          ],
  },
  {
    code: "commission.duplicate_config_key",
    validate: (plugin) => {
      const seen = new Set<string>();

      return plugin.configuration.fields.flatMap((field, index) => {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          return [];
        }

        return [
          {
            code: "commission.duplicate_config_key" as const,
            message: `Commission configuration key "${field.key}" is duplicated.`,
            path: `configuration.fields.${index}.key`,
          },
        ];
      });
    },
  },
  {
    code: "commission.unknown_config_type",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.commissionConfigType === undefined ||
          field.commissionConfigType in COMMISSION_CONFIG_FIELD_TYPES
        ) {
          return [];
        }

        return [
          {
            code: "commission.unknown_config_type" as const,
            message: `${field.commissionConfigType} is not a supported commission configuration type.`,
            path: `configuration.fields.${index}.commissionConfigType`,
          },
        ];
      }),
  },
  {
    code: "commission.network_kind_mismatch",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.commissionConfigType !== "network" ||
          field.networkKind === plugin.commission.model
        ) {
          return [];
        }

        return [
          {
            code: "commission.network_kind_mismatch" as const,
            message: "Commission network kind must match the plugin commission model.",
            path: `configuration.fields.${index}.networkKind`,
          },
        ];
      }),
  },
  {
    code: "commission.unsupported_offer_source",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.commissionConfigType !== "offer" ||
          field.offerSource === undefined ||
          plugin.commission.supportedOfferSources.includes(
            field.offerSource as CommissionOfferSource,
          )
        ) {
          return [];
        }

        return [
          {
            code: "commission.unsupported_offer_source" as const,
            message: `${field.offerSource} is not listed in supported commission offer sources.`,
            path: `configuration.fields.${index}.offerSource`,
          },
        ];
      }),
  },
  {
    code: "commission.unsupported_payout_currency",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.commissionConfigType !== "payout" ||
          field.currency === undefined ||
          plugin.commission.payoutCurrencies.includes(field.currency)
        ) {
          return [];
        }

        return [
          {
            code: "commission.unsupported_payout_currency" as const,
            message: `${field.currency} is not listed in supported payout currencies.`,
            path: `configuration.fields.${index}.currency`,
          },
        ];
      }),
  },
  {
    code: "commission.field_type_mismatch",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        const commissionConfigType = field.commissionConfigType as
          | keyof typeof COMMISSION_CONFIG_FIELD_TYPES
          | undefined;
        const allowedTypes =
          commissionConfigType === undefined
            ? undefined
            : COMMISSION_CONFIG_FIELD_TYPES[commissionConfigType];

        if (
          allowedTypes === undefined ||
          (allowedTypes as readonly PluginConfigurationFieldType[]).includes(
            field.type,
          )
        ) {
          return [];
        }

        return [
          {
            code: "commission.field_type_mismatch" as const,
            message: `${field.commissionConfigType} commission configuration cannot use ${field.type} fields.`,
            path: `configuration.fields.${index}.type`,
          },
        ];
      }),
  },
  {
    code: "commission.attribution_window_required",
    validate: (plugin) =>
      !plugin.commission.requiresAttribution ||
      plugin.configuration.fields.some(
        (field) => field.commissionConfigType === "attribution-window",
      )
        ? []
        : [
            {
              code: "commission.attribution_window_required",
              message:
                "Commission plugins that require attribution must declare an attribution-window configuration field.",
              path: "configuration.fields",
            },
          ],
  },
  {
    code: "commission.numeric_default_must_be_positive",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.type !== "number" ||
          typeof field.defaultValue !== "number" ||
          field.defaultValue > 0
        ) {
          return [];
        }

        return [
          {
            code: "commission.numeric_default_must_be_positive" as const,
            message: "Commission numeric defaults must be greater than zero.",
            path: `configuration.fields.${index}.defaultValue`,
          },
        ];
      }),
  },
] as const;

export function validateCommissionPluginConfiguration(
  plugin: CommissionConfigurationValidationInput,
): CommissionConfigurationValidationResult {
  const errors = COMMISSION_CONFIGURATION_RULES.flatMap((rule) =>
    rule.validate(plugin),
  );

  return {
    ok: errors.length === 0,
    errors,
  };
}

export type AgentAutonomy = "read-only" | "supervised" | "autonomous";

export type AgentCanvasAction =
  | "canvas.inspect"
  | "canvas.node.create"
  | "canvas.node.update"
  | "canvas.node.delete"
  | "canvas.edge.connect"
  | "canvas.edge.disconnect"
  | "campaign.landing.behavior.set"
  | "campaign.execute"
  | "campaign.improve";

export type AgentPluginDetails = {
  autonomy: AgentAutonomy;
  supportedActions: NonEmptyArray<AgentCanvasAction>;
  safetyMode: PluginPermissionMode;
  requiresHumanApproval: boolean;
};

export type AgentCapabilityKind = Extract<PluginCapabilityKind, "agent.action">;

export type AgentPluginCapability = PluginCapability & {
  kind: AgentCapabilityKind;
};

export type AgentInstructionConfigurationField = PluginConfigurationField & {
  agentConfigType: "instruction";
  type: "json" | "string";
};

export type AgentApprovalPolicyConfigurationField = PluginConfigurationField & {
  agentConfigType: "approval-policy";
  type: "select" | "json" | "boolean";
};

export type AgentModelConfigurationField = PluginConfigurationField & {
  agentConfigType: "model";
  type: "string" | "select";
};

export type AgentActionPolicyConfigurationField = PluginConfigurationField & {
  agentConfigType: "action-policy";
  type: "select" | "json";
};

export type AgentMemoryConfigurationField = PluginConfigurationField & {
  agentConfigType: "memory";
  type: "boolean" | "select" | "json";
};

export type AgentConfigurationField =
  | AgentInstructionConfigurationField
  | AgentApprovalPolicyConfigurationField
  | AgentModelConfigurationField
  | AgentActionPolicyConfigurationField
  | AgentMemoryConfigurationField;

export type AgentConfigurationSchema = {
  fields: NonEmptyArray<AgentConfigurationField>;
};

export type AgentConfigurationValidationErrorCode =
  | "agent.action_capability_required"
  | "agent.action_input_port_required"
  | "agent.result_output_port_required"
  | "agent.configuration_required"
  | "agent.duplicate_config_key"
  | "agent.unknown_config_type"
  | "agent.field_type_mismatch";

export type AgentConfigurationValidationError = {
  code: AgentConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type AgentConfigurationValidationResult = {
  ok: boolean;
  errors: AgentConfigurationValidationError[];
};

type AgentConfigurationValidationInput = {
  capabilities: readonly {
    kind: PluginCapabilityKind;
    inputPorts?: readonly Pick<PluginInputPort, "id" | "dataType">[];
    outputPorts?: readonly Pick<PluginOutputPort, "id" | "dataType">[];
  }[];
  configuration: {
    fields: readonly (PluginConfigurationField & {
      agentConfigType?: string;
    })[];
  };
};

const AGENT_CONFIG_FIELD_TYPES: Record<
  string,
  readonly PluginConfigurationFieldType[]
> = {
  instruction: ["json", "string"],
  "approval-policy": ["select", "json", "boolean"],
  model: ["string", "select"],
  "action-policy": ["select", "json"],
  memory: ["boolean", "select", "json"],
};

export function validateAgentPluginConfiguration(
  plugin: AgentConfigurationValidationInput,
): AgentConfigurationValidationResult {
  const errors: AgentConfigurationValidationError[] = [];
  const agentActionCapabilities = plugin.capabilities.filter(
    (capability) => capability.kind === "agent.action",
  );

  if (agentActionCapabilities.length === 0) {
    errors.push({
      code: "agent.action_capability_required",
      message: "Agent plugins must declare an agent.action capability.",
      path: "capabilities",
    });
  } else {
    agentActionCapabilities.forEach((capability, index) => {
      if (
        !capability.inputPorts?.some(
          (port) => port.id === "action" && port.dataType === "json",
        )
      ) {
        errors.push({
          code: "agent.action_input_port_required",
          message:
            "Agent action capabilities must declare an action JSON input port.",
          path: `capabilities.${index}.inputPorts`,
        });
      }

      if (
        !capability.outputPorts?.some(
          (port) => port.id === "result" && port.dataType === "event",
        )
      ) {
        errors.push({
          code: "agent.result_output_port_required",
          message:
            "Agent action capabilities must declare a result event output port.",
          path: `capabilities.${index}.outputPorts`,
        });
      }
    });
  }

  if (plugin.configuration.fields.length === 0) {
    errors.push({
      code: "agent.configuration_required",
      message: "Agent plugins must declare at least one configuration field.",
      path: "configuration.fields",
    });
  }

  const seen = new Set<string>();

  plugin.configuration.fields.forEach((field, index) => {
    if (seen.has(field.key)) {
      errors.push({
        code: "agent.duplicate_config_key",
        message: `Agent configuration key "${field.key}" is duplicated.`,
        path: `configuration.fields.${index}.key`,
      });
    } else {
      seen.add(field.key);
    }
  });

  plugin.configuration.fields.forEach((field, index) => {
    const allowedTypes =
      field.agentConfigType === undefined
        ? undefined
        : AGENT_CONFIG_FIELD_TYPES[field.agentConfigType];

    if (allowedTypes !== undefined && !allowedTypes.includes(field.type)) {
      errors.push({
        code: "agent.field_type_mismatch",
        message: `${field.agentConfigType} agent configuration cannot use ${field.type} fields.`,
        path: `configuration.fields.${index}.type`,
      });
    }
  });

  plugin.configuration.fields.forEach((field, index) => {
    if (
      field.agentConfigType !== undefined &&
      !(field.agentConfigType in AGENT_CONFIG_FIELD_TYPES)
    ) {
      errors.push({
        code: "agent.unknown_config_type",
        message: `${field.agentConfigType} is not a supported agent configuration type.`,
        path: `configuration.fields.${index}.agentConfigType`,
      });
    }
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

export type DashboardReportType =
  | "overview"
  | "funnel"
  | "conversion"
  | "attribution"
  | "cohort"
  | "experiment";

export type DashboardVisualization =
  | "table"
  | "scorecard"
  | "line"
  | "bar"
  | "funnel"
  | "cohort";

export type DashboardMetricKind =
  | "impression"
  | "engagement"
  | "click"
  | "lead"
  | "conversion"
  | "revenue";

export type DashboardPluginDetails = {
  reportTypes: NonEmptyArray<DashboardReportType>;
  supportedVisualizations: NonEmptyArray<DashboardVisualization>;
  realtime: boolean;
  exportable: boolean;
};

export type DashboardCapabilityKind = Extract<
  PluginCapabilityKind,
  "dashboard.report"
>;

export type DashboardPluginCapability = PluginCapability & {
  kind: DashboardCapabilityKind;
};

export type DashboardMetricConfigurationField = PluginConfigurationField & {
  dashboardConfigType: "metric";
  type: "string" | "select" | "json";
  metricKind: DashboardMetricKind;
};

export type DashboardAttributionWindowConfigurationField =
  PluginConfigurationField & {
    dashboardConfigType: "attribution-window";
    type: "number";
    windowUnit: "hour" | "day";
  };

export type DashboardFilterConfigurationField = PluginConfigurationField & {
  dashboardConfigType: "filter";
  type: "string" | "select" | "json";
};

export type DashboardVisualizationConfigurationField =
  PluginConfigurationField & {
    dashboardConfigType: "visualization";
    type: "select" | "json";
    visualization: DashboardVisualization;
  };

export type DashboardExportConfigurationField = PluginConfigurationField & {
  dashboardConfigType: "export";
  type: "boolean" | "select" | "json";
};

export type DashboardConfigurationField =
  | DashboardMetricConfigurationField
  | DashboardAttributionWindowConfigurationField
  | DashboardFilterConfigurationField
  | DashboardVisualizationConfigurationField
  | DashboardExportConfigurationField;

export type DashboardConfigurationSchema = {
  fields: NonEmptyArray<DashboardConfigurationField>;
};

export type DashboardConfigurationValidationErrorCode =
  | "dashboard.report_capability_required"
  | "dashboard.configuration_required"
  | "dashboard.duplicate_config_key"
  | "dashboard.unknown_config_type"
  | "dashboard.unsupported_metric"
  | "dashboard.unsupported_visualization"
  | "dashboard.field_type_mismatch"
  | "dashboard.numeric_default_must_be_positive";

export type DashboardConfigurationValidationError = {
  code: DashboardConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type DashboardConfigurationValidationResult = {
  ok: boolean;
  errors: DashboardConfigurationValidationError[];
};

type DashboardConfigurationValidationInput = {
  dashboard: DashboardPluginDetails;
  capabilities: readonly {
    kind: PluginCapabilityKind;
  }[];
  configuration: {
    fields: readonly (PluginConfigurationField & {
      dashboardConfigType?: string;
      metricKind?: string;
      visualization?: string;
    })[];
  };
};

type DashboardConfigurationRule = {
  code: DashboardConfigurationValidationErrorCode;
  validate: (
    plugin: DashboardConfigurationValidationInput,
  ) => DashboardConfigurationValidationError[];
};

export const DASHBOARD_CONFIG_FIELD_TYPES: Record<
  string,
  readonly PluginConfigurationFieldType[]
> = {
  metric: ["string", "select", "json"],
  "attribution-window": ["number"],
  filter: ["string", "select", "json"],
  visualization: ["select", "json"],
  export: ["boolean", "select", "json"],
};

export const DASHBOARD_CONFIGURATION_RULES: readonly DashboardConfigurationRule[] = [
  {
    code: "dashboard.report_capability_required",
    validate: (plugin) =>
      plugin.capabilities.some((capability) => capability.kind === "dashboard.report")
        ? []
        : [
            {
              code: "dashboard.report_capability_required",
              message: "Dashboard plugins must declare a dashboard.report capability.",
              path: "capabilities",
            },
          ],
  },
  {
    code: "dashboard.configuration_required",
    validate: (plugin) =>
      plugin.configuration.fields.length > 0
        ? []
        : [
            {
              code: "dashboard.configuration_required",
              message: "Dashboard plugins must declare at least one configuration field.",
              path: "configuration.fields",
            },
          ],
  },
  {
    code: "dashboard.duplicate_config_key",
    validate: (plugin) => {
      const seen = new Set<string>();

      return plugin.configuration.fields.flatMap((field, index) => {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          return [];
        }

        return [
          {
            code: "dashboard.duplicate_config_key" as const,
            message: `Dashboard configuration key "${field.key}" is duplicated.`,
            path: `configuration.fields.${index}.key`,
          },
        ];
      });
    },
  },
  {
    code: "dashboard.unknown_config_type",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.dashboardConfigType === undefined ||
          field.dashboardConfigType in DASHBOARD_CONFIG_FIELD_TYPES
        ) {
          return [];
        }

        return [
          {
            code: "dashboard.unknown_config_type" as const,
            message: `${field.dashboardConfigType} is not a supported dashboard configuration type.`,
            path: `configuration.fields.${index}.dashboardConfigType`,
          },
        ];
      }),
  },
  {
    code: "dashboard.unsupported_metric",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.dashboardConfigType !== "metric" ||
          field.metricKind === undefined ||
          plugin.dashboard.reportTypes.includes(
            field.metricKind as DashboardReportType,
          )
        ) {
          return [];
        }

        return [
          {
            code: "dashboard.unsupported_metric" as const,
            message: `${field.metricKind} is not supported by the dashboard report types.`,
            path: `configuration.fields.${index}.metricKind`,
          },
        ];
      }),
  },
  {
    code: "dashboard.unsupported_visualization",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.dashboardConfigType !== "visualization" ||
          field.visualization === undefined ||
          plugin.dashboard.supportedVisualizations.includes(
            field.visualization as DashboardVisualization,
          )
        ) {
          return [];
        }

        return [
          {
            code: "dashboard.unsupported_visualization" as const,
            message: `${field.visualization} is not listed in supported dashboard visualizations.`,
            path: `configuration.fields.${index}.visualization`,
          },
        ];
      }),
  },
  {
    code: "dashboard.field_type_mismatch",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        const allowedTypes =
          field.dashboardConfigType === undefined
            ? undefined
            : DASHBOARD_CONFIG_FIELD_TYPES[field.dashboardConfigType];

        if (allowedTypes === undefined || allowedTypes.includes(field.type)) {
          return [];
        }

        return [
          {
            code: "dashboard.field_type_mismatch" as const,
            message: `${field.dashboardConfigType} dashboard configuration cannot use ${field.type} fields.`,
            path: `configuration.fields.${index}.type`,
          },
        ];
      }),
  },
  {
    code: "dashboard.numeric_default_must_be_positive",
    validate: (plugin) =>
      plugin.configuration.fields.flatMap((field, index) => {
        if (
          field.type !== "number" ||
          typeof field.defaultValue !== "number" ||
          field.defaultValue > 0
        ) {
          return [];
        }

        return [
          {
            code: "dashboard.numeric_default_must_be_positive" as const,
            message: "Dashboard numeric defaults must be greater than zero.",
            path: `configuration.fields.${index}.defaultValue`,
          },
        ];
      }),
  },
] as const;

export function validateDashboardPluginConfiguration(
  plugin: DashboardConfigurationValidationInput,
): DashboardConfigurationValidationResult {
  const errors = DASHBOARD_CONFIGURATION_RULES.flatMap((rule) =>
    rule.validate(plugin),
  );

  return {
    ok: errors.length === 0,
    errors,
  };
}

export type DirectMessageChannel =
  | "instagram"
  | "messenger"
  | "whatsapp"
  | "sms"
  | "email"
  | "custom";

export type DirectMessageTrigger =
  | "comment"
  | "keyword"
  | "mention"
  | "form-submit"
  | "manual";

export type DirectMessageDeliveryMode = "one-to-one" | "bulk" | "automated";

export const DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION =
  "owncanvas.dm-automation-configuration.v1";

export type DmAutomationPersonalizationSource =
  | "profile"
  | "trigger-event"
  | "campaign"
  | "product-offer"
  | "landing-route"
  | "custom";

export type DmAutomationRouteConditionOperator =
  | "equals"
  | "contains"
  | "exists"
  | "missing";

export type DmAutomationReplyTemplate = {
  id: string;
  name: string;
  body: string;
  requiredVariables: readonly string[];
  fallbackBody?: string;
};

export type DmAutomationPersonalizationVariable = {
  key: string;
  source: DmAutomationPersonalizationSource;
  path: string;
  fallback?: string | number | boolean;
  required: boolean;
};

export type DmAutomationLandingRouteCondition = {
  variable: string;
  operator: DmAutomationRouteConditionOperator;
  value?: string | number | boolean;
};

export type DmAutomationLandingUrlRoute = {
  id: string;
  label: string;
  urlTemplate: string;
  routeWhen?: DmAutomationLandingRouteCondition;
  appendAttribution: boolean;
};

export type DmAutomationConfiguration = {
  schemaVersion: typeof DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION;
  channel: DirectMessageChannel;
  trigger: DirectMessageTrigger;
  campaignId: string;
  templates: NonEmptyArray<DmAutomationReplyTemplate>;
  personalizationVariables: NonEmptyArray<DmAutomationPersonalizationVariable>;
  landingUrlRoutes: NonEmptyArray<DmAutomationLandingUrlRoute>;
  defaultTemplateId: string;
  defaultLandingRouteId: string;
  metadata?: Record<string, unknown>;
};

export type DmAutomationReplyVariableValue = string | number | boolean;

export type DmAutomationReplyRenderErrorCode =
  | "dm-reply-render.configuration_invalid"
  | "dm-reply-render.template_not_found"
  | "dm-reply-render.variable_not_supported"
  | "dm-reply-render.variable_required";

export type DmAutomationReplyRenderError = {
  code: DmAutomationReplyRenderErrorCode;
  message: string;
  path: string;
};

export type DmAutomationReplyRenderRequest = {
  configuration: DmAutomationConfiguration;
  templateId?: string;
  variables: Record<string, DmAutomationReplyVariableValue | null | undefined>;
};

export type DmAutomationReplyRenderResult =
  | {
      ok: true;
      templateId: string;
      text: string;
      variables: Record<string, DmAutomationReplyVariableValue>;
      errors: [];
    }
  | {
      ok: false;
      templateId?: string;
      variables: Record<string, DmAutomationReplyVariableValue>;
      errors: DmAutomationReplyRenderError[];
    };

export function renderDmAutomationReply(
  request: DmAutomationReplyRenderRequest,
): DmAutomationReplyRenderResult {
  const validation = validateDmAutomationConfiguration(request.configuration);
  const errors: DmAutomationReplyRenderError[] = [];

  if (!validation.ok) {
    errors.push({
      code: "dm-reply-render.configuration_invalid",
      message: "DM automation reply rendering requires a valid configuration.",
      path: "configuration",
    });
  }

  const supportedVariables = new Map(
    request.configuration.personalizationVariables.map((variable) => [
      variable.key,
      variable,
    ]),
  );
  const resolvedVariables: Record<string, DmAutomationReplyVariableValue> = {};

  Object.entries(request.variables).forEach(([key, value]) => {
    if (!supportedVariables.has(key)) {
      errors.push({
        code: "dm-reply-render.variable_not_supported",
        message: "DM automation reply variables must be configured first.",
        path: `variables.${key}`,
      });
      return;
    }

    if (value !== undefined && value !== null) {
      resolvedVariables[key] = value;
    }
  });

  supportedVariables.forEach((variable, key) => {
    if (resolvedVariables[key] !== undefined) {
      return;
    }

    if (variable.fallback !== undefined) {
      resolvedVariables[key] = variable.fallback;
    }
  });

  const templateId = request.templateId ?? request.configuration.defaultTemplateId;
  const template = request.configuration.templates.find(
    (candidate) => candidate.id === templateId,
  );

  if (template === undefined) {
    errors.push({
      code: "dm-reply-render.template_not_found",
      message: "DM automation reply rendering requires a configured template.",
      path: "templateId",
    });
  } else {
    extractTemplateVariableNames(template.body).forEach((key) => {
      if (!supportedVariables.has(key)) {
        errors.push({
          code: "dm-reply-render.variable_not_supported",
          message:
            "DM automation reply templates can only reference configured personalization variables.",
          path: `templates.${template.id}.${key}`,
        });
      }
    });

    template.requiredVariables.forEach((key) => {
      if (resolvedVariables[key] === undefined || resolvedVariables[key] === "") {
        errors.push({
          code: "dm-reply-render.variable_required",
          message: "DM automation reply templates require all required variables.",
          path: `variables.${key}`,
        });
      }
    });
  }

  if (errors.length > 0 || template === undefined) {
    return {
      ok: false,
      ...(templateId === undefined ? {} : { templateId }),
      variables: resolvedVariables,
      errors,
    };
  }

  return {
    ok: true,
    templateId: template.id,
    text: renderTemplateText(template.body, resolvedVariables),
    variables: resolvedVariables,
    errors: [],
  };
}

export type DmAutomationReplyAttribution = {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
};

export type DmAutomationReplyGenerationError =
  | DmAutomationReplyRenderError
  | {
      code:
        | "dm-reply-generate.landing_route_not_found"
        | "dm-reply-generate.landing_url_invalid";
      message: string;
      path: string;
    };

export type DmAutomationReplyGenerationRequest = {
  configuration: DmAutomationConfiguration;
  templateId?: string;
  landingRouteId?: string;
  variables: Record<string, DmAutomationReplyVariableValue | null | undefined>;
  attribution?: DmAutomationReplyAttribution;
};

export type DmAutomationReplyGenerationResult =
  | {
      ok: true;
      templateId: string;
      landingRouteId: string;
      landingUrl: string;
      text: string;
      variables: Record<string, DmAutomationReplyVariableValue>;
      errors: [];
    }
  | {
      ok: false;
      templateId?: string;
      landingRouteId?: string;
      landingUrl?: string;
      variables: Record<string, DmAutomationReplyVariableValue>;
      errors: DmAutomationReplyGenerationError[];
    };

export function generateDmAutomationReply(
  request: DmAutomationReplyGenerationRequest,
): DmAutomationReplyGenerationResult {
  const validation = validateDmAutomationConfiguration(request.configuration);
  const errors: DmAutomationReplyGenerationError[] = [];
  const variables = resolveDmAutomationVariables(
    request.configuration,
    request.variables,
  );

  if (!validation.ok) {
    errors.push({
      code: "dm-reply-render.configuration_invalid",
      message: "DM automation reply generation requires a valid configuration.",
      path: "configuration",
    });
  }

  const landingRoute = selectDmAutomationLandingRoute({
    configuration: request.configuration,
    landingRouteId: request.landingRouteId,
    variables,
  });
  const landingUrl =
    landingRoute === undefined
      ? undefined
      : renderDmAutomationLandingUrl({
          configuration: request.configuration,
          route: landingRoute,
          variables,
          attribution: request.attribution,
        });

  if (landingRoute === undefined) {
    errors.push({
      code: "dm-reply-generate.landing_route_not_found",
      message:
        "DM automation reply generation requires a configured landing URL route.",
      path: request.landingRouteId === undefined ? "defaultLandingRouteId" : "landingRouteId",
    });
  }

  if (landingRoute !== undefined && landingUrl === undefined) {
    errors.push({
      code: "dm-reply-generate.landing_url_invalid",
      message:
        "DM automation reply generation produced an invalid landing URL.",
      path: `landingUrlRoutes.${landingRoute.id}.urlTemplate`,
    });
  }

  if (errors.length > 0 || landingRoute === undefined || landingUrl === undefined) {
    return {
      ok: false,
      ...(request.templateId === undefined ? {} : { templateId: request.templateId }),
      ...(landingRoute === undefined ? {} : { landingRouteId: landingRoute.id }),
      ...(landingUrl === undefined ? {} : { landingUrl }),
      variables,
      errors,
    };
  }

  const renderedReply = renderDmAutomationReply({
    configuration: request.configuration,
    templateId: request.templateId,
    variables: {
      ...request.variables,
      landingUrl,
    },
  });

  if (!renderedReply.ok) {
    return {
      ok: false,
      ...(renderedReply.templateId === undefined
        ? {}
        : { templateId: renderedReply.templateId }),
      landingRouteId: landingRoute.id,
      landingUrl,
      variables: renderedReply.variables,
      errors: renderedReply.errors,
    };
  }

  return {
    ok: true,
    templateId: renderedReply.templateId,
    landingRouteId: landingRoute.id,
    landingUrl,
    text: renderedReply.text,
    variables: renderedReply.variables,
    errors: [],
  };
}

function resolveDmAutomationVariables(
  configuration: DmAutomationConfiguration,
  variables: Record<string, DmAutomationReplyVariableValue | null | undefined>,
): Record<string, DmAutomationReplyVariableValue> {
  const resolved: Record<string, DmAutomationReplyVariableValue> = {};

  configuration.personalizationVariables.forEach((variable) => {
    const value = variables[variable.key] ?? variable.fallback;

    if (value !== undefined && value !== null && value !== "") {
      resolved[variable.key] = value;
    }
  });

  return resolved;
}

function selectDmAutomationLandingRoute(input: {
  configuration: DmAutomationConfiguration;
  landingRouteId?: string;
  variables: Record<string, DmAutomationReplyVariableValue>;
}): DmAutomationLandingUrlRoute | undefined {
  if (input.landingRouteId !== undefined) {
    return input.configuration.landingUrlRoutes.find(
      (route) => route.id === input.landingRouteId,
    );
  }

  return (
    input.configuration.landingUrlRoutes.find((route) =>
      doesDmAutomationRouteMatch(route, input.variables),
    ) ??
    input.configuration.landingUrlRoutes.find(
      (route) => route.id === input.configuration.defaultLandingRouteId,
    )
  );
}

function doesDmAutomationRouteMatch(
  route: DmAutomationLandingUrlRoute,
  variables: Record<string, DmAutomationReplyVariableValue>,
): boolean {
  if (route.routeWhen === undefined) {
    return false;
  }

  const value = variables[route.routeWhen.variable];
  const expected = route.routeWhen.value;

  switch (route.routeWhen.operator) {
    case "equals":
      return String(value ?? "") === String(expected ?? "");
    case "contains":
      return String(value ?? "").includes(String(expected ?? ""));
    case "exists":
      return value !== undefined && value !== null && value !== "";
    case "missing":
      return value === undefined || value === null || value === "";
  }
}

function renderDmAutomationLandingUrl(input: {
  configuration: DmAutomationConfiguration;
  route: DmAutomationLandingUrlRoute;
  variables: Record<string, DmAutomationReplyVariableValue>;
  attribution?: DmAutomationReplyAttribution;
}): string | undefined {
  try {
    const renderedUrl = input.route.urlTemplate.replace(
      /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g,
      (_placeholder, key: string) => {
        const value =
          key === "campaignId"
            ? input.configuration.campaignId
            : input.variables[key];

        return encodeURIComponent(String(value ?? ""));
      },
    );
    const url = new URL(renderedUrl);

    if (input.route.appendAttribution && input.attribution !== undefined) {
      url.searchParams.set("utm_source", input.attribution.source);
      url.searchParams.set("utm_medium", input.attribution.medium);
      url.searchParams.set("utm_campaign", input.attribution.campaign);

      if (input.attribution.content !== undefined) {
        url.searchParams.set("utm_content", input.attribution.content);
      }

      if (input.attribution.term !== undefined) {
        url.searchParams.set("utm_term", input.attribution.term);
      }
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export type PluginDmAutomationConfigurationSchema = {
  schemaVersion: "owncanvas.plugin-dm-automation-configuration-schema.v1";
  configurationSchemaVersion: string;
  title: string;
  description: string;
  channel: DirectMessageChannel;
  trigger: DirectMessageTrigger;
  requiredFields: readonly string[];
  templateFields: readonly string[];
  personalizationFields: readonly string[];
  routingFields: readonly string[];
  properties: readonly PluginTriggerEventSchemaProperty[];
};

export const INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION =
  "owncanvas.instagram-comment-trigger-configuration.v1";

export const INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION =
  "owncanvas.instagram-comment-trigger-event.v1";

export type InstagramCommentKeywordMatchType = "exact" | "contains" | "regex";

export const INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS = [
  "equals",
  "contains",
  "starts_with",
  "ends_with",
  "regex",
  "any_keyword",
  "all_keywords",
] as const;

export type InstagramCommentTriggerConditionOperator =
  (typeof INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS)[number];

export const INSTAGRAM_COMMENT_TRIGGER_CONDITION_FIELDS = [
  "text",
  "commenter.username",
  "mentions",
  "metadata",
] as const;

export type InstagramCommentTriggerConditionField =
  (typeof INSTAGRAM_COMMENT_TRIGGER_CONDITION_FIELDS)[number];

export const INSTAGRAM_COMMENT_TRIGGER_METADATA_FIELDS = [
  "sourceNodeId",
  "creativeAssetId",
  "productOfferId",
  "attributionTerm",
] as const;

export type InstagramCommentTriggerMetadataField =
  (typeof INSTAGRAM_COMMENT_TRIGGER_METADATA_FIELDS)[number];

export const INSTAGRAM_COMMENT_TRIGGER_POST_REFERENCE_FIELDS = [
  "mediaId",
  "postId",
  "permalink",
  "caption",
] as const;

export const INSTAGRAM_COMMENT_TRIGGER_POST_FILTER_FIELDS = [
  "mediaIds",
  "permalinkUrls",
  "captionKeywords",
  "hashtags",
  "publishedAfter",
  "publishedBefore",
] as const;

export type InstagramCommentTriggerPostFilterField =
  (typeof INSTAGRAM_COMMENT_TRIGGER_POST_FILTER_FIELDS)[number];

export type InstagramCommentKeywordMatcher = {
  id: string;
  matchType: InstagramCommentKeywordMatchType;
  value: string;
  caseSensitive?: boolean;
};

export type InstagramCommentTriggerConditionMatcher = {
  id: string;
  field: InstagramCommentTriggerConditionField;
  operator: InstagramCommentTriggerConditionOperator;
  value?: string;
  keywords?: NonEmptyArray<string>;
  mentions?: readonly string[];
  metadataField?: InstagramCommentTriggerMetadataField;
  caseSensitive?: boolean;
};

export type InstagramCommentTriggerMatchedPostCaptionReference = {
  text?: string;
  sourceNodeId?: string;
  assetId?: string;
};

export type InstagramCommentTriggerPostSelectionMode = "include" | "exclude";

export type InstagramCommentTriggerPostSelectionCriteria = {
  mode: InstagramCommentTriggerPostSelectionMode;
  mediaIds?: readonly string[];
  permalinkUrls?: readonly string[];
  captionKeywords?: readonly string[];
  hashtags?: readonly string[];
  publishedAfter?: string;
  publishedBefore?: string;
};

export type InstagramCommentTriggerMatchedPostReference = {
  mediaId?: string;
  postId?: string;
  shortcode?: string;
  permalink?: string;
  caption?: InstagramCommentTriggerMatchedPostCaptionReference;
  selectionCriteria?: InstagramCommentTriggerPostSelectionCriteria;
};

function isInstagramCommentTriggerConditionOperator(
  value: unknown,
): value is InstagramCommentTriggerConditionOperator {
  return (
    typeof value === "string" &&
    (INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS as readonly string[]).includes(
      value,
    )
  );
}

function isInstagramCommentTriggerConditionField(
  value: unknown,
): value is InstagramCommentTriggerConditionField {
  return (
    typeof value === "string" &&
    (INSTAGRAM_COMMENT_TRIGGER_CONDITION_FIELDS as readonly string[]).includes(
      value,
    )
  );
}

function isInstagramCommentTriggerMetadataField(
  value: unknown,
): value is InstagramCommentTriggerMetadataField {
  return (
    typeof value === "string" &&
    (INSTAGRAM_COMMENT_TRIGGER_METADATA_FIELDS as readonly string[]).includes(
      value,
    )
  );
}

export type InstagramCommentTriggerConfigurationAttribution = {
  campaign: string;
  contentTemplate?: string;
  termTemplate?: string;
};

export type InstagramCommentTriggerConfiguration = {
  schemaVersion: typeof INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION;
  accountId: string;
  mediaIds?: readonly string[];
  matchedPosts?: readonly InstagramCommentTriggerMatchedPostReference[];
  postSelection?: InstagramCommentTriggerPostSelectionCriteria;
  keywordMatchers?: NonEmptyArray<InstagramCommentKeywordMatcher>;
  conditionMatchers?: NonEmptyArray<InstagramCommentTriggerConditionMatcher>;
  attribution?: InstagramCommentTriggerConfigurationAttribution;
  metadata?: Record<string, unknown>;
};

export type InstagramCommentTriggerEventAttribution = {
  source: "instagram";
  medium: "comment";
  campaign: string;
  content?: string;
  term?: string;
};

export type InstagramCommenterProfileReference = {
  profileUrl?: string;
  profilePictureUrl?: string;
};

export type InstagramCommenterIdentityLinkage = {
  normalizedIdentityId?: string;
  namespace?: string;
  externalUserId?: string;
  anonymousId?: string;
  emailHash?: string;
  phoneHash?: string;
  linkSource?: string;
  linkConfidence?: number;
  linkedAt?: string;
};

export type InstagramCommenterIdentityReference = {
  id: string;
  platform?: "instagram";
  platformUserId?: string;
  username?: string;
  profile?: InstagramCommenterProfileReference;
  identityLinkage?: InstagramCommenterIdentityLinkage;
};

export type InstagramCommentTriggerEvent = {
  schemaVersion: typeof INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION;
  id: string;
  campaignId: string;
  occurredAt: string;
  channel: "instagram";
  trigger: "comment";
  accountId: string;
  mediaId: string;
  commentId: string;
  parentCommentId?: string;
  commenter: InstagramCommenterIdentityReference;
  text: string;
  permalink?: string;
  attribution?: InstagramCommentTriggerEventAttribution;
  metadata?: Record<string, unknown>;
};

export type PluginTriggerEventSchemaProperty = {
  key: string;
  type: PluginConfigurationFieldType | "object" | "datetime" | "url";
  required: boolean;
  description: string;
};

export type PluginTriggerEventSchema = {
  schemaVersion: "owncanvas.plugin-trigger-event-schema.v1";
  eventSchemaVersion: string;
  eventType: string;
  title: string;
  description: string;
  channel: DirectMessageChannel;
  trigger: DirectMessageTrigger;
  requiredFields: readonly string[];
  attributionFields: readonly string[];
  identityFields?: readonly string[];
  properties: readonly PluginTriggerEventSchemaProperty[];
};

export type PluginTriggerConfigurationSchema = {
  schemaVersion: string;
  title: string;
  description: string;
  channel: DirectMessageChannel;
  trigger: DirectMessageTrigger;
  requiredFields: readonly string[];
  supportedOperators?: readonly string[];
  conditionFields?: readonly string[];
  metadataFields?: readonly string[];
  postReferenceFields?: readonly string[];
  postFilterFields?: readonly string[];
  properties: readonly PluginTriggerEventSchemaProperty[];
};

export const DM_AUTOMATION_CONFIGURATION_SCHEMA = {
  schemaVersion: "owncanvas.plugin-dm-automation-configuration-schema.v1",
  configurationSchemaVersion: DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
  title: "DM automation configuration",
  description:
    "Channel-neutral configuration for automated direct-message replies, personalization variables, and tracked landing URL routing.",
  channel: "instagram",
  trigger: "comment",
  requiredFields: [
    "campaignId",
    "templates",
    "personalizationVariables",
    "landingUrlRoutes",
    "defaultTemplateId",
    "defaultLandingRouteId",
  ],
  templateFields: [
    "templates.id",
    "templates.name",
    "templates.body",
    "templates.requiredVariables",
    "templates.fallbackBody",
  ],
  personalizationFields: [
    "personalizationVariables.key",
    "personalizationVariables.source",
    "personalizationVariables.path",
    "personalizationVariables.fallback",
    "personalizationVariables.required",
  ],
  routingFields: [
    "landingUrlRoutes.id",
    "landingUrlRoutes.urlTemplate",
    "landingUrlRoutes.routeWhen",
    "defaultLandingRouteId",
  ],
  properties: [
    {
      key: "schemaVersion",
      type: "string",
      required: true,
      description:
        "Instagram DM action configuration schema version used by the DM Gate contract.",
    },
    {
      key: "campaignId",
      type: "string",
      required: true,
      description: "Campaign that owns the DM automation configuration.",
    },
    {
      key: "templates",
      type: "json",
      required: true,
      description:
        "Reply templates with variable placeholders and optional fallback bodies.",
    },
    {
      key: "personalizationVariables",
      type: "json",
      required: true,
      description:
        "Variable definitions that map template placeholders to profile, trigger, campaign, product, landing route, or custom data.",
    },
    {
      key: "landingUrlRoutes",
      type: "json",
      required: true,
      description:
        "Tracked landing URL route templates and optional selection conditions.",
    },
    {
      key: "defaultTemplateId",
      type: "string",
      required: true,
      description: "Template used when no more specific route selects a reply.",
    },
    {
      key: "defaultLandingRouteId",
      type: "string",
      required: true,
      description:
        "Landing route used when no conditional route matches the recipient.",
    },
  ],
} as const satisfies PluginDmAutomationConfigurationSchema;

export const INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA = {
  schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
  title: "Instagram comment trigger configuration",
  description:
    "Configuration for matching Instagram comments and preparing attribution fields before DM delivery.",
  channel: "instagram",
  trigger: "comment",
  requiredFields: ["accountId", "conditionMatchers"],
  supportedOperators: INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS,
  conditionFields: INSTAGRAM_COMMENT_TRIGGER_CONDITION_FIELDS,
  metadataFields: INSTAGRAM_COMMENT_TRIGGER_METADATA_FIELDS,
  postReferenceFields: INSTAGRAM_COMMENT_TRIGGER_POST_REFERENCE_FIELDS,
  postFilterFields: INSTAGRAM_COMMENT_TRIGGER_POST_FILTER_FIELDS,
  properties: [
    {
      key: "accountId",
      type: "string",
      required: true,
      description: "Instagram account monitored for eligible campaign comments.",
    },
    {
      key: "mediaIds",
      type: "json",
      required: false,
      description: "Optional Instagram media id allowlist for this campaign trigger.",
    },
    {
      key: "matchedPosts",
      type: "json",
      required: false,
      description:
        "Matched Instagram post references with media/post identifiers, permalink, caption context, and per-post selection criteria.",
    },
    {
      key: "postSelection",
      type: "json",
      required: false,
      description:
        "Post-level selection filters used to include or exclude eligible Instagram posts before comment matching.",
    },
    {
      key: "conditionMatchers",
      type: "json",
      required: true,
      description:
        "Condition matcher rules that qualify a comment by text, keywords, mentions, or metadata.",
    },
    {
      key: "keywordMatchers",
      type: "json",
      required: false,
      description:
        "Legacy keyword matcher rules that qualify a comment for DM delivery.",
    },
    {
      key: "attribution",
      type: "object",
      required: false,
      description:
        "Campaign, content, and term templates used to populate attribution fields.",
    },
  ],
} as const satisfies PluginTriggerConfigurationSchema;

export const INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA = {
  schemaVersion: "owncanvas.plugin-trigger-event-schema.v1",
  eventSchemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  eventType: "instagram.comment.created",
  title: "Instagram comment trigger",
  description:
    "A public Instagram comment event that can trigger compliant comment-to-DM campaign flows.",
  channel: "instagram",
  trigger: "comment",
  requiredFields: [
    "id",
    "campaignId",
    "occurredAt",
    "channel",
    "trigger",
    "accountId",
    "mediaId",
    "commentId",
    "commenter.id",
    "text",
  ],
  attributionFields: [
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "attribution.content",
    "attribution.term",
  ],
  identityFields: [
    "commenter.platform",
    "commenter.platformUserId",
    "commenter.username",
    "commenter.profile.profileUrl",
    "commenter.profile.profilePictureUrl",
    "commenter.identityLinkage.normalizedIdentityId",
    "commenter.identityLinkage.namespace",
    "commenter.identityLinkage.externalUserId",
    "commenter.identityLinkage.anonymousId",
    "commenter.identityLinkage.emailHash",
    "commenter.identityLinkage.phoneHash",
    "commenter.identityLinkage.linkSource",
    "commenter.identityLinkage.linkConfidence",
    "commenter.identityLinkage.linkedAt",
  ],
  properties: [
    {
      key: "id",
      type: "string",
      required: true,
      description: "Stable event identifier for audit logs and attribution.",
    },
    {
      key: "campaignId",
      type: "string",
      required: true,
      description: "Campaign that owns the comment-to-DM flow.",
    },
    {
      key: "occurredAt",
      type: "datetime",
      required: true,
      description: "ISO timestamp when the Instagram comment was observed.",
    },
    {
      key: "accountId",
      type: "string",
      required: true,
      description: "Instagram account that received the comment.",
    },
    {
      key: "mediaId",
      type: "string",
      required: true,
      description: "Instagram media object the comment belongs to.",
    },
    {
      key: "commentId",
      type: "string",
      required: true,
      description: "Instagram comment identifier.",
    },
    {
      key: "commenter",
      type: "object",
      required: true,
      description: "Comment author identity used for eligible DM delivery.",
    },
    {
      key: "text",
      type: "string",
      required: true,
      description: "Comment text used for keyword matching and attribution term capture.",
    },
    {
      key: "attribution",
      type: "object",
      required: false,
      description: "UTM-ready source, medium, campaign, content, and term values.",
    },
  ],
} as const satisfies PluginTriggerEventSchema;

export type InstagramCommentTriggerConfigurationValidationErrorCode =
  | "instagram-comment-trigger.schema_version_invalid"
  | "instagram-comment-trigger.account_id_required"
  | "instagram-comment-trigger.media_id_required"
  | "instagram-comment-trigger.post_identifier_required"
  | "instagram-comment-trigger.post_permalink_invalid"
  | "instagram-comment-trigger.post_caption_reference_required"
  | "instagram-comment-trigger.post_selection_mode_invalid"
  | "instagram-comment-trigger.post_selection_media_id_required"
  | "instagram-comment-trigger.post_selection_permalink_invalid"
  | "instagram-comment-trigger.post_selection_caption_keyword_required"
  | "instagram-comment-trigger.post_selection_hashtag_required"
  | "instagram-comment-trigger.post_selection_published_after_invalid"
  | "instagram-comment-trigger.post_selection_published_before_invalid"
  | "instagram-comment-trigger.condition_matchers_required"
  | "instagram-comment-trigger.keyword_matcher_id_required"
  | "instagram-comment-trigger.keyword_value_required"
  | "instagram-comment-trigger.keyword_match_type_invalid"
  | "instagram-comment-trigger.condition_matcher_id_required"
  | "instagram-comment-trigger.condition_field_invalid"
  | "instagram-comment-trigger.condition_operator_invalid"
  | "instagram-comment-trigger.condition_value_required"
  | "instagram-comment-trigger.condition_keywords_required"
  | "instagram-comment-trigger.condition_keyword_required"
  | "instagram-comment-trigger.condition_mention_required"
  | "instagram-comment-trigger.condition_metadata_field_invalid"
  | "instagram-comment-trigger.attribution_campaign_required";

export type InstagramCommentTriggerConfigurationValidationError = {
  code: InstagramCommentTriggerConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type InstagramCommentTriggerConfigurationValidationResult = {
  ok: boolean;
  errors: InstagramCommentTriggerConfigurationValidationError[];
};

export function validateInstagramCommentTriggerConfiguration(
  configuration: unknown,
): InstagramCommentTriggerConfigurationValidationResult {
  const value = isRecord(configuration) ? configuration : {};
  const mediaIds = Array.isArray(value.mediaIds) ? value.mediaIds : [];
  const matchedPosts = Array.isArray(value.matchedPosts) ? value.matchedPosts : [];
  const postSelection = isRecord(value.postSelection)
    ? value.postSelection
    : undefined;
  const keywordMatchers = Array.isArray(value.keywordMatchers)
    ? value.keywordMatchers
    : [];
  const conditionMatchers = Array.isArray(value.conditionMatchers)
    ? value.conditionMatchers
    : [];
  const attribution = isRecord(value.attribution) ? value.attribution : undefined;
  const errors: InstagramCommentTriggerConfigurationValidationError[] = [];

  if (value.schemaVersion !== INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION) {
    errors.push({
      code: "instagram-comment-trigger.schema_version_invalid",
      message:
        "Instagram comment trigger configuration must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.accountId)) {
    errors.push({
      code: "instagram-comment-trigger.account_id_required",
      message: "Instagram comment trigger configuration requires an account id.",
      path: "accountId",
    });
  }

  mediaIds.forEach((mediaId, index) => {
    if (!isNonEmptyString(mediaId)) {
      errors.push({
        code: "instagram-comment-trigger.media_id_required",
        message: "Instagram comment trigger media ids must be non-empty strings.",
        path: `mediaIds.${index}`,
      });
    }
  });

  matchedPosts.forEach((post, index) => {
    const postValue = isRecord(post) ? post : {};
    const caption = isRecord(postValue.caption) ? postValue.caption : undefined;
    const selectionCriteria = isRecord(postValue.selectionCriteria)
      ? postValue.selectionCriteria
      : undefined;

    if (!isNonEmptyString(postValue.mediaId) && !isNonEmptyString(postValue.postId)) {
      errors.push({
        code: "instagram-comment-trigger.post_identifier_required",
        message:
          "Instagram comment trigger matched posts require a media id or post id.",
        path: `matchedPosts.${index}`,
      });
    }

    if (
      postValue.permalink !== undefined &&
      !isHttpUrl(postValue.permalink)
    ) {
      errors.push({
        code: "instagram-comment-trigger.post_permalink_invalid",
        message: "Instagram comment trigger matched post permalink must be http(s).",
        path: `matchedPosts.${index}.permalink`,
      });
    }

    if (
      caption !== undefined &&
      !isNonEmptyString(caption.text) &&
      !isNonEmptyString(caption.sourceNodeId) &&
      !isNonEmptyString(caption.assetId)
    ) {
      errors.push({
        code: "instagram-comment-trigger.post_caption_reference_required",
        message:
          "Instagram comment trigger matched post captions require text, source node id, or asset id.",
        path: `matchedPosts.${index}.caption`,
      });
    }

    if (selectionCriteria !== undefined) {
      validateInstagramCommentTriggerPostSelectionCriteria(
        selectionCriteria,
        `matchedPosts.${index}.selectionCriteria`,
        errors,
      );
    }
  });

  if (postSelection !== undefined) {
    validateInstagramCommentTriggerPostSelectionCriteria(
      postSelection,
      "postSelection",
      errors,
    );
  }

  if (keywordMatchers.length === 0 && conditionMatchers.length === 0) {
    errors.push({
      code: "instagram-comment-trigger.condition_matchers_required",
      message:
        "Instagram comment trigger configuration requires at least one comment condition matcher.",
      path: "conditionMatchers",
    });
  }

  keywordMatchers.forEach((matcher, index) => {
    const matcherValue = isRecord(matcher) ? matcher : {};

    if (!isNonEmptyString(matcherValue.id)) {
      errors.push({
        code: "instagram-comment-trigger.keyword_matcher_id_required",
        message: "Instagram comment keyword matchers require an id.",
        path: `keywordMatchers.${index}.id`,
      });
    }

    if (!isNonEmptyString(matcherValue.value)) {
      errors.push({
        code: "instagram-comment-trigger.keyword_value_required",
        message: "Instagram comment keyword matchers require a value.",
        path: `keywordMatchers.${index}.value`,
      });
    }

    if (
      matcherValue.matchType !== "exact" &&
      matcherValue.matchType !== "contains" &&
      matcherValue.matchType !== "regex"
    ) {
      errors.push({
        code: "instagram-comment-trigger.keyword_match_type_invalid",
        message:
          "Instagram comment keyword matchers must use exact, contains, or regex matching.",
        path: `keywordMatchers.${index}.matchType`,
      });
    }
  });

  conditionMatchers.forEach((matcher, index) => {
    const matcherValue = isRecord(matcher) ? matcher : {};
    const operator = matcherValue.operator;
    const field = matcherValue.field;
    const keywords = Array.isArray(matcherValue.keywords)
      ? matcherValue.keywords
      : [];
    const mentions = Array.isArray(matcherValue.mentions)
      ? matcherValue.mentions
      : [];

    if (!isNonEmptyString(matcherValue.id)) {
      errors.push({
        code: "instagram-comment-trigger.condition_matcher_id_required",
        message: "Instagram comment condition matchers require an id.",
        path: `conditionMatchers.${index}.id`,
      });
    }

    if (!isInstagramCommentTriggerConditionField(field)) {
      errors.push({
        code: "instagram-comment-trigger.condition_field_invalid",
        message:
          "Instagram comment condition matchers must target text, commenter.username, mentions, or metadata.",
        path: `conditionMatchers.${index}.field`,
      });
    }

    if (
      !isInstagramCommentTriggerConditionOperator(operator)
    ) {
      errors.push({
        code: "instagram-comment-trigger.condition_operator_invalid",
        message:
          "Instagram comment condition matchers must use a supported operator.",
        path: `conditionMatchers.${index}.operator`,
      });
    }

    if (
      (operator === "equals" ||
        operator === "contains" ||
        operator === "starts_with" ||
        operator === "ends_with" ||
        operator === "regex") &&
      field !== "mentions" &&
      !isNonEmptyString(matcherValue.value)
    ) {
      errors.push({
        code: "instagram-comment-trigger.condition_value_required",
        message:
          "Instagram comment condition matchers using value operators require a value.",
        path: `conditionMatchers.${index}.value`,
      });
    }

    if (operator === "any_keyword" || operator === "all_keywords") {
      if (keywords.length === 0) {
        errors.push({
          code: "instagram-comment-trigger.condition_keywords_required",
          message:
            "Instagram comment keyword condition matchers require at least one keyword.",
          path: `conditionMatchers.${index}.keywords`,
        });
      }

      keywords.forEach((keyword, keywordIndex) => {
        if (!isNonEmptyString(keyword)) {
          errors.push({
            code: "instagram-comment-trigger.condition_keyword_required",
            message:
              "Instagram comment keyword condition matcher keywords must be non-empty strings.",
            path: `conditionMatchers.${index}.keywords.${keywordIndex}`,
          });
        }
      });
    }

    if (field === "mentions" && mentions.length === 0) {
      errors.push({
        code: "instagram-comment-trigger.condition_mention_required",
        message:
          "Instagram comment mention condition matchers require at least one mention.",
        path: `conditionMatchers.${index}.mentions`,
      });
    }

    mentions.forEach((mention, mentionIndex) => {
      if (!isNonEmptyString(mention)) {
        errors.push({
          code: "instagram-comment-trigger.condition_mention_required",
          message:
            "Instagram comment mention condition matcher mentions must be non-empty strings.",
          path: `conditionMatchers.${index}.mentions.${mentionIndex}`,
        });
      }
    });

    if (
      field === "metadata" &&
      !isInstagramCommentTriggerMetadataField(matcherValue.metadataField)
    ) {
      errors.push({
        code: "instagram-comment-trigger.condition_metadata_field_invalid",
        message:
          "Instagram comment metadata condition matchers must target a supported metadata field.",
        path: `conditionMatchers.${index}.metadataField`,
      });
    }
  });

  if (attribution !== undefined && !isNonEmptyString(attribution.campaign)) {
    errors.push({
      code: "instagram-comment-trigger.attribution_campaign_required",
      message:
        "Instagram comment trigger attribution requires a campaign value when attribution is configured.",
      path: "attribution.campaign",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateInstagramCommentTriggerPostSelectionCriteria(
  criteria: Record<string, unknown>,
  path: string,
  errors: InstagramCommentTriggerConfigurationValidationError[],
) {
  if (criteria.mode !== "include" && criteria.mode !== "exclude") {
    errors.push({
      code: "instagram-comment-trigger.post_selection_mode_invalid",
      message:
        "Instagram comment trigger post selection criteria must use include or exclude mode.",
      path: `${path}.mode`,
    });
  }

  validateOptionalStringArray(
    criteria.mediaIds,
    `${path}.mediaIds`,
    "instagram-comment-trigger.post_selection_media_id_required",
    "Instagram comment trigger post selection media ids must be non-empty strings.",
    errors,
  );
  validateOptionalStringArray(
    criteria.captionKeywords,
    `${path}.captionKeywords`,
    "instagram-comment-trigger.post_selection_caption_keyword_required",
    "Instagram comment trigger post selection caption keywords must be non-empty strings.",
    errors,
  );
  validateOptionalStringArray(
    criteria.hashtags,
    `${path}.hashtags`,
    "instagram-comment-trigger.post_selection_hashtag_required",
    "Instagram comment trigger post selection hashtags must be non-empty strings.",
    errors,
  );

  if (Array.isArray(criteria.permalinkUrls)) {
    criteria.permalinkUrls.forEach((permalinkUrl, index) => {
      if (!isHttpUrl(permalinkUrl)) {
        errors.push({
          code: "instagram-comment-trigger.post_selection_permalink_invalid",
          message:
            "Instagram comment trigger post selection permalink URLs must be http(s).",
          path: `${path}.permalinkUrls.${index}`,
        });
      }
    });
  }

  if (
    criteria.publishedAfter !== undefined &&
    (!isNonEmptyString(criteria.publishedAfter) ||
      Number.isNaN(Date.parse(criteria.publishedAfter)))
  ) {
    errors.push({
      code: "instagram-comment-trigger.post_selection_published_after_invalid",
      message:
        "Instagram comment trigger post selection publishedAfter must be a valid timestamp.",
      path: `${path}.publishedAfter`,
    });
  }

  if (
    criteria.publishedBefore !== undefined &&
    (!isNonEmptyString(criteria.publishedBefore) ||
      Number.isNaN(Date.parse(criteria.publishedBefore)))
  ) {
    errors.push({
      code: "instagram-comment-trigger.post_selection_published_before_invalid",
      message:
        "Instagram comment trigger post selection publishedBefore must be a valid timestamp.",
      path: `${path}.publishedBefore`,
    });
  }
}

function validateOptionalStringArray(
  value: unknown,
  path: string,
  code: InstagramCommentTriggerConfigurationValidationErrorCode,
  message: string,
  errors: InstagramCommentTriggerConfigurationValidationError[],
) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push({
        code,
        message,
        path: `${path}.${index}`,
      });
    }
  });
}

export type InstagramCommentTriggerEventValidationErrorCode =
  | "instagram-comment.schema_version_invalid"
  | "instagram-comment.id_required"
  | "instagram-comment.campaign_id_required"
  | "instagram-comment.occurred_at_invalid"
  | "instagram-comment.channel_invalid"
  | "instagram-comment.trigger_invalid"
  | "instagram-comment.account_id_required"
  | "instagram-comment.media_id_required"
  | "instagram-comment.comment_id_required"
  | "instagram-comment.commenter_id_required"
  | "instagram-comment.commenter_platform_invalid"
  | "instagram-comment.commenter_platform_user_id_required"
  | "instagram-comment.commenter_username_required"
  | "instagram-comment.commenter_profile_url_invalid"
  | "instagram-comment.commenter_profile_picture_url_invalid"
  | "instagram-comment.commenter_normalized_identity_id_required"
  | "instagram-comment.commenter_identity_namespace_required"
  | "instagram-comment.commenter_external_user_id_required"
  | "instagram-comment.commenter_anonymous_id_required"
  | "instagram-comment.commenter_email_hash_required"
  | "instagram-comment.commenter_phone_hash_required"
  | "instagram-comment.commenter_link_source_required"
  | "instagram-comment.commenter_link_confidence_invalid"
  | "instagram-comment.commenter_linked_at_invalid"
  | "instagram-comment.text_required";

export type InstagramCommentTriggerEventValidationError = {
  code: InstagramCommentTriggerEventValidationErrorCode;
  message: string;
  path: string;
};

export type InstagramCommentTriggerEventValidationResult = {
  ok: boolean;
  errors: InstagramCommentTriggerEventValidationError[];
};

export function validateInstagramCommentTriggerEvent(
  event: unknown,
): InstagramCommentTriggerEventValidationResult {
  const value = isRecord(event) ? event : {};
  const commenter = isRecord(value.commenter) ? value.commenter : {};
  const commenterProfile = isRecord(commenter.profile) ? commenter.profile : undefined;
  const commenterIdentityLinkage = isRecord(commenter.identityLinkage)
    ? commenter.identityLinkage
    : undefined;
  const errors: InstagramCommentTriggerEventValidationError[] = [];

  if (value.schemaVersion !== INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION) {
    errors.push({
      code: "instagram-comment.schema_version_invalid",
      message: "Instagram comment trigger events must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.id)) {
    errors.push({
      code: "instagram-comment.id_required",
      message: "Instagram comment trigger events require an event id.",
      path: "id",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "instagram-comment.campaign_id_required",
      message: "Instagram comment trigger events require a campaign id.",
      path: "campaignId",
    });
  }

  if (
    !isNonEmptyString(value.occurredAt) ||
    Number.isNaN(Date.parse(value.occurredAt))
  ) {
    errors.push({
      code: "instagram-comment.occurred_at_invalid",
      message: "Instagram comment trigger events require a valid occurredAt timestamp.",
      path: "occurredAt",
    });
  }

  if (value.channel !== "instagram") {
    errors.push({
      code: "instagram-comment.channel_invalid",
      message: "Instagram comment trigger events must use the instagram channel.",
      path: "channel",
    });
  }

  if (value.trigger !== "comment") {
    errors.push({
      code: "instagram-comment.trigger_invalid",
      message: "Instagram comment trigger events must use the comment trigger.",
      path: "trigger",
    });
  }

  if (!isNonEmptyString(value.accountId)) {
    errors.push({
      code: "instagram-comment.account_id_required",
      message: "Instagram comment trigger events require an Instagram account id.",
      path: "accountId",
    });
  }

  if (!isNonEmptyString(value.mediaId)) {
    errors.push({
      code: "instagram-comment.media_id_required",
      message: "Instagram comment trigger events require an Instagram media id.",
      path: "mediaId",
    });
  }

  if (!isNonEmptyString(value.commentId)) {
    errors.push({
      code: "instagram-comment.comment_id_required",
      message: "Instagram comment trigger events require an Instagram comment id.",
      path: "commentId",
    });
  }

  if (!isNonEmptyString(commenter.id)) {
    errors.push({
      code: "instagram-comment.commenter_id_required",
      message: "Instagram comment trigger events require a commenter id.",
      path: "commenter.id",
    });
  }

  validateInstagramCommenterIdentityReference(
    commenter,
    commenterProfile,
    commenterIdentityLinkage,
    errors,
  );

  if (!isNonEmptyString(value.text)) {
    errors.push({
      code: "instagram-comment.text_required",
      message: "Instagram comment trigger events require comment text.",
      path: "text",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateInstagramCommenterIdentityReference(
  commenter: Record<string, unknown>,
  profile: Record<string, unknown> | undefined,
  identityLinkage: Record<string, unknown> | undefined,
  errors: InstagramCommentTriggerEventValidationError[],
) {
  if (commenter.platform !== undefined && commenter.platform !== "instagram") {
    errors.push({
      code: "instagram-comment.commenter_platform_invalid",
      message: "Instagram commenter identity references must use the instagram platform.",
      path: "commenter.platform",
    });
  }

  if (
    commenter.platformUserId !== undefined &&
    !isNonEmptyString(commenter.platformUserId)
  ) {
    errors.push({
      code: "instagram-comment.commenter_platform_user_id_required",
      message:
        "Instagram commenter identity references require a non-empty platform user id when provided.",
      path: "commenter.platformUserId",
    });
  }

  if (commenter.username !== undefined && !isNonEmptyString(commenter.username)) {
    errors.push({
      code: "instagram-comment.commenter_username_required",
      message:
        "Instagram commenter identity references require a non-empty username when provided.",
      path: "commenter.username",
    });
  }

  if (profile !== undefined) {
    if (profile.profileUrl !== undefined && !isHttpUrl(profile.profileUrl)) {
      errors.push({
        code: "instagram-comment.commenter_profile_url_invalid",
        message:
          "Instagram commenter profile URLs must be valid http(s) URLs when provided.",
        path: "commenter.profile.profileUrl",
      });
    }

    if (
      profile.profilePictureUrl !== undefined &&
      !isHttpUrl(profile.profilePictureUrl)
    ) {
      errors.push({
        code: "instagram-comment.commenter_profile_picture_url_invalid",
        message:
          "Instagram commenter profile picture URLs must be valid http(s) URLs when provided.",
        path: "commenter.profile.profilePictureUrl",
      });
    }
  }

  if (identityLinkage !== undefined) {
    validateOptionalNonEmptyInstagramCommenterIdentityString(
      identityLinkage.normalizedIdentityId,
      "instagram-comment.commenter_normalized_identity_id_required",
      "Instagram commenter identity linkage requires a non-empty normalized identity id when provided.",
      "commenter.identityLinkage.normalizedIdentityId",
      errors,
    );
    validateOptionalNonEmptyInstagramCommenterIdentityString(
      identityLinkage.namespace,
      "instagram-comment.commenter_identity_namespace_required",
      "Instagram commenter identity linkage requires a non-empty namespace when provided.",
      "commenter.identityLinkage.namespace",
      errors,
    );
    validateOptionalNonEmptyInstagramCommenterIdentityString(
      identityLinkage.externalUserId,
      "instagram-comment.commenter_external_user_id_required",
      "Instagram commenter identity linkage requires a non-empty external user id when provided.",
      "commenter.identityLinkage.externalUserId",
      errors,
    );
    validateOptionalNonEmptyInstagramCommenterIdentityString(
      identityLinkage.anonymousId,
      "instagram-comment.commenter_anonymous_id_required",
      "Instagram commenter identity linkage requires a non-empty anonymous id when provided.",
      "commenter.identityLinkage.anonymousId",
      errors,
    );
    validateOptionalNonEmptyInstagramCommenterIdentityString(
      identityLinkage.emailHash,
      "instagram-comment.commenter_email_hash_required",
      "Instagram commenter identity linkage requires a non-empty email hash when provided.",
      "commenter.identityLinkage.emailHash",
      errors,
    );
    validateOptionalNonEmptyInstagramCommenterIdentityString(
      identityLinkage.phoneHash,
      "instagram-comment.commenter_phone_hash_required",
      "Instagram commenter identity linkage requires a non-empty phone hash when provided.",
      "commenter.identityLinkage.phoneHash",
      errors,
    );
    validateOptionalNonEmptyInstagramCommenterIdentityString(
      identityLinkage.linkSource,
      "instagram-comment.commenter_link_source_required",
      "Instagram commenter identity linkage requires a non-empty link source when provided.",
      "commenter.identityLinkage.linkSource",
      errors,
    );

    if (
      identityLinkage.linkConfidence !== undefined &&
      (typeof identityLinkage.linkConfidence !== "number" ||
        identityLinkage.linkConfidence < 0 ||
        identityLinkage.linkConfidence > 1)
    ) {
      errors.push({
        code: "instagram-comment.commenter_link_confidence_invalid",
        message:
          "Instagram commenter identity linkage confidence must be a number from 0 to 1 when provided.",
        path: "commenter.identityLinkage.linkConfidence",
      });
    }

    if (
      identityLinkage.linkedAt !== undefined &&
      (!isNonEmptyString(identityLinkage.linkedAt) ||
        Number.isNaN(Date.parse(identityLinkage.linkedAt)))
    ) {
      errors.push({
        code: "instagram-comment.commenter_linked_at_invalid",
        message:
          "Instagram commenter identity linkage linkedAt must be a valid timestamp when provided.",
        path: "commenter.identityLinkage.linkedAt",
      });
    }
  }
}

function validateOptionalNonEmptyInstagramCommenterIdentityString(
  value: unknown,
  code: InstagramCommentTriggerEventValidationErrorCode,
  message: string,
  path: string,
  errors: InstagramCommentTriggerEventValidationError[],
) {
  if (value !== undefined && !isNonEmptyString(value)) {
    errors.push({
      code,
      message,
      path,
    });
  }
}

export const INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION =
  "owncanvas.instagram-dm-action-configuration.v1";

export const INSTAGRAM_COMMENT_TO_DM_RESPONSE_MAPPING_SCHEMA_VERSION =
  "owncanvas.instagram-comment-to-dm-response-mapping.v1";

export const INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD = "FOLLOW_CHECK";

export type InstagramDmActionConfigurationAttribution = {
  source: "instagram";
  medium: "dm";
  campaign: string;
  content?: string;
  term?: string;
};

export type InstagramDmActionConfigurationMessage = {
  templateId?: string;
  text: string;
  variables?: Record<string, string | number | boolean>;
};

export type InstagramDmGateQuickReply = {
  contentType: "text";
  title: string;
  payload: string;
};

export type InstagramDmGateFollowGateConfiguration = {
  enabled: boolean;
  checkQuickReply?: InstagramDmGateQuickReply;
  successMessage?: InstagramDmActionConfigurationMessage;
  notFollowingMessage?: InstagramDmActionConfigurationMessage;
  quickReplies?: NonEmptyArray<InstagramDmGateQuickReply>;
  simulatedFollowStatus?: boolean;
};

export type InstagramCommentToDmResponseMapping = {
  id: string;
  triggerMatcherId: string;
  message: InstagramDmActionConfigurationMessage;
  landingUrl?: string;
  resourceUrl?: string;
  attributionTermTemplate?: string;
  metadata?: Record<string, unknown>;
};

export type InstagramDmActionConfiguration = {
  schemaVersion: typeof INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION;
  campaignId: string;
  capabilityId: string;
  triggerConfiguration: InstagramCommentTriggerConfiguration;
  message?: InstagramDmActionConfigurationMessage;
  landingUrl?: string;
  resourceUrl?: string;
  responseMappings?: NonEmptyArray<InstagramCommentToDmResponseMapping>;
  followGate?: InstagramDmGateFollowGateConfiguration;
  attribution?: InstagramDmActionConfigurationAttribution;
  metadata?: Record<string, unknown>;
};

export type InstagramDmResponseSelectionFailureReason =
  | "invalid_configuration"
  | "invalid_trigger_event"
  | "campaign_mismatch"
  | "no_response_mappings"
  | "no_matching_response_mapping";

export type InstagramDmResponseSelectionResult =
  | {
      matched: true;
      matcherId: string;
      mappingId: string;
      message: InstagramDmActionConfigurationMessage;
      landingUrl: string;
      resourceUrl?: string;
      attribution?: InstagramDmActionConfigurationAttribution;
    }
  | {
      matched: false;
      reason: InstagramDmResponseSelectionFailureReason;
      mappingId?: never;
      errors?: readonly (
        | InstagramDmActionConfigurationValidationError
        | InstagramCommentTriggerEventValidationError
      )[];
    };

export type PluginActionConfigurationSchema = {
  schemaVersion: "owncanvas.plugin-action-configuration-schema.v1";
  configurationSchemaVersion: string;
  actionType: string;
  title: string;
  description: string;
  channel: DirectMessageChannel;
  trigger: DirectMessageTrigger;
  requiredFields: readonly string[];
  attributionFields: readonly string[];
  responseMappingSchemaVersion?: string;
  mappingFields?: readonly string[];
  followGateFields?: readonly string[];
  properties: readonly PluginTriggerEventSchemaProperty[];
};

export const INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA = {
  schemaVersion: "owncanvas.plugin-action-configuration-schema.v1",
  configurationSchemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  actionType: "instagram.dm.configure-send",
  title: "Instagram DM action configuration",
  description:
    "Campaign-level configuration for turning eligible Instagram comments into tracked DM handoffs.",
  channel: "instagram",
  trigger: "comment",
  requiredFields: [
    "schemaVersion",
    "campaignId",
    "capabilityId",
    "triggerConfiguration",
    "message.text",
    "landingUrl|resourceUrl",
    "responseMappings",
  ],
  attributionFields: [
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "attribution.content",
    "attribution.term",
  ],
  responseMappingSchemaVersion:
    INSTAGRAM_COMMENT_TO_DM_RESPONSE_MAPPING_SCHEMA_VERSION,
  mappingFields: [
    "responseMappings.triggerMatcherId",
    "responseMappings.message.templateId",
    "responseMappings.message.text",
    "responseMappings.landingUrl|resourceUrl",
  ],
  followGateFields: [
    "followGate.enabled",
    "followGate.checkQuickReply.title",
    "followGate.checkQuickReply.payload",
    "followGate.successMessage.text",
    "followGate.notFollowingMessage.text",
    "followGate.quickReplies.title",
    "followGate.quickReplies.payload",
    "followGate.simulatedFollowStatus",
  ],
  properties: [
    {
      key: "campaignId",
      type: "string",
      required: true,
      description: "Campaign that owns the configured comment-to-DM action.",
    },
    {
      key: "capabilityId",
      type: "string",
      required: true,
      description: "Direct-message capability selected on the campaign canvas.",
    },
    {
      key: "triggerConfiguration",
      type: "object",
      required: true,
      description: "Validated Instagram comment trigger configuration.",
    },
    {
      key: "message",
      type: "object",
      required: false,
      description:
        "Legacy single response template for every eligible comment trigger.",
    },
    {
      key: "landingUrl",
      type: "url",
      required: false,
      description:
        "Legacy single tracked landing URL to include in every DM response.",
    },
    {
      key: "resourceUrl",
      type: "url",
      required: false,
      description:
        "Direct campaign resource URL used when the DM Gate sends a gated asset instead of a landing page.",
    },
    {
      key: "responseMappings",
      type: "json",
      required: true,
      description:
        "Mappings from comment trigger matcher IDs to DM response templates and tracked landing or resource URLs.",
    },
    {
      key: "followGate",
      type: "json",
      required: false,
      description:
        "Optional soft follow-gate prompt, quick replies, and deterministic offline follow status for DM Gate fixtures.",
    },
    {
      key: "attribution",
      type: "object",
      required: false,
      description: "UTM-ready source, medium, campaign, content, and term values.",
    },
  ],
} as const satisfies PluginActionConfigurationSchema;

export type InstagramDmActionConfigurationValidationErrorCode =
  | "instagram-dm-config.schema_version_invalid"
  | "instagram-dm-config.campaign_id_required"
  | "instagram-dm-config.capability_id_required"
  | "instagram-dm-config.trigger_configuration_invalid"
  | "instagram-dm-config.message_text_required"
  | "instagram-dm-config.landing_url_invalid"
  | "instagram-dm-config.response_mapping_id_required"
  | "instagram-dm-config.response_mapping_trigger_matcher_id_required"
  | "instagram-dm-config.response_mapping_trigger_matcher_not_found"
  | "instagram-dm-config.response_mapping_message_text_required"
  | "instagram-dm-config.response_mapping_landing_url_invalid"
  | "instagram-dm-config.response_mapping_resource_url_invalid"
  | "instagram-dm-config.follow_gate_check_quick_reply_required"
  | "instagram-dm-config.follow_gate_check_quick_reply_payload_invalid"
  | "instagram-dm-config.follow_gate_success_message_required"
  | "instagram-dm-config.follow_gate_not_following_message_required"
  | "instagram-dm-config.follow_gate_quick_replies_required"
  | "instagram-dm-config.follow_gate_quick_reply_invalid"
  | "instagram-dm-config.follow_gate_simulated_follow_status_required"
  | "instagram-dm-config.attribution_source_invalid"
  | "instagram-dm-config.attribution_medium_invalid"
  | "instagram-dm-config.attribution_campaign_mismatch"
  | "instagram-dm-config.trigger_campaign_mismatch";

export type InstagramDmActionConfigurationValidationError = {
  code: InstagramDmActionConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type InstagramDmActionConfigurationValidationResult = {
  ok: boolean;
  errors: InstagramDmActionConfigurationValidationError[];
};

export function validateInstagramDmActionConfiguration(
  configuration: unknown,
): InstagramDmActionConfigurationValidationResult {
  const value = isRecord(configuration) ? configuration : {};
  const triggerConfiguration = value.triggerConfiguration;
  const message = isRecord(value.message) ? value.message : {};
  const responseMappings = Array.isArray(value.responseMappings)
    ? value.responseMappings
    : [];
  const followGate = isRecord(value.followGate) ? value.followGate : undefined;
  const attribution = isRecord(value.attribution) ? value.attribution : undefined;
  const errors: InstagramDmActionConfigurationValidationError[] = [];
  const usesDmGateResource =
    value.resourceUrl !== undefined ||
    responseMappings.some(
      (mapping) => isRecord(mapping) && mapping.resourceUrl !== undefined,
    ) ||
    followGate !== undefined;

  if (value.schemaVersion !== INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION) {
    errors.push({
      code: "instagram-dm-config.schema_version_invalid",
      message:
        "Instagram DM action configurations must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "instagram-dm-config.campaign_id_required",
      message: "Instagram DM action configurations require a campaign id.",
      path: "campaignId",
    });
  }

  if (!isNonEmptyString(value.capabilityId)) {
    errors.push({
      code: "instagram-dm-config.capability_id_required",
      message: "Instagram DM action configurations require a capability id.",
      path: "capabilityId",
    });
  }

  const triggerValidation =
    validateInstagramCommentTriggerConfiguration(triggerConfiguration);

  if (!triggerValidation.ok) {
    errors.push({
      code: "instagram-dm-config.trigger_configuration_invalid",
      message:
        "Instagram DM action configurations require a valid Instagram comment trigger configuration.",
      path: "triggerConfiguration",
    });
  }

  if (
    (responseMappings.length === 0 || usesDmGateResource) &&
    !isNonEmptyString(message.text)
  ) {
    errors.push({
      code: "instagram-dm-config.message_text_required",
      message: "Instagram DM action configurations require message text.",
      path: "message.text",
    });
  }

  if (
    (responseMappings.length === 0 || usesDmGateResource) &&
    !isHttpUrl(value.landingUrl) &&
    !isHttpUrl(value.resourceUrl)
  ) {
    errors.push({
      code: "instagram-dm-config.landing_url_invalid",
      message:
        "Instagram DM action configurations require an http or https landing or resource URL.",
      path: "landingUrl|resourceUrl",
    });
  } else {
    if (value.landingUrl !== undefined && !isHttpUrl(value.landingUrl)) {
      errors.push({
        code: "instagram-dm-config.landing_url_invalid",
        message:
          "Instagram DM action landing URLs must use http or https.",
        path: "landingUrl",
      });
    }

    if (value.resourceUrl !== undefined && !isHttpUrl(value.resourceUrl)) {
      errors.push({
        code: "instagram-dm-config.response_mapping_resource_url_invalid",
        message:
          "Instagram DM action resource URLs must use http or https.",
        path: "resourceUrl",
      });
    }
  }

  if (usesDmGateResource && responseMappings.length === 0) {
    errors.push({
      code: "instagram-dm-config.response_mapping_id_required",
      message: "Instagram DM Gate configurations require response mappings.",
      path: "responseMappings",
    });
  }

  const triggerMatcherIds = collectInstagramCommentTriggerMatcherIds(
    triggerConfiguration,
  );

  responseMappings.forEach((mapping, index) => {
    const mappingValue = isRecord(mapping) ? mapping : {};
    const mappingMessage = isRecord(mappingValue.message)
      ? mappingValue.message
      : {};

    if (!isNonEmptyString(mappingValue.id)) {
      errors.push({
        code: "instagram-dm-config.response_mapping_id_required",
        message: "Instagram DM response mappings require an id.",
        path: `responseMappings.${index}.id`,
      });
    }

    if (!isNonEmptyString(mappingValue.triggerMatcherId)) {
      errors.push({
        code: "instagram-dm-config.response_mapping_trigger_matcher_id_required",
        message:
          "Instagram DM response mappings require a trigger matcher id.",
        path: `responseMappings.${index}.triggerMatcherId`,
      });
    } else if (!triggerMatcherIds.has(mappingValue.triggerMatcherId)) {
      errors.push({
        code: "instagram-dm-config.response_mapping_trigger_matcher_not_found",
        message:
          "Instagram DM response mappings must reference a configured comment trigger matcher.",
        path: `responseMappings.${index}.triggerMatcherId`,
      });
    }

    if (!isNonEmptyString(mappingMessage.text)) {
      errors.push({
        code: "instagram-dm-config.response_mapping_message_text_required",
        message: "Instagram DM response mappings require message text.",
        path: `responseMappings.${index}.message.text`,
      });
    }

    const mappingHasLandingUrl = isHttpUrl(mappingValue.landingUrl);
    const mappingHasResourceUrl = isHttpUrl(mappingValue.resourceUrl);

    if (!mappingHasLandingUrl && !mappingHasResourceUrl) {
      errors.push({
        code: "instagram-dm-config.response_mapping_landing_url_invalid",
        message:
          "Instagram DM response mappings require an http or https landing or resource URL.",
        path: `responseMappings.${index}.landingUrl|resourceUrl`,
      });
    } else {
      if (
        mappingValue.landingUrl !== undefined &&
        !isHttpUrl(mappingValue.landingUrl)
      ) {
        errors.push({
          code: "instagram-dm-config.response_mapping_landing_url_invalid",
          message:
            "Instagram DM response mapping landing URLs must use http or https.",
          path: `responseMappings.${index}.landingUrl`,
        });
      }

      if (
        mappingValue.resourceUrl !== undefined &&
        !isHttpUrl(mappingValue.resourceUrl)
      ) {
        errors.push({
          code: "instagram-dm-config.response_mapping_resource_url_invalid",
          message:
            "Instagram DM response mapping resource URLs must use http or https.",
          path: `responseMappings.${index}.resourceUrl`,
        });
      }
    }
  });

  validateInstagramDmGateFollowGateConfiguration(followGate, errors);

  if (attribution !== undefined && attribution.source !== "instagram") {
    errors.push({
      code: "instagram-dm-config.attribution_source_invalid",
      message: "Instagram DM action attribution source must be instagram.",
      path: "attribution.source",
    });
  }

  if (attribution !== undefined && attribution.medium !== "dm") {
    errors.push({
      code: "instagram-dm-config.attribution_medium_invalid",
      message: "Instagram DM action attribution medium must be dm.",
      path: "attribution.medium",
    });
  }

  if (
    attribution !== undefined &&
    isNonEmptyString(value.campaignId) &&
    isNonEmptyString(attribution.campaign) &&
    attribution.campaign !== value.campaignId
  ) {
    errors.push({
      code: "instagram-dm-config.attribution_campaign_mismatch",
      message:
        "Instagram DM action attribution campaign must match the configured campaign.",
      path: "attribution.campaign",
    });
  }

  if (
    isRecord(triggerConfiguration) &&
    isRecord(triggerConfiguration.attribution) &&
    isNonEmptyString(value.campaignId) &&
    isNonEmptyString(triggerConfiguration.attribution.campaign) &&
    triggerConfiguration.attribution.campaign !== value.campaignId
  ) {
    errors.push({
      code: "instagram-dm-config.trigger_campaign_mismatch",
      message:
        "Instagram DM trigger attribution campaign must match the configured campaign.",
      path: "triggerConfiguration.attribution.campaign",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateInstagramDmGateFollowGateConfiguration(
  followGate: Record<string, unknown> | undefined,
  errors: InstagramDmActionConfigurationValidationError[],
) {
  if (followGate === undefined || followGate.enabled !== true) {
    return;
  }

  const checkQuickReply = isRecord(followGate.checkQuickReply)
    ? followGate.checkQuickReply
    : undefined;
  const successMessage = isRecord(followGate.successMessage)
    ? followGate.successMessage
    : undefined;
  const notFollowingMessage = isRecord(followGate.notFollowingMessage)
    ? followGate.notFollowingMessage
    : undefined;
  const quickReplies = Array.isArray(followGate.quickReplies)
    ? followGate.quickReplies
    : [];

  if (!isInstagramDmGateQuickReply(checkQuickReply)) {
    errors.push({
      code: "instagram-dm-config.follow_gate_check_quick_reply_required",
      message:
        "Enabled Instagram DM Gate follow gates require a text quick reply for follow checks.",
      path: "followGate.checkQuickReply",
    });
  } else if (
    checkQuickReply.payload !== INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD
  ) {
    errors.push({
      code: "instagram-dm-config.follow_gate_check_quick_reply_payload_invalid",
      message:
        "The follow check quick reply must own the FOLLOW_CHECK payload.",
      path: "followGate.checkQuickReply.payload",
    });
  }

  if (!isNonEmptyString(successMessage?.text)) {
    errors.push({
      code: "instagram-dm-config.follow_gate_success_message_required",
      message:
        "Enabled Instagram DM Gate follow gates require a success message.",
      path: "followGate.successMessage.text",
    });
  }

  if (!isNonEmptyString(notFollowingMessage?.text)) {
    errors.push({
      code: "instagram-dm-config.follow_gate_not_following_message_required",
      message:
        "Enabled Instagram DM Gate follow gates require a not-following retry message.",
      path: "followGate.notFollowingMessage.text",
    });
  }

  if (quickReplies.length === 0) {
    errors.push({
      code: "instagram-dm-config.follow_gate_quick_replies_required",
      message:
        "Enabled Instagram DM Gate follow gates require text quick replies.",
      path: "followGate.quickReplies",
    });
  } else {
    quickReplies.forEach((quickReply, index) => {
      if (!isInstagramDmGateQuickReply(quickReply)) {
        errors.push({
          code: "instagram-dm-config.follow_gate_quick_reply_invalid",
          message:
            "Instagram DM Gate quick replies must be text replies with title and payload.",
          path: `followGate.quickReplies.${index}`,
        });
      }
    });

    if (
      isInstagramDmGateQuickReply(checkQuickReply) &&
      !quickReplies.some(
        (quickReply) =>
          isInstagramDmGateQuickReply(quickReply) &&
          quickReply.payload === checkQuickReply.payload,
      )
    ) {
      errors.push({
        code: "instagram-dm-config.follow_gate_quick_reply_invalid",
        message:
          "Instagram DM Gate quick replies must include the configured follow check payload.",
        path: "followGate.quickReplies",
      });
    }
  }

  if (typeof followGate.simulatedFollowStatus !== "boolean") {
    errors.push({
      code: "instagram-dm-config.follow_gate_simulated_follow_status_required",
      message:
        "Enabled Instagram DM Gate follow gates require deterministic simulated follow status for offline tests.",
      path: "followGate.simulatedFollowStatus",
    });
  }
}

function isInstagramDmGateQuickReply(
  value: unknown,
): value is InstagramDmGateQuickReply {
  return (
    isRecord(value) &&
    value.contentType === "text" &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.payload)
  );
}

export function selectInstagramDmResponseForCommentEvent(
  configuration: unknown,
  event: unknown,
): InstagramDmResponseSelectionResult {
  const configurationValidation =
    validateInstagramDmActionConfiguration(configuration);

  if (!configurationValidation.ok) {
    return {
      matched: false,
      reason: "invalid_configuration",
      errors: configurationValidation.errors,
    };
  }

  const eventValidation = validateInstagramCommentTriggerEvent(event);

  if (!eventValidation.ok) {
    return {
      matched: false,
      reason: "invalid_trigger_event",
      errors: eventValidation.errors,
    };
  }

  const value = configuration as InstagramDmActionConfiguration;
  const triggerEvent = event as InstagramCommentTriggerEvent;
  const responseMappings = Array.isArray(value.responseMappings)
    ? value.responseMappings
    : [];

  if (value.campaignId !== triggerEvent.campaignId) {
    return {
      matched: false,
      reason: "campaign_mismatch",
    };
  }

  if (responseMappings.length === 0) {
    return {
      matched: false,
      reason: "no_response_mappings",
    };
  }

  const matchers = collectInstagramCommentTriggerMatchers(
    value.triggerConfiguration,
  );

  for (const mapping of responseMappings) {
    const matcher = matchers.get(mapping.triggerMatcherId);

    if (
      matcher !== undefined &&
      doesInstagramCommentTriggerMatcherMatchEvent(matcher, triggerEvent)
    ) {
      const selectedUrl = resolveInstagramDmActionResourceUrl(value, mapping);
      const attribution = buildInstagramDmResponseSelectionAttribution(
        value.attribution,
        mapping,
        triggerEvent,
      );

      return {
        matched: true,
        matcherId: mapping.triggerMatcherId,
        mappingId: mapping.id,
        message: mapping.message,
        landingUrl: selectedUrl,
        ...(mapping.resourceUrl === undefined
          ? {}
          : { resourceUrl: mapping.resourceUrl }),
        ...(attribution === undefined ? {} : { attribution }),
      };
    }
  }

  return {
    matched: false,
    reason: "no_matching_response_mapping",
  };
}

export type InstagramDmGateActionEventName =
  | "prompt_sent"
  | "follow_check_requested"
  | "resource_link_ready"
  | "resource_link_sent"
  | "not_following_retry_prompted"
  | "no_match";

export type InstagramDmGateActionOutcome =
  | {
      matched: true;
      matcherId: string;
      mappingId: string;
      events: NonEmptyArray<InstagramDmGateActionEventName>;
      message: InstagramDmActionConfigurationMessage;
      resourceUrl?: string;
      quickReplies?: NonEmptyArray<InstagramDmGateQuickReply>;
      checkQuickReply?: InstagramDmGateQuickReply;
      followStatus?: "following" | "not_following";
    }
  | {
      matched: false;
      reason: InstagramDmResponseSelectionFailureReason;
      events: readonly ["no_match"];
      errors?: readonly (
        | InstagramDmActionConfigurationValidationError
        | InstagramCommentTriggerEventValidationError
      )[];
    };

export function resolveInstagramDmGateActionOutcome(
  configuration: unknown,
  event: unknown,
  input: { quickReplyPayload?: string } = {},
): InstagramDmGateActionOutcome {
  const selection = selectInstagramDmResponseForCommentEvent(configuration, event);

  if (!selection.matched) {
    return {
      matched: false,
      reason: selection.reason,
      events: ["no_match"],
      ...(selection.errors === undefined ? {} : { errors: selection.errors }),
    };
  }

  const value = configuration as InstagramDmActionConfiguration;
  const followGate = value.followGate;
  const resourceUrl = selection.resourceUrl ?? selection.landingUrl;

  if (followGate?.enabled !== true) {
    return {
      matched: true,
      matcherId: selection.matcherId,
      mappingId: selection.mappingId,
      events: ["resource_link_ready", "resource_link_sent"],
      message: selection.message,
      resourceUrl,
    };
  }

  const checkQuickReply = followGate.checkQuickReply as InstagramDmGateQuickReply;

  if (input.quickReplyPayload !== checkQuickReply.payload) {
    return {
      matched: true,
      matcherId: selection.matcherId,
      mappingId: selection.mappingId,
      events: ["prompt_sent"],
      message: value.message as InstagramDmActionConfigurationMessage,
      resourceUrl,
      quickReplies: followGate.quickReplies as NonEmptyArray<InstagramDmGateQuickReply>,
    };
  }

  if (followGate.simulatedFollowStatus === true) {
    return {
      matched: true,
      matcherId: selection.matcherId,
      mappingId: selection.mappingId,
      events: [
        "follow_check_requested",
        "resource_link_ready",
        "resource_link_sent",
      ],
      followStatus: "following",
      message: followGate.successMessage as InstagramDmActionConfigurationMessage,
      resourceUrl,
      checkQuickReply,
    };
  }

  return {
    matched: true,
    matcherId: selection.matcherId,
    mappingId: selection.mappingId,
    events: ["follow_check_requested", "not_following_retry_prompted"],
    followStatus: "not_following",
    message: followGate.notFollowingMessage as InstagramDmActionConfigurationMessage,
    quickReplies: followGate.quickReplies as NonEmptyArray<InstagramDmGateQuickReply>,
    checkQuickReply,
  };
}

function resolveInstagramDmActionResourceUrl(
  configuration: InstagramDmActionConfiguration,
  mapping: InstagramCommentToDmResponseMapping,
): string {
  return (
    firstHttpUrl(
      mapping.landingUrl,
      mapping.resourceUrl,
      configuration.landingUrl,
      configuration.resourceUrl,
    ) ?? ""
  );
}

function firstHttpUrl(...values: readonly unknown[]): string | undefined {
  return values.find(isHttpUrl);
}

function collectInstagramCommentTriggerMatchers(
  triggerConfiguration: InstagramCommentTriggerConfiguration,
): Map<string, InstagramCommentTriggerConditionMatcher | InstagramCommentKeywordMatcher> {
  const matchers = new Map<
    string,
    InstagramCommentTriggerConditionMatcher | InstagramCommentKeywordMatcher
  >();

  triggerConfiguration.conditionMatchers?.forEach((matcher) => {
    matchers.set(matcher.id, matcher);
  });
  triggerConfiguration.keywordMatchers?.forEach((matcher) => {
    matchers.set(matcher.id, matcher);
  });

  return matchers;
}

function doesInstagramCommentTriggerMatcherMatchEvent(
  matcher: InstagramCommentTriggerConditionMatcher | InstagramCommentKeywordMatcher,
  event: InstagramCommentTriggerEvent,
): boolean {
  if ("matchType" in matcher) {
    return doesStringMatcherMatch(
      event.text,
      matcher.matchType,
      matcher.value,
      matcher.caseSensitive,
    );
  }

  if (matcher.field === "mentions") {
    return doesMentionMatcherMatch(matcher, event);
  }

  const fieldValue = getInstagramCommentTriggerEventFieldValue(matcher, event);

  if (matcher.operator === "any_keyword" || matcher.operator === "all_keywords") {
    return doesKeywordConditionMatch(
      fieldValue,
      matcher.operator,
      matcher.keywords ?? [],
      matcher.caseSensitive,
    );
  }

  if (!isNonEmptyString(matcher.value)) {
    return false;
  }

  return doesStringMatcherMatch(
    fieldValue,
    matcher.operator,
    matcher.value,
    matcher.caseSensitive,
  );
}

function getInstagramCommentTriggerEventFieldValue(
  matcher: InstagramCommentTriggerConditionMatcher,
  event: InstagramCommentTriggerEvent,
): unknown {
  switch (matcher.field) {
    case "text":
      return event.text;
    case "commenter.username":
      return event.commenter.username;
    case "metadata":
      return matcher.metadataField === undefined
        ? undefined
        : event.metadata?.[matcher.metadataField];
    case "mentions":
      return collectInstagramCommentMentions(event);
  }
}

function doesMentionMatcherMatch(
  matcher: InstagramCommentTriggerConditionMatcher,
  event: InstagramCommentTriggerEvent,
): boolean {
  const eventMentions = collectInstagramCommentMentions(event).map((mention) =>
    normalizeInstagramCommentMatcherValue(mention, matcher.caseSensitive),
  );
  const expectedMentions = (matcher.mentions ?? []).map((mention) =>
    normalizeInstagramCommentMatcherValue(mention, matcher.caseSensitive),
  );

  if (expectedMentions.length === 0) {
    return false;
  }

  if (matcher.operator === "all_keywords") {
    return expectedMentions.every((mention) => eventMentions.includes(mention));
  }

  return expectedMentions.some((mention) => eventMentions.includes(mention));
}

function collectInstagramCommentMentions(
  event: InstagramCommentTriggerEvent,
): string[] {
  const metadataMentions = event.metadata?.mentions;

  if (Array.isArray(metadataMentions)) {
    return metadataMentions.filter(isNonEmptyString);
  }

  return event.text.match(/@[A-Za-z0-9_.]+/g) ?? [];
}

function doesKeywordConditionMatch(
  value: unknown,
  operator: "any_keyword" | "all_keywords",
  keywords: readonly string[],
  caseSensitive: boolean | undefined,
): boolean {
  const normalizedValue = normalizeInstagramCommentMatcherValue(
    value,
    caseSensitive,
  );
  const normalizedKeywords = keywords
    .filter(isNonEmptyString)
    .map((keyword) =>
      normalizeInstagramCommentMatcherValue(keyword, caseSensitive),
    );

  if (!isNonEmptyString(normalizedValue) || normalizedKeywords.length === 0) {
    return false;
  }

  if (operator === "all_keywords") {
    return normalizedKeywords.every((keyword) => normalizedValue.includes(keyword));
  }

  return normalizedKeywords.some((keyword) => normalizedValue.includes(keyword));
}

function doesStringMatcherMatch(
  value: unknown,
  operator:
    | InstagramCommentKeywordMatchType
    | Exclude<InstagramCommentTriggerConditionOperator, "any_keyword" | "all_keywords">,
  expected: string,
  caseSensitive: boolean | undefined,
): boolean {
  const normalizedValue = normalizeInstagramCommentMatcherValue(
    value,
    caseSensitive,
  );
  const normalizedExpected = normalizeInstagramCommentMatcherValue(
    expected,
    caseSensitive,
  );

  if (!isNonEmptyString(normalizedValue) || !isNonEmptyString(normalizedExpected)) {
    return false;
  }

  switch (operator) {
    case "exact":
    case "equals":
      return normalizedValue === normalizedExpected;
    case "contains":
      return normalizedValue.includes(normalizedExpected);
    case "starts_with":
      return normalizedValue.startsWith(normalizedExpected);
    case "ends_with":
      return normalizedValue.endsWith(normalizedExpected);
    case "regex":
      return doesRegexMatcherMatch(value, expected, caseSensitive);
  }
}

function doesRegexMatcherMatch(
  value: unknown,
  pattern: string,
  caseSensitive: boolean | undefined,
): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    return new RegExp(pattern, caseSensitive ? undefined : "i").test(value);
  } catch {
    return false;
  }
}

function normalizeInstagramCommentMatcherValue(
  value: unknown,
  caseSensitive: boolean | undefined,
): string {
  const stringValue =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";

  return caseSensitive ? stringValue : stringValue.toLowerCase();
}

function buildInstagramDmResponseSelectionAttribution(
  attribution: InstagramDmActionConfigurationAttribution | undefined,
  mapping: InstagramCommentToDmResponseMapping,
  event: InstagramCommentTriggerEvent,
): InstagramDmActionConfigurationAttribution | undefined {
  if (attribution === undefined) {
    return undefined;
  }

  return {
    ...attribution,
    ...(mapping.attributionTermTemplate === undefined
      ? {}
      : {
          term: renderInstagramCommentAttributionTemplate(
            mapping.attributionTermTemplate,
            event,
          ),
        }),
  };
}

function renderInstagramCommentAttributionTemplate(
  template: string,
  event: InstagramCommentTriggerEvent,
): string {
  return template
    .replaceAll("{{commentText}}", event.text)
    .replaceAll("{{mediaId}}", event.mediaId)
    .replaceAll("{{commentId}}", event.commentId)
    .replaceAll("{{commenter.username}}", event.commenter.username ?? "");
}

function collectInstagramCommentTriggerMatcherIds(
  triggerConfiguration: unknown,
): Set<string> {
  if (!isRecord(triggerConfiguration)) {
    return new Set();
  }

  const matcherIds = new Set<string>();
  const conditionMatchers = Array.isArray(triggerConfiguration.conditionMatchers)
    ? triggerConfiguration.conditionMatchers
    : [];
  const keywordMatchers = Array.isArray(triggerConfiguration.keywordMatchers)
    ? triggerConfiguration.keywordMatchers
    : [];

  [...conditionMatchers, ...keywordMatchers].forEach((matcher) => {
    const matcherValue = isRecord(matcher) ? matcher : {};

    if (isNonEmptyString(matcherValue.id)) {
      matcherIds.add(matcherValue.id);
    }
  });

  return matcherIds;
}

const DM_AUTOMATION_PERSONALIZATION_SOURCES = [
  "profile",
  "trigger-event",
  "campaign",
  "product-offer",
  "landing-route",
  "custom",
] as const satisfies readonly DmAutomationPersonalizationSource[];

const DM_AUTOMATION_ROUTE_CONDITION_OPERATORS = [
  "equals",
  "contains",
  "exists",
  "missing",
] as const satisfies readonly DmAutomationRouteConditionOperator[];

export type DmAutomationConfigurationValidationErrorCode =
  | "dm-automation.schema_version_invalid"
  | "dm-automation.channel_required"
  | "dm-automation.trigger_required"
  | "dm-automation.campaign_id_required"
  | "dm-automation.template_required"
  | "dm-automation.template_id_required"
  | "dm-automation.template_body_required"
  | "dm-automation.template_variable_missing"
  | "dm-automation.personalization_variable_required"
  | "dm-automation.personalization_key_required"
  | "dm-automation.personalization_source_invalid"
  | "dm-automation.personalization_path_required"
  | "dm-automation.landing_route_required"
  | "dm-automation.landing_route_id_required"
  | "dm-automation.landing_route_url_invalid"
  | "dm-automation.landing_route_condition_invalid"
  | "dm-automation.default_template_not_found"
  | "dm-automation.default_landing_route_not_found";

export type DmAutomationConfigurationValidationError = {
  code: DmAutomationConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type DmAutomationConfigurationValidationResult = {
  ok: boolean;
  errors: DmAutomationConfigurationValidationError[];
};

export function validateDmAutomationConfiguration(
  configuration: unknown,
): DmAutomationConfigurationValidationResult {
  const value = isRecord(configuration) ? configuration : {};
  const templates = Array.isArray(value.templates) ? value.templates : [];
  const personalizationVariables = Array.isArray(value.personalizationVariables)
    ? value.personalizationVariables
    : [];
  const landingUrlRoutes = Array.isArray(value.landingUrlRoutes)
    ? value.landingUrlRoutes
    : [];
  const templateIds = new Set<string>();
  const personalizationKeys = new Set<string>();
  const landingRouteIds = new Set<string>();
  const errors: DmAutomationConfigurationValidationError[] = [];

  personalizationVariables.forEach((variable) => {
    const variableValue = isRecord(variable) ? variable : {};

    if (isNonEmptyString(variableValue.key)) {
      personalizationKeys.add(variableValue.key);
    }
  });

  if (value.schemaVersion !== DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION) {
    errors.push({
      code: "dm-automation.schema_version_invalid",
      message: "DM automation configurations must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.channel)) {
    errors.push({
      code: "dm-automation.channel_required",
      message: "DM automation configurations require a channel.",
      path: "channel",
    });
  }

  if (!isNonEmptyString(value.trigger)) {
    errors.push({
      code: "dm-automation.trigger_required",
      message: "DM automation configurations require a trigger.",
      path: "trigger",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "dm-automation.campaign_id_required",
      message: "DM automation configurations require a campaign id.",
      path: "campaignId",
    });
  }

  if (templates.length === 0) {
    errors.push({
      code: "dm-automation.template_required",
      message: "DM automation configurations require at least one reply template.",
      path: "templates",
    });
  }

  templates.forEach((template, index) => {
    const templateValue = isRecord(template) ? template : {};
    const requiredVariables = Array.isArray(templateValue.requiredVariables)
      ? templateValue.requiredVariables
      : [];

    if (!isNonEmptyString(templateValue.id)) {
      errors.push({
        code: "dm-automation.template_id_required",
        message: "DM automation reply templates require an id.",
        path: `templates.${index}.id`,
      });
    } else {
      templateIds.add(templateValue.id);
    }

    if (!isNonEmptyString(templateValue.body)) {
      errors.push({
        code: "dm-automation.template_body_required",
        message: "DM automation reply templates require body text.",
        path: `templates.${index}.body`,
      });
    }

    requiredVariables.forEach((variable, variableIndex) => {
      if (
        !isNonEmptyString(variable) ||
        !personalizationKeys.has(variable)
      ) {
        errors.push({
          code: "dm-automation.template_variable_missing",
          message:
            "Template required variables must reference configured personalization variables.",
          path: `templates.${index}.requiredVariables.${variableIndex}`,
        });
      }
    });
  });

  if (personalizationVariables.length === 0) {
    errors.push({
      code: "dm-automation.personalization_variable_required",
      message:
        "DM automation configurations require at least one personalization variable.",
      path: "personalizationVariables",
    });
  }

  personalizationVariables.forEach((variable, index) => {
    const variableValue = isRecord(variable) ? variable : {};

    if (!isNonEmptyString(variableValue.key)) {
      errors.push({
        code: "dm-automation.personalization_key_required",
        message: "Personalization variables require a key.",
        path: `personalizationVariables.${index}.key`,
      });
    }

    if (
      !isNonEmptyString(variableValue.source) ||
      !DM_AUTOMATION_PERSONALIZATION_SOURCES.includes(
        variableValue.source as DmAutomationPersonalizationSource,
      )
    ) {
      errors.push({
        code: "dm-automation.personalization_source_invalid",
        message: "Personalization variables require a supported source.",
        path: `personalizationVariables.${index}.source`,
      });
    }

    if (!isNonEmptyString(variableValue.path)) {
      errors.push({
        code: "dm-automation.personalization_path_required",
        message: "Personalization variables require a source path.",
        path: `personalizationVariables.${index}.path`,
      });
    }
  });

  if (landingUrlRoutes.length === 0) {
    errors.push({
      code: "dm-automation.landing_route_required",
      message: "DM automation configurations require at least one landing URL route.",
      path: "landingUrlRoutes",
    });
  }

  landingUrlRoutes.forEach((route, index) => {
    const routeValue = isRecord(route) ? route : {};
    const routeWhen = isRecord(routeValue.routeWhen)
      ? routeValue.routeWhen
      : undefined;

    if (!isNonEmptyString(routeValue.id)) {
      errors.push({
        code: "dm-automation.landing_route_id_required",
        message: "Landing URL routes require an id.",
        path: `landingUrlRoutes.${index}.id`,
      });
    } else {
      landingRouteIds.add(routeValue.id);
    }

    if (!isTemplatedHttpUrl(routeValue.urlTemplate)) {
      errors.push({
        code: "dm-automation.landing_route_url_invalid",
        message: "Landing URL routes require an http(s) URL template.",
        path: `landingUrlRoutes.${index}.urlTemplate`,
      });
    }

    if (
      routeWhen !== undefined &&
      (!isNonEmptyString(routeWhen.variable) ||
        !isNonEmptyString(routeWhen.operator) ||
        !DM_AUTOMATION_ROUTE_CONDITION_OPERATORS.includes(
          routeWhen.operator as DmAutomationRouteConditionOperator,
        ))
    ) {
      errors.push({
        code: "dm-automation.landing_route_condition_invalid",
        message:
          "Landing URL route conditions require a variable and supported operator.",
        path: `landingUrlRoutes.${index}.routeWhen`,
      });
    }
  });

  if (
    isNonEmptyString(value.defaultTemplateId) &&
    !templateIds.has(value.defaultTemplateId)
  ) {
    errors.push({
      code: "dm-automation.default_template_not_found",
      message: "Default template id must reference a configured template.",
      path: "defaultTemplateId",
    });
  }

  if (
    isNonEmptyString(value.defaultLandingRouteId) &&
    !landingRouteIds.has(value.defaultLandingRouteId)
  ) {
    errors.push({
      code: "dm-automation.default_landing_route_not_found",
      message:
        "Default landing route id must reference a configured landing URL route.",
      path: "defaultLandingRouteId",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export const INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION =
  "owncanvas.instagram-dm-action-execution.v1";

export type InstagramDmActionAttribution = {
  source: "instagram";
  medium: "dm";
  campaign: string;
  content?: string;
  term?: string;
};

export type InstagramDmActionRecipient = {
  instagramUserId: string;
  username?: string;
};

export type InstagramDmActionMessage = {
  templateId?: string;
  text: string;
  variables?: Record<string, string | number | boolean>;
};

export type InstagramDmActionExecutionRequest = {
  schemaVersion: typeof INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION;
  id: string;
  campaignId: string;
  capabilityId: string;
  requestedAt: string;
  requestedBy: PluginActor;
  triggerEvent: InstagramCommentTriggerEvent;
  recipient: InstagramDmActionRecipient;
  message: InstagramDmActionMessage;
  landingUrl: string;
  attribution?: InstagramDmActionAttribution;
  metadata?: Record<string, unknown>;
};

export type InstagramDmActionExecutionStatus =
  | "queued"
  | "delivered"
  | "skipped"
  | "failed";

export type InstagramDmActionExecutionResponse = {
  schemaVersion: typeof INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION;
  requestId: string;
  campaignId: string;
  capabilityId: string;
  status: InstagramDmActionExecutionStatus;
  occurredAt: string;
  delivery: {
    channel: "instagram";
    recipientId: string;
    messageId?: string;
    landingUrl: string;
  };
  attribution?: InstagramDmActionAttribution;
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, unknown>;
};

export type InstagramDmTrackedLandingUrlInput = {
  landingUrl: string;
  attribution: Pick<
    LandingPageHandoffAttribution,
    "source" | "medium" | "campaign" | "content" | "term"
  >;
  sourceDm: {
    pluginId: string;
    capabilityId: string;
    deliveryEventId: string;
    triggerEventId?: string;
  };
  visitor?: {
    platformUserId?: string;
    username?: string;
  };
  offer?: {
    productId?: string;
    offerId?: string;
    sku?: string;
  };
  touchpointId?: string;
};

export type InstagramDmActionExecutionContext = {
  plugin: DirectMessagePluginManifest;
  configuration?: PluginAppliedConfiguration;
  now?: () => string;
};

export type InstagramDmActionExecutor = {
  execute(
    request: InstagramDmActionExecutionRequest,
    context: InstagramDmActionExecutionContext,
  ): Promise<InstagramDmActionExecutionResponse>;
};

export type InstagramDmDispatchMessage = {
  accountId: string;
  recipientId: string;
  text: string;
  landingUrl: string;
  metadata: Record<string, unknown>;
};

export type InstagramDmDispatchTransport = {
  sendDirectMessage(
    message: InstagramDmDispatchMessage,
  ):
    | {
        messageId?: string;
        metadata?: Record<string, unknown>;
      }
    | Promise<{
        messageId?: string;
        metadata?: Record<string, unknown>;
      }>;
};

export type InstagramDmDispatchAdapter = {
  execute(
    request: unknown,
    context: InstagramDmActionExecutionContext,
  ): Promise<InstagramDmActionExecutionResponse>;
};

export type InstagramCommentDmLandingFlowInput = {
  configuration: unknown;
  commentEvent: unknown;
  dmExecutor: InstagramDmActionExecutor;
  dmContext: InstagramDmActionExecutionContext;
  landingAction: LandingFlowDestinationMappingAction;
  createDmExecutionRequest: (
    selection: Extract<InstagramDmResponseSelectionResult, { matched: true }>,
  ) => InstagramDmActionExecutionRequest;
};

export type InstagramCommentDmLandingFlowResult =
  | {
      ok: true;
      selection: Extract<InstagramDmResponseSelectionResult, { matched: true }>;
      dmResponse: InstagramDmActionExecutionResponse;
      landingDestination: LandingFlowDestinationMappingAction;
    }
  | {
      ok: false;
      reason:
        | InstagramDmResponseSelectionFailureReason
        | "dm_response_not_delivered"
        | "landing_destination_invalid";
      selection?: InstagramDmResponseSelectionResult;
      dmResponse?: InstagramDmActionExecutionResponse;
      errors?: LandingFlowDestinationMappingActionValidationError[];
    };

export async function executeInstagramCommentDmLandingFlow(
  input: InstagramCommentDmLandingFlowInput,
): Promise<InstagramCommentDmLandingFlowResult> {
  const selection = selectInstagramDmResponseForCommentEvent(
    input.configuration,
    input.commentEvent,
  );

  if (selection.matched === false) {
    return {
      ok: false,
      reason: selection.reason,
      selection,
    };
  }

  const dmResponse = await input.dmExecutor.execute(
    input.createDmExecutionRequest(selection),
    input.dmContext,
  );

  if (dmResponse.status !== "delivered") {
    return {
      ok: false,
      reason: "dm_response_not_delivered",
      selection,
      dmResponse,
    };
  }

  const landingDestination = mapDmResponseEventToLandingDestinationMetadata({
    dmResponse,
    action: input.landingAction,
  });
  const validation =
    validateLandingFlowDestinationMappingAction(landingDestination);

  if (!validation.ok) {
    return {
      ok: false,
      reason: "landing_destination_invalid",
      selection,
      dmResponse,
      errors: validation.errors,
    };
  }

  return {
    ok: true,
    selection,
    dmResponse,
    landingDestination,
  };
}

export function createInstagramDmDispatchAdapter(
  transport: InstagramDmDispatchTransport,
): InstagramDmDispatchAdapter {
  return {
    async execute(request, context) {
      const occurredAt = context.now?.() ?? new Date().toISOString();
      const validation = validateInstagramDmActionExecutionRequest(request);

      if (!validation.ok) {
        return createFailedInstagramDmActionExecutionResponse(
          request,
          occurredAt,
          validation.errors[0]?.code ?? "instagram-dm.validation_failed",
          "Instagram DM dispatch requires a valid execution request before sending.",
        );
      }

      const executionRequest = request as InstagramDmActionExecutionRequest;

      try {
        const providerResponse = await transport.sendDirectMessage({
          accountId:
            typeof context.configuration?.values.accountId === "string"
              ? context.configuration.values.accountId
              : executionRequest.triggerEvent.accountId,
          recipientId: executionRequest.recipient.instagramUserId,
          text: executionRequest.message.text,
          landingUrl: executionRequest.landingUrl,
          metadata: {
            campaignId: executionRequest.campaignId,
            capabilityId: executionRequest.capabilityId,
            executionId: executionRequest.id,
            requestedBy: executionRequest.requestedBy,
            triggerEventId: executionRequest.triggerEvent.id,
            ...(executionRequest.metadata ?? {}),
          },
        });

        return {
          schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
          requestId: executionRequest.id,
          campaignId: executionRequest.campaignId,
          capabilityId: executionRequest.capabilityId,
          status: "delivered",
          occurredAt,
          delivery: {
            channel: "instagram",
            recipientId: executionRequest.recipient.instagramUserId,
            ...(providerResponse.messageId === undefined
              ? {}
              : { messageId: providerResponse.messageId }),
            landingUrl: executionRequest.landingUrl,
          },
          ...(executionRequest.attribution === undefined
            ? {}
            : { attribution: executionRequest.attribution }),
          ...(providerResponse.metadata === undefined
            ? {}
            : { metadata: providerResponse.metadata }),
        };
      } catch (error) {
        return createFailedInstagramDmActionExecutionResponse(
          request,
          occurredAt,
          isRecord(error) && typeof error.code === "string"
            ? error.code
            : "instagram_dm_dispatch_failed",
          error instanceof Error
            ? error.message
            : "Instagram DM dispatch failed.",
        );
      }
    },
  };
}

function createFailedInstagramDmActionExecutionResponse(
  request: unknown,
  occurredAt: string,
  code: string,
  message: string,
): InstagramDmActionExecutionResponse {
  const value = isRecord(request) ? request : {};
  const recipient = isRecord(value.recipient) ? value.recipient : {};

  return {
    schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
    requestId: typeof value.id === "string" ? value.id : "",
    campaignId: typeof value.campaignId === "string" ? value.campaignId : "",
    capabilityId:
      typeof value.capabilityId === "string" ? value.capabilityId : "",
    status: "failed",
    occurredAt,
    delivery: {
      channel: "instagram",
      recipientId:
        typeof recipient.instagramUserId === "string"
          ? recipient.instagramUserId
          : "",
      landingUrl: typeof value.landingUrl === "string" ? value.landingUrl : "",
    },
    error: {
      code,
      message,
    },
  };
}

export type PluginActionExecutionSchemaProperty = {
  key: string;
  type: PluginConfigurationFieldType | "object" | "datetime" | "url";
  required: boolean;
  description: string;
};

export type PluginActionExecutionSchema = {
  schemaVersion: "owncanvas.plugin-action-execution-schema.v1";
  executionSchemaVersion: string;
  actionType: string;
  title: string;
  description: string;
  channel: DirectMessageChannel;
  trigger: DirectMessageTrigger;
  requiredFields: readonly string[];
  attributionFields: readonly string[];
  properties: readonly PluginActionExecutionSchemaProperty[];
};

export const INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA = {
  schemaVersion: "owncanvas.plugin-action-execution-schema.v1",
  executionSchemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
  actionType: "instagram.dm.send",
  title: "Instagram DM action execution",
  description:
    "A versioned execution request for sending compliant Instagram DMs with tracked landing links.",
  channel: "instagram",
  trigger: "comment",
  requiredFields: [
    "id",
    "campaignId",
    "capabilityId",
    "requestedAt",
    "requestedBy",
    "triggerEvent",
    "recipient.instagramUserId",
    "message.text",
    "landingUrl",
  ],
  attributionFields: [
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "attribution.content",
    "attribution.term",
  ],
  properties: [
    {
      key: "id",
      type: "string",
      required: true,
      description: "Stable execution request identifier for audit logs.",
    },
    {
      key: "campaignId",
      type: "string",
      required: true,
      description: "Campaign that owns the DM execution.",
    },
    {
      key: "capabilityId",
      type: "string",
      required: true,
      description: "Direct-message capability selected on the campaign canvas.",
    },
    {
      key: "requestedAt",
      type: "datetime",
      required: true,
      description: "ISO timestamp when the execution was requested.",
    },
    {
      key: "requestedBy",
      type: "string",
      required: true,
      description: "Human or agent actor that requested the execution.",
    },
    {
      key: "triggerEvent",
      type: "object",
      required: true,
      description: "Validated Instagram comment trigger event.",
    },
    {
      key: "recipient",
      type: "object",
      required: true,
      description: "Instagram user eligible to receive the DM.",
    },
    {
      key: "message",
      type: "object",
      required: true,
      description: "Template ID, rendered text, and optional template variables.",
    },
    {
      key: "landingUrl",
      type: "url",
      required: true,
      description: "Tracked landing URL sent in the DM.",
    },
    {
      key: "attribution",
      type: "object",
      required: false,
      description: "UTM-ready attribution fields for the DM handoff.",
    },
  ],
} as const satisfies PluginActionExecutionSchema;

export type InstagramDmActionExecutionValidationErrorCode =
  | "instagram-dm.schema_version_invalid"
  | "instagram-dm.id_required"
  | "instagram-dm.campaign_id_required"
  | "instagram-dm.capability_id_required"
  | "instagram-dm.requested_at_invalid"
  | "instagram-dm.requested_by_invalid"
  | "instagram-dm.trigger_event_invalid"
  | "instagram-dm.recipient_id_required"
  | "instagram-dm.message_text_required"
  | "instagram-dm.landing_url_invalid"
  | "instagram-dm.trigger_campaign_mismatch";

export type InstagramDmActionExecutionValidationError = {
  code: InstagramDmActionExecutionValidationErrorCode;
  message: string;
  path: string;
};

export type InstagramDmActionExecutionValidationResult = {
  ok: boolean;
  errors: InstagramDmActionExecutionValidationError[];
};

export function validateInstagramDmActionExecutionRequest(
  request: unknown,
): InstagramDmActionExecutionValidationResult {
  const value = isRecord(request) ? request : {};
  const triggerEvent = value.triggerEvent;
  const recipient = isRecord(value.recipient) ? value.recipient : {};
  const message = isRecord(value.message) ? value.message : {};
  const errors: InstagramDmActionExecutionValidationError[] = [];

  if (value.schemaVersion !== INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION) {
    errors.push({
      code: "instagram-dm.schema_version_invalid",
      message:
        "Instagram DM action execution requests must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.id)) {
    errors.push({
      code: "instagram-dm.id_required",
      message: "Instagram DM action execution requests require an id.",
      path: "id",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "instagram-dm.campaign_id_required",
      message: "Instagram DM action execution requests require a campaign id.",
      path: "campaignId",
    });
  }

  if (!isNonEmptyString(value.capabilityId)) {
    errors.push({
      code: "instagram-dm.capability_id_required",
      message: "Instagram DM action execution requests require a capability id.",
      path: "capabilityId",
    });
  }

  if (
    !isNonEmptyString(value.requestedAt) ||
    Number.isNaN(Date.parse(value.requestedAt))
  ) {
    errors.push({
      code: "instagram-dm.requested_at_invalid",
      message:
        "Instagram DM action execution requests require a valid requestedAt timestamp.",
      path: "requestedAt",
    });
  }

  if (value.requestedBy !== "human" && value.requestedBy !== "agent") {
    errors.push({
      code: "instagram-dm.requested_by_invalid",
      message:
        "Instagram DM action execution requests must be requested by a human or agent.",
      path: "requestedBy",
    });
  }

  const triggerValidation = validateInstagramCommentTriggerEvent(triggerEvent);

  if (!triggerValidation.ok) {
    errors.push({
      code: "instagram-dm.trigger_event_invalid",
      message:
        "Instagram DM action execution requests require a valid Instagram comment trigger event.",
      path: "triggerEvent",
    });
  }

  if (!isNonEmptyString(recipient.instagramUserId)) {
    errors.push({
      code: "instagram-dm.recipient_id_required",
      message:
        "Instagram DM action execution requests require a recipient Instagram user id.",
      path: "recipient.instagramUserId",
    });
  }

  if (!isNonEmptyString(message.text)) {
    errors.push({
      code: "instagram-dm.message_text_required",
      message: "Instagram DM action execution requests require message text.",
      path: "message.text",
    });
  }

  if (!isHttpUrl(value.landingUrl)) {
    errors.push({
      code: "instagram-dm.landing_url_invalid",
      message:
        "Instagram DM action execution requests require an http or https landing URL.",
      path: "landingUrl",
    });
  }

  if (
    isRecord(triggerEvent) &&
    isNonEmptyString(value.campaignId) &&
    isNonEmptyString(triggerEvent.campaignId) &&
    triggerEvent.campaignId !== value.campaignId
  ) {
    errors.push({
      code: "instagram-dm.trigger_campaign_mismatch",
      message:
        "Instagram DM action execution campaign must match the trigger event campaign.",
      path: "triggerEvent.campaignId",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function createInstagramDmTrackedLandingUrl(
  input: InstagramDmTrackedLandingUrlInput,
): string | undefined {
  if (!isHttpUrl(input.landingUrl)) {
    return undefined;
  }

  const url = new URL(input.landingUrl);

  url.searchParams.set("utm_source", input.attribution.source);
  url.searchParams.set("utm_medium", input.attribution.medium);
  url.searchParams.set("utm_campaign", input.attribution.campaign);

  if (isNonEmptyString(input.attribution.content)) {
    url.searchParams.set("utm_content", input.attribution.content);
  }

  if (isNonEmptyString(input.attribution.term)) {
    url.searchParams.set("utm_term", input.attribution.term);
  }

  url.searchParams.set("oc_dm_plugin_id", input.sourceDm.pluginId);
  url.searchParams.set("oc_dm_capability_id", input.sourceDm.capabilityId);
  url.searchParams.set("oc_dm_delivery_event_id", input.sourceDm.deliveryEventId);

  if (isNonEmptyString(input.sourceDm.triggerEventId)) {
    url.searchParams.set(
      "oc_dm_trigger_event_id",
      input.sourceDm.triggerEventId,
    );
  }

  if (isNonEmptyString(input.visitor?.platformUserId)) {
    url.searchParams.set("oc_platform_user_id", input.visitor.platformUserId);
  }

  if (isNonEmptyString(input.visitor?.username)) {
    url.searchParams.set("oc_username", input.visitor.username);
  }

  if (isNonEmptyString(input.touchpointId)) {
    url.searchParams.set("oc_touchpoint_id", input.touchpointId);
  }

  if (isNonEmptyString(input.offer?.productId)) {
    url.searchParams.set("oc_product_id", input.offer.productId);
  }

  if (isNonEmptyString(input.offer?.offerId)) {
    url.searchParams.set("oc_offer_id", input.offer.offerId);
  }

  if (isNonEmptyString(input.offer?.sku)) {
    url.searchParams.set("oc_sku", input.offer.sku);
  }

  return url.toString();
}

function readUrlSearchParams(value: string): URLSearchParams {
  try {
    return new URL(value).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function firstNonEmptyString(...values: readonly unknown[]): string {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }

  return "";
}

function normalizeReferralToken(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeLandingDmReferralChannel(value: string): LandingDmReferralChannel {
  const normalized = normalizeReferralToken(value);

  if (normalized === "ig" || normalized === "instagram_dm") {
    return "instagram";
  }

  return normalized as LandingDmReferralChannel;
}

function optionalStringField<TKey extends string>(
  key: TKey,
  value: unknown,
): Partial<Record<TKey, string>> {
  return isNonEmptyString(value) ? { [key]: value } as Record<TKey, string> : {};
}

function optionalNumberField<TKey extends string>(
  key: TKey,
  value: unknown,
): Partial<Record<TKey, number>> {
  return typeof value === "number" ? ({ [key]: value } as Record<TKey, number>) : {};
}

function createLandingDmReferralVisitor(
  input: LandingDmReferralContextParseInput,
  searchParams: URLSearchParams,
): LandingDmReferralContext["visitor"] | undefined {
  const visitor = input.visitor ?? {};
  const identityLinkage = isRecord(visitor.identityLinkage)
    ? visitor.identityLinkage
    : undefined;
  const normalizedUsername = firstNonEmptyString(
    visitor.username,
    searchParams.get("oc_username"),
    searchParams.get("username"),
  ).replace(/^@+/, "");
  const normalizedVisitor = {
    ...optionalStringField(
      "anonymousId",
      firstNonEmptyString(
        visitor.anonymousId,
        searchParams.get("oc_anonymous_id"),
        searchParams.get("anonymous_id"),
      ),
    ),
    ...optionalStringField(
      "externalUserId",
      firstNonEmptyString(
        visitor.externalUserId,
        searchParams.get("oc_external_user_id"),
        searchParams.get("external_user_id"),
      ),
    ),
    ...optionalStringField(
      "platformUserId",
      firstNonEmptyString(
        visitor.platformUserId,
        searchParams.get("oc_platform_user_id"),
        searchParams.get("platform_user_id"),
        searchParams.get("ig_user_id"),
        searchParams.get("dm_recipient_id"),
      ),
    ),
    ...optionalStringField("username", normalizedUsername),
    ...(identityLinkage === undefined ? {} : { identityLinkage }),
  };

  return Object.keys(normalizedVisitor).length === 0 ? undefined : normalizedVisitor;
}

function createLandingDmReferralOffer(
  input: LandingDmReferralContextParseInput,
  searchParams: URLSearchParams,
): LandingDmReferralContext["offer"] | undefined {
  const offer = input.offer ?? {};
  const normalizedOffer = {
    ...optionalStringField(
      "productId",
      firstNonEmptyString(
        offer.productId,
        searchParams.get("oc_product_id"),
        searchParams.get("product_id"),
      ),
    ),
    ...optionalStringField(
      "offerId",
      firstNonEmptyString(
        offer.offerId,
        searchParams.get("oc_offer_id"),
        searchParams.get("offer_id"),
      ),
    ),
    ...optionalStringField(
      "sku",
      firstNonEmptyString(offer.sku, searchParams.get("oc_sku"), searchParams.get("sku")),
    ),
  };

  return Object.keys(normalizedOffer).length === 0 ? undefined : normalizedOffer;
}

function isTemplatedHttpUrl(value: unknown): value is string {
  return isNonEmptyString(value) && /^https?:\/\//.test(value);
}

function extractTemplateVariableNames(template: string): Set<string> {
  const variables = new Set<string>();

  for (const match of template.matchAll(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g)) {
    variables.add(match[1]);
  }

  return variables;
}

function renderTemplateText(
  template: string,
  variables: Record<string, DmAutomationReplyVariableValue>,
): string {
  return template.replace(
    /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g,
    (_placeholder, variable: string) => String(variables[variable] ?? ""),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type DirectMessagePluginDetails = {
  channel: DirectMessageChannel;
  supportedTriggers: NonEmptyArray<DirectMessageTrigger>;
  deliveryModes: NonEmptyArray<DirectMessageDeliveryMode>;
  requiresComplianceReview: boolean;
  automationConfigurationSchemas?: readonly PluginDmAutomationConfigurationSchema[];
  actionConfigurationSchemas?: readonly PluginActionConfigurationSchema[];
  triggerConfigurationSchemas?: readonly PluginTriggerConfigurationSchema[];
  triggerEventSchemas?: readonly PluginTriggerEventSchema[];
};

export type DirectMessageCapabilityKind = Extract<
  PluginCapabilityKind,
  "channel.dm"
>;

export type DirectMessagePluginCapability = PluginCapability & {
  kind: DirectMessageCapabilityKind;
};

export type DirectMessageAccountConfigurationField = PluginConfigurationField & {
  directMessageConfigType: "account";
  type: "string" | "select" | "secret";
  channel: DirectMessageChannel;
  secretRef?: string;
};

export type DirectMessageTemplateConfigurationField = PluginConfigurationField & {
  directMessageConfigType: "template";
  type: "string" | "select" | "json";
};

export type DirectMessagePersonalizationConfigurationField =
  PluginConfigurationField & {
    directMessageConfigType: "personalization";
    type: "json";
  };

export type DirectMessageLandingRoutingConfigurationField =
  PluginConfigurationField & {
    directMessageConfigType: "landing-routing";
    type: "json";
  };

export type DirectMessageThrottleConfigurationField = PluginConfigurationField & {
  directMessageConfigType: "throttle";
  type: "number" | "json";
};

export type DirectMessageComplianceConfigurationField =
  PluginConfigurationField & {
    directMessageConfigType: "compliance";
    type: "boolean" | "select" | "json";
  };

export type DirectMessageConfigurationField =
  | DirectMessageAccountConfigurationField
  | DirectMessageTemplateConfigurationField
  | DirectMessagePersonalizationConfigurationField
  | DirectMessageLandingRoutingConfigurationField
  | DirectMessageThrottleConfigurationField
  | DirectMessageComplianceConfigurationField;

export type DirectMessageConfigurationSchema = {
  fields: NonEmptyArray<DirectMessageConfigurationField>;
};

export type DirectMessageConfigurationValidationErrorCode =
  | "direct-message.dm_capability_required"
  | "direct-message.delivery_event_output_port_required"
  | "direct-message.configuration_required"
  | "direct-message.duplicate_config_key"
  | "direct-message.unknown_config_type"
  | "direct-message.channel_mismatch"
  | "direct-message.field_type_mismatch"
  | "direct-message.compliance_required"
  | "direct-message.numeric_default_must_be_positive"
  | "direct-message.automation_configuration_channel_mismatch"
  | "direct-message.automation_configuration_unsupported"
  | "direct-message.action_configuration_channel_mismatch"
  | "direct-message.action_configuration_unsupported"
  | "direct-message.trigger_configuration_channel_mismatch"
  | "direct-message.trigger_configuration_unsupported"
  | "direct-message.trigger_event_channel_mismatch"
  | "direct-message.trigger_event_unsupported";

export type DirectMessageConfigurationValidationError = {
  code: DirectMessageConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type DirectMessageConfigurationValidationResult = {
  ok: boolean;
  errors: DirectMessageConfigurationValidationError[];
};

type DirectMessageConfigurationValidationInput = {
  directMessage: DirectMessagePluginDetails;
  capabilities: readonly {
    kind: PluginCapabilityKind;
    outputPorts?: readonly Pick<PluginOutputPort, "id" | "dataType">[];
  }[];
  configuration: {
    fields: readonly (PluginConfigurationField & {
      directMessageConfigType?: string;
      channel?: string;
    })[];
  };
};

export const DIRECT_MESSAGE_CONFIG_FIELD_TYPES: Record<
  string,
  readonly PluginConfigurationFieldType[]
> = {
  account: ["string", "select", "secret"],
  template: ["string", "select", "json"],
  personalization: ["json"],
  "landing-routing": ["json"],
  throttle: ["number", "json"],
  compliance: ["boolean", "select", "json"],
};

export function validateDirectMessagePluginConfiguration(
  plugin: DirectMessageConfigurationValidationInput,
): DirectMessageConfigurationValidationResult {
  const errors: DirectMessageConfigurationValidationError[] = [];
  const dmCapabilities = plugin.capabilities.filter(
    (capability) => capability.kind === "channel.dm",
  );

  if (dmCapabilities.length === 0) {
    errors.push({
      code: "direct-message.dm_capability_required",
      message: "Direct-message plugins must declare a channel.dm capability.",
      path: "capabilities",
    });
  }

  if (
    !dmCapabilities.some((capability) =>
      capability.outputPorts?.some(
        (port) => port.id === "delivery" && port.dataType === "event",
      ),
    )
  ) {
    errors.push({
      code: "direct-message.delivery_event_output_port_required",
      message:
        "Direct-message capabilities must declare a delivery event output port.",
      path: "capabilities.outputPorts",
    });
  }

  if (plugin.configuration.fields.length === 0) {
    errors.push({
      code: "direct-message.configuration_required",
      message: "Direct-message plugins must declare at least one configuration field.",
      path: "configuration.fields",
    });
  }

  const seen = new Set<string>();

  plugin.configuration.fields.forEach((field, index) => {
    if (seen.has(field.key)) {
      errors.push({
        code: "direct-message.duplicate_config_key",
        message: `Direct-message configuration key "${field.key}" is duplicated.`,
        path: `configuration.fields.${index}.key`,
      });
    } else {
      seen.add(field.key);
    }
  });

  plugin.configuration.fields.forEach((field, index) => {
    if (
      field.directMessageConfigType !== undefined &&
      !(field.directMessageConfigType in DIRECT_MESSAGE_CONFIG_FIELD_TYPES)
    ) {
      errors.push({
        code: "direct-message.unknown_config_type",
        message: `${field.directMessageConfigType} is not a supported direct-message configuration type.`,
        path: `configuration.fields.${index}.directMessageConfigType`,
      });
    }
  });

  plugin.configuration.fields.forEach((field, index) => {
    if (
      field.directMessageConfigType === "account" &&
      field.channel !== plugin.directMessage.channel
    ) {
      errors.push({
        code: "direct-message.channel_mismatch",
        message:
          "Direct-message account configuration channel must match the plugin channel.",
        path: `configuration.fields.${index}.channel`,
      });
    }
  });

  plugin.configuration.fields.forEach((field, index) => {
    const allowedTypes =
      field.directMessageConfigType === undefined
        ? undefined
        : DIRECT_MESSAGE_CONFIG_FIELD_TYPES[field.directMessageConfigType];

    if (allowedTypes !== undefined && !allowedTypes.includes(field.type)) {
      errors.push({
        code: "direct-message.field_type_mismatch",
        message: `${field.directMessageConfigType} direct-message configuration cannot use ${field.type} fields.`,
        path: `configuration.fields.${index}.type`,
      });
    }
  });

  if (
    plugin.directMessage.requiresComplianceReview &&
    !plugin.configuration.fields.some(
      (field) => field.directMessageConfigType === "compliance",
    )
  ) {
    errors.push({
      code: "direct-message.compliance_required",
      message:
        "Direct-message plugins requiring compliance review must declare a compliance configuration field.",
      path: "configuration.fields",
    });
  }

  plugin.configuration.fields.forEach((field, index) => {
    if (
      field.type === "number" &&
      typeof field.defaultValue === "number" &&
      field.defaultValue <= 0
    ) {
      errors.push({
        code: "direct-message.numeric_default_must_be_positive",
        message: "Direct-message numeric defaults must be greater than zero.",
        path: `configuration.fields.${index}.defaultValue`,
      });
    }
  });

  plugin.directMessage.automationConfigurationSchemas?.forEach((schema, index) => {
    if (schema.channel !== plugin.directMessage.channel) {
      errors.push({
        code: "direct-message.automation_configuration_channel_mismatch",
        message:
          "Direct-message automation configuration schema channel must match the plugin channel.",
        path: `directMessage.automationConfigurationSchemas.${index}.channel`,
      });
    }

    if (!plugin.directMessage.supportedTriggers.includes(schema.trigger)) {
      errors.push({
        code: "direct-message.automation_configuration_unsupported",
        message:
          "Direct-message automation configuration schema trigger must be listed in supported triggers.",
        path: `directMessage.automationConfigurationSchemas.${index}.trigger`,
      });
    }
  });

  plugin.directMessage.actionConfigurationSchemas?.forEach((schema, index) => {
    if (schema.channel !== plugin.directMessage.channel) {
      errors.push({
        code: "direct-message.action_configuration_channel_mismatch",
        message:
          "Direct-message action configuration schema channel must match the plugin channel.",
        path: `directMessage.actionConfigurationSchemas.${index}.channel`,
      });
    }

    if (!plugin.directMessage.supportedTriggers.includes(schema.trigger)) {
      errors.push({
        code: "direct-message.action_configuration_unsupported",
        message:
          "Direct-message action configuration schema trigger must be listed in supported triggers.",
        path: `directMessage.actionConfigurationSchemas.${index}.trigger`,
      });
    }
  });

  plugin.directMessage.triggerConfigurationSchemas?.forEach((schema, index) => {
    if (schema.channel !== plugin.directMessage.channel) {
      errors.push({
        code: "direct-message.trigger_configuration_channel_mismatch",
        message:
          "Direct-message trigger configuration schema channel must match the plugin channel.",
        path: `directMessage.triggerConfigurationSchemas.${index}.channel`,
      });
    }

    if (!plugin.directMessage.supportedTriggers.includes(schema.trigger)) {
      errors.push({
        code: "direct-message.trigger_configuration_unsupported",
        message:
          "Direct-message trigger configuration schema trigger must be listed in supported triggers.",
        path: `directMessage.triggerConfigurationSchemas.${index}.trigger`,
      });
    }
  });

  plugin.directMessage.triggerEventSchemas?.forEach((schema, index) => {
    if (schema.channel !== plugin.directMessage.channel) {
      errors.push({
        code: "direct-message.trigger_event_channel_mismatch",
        message:
          "Direct-message trigger event schema channel must match the plugin channel.",
        path: `directMessage.triggerEventSchemas.${index}.channel`,
      });
    }

    if (!plugin.directMessage.supportedTriggers.includes(schema.trigger)) {
      errors.push({
        code: "direct-message.trigger_event_unsupported",
        message:
          "Direct-message trigger event schema trigger must be listed in supported triggers.",
        path: `directMessage.triggerEventSchemas.${index}.trigger`,
      });
    }
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

export type LandingPageType =
  | "product"
  | "content-commerce"
  | "lead-capture"
  | "offer"
  | "custom";

export type LandingPublishTarget =
  | "hosted"
  | "custom-domain"
  | "headless"
  | "external-cms";

export const LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION =
  "owncanvas.landing-page-handoff-configuration.v1";

export const LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION =
  "owncanvas.landing-page-handoff-payload.v1";

export const LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION =
  "owncanvas.landing-page-handoff-tracking-metadata.v1";

export const LANDING_PAGE_HANDOFF_EVENT_SCHEMA_VERSION =
  "owncanvas.landing-page-handoff-event.v1";

export const LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION =
  "owncanvas.landing-dm-referral-context.v1";

export const LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION =
  "owncanvas.landing-flow-destination-mapping.v1";

export const LANDING_CONVERSION_EVENT_SCHEMA_VERSION =
  "owncanvas.landing-conversion-event.v1";

export const LANDING_DM_REFERRAL_CHANNELS = [
  "instagram",
  "messenger",
  "whatsapp",
  "sms",
] as const;

const LANDING_FLOW_DESTINATION_PAGE_TYPES = [
  "product",
  "content-commerce",
  "offer",
  "custom",
] as const satisfies readonly LandingPageType[];

export type LandingDmReferralChannel =
  (typeof LANDING_DM_REFERRAL_CHANNELS)[number];

export type LandingPageHandoffAttribution = {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  clickId?: string;
  touchpointId?: string;
};

export type LandingPageHandoffConfiguration = {
  schemaVersion: typeof LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION;
  landingPageId: string;
  pageType: LandingPageType;
  destinationUrl: string;
  checkoutUrl?: string;
  preserveImmersion: boolean;
  metadata?: Record<string, unknown>;
};

export type LandingPageHandoffTrackingEventDestination =
  | "owncanvas"
  | "external"
  | "custom";

export type LandingPageHandoffTrackingEvent = {
  name: string;
  destination: LandingPageHandoffTrackingEventDestination;
  required: boolean;
  conversion?: boolean;
};

export type LandingPageHandoffTrackingMetadata = {
  schemaVersion: typeof LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION;
  attribution: LandingPageHandoffAttribution;
  events: NonEmptyArray<LandingPageHandoffTrackingEvent>;
  conversion: {
    eventName: string;
    value?: number;
    currency?: string;
    attributionWindowDays?: number;
  };
  metadata?: Record<string, unknown>;
};

export type LandingPageHandoffPayload = {
  schemaVersion: typeof LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION;
  id: string;
  campaignId: string;
  requestedAt: string;
  requestedBy: PluginActor;
  configuration: LandingPageHandoffConfiguration;
  payload: {
    creative: Record<string, unknown>;
    productOffer?: {
      productId?: string;
      offerId?: string;
      sku?: string;
      checkoutUrl?: string;
    };
    visitor?: {
      anonymousId?: string;
      externalUserId?: string;
      platformUserId?: string;
    };
    metadata?: Record<string, unknown>;
  };
  tracking: LandingPageHandoffTrackingMetadata;
  metadata?: Record<string, unknown>;
};

export type LandingPageHandoffEvent = {
  schemaVersion: typeof LANDING_PAGE_HANDOFF_EVENT_SCHEMA_VERSION;
  id: string;
  campaignId: string;
  occurredAt: string;
  requestedBy: PluginActor;
  source: {
    pluginId: string;
    capabilityId: string;
    channel?: DirectMessageChannel | "landing" | "custom";
    eventId?: string;
  };
  destination: {
    url: string;
    landingPageId?: string;
    checkoutUrl?: string;
  };
  visitor?: {
    anonymousId?: string;
    externalUserId?: string;
    platformUserId?: string;
  };
  offer?: {
    productId?: string;
    offerId?: string;
    sku?: string;
  };
  attribution?: LandingPageHandoffAttribution;
  metadata?: Record<string, unknown>;
};

export type LandingDmReferralContext = {
  schemaVersion: typeof LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION;
  campaignId: string;
  channel: LandingDmReferralChannel;
  sourceDm: {
    pluginId: string;
    capabilityId: string;
    deliveryEventId: string;
    triggerEventId?: string;
  };
  visitor?: {
    anonymousId?: string;
    externalUserId?: string;
    platformUserId?: string;
    username?: string;
    identityLinkage?: Record<string, unknown>;
  };
  landingUrl: string;
  attribution: LandingPageHandoffAttribution;
  offer?: {
    productId?: string;
    offerId?: string;
    sku?: string;
  };
  metadata?: Record<string, unknown>;
};

export type LandingDmReferralContextParseInput = {
  landingUrl: string;
  campaignId?: string;
  channel?: string;
  sourceDm?: Partial<LandingDmReferralContext["sourceDm"]>;
  visitor?: LandingDmReferralContext["visitor"];
  attribution?: Partial<LandingPageHandoffAttribution>;
  offer?: LandingDmReferralContext["offer"];
  metadata?: Record<string, unknown>;
};

export type LandingDmReferralContextParseResult =
  | {
      ok: true;
      context: LandingDmReferralContext;
      errors: [];
    }
  | {
      ok: false;
      context: LandingDmReferralContext;
      errors: LandingDmReferralContextValidationError[];
    };

export type LandingFlowDestinationMappingAction = {
  schemaVersion: typeof LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION;
  id: string;
  campaignId: string;
  requestedAt: string;
  requestedBy: PluginActor;
  sourceDmResponse: {
    pluginId: string;
    capabilityId: string;
    responseEventId: string;
    channel?: DirectMessageChannel;
    status: InstagramDmActionExecutionStatus;
    messageId?: string;
  };
  landingDestination: {
    landingPageId: string;
    pageType?: LandingPageType;
    url: string;
    checkoutUrl?: string;
    preserveImmersion: boolean;
    metadata?: Record<string, unknown>;
  };
  attribution: LandingPageHandoffAttribution;
  visitor?: {
    anonymousId?: string;
    externalUserId?: string;
    platformUserId?: string;
  };
  offer?: {
    productId?: string;
    offerId?: string;
    sku?: string;
  };
  metadata?: Record<string, unknown>;
};

export type LandingFlowDestinationMappingInput = {
  dmResponse: InstagramDmActionExecutionResponse;
  action: LandingFlowDestinationMappingAction;
};

export type LandingConversionEvent = {
  schemaVersion: typeof LANDING_CONVERSION_EVENT_SCHEMA_VERSION;
  id: string;
  campaignId: string;
  occurredAt: string;
  landing: {
    pluginId: string;
    capabilityId: string;
    landingPageId: string;
    url: string;
    checkoutUrl?: string;
    handoffEventId?: string;
    mappingActionId?: string;
  };
  conversion: {
    eventName: string;
    value?: number;
    currency?: string;
    orderId?: string;
    productId?: string;
    offerId?: string;
    sku?: string;
  };
  attribution: LandingPageHandoffAttribution;
  measurement: {
    conversionKpi: string;
    attributionWindowDays: number;
    trackingPluginId?: string;
    destination?: LandingPageHandoffTrackingEventDestination;
    attributionModel?: string;
  };
  visitor?: {
    anonymousId?: string;
    externalUserId?: string;
    platformUserId?: string;
  };
  metadata?: Record<string, unknown>;
};

export type LandingConversionEventFromFlowInput = {
  mapping: LandingFlowDestinationMappingAction;
  landingPluginId: string;
  landingCapabilityId: string;
  conversion: Pick<
    LandingConversionEvent["conversion"],
    "eventName" | "value" | "currency" | "orderId"
  >;
  measurement: LandingConversionEvent["measurement"];
  occurredAt: string;
  id?: string;
  metadata?: Record<string, unknown>;
};

export type PluginLandingHandoffSchemaProperty = {
  key: string;
  type: PluginConfigurationFieldType | "object" | "datetime" | "url";
  required: boolean;
  description: string;
};

export type PluginLandingHandoffConfigurationSchema = {
  schemaVersion: typeof LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION;
  title: string;
  description: string;
  supportedPageTypes: readonly LandingPageType[];
  requiredFields: readonly string[];
  properties: readonly PluginLandingHandoffSchemaProperty[];
};

export type PluginLandingHandoffPayloadSchema = {
  schemaVersion: typeof LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION;
  title: string;
  description: string;
  requiredFields: readonly string[];
  properties: readonly PluginLandingHandoffSchemaProperty[];
};

export type PluginLandingHandoffTrackingMetadataSchema = {
  schemaVersion: typeof LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION;
  title: string;
  description: string;
  requiredFields: readonly string[];
  attributionFields: readonly string[];
  conversionFields: readonly string[];
  properties: readonly PluginLandingHandoffSchemaProperty[];
};

export type PluginLandingHandoffEventSchemaProperty = {
  key: string;
  type: PluginConfigurationFieldType | "object" | "datetime" | "url";
  required: boolean;
  description: string;
};

export type PluginLandingHandoffEventSchema = {
  schemaVersion: "owncanvas.plugin-landing-handoff-event-schema.v1";
  eventSchemaVersion: string;
  eventType: string;
  title: string;
  description: string;
  supportedPageTypes: readonly LandingPageType[];
  requiredFields: readonly string[];
  attributionFields: readonly string[];
  properties: readonly PluginLandingHandoffEventSchemaProperty[];
};

export type PluginLandingDmReferralContextSchema = {
  schemaVersion: "owncanvas.plugin-landing-dm-referral-context-schema.v1";
  contextSchemaVersion: string;
  title: string;
  description: string;
  supportedChannels: readonly LandingDmReferralChannel[];
  supportedPageTypes: readonly LandingPageType[];
  requiredFields: readonly string[];
  attributionFields: readonly string[];
  identityFields: readonly string[];
  properties: readonly PluginLandingHandoffEventSchemaProperty[];
};

export type PluginLandingFlowDestinationMappingActionSchema = {
  schemaVersion: "owncanvas.plugin-landing-flow-destination-mapping-action-schema.v1";
  actionSchemaVersion: string;
  actionType: "landing.flow.map-dm-response";
  title: string;
  description: string;
  sourceEventType: "direct-message.response";
  destinationType: "landing.destination";
  supportedChannels: readonly LandingDmReferralChannel[];
  supportedPageTypes: readonly LandingPageType[];
  requiredFields: readonly string[];
  attributionFields: readonly string[];
  destinationFields: readonly string[];
  properties: readonly PluginLandingHandoffEventSchemaProperty[];
};

export type PluginLandingConversionEventSchema = {
  schemaVersion: "owncanvas.plugin-landing-conversion-event-schema.v1";
  eventSchemaVersion: string;
  eventType: "landing.conversion";
  title: string;
  description: string;
  supportedPageTypes: readonly LandingPageType[];
  requiredFields: readonly string[];
  attributionFields: readonly string[];
  conversionFields: readonly string[];
  measurementFields: readonly string[];
  properties: readonly PluginLandingHandoffEventSchemaProperty[];
};

export const LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA = {
  schemaVersion: LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION,
  title: "Landing page handoff configuration",
  description:
    "Campaign-scoped configuration for handing content-commerce traffic into an immersive landing page.",
  supportedPageTypes: ["product", "content-commerce", "offer"],
  requiredFields: [
    "schemaVersion",
    "landingPageId",
    "pageType",
    "destinationUrl",
    "preserveImmersion",
  ],
  properties: [
    {
      key: "landingPageId",
      type: "string",
      required: true,
      description: "Stable landing page identifier used for attribution joins.",
    },
    {
      key: "pageType",
      type: "string",
      required: true,
      description: "Landing page type supported by the publishing plugin.",
    },
    {
      key: "destinationUrl",
      type: "url",
      required: true,
      description: "HTTP(S) landing URL that receives the handoff.",
    },
    {
      key: "checkoutUrl",
      type: "url",
      required: false,
      description: "Optional HTTP(S) checkout URL used for conversion completion.",
    },
    {
      key: "preserveImmersion",
      type: "boolean",
      required: true,
      description: "Whether the landing preserves the creative-to-commerce experience.",
    },
  ],
} as const satisfies PluginLandingHandoffConfigurationSchema;

export const LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA = {
  schemaVersion: LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
  title: "Landing page handoff payload",
  description:
    "Executable payload a human or agent sends to a landing plugin to publish or route a campaign handoff.",
  requiredFields: [
    "schemaVersion",
    "id",
    "campaignId",
    "requestedAt",
    "requestedBy",
    "configuration",
    "payload.creative",
    "tracking",
  ],
  properties: [
    {
      key: "configuration",
      type: "object",
      required: true,
      description: "Landing page handoff configuration for this campaign handoff.",
    },
    {
      key: "payload.creative",
      type: "object",
      required: true,
      description: "Generated creative JSON to render in the landing experience.",
    },
    {
      key: "payload.productOffer",
      type: "object",
      required: false,
      description: "Product, offer, and checkout identifiers for commerce conversion.",
    },
    {
      key: "tracking",
      type: "object",
      required: true,
      description: "Attribution and conversion tracking metadata for the handoff.",
    },
  ],
} as const satisfies PluginLandingHandoffPayloadSchema;

export const LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA = {
  schemaVersion: LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION,
  title: "Landing page handoff tracking metadata",
  description:
    "Attribution and conversion metadata carried through landing handoff payloads.",
  requiredFields: [
    "schemaVersion",
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "events",
    "conversion.eventName",
  ],
  attributionFields: [
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "attribution.content",
    "attribution.term",
    "attribution.clickId",
    "attribution.touchpointId",
  ],
  conversionFields: [
    "conversion.eventName",
    "conversion.value",
    "conversion.currency",
    "conversion.attributionWindowDays",
  ],
  properties: [
    {
      key: "attribution",
      type: "object",
      required: true,
      description: "UTM-compatible campaign attribution metadata.",
    },
    {
      key: "events",
      type: "json",
      required: true,
      description: "Landing and conversion events expected from this handoff.",
    },
    {
      key: "conversion",
      type: "object",
      required: true,
      description: "Final conversion event metadata for KPI measurement.",
    },
  ],
} as const satisfies PluginLandingHandoffTrackingMetadataSchema;

export const LANDING_PAGE_HANDOFF_EVENT_SCHEMA = {
  schemaVersion: "owncanvas.plugin-landing-handoff-event-schema.v1",
  eventSchemaVersion: LANDING_PAGE_HANDOFF_EVENT_SCHEMA_VERSION,
  eventType: "landing.page.handoff",
  title: "Landing page handoff event",
  description:
    "A versioned event for handing tracked campaign traffic from a channel or agent action into an immersive landing page.",
  supportedPageTypes: ["product", "content-commerce", "offer"],
  requiredFields: [
    "id",
    "campaignId",
    "occurredAt",
    "requestedBy",
    "source.pluginId",
    "source.capabilityId",
    "destination.url",
  ],
  attributionFields: [
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "attribution.content",
    "attribution.term",
    "attribution.clickId",
    "attribution.touchpointId",
  ],
  properties: [
    {
      key: "id",
      type: "string",
      required: true,
      description: "Stable handoff event identifier for audit logs.",
    },
    {
      key: "campaignId",
      type: "string",
      required: true,
      description: "Campaign that owns the landing handoff.",
    },
    {
      key: "occurredAt",
      type: "datetime",
      required: true,
      description: "ISO timestamp when the handoff occurred.",
    },
    {
      key: "requestedBy",
      type: "string",
      required: true,
      description: "Human or agent actor that initiated the handoff.",
    },
    {
      key: "source",
      type: "object",
      required: true,
      description:
        "Plugin, capability, channel, and optional upstream event identity that produced the handoff.",
    },
    {
      key: "destination",
      type: "object",
      required: true,
      description: "Landing URL, landing page identity, and optional checkout URL.",
    },
    {
      key: "offer",
      type: "object",
      required: false,
      description: "Product or offer identifiers used by content-commerce landing pages.",
    },
    {
      key: "attribution",
      type: "object",
      required: false,
      description:
        "UTM-ready attribution fields that connect the handoff to conversion measurement.",
    },
  ],
} as const satisfies PluginLandingHandoffEventSchema;

export const LANDING_DM_REFERRAL_CONTEXT_SCHEMA = {
  schemaVersion: "owncanvas.plugin-landing-dm-referral-context-schema.v1",
  contextSchemaVersion: LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION,
  title: "Landing DM referral context",
  description:
    "A versioned context contract for landing plugins that consume direct-message referral and attribution data.",
  supportedChannels: ["instagram", "messenger", "whatsapp", "sms"],
  supportedPageTypes: ["product", "content-commerce", "offer"],
  requiredFields: [
    "schemaVersion",
    "campaignId",
    "channel",
    "sourceDm.pluginId",
    "sourceDm.capabilityId",
    "sourceDm.deliveryEventId",
    "landingUrl",
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
  ],
  attributionFields: [
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "attribution.content",
    "attribution.term",
    "attribution.clickId",
    "attribution.touchpointId",
  ],
  identityFields: [
    "visitor.anonymousId",
    "visitor.externalUserId",
    "visitor.platformUserId",
    "visitor.username",
    "visitor.identityLinkage",
  ],
  properties: [
    {
      key: "campaignId",
      type: "string",
      required: true,
      description: "Campaign that owns the comment-to-DM-to-landing referral.",
    },
    {
      key: "channel",
      type: "string",
      required: true,
      description: "Direct-message channel that produced the referral.",
    },
    {
      key: "sourceDm",
      type: "object",
      required: true,
      description:
        "DM plugin, capability, delivery event, and optional trigger event that produced the referral.",
    },
    {
      key: "visitor",
      type: "object",
      required: false,
      description:
        "Visitor identity linkage carried from the DM recipient into landing attribution.",
    },
    {
      key: "landingUrl",
      type: "url",
      required: true,
      description: "Tracked HTTP(S) landing URL sent in the direct message.",
    },
    {
      key: "attribution",
      type: "object",
      required: true,
      description:
        "UTM-ready attribution fields preserved from DM referral through conversion.",
    },
    {
      key: "offer",
      type: "object",
      required: false,
      description: "Product or offer identifiers selected for the referred visitor.",
    },
  ],
} as const satisfies PluginLandingDmReferralContextSchema;

export const LANDING_FLOW_DESTINATION_MAPPING_ACTION_SCHEMA = {
  schemaVersion:
    "owncanvas.plugin-landing-flow-destination-mapping-action-schema.v1",
  actionSchemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
  actionType: "landing.flow.map-dm-response",
  title: "Landing flow destination mapping action",
  description:
    "A versioned action contract that maps delivered DM response events to landing-page destination metadata.",
  sourceEventType: "direct-message.response",
  destinationType: "landing.destination",
  supportedChannels: ["instagram", "messenger", "whatsapp", "sms"],
  supportedPageTypes: ["product", "content-commerce", "offer", "custom"],
  requiredFields: [
    "schemaVersion",
    "id",
    "campaignId",
    "requestedAt",
    "requestedBy",
    "sourceDmResponse.pluginId",
    "sourceDmResponse.capabilityId",
    "sourceDmResponse.responseEventId",
    "sourceDmResponse.status",
    "landingDestination.landingPageId",
    "landingDestination.url",
    "landingDestination.preserveImmersion",
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
  ],
  attributionFields: [
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "attribution.content",
    "attribution.term",
    "attribution.clickId",
    "attribution.touchpointId",
  ],
  destinationFields: [
    "landingDestination.landingPageId",
    "landingDestination.pageType",
    "landingDestination.url",
    "landingDestination.checkoutUrl",
    "landingDestination.preserveImmersion",
    "landingDestination.metadata",
  ],
  properties: [
    {
      key: "sourceDmResponse",
      type: "object",
      required: true,
      description:
        "Direct-message plugin response identity, channel, delivery status, and optional provider message id.",
    },
    {
      key: "landingDestination",
      type: "object",
      required: true,
      description:
        "Landing-page destination metadata that receives the DM referral.",
    },
    {
      key: "attribution",
      type: "object",
      required: true,
      description:
        "UTM-compatible attribution copied from the DM response into landing measurement.",
    },
    {
      key: "visitor",
      type: "object",
      required: false,
      description: "Visitor identity metadata from the DM recipient.",
    },
    {
      key: "offer",
      type: "object",
      required: false,
      description: "Product or offer metadata for content-commerce attribution.",
    },
  ],
} as const satisfies PluginLandingFlowDestinationMappingActionSchema;

export const LANDING_CONVERSION_EVENT_SCHEMA = {
  schemaVersion: "owncanvas.plugin-landing-conversion-event-schema.v1",
  eventSchemaVersion: LANDING_CONVERSION_EVENT_SCHEMA_VERSION,
  eventType: "landing.conversion",
  title: "Landing conversion event",
  description:
    "A versioned API contract for landing-flow plugins to emit final conversion events with attribution and measurement metadata.",
  supportedPageTypes: ["product", "content-commerce", "offer", "custom"],
  requiredFields: [
    "schemaVersion",
    "id",
    "campaignId",
    "occurredAt",
    "landing.pluginId",
    "landing.capabilityId",
    "landing.landingPageId",
    "landing.url",
    "conversion.eventName",
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "measurement.conversionKpi",
    "measurement.attributionWindowDays",
  ],
  attributionFields: [
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "attribution.content",
    "attribution.term",
    "attribution.clickId",
    "attribution.touchpointId",
  ],
  conversionFields: [
    "conversion.eventName",
    "conversion.value",
    "conversion.currency",
    "conversion.orderId",
    "conversion.productId",
    "conversion.offerId",
    "conversion.sku",
  ],
  measurementFields: [
    "measurement.conversionKpi",
    "measurement.attributionWindowDays",
    "measurement.trackingPluginId",
    "measurement.destination",
    "measurement.attributionModel",
  ],
  properties: [
    {
      key: "landing",
      type: "object",
      required: true,
      description:
        "Landing plugin, capability, page, URL, and upstream flow identifiers.",
    },
    {
      key: "conversion",
      type: "object",
      required: true,
      description:
        "Final conversion event name plus commerce value, order, product, and offer metadata.",
    },
    {
      key: "attribution",
      type: "object",
      required: true,
      description:
        "UTM-compatible attribution metadata carried from the landing flow.",
    },
    {
      key: "measurement",
      type: "object",
      required: true,
      description:
        "KPI, attribution window, destination, and tracking plugin metadata for reporting.",
    },
  ],
} as const satisfies PluginLandingConversionEventSchema;

export type LandingPageHandoffEventValidationErrorCode =
  | "landing-handoff.schema_version_invalid"
  | "landing-handoff.id_required"
  | "landing-handoff.campaign_id_required"
  | "landing-handoff.occurred_at_invalid"
  | "landing-handoff.requested_by_invalid"
  | "landing-handoff.source_plugin_id_required"
  | "landing-handoff.source_capability_id_required"
  | "landing-handoff.destination_url_invalid"
  | "landing-handoff.checkout_url_invalid"
  | "landing-handoff.attribution_campaign_mismatch";

export type LandingPageHandoffEventValidationError = {
  code: LandingPageHandoffEventValidationErrorCode;
  message: string;
  path: string;
};

export type LandingPageHandoffEventValidationResult = {
  ok: boolean;
  errors: LandingPageHandoffEventValidationError[];
};

export type LandingPageHandoffTrackingMetadataValidationErrorCode =
  | "landing-tracking.schema_version_invalid"
  | "landing-tracking.source_required"
  | "landing-tracking.medium_required"
  | "landing-tracking.campaign_required"
  | "landing-tracking.attribution_campaign_mismatch"
  | "landing-tracking.events_required"
  | "landing-tracking.event_name_required"
  | "landing-tracking.conversion_event_required"
  | "landing-tracking.attribution_window_invalid";

export type LandingPageHandoffPayloadValidationErrorCode =
  | "landing-payload.schema_version_invalid"
  | "landing-payload.id_required"
  | "landing-payload.campaign_id_required"
  | "landing-payload.requested_at_invalid"
  | "landing-payload.requested_by_invalid"
  | "landing-config.schema_version_invalid"
  | "landing-config.landing_page_id_required"
  | "landing-config.page_type_required"
  | "landing-config.destination_url_invalid"
  | "landing-config.checkout_url_invalid"
  | "landing-config.immersion_required"
  | "landing-payload.creative_required"
  | "landing-payload.product_offer_checkout_url_invalid"
  | LandingPageHandoffTrackingMetadataValidationErrorCode;

export type LandingPageHandoffPayloadValidationError = {
  code: LandingPageHandoffPayloadValidationErrorCode;
  message: string;
  path: string;
};

export type LandingPageHandoffPayloadValidationResult = {
  ok: boolean;
  errors: LandingPageHandoffPayloadValidationError[];
};

export type LandingPageHandoffTrackingMetadataValidationError = {
  code: LandingPageHandoffTrackingMetadataValidationErrorCode;
  message: string;
  path: string;
};

export type LandingPageHandoffTrackingMetadataValidationResult = {
  ok: boolean;
  errors: LandingPageHandoffTrackingMetadataValidationError[];
};

export type LandingDmReferralContextValidationErrorCode =
  | "landing-dm-referral.schema_version_invalid"
  | "landing-dm-referral.campaign_id_required"
  | "landing-dm-referral.channel_unsupported"
  | "landing-dm-referral.source_plugin_id_required"
  | "landing-dm-referral.source_capability_id_required"
  | "landing-dm-referral.delivery_event_id_required"
  | "landing-dm-referral.landing_url_invalid"
  | "landing-dm-referral.source_required"
  | "landing-dm-referral.medium_required"
  | "landing-dm-referral.campaign_required"
  | "landing-dm-referral.attribution_campaign_mismatch";

export type LandingDmReferralContextValidationError = {
  code: LandingDmReferralContextValidationErrorCode;
  message: string;
  path: string;
};

export type LandingDmReferralContextValidationResult = {
  ok: boolean;
  errors: LandingDmReferralContextValidationError[];
};

export type LandingFlowDestinationMappingActionValidationErrorCode =
  | "landing-flow-mapping.schema_version_invalid"
  | "landing-flow-mapping.id_required"
  | "landing-flow-mapping.campaign_id_required"
  | "landing-flow-mapping.requested_at_invalid"
  | "landing-flow-mapping.requested_by_invalid"
  | "landing-flow-mapping.source_plugin_id_required"
  | "landing-flow-mapping.source_capability_id_required"
  | "landing-flow-mapping.response_event_id_required"
  | "landing-flow-mapping.response_status_not_delivered"
  | "landing-flow-mapping.landing_page_id_required"
  | "landing-flow-mapping.page_type_unsupported"
  | "landing-flow-mapping.destination_url_invalid"
  | "landing-flow-mapping.checkout_url_invalid"
  | "landing-flow-mapping.immersion_required"
  | "landing-flow-mapping.source_required"
  | "landing-flow-mapping.medium_required"
  | "landing-flow-mapping.campaign_required"
  | "landing-flow-mapping.attribution_campaign_mismatch";

export type LandingFlowDestinationMappingActionValidationError = {
  code: LandingFlowDestinationMappingActionValidationErrorCode;
  message: string;
  path: string;
};

export type LandingFlowDestinationMappingActionValidationResult = {
  ok: boolean;
  errors: LandingFlowDestinationMappingActionValidationError[];
};

export type LandingConversionEventValidationErrorCode =
  | "landing-conversion.schema_version_invalid"
  | "landing-conversion.id_required"
  | "landing-conversion.campaign_id_required"
  | "landing-conversion.occurred_at_invalid"
  | "landing-conversion.plugin_id_required"
  | "landing-conversion.capability_id_required"
  | "landing-conversion.landing_page_id_required"
  | "landing-conversion.url_invalid"
  | "landing-conversion.checkout_url_invalid"
  | "landing-conversion.event_name_required"
  | "landing-conversion.value_invalid"
  | "landing-conversion.currency_required"
  | "landing-conversion.source_required"
  | "landing-conversion.medium_required"
  | "landing-conversion.campaign_required"
  | "landing-conversion.attribution_campaign_mismatch"
  | "landing-conversion.conversion_kpi_required"
  | "landing-conversion.attribution_window_invalid"
  | "landing-conversion.destination_required";

export type LandingConversionEventValidationError = {
  code: LandingConversionEventValidationErrorCode;
  message: string;
  path: string;
};

export type LandingConversionEventValidationResult = {
  ok: boolean;
  errors: LandingConversionEventValidationError[];
};

export function createLandingConversionEventFromFlow(
  input: LandingConversionEventFromFlowInput,
): LandingConversionEvent {
  return {
    schemaVersion: LANDING_CONVERSION_EVENT_SCHEMA_VERSION,
    id:
      input.id ??
      `landing-conversion:${input.mapping.id}:${input.conversion.eventName}`,
    campaignId: input.mapping.campaignId,
    occurredAt: input.occurredAt,
    landing: {
      pluginId: input.landingPluginId,
      capabilityId: input.landingCapabilityId,
      landingPageId: input.mapping.landingDestination.landingPageId,
      url: input.mapping.landingDestination.url,
      ...optionalStringField(
        "checkoutUrl",
        input.mapping.landingDestination.checkoutUrl,
      ),
      mappingActionId: input.mapping.id,
    },
    conversion: {
      eventName: input.conversion.eventName,
      ...optionalNumberField("value", input.conversion.value),
      ...optionalStringField("currency", input.conversion.currency),
      ...optionalStringField("orderId", input.conversion.orderId),
      ...optionalStringField("productId", input.mapping.offer?.productId),
      ...optionalStringField("offerId", input.mapping.offer?.offerId),
      ...optionalStringField("sku", input.mapping.offer?.sku),
    },
    attribution: input.mapping.attribution,
    measurement: input.measurement,
    ...(input.mapping.visitor === undefined
      ? {}
      : { visitor: input.mapping.visitor }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  };
}

export function validateLandingConversionEvent(
  event: unknown,
): LandingConversionEventValidationResult {
  const value = isRecord(event) ? event : {};
  const landing = isRecord(value.landing) ? value.landing : {};
  const conversion = isRecord(value.conversion) ? value.conversion : {};
  const attribution = isRecord(value.attribution) ? value.attribution : {};
  const measurement = isRecord(value.measurement) ? value.measurement : {};
  const errors: LandingConversionEventValidationError[] = [];

  if (value.schemaVersion !== LANDING_CONVERSION_EVENT_SCHEMA_VERSION) {
    errors.push({
      code: "landing-conversion.schema_version_invalid",
      message: "Landing conversion events must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.id)) {
    errors.push({
      code: "landing-conversion.id_required",
      message: "Landing conversion events require an id.",
      path: "id",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "landing-conversion.campaign_id_required",
      message: "Landing conversion events require a campaign id.",
      path: "campaignId",
    });
  }

  if (
    !isNonEmptyString(value.occurredAt) ||
    Number.isNaN(Date.parse(value.occurredAt))
  ) {
    errors.push({
      code: "landing-conversion.occurred_at_invalid",
      message: "Landing conversion events require a valid occurredAt timestamp.",
      path: "occurredAt",
    });
  }

  if (!isNonEmptyString(landing.pluginId)) {
    errors.push({
      code: "landing-conversion.plugin_id_required",
      message: "Landing conversion events require the landing plugin id.",
      path: "landing.pluginId",
    });
  }

  if (!isNonEmptyString(landing.capabilityId)) {
    errors.push({
      code: "landing-conversion.capability_id_required",
      message: "Landing conversion events require the landing capability id.",
      path: "landing.capabilityId",
    });
  }

  if (!isNonEmptyString(landing.landingPageId)) {
    errors.push({
      code: "landing-conversion.landing_page_id_required",
      message: "Landing conversion events require a landing page id.",
      path: "landing.landingPageId",
    });
  }

  if (!isHttpUrl(landing.url)) {
    errors.push({
      code: "landing-conversion.url_invalid",
      message: "Landing conversion events require an http or https landing URL.",
      path: "landing.url",
    });
  }

  if (landing.checkoutUrl !== undefined && !isHttpUrl(landing.checkoutUrl)) {
    errors.push({
      code: "landing-conversion.checkout_url_invalid",
      message: "Landing conversion event checkout URLs must use http or https.",
      path: "landing.checkoutUrl",
    });
  }

  if (!isNonEmptyString(conversion.eventName)) {
    errors.push({
      code: "landing-conversion.event_name_required",
      message: "Landing conversion events require a conversion event name.",
      path: "conversion.eventName",
    });
  }

  if (
    conversion.value !== undefined &&
    (typeof conversion.value !== "number" || conversion.value < 0)
  ) {
    errors.push({
      code: "landing-conversion.value_invalid",
      message: "Landing conversion event values must be zero or greater.",
      path: "conversion.value",
    });
  }

  if (
    conversion.value !== undefined &&
    !isNonEmptyString(conversion.currency)
  ) {
    errors.push({
      code: "landing-conversion.currency_required",
      message:
        "Landing conversion events with a value require a currency code.",
      path: "conversion.currency",
    });
  }

  if (!isNonEmptyString(attribution.source)) {
    errors.push({
      code: "landing-conversion.source_required",
      message: "Landing conversion attribution requires a source.",
      path: "attribution.source",
    });
  }

  if (!isNonEmptyString(attribution.medium)) {
    errors.push({
      code: "landing-conversion.medium_required",
      message: "Landing conversion attribution requires a medium.",
      path: "attribution.medium",
    });
  }

  if (!isNonEmptyString(attribution.campaign)) {
    errors.push({
      code: "landing-conversion.campaign_required",
      message: "Landing conversion attribution requires a campaign.",
      path: "attribution.campaign",
    });
  }

  if (
    isNonEmptyString(value.campaignId) &&
    isNonEmptyString(attribution.campaign) &&
    attribution.campaign !== value.campaignId
  ) {
    errors.push({
      code: "landing-conversion.attribution_campaign_mismatch",
      message:
        "Landing conversion attribution campaign must match the event campaign.",
      path: "attribution.campaign",
    });
  }

  if (!isNonEmptyString(measurement.conversionKpi)) {
    errors.push({
      code: "landing-conversion.conversion_kpi_required",
      message: "Landing conversion events require a conversion KPI.",
      path: "measurement.conversionKpi",
    });
  }

  if (
    typeof measurement.attributionWindowDays !== "number" ||
    measurement.attributionWindowDays <= 0
  ) {
    errors.push({
      code: "landing-conversion.attribution_window_invalid",
      message:
        "Landing conversion event attribution windows must be greater than zero days.",
      path: "measurement.attributionWindowDays",
    });
  }

  if (
    measurement.destination !== undefined &&
    !isNonEmptyString(measurement.destination)
  ) {
    errors.push({
      code: "landing-conversion.destination_required",
      message:
        "Landing conversion event measurement destinations must be non-empty.",
      path: "measurement.destination",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function mapDmResponseEventToLandingDestinationMetadata(
  input: LandingFlowDestinationMappingInput,
): LandingFlowDestinationMappingAction {
  return {
    ...input.action,
    sourceDmResponse: {
      ...input.action.sourceDmResponse,
      capabilityId: input.dmResponse.capabilityId,
      responseEventId: input.dmResponse.requestId,
      channel: input.dmResponse.delivery.channel,
      status: input.dmResponse.status,
      ...(input.dmResponse.delivery.messageId === undefined
        ? {}
        : { messageId: input.dmResponse.delivery.messageId }),
    },
    landingDestination: {
      ...input.action.landingDestination,
      url: input.dmResponse.delivery.landingUrl,
    },
    attribution: {
      ...(input.dmResponse.attribution ?? input.action.attribution),
      ...input.action.attribution,
    },
  };
}

export function validateLandingFlowDestinationMappingAction(
  action: unknown,
): LandingFlowDestinationMappingActionValidationResult {
  const value = isRecord(action) ? action : {};
  const sourceDmResponse = isRecord(value.sourceDmResponse)
    ? value.sourceDmResponse
    : {};
  const landingDestination = isRecord(value.landingDestination)
    ? value.landingDestination
    : {};
  const attribution = isRecord(value.attribution) ? value.attribution : {};
  const errors: LandingFlowDestinationMappingActionValidationError[] = [];

  if (value.schemaVersion !== LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION) {
    errors.push({
      code: "landing-flow-mapping.schema_version_invalid",
      message:
        "Landing flow destination mappings must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.id)) {
    errors.push({
      code: "landing-flow-mapping.id_required",
      message: "Landing flow destination mappings require an id.",
      path: "id",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "landing-flow-mapping.campaign_id_required",
      message: "Landing flow destination mappings require a campaign id.",
      path: "campaignId",
    });
  }

  if (
    !isNonEmptyString(value.requestedAt) ||
    Number.isNaN(Date.parse(value.requestedAt))
  ) {
    errors.push({
      code: "landing-flow-mapping.requested_at_invalid",
      message:
        "Landing flow destination mappings require a valid requestedAt timestamp.",
      path: "requestedAt",
    });
  }

  if (value.requestedBy !== "human" && value.requestedBy !== "agent") {
    errors.push({
      code: "landing-flow-mapping.requested_by_invalid",
      message:
        "Landing flow destination mappings must be requested by a human or agent.",
      path: "requestedBy",
    });
  }

  if (!isNonEmptyString(sourceDmResponse.pluginId)) {
    errors.push({
      code: "landing-flow-mapping.source_plugin_id_required",
      message:
        "Landing flow destination mappings require a source DM plugin id.",
      path: "sourceDmResponse.pluginId",
    });
  }

  if (!isNonEmptyString(sourceDmResponse.capabilityId)) {
    errors.push({
      code: "landing-flow-mapping.source_capability_id_required",
      message:
        "Landing flow destination mappings require a source DM capability id.",
      path: "sourceDmResponse.capabilityId",
    });
  }

  if (!isNonEmptyString(sourceDmResponse.responseEventId)) {
    errors.push({
      code: "landing-flow-mapping.response_event_id_required",
      message:
        "Landing flow destination mappings require a source DM response event id.",
      path: "sourceDmResponse.responseEventId",
    });
  }

  if (sourceDmResponse.status !== "delivered") {
    errors.push({
      code: "landing-flow-mapping.response_status_not_delivered",
      message:
        "Landing flow destination mappings require a delivered DM response.",
      path: "sourceDmResponse.status",
    });
  }

  if (!isNonEmptyString(landingDestination.landingPageId)) {
    errors.push({
      code: "landing-flow-mapping.landing_page_id_required",
      message:
        "Landing flow destination mappings require a landing page id.",
      path: "landingDestination.landingPageId",
    });
  }

  if (
    landingDestination.pageType !== undefined &&
    (typeof landingDestination.pageType !== "string" ||
      !(LANDING_FLOW_DESTINATION_PAGE_TYPES as readonly string[]).includes(
        landingDestination.pageType,
      ))
  ) {
    errors.push({
      code: "landing-flow-mapping.page_type_unsupported",
      message:
        "Landing flow destination mappings require a supported landing page type.",
      path: "landingDestination.pageType",
    });
  }

  if (!isHttpUrl(landingDestination.url)) {
    errors.push({
      code: "landing-flow-mapping.destination_url_invalid",
      message:
        "Landing flow destination mappings require an http or https destination URL.",
      path: "landingDestination.url",
    });
  }

  if (
    landingDestination.checkoutUrl !== undefined &&
    !isHttpUrl(landingDestination.checkoutUrl)
  ) {
    errors.push({
      code: "landing-flow-mapping.checkout_url_invalid",
      message:
        "Landing flow destination mapping checkout URLs must use http or https.",
      path: "landingDestination.checkoutUrl",
    });
  }

  if (landingDestination.preserveImmersion !== true) {
    errors.push({
      code: "landing-flow-mapping.immersion_required",
      message:
        "Landing flow destination mappings must preserve content-commerce immersion.",
      path: "landingDestination.preserveImmersion",
    });
  }

  if (!isNonEmptyString(attribution.source)) {
    errors.push({
      code: "landing-flow-mapping.source_required",
      message: "Landing flow destination mapping attribution requires a source.",
      path: "attribution.source",
    });
  }

  if (!isNonEmptyString(attribution.medium)) {
    errors.push({
      code: "landing-flow-mapping.medium_required",
      message: "Landing flow destination mapping attribution requires a medium.",
      path: "attribution.medium",
    });
  }

  if (!isNonEmptyString(attribution.campaign)) {
    errors.push({
      code: "landing-flow-mapping.campaign_required",
      message:
        "Landing flow destination mapping attribution requires a campaign.",
      path: "attribution.campaign",
    });
  }

  if (
    isNonEmptyString(value.campaignId) &&
    isNonEmptyString(attribution.campaign) &&
    attribution.campaign !== value.campaignId
  ) {
    errors.push({
      code: "landing-flow-mapping.attribution_campaign_mismatch",
      message:
        "Landing flow destination mapping attribution campaign must match the action campaign.",
      path: "attribution.campaign",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function parseLandingDmReferralContext(
  input: LandingDmReferralContextParseInput,
): LandingDmReferralContextParseResult {
  const searchParams = readUrlSearchParams(input.landingUrl);
  const campaignId = firstNonEmptyString(
    input.campaignId,
    searchParams.get("oc_campaign_id"),
    searchParams.get("campaign_id"),
    searchParams.get("utm_campaign"),
    input.attribution?.campaign,
  );
  const channel = normalizeLandingDmReferralChannel(
    firstNonEmptyString(
      input.channel,
      searchParams.get("oc_channel"),
      searchParams.get("channel"),
      searchParams.get("utm_source"),
    ),
  );
  const source = normalizeReferralToken(
    firstNonEmptyString(input.attribution?.source, searchParams.get("utm_source"), channel),
  );
  const medium = normalizeReferralToken(
    firstNonEmptyString(input.attribution?.medium, searchParams.get("utm_medium"), "dm"),
  );
  const attributionCampaign = firstNonEmptyString(
    input.attribution?.campaign,
    searchParams.get("utm_campaign"),
    campaignId,
  );
  const visitor = createLandingDmReferralVisitor(input, searchParams);
  const offer = createLandingDmReferralOffer(input, searchParams);
  const context: LandingDmReferralContext = {
    schemaVersion: LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION,
    campaignId,
    channel,
    sourceDm: {
      pluginId: firstNonEmptyString(
        input.sourceDm?.pluginId,
        searchParams.get("oc_dm_plugin_id"),
        searchParams.get("dm_plugin_id"),
      ),
      capabilityId: firstNonEmptyString(
        input.sourceDm?.capabilityId,
        searchParams.get("oc_dm_capability_id"),
        searchParams.get("dm_capability_id"),
      ),
      deliveryEventId: firstNonEmptyString(
        input.sourceDm?.deliveryEventId,
        searchParams.get("oc_dm_delivery_event_id"),
        searchParams.get("dm_delivery_event_id"),
        searchParams.get("response_event_id"),
      ),
      ...optionalStringField(
        "triggerEventId",
        firstNonEmptyString(
          input.sourceDm?.triggerEventId,
          searchParams.get("oc_dm_trigger_event_id"),
          searchParams.get("dm_trigger_event_id"),
          searchParams.get("trigger_event_id"),
        ),
      ),
    },
    ...(visitor === undefined ? {} : { visitor }),
    landingUrl: input.landingUrl.trim(),
    attribution: {
      source,
      medium,
      campaign: attributionCampaign,
      ...optionalStringField(
        "content",
        firstNonEmptyString(input.attribution?.content, searchParams.get("utm_content")),
      ),
      ...optionalStringField(
        "term",
        firstNonEmptyString(input.attribution?.term, searchParams.get("utm_term")),
      ),
      ...optionalStringField(
        "clickId",
        firstNonEmptyString(
          input.attribution?.clickId,
          searchParams.get("oc_click_id"),
          searchParams.get("click_id"),
          searchParams.get("gclid"),
          searchParams.get("fbclid"),
        ),
      ),
      ...optionalStringField(
        "touchpointId",
        firstNonEmptyString(
          input.attribution?.touchpointId,
          searchParams.get("oc_touchpoint_id"),
          searchParams.get("touchpoint_id"),
        ),
      ),
    },
    ...(offer === undefined ? {} : { offer }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  };
  const validation = validateLandingDmReferralContext(context);

  return validation.ok
    ? { ok: true, context, errors: [] }
    : { ok: false, context, errors: validation.errors };
}

export function validateLandingDmReferralContext(
  context: unknown,
): LandingDmReferralContextValidationResult {
  const value = isRecord(context) ? context : {};
  const sourceDm = isRecord(value.sourceDm) ? value.sourceDm : {};
  const attribution = isRecord(value.attribution) ? value.attribution : {};
  const errors: LandingDmReferralContextValidationError[] = [];

  if (value.schemaVersion !== LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION) {
    errors.push({
      code: "landing-dm-referral.schema_version_invalid",
      message: "Landing DM referral contexts must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "landing-dm-referral.campaign_id_required",
      message: "Landing DM referral contexts require a campaign id.",
      path: "campaignId",
    });
  }

  if (
    typeof value.channel !== "string" ||
    !(LANDING_DM_REFERRAL_CHANNELS as readonly string[]).includes(value.channel)
  ) {
    errors.push({
      code: "landing-dm-referral.channel_unsupported",
      message:
        "Landing DM referral contexts require a supported direct-message channel.",
      path: "channel",
    });
  }

  if (!isNonEmptyString(sourceDm.pluginId)) {
    errors.push({
      code: "landing-dm-referral.source_plugin_id_required",
      message: "Landing DM referral contexts require a source DM plugin id.",
      path: "sourceDm.pluginId",
    });
  }

  if (!isNonEmptyString(sourceDm.capabilityId)) {
    errors.push({
      code: "landing-dm-referral.source_capability_id_required",
      message:
        "Landing DM referral contexts require a source DM capability id.",
      path: "sourceDm.capabilityId",
    });
  }

  if (!isNonEmptyString(sourceDm.deliveryEventId)) {
    errors.push({
      code: "landing-dm-referral.delivery_event_id_required",
      message:
        "Landing DM referral contexts require the DM delivery event id.",
      path: "sourceDm.deliveryEventId",
    });
  }

  if (!isHttpUrl(value.landingUrl)) {
    errors.push({
      code: "landing-dm-referral.landing_url_invalid",
      message: "Landing DM referral contexts require an http or https landing URL.",
      path: "landingUrl",
    });
  }

  if (!isNonEmptyString(attribution.source)) {
    errors.push({
      code: "landing-dm-referral.source_required",
      message: "Landing DM referral attribution requires a source.",
      path: "attribution.source",
    });
  }

  if (!isNonEmptyString(attribution.medium)) {
    errors.push({
      code: "landing-dm-referral.medium_required",
      message: "Landing DM referral attribution requires a medium.",
      path: "attribution.medium",
    });
  }

  if (!isNonEmptyString(attribution.campaign)) {
    errors.push({
      code: "landing-dm-referral.campaign_required",
      message: "Landing DM referral attribution requires a campaign.",
      path: "attribution.campaign",
    });
  }

  if (
    isNonEmptyString(value.campaignId) &&
    isNonEmptyString(attribution.campaign) &&
    attribution.campaign !== value.campaignId
  ) {
    errors.push({
      code: "landing-dm-referral.attribution_campaign_mismatch",
      message:
        "Landing DM referral attribution campaign must match the context campaign.",
      path: "attribution.campaign",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateLandingPageHandoffEvent(
  event: unknown,
): LandingPageHandoffEventValidationResult {
  const value = isRecord(event) ? event : {};
  const source = isRecord(value.source) ? value.source : {};
  const destination = isRecord(value.destination) ? value.destination : {};
  const attribution = isRecord(value.attribution) ? value.attribution : undefined;
  const errors: LandingPageHandoffEventValidationError[] = [];

  if (value.schemaVersion !== LANDING_PAGE_HANDOFF_EVENT_SCHEMA_VERSION) {
    errors.push({
      code: "landing-handoff.schema_version_invalid",
      message: "Landing handoff events must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.id)) {
    errors.push({
      code: "landing-handoff.id_required",
      message: "Landing handoff events require an id.",
      path: "id",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "landing-handoff.campaign_id_required",
      message: "Landing handoff events require a campaign id.",
      path: "campaignId",
    });
  }

  if (
    !isNonEmptyString(value.occurredAt) ||
    Number.isNaN(Date.parse(value.occurredAt))
  ) {
    errors.push({
      code: "landing-handoff.occurred_at_invalid",
      message: "Landing handoff events require a valid occurredAt timestamp.",
      path: "occurredAt",
    });
  }

  if (value.requestedBy !== "human" && value.requestedBy !== "agent") {
    errors.push({
      code: "landing-handoff.requested_by_invalid",
      message: "Landing handoff events must be requested by a human or agent.",
      path: "requestedBy",
    });
  }

  if (!isNonEmptyString(source.pluginId)) {
    errors.push({
      code: "landing-handoff.source_plugin_id_required",
      message: "Landing handoff events require a source plugin id.",
      path: "source.pluginId",
    });
  }

  if (!isNonEmptyString(source.capabilityId)) {
    errors.push({
      code: "landing-handoff.source_capability_id_required",
      message: "Landing handoff events require a source capability id.",
      path: "source.capabilityId",
    });
  }

  if (!isHttpUrl(destination.url)) {
    errors.push({
      code: "landing-handoff.destination_url_invalid",
      message:
        "Landing handoff events require an http or https destination URL.",
      path: "destination.url",
    });
  }

  if (
    destination.checkoutUrl !== undefined &&
    !isHttpUrl(destination.checkoutUrl)
  ) {
    errors.push({
      code: "landing-handoff.checkout_url_invalid",
      message:
        "Landing handoff event checkout URLs must use http or https.",
      path: "destination.checkoutUrl",
    });
  }

  if (
    attribution !== undefined &&
    isNonEmptyString(value.campaignId) &&
    isNonEmptyString(attribution.campaign) &&
    attribution.campaign !== value.campaignId
  ) {
    errors.push({
      code: "landing-handoff.attribution_campaign_mismatch",
      message:
        "Landing handoff attribution campaign must match the event campaign.",
      path: "attribution.campaign",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateLandingPageHandoffTrackingMetadata(
  tracking: unknown,
  options: { campaignId?: string } = {},
): LandingPageHandoffTrackingMetadataValidationResult {
  const value = isRecord(tracking) ? tracking : {};
  const attribution = isRecord(value.attribution) ? value.attribution : {};
  const conversion = isRecord(value.conversion) ? value.conversion : {};
  const events = Array.isArray(value.events) ? value.events : [];
  const errors: LandingPageHandoffTrackingMetadataValidationError[] = [];

  if (value.schemaVersion !== LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION) {
    errors.push({
      code: "landing-tracking.schema_version_invalid",
      message: "Landing handoff tracking metadata must use the current schema version.",
      path: "tracking.schemaVersion",
    });
  }

  if (!isNonEmptyString(attribution.source)) {
    errors.push({
      code: "landing-tracking.source_required",
      message: "Landing handoff tracking metadata requires an attribution source.",
      path: "tracking.attribution.source",
    });
  }

  if (!isNonEmptyString(attribution.medium)) {
    errors.push({
      code: "landing-tracking.medium_required",
      message: "Landing handoff tracking metadata requires an attribution medium.",
      path: "tracking.attribution.medium",
    });
  }

  if (!isNonEmptyString(attribution.campaign)) {
    errors.push({
      code: "landing-tracking.campaign_required",
      message: "Landing handoff tracking metadata requires an attribution campaign.",
      path: "tracking.attribution.campaign",
    });
  }

  if (
    isNonEmptyString(options.campaignId) &&
    isNonEmptyString(attribution.campaign) &&
    attribution.campaign !== options.campaignId
  ) {
    errors.push({
      code: "landing-tracking.attribution_campaign_mismatch",
      message:
        "Landing handoff tracking attribution campaign must match the payload campaign.",
      path: "tracking.attribution.campaign",
    });
  }

  if (events.length === 0) {
    errors.push({
      code: "landing-tracking.events_required",
      message: "Landing handoff tracking metadata requires at least one event.",
      path: "tracking.events",
    });
  }

  events.forEach((event, index) => {
    if (!isRecord(event) || !isNonEmptyString(event.name)) {
      errors.push({
        code: "landing-tracking.event_name_required",
        message: "Landing handoff tracking events require a name.",
        path: `tracking.events.${index}.name`,
      });
    }
  });

  if (!isNonEmptyString(conversion.eventName)) {
    errors.push({
      code: "landing-tracking.conversion_event_required",
      message: "Landing handoff tracking metadata requires a conversion event name.",
      path: "tracking.conversion.eventName",
    });
  }

  if (
    conversion.attributionWindowDays !== undefined &&
    (typeof conversion.attributionWindowDays !== "number" ||
      conversion.attributionWindowDays <= 0)
  ) {
    errors.push({
      code: "landing-tracking.attribution_window_invalid",
      message: "Landing handoff attribution windows must be greater than zero days.",
      path: "tracking.conversion.attributionWindowDays",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateLandingPageHandoffPayload(
  payload: unknown,
): LandingPageHandoffPayloadValidationResult {
  const value = isRecord(payload) ? payload : {};
  const configuration = isRecord(value.configuration) ? value.configuration : {};
  const handoffPayload = isRecord(value.payload) ? value.payload : {};
  const productOffer = isRecord(handoffPayload.productOffer)
    ? handoffPayload.productOffer
    : undefined;
  const errors: LandingPageHandoffPayloadValidationError[] = [];

  if (value.schemaVersion !== LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION) {
    errors.push({
      code: "landing-payload.schema_version_invalid",
      message: "Landing handoff payloads must use the current schema version.",
      path: "schemaVersion",
    });
  }

  if (!isNonEmptyString(value.id)) {
    errors.push({
      code: "landing-payload.id_required",
      message: "Landing handoff payloads require an id.",
      path: "id",
    });
  }

  if (!isNonEmptyString(value.campaignId)) {
    errors.push({
      code: "landing-payload.campaign_id_required",
      message: "Landing handoff payloads require a campaign id.",
      path: "campaignId",
    });
  }

  if (
    !isNonEmptyString(value.requestedAt) ||
    Number.isNaN(Date.parse(value.requestedAt))
  ) {
    errors.push({
      code: "landing-payload.requested_at_invalid",
      message: "Landing handoff payloads require a valid requestedAt timestamp.",
      path: "requestedAt",
    });
  }

  if (value.requestedBy !== "human" && value.requestedBy !== "agent") {
    errors.push({
      code: "landing-payload.requested_by_invalid",
      message: "Landing handoff payloads must be requested by a human or agent.",
      path: "requestedBy",
    });
  }

  if (configuration.schemaVersion !== LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION) {
    errors.push({
      code: "landing-config.schema_version_invalid",
      message: "Landing handoff configurations must use the current schema version.",
      path: "configuration.schemaVersion",
    });
  }

  if (!isNonEmptyString(configuration.landingPageId)) {
    errors.push({
      code: "landing-config.landing_page_id_required",
      message: "Landing handoff configurations require a landing page id.",
      path: "configuration.landingPageId",
    });
  }

  if (!isNonEmptyString(configuration.pageType)) {
    errors.push({
      code: "landing-config.page_type_required",
      message: "Landing handoff configurations require a page type.",
      path: "configuration.pageType",
    });
  }

  if (!isHttpUrl(configuration.destinationUrl)) {
    errors.push({
      code: "landing-config.destination_url_invalid",
      message:
        "Landing handoff configurations require an http or https destination URL.",
      path: "configuration.destinationUrl",
    });
  }

  if (
    configuration.checkoutUrl !== undefined &&
    !isHttpUrl(configuration.checkoutUrl)
  ) {
    errors.push({
      code: "landing-config.checkout_url_invalid",
      message: "Landing handoff configuration checkout URLs must use http or https.",
      path: "configuration.checkoutUrl",
    });
  }

  if (configuration.preserveImmersion !== true) {
    errors.push({
      code: "landing-config.immersion_required",
      message:
        "Landing handoff configurations must preserve content-commerce immersion.",
      path: "configuration.preserveImmersion",
    });
  }

  if (!isRecord(handoffPayload.creative)) {
    errors.push({
      code: "landing-payload.creative_required",
      message: "Landing handoff payloads require creative JSON.",
      path: "payload.creative",
    });
  }

  if (
    productOffer?.checkoutUrl !== undefined &&
    !isHttpUrl(productOffer.checkoutUrl)
  ) {
    errors.push({
      code: "landing-payload.product_offer_checkout_url_invalid",
      message:
        "Landing handoff payload product offer checkout URLs must use http or https.",
      path: "payload.productOffer.checkoutUrl",
    });
  }

  errors.push(
    ...validateLandingPageHandoffTrackingMetadata(value.tracking, {
      campaignId: isNonEmptyString(value.campaignId) ? value.campaignId : undefined,
    }).errors,
  );

  return {
    ok: errors.length === 0,
    errors,
  };
}

export type LandingPluginDetails = {
  pageTypes: NonEmptyArray<LandingPageType>;
  publishTargets: NonEmptyArray<LandingPublishTarget>;
  supportsCheckout: boolean;
  preservesImmersion: boolean;
  dmReferralContextSchemas?: readonly PluginLandingDmReferralContextSchema[];
  conversionEventSchemas?: readonly PluginLandingConversionEventSchema[];
  handoffConfigurationSchemas?: readonly PluginLandingHandoffConfigurationSchema[];
  handoffPayloadSchemas?: readonly PluginLandingHandoffPayloadSchema[];
  trackingMetadataSchemas?: readonly PluginLandingHandoffTrackingMetadataSchema[];
  handoffEventSchemas?: readonly PluginLandingHandoffEventSchema[];
};

export type LandingCapabilityKind = Extract<PluginCapabilityKind, "landing.page">;

export type LandingPluginCapability = PluginCapability & {
  kind: LandingCapabilityKind;
};

export type LandingDomainConfigurationField = PluginConfigurationField & {
  landingConfigType: "domain";
  type: "string" | "select";
  publishTarget: LandingPublishTarget;
};

export type LandingTemplateConfigurationField = PluginConfigurationField & {
  landingConfigType: "template";
  type: "string" | "select" | "json";
  pageType: LandingPageType;
};

export type LandingCheckoutConfigurationField = PluginConfigurationField & {
  landingConfigType: "checkout";
  type: "string" | "select" | "json";
};

export type LandingPublishConfigurationField = PluginConfigurationField & {
  landingConfigType: "publish";
  type: "boolean" | "select" | "json";
};

export type LandingConfigurationField =
  | LandingDomainConfigurationField
  | LandingTemplateConfigurationField
  | LandingCheckoutConfigurationField
  | LandingPublishConfigurationField;

export type LandingConfigurationSchema = {
  fields: NonEmptyArray<LandingConfigurationField>;
};

export type LandingConfigurationValidationErrorCode =
  | "landing.page_capability_required"
  | "landing.creative_input_port_required"
  | "landing.url_output_port_required"
  | "landing.configuration_required"
  | "landing.duplicate_config_key"
  | "landing.unknown_config_type"
  | "landing.unsupported_publish_target"
  | "landing.unsupported_page_type"
  | "landing.field_type_mismatch"
  | "landing.checkout_required"
  | "landing.immersion_required"
  | "landing.dm_referral_context_input_port_required"
  | "landing.dm_referral_context_channel_unsupported"
  | "landing.dm_referral_context_page_type_unsupported"
  | "landing.conversion_event_output_port_required"
  | "landing.conversion_event_page_type_unsupported"
  | "landing.handoff_event_page_type_unsupported";

export type LandingConfigurationValidationError = {
  code: LandingConfigurationValidationErrorCode;
  message: string;
  path: string;
};

export type LandingConfigurationValidationResult = {
  ok: boolean;
  errors: LandingConfigurationValidationError[];
};

type LandingConfigurationValidationInput = {
  landing: Omit<
    LandingPluginDetails,
    "dmReferralContextSchemas" | "conversionEventSchemas"
  > & {
    dmReferralContextSchemas?: readonly (Omit<
      PluginLandingDmReferralContextSchema,
      "supportedChannels" | "supportedPageTypes"
    > & {
      supportedChannels: readonly string[];
      supportedPageTypes: readonly string[];
    })[];
    conversionEventSchemas?: readonly (Omit<
      PluginLandingConversionEventSchema,
      "supportedPageTypes"
    > & {
      supportedPageTypes: readonly string[];
    })[];
  };
  capabilities: readonly {
    kind: PluginCapabilityKind;
    inputPorts?: readonly Pick<PluginInputPort, "id" | "dataType">[];
    outputPorts?: readonly Pick<PluginOutputPort, "id" | "dataType">[];
  }[];
  configuration: {
    fields: readonly (PluginConfigurationField & {
      landingConfigType?: string;
      pageType?: string;
      publishTarget?: string;
    })[];
  };
};

export const LANDING_CONFIG_FIELD_TYPES: Record<
  string,
  readonly PluginConfigurationFieldType[]
> = {
  domain: ["string", "select"],
  template: ["string", "select", "json"],
  checkout: ["string", "select", "json"],
  publish: ["boolean", "select", "json"],
};

export function validateLandingPluginConfiguration(
  plugin: LandingConfigurationValidationInput,
): LandingConfigurationValidationResult {
  const errors: LandingConfigurationValidationError[] = [];
  const landingCapabilities = plugin.capabilities.filter(
    (capability) => capability.kind === "landing.page",
  );

  if (landingCapabilities.length === 0) {
    errors.push({
      code: "landing.page_capability_required",
      message: "Landing plugins must declare a landing.page capability.",
      path: "capabilities",
    });
  }

  if (
    !landingCapabilities.some((capability) =>
      capability.inputPorts?.some(
        (port) => port.id === "creative" && port.dataType === "json",
      ),
    )
  ) {
    errors.push({
      code: "landing.creative_input_port_required",
      message:
        "Landing page capabilities must declare a creative JSON input port.",
      path: "capabilities.inputPorts",
    });
  }

  if (
    !landingCapabilities.some((capability) =>
      capability.outputPorts?.some(
        (port) => port.id === "url" && port.dataType === "url",
      ),
    )
  ) {
    errors.push({
      code: "landing.url_output_port_required",
      message: "Landing page capabilities must declare a url output port.",
      path: "capabilities.outputPorts",
    });
  }

  if (plugin.configuration.fields.length === 0) {
    errors.push({
      code: "landing.configuration_required",
      message: "Landing plugins must declare at least one configuration field.",
      path: "configuration.fields",
    });
  }

  const seen = new Set<string>();

  plugin.configuration.fields.forEach((field, index) => {
    if (seen.has(field.key)) {
      errors.push({
        code: "landing.duplicate_config_key",
        message: `Landing configuration key "${field.key}" is duplicated.`,
        path: `configuration.fields.${index}.key`,
      });
    } else {
      seen.add(field.key);
    }
  });

  plugin.configuration.fields.forEach((field, index) => {
    if (
      field.landingConfigType !== undefined &&
      !(field.landingConfigType in LANDING_CONFIG_FIELD_TYPES)
    ) {
      errors.push({
        code: "landing.unknown_config_type",
        message: `${field.landingConfigType} is not a supported landing configuration type.`,
        path: `configuration.fields.${index}.landingConfigType`,
      });
    }
  });

  plugin.configuration.fields.forEach((field, index) => {
    if (
      field.landingConfigType === "domain" &&
      field.publishTarget !== undefined &&
      !plugin.landing.publishTargets.includes(
        field.publishTarget as LandingPublishTarget,
      )
    ) {
      errors.push({
        code: "landing.unsupported_publish_target",
        message: `${field.publishTarget} is not listed in landing publish targets.`,
        path: `configuration.fields.${index}.publishTarget`,
      });
    }

    if (
      field.landingConfigType === "template" &&
      field.pageType !== undefined &&
      !plugin.landing.pageTypes.includes(field.pageType as LandingPageType)
    ) {
      errors.push({
        code: "landing.unsupported_page_type",
        message: `${field.pageType} is not listed in landing page types.`,
        path: `configuration.fields.${index}.pageType`,
      });
    }
  });

  plugin.configuration.fields.forEach((field, index) => {
    const allowedTypes =
      field.landingConfigType === undefined
        ? undefined
        : LANDING_CONFIG_FIELD_TYPES[field.landingConfigType];

    if (allowedTypes !== undefined && !allowedTypes.includes(field.type)) {
      errors.push({
        code: "landing.field_type_mismatch",
        message: `${field.landingConfigType} landing configuration cannot use ${field.type} fields.`,
        path: `configuration.fields.${index}.type`,
      });
    }
  });

  if (
    plugin.landing.supportsCheckout &&
    !plugin.configuration.fields.some(
      (field) => field.landingConfigType === "checkout",
    )
  ) {
    errors.push({
      code: "landing.checkout_required",
      message:
        "Landing plugins supporting checkout must declare a checkout configuration field.",
      path: "configuration.fields",
    });
  }

  if (!plugin.landing.preservesImmersion) {
    errors.push({
      code: "landing.immersion_required",
      message:
        "Landing plugins must preserve the content-commerce path from creative to conversion.",
      path: "landing.preservesImmersion",
    });
  }

  if (
    plugin.landing.dmReferralContextSchemas !== undefined &&
    plugin.landing.dmReferralContextSchemas.length > 0 &&
    !landingCapabilities.some((capability) =>
      capability.inputPorts?.some(
        (port) => port.id === "dmReferralContext" && port.dataType === "json",
      ),
    )
  ) {
    errors.push({
      code: "landing.dm_referral_context_input_port_required",
      message:
        "Landing plugins that register DM referral context schemas must declare a dmReferralContext JSON input port.",
      path: "capabilities.inputPorts",
    });
  }

  plugin.landing.dmReferralContextSchemas?.forEach((schema, schemaIndex) => {
    schema.supportedChannels.forEach((channel, channelIndex) => {
      if (
        !(LANDING_DM_REFERRAL_CHANNELS as readonly string[]).includes(channel)
      ) {
        errors.push({
          code: "landing.dm_referral_context_channel_unsupported",
          message:
            "Landing DM referral context schemas must list supported DM referral channels.",
          path: `landing.dmReferralContextSchemas.${schemaIndex}.supportedChannels.${channelIndex}`,
        });
      }
    });

    schema.supportedPageTypes.forEach((pageType, pageTypeIndex) => {
      if (!(plugin.landing.pageTypes as readonly string[]).includes(pageType)) {
        errors.push({
          code: "landing.dm_referral_context_page_type_unsupported",
          message:
            "Landing DM referral context schema page types must be listed in landing page types.",
          path: `landing.dmReferralContextSchemas.${schemaIndex}.supportedPageTypes.${pageTypeIndex}`,
        });
      }
    });
  });

  if (
    plugin.landing.conversionEventSchemas !== undefined &&
    plugin.landing.conversionEventSchemas.length > 0 &&
    !landingCapabilities.some((capability) =>
      capability.outputPorts?.some(
        (port) => port.id === "conversionEvent" && port.dataType === "event",
      ),
    )
  ) {
    errors.push({
      code: "landing.conversion_event_output_port_required",
      message:
        "Landing plugins that expose conversion event schemas must declare a conversionEvent event output port.",
      path: "capabilities.outputPorts",
    });
  }

  plugin.landing.conversionEventSchemas?.forEach((schema, schemaIndex) => {
    schema.supportedPageTypes.forEach((pageType, pageTypeIndex) => {
      if (!(plugin.landing.pageTypes as readonly string[]).includes(pageType)) {
        errors.push({
          code: "landing.conversion_event_page_type_unsupported",
          message:
            "Landing conversion event schema page types must be listed in landing page types.",
          path: `landing.conversionEventSchemas.${schemaIndex}.supportedPageTypes.${pageTypeIndex}`,
        });
      }
    });
  });

  plugin.landing.handoffEventSchemas?.forEach((schema, schemaIndex) => {
    schema.supportedPageTypes.forEach((pageType, pageTypeIndex) => {
      if (!plugin.landing.pageTypes.includes(pageType)) {
        errors.push({
          code: "landing.handoff_event_page_type_unsupported",
          message:
            "Landing handoff event schema page types must be listed in landing page types.",
          path: `landing.handoffEventSchemas.${schemaIndex}.supportedPageTypes.${pageTypeIndex}`,
        });
      }
    });
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

type BasePluginManifest<
  TType extends PluginType,
  TConfiguration extends PluginConfigurationSchema = PluginConfigurationSchema,
  TCapability extends PluginCapability = PluginCapability,
> = {
  schemaVersion: PluginSchemaVersion;
  id: string;
  name: string;
  version: string;
  type: TType;
  lifecycle: PluginLifecycle;
  origin: PluginOrigin;
  metadata: PluginMetadata;
  permissions: PluginPermissions;
  capabilities: readonly TCapability[];
  configuration: TConfiguration;
  appliedConfiguration?: PluginAppliedConfiguration;
};

export type BuiltInProviderPluginManifest = BasePluginManifest<
  "provider",
  BuiltInProviderConfigurationSchema,
  ProviderPluginCapability
> & {
  origin: PluginOrigin & { kind: "built-in" };
  provider: ProviderPluginDetails<"built-in">;
  capabilities: NonEmptyArray<ProviderPluginCapability>;
};

export type ExternalProviderPluginManifest = BasePluginManifest<
  "provider",
  ExternalProviderConfigurationSchema,
  ProviderPluginCapability
> & {
  origin: PluginOrigin & { kind: "external" };
  provider: ProviderPluginDetails<"external">;
  capabilities: NonEmptyArray<ProviderPluginCapability>;
};

export type ProviderPluginManifest =
  | BuiltInProviderPluginManifest
  | ExternalProviderPluginManifest;

export type CommissionPluginManifest = BasePluginManifest<
  "commission",
  CommissionConfigurationSchema,
  CommissionPluginCapability
> & {
  commission: CommissionPluginDetails;
  capabilities: NonEmptyArray<CommissionPluginCapability>;
};

export type AgentPluginManifest = BasePluginManifest<
  "agent",
  AgentConfigurationSchema,
  AgentPluginCapability
> & {
  agent: AgentPluginDetails;
  capabilities: NonEmptyArray<AgentPluginCapability>;
};

export type DashboardPluginManifest = BasePluginManifest<
  "dashboard",
  DashboardConfigurationSchema,
  DashboardPluginCapability
> & {
  dashboard: DashboardPluginDetails;
  capabilities: NonEmptyArray<DashboardPluginCapability>;
};

export type DirectMessagePluginManifest = BasePluginManifest<
  "direct-message",
  DirectMessageConfigurationSchema,
  DirectMessagePluginCapability
> & {
  directMessage: DirectMessagePluginDetails;
  capabilities: NonEmptyArray<DirectMessagePluginCapability>;
};

export type LandingPluginManifest = BasePluginManifest<
  "landing",
  LandingConfigurationSchema,
  LandingPluginCapability
> & {
  landing: LandingPluginDetails;
  capabilities: NonEmptyArray<LandingPluginCapability>;
};

export type GenericPluginManifest = BasePluginManifest<
  Exclude<
    PluginType,
    | "provider"
    | "commission"
    | "agent"
    | "dashboard"
    | "direct-message"
    | "landing"
  >
>;

export type PluginManifest =
  | ProviderPluginManifest
  | CommissionPluginManifest
  | AgentPluginManifest
  | DashboardPluginManifest
  | DirectMessagePluginManifest
  | LandingPluginManifest
  | GenericPluginManifest;

export type PluginCatalog = {
  id: string;
  updatedAt: string;
  plugins: readonly PluginManifest[];
};

export const PLUGIN_CATALOG_STORAGE_KEY = "owncanvas.plugin-catalog.v1";
export const PLUGIN_CONFIGURATION_STORAGE_KEY =
  "owncanvas.plugin-configurations.v1";

export type PluginStorage = Pick<Storage, "getItem" | "setItem">;

export type PersistedPluginConfigurationStore = {
  schemaVersion: typeof PLUGIN_CONFIGURATION_STORAGE_KEY;
  updatedAt: string;
  configurations: Record<string, PluginAppliedConfiguration>;
};

export type AgentDiscoverablePlugin = {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  kind: AgentDiscoverablePluginKind;
  lifecycleState: PluginLifecycleState;
  originKind: PluginOrigin["kind"];
  displayName: string;
  description: string;
  tags: readonly string[];
  permissionMode: PluginPermissionMode;
  requiresApprovalFor: readonly PluginApprovalRequirement[];
  capabilityKinds: readonly PluginCapabilityKind[];
  supportsParallel: boolean;
  supportsBulk: boolean;
};

export type AgentInstalledPluginLifecycleState = Exclude<
  PluginLifecycleState,
  "available" | "uninstalled"
>;

export type AgentPluginConfigurationStatus =
  | "configured"
  | "needs_configuration"
  | "not_configured";

export type AgentPluginConfigurationState = {
  status: AgentPluginConfigurationStatus;
  appliedAt?: string;
  appliedBy?: PluginActor;
  source?: PluginAppliedConfiguration["source"];
  requiredFieldCount: number;
  configuredValueCount: number;
  configuredSecretRefCount: number;
  missingRequiredFieldCount: number;
};

export type AgentInstalledPlugin = {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  lifecycleState: AgentInstalledPluginLifecycleState;
  activationState: AgentInstalledPluginLifecycleState;
  installedAt?: string;
  configuredAt?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  originKind: PluginOrigin["kind"];
  displayName: string;
  permissionMode: PluginPermissionMode;
  configurableByAgent: boolean;
  configurationState: AgentPluginConfigurationState;
  requiresApprovalFor: readonly PluginApprovalRequirement[];
  capabilityKinds: readonly PluginCapabilityKind[];
};

export type AgentDiscoverablePluginKind = {
  type: PluginType;
  title: string;
  campaignRole: string;
  requiredDetailKey?: string;
};

export type AgentPluginInstallationErrorCode =
  | "plugin.not_found"
  | "plugin.not_available"
  | "plugin.agent_install_not_allowed"
  | "plugin.install_transition_not_allowed";

export type AgentPluginInstallationError = {
  code: AgentPluginInstallationErrorCode;
  message: string;
  pluginId: string;
};

export type AgentPluginInstallationResult =
  | {
      ok: true;
      catalog: PluginCatalog;
      plugin: PluginManifest;
    }
  | {
      ok: false;
      catalog: PluginCatalog;
      error: AgentPluginInstallationError;
    };

export type AgentPluginActivationErrorCode =
  | "plugin.not_found"
  | "plugin.not_installed"
  | "plugin.agent_activation_not_allowed"
  | "plugin.activation_transition_not_allowed"
  | "plugin.not_usable";

export type AgentPluginActivationError = {
  code: AgentPluginActivationErrorCode;
  message: string;
  pluginId: string;
};

export type AgentPluginActivationResult =
  | {
      ok: true;
      catalog: PluginCatalog;
      plugin: PluginManifest;
    }
  | {
      ok: false;
      catalog: PluginCatalog;
      error: AgentPluginActivationError;
    };

export type AgentPluginDeactivationErrorCode =
  | "plugin.not_found"
  | "plugin.not_active"
  | "plugin.agent_deactivation_not_allowed"
  | "plugin.deactivation_transition_not_allowed";

export type AgentPluginDeactivationError = {
  code: AgentPluginDeactivationErrorCode;
  message: string;
  pluginId: string;
};

export type AgentPluginDeactivationResult =
  | {
      ok: true;
      catalog: PluginCatalog;
      plugin: PluginManifest;
    }
  | {
      ok: false;
      catalog: PluginCatalog;
      error: AgentPluginDeactivationError;
    };

export type AgentPluginUsableCapability = {
  id: string;
  kind: PluginCapabilityKind;
  inputPortIds: readonly string[];
  outputPortIds: readonly string[];
  supportsParallel: boolean;
  supportsBulk: boolean;
};

export type AgentPluginUsabilityError = {
  code: string;
  message: string;
  path: string;
};

export type AgentPluginUsabilityResult = {
  ok: boolean;
  errors: AgentPluginUsabilityError[];
  usableCapabilities: AgentPluginUsableCapability[];
};

export type AgentWorkflowCapabilitySelection = {
  type: "canvas.node.create";
  pluginId: string;
  capabilityId: string;
};

export type AgentSelectableWorkflowCapability = {
  id: string;
  pluginId: string;
  pluginName: string;
  pluginDisplayName: string;
  pluginType: PluginType;
  pluginOriginKind: PluginOrigin["kind"];
  pluginLifecycleState: Extract<
    PluginLifecycleState,
    "installed" | "configured" | "active"
  >;
  permissionMode: PluginPermissionMode;
  requiresApprovalFor: readonly PluginApprovalRequirement[];
  capabilityId: string;
  capabilityKind: PluginCapabilityKind;
  title: string;
  description: string;
  inputPorts: readonly PluginInputPort[];
  outputPorts: readonly PluginOutputPort[];
  supportsParallel: boolean;
  supportsBulk: boolean;
  maxParallel?: number;
  selection: AgentWorkflowCapabilitySelection;
};

export type ListAgentWorkflowCapabilitiesOptions = {
  mode?: PluginPermissionMode;
  capabilityKinds?: readonly PluginCapabilityKind[];
};

export function classifyDiscoverablePluginKind(
  plugin: Pick<PluginManifest, "type">,
  registry: PluginKindRegistry = DEFAULT_PLUGIN_KIND_REGISTRY,
): AgentDiscoverablePluginKind {
  const definition = getPluginKindDefinition(plugin.type, registry);

  if (definition === undefined) {
    throw new Error(`Plugin kind "${plugin.type}" is not registered.`);
  }

  return {
    type: definition.type,
    title: definition.title,
    campaignRole: definition.campaignRole,
    ...(definition.requiredDetailKey === undefined
      ? {}
      : { requiredDetailKey: definition.requiredDetailKey }),
  };
}

export function listDiscoverablePluginsForAgent(
  catalog: PluginCatalog,
  registry: PluginKindRegistry = DEFAULT_PLUGIN_KIND_REGISTRY,
): AgentDiscoverablePlugin[] {
  return catalog.plugins
    .filter(
      (plugin) =>
        plugin.lifecycle.state === "available" &&
        plugin.permissions.installableBy.includes("agent"),
    )
    .map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      type: plugin.type,
      kind: classifyDiscoverablePluginKind(plugin, registry),
      lifecycleState: plugin.lifecycle.state,
      originKind: plugin.origin.kind,
      displayName: plugin.metadata.displayName,
      description: plugin.metadata.description,
      tags: plugin.metadata.tags,
      permissionMode: plugin.permissions.mode,
      requiresApprovalFor: plugin.permissions.requiresApprovalFor,
      capabilityKinds: plugin.capabilities.map((capability) => capability.kind),
      supportsParallel: plugin.capabilities.some(
        (capability) => capability.concurrency.supportsParallel,
      ),
      supportsBulk: plugin.capabilities.some(
        (capability) => capability.concurrency.supportsBulk,
      ),
    }));
}

export function listInstalledPluginsForAgent(
  catalog: PluginCatalog,
): AgentInstalledPlugin[] {
  return catalog.plugins.flatMap((plugin) => {
    if (!isAgentInstalledPluginLifecycleState(plugin.lifecycle.state)) {
      return [];
    }

    return [
      {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        type: plugin.type,
        lifecycleState: plugin.lifecycle.state,
        activationState: plugin.lifecycle.state,
        ...(plugin.lifecycle.installedAt === undefined
          ? {}
          : { installedAt: plugin.lifecycle.installedAt }),
        ...(plugin.lifecycle.configuredAt === undefined
          ? {}
          : { configuredAt: plugin.lifecycle.configuredAt }),
        ...(plugin.lifecycle.activatedAt === undefined
          ? {}
          : { activatedAt: plugin.lifecycle.activatedAt }),
        ...(plugin.lifecycle.deactivatedAt === undefined
          ? {}
          : { deactivatedAt: plugin.lifecycle.deactivatedAt }),
        originKind: plugin.origin.kind,
        displayName: plugin.metadata.displayName,
        permissionMode: plugin.permissions.mode,
        configurableByAgent: plugin.permissions.configurableBy.includes("agent"),
        configurationState: createAgentPluginConfigurationState(plugin),
        requiresApprovalFor: plugin.permissions.requiresApprovalFor,
        capabilityKinds: plugin.capabilities.map((capability) => capability.kind),
      },
    ];
  });
}

export function createAgentPluginConfigurationState(
  plugin: Pick<
    PluginManifest,
    "configuration" | "appliedConfiguration" | "lifecycle"
  >,
): AgentPluginConfigurationState {
  const requiredFieldCount = plugin.configuration.fields.filter(
    (field) => field.required,
  ).length;

  if (plugin.appliedConfiguration === undefined) {
    const configuredFromLifecycle =
      plugin.lifecycle.state === "configured" ||
      plugin.lifecycle.state === "active" ||
      plugin.lifecycle.state === "inactive";

    return {
      status: configuredFromLifecycle ? "configured" : "not_configured",
      requiredFieldCount,
      configuredValueCount: 0,
      configuredSecretRefCount: 0,
      missingRequiredFieldCount: configuredFromLifecycle ? 0 : requiredFieldCount,
    };
  }

  const configuredValueCount = Object.keys(
    plugin.appliedConfiguration.values,
  ).length;
  const configuredSecretRefCount = Object.keys(
    plugin.appliedConfiguration.secretRefs,
  ).length;
  const missingRequiredFieldCount =
    plugin.appliedConfiguration.missingRequiredKeys.length;

  return {
    status:
      missingRequiredFieldCount === 0 ? "configured" : "needs_configuration",
    appliedAt: plugin.appliedConfiguration.appliedAt,
    appliedBy: plugin.appliedConfiguration.appliedBy,
    source: plugin.appliedConfiguration.source,
    requiredFieldCount,
    configuredValueCount,
    configuredSecretRefCount,
    missingRequiredFieldCount,
  };
}

export function listSelectableWorkflowCapabilitiesForAgent(
  catalog: PluginCatalog,
  options: ListAgentWorkflowCapabilitiesOptions = {},
): AgentSelectableWorkflowCapability[] {
  const mode = options.mode ?? "advanced";
  const capabilityKindFilter = new Set(options.capabilityKinds);

  return catalog.plugins.flatMap((plugin) => {
    if (!isInstalledPluginLifecycleState(plugin.lifecycle.state)) {
      return [];
    }

    if (mode === "basic" && plugin.permissions.mode !== "basic") {
      return [];
    }

    const pluginLifecycleState = plugin.lifecycle.state;
    const usability = verifyAgentInstalledPluginUsable(plugin);

    if (!usability.ok) {
      return [];
    }

    return plugin.capabilities.flatMap((capability) => {
      if (
        capabilityKindFilter.size > 0 &&
        !capabilityKindFilter.has(capability.kind)
      ) {
        return [];
      }

      const selectableCapability = {
        id: `${plugin.id}:${capability.id}`,
        pluginId: plugin.id,
        pluginName: plugin.name,
        pluginDisplayName: plugin.metadata.displayName,
        pluginType: plugin.type,
        pluginOriginKind: plugin.origin.kind,
        pluginLifecycleState,
        permissionMode: plugin.permissions.mode,
        requiresApprovalFor: plugin.permissions.requiresApprovalFor,
        capabilityId: capability.id,
        capabilityKind: capability.kind,
        title: capability.title,
        description: capability.description,
        inputPorts: capability.inputPorts,
        outputPorts: capability.outputPorts,
        supportsParallel: capability.concurrency.supportsParallel,
        supportsBulk: capability.concurrency.supportsBulk,
        selection: {
          type: "canvas.node.create",
          pluginId: plugin.id,
          capabilityId: capability.id,
        },
      } satisfies Omit<AgentSelectableWorkflowCapability, "maxParallel">;

      return [
        capability.concurrency.maxParallel === undefined
          ? selectableCapability
          : {
              ...selectableCapability,
              maxParallel: capability.concurrency.maxParallel,
            },
      ];
    });
  });
}

export function installSelectedPluginForAgent(
  catalog: PluginCatalog,
  pluginId: string,
  options: { now?: () => string } = {},
): AgentPluginInstallationResult {
  const plugin = catalog.plugins.find((candidate) => candidate.id === pluginId);
  const now = options.now?.() ?? new Date().toISOString();

  if (plugin === undefined) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.not_found",
        message: "Selected plugin was not found in the catalog.",
        pluginId,
      },
    };
  }

  if (plugin.lifecycle.state !== "available") {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.not_available",
        message: "Agents can only install plugins that are currently available.",
        pluginId,
      },
    };
  }

  if (!plugin.permissions.installableBy.includes("agent")) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.agent_install_not_allowed",
        message: "Selected plugin does not allow agent installation.",
        pluginId,
      },
    };
  }

  if (!isPluginLifecycleTransitionAllowed(plugin.lifecycle.state, "installed")) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.install_transition_not_allowed",
        message: "Selected plugin cannot transition to installed.",
        pluginId,
      },
    };
  }

  const appliedConfiguration = createAgentDefaultAppliedConfiguration(
    plugin,
    now,
  );
  const installedLifecycleState =
    appliedConfiguration.missingRequiredKeys.length === 0
      ? "configured"
      : "installed";
  const installedPlugin = {
    ...plugin,
    lifecycle: {
      ...plugin.lifecycle,
      state: installedLifecycleState,
      installedAt: now,
      ...(installedLifecycleState === "configured"
        ? { configuredAt: now }
        : {}),
      updatedAt: now,
    },
    appliedConfiguration,
  } as PluginManifest;

  return {
    ok: true,
    plugin: installedPlugin,
    catalog: {
      ...catalog,
      updatedAt: now,
      plugins: catalog.plugins.map((candidate) =>
        candidate.id === pluginId ? installedPlugin : candidate,
      ),
    },
  };
}

export function installSelectedPluginForAgentInStorage(
  storage: PluginStorage,
  catalog: PluginCatalog,
  pluginId: string,
  options: { now?: () => string } = {},
): AgentPluginInstallationResult {
  const result = installSelectedPluginForAgent(catalog, pluginId, options);

  if (result.ok) {
    persistPluginCatalog(storage, result.catalog);
  }

  return result;
}

export function activateInstalledPluginForAgentInStorage(
  storage: PluginStorage,
  catalog: PluginCatalog,
  pluginId: string,
  options: { now?: () => string } = {},
): AgentPluginActivationResult {
  const result = activateInstalledPluginForAgent(catalog, pluginId, options);

  if (result.ok) {
    persistPluginCatalog(storage, result.catalog);
  }

  return result;
}

export function deactivateInstalledPluginForAgentInStorage(
  storage: PluginStorage,
  catalog: PluginCatalog,
  pluginId: string,
  options: { now?: () => string } = {},
): AgentPluginDeactivationResult {
  const result = deactivateInstalledPluginForAgent(catalog, pluginId, options);

  if (result.ok) {
    persistPluginCatalog(storage, result.catalog);
  }

  return result;
}

export function persistPluginCatalog(
  storage: PluginStorage,
  catalog: PluginCatalog,
): PluginCatalog {
  storage.setItem(
    PLUGIN_CATALOG_STORAGE_KEY,
    JSON.stringify(createPersistablePluginCatalog(catalog)),
  );
  storage.setItem(
    PLUGIN_CONFIGURATION_STORAGE_KEY,
    JSON.stringify(createPersistablePluginConfigurationStore(catalog)),
  );

  return catalog;
}

export function getPersistedPluginCatalog(
  storage: Pick<Storage, "getItem">,
): PluginCatalog | null {
  const serializedCatalog = storage.getItem(PLUGIN_CATALOG_STORAGE_KEY);

  if (serializedCatalog === null) {
    return null;
  }

  const persistedCatalog = JSON.parse(serializedCatalog) as PluginCatalog;

  return applyPersistedPluginConfigurations(persistedCatalog, storage);
}

function createPersistablePluginCatalog(catalog: PluginCatalog): PluginCatalog {
  return {
    ...catalog,
    plugins: catalog.plugins.map(createPersistablePluginManifest),
  };
}

function createPersistablePluginManifest(plugin: PluginManifest): PluginManifest {
  const { appliedConfiguration: _appliedConfiguration, ...manifest } = plugin;

  return {
    ...manifest,
    configuration: {
      fields: plugin.configuration.fields.map((field) => {
        if (field.type !== "secret" || field.defaultValue === undefined) {
          return field;
        }

        const { defaultValue: _defaultValue, ...persistableField } = field;

        return persistableField;
      }),
    },
  } as PluginManifest;
}

function createPersistablePluginConfigurationStore(
  catalog: PluginCatalog,
): PersistedPluginConfigurationStore {
  return {
    schemaVersion: PLUGIN_CONFIGURATION_STORAGE_KEY,
    updatedAt: catalog.updatedAt,
    configurations: catalog.plugins.reduce<
      PersistedPluginConfigurationStore["configurations"]
    >((configurations, plugin) => {
      if (plugin.appliedConfiguration !== undefined) {
        configurations[plugin.id] = plugin.appliedConfiguration;
      }

      return configurations;
    }, {}),
  };
}

function applyPersistedPluginConfigurations(
  catalog: PluginCatalog,
  storage: Pick<Storage, "getItem">,
): PluginCatalog {
  const serializedConfigurations = storage.getItem(
    PLUGIN_CONFIGURATION_STORAGE_KEY,
  );

  if (serializedConfigurations === null) {
    return catalog;
  }

  const configurationStore = JSON.parse(
    serializedConfigurations,
  ) as PersistedPluginConfigurationStore;

  return {
    ...catalog,
    plugins: catalog.plugins.map((plugin) => {
      const appliedConfiguration =
        configurationStore.configurations[plugin.id] ??
        plugin.appliedConfiguration;

      return appliedConfiguration === undefined
        ? plugin
        : ({
            ...plugin,
            appliedConfiguration,
          } as PluginManifest);
    }),
  };
}

function createAgentDefaultAppliedConfiguration(
  plugin: PluginManifest,
  appliedAt: string,
): PluginAppliedConfiguration {
  const schema = createPluginDefaultConfigurationSchema(plugin);
  const configuredKeys = new Set([
    ...Object.keys(schema.defaults.values),
    ...Object.keys(schema.defaults.secretRefs),
  ]);

  return {
    appliedAt,
    appliedBy: "agent",
    source: "plugin.default",
    values: schema.defaults.values,
    secretRefs: schema.defaults.secretRefs,
    missingRequiredKeys: schema.requiredKeys.filter(
      (key) => !configuredKeys.has(key),
    ),
  };
}

export function activateInstalledPluginForAgent(
  catalog: PluginCatalog,
  pluginId: string,
  options: { now?: () => string } = {},
): AgentPluginActivationResult {
  const plugin = catalog.plugins.find((candidate) => candidate.id === pluginId);
  const now = options.now?.() ?? new Date().toISOString();

  if (plugin === undefined) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.not_found",
        message: "Selected plugin was not found in the catalog.",
        pluginId,
      },
    };
  }

  if (!isInstalledPluginLifecycleState(plugin.lifecycle.state)) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.not_installed",
        message: "Agents can only activate installed plugins.",
        pluginId,
      },
    };
  }

  if (!plugin.permissions.configurableBy.includes("agent")) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.agent_activation_not_allowed",
        message: "Selected plugin does not allow agent activation.",
        pluginId,
      },
    };
  }

  if (!isPluginLifecycleTransitionAllowed(plugin.lifecycle.state, "active")) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.activation_transition_not_allowed",
        message: "Selected plugin cannot transition to active.",
        pluginId,
      },
    };
  }

  const usability = verifyAgentInstalledPluginUsable(plugin);

  if (!usability.ok) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.not_usable",
        message: "Selected plugin is not usable by agents.",
        pluginId,
      },
    };
  }

  const activatedPlugin = {
    ...plugin,
    appliedConfiguration:
      plugin.appliedConfiguration ??
      createAgentDefaultAppliedConfiguration(plugin, now),
    lifecycle: {
      ...plugin.lifecycle,
      state: "active",
      activatedAt: now,
      updatedAt: now,
    },
  } as PluginManifest;

  return {
    ok: true,
    plugin: activatedPlugin,
    catalog: {
      ...catalog,
      updatedAt: now,
      plugins: catalog.plugins.map((candidate) =>
        candidate.id === pluginId ? activatedPlugin : candidate,
      ),
    },
  };
}

export function deactivateInstalledPluginForAgent(
  catalog: PluginCatalog,
  pluginId: string,
  options: { now?: () => string } = {},
): AgentPluginDeactivationResult {
  const plugin = catalog.plugins.find((candidate) => candidate.id === pluginId);
  const now = options.now?.() ?? new Date().toISOString();

  if (plugin === undefined) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.not_found",
        message: "Selected plugin was not found in the catalog.",
        pluginId,
      },
    };
  }

  if (plugin.lifecycle.state !== "active") {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.not_active",
        message: "Agents can only deactivate active installed plugins.",
        pluginId,
      },
    };
  }

  if (!plugin.permissions.configurableBy.includes("agent")) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.agent_deactivation_not_allowed",
        message: "Selected plugin does not allow agent deactivation.",
        pluginId,
      },
    };
  }

  if (!isPluginLifecycleTransitionAllowed(plugin.lifecycle.state, "inactive")) {
    return {
      ok: false,
      catalog,
      error: {
        code: "plugin.deactivation_transition_not_allowed",
        message: "Selected plugin cannot transition to inactive.",
        pluginId,
      },
    };
  }

  const deactivatedPlugin = {
    ...plugin,
    lifecycle: {
      ...plugin.lifecycle,
      state: "inactive",
      deactivatedAt: now,
      updatedAt: now,
    },
  } as PluginManifest;

  return {
    ok: true,
    plugin: deactivatedPlugin,
    catalog: {
      ...catalog,
      updatedAt: now,
      plugins: catalog.plugins.map((candidate) =>
        candidate.id === pluginId ? deactivatedPlugin : candidate,
      ),
    },
  };
}

export function verifyAgentInstalledPluginUsable(
  plugin: PluginManifest,
): AgentPluginUsabilityResult {
  const errors: AgentPluginUsabilityError[] = [];

  if (
    plugin.lifecycle.state !== "installed" &&
    plugin.lifecycle.state !== "configured" &&
    plugin.lifecycle.state !== "active"
  ) {
    errors.push({
      code: "plugin.not_installed",
      message: "Plugin must be installed before an agent can use it.",
      path: "lifecycle.state",
    });
  }

  if (!plugin.permissions.configurableBy.includes("agent")) {
    errors.push({
      code: "plugin.agent_configuration_not_allowed",
      message: "Plugin must allow agent configuration before agent use.",
      path: "permissions.configurableBy",
    });
  }

  plugin.capabilities.forEach((capability, index) => {
    if (
      capability.inputPorts.length === 0 ||
      capability.outputPorts.length === 0
    ) {
      errors.push({
        code: "plugin.capability_ports_required",
        message: "Usable plugin capabilities must expose explicit input and output ports.",
        path: `capabilities.${index}`,
      });
    }
  });

  errors.push(...validatePluginTypeSpecificUsability(plugin));

  return {
    ok: errors.length === 0,
    errors,
    usableCapabilities: errors.length === 0
      ? plugin.capabilities.map((capability) => ({
          id: capability.id,
          kind: capability.kind,
          inputPortIds: capability.inputPorts.map((port) => port.id),
          outputPortIds: capability.outputPorts.map((port) => port.id),
          supportsParallel: capability.concurrency.supportsParallel,
          supportsBulk: capability.concurrency.supportsBulk,
        }))
      : [],
  };
}

function validatePluginTypeSpecificUsability(
  plugin: PluginManifest,
): AgentPluginUsabilityError[] {
  switch (plugin.type) {
    case "provider":
      return validateProviderPluginConfiguration(plugin).errors;
    case "commission":
      return validateCommissionPluginConfiguration(plugin).errors;
    case "agent":
      return validateAgentPluginConfiguration(plugin).errors;
    case "dashboard":
      return validateDashboardPluginConfiguration(plugin).errors;
    case "direct-message":
      return validateDirectMessagePluginConfiguration(plugin).errors;
    case "landing":
      return validateLandingPluginConfiguration(plugin).errors;
    case "tracking":
    case "custom":
      return [];
  }
}

function isInstalledPluginLifecycleState(
  state: PluginLifecycleState,
): state is Extract<PluginLifecycleState, "installed" | "configured" | "active"> {
  return state === "installed" || state === "configured" || state === "active";
}

function isAgentInstalledPluginLifecycleState(
  state: PluginLifecycleState,
): state is AgentInstalledPluginLifecycleState {
  return state !== "available" && state !== "uninstalled";
}

export function definePluginManifest<const TPlugin>(plugin: TPlugin) {
  return plugin;
}
