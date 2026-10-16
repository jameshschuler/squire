import type { ServiceDetail, paths } from "./generated/openapi.js";

export type * from "./generated/openapi.js";

type JsonResponse<P extends keyof paths> = paths[P]["get"] extends {
  responses: { 200: { content: { "application/json": infer T } } };
}
  ? T
  : never;

/** Resources the Data API serves, e.g. `"items"` or `"recipes"`. Each supports `list` and `get`. */
export type ResourceName = { [P in keyof paths]: P extends `/${infer R}/id/{id}` ? R : never }[keyof paths];

type CamelCase<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;

/** The client property for a resource: `"loot_tables"` is `client.lootTables`. */
export type ResourceKey<R extends ResourceName> = CamelCase<R>;

/** An entry in its compact form (usually `id`, `name` and `icon`), as `list` and plain `search` return it. */
export type ListItem<R extends ResourceName> = JsonResponse<`/${R}/`> extends (infer T)[] ? T : never;

/** An entry in full, as `get`, detailed `search` and `loadAll` return it. */
export type Detail<R extends ResourceName> = JsonResponse<`/${R}/id/{id}`>;

type SearchQuery<R extends ResourceName> = Omit<
  NonNullable<paths[`/${R}/search`]["get"]["parameters"]["query"]>,
  "detailed"
>;

/** Resources with at least one search filter. The others can only be listed or fetched by id. */
export type SearchableResource = {
  [R in ResourceName]: keyof SearchQuery<R> extends never ? never : R;
}[ResourceName];

/** Filters for `search`, with the values the API accepts, e.g. `{ type: "material" }`. True/false filters take booleans. */
export type SearchFilters<R extends SearchableResource> = {
  [K in keyof SearchQuery<R>]?: SearchQuery<R>[K] extends "true" | "false" | undefined ? boolean : SearchQuery<R>[K];
};

/** The current game data version, from `version()`. */
export type VersionInfo = JsonResponse<"/version/">;

/** Server status and uptime, from `health()`. */
export type Health = JsonResponse<"/health/">;

/** The map images the API serves, from `maps()`. */
export type MapList = JsonResponse<"/maps">;

export type ServiceTier = ServiceDetail["tier"];

/** Service tiers from lowest to highest. A higher tier can craft lower-tier recipes. */
export const SERVICE_TIERS = ["basic", "advanced", "expert"] as const satisfies readonly ServiceTier[];
