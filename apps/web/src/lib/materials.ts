import {
  lowestSkillLevels,
  type ItemSource,
  type ItemSummary,
  type RecipeBook,
  type SkillLevel,
} from "@jameshschuler/walkscape-sdk";
import { uniqueSkills, type SkillOption } from "./skills";

export interface Material {
  item: ItemSummary;
  sources: ItemSource[];
  skills: SkillLevel[];
}

export const CHESTS_FILTER = "chests";
export const SHOPS_FILTER = "shops";

export interface MaterialSearchOptions {
  /** A skill id, or `CHESTS_FILTER` / `SHOPS_FILTER`. */
  filter?: string;
}

export function rawMaterials(book: RecipeBook): Material[] {
  const crafted = new Set(book.recipes.flatMap((r) => r.outputs.map((o) => o.id)));
  const items = new Map<string, ItemSummary>();
  for (const { id, name, icon, keywords } of book.recipes.flatMap((r) => r.materials.flat())) {
    if (!crafted.has(id) && !items.has(id)) {
      items.set(id, { id, name, icon, keywords });
    }
  }
  return [...items.values()]
    .map((item) => {
      const sources = book.sources[item.id] ?? [];
      return { item, sources, skills: lowestSkillLevels(sources.flatMap(sourceSkills)) };
    })
    .sort((a, b) => a.item.name.localeCompare(b.item.name));
}

export function materialFilters(materials: Material[]): SkillOption[] {
  const hasSource = (kind: ItemSource["kind"]) => materials.some((m) => m.sources.some((s) => s.kind === kind));
  return [
    ...uniqueSkills(materials.flatMap((m) => m.skills)),
    ...(hasSource("chest") ? [{ id: CHESTS_FILTER, name: "Chests" }] : []),
    ...(hasSource("shop") ? [{ id: SHOPS_FILTER, name: "Shops" }] : []),
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
      terms.every((term) => words(m.item.name).some((word) => word.startsWith(term))),
  );
}

function matchesFilter(material: Material, filter: string): boolean {
  if (filter === CHESTS_FILTER) {
    return material.sources.some((s) => s.kind === "chest");
  }
  if (filter === SHOPS_FILTER) {
    return material.sources.some((s) => s.kind === "shop");
  }
  return material.skills.some((s) => s.id === filter);
}

function sourceSkills(source: ItemSource): SkillLevel[] {
  return source.kind === "activity" ? source.skills : [];
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
