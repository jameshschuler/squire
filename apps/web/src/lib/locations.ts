import { formatRegion } from "./format";

export function sortByRegion<T extends { name: string; region: string }>(locations: T[]): T[] {
  return [...locations].sort(
    (left, right) =>
      formatRegion(left.region).localeCompare(formatRegion(right.region)) || left.name.localeCompare(right.name),
  );
}
