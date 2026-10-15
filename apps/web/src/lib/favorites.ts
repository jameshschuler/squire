import type { RecipeView } from "@squire/api/recipe-book";

export const FAVORITES_STORAGE_KEY = "squire-favorites";

export function parseFavorites(stored: string | null): string[] {
  try {
    const value: unknown = JSON.parse(stored ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(favoriteIds: string[], recipeId: string): string[] {
  return favoriteIds.includes(recipeId) ? favoriteIds.filter((id) => id !== recipeId) : [recipeId, ...favoriteIds];
}

export function favoriteRecipes(recipes: RecipeView[], favoriteIds: string[]): RecipeView[] {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  return favoriteIds.flatMap((id) => byId.get(id) ?? []);
}
