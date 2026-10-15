import type { Item, ItemSource, RecipeBook, SkillLevel } from "@jameshschuler/walkscape-sdk";
import { uniqueSkills, type SkillOption } from "./skills";

export interface Material {
  item: Item;
  sources: ItemSource[];
  skills: SkillLevel[];
}

export interface MaterialSearchOptions {
  skill?: string;
}

export function rawMaterials(book: RecipeBook): Material[] {
  const crafted = new Set(book.recipes.flatMap((r) => r.outputs.map((o) => o.id)));
  const items = new Map<string, Item>();
  for (const { id, name, icon } of book.recipes.flatMap((r) => r.materials.flat())) {
    if (!crafted.has(id) && !items.has(id)) {
      items.set(id, { id, name, icon });
    }
  }
  return [...items.values()]
    .map((item) => {
      const sources = book.sources[item.id] ?? [];
      return { item, sources, skills: lowestLevels(sources) };
    })
    .sort(byLevel);
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

function lowestLevels(sources: ItemSource[]): SkillLevel[] {
  const lowest = new Map<string, SkillLevel>();
  for (const skill of sources.flatMap((s) => s.skills)) {
    const current = lowest.get(skill.id);
    if (!current || level(skill) < level(current)) {
      lowest.set(skill.id, skill);
    }
  }
  return [...lowest.values()].sort((a, b) => level(a) - level(b));
}

function byLevel(a: Material, b: Material): number {
  const sourced = Number(b.sources.length > 0) - Number(a.sources.length > 0);
  return sourced || minLevel(a) - minLevel(b) || a.item.name.localeCompare(b.item.name);
}

function minLevel(material: Material): number {
  return material.skills[0] ? level(material.skills[0]) : 0;
}

function level(skill: SkillLevel): number {
  return skill.level ?? 0;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
