import { describe, expect, it } from "vitest";
import type { ItemDetail } from "@walkscape-community/data-api-client";
import { GEAR_DATA_SCHEMA, buildGearData, gearDataIcons } from "../src/index.js";
import type { GameData } from "../src/game-data.js";
import gearItems from "../../../fixtures/api/gear.json";
import lootItems from "../../../fixtures/api/loot.json";
import foodItems from "../../../fixtures/api/foods.json";
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
  const hatchet = gear.items.find((item) => item.id === "steel_hatchet")!;

  it("lists every item that can be worn or held, and nothing else", () => {
    const expected = data.items.filter((item) => "gearType" in item && item.gearType).map((item) => item.id);

    expect(gear.items.map((item) => item.id).sort()).toEqual(expected.sort());
    expect(gear.items.map((item) => item.id)).not.toContain("gold_ore");
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
    expect(hatchet.tierStats.ethereal?.find((stat) => stat.stat === "doubleAction")?.value).toBe(0.07);
  });

  it("gives gear its game id, or none when the game doesn't know the item", () => {
    const withIds = structuredClone(data);

    withIds.gameIds = { steel_hatchet: "a1b2c3d4-0000-4000-8000-000000000002", adjustable_wrench: "adjustable_wrench" };
    const gear = buildGearData(withIds).items;

    expect(gear.find((gearItem) => gearItem.id === "steel_hatchet")?.gameId).toBe(
      "a1b2c3d4-0000-4000-8000-000000000002",
    );
    expect(gear.find((gearItem) => gearItem.id === "adjustable_wrench")?.gameId).toBeNull();
    expect(gear.find((gearItem) => gearItem.id === "birch_skis")?.gameId).toBeNull();
  });

  it("gives untiered gear no tier stats", () => {
    expect(gear.items.find((item) => item.id === "adjustable_wrench")?.tierStats).toEqual({});
  });

  it("skips effects with no stat", () => {
    const withBlank = structuredClone(data);
    const item = withBlank.items.find((entry) => entry.id === "steel_hatchet")!;

    item.itemAttrs = [{ ...item.itemAttrs![0]!, stats: [] }];
    expect(buildGearData(withBlank).items.find((entry) => entry.id === "steel_hatchet")?.stats).toEqual([]);
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
    expect(mummy!.levels.map((level) => level.level)).toEqual([1, 4]);
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
    expect(buildGearData(data).skills.map((skill) => skill.id)).toEqual(["cooking", "smithing"]);
  });

  it("lists each location with its regions and keywords, A–Z", () => {
    expect(sampleGear.locations.map((location) => location.id)).toEqual([
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
  it("lists every gear, pet and food icon once, skipping blanks", () => {
    const data = structuredClone(sample) as unknown as GameData;

    data.items.push(
      ...(gearItems as unknown as ItemDetail[]),
      ...(lootItems as unknown as ItemDetail[]),
      ...(foodItems as unknown as ItemDetail[]),
    );
    data.items.find((item) => item.id === "birch_skis")!.icon = "";
    const gear = buildGearData(data);
    const icons = gearDataIcons(gear);

    expect(icons).toContain("assets/icons/pets/mummy/adult_basic_mummy_static.png");
    expect(icons).toContain(gear.items.find((item) => item.id === "steel_hatchet")!.icon);
    expect(icons).toContain(gear.foods.find((food) => food.id === "salmon_pie")!.icon);
    expect(icons).not.toContain("");
    expect(icons).toHaveLength(new Set(icons).size);
  });
});

describe("foods", () => {
  const data = structuredClone(sample) as unknown as GameData;

  data.items.push(...(foodItems as unknown as ItemDetail[]), ...(gearItems as unknown as ItemDetail[]));
  const { foods } = buildGearData(data);
  const salmonPie = foods.find((food) => food.id === "salmon_pie")!;

  it("lists every food with a buff, and no gear", () => {
    expect(foods.map((food) => food.id)).toEqual(
      expect.arrayContaining(["salmon_pie", "bagel", "beer", "bread", "bug_bait", "beef_stew"]),
    );
    expect(foods.map((food) => food.id)).not.toContain("steel_hatchet");
  });

  it("keeps the normal and fine buffs with their conditions", () => {
    const woodcutting = [{ type: "mainSkill", opposite: false, requirement: { skill: "woodcutting" } }];

    expect(salmonPie).toMatchObject({
      name: "Salmon pie",
      stats: [{ stat: "workEfficiency", value: 0.07, isPercent: true, conditions: woodcutting }],
      fineStats: [{ stat: "workEfficiency", value: 0.14, isPercent: true, conditions: woodcutting }],
    });
  });

  it("keeps every effect of a food with more than one", () => {
    expect(foods.find((food) => food.id === "beer")?.fineStats?.map((stat) => [stat.stat, stat.value])).toEqual([
      ["bonusExperience", -0.04],
      ["doubleRewards", 0.04],
    ]);
  });

  it("uses the normal effects for a fine food that lists none of its own", () => {
    const plain = structuredClone(data);

    plain.items.find((item) => item.id === "salmon_pie")!.buffs![0]!.data[0]!.buffs[0]!.fineAttributes = [];
    expect(buildGearData(plain).foods.find((food) => food.id === "salmon_pie")?.fineStats).toEqual(salmonPie.stats);
  });

  it("leaves out consumables that aren't food", () => {
    const withPotion = structuredClone(data);

    withPotion.items.find((item) => item.id === "salmon_pie")!.consumableType = "immediate";
    expect(buildGearData(withPotion).foods.map((food) => food.id)).not.toContain("salmon_pie");
  });

  it("gives a food that can't be fine no fine buff", () => {
    const plain = structuredClone(data);

    plain.items.find((item) => item.id === "salmon_pie")!.canBeFine = false;
    expect(buildGearData(plain).foods.find((food) => food.id === "salmon_pie")?.fineStats).toBeNull();
  });
});
