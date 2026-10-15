import type { RecipeView } from "@squire/walkscape-sdk";
import { RecipeListItem } from "./RecipeListItem";

export function RecipeList({ recipes }: { recipes: RecipeView[] }) {
  return (
    <ul className="divide-y">
      {recipes.map((recipe) => (
        <RecipeListItem key={recipe.id} recipe={recipe} />
      ))}
    </ul>
  );
}
