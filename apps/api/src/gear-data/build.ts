import type { KeywordDetail } from "@walkscape-community/data-api-client";
import type { GameData } from "../recipe-book/game-data.js";
import { itemSummaries, locationSummary, regionNames } from "../recipe-book/summaries.js";
import { gearItems } from "./items.js";
import { petViews } from "./pets.js";
import { GEAR_DATA_SCHEMA, type GearData } from "./types.js";

const byName = (left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name);

export function buildGearData(data: GameData): GearData {
  const regions = regionNames(data.factions);

  return {
    schema: GEAR_DATA_SCHEMA,
    version: data.version,
    items: gearItems(data.items, data.gameIds, itemSummaries(new Map(data.items.map((item) => [item.id, item])))),
    pets: petViews(data.pets),
    bannedKeywords: bannedKeywords(data.keywords),
    skills: data.skills.map(({ id, name, type }) => ({ id, name, type })).sort(byName),
    locations: data.locations
      .map((location) => ({
        ...locationSummary(location, regions),
        realms: [location.faction, ...(location.subFactions ?? [])],
        keywords: location.keywords ?? [],
      }))
      .sort(byName),
  };
}

function bannedKeywords(keywords: KeywordDetail[]): Record<string, string[]> {
  return Object.fromEntries(
    keywords
      .filter((keyword) => keyword.bannedKeywords.length > 0)
      .map((keyword) => [keyword.id, keyword.bannedKeywords]),
  );
}
