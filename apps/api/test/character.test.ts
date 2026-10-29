import { describe, expect, it } from "vitest";
import exportFixture from "../../../fixtures/character/export.json";
import { characterLevel, ownedItem, parseCharacterExport, skillLevel, toolSlots } from "../src/character/index.js";

const fixtureText = JSON.stringify(exportFixture);

describe("skillLevel", () => {
  it.each([
    [0, 1],
    [82, 1],
    [83, 2],
    [1_154, 10],
    [820_485, 71],
    [13_034_430, 98],
    [13_034_431, 99],
    [200_000_000, 99],
  ])("%i XP is level %i", (xp, level) => {
    expect(skillLevel(xp)).toBe(level);
  });
});

describe("characterLevel", () => {
  it.each([
    [0, 1],
    [381, 1],
    [382, 2],
    [20_562, 20],
    [8_034_939, 78],
    [9_135_912, 79],
    [9_135_913, 80],
    [59_958_383, 99],
  ])("%i lifetime steps is level %i", (steps, level) => {
    expect(characterLevel(steps)).toBe(level);
  });
});

describe("toolSlots", () => {
  it.each([
    [1, 3],
    [19, 3],
    [20, 4],
    [49, 4],
    [50, 5],
    [79, 5],
    [80, 6],
    [99, 6],
  ])("character level %i has %i tool slots", (level, slots) => {
    expect(toolSlots(level)).toBe(slots);
  });
});

describe("ownedItem", () => {
  it.each([
    ["iron_pickaxe_epic", { id: "iron_pickaxe", quality: "epic" }],
    ["iron_pickaxe_common", { id: "iron_pickaxe", quality: "common" }],
    ["gold_ethernite_ring_uncommon", { id: "gold_ethernite_ring", quality: "uncommon" }],
    ["recipe_book", { id: "recipe_book", quality: null }],
    ["cape_of_half_achiever", { id: "cape_of_half_achiever", quality: null }],
  ])("reads %s", (exportId, item) => {
    expect(ownedItem(exportId)).toEqual(item);
  });
});

describe("parseCharacterExport", () => {
  it("reads the player's levels and progress", () => {
    const character = parseCharacterExport(fixtureText);
    expect(character).toMatchObject({
      name: "Test Walker",
      skillLevels: { agility: 85, cooking: 71, fishing: 1, mining: 99 },
      totalSkillLevel: 256,
      lifetimeSteps: 9_135_913,
      characterLevel: 80,
      toolSlots: 6,
      achievementPoints: 231,
      collectibles: ["lost_timmys_sand_shovel", "soup_kitchen_badge"],
    });
  });

  it("reads equipped gear by slot, with its quality", () => {
    expect(parseCharacterExport(fixtureText).equipped).toEqual({
      head: { id: "pincushion_beret", quality: null },
      hands: { id: "journeyman_handwear", quality: "epic" },
      ring_1: { id: "gold_ethernite_ring", quality: "epic" },
      ring_2: { id: "gold_ethernite_ring", quality: "uncommon" },
      tool_1: { id: "recipe_book", quality: null },
    });
  });

  it("lists each item equipped, banked or carried with how many, leaving out fine materials", () => {
    const owned = parseCharacterExport(fixtureText).owned;
    expect(owned).toHaveLength(9);
    expect(owned).toEqual(
      expect.arrayContaining([
        { id: "journeyman_handwear", quality: "epic", count: 1 },
        { id: "iron_pickaxe", quality: "epic", count: 1 },
        { id: "iron_pickaxe", quality: "common", count: 1 },
        { id: "oven_mittens", quality: null, count: 1 },
        { id: "coal", quality: null, count: 3102 },
      ]),
    );
    expect(owned.filter((item) => item.id === "recipe_book")).toEqual([{ id: "recipe_book", quality: null, count: 2 }]);
    expect(owned.some((item) => item.id.endsWith("_fine"))).toBe(false);
  });

  it("reads the pet out with you and the rest of your pets, with their levels", () => {
    expect(parseCharacterExport(fixtureText).pets).toEqual([
      { species: "tortoise", level: 4 },
      { species: "silky_mummy", level: 2 },
      { species: "camel", level: 1 },
    ]);
  });

  it("knows which pet is out", () => {
    expect(parseCharacterExport(fixtureText).petOut).toEqual({ species: "tortoise", level: 4 });
  });

  it("reads an export with no pet out", () => {
    const text = JSON.stringify({ ...exportFixture, pets: { pet: null } });
    expect(parseCharacterExport(text).petOut).toBeNull();
    expect(parseCharacterExport(text).pets).toEqual([
      { species: "silky_mummy", level: 2 },
      { species: "camel", level: 1 },
    ]);
  });

  it("has no pets when the export lists none", () => {
    const { pets: _pets, available_pets: _available, ...withoutPets } = exportFixture;
    expect(parseCharacterExport(JSON.stringify(withoutPets)).pets).toEqual([]);
  });

  it("adds a worn copy to the banked ones, and leaves out items with none left", () => {
    const text = JSON.stringify({
      ...exportFixture,
      bank: { ...exportFixture.bank, gold_ethernite_ring_epic: 1, silver_ring: 0 },
    });
    const owned = parseCharacterExport(text).owned;
    expect(owned.find((item) => item.id === "gold_ethernite_ring" && item.quality === "epic")?.count).toBe(2);
    expect(owned.some((item) => item.id === "silver_ring")).toBe(false);
  });

  it("rejects text that isn't JSON", () => {
    expect(() => parseCharacterExport("{ name: ")).toThrow("That isn't valid JSON.");
  });

  it.each([
    ["an empty object", {}],
    ["a list", [exportFixture]],
    ["missing skills", { ...exportFixture, skills: undefined }],
    ["gear that isn't item ids", { ...exportFixture, gear: { head: 7 } }],
    ["collectibles that aren't ids", { ...exportFixture, collectibles: [1] }],
    ["pets without a level", { ...exportFixture, available_pets: [{ species: "camel" }] }],
    ["an out pet without a species", { ...exportFixture, pets: { pet: { level: 2 } } }],
  ])("rejects %s", (_, data) => {
    expect(() => parseCharacterExport(JSON.stringify(data))).toThrow("That isn't a WalkScape character export.");
  });
});
