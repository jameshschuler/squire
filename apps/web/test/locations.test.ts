import { describe, expect, it } from "vitest";
import type { RecipeLocation } from "@jameshschuler/walkscape-sdk";
import { groupByRegion } from "@/lib/locations";

const location = (name: string, region: string): RecipeLocation => ({ id: name, name, region, tier: "basic" });

describe("groupByRegion", () => {
  it("groups locations by region, regions A–Z, keeping location order", () => {
    const groups = groupByRegion([
      location("Kallaheim", "Jarvonia"),
      location("Bilgemont Port", "Grand Duchy of Trellin-Erdwise"),
      location("Vastalume", "Jarvonia"),
    ]);
    expect(groups.map((g) => [g.region, g.locations.map((l) => l.name)])).toEqual([
      ["Grand Duchy of Trellin-Erdwise", ["Bilgemont Port"]],
      ["Jarvonia", ["Kallaheim", "Vastalume"]],
    ]);
  });

  it("returns no groups for no locations", () => {
    expect(groupByRegion([])).toEqual([]);
  });
});
