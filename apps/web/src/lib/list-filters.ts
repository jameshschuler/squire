import type { SkillSearchOptions } from "@squire/api/recipe-book";
import { favoritesIn } from "./favorites";
import { skillOptions, type SkillOption } from "./skills";

export const FAVORITES_FILTER = "favorites";

type ListEntry = { id: string; skills: SkillOption[] };
type Search<T> = (entries: T[], query: string, options?: SkillSearchOptions) => T[];

export function listFilters(entries: ListEntry[], favoriteIds: string[]): SkillOption[] {
  const favorites = favoritesIn(entries, favoriteIds).length > 0 ? [{ id: FAVORITES_FILTER, name: "Favorites" }] : [];

  return [...favorites, ...skillOptions(entries)];
}

interface ListQuery {
  query: string;
  filter: string | undefined;
  favoriteIds: string[];
}

export function filterList<T extends ListEntry>(
  entries: T[],
  search: Search<T>,
  { query, filter, favoriteIds }: ListQuery,
): T[] {
  if (filter === FAVORITES_FILTER) {
    return search(favoritesIn(entries, favoriteIds), query);
  }

  return search(entries, query, { skill: filter });
}
