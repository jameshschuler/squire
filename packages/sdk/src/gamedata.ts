import type { WalkScapeClient } from "./client.js";
import type { Activity, CompactEntity, Faction, Item, Location, LootTable, Recipe, Service, Skill } from "./types.js";

/** A snapshot of the game data needed to work with recipes, tagged with the data version it came from. */
export interface GameData {
  version: string;
  recipes: Recipe[];
  items: Item[];
  skills: Skill[];
  services: Service[];
  locations: Location[];
  factions: Faction[];
  activities: Activity[];
  lootTables: LootTable[];
}

const CONCURRENCY = 4;
const LOOT_TABLE_CATEGORIES = ["normal", "chest", "collectible", "petEgg"];

/**
 * Loads every recipe, item, skill, crafting service, location, faction, activity and loot table in
 * about 50 requests (a few seconds). The API allows 120 requests a minute per IP, so load this once and reload only when
 * `client.version()` changes.
 */
export async function loadGameData(client: WalkScapeClient): Promise<GameData> {
  const [{ version }, skills, items, services, compactRecipes, compactLocations, factions, compactActivities] =
    await Promise.all([
      client.version(),
      client.list<Skill>("skills"),
      client.list<Item>("items"),
      client.search<Service>("services", { serviceType: "crafting" }, { detailed: true }),
      client.list<CompactEntity>("recipes"),
      client.list<CompactEntity>("locations"),
      client.list<Faction>("factions"),
      client.list<CompactEntity>("activities"),
    ]);

  const recipes = await loadComplete(
    compactRecipes.map((r) => r.id),
    mapPool(skills, (skill) => client.search<Recipe>("recipes", { relatedSkills: skill.id }, { detailed: true })),
    (id) => client.get<Recipe>("recipes", id),
  );
  const activities = await loadComplete(
    compactActivities.map((a) => a.id),
    mapPool(skills, (skill) =>
      client.search<Activity>("activities", { relatedSkillsList: skill.id }, { detailed: true }),
    ),
    (id) => client.get<Activity>("activities", id),
  );
  const lootTables = await loadComplete(
    activities.flatMap((a) => (a.tables ?? []).flatMap((ref) => ref.tables)),
    mapPool(LOOT_TABLE_CATEGORIES, (category) =>
      client.search<LootTable>("loot_tables", { category }, { detailed: true }),
    ),
    (id) => client.get<LootTable>("loot_tables", id),
  );
  const locations = await loadComplete(
    compactLocations.map((l) => l.id),
    mapPool(factions, (faction) => client.search<Location>("locations", { faction: faction.id }, { detailed: true })),
    (id) => client.get<Location>("locations", id),
  );

  return { version, recipes, items, skills, services, locations, factions, activities, lootTables };
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
