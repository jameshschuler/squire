import { TRAVELLING, words, type Effect, type ItemSummary } from "@squire/api/recipe-book";
import { formatEffect } from "./format";
import { matchesWords } from "./match";
import { uniqueSkills, type SkillOption } from "./skills";

export function effectFilters(items: ItemSummary[]): SkillOption[] {
  const targets = items.flatMap((item) => effectsOf(item).flatMap((effect) => effect.appliesTo));
  const skills = uniqueSkills(targets.filter((target) => target.id !== TRAVELLING.id));
  return targets.some((target) => target.id === TRAVELLING.id) ? [...skills, TRAVELLING] : skills;
}

export function effectsFor(item: ItemSummary, filter: string): Effect[] {
  return effectsOf(item).filter((effect) => effect.appliesTo.some((target) => target.id === filter));
}

export function summarizeEffects(item: ItemSummary, filter: string): string {
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
  items: ItemSummary[],
  query: string,
  { filter }: { filter?: string } = {},
): ItemSummary[] {
  const terms = words(query);
  return items.filter(
    (item) => (!filter || effectsFor(item, filter).length > 0) && matchesWords(terms, [item.name, ...item.keywords]),
  );
}

export function whereItemApplies(item: ItemSummary): string {
  const effects = effectsOf(item);
  if (effects.length === 0) {
    return "No effects";
  }
  const scopes = new Set(effects.flatMap((effect) => (effect.scope ? [effect.scope] : [])));
  return scopes.has("Global") ? "Global" : [...scopes].join(" · ") || "Under certain conditions";
}

function effectsOf(item: ItemSummary): Effect[] {
  return item.effects?.effects ?? [];
}
