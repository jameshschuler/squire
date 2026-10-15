import type { RecipeItem } from "@squire/walkscape-sdk";
import { GameIcon } from "@/components/shared/GameIcon";

export function RecipeItemRow({ item }: { item: RecipeItem }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <GameIcon path={item.icon} />
      <span className="font-medium">
        {item.amount} × {item.name}
      </span>
    </div>
  );
}
