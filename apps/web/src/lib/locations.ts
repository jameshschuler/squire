import type { RecipeLocation } from "@jameshschuler/walkscape-sdk";

export interface RegionLocations {
  region: string;
  locations: RecipeLocation[];
}

export function groupByRegion(locations: RecipeLocation[]): RegionLocations[] {
  const groups = new Map<string, RecipeLocation[]>();
  for (const location of locations) {
    groups.set(location.region, [...(groups.get(location.region) ?? []), location]);
  }
  return [...groups]
    .map(([region, regionLocations]) => ({ region, locations: regionLocations }))
    .sort((a, b) => a.region.localeCompare(b.region));
}
