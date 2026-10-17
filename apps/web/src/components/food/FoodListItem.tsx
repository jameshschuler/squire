import { Link } from "@tanstack/react-router";
import { GameIcon } from "@/components/shared/GameIcon";
import { effectsFor, type Food } from "@/lib/foods";
import { formatEffect } from "@/lib/format";

export function FoodListItem({ food, filter }: { food: Food; filter: string | undefined }) {
  return (
    <li>
      <Link to="/items/$itemId" params={{ itemId: food.id }} className="flex items-center gap-3 py-2.5">
        <GameIcon path={food.icon} />
        <span className="min-w-0">
          <span className="block font-medium">{food.name}</span>
          {filter && (
            <span className="block text-sm text-muted-foreground">
              {effectsFor(food, filter).map(formatEffect).join(" · ")}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
