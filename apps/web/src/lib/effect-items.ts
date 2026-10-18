import { TRAVELLING, words, type Effect, type ItemWithEffects } from "@squire/api/recipe-book";
import { formatEffect } from "./format";
import { matchesWords } from "./match";
import { uniqueSkills, type SkillOption } from "./skills";

export function effectFilters(items: ItemWithEffects[]): SkillOption[] {
  const targets = items.flatMap((item) => item.effects.effects.flatMap((effect) => effect.appliesTo));
  const skills = uniqueSkills(targets.filter((target) => target.id !== TRAVELLING.id));
  return targets.some((target) => target.id === TRAVELLING.id) ? [...skills, TRAVELLING] : skills;
}

export function effectsFor(item: ItemWithEffects, filter: string): Effect[] {
  return item.effects.effects.filter((effect) => effect.appliesTo.some((target) => target.id === filter));
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
    (item) => (!filter || effectsFor(item, filter).length > 0) && matchesWords(terms, [item.name, ...item.keywords]),
  );
}

export function whereItemApplies(item: ItemWithEffects): string {
  const scopes = new Set(item.effects.effects.flatMap((effect) => (effect.scope ? [effect.scope] : [])));
  return scopes.has("Global") ? "Global" : [...scopes].join(" · ") || "Under certain conditions";
}
