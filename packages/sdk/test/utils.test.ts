import { describe, expect, it } from "vitest";
import {
  isServiceRequirement,
  isSkillLevelRequirement,
  lootTableItemIds,
  meetsServiceTier,
  recipesMaking,
  recipesUsing,
  serviceKeywords,
  type GameData,
  type LootTableDetail,
  type Requirement,
  type ServiceRequirement,
} from "../src/index.js";
import sample from "../../../fixtures/api/gamedata-sample.json";

const data = sample as unknown as GameData;
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

describe("serviceKeywords", () => {
  it.each([
    [{ keywords: ["kitchen", "cursed"], serviceKeyword: "kitchen", tier: "basic" as const }, ["kitchen", "cursed"]],
    [{ serviceKeyword: "kitchen", tier: "basic" as const }, ["kitchen"]],
    [{ keywords: [], serviceKeyword: null, tier: "basic" as const }, []],
  ])("reads %j", (requirement, expected) => {
    expect(serviceKeywords(service(requirement))).toEqual(expected);
  });
});

describe("meetsServiceTier", () => {
  it("accepts the same or a higher tier", () => {
    expect(meetsServiceTier("basic", "basic")).toBe(true);
    expect(meetsServiceTier("advanced", "basic")).toBe(true);
    expect(meetsServiceTier("basic", "advanced")).toBe(false);
  });
});

describe("lootTableItemIds", () => {
  it("lists items from rows and sub-tables, skipping rows without an item", () => {
    const table = {
      id: "t",
      tableRows: [{ rowItemID: "a" }, { rowItemID: null }],
      subTables: [{ tableRows: [{ rowItemID: "b" }] }],
    } as unknown as LootTableDetail;
    expect(lootTableItemIds(table)).toEqual(["a", "b"]);
  });
});

describe("recipesMaking / recipesUsing", () => {
  it("finds raw recipes that make or use an item", () => {
    expect(recipesMaking(data.recipes, "gold_bar").map((r) => r.id)).toEqual(["smelt_a_gold_bar"]);
    expect(recipesUsing(data.recipes, "salt_crystal").map((r) => r.id)).toEqual(["assemble_dynamite"]);
    expect(recipesUsing(data.recipes, "gold_ore").map((r) => r.id)).toEqual(["smelt_a_gold_bar"]);
    expect(recipesUsing(data.recipes, "unknown")).toEqual([]);
  });
});
