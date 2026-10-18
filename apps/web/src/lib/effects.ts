import type { EffectLine } from "@squire/api/recipe-book";

export function groupByCondition(effects: EffectLine[]): [string, EffectLine[]][] {
  const groups = new Map<string, EffectLine[]>();
  for (const effect of effects) {
    const group = groups.get(effect.condition);
    if (group) {
      group.push(effect);
    } else {
      groups.set(effect.condition, [effect]);
    }
  }
  return [...groups];
}
