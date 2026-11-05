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
  wearOf,
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

describe("wearOf", () => {
  it("matches the wiki's Wire saw: 44,000 steps from Tinkering at max work efficiency", () => {
    expect(wearOf(92, 2.1, itemsPerRoll(tinkering, "wire_saw"))).toBe(44_176);
  });

  it("rounds steps per action up, as the game does", () => {
    expect(wearOf(100, 1.5, 0.001)).toBe(67_000);
  });

  it.each([
    ["no work required", null, 2, 0.01],
    ["no max work efficiency", 100, null, 0.01],
    ["nothing dropped per action", 100, 2, 0],
  ])("is null with %s", (_, work, efficiency, perAction) => {
    expect(wearOf(work, efficiency, perAction)).toBeNull();
  });
});
