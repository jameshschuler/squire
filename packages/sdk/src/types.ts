import type { ApiResource, ApiResourceOf, CamelCase } from "./api-resources.js";
import type { ServiceDetail, paths } from "./generated/openapi.js";

export type * from "./generated/openapi.js";

type JsonResponse<P extends string> = P extends keyof paths
  ? paths[P]["get"] extends { responses: { 200: { content: { "application/json": infer T } } } }
    ? T
    : never
  : never;

/** Resources the Data API serves, named as the client names them, e.g. `"items"` or `"lootTables"`. */
export type ResourceName = CamelCase<ApiResource>;

/** An entry in its compact form (usually `id`, `name` and `icon`), as `list` and plain `search` return it. */
export type ListItem<R extends ResourceName> = JsonResponse<`/${ApiResourceOf<R>}/`> extends (infer T)[] ? T : never;

/** An entry in full, as `get`, detailed `search` and `loadAll` return it. */
export type Detail<R extends ResourceName> = JsonResponse<`/${ApiResourceOf<R>}/id/{id}`>;

type SearchQuery<R extends ResourceName> = `/${ApiResourceOf<R>}/search` extends infer P extends keyof paths
  ? paths[P]["get"] extends { parameters: { query?: infer Q } }
    ? Omit<NonNullable<Q>, "detailed">
    : Record<never, never>
  : Record<never, never>;

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
