import { TRAVELLING, words, type Effect, type ItemWithEffects } from "@squire/api/recipe-book";
import { formatCondition } from "./format";
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
  return [...new Set(item.effects.effects.map((effect) => effect.condition))].map(formatCondition).join(" · ");
}
