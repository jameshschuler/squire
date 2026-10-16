import type {
  LootTableDetail,
  Requirement,
  ServiceRequirement,
  ServiceTier,
} from "@jameshschuler/walkscape-data-client";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  SERVICE_TIERS,
  getLootTableItemIds,
  getServiceKeywords,
  isServiceRequirement,
  isSkillLevelRequirement,
  meetsServiceTier,
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
