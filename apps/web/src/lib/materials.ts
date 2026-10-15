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

export interface MaterialSearchOptions {
  skill?: string;
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

export function materialSkills(materials: Material[]): SkillOption[] {
  return uniqueSkills(materials.flatMap((m) => m.skills));
}

export function searchMaterials(
  materials: Material[],
  query: string,
  { skill }: MaterialSearchOptions = {},
): Material[] {
  const terms = words(query);
  return materials.filter(
    (m) =>
      (!skill || m.skills.some((s) => s.id === skill)) &&
      terms.every((term) => words(m.item.name).some((word) => word.startsWith(term))),
  );
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
