import {
  listPluginKindDefinitions,
  type PluginKindDefinition,
} from "../features/plugins/model/plugin-representation.ts";

export const PLUGIN_KIND_DISCOVERY_SCHEMA_VERSION =
  "owncanvas.plugin-kind-discovery.v1";

export type PluginKindDiscoveryMetadata = {
  title: string;
  description: string;
  campaignRole: string;
  capabilityKinds: PluginKindDefinition["capabilityKinds"];
  originSupport: {
    builtIn: boolean;
    external: boolean;
  };
  defaultPermissionMode: PluginKindDefinition["defaultPermissionMode"];
  requiredDetailKey?: string;
};

export type PluginKindDiscoveryEntry = {
  type: PluginKindDefinition["type"];
  metadata: PluginKindDiscoveryMetadata;
};

export function toPluginKindDiscoveryEntry(
  definition: PluginKindDefinition,
): PluginKindDiscoveryEntry {
  return {
    type: definition.type,
    metadata: {
      title: definition.title,
      description: definition.description,
      campaignRole: definition.campaignRole,
      capabilityKinds: definition.capabilityKinds,
      originSupport: {
        builtIn: definition.supportsBuiltInOrigin,
        external: definition.supportsExternalOrigin,
      },
      defaultPermissionMode: definition.defaultPermissionMode,
      ...(definition.requiredDetailKey === undefined
        ? {}
        : { requiredDetailKey: definition.requiredDetailKey }),
    },
  };
}

export function loader() {
  const pluginKinds = listPluginKindDefinitions().map(
    toPluginKindDiscoveryEntry,
  );

  return Response.json({
    schemaVersion: PLUGIN_KIND_DISCOVERY_SCHEMA_VERSION,
    count: pluginKinds.length,
    pluginKinds,
  });
}
