import type { ItemWithEffects } from "@squire/api/recipe-book";

export interface CollectibleEntry {
  item: ItemWithEffects;
  owned: boolean;
}

export function collectionOf(loot: ItemWithEffects[], ownedIds: string[]): CollectibleEntry[] {
  const owned = new Set(ownedIds);
  return loot
    .filter((item) => item.isCollectible)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({ item, owned: owned.has(item.id) }));
}

export function collectionProgress(collection: CollectibleEntry[]): string {
  return `${collection.filter((entry) => entry.owned).length} of ${collection.length}`;
}
