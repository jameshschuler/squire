import type { WalkScapeClient } from "@walkscape-community/data-api-client";
import { isGear } from "./gear-data/items.js";
import type { GameData } from "./recipe-book/index.js";

export async function loadGameData(client: WalkScapeClient): Promise<GameData> {
  const [
    { version },
    recipes,
    { items, gameIds },
    skills,
    services,
    locations,
    factions,
    activities,
    lootTables,
    shops,
    achievements,
    rewards,
    pets,
    keywords,
  ] = await Promise.all([
    client.version(),
    client.recipes.loadAll(),
    loadItems(client),
    client.skills.loadAll(),
    client.services.search({ serviceType: "crafting" }, { detailed: true }),
    client.locations.loadAll(),
    client.factions.loadAll(),
    client.activities.loadAll(),
    client.lootTables.loadAll(),
    client.shops.loadAll(),
    client.achievements.loadAll(),
    client.rewards.loadAll(),
    client.pets.loadAll(),
    client.keywords.loadAll(),
  ]);
  if (!version) {
    throw new Error("The API's /version/ response has no version");
  }
  return {
    version,
    recipes,
    items,
    skills,
    services,
    locations,
    factions,
    activities,
    lootTables,
    shops,
    achievements,
    rewards,
    pets,
    keywords,
    gameIds,
  };
}

async function loadItems(client: WalkScapeClient) {
  const items = await client.items.loadAll();
  const gearIds = items.filter(isGear).map((item) => item.id);
  const gameIds = gearIds.length > 0 ? await loadGameIds(client, gearIds) : {};
  return { items, gameIds };
}

function loadGameIds(client: WalkScapeClient, ids: string[]): Promise<Record<string, string>> {
  return client.items.ids(ids, "game").catch(() => ({}));
}
