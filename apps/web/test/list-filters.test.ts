import { describe, expect, it } from "vitest";
import {
  buildRecipeBook,
  searchActivities,
  searchRecipes,
  type GameData,
  type RecipeView,
} from "@squire/api/recipe-book";
import { FAVORITES_FILTER, filterList, listFilters } from "@/lib/list-filters";
import sample from "../../../fixtures/api/gamedata-sample.json";

const { recipes, activities } = buildRecipeBook(sample as unknown as GameData);
const ids = (list: { id: string }[]) => list.map((entry) => entry.id);
const favorites = ["smelt_a_gold_bar"];
const filterRecipes = (query: string, filter: string | undefined, favoriteIds: string[]): RecipeView[] =>
  filterList(recipes, searchRecipes, { query, filter, favoriteIds });

describe("listFilters", () => {
  it("puts Favorites before the skills once something is starred", () => {
    const filters = listFilters(recipes, favorites);

    expect(filters[0]).toEqual({ id: FAVORITES_FILTER, name: "Favorites" });
    expect(filters.slice(1).map((filter) => filter.id)).toEqual(listFilters(recipes, []).map((filter) => filter.id));
  });

  it.each([
    ["nothing is starred", []],
    ["the starred recipe no longer exists", ["gone"]],
  ])("has no Favorites chip when %s", (_, starred) => {
    expect(listFilters(recipes, starred).map((filter) => filter.id)).not.toContain(FAVORITES_FILTER);
  });
});

describe("filterList", () => {
  it("narrows to favorites", () => {
    expect(ids(filterRecipes("", FAVORITES_FILTER, favorites))).toEqual(favorites);
  });

  it("lists favorites newest first", () => {
    const starred = ["assemble_dynamite", "smelt_a_gold_bar"];

    expect(ids(filterRecipes("", FAVORITES_FILTER, starred))).toEqual(starred);
  });

  it("searches within favorites", () => {
    expect(ids(filterRecipes("gold", FAVORITES_FILTER, favorites))).toEqual(favorites);
    expect(filterRecipes("dynamite", FAVORITES_FILTER, favorites)).toEqual([]);
  });

  it("filters by skill when a skill is picked", () => {
    const smithing = filterRecipes("", "smithing", favorites);

    expect(smithing.length).toBeGreaterThan(0);
    expect(smithing.every((recipe) => recipe.skills.some((skill) => skill.id === "smithing"))).toBe(true);
  });

  it("works the same for activities", () => {
    expect(
      ids(
        filterList(activities, searchActivities, {
          query: "",
          filter: FAVORITES_FILTER,
          favoriteIds: ["mine_gold_ore"],
        }),
      ),
    ).toEqual(["mine_gold_ore"]);
    expect(listFilters(activities, ["mine_gold_ore"])[0]).toEqual({ id: FAVORITES_FILTER, name: "Favorites" });
  });

  it("lists every recipe with no filter", () => {
    expect(filterRecipes("", undefined, favorites)).toHaveLength(recipes.length);
  });
});
