import { Link } from "@tanstack/react-router";
import { GameIcon } from "@/components/shared/GameIcon";
import { Section } from "@/components/shared/Section";
import { collectionProgress, type CollectibleEntry } from "@/lib/collectibles";
import { cn } from "@/lib/utils";

export function CharacterCollectibles({ collection }: { collection: CollectibleEntry[] }) {
  return (
    <Section title={`Collectibles · ${collectionProgress(collection)}`}>
      <ul aria-label="Collectibles" className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        {collection.map(({ item, owned }) => (
          <li key={item.id}>
            <Link
              to="/items/$itemId"
              params={{ itemId: item.id }}
              aria-label={owned ? item.name : `${item.name}, not found yet`}
              title={item.name}
              className="flex aspect-square items-center justify-center rounded-md border bg-muted/30"
            >
              <GameIcon path={item.icon} size={36} className={cn(!owned && "opacity-25 brightness-0 dark:invert")} />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
