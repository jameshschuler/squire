import type { WalkScapeClient } from "./client.js";
import { SEARCH_VALUES } from "./generated/search-values.js";
import type {
  ActivityDetail,
  Detail,
  FactionDetail,
  ItemDetail,
  LocationDetail,
  LootTableDetail,
  RecipeDetail,
  ResourceName,
  SearchableResource,
  ServiceDetail,
  ShopDetail,
  SkillDetail,
} from "./types.js";

/** A snapshot of the game data needed to work with recipes, tagged with the data version it came from. */
export interface GameData {
  version: string;
  recipes: RecipeDetail[];
  items: ItemDetail[];
  skills: SkillDetail[];
  services: ServiceDetail[];
  locations: LocationDetail[];
  factions: FactionDetail[];
  activities: ActivityDetail[];
  lootTables: LootTableDetail[];
  shops: ShopDetail[];
}

const CONCURRENCY = 4;
const BULK_FILTERS: { [R in keyof typeof SEARCH_VALUES]?: keyof (typeof SEARCH_VALUES)[R] } = {
  abilities: "type",
  achievements: "difficulty",
  activities: "relatedSkillsList",
  buildings: "type",
  factions: "type",
  items: "canBeSold",
  keywords: "types",
  locations: "faction",
  loot_tables: "category",
  pfp_options: "type",
  recipes: "relatedSkills",
  rewards: "type",
  services: "tier",
  shops: "onlyPurchaseSellingListItems",
  skills: "type",
};

/**
 * Every entry of a resource, in full. Uses a few bulk searches where the API allows them, then fetches
 * anything they missed one at a time. Resources without a usable search filter, such as `route_paths`
 * and `pfp_option_groups`, take one request per entry, which can mean minutes under the rate limit of
 * 120 requests a minute.
 *
 * @example
 * const items = await loadAll(client, "items"); // ItemDetail[], in 3 requests
 */
export async function loadAll<R extends ResourceName>(client: WalkScapeClient, resource: R): Promise<Detail<R>[]> {
  type Entry = Detail<R> & { id: string };
  const [compact, batches] = await Promise.all([client.list(resource), bulkSearch(client, resource)]);
  const found = new Map((batches.flat() as Entry[]).map((entry) => [entry.id, entry]));
  const missing = (compact as { id: string }[]).map((entry) => entry.id).filter((id) => !found.has(id));
  for (const entry of (await mapPool(missing, (id) => client.get(resource, id))) as Entry[]) {
    found.set(entry.id, entry);
  }
  return [...found.values()];
}

/**
 * Loads every recipe, item, skill, service, location, faction, activity, loot table and shop, in full:
 * about 55 requests, a couple of seconds. The API allows 120 requests a minute per IP, so load this once
 * and reload only when `client.version()` changes.
 */
export async function loadGameData(client: WalkScapeClient): Promise<GameData> {
  const [{ version }, recipes, items, skills, services, locations, factions, activities, lootTables, shops] =
    await Promise.all([
      client.version(),
      loadAll(client, "recipes"),
      loadAll(client, "items"),
      loadAll(client, "skills"),
      loadAll(client, "services"),
      loadAll(client, "locations"),
      loadAll(client, "factions"),
      loadAll(client, "activities"),
      loadAll(client, "loot_tables"),
      loadAll(client, "shops"),
    ]);
  return { version: version!, recipes, items, skills, services, locations, factions, activities, lootTables, shops };
}

function bulkSearch(client: WalkScapeClient, resource: ResourceName): Promise<unknown[][]> {
  const filter = BULK_FILTERS[resource as keyof typeof BULK_FILTERS] as string | undefined;
  if (!filter) {
    return Promise.resolve([]);
  }
  const values: readonly string[] = SEARCH_VALUES[resource as keyof typeof SEARCH_VALUES][filter as never];
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
