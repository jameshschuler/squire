import type { WalkScapeClient } from "@jameshschuler/walkscape-data-client";
import type { GameData } from "./recipe-book/index.js";

export async function loadGameData(client: WalkScapeClient): Promise<GameData> {
  const [{ version }, recipes, items, skills, services, locations, factions, activities, lootTables, shops] =
    await Promise.all([
      client.version(),
      client.recipes.loadAll(),
      client.items.loadAll(),
      client.skills.loadAll(),
      client.services.loadAll(),
      client.locations.loadAll(),
      client.factions.loadAll(),
      client.activities.loadAll(),
      client.lootTables.loadAll(),
      client.shops.loadAll(),
    ]);
  if (!version) {
    throw new Error("The API's /version/ response has no version");
  }
  return { version, recipes, items, skills, services, locations, factions, activities, lootTables, shops };
}
