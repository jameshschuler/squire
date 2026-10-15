import { createFileRoute } from "@tanstack/react-router";
import { RecipeDetail } from "@/components/recipes/RecipeDetail";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { useGameDataContext } from "@/contexts/game-data-context";

export const Route = createFileRoute("/recipes/$recipeId")({
  component: RecipePage,
});

function RecipePage() {
  const { recipeId } = Route.useParams();
  const state = useGameDataContext();
  if (state.status !== "ready") {
    return <GameDataStatus state={state} />;
  }
  const recipe = state.book.recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return <p className="text-muted-foreground py-8 text-center">Recipe not found.</p>;
  }
  return <RecipeDetail recipe={recipe} />;
}
