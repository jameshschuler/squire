import { Link } from "@tanstack/react-router";
import type { ItemWithEffects } from "@squire/api/recipe-book";
import { GameIcon } from "@/components/shared/GameIcon";
import { effectsFor, whereItemApplies } from "@/lib/effect-items";
import { formatEffect } from "@/lib/format";

export function EffectItemListItem({ item, filter }: { item: ItemWithEffects; filter: string | undefined }) {
  return (
    <li>
      <Link to="/items/$itemId" params={{ itemId: item.id }} className="flex items-center gap-3 py-2.5">
        <GameIcon path={item.icon} />
        <span className="min-w-0">
          <span className="block font-medium">{item.name}</span>
          <span className="block text-sm text-muted-foreground">
            {filter ? effectsFor(item, filter).map(formatEffect).join(" · ") : whereItemApplies(item)}
          </span>
        </span>
      </Link>
    </li>
  );
}
