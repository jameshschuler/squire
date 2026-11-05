import type { ItemSource, ItemWithEffects } from "@squire/api/recipe-book";
import { formatStepCount } from "@/lib/format";

export interface CollectibleEntry {
  item: ItemWithEffects;
  owned: boolean;
  wear: number | null;
}

export function collectionOf(
  loot: ItemWithEffects[],
  sources: Record<string, ItemSource[]>,
  ownedIds: string[],
): CollectibleEntry[] {
  const owned = new Set(ownedIds);

  return loot
    .filter((item) => item.isCollectible)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) => ({ item, owned: owned.has(item.id), wear: bestWear(sources[item.id] ?? []) }));
}

export function bestWear(sources: ItemSource[]): number | null {
  const wears = sources.flatMap((source) => (source.kind === "activity" && source.wear !== null ? [source.wear] : []));

  return wears.length > 0 ? Math.min(...wears) : null;
}

export function collectibleLabel({ item, owned, wear }: CollectibleEntry): string {
  if (owned) {
    return item.name;
  }

  return wear === null
    ? `${item.name}, not found yet`
    : `${item.name}, not found yet, W.E.A.R. ${formatStepCount(wear)}`;
}

export function collectionProgress(found: number, total: number): string {
  return `${found} of ${total}`;
}
