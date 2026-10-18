import { describe, expect, it } from "vitest";
import { buildRecipeBook, type GameData } from "@squire/api/recipe-book";
import { FAVORITES_FILTER, filterRecipes, recipeFilters } from "@/lib/recipe-filters";
import sample from "../../../fixtures/api/gamedata-sample.json";

const { recipes } = buildRecipeBook(sample as unknown as GameData);
const ids = (list: { id: string }[]) => list.map((r) => r.id);
const favorites = ["smelt_a_gold_bar"];

describe("recipeFilters", () => {
  it("puts Favorites before the skills once something is starred", () => {
    const filters = recipeFilters(recipes, favorites);
    expect(filters[0]).toEqual({ id: FAVORITES_FILTER, name: "Favorites" });
    expect(filters.slice(1).map((f) => f.id)).toEqual(recipeFilters(recipes, []).map((f) => f.id));
  });

  it.each([
    ["nothing is starred", []],
    ["the starred recipe no longer exists", ["gone"]],
  ])("has no Favorites chip when %s", (_, starred) => {
    expect(recipeFilters(recipes, starred).map((f) => f.id)).not.toContain(FAVORITES_FILTER);
  });
});

describe("filterRecipes", () => {
  it("narrows to favorites", () => {
    expect(ids(filterRecipes(recipes, "", FAVORITES_FILTER, favorites))).toEqual(favorites);
  });

  it("lists favorites newest first", () => {
    const starred = ["assemble_dynamite", "smelt_a_gold_bar"];
    expect(ids(filterRecipes(recipes, "", FAVORITES_FILTER, starred))).toEqual(starred);
  });

  it("searches within favorites", () => {
    expect(ids(filterRecipes(recipes, "gold", FAVORITES_FILTER, favorites))).toEqual(favorites);
    expect(filterRecipes(recipes, "dynamite", FAVORITES_FILTER, favorites)).toEqual([]);
  });

  it("filters by skill when a skill is picked", () => {
    const smithing = filterRecipes(recipes, "", "smithing", favorites);
    expect(smithing.length).toBeGreaterThan(0);
    expect(smithing.every((r) => r.skills.some((s) => s.id === "smithing"))).toBe(true);
  });

  it("lists every recipe with no filter", () => {
    expect(filterRecipes(recipes, "", undefined, favorites)).toHaveLength(recipes.length);
  });
});
