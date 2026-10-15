import { describe, expect, it } from "vitest";
import type { RecipeView } from "@jameshschuler/walkscape-sdk";
import { recipeSkills } from "@/lib/skills";

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
