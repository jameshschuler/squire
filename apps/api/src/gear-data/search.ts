import { itemId, withSetBonuses, type Candidate } from "./candidates.js";
import { banMasks, clashes, conflicts, setGroupsOf, type BanMasks, type KeywordRules } from "./pruning.js";
import { compareScores, type Score } from "./goals.js";
import { MAX_DOUBLE_ACTION, NO_STATS, addStats, type StatTotals } from "./steps.js";

export interface SearchOptions {
  seed: Candidate[];
  maxStates: number;
  goalDims: number;
  primaryValue: ((goalStats: number[]) => number) | null;
  repair: boolean;
}

export interface SearchResult {
  set: Candidate[];
  ceiling: Score | null;
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
  bans: bigint;
  setItems: string[][];
}

export function bestSet(
  groups: SlotGroup[],
  rules: KeywordRules,
  useful: number,
  score: (totals: StatTotals) => Score,
  { seed, maxStates, goalDims, primaryValue, repair }: SearchOptions,
): SearchResult {
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
  const masks = banMasks(rules);
  const covers = coverage(useful, goalDims, rules.cappedSetGroups);
  let states: PartialSet[] = [emptySet(rules.setGroups.length)];
  let ceiling: Score | null = null;
  groups.forEach(({ choices, capacity }, g) => {
    states = states.map((state) => ({ ...state, used: 0 }));
    choices.forEach((next, i) => {
      const nextBans = masks(next);
      const nextGroups = setGroupsOf(rules, next);
      const grown = states.flatMap((state) =>
        state.used < capacity && !clashes(state.bans, nextBans) ? [grow(state, next, nextBans, nextGroups)] : [],
      );
      const remaining = (state: PartialSet) => addStats(tops[g]![i + 1]![capacity - state.used]!, rest[g + 1]!);
      const bounded = (state: PartialSet) => ({ state, bound: score(addStats(state.optimistic, remaining(state))) });
      const promising = (list: PartialSet[]) =>
        list.map(bounded).filter(({ bound }) => compareScores(bound, bestScore) > 0);
      const kept =
        i === 0
          ? frontier([], [...promising(states), ...promising(grown)], covers)
          : frontier(promising(states), promising(grown), covers);
      if (kept.length > maxStates) {
        kept.sort((a, b) => compareScores(b.bound, a.bound));
        const cut = kept[maxStates]!.bound;
        ceiling = ceiling && compareScores(ceiling, cut) >= 0 ? ceiling : cut;
      }
      states = kept.slice(0, maxStates).map(({ state }) => state);
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
    return { set: best, ceiling };
  }
  const starts =
    primaryValue === null
      ? [best]
      : [
          best,
          greedy(groups, compatible, (set) => [
            primaryValue(set.reduce((sum, c) => addStats(sum, c.best), NO_STATS).goalStats),
          ]),
        ];
  const winner = starts
    .map((start) => improveBySwaps(groups, start, compatible, setScore))
    .reduce((a, b) => (compareScores(setScore(b), setScore(a)) > 0 ? b : a));
  return { set: withoutIdlePicks(winner, setScore), ceiling };
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
    bans: 0n,
    setItems: Array.from({ length: setGroupCount }, () => []),
  };
}

function grow(state: PartialSet, next: Candidate, nextBans: BanMasks, groups: number[]): PartialSet {
  return {
    chosen: [...state.chosen, next],
    guaranteed: addStats(state.guaranteed, next.totals),
    optimistic: addStats(state.optimistic, next.best),
    used: state.used + 1,
    bans: state.bans | nextBans.keys,
    setItems: state.setItems.map((ids, i) => (groups.includes(i) ? [...new Set([...ids, itemId(next)])] : ids)),
  };
}

interface Bounded {
  state: PartialSet;
  bound: Score;
}

function coverage(
  useful: number,
  goalDims: number,
  cappedSetGroups: Set<number>,
): (a: PartialSet, b: PartialSet) => boolean {
  return (a, b) => {
    const have = a.guaranteed;
    const could = b.optimistic;
    if (
      a.used > b.used ||
      have.stepsPercent > could.stepsPercent ||
      have.stepsFlat > could.stepsFlat ||
      Math.min(have.workEfficiency, useful) < Math.min(could.workEfficiency, useful) ||
      Math.min(have.doubleAction, MAX_DOUBLE_ACTION) < Math.min(could.doubleAction, MAX_DOUBLE_ACTION) ||
      (a.bans & ~b.bans) !== 0n
    ) {
      return false;
    }
    for (let i = 0; i < goalDims; i++) {
      if ((have.goalStats[i] ?? 0) < (could.goalStats[i] ?? 0)) {
        return false;
      }
    }
    return a.setItems.every((ids, i) => {
      const other = b.setItems[i]!.length;
      return cappedSetGroups.has(i) ? ids.length === other : ids.length >= other;
    });
  };
}

function frontier(kept: Bounded[], added: Bounded[], covers: (a: PartialSet, b: PartialSet) => boolean): Bounded[] {
  const result = [...kept];
  for (const entry of added) {
    if (result.some((other) => covers(other.state, entry.state))) {
      continue;
    }
    for (let i = result.length - 1; i >= 0; i--) {
      if (covers(entry.state, result[i]!.state)) {
        result.splice(i, 1);
      }
    }
    result.push(entry);
  }
  return result;
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
