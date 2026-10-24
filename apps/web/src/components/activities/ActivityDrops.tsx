import { Link } from "@tanstack/react-router";
import type { ActivityDrops as Drops } from "@squire/api/recipe-book";
import { CollectibleBadge } from "@/components/shared/CollectibleBadge";
import { GameIcon } from "@/components/shared/GameIcon";
import { Section } from "@/components/shared/Section";
import { lootTypeLabel } from "@/lib/format";

export function ActivityDrops({ drops }: { drops: Drops }) {
  return (
    <Section title={lootTypeLabel(drops.lootType) ?? "Drops"}>
      <ul className="divide-y">
        {drops.items.map((item) => (
          <li key={item.id}>
            <Link to="/items/$itemId" params={{ itemId: item.id }} className="flex items-center gap-3 py-2">
              <GameIcon path={item.icon} />
              <span className="flex-1 font-medium">{item.name}</span>
              {item.isCollectible && <CollectibleBadge />}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
