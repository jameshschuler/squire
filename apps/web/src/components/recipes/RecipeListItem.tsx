import { Link } from "@tanstack/react-router";
import type { RecipeView } from "@jameshschuler/walkscape-sdk";
import { GameIcon } from "@/components/shared/GameIcon";
import { formatSkillLevel } from "@/lib/format";

export function RecipeListItem({ recipe }: { recipe: RecipeView }) {
  const details = [recipe.skills.map(formatSkillLevel).join(", "), recipe.service?.label].filter(Boolean).join(" · ");
  return (
    <li>
      <Link to="/recipes/$recipeId" params={{ recipeId: recipe.id }} className="flex items-center gap-3 py-2.5">
        <GameIcon path={recipe.icon} />
        <span className="min-w-0">
          <span className="block font-medium">{recipe.name}</span>
          <span className="block truncate text-sm text-muted-foreground">{details}</span>
        </span>
      </Link>
    </li>
  );
}
