import { formatRegion } from "./format";

export function sortByRegion<T extends { name: string; region: string }>(locations: T[]): T[] {
  return [...locations].sort(
    (a, b) => formatRegion(a.region).localeCompare(formatRegion(b.region)) || a.name.localeCompare(b.name),
  );
}
