import {
  lowestSkillLevels,
  words,
  type ItemSource,
  type ItemSummary,
  type RecipeBook,
  type SkillLevel,
} from "@squire/api/recipe-book";
import { uniqueSkills, type SkillOption } from "./skills";

export interface Material {
  item: ItemSummary;
  sources: ItemSource[];
  skills: SkillLevel[];
  isCrafted: boolean;
}

export const CHESTS_FILTER = "chests";
export const SHOPS_FILTER = "shops";
export const CRAFTED_FILTER = "crafted";

export interface MaterialSearchOptions {
  /** A skill id, or `CHESTS_FILTER` / `SHOPS_FILTER` / `CRAFTED_FILTER`. */
  filter?: string;
}

export function listMaterials(book: RecipeBook): Material[] {
  const crafted = new Set(book.recipes.flatMap((r) => r.outputs.map((o) => o.id)));
  const items = new Map<string, ItemSummary>();
  for (const { id, name, icon, keywords, effects } of book.recipes.flatMap((r) => r.materials.flat())) {
    if (!items.has(id)) {
      items.set(id, { id, name, icon, keywords, effects });
    }
  }
  return [...items.values()]
    .map((item) => {
      const sources = book.sources[item.id] ?? [];
      return {
        item,
        sources,
        skills: lowestSkillLevels(sources.flatMap(sourceSkills)),
        isCrafted: crafted.has(item.id),
      };
    })
    .sort((a, b) => a.item.name.localeCompare(b.item.name));
}

export function materialFilters(materials: Material[]): SkillOption[] {
  const hasSource = (kind: ItemSource["kind"]) => materials.some((m) => m.sources.some((s) => s.kind === kind));
  return [
    ...uniqueSkills(materials.flatMap((m) => m.skills)),
    ...(hasSource("chest") ? [{ id: CHESTS_FILTER, name: "Chests" }] : []),
    ...(hasSource("shop") ? [{ id: SHOPS_FILTER, name: "Shops" }] : []),
    ...(materials.some((m) => m.isCrafted) ? [{ id: CRAFTED_FILTER, name: "Crafted" }] : []),
  ];
}

export function searchMaterials(
  materials: Material[],
  query: string,
  { filter }: MaterialSearchOptions = {},
): Material[] {
  const terms = words(query);
  return materials.filter(
    (m) =>
      (!filter || matchesFilter(m, filter)) &&
      terms.every((term) => searchableWords(m).some((word) => word.startsWith(term))),
  );
}

function matchesFilter(material: Material, filter: string): boolean {
  if (filter === CHESTS_FILTER) {
    return material.sources.some((s) => s.kind === "chest");
  }
  if (filter === SHOPS_FILTER) {
    return material.sources.some((s) => s.kind === "shop");
  }
  if (filter === CRAFTED_FILTER) {
    return material.isCrafted;
  }
  return material.skills.some((s) => s.id === filter);
}

function sourceSkills(source: ItemSource): SkillLevel[] {
  return source.kind === "activity" ? source.skills : [];
}

function searchableWords(material: Material): string[] {
  return [material.item.name, ...material.item.keywords].flatMap(words);
}
