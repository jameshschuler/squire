import { itemId, withSetBonuses, type Candidate } from "./candidates.js";
import { conflicts, setGroupsOf, type KeywordRules } from "./pruning.js";
import { compareScores, type Score } from "./goals.js";
import { MAX_DOUBLE_ACTION, NO_STATS, addStats, type StatTotals } from "./steps.js";

export interface SearchOptions {
  seed: Candidate[];
  maxStates: number;
  goalDims: number;
  statFirst: number | null;
  repair: boolean;
}

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
  score: (totals: StatTotals) => Score,
  { seed, maxStates, goalDims, statFirst, repair }: SearchOptions,
): Candidate[] {
  const setScore = (set: Candidate[]) => score(withSetBonuses(set));
  const compatible = (chosen: Candidate[], next: Candidate) =>
    !chosen.some((other) => other === next || conflicts(rules, other, next));
  const greedySet = greedy(groups, compatible, setScore);
  let best = compareScores(setScore(seed), setScore(greedySet)) > 0 ? seed : greedySet;
  let bestScore = setScore(best);

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
      const promising = [...states, ...grown].filter(
        (state) => compareScores(score(addStats(state.optimistic, remaining(state))), bestScore) > 0,
      );
      const kept = frontier(promising, useful, goalDims);
      states =
        kept.length > maxStates
          ? kept
              .map((state) => ({ state, bound: score(addStats(state.optimistic, remaining(state))) }))
              .sort((a, b) => compareScores(b.bound, a.bound))
              .slice(0, maxStates)
              .map(({ state }) => state)
          : kept;
    });
  });
  for (const { chosen } of states) {
    const candidateScore = setScore(chosen);
    if (compareScores(candidateScore, bestScore) > 0) {
      best = chosen;
      bestScore = candidateScore;
    }
  }
  if (!repair) {
    return best;
  }
  const starts =
    statFirst === null
      ? [best]
      : [
          best,
          greedy(groups, compatible, (set) => [set.reduce((sum, c) => sum + (c.best.goalStats[statFirst] ?? 0), 0)]),
        ];
  const winner = starts
    .map((start) => improveBySwaps(groups, start, compatible, setScore))
    .reduce((a, b) => (compareScores(setScore(b), setScore(a)) > 0 ? b : a));
  return withoutIdlePicks(winner, setScore);
}

function improveBySwaps(
  groups: SlotGroup[],
  start: Candidate[],
  compatible: (chosen: Candidate[], next: Candidate) => boolean,
  setScore: (set: Candidate[]) => Score,
): Candidate[] {
  let best = start;
  let bestScore = setScore(best);
  for (let improved = true; improved;) {
    improved = false;
    for (const { capacity, choices } of groups) {
      const inGroup = best.filter((c) => choices.includes(c));
      const options = [
        ...(inGroup.length < capacity ? [best] : []),
        ...inGroup.map((out) => best.filter((c) => c !== out)),
      ];
      for (const base of options) {
        for (const next of choices) {
          if (!compatible(base, next)) {
            continue;
          }
          const trial = [...base, next];
          const trialScore = setScore(trial);
          if (compareScores(trialScore, bestScore) > 0) {
            best = trial;
            bestScore = trialScore;
            improved = true;
          }
        }
      }
    }
  }
  return best;
}

function greedy(
  groups: SlotGroup[],
  compatible: (chosen: Candidate[], next: Candidate) => boolean,
  setScore: (set: Candidate[]) => Score,
): Candidate[] {
  let chosen: Candidate[] = [];
  let current = setScore(chosen);
  for (;;) {
    const options = groups.flatMap(({ capacity, choices }) =>
      chosen.filter((c) => choices.includes(c)).length < capacity ? choices.filter((c) => compatible(chosen, c)) : [],
    );
    const top = options
      .map((c) => ({ c, score: setScore([...chosen, c]) }))
      .reduce<{ c: Candidate; score: Score } | undefined>(
        (a, b) => (!a || compareScores(b.score, a.score) > 0 ? b : a),
        undefined,
      );
    if (!top || compareScores(top.score, current) <= 0) {
      return chosen;
    }
    chosen = [...chosen, top.c];
    current = top.score;
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

function frontier(states: PartialSet[], useful: number, goalDims: number): PartialSet[] {
  const covers = (a: PartialSet, b: PartialSet) =>
    Math.min(a.guaranteed.workEfficiency, useful) >= Math.min(b.optimistic.workEfficiency, useful) &&
    a.guaranteed.stepsPercent <= b.optimistic.stepsPercent &&
    a.guaranteed.stepsFlat <= b.optimistic.stepsFlat &&
    Math.min(a.guaranteed.doubleAction, MAX_DOUBLE_ACTION) >= Math.min(b.optimistic.doubleAction, MAX_DOUBLE_ACTION) &&
    a.used <= b.used &&
    a.bans.every((k) => b.bans.includes(k)) &&
    a.setItems.every((ids, i) => ids.length >= b.setItems[i]!.length) &&
    b.optimistic.goalStats.slice(0, goalDims).every((value, i) => (a.guaranteed.goalStats[i] ?? 0) >= value);
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
  const goalCount = Math.max(0, ...choices.map((c) => c.best.goalStats.length));
  return Array.from({ length: choices.length + 1 }, (_, start) => {
    const rest = choices.slice(start).map((c) => c.best);
    const best = (value: (totals: StatTotals) => number, picks: number) => topSum(rest.map(value), picks);
    return Array.from({ length: capacity + 1 }, (_, picks) => ({
      workEfficiency: Math.min(
        best((t) => t.workEfficiency, picks),
        useful,
      ),
      stepsPercent: -best((t) => -t.stepsPercent, picks),
      stepsFlat: -best((t) => -t.stepsFlat, picks),
      doubleAction: best((t) => t.doubleAction, picks),
      goalStats: Array.from({ length: goalCount }, (_, i) => best((t) => t.goalStats[i] ?? 0, picks)),
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

function withoutIdlePicks(chosen: Candidate[], setScore: (set: Candidate[]) => Score): Candidate[] {
  const target = setScore(chosen);
  return chosen.reduce((kept, c) => {
    const without = kept.filter((other) => other !== c);
    return compareScores(setScore(without), target) >= 0 ? without : kept;
  }, chosen);
}
