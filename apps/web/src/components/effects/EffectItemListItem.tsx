import { Link } from "@tanstack/react-router";
import type { ItemSummary } from "@squire/api/recipe-book";
import { CollectibleBadge } from "@/components/shared/CollectibleBadge";
import { GameIcon } from "@/components/shared/GameIcon";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { itemSubtitle } from "@/lib/effect-items";

interface EffectItemListItemProps {
  item: ItemSummary;
  filter: string | undefined;
  showQuality: boolean;
}

export function EffectItemListItem({ item, filter, showQuality }: EffectItemListItemProps) {
  return (
    <li>
      <Link to="/items/$itemId" params={{ itemId: item.id }} className="flex items-center gap-3 py-2.5">
        <GameIcon path={item.icon} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{item.name}</span>
          <span className="block text-sm text-muted-foreground">{itemSubtitle(item, filter)}</span>
        </span>
        {item.isCollectible ? (
          <CollectibleBadge />
        ) : (
          showQuality && item.quality && <QualityBadge quality={item.quality} />
        )}
      </Link>
    </li>
  );
}
