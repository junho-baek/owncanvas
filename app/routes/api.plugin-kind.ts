import {
  getPluginKindDefinition,
  isSupportedPluginType,
} from "../features/plugins/model/plugin-representation.ts";
import {
  PLUGIN_KIND_DISCOVERY_SCHEMA_VERSION,
  toPluginKindDiscoveryEntry,
} from "./api.plugin-kinds.ts";

type PluginKindLoaderArgs = {
  params: {
    pluginType?: string;
  };
};

export function loader({ params }: PluginKindLoaderArgs) {
  const pluginType = params.pluginType ?? "";

  if (!isSupportedPluginType(pluginType)) {
    return Response.json(
      {
        schemaVersion: PLUGIN_KIND_DISCOVERY_SCHEMA_VERSION,
        error: {
          code: "plugin_kind.not_found",
          message: "Plugin kind is not registered.",
          pluginType,
        },
      },
      {
        status: 404,
      },
    );
  }

  const pluginKind = getPluginKindDefinition(pluginType);

  if (pluginKind === undefined) {
    return Response.json(
      {
        schemaVersion: PLUGIN_KIND_DISCOVERY_SCHEMA_VERSION,
        error: {
          code: "plugin_kind.not_found",
          message: "Plugin kind is not registered.",
          pluginType,
        },
      },
      {
        status: 404,
      },
    );
  }

  return Response.json({
    schemaVersion: PLUGIN_KIND_DISCOVERY_SCHEMA_VERSION,
    pluginKind: toPluginKindDiscoveryEntry(pluginKind),
  });
}
