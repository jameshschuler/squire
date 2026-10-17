import { describe, expect, it } from "vitest";
import { sortByRegion } from "@/lib/locations";

const location = (name: string, region: string) => ({ name, region });

describe("sortByRegion", () => {
  it("sorts by the region name shown, then by location name", () => {
    const sorted = sortByRegion([
      location("Wraithwater", "Empire of Wallisia"),
      location("Centaham", "Jarvonia"),
      location("Salsfirth", "Grand Duchy of Trellin-Erdwise"),
      location("Azurazera", "Jarvonia"),
      location("Blackspell Harbour", "Grand Duchy of Trellin-Erdwise"),
      location("Vastalume", "Syrenthia"),
    ]);
    expect(sorted.map((l) => l.name)).toEqual([
      "Blackspell Harbour",
      "Salsfirth",
      "Azurazera",
      "Centaham",
      "Vastalume",
      "Wraithwater",
    ]);
  });

  it("leaves the list it was given unchanged", () => {
    const locations = [location("B", "Jarvonia"), location("A", "Jarvonia")];
    sortByRegion(locations);
    expect(locations.map((l) => l.name)).toEqual(["B", "A"]);
  });

  it("returns an empty list for no locations", () => {
    expect(sortByRegion([])).toEqual([]);
  });
});
