import { TRAVELLING, words, type Effect, type ItemWithEffects } from "@squire/api/recipe-book";
import { formatEffect } from "./format";
import { matchesWords } from "./match";
import { uniqueSkills, type SkillOption } from "./skills";

export const COLLECTIBLES_FILTER = "collectibles";

export function effectFilters(items: ItemWithEffects[]): SkillOption[] {
  const targets = items.flatMap((item) => effectsOf(item).flatMap((effect) => effect.appliesTo));
  return [
    ...uniqueSkills(targets.filter((target) => target.id !== TRAVELLING.id)),
    ...(targets.some((target) => target.id === TRAVELLING.id) ? [TRAVELLING] : []),
    ...(items.some((item) => item.isCollectible) ? [{ id: COLLECTIBLES_FILTER, name: "Collectibles" }] : []),
  ];
}

export function effectsFor(item: ItemWithEffects, filter: string): Effect[] {
  return effectsOf(item).filter((effect) => effect.appliesTo.some((target) => target.id === filter));
}

export function itemSubtitle(item: ItemWithEffects, filter: string | undefined): string {
  return filter && filter !== COLLECTIBLES_FILTER ? summarizeEffects(item, filter) : whereItemApplies(item);
}

export function summarizeEffects(item: ItemWithEffects, filter: string): string {
  const [first, ...rest] = effectsFor(item, filter);
  if (!first) {
    return "";
  }
  if (rest.length === 0) {
    return formatEffect(first);
  }
  return `${formatEffect(first)} · +${rest.length} other ${rest.length === 1 ? "effect" : "effects"}`;
}

export function searchEffectItems(
  items: ItemWithEffects[],
  query: string,
  { filter }: { filter?: string } = {},
): ItemWithEffects[] {
  const terms = words(query);
  return items.filter(
    (item) => (!filter || matchesFilter(item, filter)) && matchesWords(terms, [item.name, ...item.keywords]),
  );
}

export function whereItemApplies(item: ItemWithEffects): string {
  const effects = effectsOf(item);
  if (effects.length === 0) {
    return "No effects";
  }
  const scopes = new Set(effects.flatMap((effect) => (effect.scope ? [effect.scope] : [])));
  return scopes.has("Global") ? "Global" : [...scopes].join(" · ") || "Under certain conditions";
}

function matchesFilter(item: ItemWithEffects, filter: string): boolean {
  return filter === COLLECTIBLES_FILTER ? item.isCollectible : effectsFor(item, filter).length > 0;
}

function effectsOf(item: ItemWithEffects): Effect[] {
  return item.effects?.effects ?? [];
}
