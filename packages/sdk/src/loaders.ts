import type { WalkScapeClient } from "./client.js";
import { LISTS_WITH_FULL_ENTRIES } from "./full-lists.js";
import { SEARCH_VALUES } from "./generated/search-values.js";
import type { Detail, ResourceName, SearchableResource } from "./types.js";

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

type EndpointClient = Pick<WalkScapeClient, "list" | "get" | "search">;

export async function loadAllEntries<R extends ResourceName>(
  client: EndpointClient,
  resource: R,
): Promise<Detail<R>[]> {
  type Entry = Detail<R> & { id: string };
  if (LISTS_WITH_FULL_ENTRIES.has(resource)) {
    const entries = await client.list(resource);
    return entries as Detail<R>[];
  }
  const [compact, batches] = await Promise.all([client.list(resource), bulkSearch(client, resource)]);
  const found = new Map((batches.flat() as Entry[]).map((entry) => [entry.id, entry]));
  const missing = (compact as { id: string }[]).map((entry) => entry.id).filter((id) => !found.has(id));
  const fetched = (await mapPool(missing, (id) => client.get(resource, id))) as Entry[];
  for (const entry of fetched) {
    found.set(entry.id, entry);
  }
  return [...found.values()];
}

function bulkSearch(client: EndpointClient, resource: ResourceName): Promise<unknown[][]> {
  const filter = BULK_FILTERS[resource as keyof typeof BULK_FILTERS] as string | undefined;
  if (!filter) {
    return Promise.resolve([]);
  }
  const values: readonly (string | boolean)[] = SEARCH_VALUES[resource as keyof typeof SEARCH_VALUES][filter as never];
  return mapPool(values, (value) =>
    client.search(resource as SearchableResource, { [filter]: value }, { detailed: true }),
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
