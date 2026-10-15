import { useMemo } from "react";
import { Star } from "lucide-react";
import type { RecipeView } from "@squire/walkscape-sdk";
import { RecipeList } from "@/components/recipes/RecipeList";
import { useFavoritesContext } from "@/contexts/favorites-context";
import { favoriteRecipes } from "@/lib/favorites";

export function FavoriteRecipes({ recipes }: { recipes: RecipeView[] }) {
  const { favoriteIds } = useFavoritesContext();
  const favorites = useMemo(() => favoriteRecipes(recipes, favoriteIds), [recipes, favoriteIds]);

  return (
    <section className="space-y-3 pt-4">
      <h1 className="text-2xl font-semibold">Favorites</h1>
      {favorites.length > 0 ? (
        <RecipeList recipes={favorites} />
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          No favorites yet. Tap <Star className="inline size-4 align-text-bottom" aria-label="the star" /> on a recipe
          to save it here.
        </p>
      )}
    </section>
  );
}
