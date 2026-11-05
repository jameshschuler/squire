import { Link } from "@tanstack/react-router";
import { GameIcon } from "@/components/shared/GameIcon";
import { Section } from "@/components/shared/Section";
import { collectibleLabel, collectionProgress, type CollectibleEntry } from "@/lib/collectibles";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CharacterCollectibles({ collection }: { collection: CollectibleEntry[] }) {
  const found = collection.filter((entry) => entry.owned).length;

  return (
    <Section title={`Collectibles · ${collectionProgress(found, collection.length)}`}>
      {found < collection.length && (
        <p className="mb-3 text-sm text-muted-foreground">
          Under each missing one: its W.E.A.R., the average steps to find it at max work efficiency.
        </p>
      )}
      <ul aria-label="Collectibles" className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        {collection.map((entry) => {
          const { item, owned, wear } = entry;

          return (
            <li key={item.id} className="min-w-0">
              <Link
                to="/items/$itemId"
                params={{ itemId: item.id }}
                aria-label={collectibleLabel(entry)}
                title={item.name}
                className="flex aspect-square items-center justify-center rounded-md border bg-muted/30"
              >
                <GameIcon path={item.icon} size={36} className={cn(!owned && "opacity-25 brightness-0 dark:invert")} />
              </Link>
              {!owned && (
                <p aria-hidden className="mt-1 truncate text-center text-xs text-muted-foreground tabular-nums">
                  {wear === null ? "–" : formatCompactNumber(wear)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
