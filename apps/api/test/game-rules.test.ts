import type {
  LootTableDetail,
  Requirement,
  ServiceRequirement,
  ServiceTier,
} from "@walkscape-community/data-api-client";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  SERVICE_TIERS,
  getLootTableItemIds,
  getServiceKeywords,
  isServiceRequirement,
  isSkillLevelRequirement,
  itemsPerAction,
  itemsPerRoll,
  meetsServiceTier,
  rangeOf,
  scalingLevels,
  stepsEach,
} from "../src/recipe-book/game-rules.js";
const service = (requirement: ServiceRequirement["requirement"]): ServiceRequirement => ({
  type: "service",
  name: null,
  opposite: false,
  requirement,
});

describe("requirement guards", () => {
  const skill: Requirement = {
    type: "skillLevel",
    name: null,
    opposite: false,
    requirement: { skill: "smithing", level: 5 },
  };
  const kitchen: Requirement = service({ serviceKeyword: "kitchen", tier: "basic" });

  it("tells skill level and service requirements apart", () => {
    expect([skill, kitchen].map(isSkillLevelRequirement)).toEqual([true, false]);
    expect([skill, kitchen].map(isServiceRequirement)).toEqual([false, true]);
  });
});

describe("getServiceKeywords", () => {
  it.each([
    [{ keywords: ["workshop", "cursed"], serviceKeyword: "workshop", tier: "basic" as const }, ["workshop", "cursed"]],
    [{ serviceKeyword: "kitchen", tier: "basic" as const }, ["kitchen"]],
    [{ keywords: [], serviceKeyword: null, tier: "basic" as const }, []],
  ])("reads %j", (requirement, expected) => {
    expect(getServiceKeywords(service(requirement))).toEqual(expected);
  });
});

describe("meetsServiceTier", () => {
  it("knows every service tier the API has", () => {
    expectTypeOf<(typeof SERVICE_TIERS)[number]>().toEqualTypeOf<ServiceTier>();
  });

  it("accepts the same or a higher tier", () => {
    expect(meetsServiceTier("basic", "basic")).toBe(true);
    expect(meetsServiceTier("advanced", "basic")).toBe(true);
    expect(meetsServiceTier("basic", "advanced")).toBe(false);
    expect(meetsServiceTier("expert", "basic")).toBe(true);
  });

  it("lets any service meet a required tier it doesn't know, so the recipe still lists places to make it", () => {
    expect(meetsServiceTier("basic", "master")).toBe(true);
  });
});

describe("getLootTableItemIds", () => {
  it("lists items from rows and sub-tables, skipping rows without an item", () => {
    const table = {
      id: "t",
      tableRows: [{ rowItemID: "a" }, { rowItemID: null }],
      subTables: [{ tableRows: [{ rowItemID: "b" }] }],
    } as unknown as LootTableDetail;

    expect(getLootTableItemIds(table)).toEqual(["a", "b"]);
  });
});

const row = (rowItemID: string | null, rowWeight: number, rowMinimumAmount = 1, rowMaximumAmount = 1) => ({
  rowItemID,
  rowWeight,
  rowMinimumAmount,
  rowMaximumAmount,
});

const lootTable = (id: string, noDropChance: number, rows: ReturnType<typeof row>[]) =>
  ({ id, noDropChance, tableRows: rows, subTables: [] }) as unknown as LootTableDetail;

const tinkering = lootTable("tinkering", 0.75, [
  row(null, 10, 3, 6),
  row("wire_saw", 0.08),
  row("metal_scrap", 5, 2, 20),
  row("wood_scrap", 5, 2, 20),
]);
const willowTear = lootTable("willow_tear", 0.9997, [row("weeping_willow_tear", 10)]);

describe("itemsPerRoll", () => {
  it.each([
    ["a single-row collectible table", willowTear, "weeping_willow_tear", 0.0003],
    ["a rare row among others", tinkering, "wire_saw", (0.25 * 0.08) / 20.08],
    ["the average of a row's amounts", tinkering, "metal_scrap", (0.25 * 5 * 11) / 20.08],
    ["an item the table doesn't drop", tinkering, "gold_ore", 0],
    ["an empty table", lootTable("empty", 0, []), "gold_ore", 0],
  ])("handles %s", (_, table, itemId, expected) => {
    expect(itemsPerRoll(table, itemId)).toBeCloseTo(expected, 10);
  });
});

describe("itemsPerAction", () => {
  const tables = new Map([willowTear, tinkering].map((table) => [table.id, table]));
  const ref = (rollAmount: number, ids: string[]) => ({
    isPrimary: false,
    type: ["collectible"],
    rollAmount,
    tables: ids,
  });

  it.each([
    ["one roll", [ref(1, ["willow_tear"])], 0.0003],
    ["each roll", [ref(2, ["willow_tear"])], 0.0006],
    ["every table and reference", [ref(1, ["willow_tear", "willow_tear"]), ref(1, ["willow_tear"])], 0.0009],
    ["no rolls", [ref(0, ["willow_tear"])], 0],
    ["a missing table", [ref(1, ["gone"])], 0],
  ])("counts %s", (_, refs, expected) => {
    expect(itemsPerAction(refs, tables, "weeping_willow_tear")).toBeCloseTo(expected, 10);
  });
});

