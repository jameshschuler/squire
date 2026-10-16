import type { WalkScapeClient } from "@jameshschuler/walkscape-sdk";
import type { GameData } from "./recipe-book/index.js";

export async function loadGameData(client: WalkScapeClient): Promise<GameData> {
  const { version } = await client.version();
  if (!version) {
    throw new Error("The API's /version/ response has no version");
  }
  const [recipes, items, skills, services, locations, factions, activities, lootTables, shops] = await Promise.all([
    client.loadAll("recipes"),
    client.loadAll("items"),
    client.loadAll("skills"),
    client.loadAll("services"),
    client.loadAll("locations"),
    client.loadAll("factions"),
    client.loadAll("activities"),
    client.loadAll("loot_tables"),
    client.loadAll("shops"),
  ]);
  return { version, recipes, items, skills, services, locations, factions, activities, lootTables, shops };
}
