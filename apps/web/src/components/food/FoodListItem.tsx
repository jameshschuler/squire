import { Link } from "@tanstack/react-router";
import { GameIcon } from "@/components/shared/GameIcon";
import type { Food } from "@squire/api/recipe-book";
import { effectsFor, whereFoodApplies } from "@/lib/foods";
import { formatEffect } from "@/lib/format";

export function FoodListItem({ food, filter }: { food: Food; filter: string | undefined }) {
  return (
    <li>
      <Link to="/items/$itemId" params={{ itemId: food.id }} className="flex items-center gap-3 py-2.5">
        <GameIcon path={food.icon} />
        <span className="min-w-0">
          <span className="block font-medium">{food.name}</span>
          <span className="block text-sm text-muted-foreground">
            {filter ? effectsFor(food, filter).map(formatEffect).join(" · ") : whereFoodApplies(food)}
          </span>
        </span>
      </Link>
    </li>
  );
}
