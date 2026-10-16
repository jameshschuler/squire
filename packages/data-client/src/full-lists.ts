import type { ApiResource } from "./api-resources.js";

export const LISTS_WITH_FULL_ENTRIES: ReadonlySet<ApiResource> = new Set([
  "achievements",
  "rewards",
  "routes",
  "route_paths",
  "skills",
]);
