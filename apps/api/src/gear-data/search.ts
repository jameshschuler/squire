import { itemId, withSetBonuses, type Candidate } from "./candidates.js";
import { banMasks, clashes, conflicts, setGroupsOf, type BanMasks, type KeywordRules } from "./pruning.js";
import { compareScores, type Score } from "./goals.js";
import { MAX_DOUBLE_ACTION, NO_STATS, addStats, type StatTotals } from "./steps.js";

export interface SearchOptions {
  // A set to beat from the start, usually the previous pass's answer.
  seed: Candidate[];
  // How many partial sets to keep; past this the lowest bounds are cut.
  maxStates: number;
  // How many goal stats this pass scores, so dominance only compares those.
  goalDims: number;
  // The first priority's value from goal stats alone, for a second greedy start; null when it's "Fastest".
  primaryValue: ((goalStats: number[]) => number) | null;
  // Run swap repair and drop idle items (only on the last pass).
  repair: boolean;
  // A performance.now() time; the search stops at the next item past it.
  deadline: number;
}

export interface SearchResult {
  set: Candidate[];
  // No set the search cut short can score above this. Null means nothing was cut: the set is the best.
  ceiling: Score | null;
}

export interface SlotGroup {
  capacity: number;
  choices: Candidate[];
}

// A set still being built. `guaranteed` counts only stats that always apply; `optimistic` adds every
// helpful set bonus as if it will be met. `used` is how many places in the current slot group are filled.
// `bans` holds the ban-keyword bits of what's worn, and `setItems` the distinct items per set group.
interface PartialSet {
  chosen: Candidate[];
  guaranteed: StatTotals;
  optimistic: StatTotals;
  used: number;
  bans: bigint;
  setItems: string[][];
}

// Finds the best set for one location and one scoring pass. Walks the slot groups one item at a time,
// keeping partial sets that could still win: a partial set is dropped when its best possible score
// (its bound) can't beat the best set so far, when another partial set dominates it, or when the
// list outgrows `maxStates`. Only that cut, or stopping at the deadline, can lose the best set, so the
// highest bound either one drops is returned as the ceiling. See README.md for why bounds and dominance are safe.
export function bestSet(
  groups: SlotGroup[],
  rules: KeywordRules,
  useful: number,
  score: (totals: StatTotals) => Score,
  { seed, maxStates, goalDims, primaryValue, repair, deadline }: SearchOptions,
): SearchResult {
  const setScore = (set: Candidate[]) => score(withSetBonuses(set));
  const compatible = (chosen: Candidate[], next: Candidate) =>
    !chosen.some((other) => other === next || conflicts(rules, other, next));
  const greedySet = greedy(groups, compatible, setScore);
  let best = compareScores(setScore(seed), setScore(greedySet)) > 0 ? seed : greedySet;
  let bestScore = setScore(best);

  // tops[g][i][n]: the best stats any n of group g's items from index i onward could add.
  // rest[g]: the best stats every group from g onward could add when filled.
  const tops = groups.map(({ choices, capacity }) => topSums(choices, capacity, useful));
  const rest = tops.reduceRight<StatTotals[]>(
    (sums, top, g) => [addStats(top[0]![groups[g]!.capacity]!, sums[0]!), ...sums],
    [NO_STATS],
  );
  const masks = banMasks(rules);
  const covers = coverage(useful, goalDims, rules.cappedSetGroups);
  let states: PartialSet[] = [emptySet(rules.setGroups.length)];
  let ceiling: Score | null = null;
  const raise = (bound: Score) => {
    ceiling = ceiling && compareScores(ceiling, bound) >= 0 ? ceiling : bound;
  };
  search: for (const [g, { choices, capacity }] of groups.entries()) {
    states = states.map((state) => ({ ...state, used: 0 }));
    for (const [i, next] of choices.entries()) {
      // The best score `state` could still reach if items `from` onward in this group, and every later group, are added.
      const bound = (state: PartialSet, from: number) =>
        score(addStats(state.optimistic, addStats(tops[g]![from]![capacity - state.used]!, rest[g + 1]!)));
      // Out of time: every unfinished partial set might still have led to the best set, so their
      // bounds join the ceiling and the margin stays honest.
      if (performance.now() > deadline) {
        states.forEach((state) => raise(bound(state, i)));
        break search;
      }
      const nextBans = masks(next);
      const nextGroups = setGroupsOf(rules, next);
      const grown = states.flatMap((state) =>
        state.used < capacity && !clashes(state.bans, nextBans) ? [grow(state, next, nextBans, nextGroups)] : [],
      );
      const bounded = (state: PartialSet) => ({ state, bound: bound(state, i + 1) });
      const promising = (list: PartialSet[]) =>
        list.map(bounded).filter(({ bound }) => compareScores(bound, bestScore) > 0);
      // Old states were already compared with each other, so only new ones need comparing, except at
      // the start of a group, where resetting `used` can make one old state dominate another.
      const kept =
        i === 0
          ? frontier([], [...promising(states), ...promising(grown)], covers)
          : frontier(promising(states), promising(grown), covers);
      // Keep the most promising; the best bound among those cut is the highest any of them could reach.
      if (kept.length > maxStates) {
        kept.sort((a, b) => compareScores(b.bound, a.bound));
        raise(kept[maxStates]!.bound);
      }
      states = kept.slice(0, maxStates).map(({ state }) => state);
    }
  }
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
  // Swap repair fixes small misses the search can make while cutting. When the first priority isn't
  // speed, it also starts from a greedy set built for that priority alone.
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

// Tries every single change (add an item, or swap one for another in the same group) and keeps any that
// raises the score, sweeping again until a full sweep finds nothing better.
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

// Keeps adding whichever item raises the score most until none does. Fast and usually close; it gives
// the search a good set to beat from the start.
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

// a covers b when anything b could become, a could become at least as well: a's guaranteed stats are
// at least b's optimistic ones, a has no more places used, a's bans are a subset of b's, and a has at
// least as many set pieces. A set group with a "fewer than N pieces" bonus must match exactly, since more pieces can hurt.
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

// Adds `added` to `kept` (already free of dominated states), dropping any state another one covers.
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

// For each starting index and pick count, the best total of each stat on its own. One item can't give
// the best of everything at once, so this overshoots, which is what makes it a safe bound.
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

export function topSum(values: number[], picks: number): number {
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
