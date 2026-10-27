import type { FactionDetail, ItemDetail, LocationDetail } from "@walkscape-community/data-api-client";
import { humanize } from "./text.js";
import type { ItemSummary, LocationSummary } from "./types.js";

export function itemSummaries(items: Map<string, ItemDetail>): (id: string) => ItemSummary {
  return (id) => {
    const found = items.get(id);
    return {
      id,
      name: found?.name ?? humanize(id),
      icon: found?.icon ?? "",
      quality: found?.quality ?? null,
      isCollectible: found?.type === "collectible",
      keywords: [...new Set(found?.keywords ?? [])],
    };
  };
}

export function regionNames(factions: FactionDetail[]): Map<string, string> {
  return new Map(factions.map((f) => [f.id, f.name]));
}

export function locationSummary(location: LocationDetail, regions: Map<string, string>): LocationSummary {
  return { id: location.id, name: location.name, region: regions.get(location.faction) ?? humanize(location.faction) };
}
