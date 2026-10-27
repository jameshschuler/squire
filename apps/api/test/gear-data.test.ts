import { describe, expect, it } from "vitest";
import type { ItemDetail } from "@walkscape-community/data-api-client";
import { GEAR_DATA_SCHEMA, buildGearData, gearDataIcons } from "../src/gear-data/index.js";
import type { GameData } from "../src/recipe-book/index.js";
import gearItems from "../../../fixtures/api/gear.json";
import lootItems from "../../../fixtures/api/loot.json";
import sample from "../../../fixtures/api/gamedata-sample.json";

const sampleGear = buildGearData(sample as unknown as GameData);

describe("buildGearData", () => {
  it("stamps the gear data with its schema and the game data version", () => {
    expect(sampleGear).toMatchObject({ schema: GEAR_DATA_SCHEMA, version: "1d076b56" });
  });
});

describe("gear items", () => {
  const data = structuredClone(sample) as unknown as GameData;
  data.items.push(...(gearItems as unknown as ItemDetail[]), ...(lootItems as unknown as ItemDetail[]));
  const gear = buildGearData(data);
  const hatchet = gear.items.find((g) => g.id === "steel_hatchet")!;

  it("lists every item that can be worn or held, and nothing else", () => {
    const expected = data.items.filter((i) => "gearType" in i && i.gearType).map((i) => i.id);
    expect(gear.items.map((g) => g.id).sort()).toEqual(expected.sort());
    expect(gear.items.map((g) => g.id)).not.toContain("gold_ore");
  });

  it("gives each its slot, keywords and equip requirements", () => {
    expect(hatchet).toMatchObject({
      name: "Steel hatchet",
      slot: "tool",
      keywords: ["tool", "woodcutting_tool", "hatchet", "woodcutting"],
      requirements: [{ type: "skillLevel", opposite: false, requirement: { level: 30, skill: "woodcutting" } }],
    });
  });

  it("keeps each effect as a number with its conditions", () => {
    expect(hatchet.stats).toEqual([
      {
        stat: "workEfficiency",
        value: 0.09,
        isPercent: true,
        conditions: [{ type: "mainSkill", opposite: false, requirement: { skill: "woodcutting" } }],
      },
    ]);
  });

  it("keeps what each quality tier adds on top", () => {
    expect(Object.keys(hatchet.tierStats).sort()).toEqual(["epic", "ethereal", "legendary", "rare", "uncommon"]);
    expect(hatchet.tierStats.ethereal?.find((s) => s.stat === "doubleAction")?.value).toBe(0.07);
  });

  it("gives gear its game id, or none when the game doesn't know the item", () => {
    const withIds = structuredClone(data);
    withIds.gameIds = { steel_hatchet: "a1b2c3d4-0000-4000-8000-000000000002", adjustable_wrench: "adjustable_wrench" };
    const gear = buildGearData(withIds).items;
    expect(gear.find((g) => g.id === "steel_hatchet")?.gameId).toBe("a1b2c3d4-0000-4000-8000-000000000002");
    expect(gear.find((g) => g.id === "adjustable_wrench")?.gameId).toBeNull();
    expect(gear.find((g) => g.id === "birch_skis")?.gameId).toBeNull();
  });

  it("gives untiered gear no tier stats", () => {
    expect(gear.items.find((g) => g.id === "adjustable_wrench")?.tierStats).toEqual({});
  });

  it("skips effects with no stat", () => {
    const withBlank = structuredClone(data);
    const item = withBlank.items.find((i) => i.id === "steel_hatchet")!;
    item.itemAttrs = [{ ...item.itemAttrs![0]!, stats: [] }];
    expect(buildGearData(withBlank).items.find((g) => g.id === "steel_hatchet")?.stats).toEqual([]);
  });
});

describe("pets", () => {
  const [mummy] = sampleGear.pets;

  it("lists each pet with its rare variant's id and an adult sprite", () => {
    expect(mummy).toMatchObject({
      id: "mummy",
      name: "Mummy",
      rareId: "silky_mummy",
      icon: "assets/icons/pets/mummy/adult_basic_mummy_static.png",
    });
  });

  it("keeps each level's full set of effects as numbers", () => {
    expect(mummy!.levels.map((l) => l.level)).toEqual([1, 4]);
    expect(mummy!.levels[1]!.stats).toContainEqual({
      stat: "stepsRequired",
      value: -3,
      isPercent: false,
      conditions: [{ type: "mainSkill", opposite: false, requirement: { skill: "tailoring" } }],
    });
  });
});

describe("bannedKeywords", () => {
  it("lists the keywords each tool type can't be worn with", () => {
    expect(sampleGear.bannedKeywords).toEqual({
      hatchet: ["hatchet"],
      fishing_rod: ["fishing_net", "fishing_rod", "fishing_spear", "fishing_cage"],
    });
  });
});

describe("skills and locations", () => {
  it("lists each skill with its type", () => {
    expect(sampleGear.skills).toEqual([
      { id: "cooking", name: "Cooking", type: "artisan" },
      { id: "smithing", name: "Smithing", type: "artisan" },
    ]);
  });

  it("sorts skills A–Z whatever order the game lists them in", () => {
    const data = structuredClone(sample) as unknown as GameData;
    data.skills.reverse();
    expect(buildGearData(data).skills.map((s) => s.id)).toEqual(["cooking", "smithing"]);
  });

  it("lists each location with its regions and keywords, A–Z", () => {
    expect(sampleGear.locations.map((l) => l.id)).toEqual([
      "azurazera",
      "bilgemont_port",
      "blackspell_harbour",
      "crown_of_cinders",
    ]);
    expect(sampleGear.locations[0]).toEqual({
      id: "azurazera",
      name: "Azurazera",
      region: "Jarvonia",
      realms: ["jarvonia"],
      keywords: ["snowy"],
    });
  });

  it("puts a location's sub-regions after its region", () => {
    const data = structuredClone(sample) as unknown as GameData;
    data.locations[0]!.subFactions = ["herberts_guiding_grounds"];
    expect(buildGearData(data).locations[0]?.realms).toEqual(["jarvonia", "herberts_guiding_grounds"]);
  });

  it("gives a location without keywords an empty list", () => {
    const data = structuredClone(sample) as unknown as GameData;
    delete (data.locations[0] as { keywords?: string[] }).keywords;
    expect(buildGearData(data).locations[0]?.keywords).toEqual([]);
  });
});

describe("gearDataIcons", () => {
  it("lists every gear and pet icon once, skipping blanks", () => {
    const data = structuredClone(sample) as unknown as GameData;
    data.items.push(...(gearItems as unknown as ItemDetail[]), ...(lootItems as unknown as ItemDetail[]));
    data.items.find((i) => i.id === "birch_skis")!.icon = "";
    const gear = buildGearData(data);
    const icons = gearDataIcons(gear);
    expect(icons).toContain("assets/icons/pets/mummy/adult_basic_mummy_static.png");
    expect(icons).toContain(gear.items.find((g) => g.id === "steel_hatchet")!.icon);
    expect(icons).not.toContain("");
    expect(icons).toHaveLength(new Set(icons).size);
  });
});
