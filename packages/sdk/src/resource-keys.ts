import type { ResourceKey, ResourceName } from "./types.js";

export function resourceKey<R extends ResourceName>(resource: R): ResourceKey<R> {
  return resource.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase()) as ResourceKey<R>;
}
