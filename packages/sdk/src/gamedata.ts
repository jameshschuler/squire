import type { WalkScapeClient } from "./client.js";
import type {
  Activity,
  CompactEntity,
  Faction,
  ItemDetail,
  Location,
  LootTable,
  Recipe,
  Service,
  Shop,
  Skill,
} from "./types.js";

/** A snapshot of the game data needed to work with recipes, tagged with the data version it came from. */
export interface GameData {
  version: string;
  recipes: Recipe[];
  items: ItemDetail[];
  skills: Skill[];
  services: Service[];
  locations: Location[];
  factions: Faction[];
  activities: Activity[];
  lootTables: LootTable[];
  shops: Shop[];
}

const CONCURRENCY = 4;
const LOOT_TABLE_CATEGORIES = ["normal", "chest", "collectible", "petEgg"];
const ITEM_TYPES = ["material", "container", "crafted", "loot", "consumable", "collectible", "currency", "egg", "lore"];

/**
 * Loads every recipe, item (in full), skill, crafting service, location, faction, activity, loot table and
 * shop in about 60 requests (a couple of seconds). The API allows 120 requests a minute per IP, so load this once and reload only when
 * `client.version()` changes.
 */
export async function loadGameData(client: WalkScapeClient): Promise<GameData> {
  const [
    { version },
    skills,
    compactItems,
    services,
    compactRecipes,
    compactLocations,
    factions,
    compactActivities,
    compactShops,
  ] = await Promise.all([
    client.version(),
    client.list<Skill>("skills"),
    client.list<CompactEntity>("items"),
    client.search<Service>("services", { serviceType: "crafting" }, { detailed: true }),
    client.list<CompactEntity>("recipes"),
    client.list<CompactEntity>("locations"),
    client.list<Faction>("factions"),
    client.list<CompactEntity>("activities"),
    client.list<CompactEntity>("shops"),
  ]);

  const [recipes, activities, locations, items, shops, lootTableBatches] = await Promise.all([
    loadComplete(
      compactRecipes.map((r) => r.id),
      mapPool(skills, (skill) => client.search<Recipe>("recipes", { relatedSkills: skill.id }, { detailed: true })),
      (id) => client.get<Recipe>("recipes", id),
    ),
    loadComplete(
      compactActivities.map((a) => a.id),
      mapPool(skills, (skill) =>
        client.search<Activity>("activities", { relatedSkillsList: skill.id }, { detailed: true }),
      ),
      (id) => client.get<Activity>("activities", id),
    ),
    loadComplete(
      compactLocations.map((l) => l.id),
      mapPool(factions, (faction) => client.search<Location>("locations", { faction: faction.id }, { detailed: true })),
      (id) => client.get<Location>("locations", id),
    ),
    loadComplete(
      compactItems.map((i) => i.id),
      mapPool(ITEM_TYPES, (type) => client.search<ItemDetail>("items", { type }, { detailed: true })),
      (id) => client.get<ItemDetail>("items", id),
    ),
    loadComplete(
      compactShops.map((s) => s.id),
      mapPool([true, false], (onlyPurchaseSellingListItems) =>
        client.search<Shop>("shops", { onlyPurchaseSellingListItems }, { detailed: true }),
      ),
      (id) => client.get<Shop>("shops", id),
    ),
    mapPool(LOOT_TABLE_CATEGORIES, (category) =>
      client.search<LootTable>("loot_tables", { category }, { detailed: true }),
    ),
  ]);
  const lootTables = await loadComplete(
    activities.flatMap((a) => (a.tables ?? []).flatMap((ref) => ref.tables)),
    Promise.resolve(lootTableBatches),
    (id) => client.get<LootTable>("loot_tables", id),
  );

  return { version, recipes, items, skills, services, locations, factions, activities, lootTables, shops };
}

async function loadComplete<T extends { id: string }>(
  ids: string[],
  bulk: Promise<T[][]>,
  getOne: (id: string) => Promise<T>,
): Promise<T[]> {
  const found = new Map((await bulk).flat().map((entry) => [entry.id, entry]));
  const missing = [...new Set(ids)].filter((id) => !found.has(id));
  for (const entry of await mapPool(missing, getOne)) {
    found.set(entry.id, entry);
  }
  return [...found.values()];
}

async function mapPool<T, R>(inputs: T[], fn: (input: T) => Promise<R>): Promise<R[]> {
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
