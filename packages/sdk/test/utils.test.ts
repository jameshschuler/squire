import { describe, expect, it } from "vitest";
import {
  isServiceRequirement,
  isSkillLevelRequirement,
  getLootTableItemIds,
  meetsServiceTier,
  findRecipesByOutput,
  findRecipesByMaterial,
  getServiceKeywords,
  type LootTableDetail,
  type RecipeDetail,
  type Requirement,
  type ServiceRequirement,
} from "../src/index.js";
import sample from "../../../fixtures/api/gamedata-sample.json";

const data = sample as unknown as { recipes: RecipeDetail[] };
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
    [{ keywords: ["kitchen", "cursed"], serviceKeyword: "kitchen", tier: "basic" as const }, ["kitchen", "cursed"]],
    [{ serviceKeyword: "kitchen", tier: "basic" as const }, ["kitchen"]],
    [{ keywords: [], serviceKeyword: null, tier: "basic" as const }, []],
  ])("reads %j", (requirement, expected) => {
    expect(getServiceKeywords(service(requirement))).toEqual(expected);
  });
});

describe("meetsServiceTier", () => {
  it("accepts the same or a higher tier", () => {
    expect(meetsServiceTier("basic", "basic")).toBe(true);
    expect(meetsServiceTier("advanced", "basic")).toBe(true);
    expect(meetsServiceTier("basic", "advanced")).toBe(false);
    expect(meetsServiceTier("expert", "basic")).toBe(true);
  });

  it("never meets a tier it doesn't know", () => {
    expect(meetsServiceTier("expert", "master")).toBe(false);
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

describe("findRecipesByOutput / findRecipesByMaterial", () => {
  it("finds raw recipes that make or use an item", () => {
    expect(findRecipesByOutput(data.recipes, "gold_bar").map((r) => r.id)).toEqual(["smelt_a_gold_bar"]);
    expect(findRecipesByMaterial(data.recipes, "salt_crystal").map((r) => r.id)).toEqual(["assemble_dynamite"]);
    expect(findRecipesByMaterial(data.recipes, "gold_ore").map((r) => r.id)).toEqual(["smelt_a_gold_bar"]);
    expect(findRecipesByMaterial(data.recipes, "unknown")).toEqual([]);
  });
});