describe("stepsEach", () => {
  it("matches the wiki's Wire saw: 44,000 steps from Tinkering at max work efficiency", () => {
    expect(stepsEach(92, 2.1, itemsPerRoll(tinkering, "wire_saw"))).toBe(44_176);
  });

  it("matches the wiki's Raw trout: 116 steps from Lake fishing once it's at its full rate", () => {
    const lake = lootTable("lake", 0, [row("raw_carp", 12), row("raw_pike", 10), row("raw_trout", 15)]);

    expect(stepsEach(75, 1.6, itemsPerRoll(lake, "raw_trout"))).toBe(116);
  });

  it("rounds steps per action up, as the game does", () => {
    expect(stepsEach(100, 1.5, 0.001)).toBe(67_000);
  });

  it.each([
    ["no work required", null, 2, 0.01],
    ["no max work efficiency", 100, null, 0.01],
    ["nothing dropped per action", 100, 2, 0],
  ])("is null with %s", (_, work, efficiency, perAction) => {
    expect(stepsEach(work, efficiency, perAction)).toBeNull();
  });
});

const fishing = (levelRequirement: number, levelMinScaling: number, levelMaxScaling: number) => ({
  relatedSkill: "fishing",
  levelRequirement,
  levelMinScaling,
  levelMaxScaling,
  scalingWeight: 1,
  xpBonus: 0,
});

const scaledRow = (rowItemID: string, rowWeight: number, bonus: ReturnType<typeof fishing>) => ({
  ...row(rowItemID, rowWeight),
  minWeightScale: 0.05,
  requirementsBonuses: [bonus],
});

const lakeFishing = {
  id: "lake_fishing",
  noDropChance: 0,
  tableRows: [
    scaledRow("raw_carp", 12, fishing(5, 5, 15)),
    scaledRow("raw_pike", 10, fishing(10, 10, 20)),
    scaledRow("raw_trout", 15, fishing(20, 20, 30)),
  ],
  subTables: [],
} as unknown as LootTableDetail;

describe("itemsPerRoll at a skill level", () => {
  it.each([
    ["is zero before the drop unlocks", "raw_trout", 19, 0],
    ["starts at one step of its ramp when it unlocks", "raw_trout", 20, 15 / 11 / (22 + 15 / 11)],
    ["ramps up a step each level", "raw_trout", 25, 90 / 11 / (22 + 90 / 11)],
    ["reaches its full weight at the end of the ramp", "raw_trout", 30, 15 / 37],
    ["stays full past the ramp", "raw_trout", 99, 15 / 37],
    ["is every drop while nothing else has unlocked", "raw_carp", 5, 1],
    ["uses full weights without a level", "raw_trout", null, 15 / 37],
  ])("%s", (_, itemId, level, expected) => {
    expect(itemsPerRoll(lakeFishing, itemId, level)).toBeCloseTo(expected, 10);
  });
});

describe("itemsPerRoll matches the wiki's Lake fishing chance graph", () => {
  it.each([
    ["Raw pike", "raw_pike", 11, 0.192],
    ["Raw pike", "raw_pike", 19, 0.431],
    ["Raw trout", "raw_trout", 20, 0.058],
    ["Raw trout", "raw_trout", 23, 0.199],
    ["Raw carp", "raw_carp", 27, 0.365],
  ])("%s at level %i", (_, itemId, level, chance) => {
    expect(itemsPerRoll(lakeFishing, itemId, level)).toBeCloseTo(chance, 3);
  });
});

describe("itemsPerRoll matches the wiki's Sea fishing (Net) chance graph", () => {
  const seaFishingNet = {
    id: "sea_fishing_net",
    noDropChance: 0.25,
    tableRows: [
      row("raw_shrimp", 10),
      scaledRow("raw_jellyfish", 15, fishing(30, 30, 60)),
      scaledRow("pink_pearl_trinket", 0.03, fishing(30, 30, 30)),
    ],
    subTables: [],
  } as unknown as LootTableDetail;

  it.each([
    ["Raw jellyfish starts at its minimum weight, not one step of its long ramp", "raw_jellyfish", 30, 0.052],
    ["Raw shrimp when jellyfish unlocks", "raw_shrimp", 30, 0.696],
    ["Raw jellyfish once its ramp passes the minimum", "raw_jellyfish", 31, 0.066],
    ["Raw jellyfish at its full rate", "raw_jellyfish", 60, 0.44946],
  ])("%s", (_, itemId, level, chance) => {
    expect(itemsPerRoll(seaFishingNet, itemId, level)).toBeCloseTo(chance, 3);
  });
});

describe("scalingLevels", () => {
  const tables = new Map([lakeFishing, tinkering].map((table) => [table.id, table]));
  const ref = (id: string) => ({ isPrimary: true, type: [], rollAmount: 1, tables: [id] });
  const needs = (level: number) => [
    { type: "skillLevel" as const, name: null, opposite: false, requirement: { skill: "fishing", level } },
  ];

  it("runs from the activity's level to the end of the last ramp", () => {
    expect(scalingLevels(needs(5), [ref("lake_fishing")], tables)).toEqual(
      Array.from({ length: 26 }, (_, offset) => 5 + offset),
    );
  });

  it("is empty when no drop rate changes with level", () => {
    expect(scalingLevels(needs(25), [ref("tinkering")], tables)).toEqual([]);
  });
});

describe("rangeOf", () => {
  it.each([
    ["the lowest and highest values", [116, null, 805, 300], { min: 116, max: 805 }],
    ["null when every value is the same", [116, 116], null],
    ["null without values", [null, null], null],
  ])("gives %s", (_, values, expected) => {
    expect(rangeOf(values)).toEqual(expected);
  });
});
