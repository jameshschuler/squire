import { describe, expect, it } from "vitest";
import type { RecipeView } from "@squire/api/recipe-book";
import { favoriteRecipes, parseFavorites, toggleFavorite } from "@/lib/favorites";

describe("parseFavorites", () => {
  it.each([
    ['["a","b"]', ["a", "b"]],
    [null, []],
    ["not json", []],
    ['{"a":1}', []],
    ['["a",2,null,"b"]', ["a", "b"]],
  ])("reads %s as %j", (stored, expected) => {
    expect(parseFavorites(stored)).toEqual(expected);
  });
});

describe("toggleFavorite", () => {
  it("adds a new favorite to the front", () => {
    expect(toggleFavorite(["a"], "b")).toEqual(["b", "a"]);
  });

  it("removes an existing favorite", () => {
    expect(toggleFavorite(["b", "a"], "b")).toEqual(["a"]);
  });
});

describe("favoriteRecipes", () => {
  const recipe = (id: string) => ({ id }) as RecipeView;

  it("returns recipes in favorite order and skips ids no longer in the game", () => {
    const recipes = [recipe("a"), recipe("b"), recipe("c")];
    expect(favoriteRecipes(recipes, ["c", "gone", "a"]).map((r) => r.id)).toEqual(["c", "a"]);
  });

  it("returns nothing without favorites", () => {
    expect(favoriteRecipes([recipe("a")], [])).toEqual([]);
  });
});
