import type { ItemWithEffects } from "@squire/api/recipe-book";

export interface CollectibleEntry {
  item: ItemWithEffects;
  owned: boolean;
}

export function collectionOf(loot: ItemWithEffects[], ownedIds: string[]): CollectibleEntry[] {
  const owned = new Set(ownedIds);

  return loot
    .filter((item) => item.isCollectible)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) => ({ item, owned: owned.has(item.id) }));
}

export function collectionProgress(found: number, total: number): string {
  return `${found} of ${total}`;
}
