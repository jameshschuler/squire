import { itemId, withSetBonuses, type Candidate } from "./candidates.js";
import { conflicts, setGroupsOf, type KeywordRules } from "./pruning.js";
import { MAX_DOUBLE_ACTION, NO_STATS, addStats, type StatTotals } from "./steps.js";

export interface SlotGroup {
  capacity: number;
  choices: Candidate[];
}

interface PartialSet {
  chosen: Candidate[];
  guaranteed: StatTotals;
  optimistic: StatTotals;
  used: number;
  bans: string[];
  setItems: string[][];
}

export function bestSet(
  groups: SlotGroup[],
  rules: KeywordRules,
  useful: number,
  averageSteps: (totals: StatTotals) => number,
): Candidate[] {
  const setSteps = (set: Candidate[]) => averageSteps(withSetBonuses(set));
  const compatible = (chosen: Candidate[], next: Candidate) =>
    !chosen.some((other) => other === next || conflicts(rules, other, next));
  let best = greedy(groups, compatible, setSteps);
  let bestSteps = setSteps(best);

  const tops = groups.map(({ choices, capacity }) => topSums(choices, capacity, useful));
  const rest = tops.reduceRight<StatTotals[]>(
    (sums, top, g) => [addStats(top[0]![groups[g]!.capacity]!, sums[0]!), ...sums],
    [NO_STATS],
  );
  let states: PartialSet[] = [emptySet(rules.setGroups.length)];
  groups.forEach(({ choices, capacity }, g) => {
    states = states.map((state) => ({ ...state, used: 0 }));
    choices.forEach((next, i) => {
      const grown = states.flatMap((state) =>
        state.used < capacity && compatible(state.chosen, next) ? [grow(state, next, rules)] : [],
      );
      const remaining = (state: PartialSet) => addStats(tops[g]![i + 1]![capacity - state.used]!, rest[g + 1]!);
      states = frontier([...states, ...grown], useful).filter(
        (state) => averageSteps(addStats(state.optimistic, remaining(state))) < bestSteps,
      );
    });
  });
  for (const { chosen } of states) {
    const steps = setSteps(chosen);
    if (steps < bestSteps) {
      best = chosen;
      bestSteps = steps;
    }
  }
  return withoutIdlePicks(best, setSteps);
}

function greedy(
  groups: SlotGroup[],
  compatible: (chosen: Candidate[], next: Candidate) => boolean,
  setSteps: (set: Candidate[]) => number,
): Candidate[] {
  let chosen: Candidate[] = [];
  let current = setSteps(chosen);
  for (;;) {
    const options = groups.flatMap(({ capacity, choices }) =>
      chosen.filter((c) => choices.includes(c)).length < capacity ? choices.filter((c) => compatible(chosen, c)) : [],
    );
    const top = options
      .map((c) => ({ c, steps: setSteps([...chosen, c]) }))
      .reduce<{ c: Candidate; steps: number } | undefined>((a, b) => (!a || b.steps < a.steps ? b : a), undefined);
    if (!top || top.steps >= current) {
      return chosen;
    }
    chosen = [...chosen, top.c];
    current = top.steps;
  }
}

function emptySet(setGroupCount: number): PartialSet {
  return {
    chosen: [],
    guaranteed: NO_STATS,
    optimistic: NO_STATS,
    used: 0,
    bans: [],
    setItems: Array.from({ length: setGroupCount }, () => []),
  };
}

function grow(state: PartialSet, next: Candidate, rules: KeywordRules): PartialSet {
  const groups = setGroupsOf(rules, next);
  return {
    chosen: [...state.chosen, next],
    guaranteed: addStats(state.guaranteed, next.totals),
    optimistic: addStats(state.optimistic, next.best),
    used: state.used + 1,
    bans: [...new Set([...state.bans, ...next.keywords.filter((k) => rules.banKeys.has(k))])],
    setItems: state.setItems.map((ids, i) => (groups.includes(i) ? [...new Set([...ids, itemId(next)])] : ids)),
  };
}

function frontier(states: PartialSet[], useful: number): PartialSet[] {
  const covers = (a: PartialSet, b: PartialSet) =>
    Math.min(a.guaranteed.workEfficiency, useful) >= Math.min(b.optimistic.workEfficiency, useful) &&
    a.guaranteed.stepsPercent <= b.optimistic.stepsPercent &&
    a.guaranteed.stepsFlat <= b.optimistic.stepsFlat &&
    Math.min(a.guaranteed.doubleAction, MAX_DOUBLE_ACTION) >= Math.min(b.optimistic.doubleAction, MAX_DOUBLE_ACTION) &&
    a.used <= b.used &&
    a.bans.every((k) => b.bans.includes(k)) &&
    a.setItems.every((ids, i) => ids.length >= b.setItems[i]!.length);
  const kept: PartialSet[] = [];
  for (const state of states) {
    if (kept.some((other) => covers(other, state))) {
      continue;
    }
    for (let i = kept.length - 1; i >= 0; i--) {
      if (covers(state, kept[i]!)) {
        kept.splice(i, 1);
      }
    }
    kept.push(state);
  }
  return kept;
}

function topSums(choices: Candidate[], capacity: number, useful: number): StatTotals[][] {
  return Array.from({ length: choices.length + 1 }, (_, start) => {
    const rest = choices.slice(start).map((c) => c.best);
    return Array.from({ length: capacity + 1 }, (_, picks) => ({
      workEfficiency: Math.min(
        topSum(
          rest.map((t) => t.workEfficiency),
          picks,
        ),
        useful,
      ),
      stepsPercent: -topSum(
        rest.map((t) => -t.stepsPercent),
        picks,
      ),
      stepsFlat: -topSum(
        rest.map((t) => -t.stepsFlat),
        picks,
      ),
      doubleAction: topSum(
        rest.map((t) => t.doubleAction),
        picks,
      ),
    }));
  });
}

function topSum(values: number[], picks: number): number {
  return values
    .filter((v) => v > 0)
    .sort((a, b) => b - a)
    .slice(0, picks)
    .reduce((total, v) => total + v, 0);
}

function withoutIdlePicks(chosen: Candidate[], setSteps: (set: Candidate[]) => number): Candidate[] {
  const target = setSteps(chosen);
  return chosen.reduce((kept, c) => {
    const without = kept.filter((other) => other !== c);
    return setSteps(without) <= target ? without : kept;
  }, chosen);
}
