export type FavoriteKind = "recipe" | "activity";

export const FAVORITES_STORAGE_KEYS: Record<FavoriteKind, string> = {
  recipe: "squire-favorites",
  activity: "squire-activity-favorites",
};

export function parseFavorites(stored: string | null): string[] {
  try {
    const value: unknown = JSON.parse(stored ?? "[]");

    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(favoriteIds: string[], id: string): string[] {
  return favoriteIds.includes(id) ? favoriteIds.filter((favoriteId) => favoriteId !== id) : [id, ...favoriteIds];
}

export function favoritesIn<T extends { id: string }>(entries: T[], favoriteIds: string[]): T[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  return favoriteIds.flatMap((id) => byId.get(id) ?? []);
}
