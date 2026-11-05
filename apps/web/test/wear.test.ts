import { describe, expect, it } from "vitest";
import type { ActivitySource, ItemSource } from "@squire/api/recipe-book";
import { wearSources } from "@/lib/wear";

const activity = (id: string, wear: number | null): ActivitySource => ({
  kind: "activity",
  id,
  name: id,
  icon: "",
  skills: [],
  lootType: "collectible",
  locations: [],
  wear,
});

const shop: ItemSource = { kind: "shop", id: "tool_stall", name: "Tool stall", icon: "", locations: [] };

describe("wearSources", () => {
  it("keeps activities with a W.E.A.R., fastest first", () => {
    const sources = [activity("slow", 90_000), shop, activity("treasure_hunt", null), activity("fast", 40_000)];

    expect(wearSources(sources).map((source) => [source.id, source.wear])).toEqual([
      ["fast", 40_000],
      ["slow", 90_000],
    ]);
  });

  it("is empty when nothing has one", () => {
    expect(wearSources([shop, activity("treasure_hunt", null)])).toEqual([]);
  });
});
