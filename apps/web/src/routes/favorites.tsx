import { createFileRoute } from "@tanstack/react-router";
import { FavoriteRecipes } from "@/components/favorites/FavoriteRecipes";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { useGameDataContext } from "@/contexts/game-data-context";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const state = useGameDataContext();
  if (state.status !== "ready") {
    return <GameDataStatus state={state} />;
  }
  return <FavoriteRecipes recipes={state.book.recipes} />;
}
