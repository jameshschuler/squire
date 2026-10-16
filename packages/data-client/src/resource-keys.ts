import type { ApiResource, CamelCase } from "./api-resources.js";

export function resourceKey<A extends ApiResource>(resource: A): CamelCase<A> {
  return resource.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase()) as CamelCase<A>;
}
