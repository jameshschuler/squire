import { describe, expect, it } from "vitest";
import type { RecipeView } from "@squire/api/recipe-book";
import { knownOption, recipeSkills } from "@/lib/skills";

const recipe = (skills: { id: string; name: string }[]) =>
  ({ skills: skills.map((s) => ({ ...s, level: 1 })) }) as RecipeView;

describe("recipeSkills", () => {
  it("returns each skill once, sorted by name", () => {
    const recipes = [
      recipe([{ id: "smithing", name: "Smithing" }]),
      recipe([
        { id: "cooking", name: "Cooking" },
        { id: "smithing", name: "Smithing" },
      ]),
    ];
    expect(recipeSkills(recipes)).toEqual([
      { id: "cooking", name: "Cooking" },
      { id: "smithing", name: "Smithing" },
    ]);
  });

  it("returns nothing for no recipes", () => {
    expect(recipeSkills([])).toEqual([]);
  });
});

describe("knownOption", () => {
  const options = [{ id: "mining", name: "Mining" }];

  it.each([
    ["mining", "mining"],
    ["cooking", undefined],
    [undefined, undefined],
  ])("keeps %s only if it's an option → %s", (selected, expected) => {
    expect(knownOption(options, selected)).toBe(expected);
  });
});
