import { searchRecipes, type RecipeView } from "@squire/api/recipe-book";
import { favoriteRecipes } from "./favorites";
import { recipeSkills, type SkillOption } from "./skills";

export const FAVORITES_FILTER = "favorites";

export function recipeFilters(recipes: RecipeView[], favoriteIds: string[]): SkillOption[] {
  const favorites =
    favoriteRecipes(recipes, favoriteIds).length > 0 ? [{ id: FAVORITES_FILTER, name: "Favorites" }] : [];
  return [...favorites, ...recipeSkills(recipes)];
}

export function filterRecipes(
  recipes: RecipeView[],
  query: string,
  filter: string | undefined,
  favoriteIds: string[],
): RecipeView[] {
  if (filter === FAVORITES_FILTER) {
    return searchRecipes(favoriteRecipes(recipes, favoriteIds), query);
  }
  return searchRecipes(recipes, query, { skill: filter });
}
