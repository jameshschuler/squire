import { Link } from "@tanstack/react-router";
import type { ActivityDrops as Drops } from "@squire/api/recipe-book";
import { CollectibleBadge } from "@/components/shared/CollectibleBadge";
import { GameIcon } from "@/components/shared/GameIcon";
import { Section } from "@/components/shared/Section";
import { lootTypeLabel } from "@/lib/format";
import { chanceDescription, formatChance, formatRateSteps, stepsDescription } from "@/lib/drop-rates";

export function ActivityDrops({ drops }: { drops: Drops }) {
  return (
    <Section title={lootTypeLabel(drops.lootType) ?? "Drops"}>
      <ul className="divide-y">
        {drops.items.map((item) => {
          const steps = formatRateSteps(item.rate, item.rateRange);

          return (
            <li key={item.id}>
              <Link to="/items/$itemId" params={{ itemId: item.id }} className="flex items-center gap-3 py-2">
                <GameIcon path={item.icon} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p title={chanceDescription(item.rateRange)} className="text-sm text-muted-foreground tabular-nums">
                    {formatChance(item.rate, item.rateRange)}
                  </p>
                  {steps && (
                    <p title={stepsDescription(item.rateRange)} className="text-sm text-muted-foreground tabular-nums">
                      {steps}
                    </p>
                  )}
                </div>
                {item.isCollectible && <CollectibleBadge />}
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
