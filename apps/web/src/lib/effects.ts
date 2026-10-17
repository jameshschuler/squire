import type { Effect } from "@squire/api/recipe-book";

export function groupByCondition(effects: Effect[]): [string, Effect[]][] {
  const groups = new Map<string, Effect[]>();
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
