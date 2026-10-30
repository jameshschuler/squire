import { describe, expect, it } from "vitest";
import { BEST_IN_GAME, type GearData, type GearItem, type GearStat } from "@squire/api/gear-data";
import { locationChoices } from "@/lib/gear-locations";
import type { GearTarget } from "@/lib/gear-targets";

const inSyrenthia: GearStat["conditions"][number] = {
  type: "realm",
  opposite: false,
  requirement: { realm: "syrenthia" },
};
const gearItem = (id: string, slot: GearItem["slot"], stats: GearStat[]): GearItem => ({
  id,
  name: id,
  icon: "",
  quality: null,
  isCollectible: false,
  keywords: [],
  gameId: null,
  slot,
  requirements: [],
  stats,
  tierStats: {},
});
const bonus = (stat: GearStat["stat"], value: number, isPercent = true): GearStat => ({
  stat,
  value,
  isPercent,
  conditions: [inSyrenthia],
});
const gear = (items: GearItem[]): GearData => ({
  schema: 1,
  version: "test",
  items,
  pets: [],
  bannedKeywords: {},
  skills: [{ id: "tailoring", name: "Tailoring", type: "artisan" }],
  locations: [
    { id: "vastalume", name: "Vastalume", region: "Syrenthia", realms: ["syrenthia"], keywords: [] },
    { id: "frusenholm", name: "Frusenholm", region: "Jarvonia", realms: ["jarvonia"], keywords: ["snowy"] },
  ],
});
const target = {
  skill: { id: "tailoring", name: "Tailoring", level: 1 },
  workRequired: 100,
  maxWorkEfficiency: 2,
  locations: [
    { id: "vastalume", name: "Vastalume", region: "Syrenthia" },
    { id: "frusenholm", name: "Frusenholm", region: "Jarvonia" },
  ],
} as unknown as GearTarget;

describe("locationChoices", () => {
  it("offers the best location first, then each location with the gear bonuses it unlocks", () => {
    const items = [
      gearItem("corslet", "chest", [bonus("doubleAction", 0.07)]),
      gearItem("bauble", "tool", [bonus("workEfficiency", 0.05)]),
    ];
    expect(locationChoices(gear(items), BEST_IN_GAME, target)).toEqual([
      { value: "best", label: "Best location" },
      { value: "vastalume", label: "Vastalume", detail: "+7% Double action · +5% Work efficiency" },
      { value: "frusenholm", label: "Frusenholm" },
    ]);
  });

  it("shows at most two bonuses", () => {
    const items = [
      gearItem("a", "chest", [bonus("doubleAction", 0.07)]),
      gearItem("b", "tool", [bonus("workEfficiency", 0.05)]),
      gearItem("c", "head", [bonus("chestFind", 0.03)]),
    ];
    expect(locationChoices(gear(items), BEST_IN_GAME, target)[1]?.detail).toBe(
      "+7% Double action · +5% Work efficiency",
    );
  });
});
