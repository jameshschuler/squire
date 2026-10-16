import { LISTS_WITH_FULL_ENTRIES } from "./full-lists.js";
import { SEARCH_VALUES } from "./generated/resources.js";
import type { ApiResource, ApiResourceOf } from "./api-resources.js";
import type { SearchableResource } from "./types.js";

const CONCURRENCY = 4;
const BULK_FILTERS: { [R in keyof typeof SEARCH_VALUES]?: keyof (typeof SEARCH_VALUES)[R] } = {
  abilities: "type",
  activities: "relatedSkillsList",
  buildings: "type",
  factions: "type",
  items: "canBeSold",
  keywords: "types",
  locations: "faction",
  loot_tables: "category",
  pfp_options: "type",
  recipes: "relatedSkills",
  services: "serviceType",
  shops: "onlyPurchaseSellingListItems",
};

export interface Endpoints {
  list(resource: ApiResource): Promise<unknown[]>;
  get(resource: ApiResource, id: string): Promise<unknown>;
  search(resource: ApiResourceOf<SearchableResource>, filters: object, detailed: boolean): Promise<unknown[]>;
}

export async function loadAllEntries(endpoints: Endpoints, resource: ApiResource): Promise<unknown[]> {
  type Entry = { id: string };
  if (LISTS_WITH_FULL_ENTRIES.has(resource)) {
    const entries = await endpoints.list(resource);
    return entries;
  }
  const [compact, batches] = await Promise.all([endpoints.list(resource), bulkSearch(endpoints, resource)]);
  const found = new Map((batches.flat() as Entry[]).map((entry) => [entry.id, entry]));
  const missing = (compact as { id: string }[]).map((entry) => entry.id).filter((id) => !found.has(id));
  const fetched = (await mapPool(missing, (id) => endpoints.get(resource, id))) as Entry[];
  for (const entry of fetched) {
    found.set(entry.id, entry);
  }
  return [...found.values()];
}

function bulkSearch(endpoints: Endpoints, resource: ApiResource): Promise<unknown[][]> {
  const filter = BULK_FILTERS[resource as keyof typeof BULK_FILTERS] as string | undefined;
  if (!filter) {
    return Promise.resolve([]);
  }
  const values: readonly (string | boolean)[] = SEARCH_VALUES[resource as keyof typeof SEARCH_VALUES][filter as never];
  return mapPool(values, (value) =>
    endpoints.search(resource as ApiResourceOf<SearchableResource>, { [filter]: value }, true),
  );
}

async function mapPool<T, R>(inputs: readonly T[], fn: (input: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < inputs.length) {
      const i = next++;
      results[i] = await fn(inputs[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, inputs.length) }, worker));
  return results;
}
