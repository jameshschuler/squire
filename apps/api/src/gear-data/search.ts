import { itemId, setCount, withSetBonuses, type Candidate } from "./candidates.js";
import { meetsNeeds, type NeedRule } from "./needs.js";
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

// A set still being built. `guaranteed` is the least its stats could be (every harmful set bonus
// counted, no helpful one); `optimistic` adds every helpful set bonus as if it will be met. `used` is
// how many places in the current slot group are filled. `bans` holds the ban-keyword bits of what's
// worn, and `setItems` the distinct items per set group.
export interface PartialSet {
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
  // A set missing gear the activity requires can't be used, so it scores below every usable set.
  const unusable = score(NO_STATS).map(() => Number.NEGATIVE_INFINITY);
  const usable = (set: Candidate[]) => meetsNeeds(set, rules.needs);
  const setScore = (set: Candidate[]) => (usable(set) ? score(withSetBonuses(set)) : unusable);
  const compatible = (chosen: Candidate[], next: Candidate) =>
    !chosen.some((other) => other === next || conflicts(rules, other, next));
  const slots: Slots = {
    groups,
    groupOf: new Map(groups.flatMap((group) => group.choices.map((choice) => [choice, group] as const))),
    compatible,
  };
  const needed = neededStart(slots, rules.needs, (candidate) => score(candidate.best));
  const greedySet = greedy(slots, setScore, needed);
  let best = compareScores(setScore(seed), setScore(greedySet)) > 0 ? seed : greedySet;
  let bestScore = setScore(best);

  // tops[g][i][n]: the best stats any n of group g's items from index i onward could add.
  // rest[g]: the best stats every group from g onward could add when filled.
  // ahead[g][i][n]: tops[g][i][n] plus rest[g + 1], everything a partial set could still add.
  const tops = groups.map(({ choices, capacity }) => topSums(choices, capacity, useful));
  const rest = tops.reduceRight<StatTotals[]>(
    (sums, top, index) => [addStats(top[0]![groups[index]!.capacity]!, sums[0]!), ...sums],
    [NO_STATS],
  );
  const ahead = tops.map((top, index) => top.map((byCount) => byCount.map((sum) => addStats(sum, rest[index + 1]!))));
  const reach = needReach(groups, rules.needs);
  const masks = banMasks(rules);
  const stats = dominanceStats(useful, goalDims);
  const covers = coverage(useful, goalDims, rules);
  let states: PartialSet[] = [emptySet(rules.setGroups.length)];
  let ceiling: Score | null = null;
  const raise = (bound: Score) => {
    ceiling = ceiling && compareScores(ceiling, bound) >= 0 ? ceiling : bound;
  };

  search: for (const [groupIndex, { choices, capacity }] of groups.entries()) {
    states = states.map((state) => ({ ...state, used: 0 }));
    for (const [itemIndex, next] of choices.entries()) {
      // The best score `state` could still reach if items `from` onward in this group, and every later
      // group, are added. A state that can no longer wear enough of some required gear can't win.
      const canMeetNeeds = (state: PartialSet, from: number) =>
        rules.needs.every(
          (need, needIndex) =>
            state.setItems[need.group]!.length + reach(needIndex, groupIndex, from, capacity - state.used) >=
            need.count,
        );
      const bound = (state: PartialSet, from: number) =>
        canMeetNeeds(state, from)
          ? score(addStats(state.optimistic, ahead[groupIndex]![from]![capacity - state.used]!))
          : unusable;

      // Out of time: every unfinished partial set might still have led to the best set, so their
      // bounds join the ceiling and the margin stays honest.
      if (performance.now() > deadline) {
        states.forEach((state) => raise(bound(state, itemIndex)));
        break search;
      }

      const nextBans = masks(next);
      const nextGroups = new Set(setGroupsOf(rules, next));
      const grown = states.flatMap((state) =>
        state.used < capacity && !clashes(state.bans, nextBans) ? [grow(state, next, nextBans, nextGroups)] : [],
      );
      const bounded = (state: PartialSet) => ({ state, bound: bound(state, itemIndex + 1) });
      const promising = (list: PartialSet[]) =>
        list.map(bounded).filter(({ bound }) => compareScores(bound, bestScore) > 0);
      const [old, added] = [promising(states), promising(grown)];
      const merge = (base: Scored[], more: Scored[]) => {
        const signed = withSignatures([...base, ...more], stats);

        return frontier(signed.slice(0, base.length), signed.slice(base.length), covers);
      };

      // Old states were already compared with each other, so only new ones need comparing, except at
      // the start of a group, where resetting `used` can make one old state dominate another.
      const kept: Scored[] =
        itemIndex === 0 ? merge([], [...old, ...added]) : added.length > 0 ? merge(old, added) : old;

      // Keep the most promising; the best bound among those cut is the highest any of them could reach.
      if (kept.length > maxStates) {
        kept.sort((left, right) => compareScores(right.bound, left.bound));
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

  // Repair could strip an unusable set down to nothing, since every unusable set scores the same.
  if (!repair || !usable(best)) {
    return { set: best, ceiling };
  }

  // Swap repair fixes small misses the search can make while cutting. When the first priority isn't
  // speed, it also starts from a greedy set built for that priority alone. Both stop at the deadline.
  const starts =
    primaryValue === null || performance.now() > deadline
      ? [best]
      : [
          best,
          greedy(
            slots,
            (set) => [primaryValue(set.reduce((sum, candidate) => addStats(sum, candidate.best), NO_STATS).goalStats)],
            needed,
          ),
        ];
  const winner = starts
    .map((start) => improveBySwaps(slots, start, setScore, deadline))
    .reduce((leader, next) => (compareScores(setScore(next), setScore(leader)) > 0 ? next : leader));

  return { set: withoutIdlePicks(winner, setScore), ceiling };
}

// The slot groups, which group each candidate is in, and whether a candidate can join a set: what
// the greedy start, swap repair and the needed-gear start all work with.
interface Slots {
  groups: SlotGroup[];
  groupOf: Map<Candidate, SlotGroup>;
  compatible: (chosen: Candidate[], next: Candidate) => boolean;
}

// Tries every single change (add an item, or swap one for another in the same group) and keeps the
// best one in each group that raises the score, sweeping again until a full sweep finds nothing better.
function improveBySwaps(
  slots: Slots,
  start: Candidate[],
  setScore: (set: Candidate[]) => Score,
  deadline: number,
): Candidate[] {
  let best = start;

  for (let improved = true; improved && performance.now() <= deadline;) {
    const before = best;

    for (const group of slots.groups) {
      best = bestChangeIn(slots, group, best, setScore);
    }

    improved = best !== before;
  }

  return best;
}

// The best set one change in `group` away from `best`: one of its items added, or swapped in for one
// already worn from it. Returns `best` itself when no change scores higher.
function bestChangeIn(
  { groupOf, compatible }: Slots,
  group: SlotGroup,
  best: Candidate[],
  setScore: (set: Candidate[]) => Score,
): Candidate[] {
  const inGroup = best.filter((candidate) => groupOf.get(candidate) === group);
  const bases = [
    ...(inGroup.length < group.capacity ? [best] : []),
    ...inGroup.map((out) => best.filter((candidate) => candidate !== out)),
  ];
  const trials = bases.flatMap((base) =>
    group.choices.filter((next) => compatible(base, next)).map((next) => [...base, next]),
  );

  return trials.reduce(
    (winner, trial) => {
      const score = setScore(trial);

      return compareScores(score, winner.score) > 0 ? { set: trial, score } : winner;
    },
    { set: best, score: setScore(best) },
  ).set;
}

// Keeps adding whichever item raises the score most until none does. Fast and usually close; it gives
// the search a good set to beat from the start.
function greedy(
  { groups, groupOf, compatible }: Slots,
  setScore: (set: Candidate[]) => Score,
  start: Candidate[],
): Candidate[] {
  let chosen = start;
  let current = setScore(chosen);

  for (;;) {
    const used = new Map<SlotGroup, number>();

    for (const candidate of chosen) {
      const group = groupOf.get(candidate)!;

      used.set(group, (used.get(group) ?? 0) + 1);
    }

    const options = groups.flatMap((group) =>
      (used.get(group) ?? 0) < group.capacity ? group.choices.filter((choice) => compatible(chosen, choice)) : [],
    );
    const top = options
      .map((option) => ({ candidate: option, score: setScore([...chosen, option]) }))
      .reduce<{ candidate: Candidate; score: Score } | undefined>(
        (best, next) => (!best || compareScores(next.score, best.score) > 0 ? next : best),
        undefined,
      );

    if (!top || compareScores(top.score, current) <= 0) {
      return chosen;
    }

    chosen = [...chosen, top.candidate];
    current = top.score;
  }
}

// The best items that fill each need, until each has enough different items, so greedy starts from a
// set the activity allows.
function neededStart(
  { groupOf, compatible }: Slots,
  needs: NeedRule[],
  value: (candidate: Candidate) => Score,
): Candidate[] {
  const fits = (chosen: Candidate[], next: Candidate) => {
    const group = groupOf.get(next)!;

    return (
      compatible(chosen, next) && chosen.filter((candidate) => groupOf.get(candidate) === group).length < group.capacity
    );
  };

  const addFor = (chosen: Candidate[], { keyword, count }: NeedRule) =>
    [...groupOf.keys()]
      .filter((candidate) => candidate.keywords.includes(keyword))
      .sort((left, right) => compareScores(value(right), value(left)))
      .reduce((set, candidate) => {
        const short = setCount(set, [keyword]) < count;
        const adds = setCount([...set, candidate], [keyword]) > setCount(set, [keyword]);

        return short && adds && fits(set, candidate) ? [...set, candidate] : set;
      }, chosen);

  return needs.reduce(addFor, []);
}

// How many more items that fill need `k` a partial set could still add from item `from` of group `g`
// onward, with `free` places left in group g. Copies count separately, so this never undercounts.
function needReach(
  groups: SlotGroup[],
  needs: NeedRule[],
): (k: number, g: number, from: number, free: number) => number {
  const fillers = needs.map(({ keyword }) => groups.map(({ choices }) => fillersFrom(choices, keyword)));
  const later = fillers.map((byGroup) =>
    byGroup.reduceRight<number[]>(
      (sums, counts, index) => [Math.min(groups[index]!.capacity, counts[0]!) + sums[0]!, ...sums],
      [0],
    ),
  );

  return (needIndex, groupIndex, from, free) =>
    Math.min(free, fillers[needIndex]![groupIndex]![from]!) + later[needIndex]![groupIndex + 1]!;
}

// counts[i]: how many of choices i onward carry the keyword.
function fillersFrom(choices: Candidate[], keyword: string): number[] {
  return choices.reduceRight<number[]>(
    (counts, choice) => [counts[0]! + (choice.keywords.includes(keyword) ? 1 : 0), ...counts],
    [0],
  );
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

function grow(state: PartialSet, next: Candidate, nextBans: BanMasks, groups: Set<number>): PartialSet {
  return {
    chosen: [...state.chosen, next],
    guaranteed: addStats(state.guaranteed, next.worst),
    optimistic: addStats(state.optimistic, next.best),
    used: state.used + 1,
    bans: state.bans | nextBans.keys,
    setItems: state.setItems.map((ids, index) => (groups.has(index) ? [...new Set([...ids, itemId(next)])] : ids)),
  };
}

// A partial set with its bound.
interface Scored {
  state: PartialSet;
  bound: Score;
}

// Plus signatures of the state's guaranteed and optimistic stats; see withSignatures.
interface Bounded extends Scored {
  haveBits: number;
  couldBits: number;
}

// The stats dominance compares, each turned so that higher is better and capped where more stops helping.
function dominanceStats(useful: number, goalDims: number): ((totals: StatTotals) => number)[] {
  return [
    (totals) => Math.min(totals.workEfficiency, useful),
    (totals) => -totals.stepsPercent,
    (totals) => -totals.stepsFlat,
    (totals) => Math.min(totals.doubleAction, MAX_DOUBLE_ACTION),
    ...Array.from({ length: goalDims }, (_, index) => (totals: StatTotals) => totals.goalStats[index] ?? 0),
  ];
}

// 30 bits keeps signatures small integers, which V8 stores and compares fastest.
const SIGNATURE_BITS = 30;

// Almost no pair of partial sets is a dominance match, so a quick test that rules most pairs out saves
// most of the work. Each stat gets a few levels, spread through the optimistic values in this list, and a
// signature has one bit per level the stats reach. If a's guaranteed stats are each at least b's
// optimistic ones, every bit in b's optimistic signature is in a's guaranteed one, so frontier
// only calls `covers` for pairs that pass that bitwise check.
function withSignatures(entries: Scored[], stats: ((t: StatTotals) => number)[]): Bounded[] {
  const perStat = Math.floor(SIGNATURE_BITS / stats.length);
  const levels = stats.flatMap((stat) => {
    const values = entries.map(({ state }) => stat(state.optimistic)).sort((left, right) => left - right);
    const at = Array.from(
      { length: perStat },
      (_, level) => values[Math.floor(((level + 1) * values.length) / (perStat + 1))],
    );

    return [...new Set(at)].flatMap((value) => (value === undefined ? [] : [{ stat, value }]));
  });
  const bitsOf = (totals: StatTotals) =>
    levels.reduce((bits, { stat, value }, index) => (stat(totals) >= value ? bits | (1 << index) : bits), 0);

  return entries.map((entry) => ({
    ...entry,
    haveBits: bitsOf(entry.state.guaranteed),
    couldBits: bitsOf(entry.state.optimistic),
  }));
}

// a covers b when anything b could become, a could become at least as well: a's guaranteed stats are
// at least b's optimistic ones, a has no more places used, a's bans are a subset of b's, and a has at
// least as many set pieces. A set group with a "fewer than N pieces" bonus must match exactly, since more
// pieces can hurt. Pieces past a group's cap (the most any bonus or need asks for) change nothing, so
// counts are compared only up to it.
export function coverage(
  useful: number,
  goalDims: number,
  { cappedSetGroups, pieceCaps }: KeywordRules,
): (a: PartialSet, b: PartialSet) => boolean {
  return (state, other) => {
    const have = state.guaranteed;
    const could = other.optimistic;

    if (
      state.used > other.used ||
      have.stepsPercent > could.stepsPercent ||
      have.stepsFlat > could.stepsFlat ||
      Math.min(have.workEfficiency, useful) < Math.min(could.workEfficiency, useful) ||
      Math.min(have.doubleAction, MAX_DOUBLE_ACTION) < Math.min(could.doubleAction, MAX_DOUBLE_ACTION) ||
      (state.bans & ~other.bans) !== 0n
    ) {
      return false;
    }

    for (let index = 0; index < goalDims; index++) {
      if ((have.goalStats[index] ?? 0) < (could.goalStats[index] ?? 0)) {
        return false;
      }
    }

    return state.setItems.every((ids, index) => {
      const otherCount = other.setItems[index]!.length;
      const cap = pieceCaps[index]!;

      return cappedSetGroups.has(index)
        ? ids.length === otherCount
        : Math.min(ids.length, cap) >= Math.min(otherCount, cap);
    });
  };
}

// Adds `added` to `kept` (already free of dominated states), dropping any state another one covers.
// This runs for every pair of partial sets, so signatures sit in plain arrays next to the list and are
// checked before `covers`.
function frontier(kept: Bounded[], added: Bounded[], covers: (a: PartialSet, b: PartialSet) => boolean): Bounded[] {
  const result = [...kept];
  const haves = result.map((entry) => entry.haveBits);
  const coulds = result.map((entry) => entry.couldBits);

  for (const entry of added) {
    if (isCovered(result, haves, entry, covers)) {
      continue;
    }

    for (let index = result.length - 1; index >= 0; index--) {
      if ((coulds[index]! & ~entry.haveBits) === 0 && covers(entry.state, result[index]!.state)) {
        result.splice(index, 1);
        haves.splice(index, 1);
        coulds.splice(index, 1);
      }
    }

    result.push(entry);
    haves.push(entry.haveBits);
    coulds.push(entry.couldBits);
  }

  return result;
}

function isCovered(
  list: Bounded[],
  haves: number[],
  entry: Bounded,
  covers: (a: PartialSet, b: PartialSet) => boolean,
): boolean {
  for (let index = 0; index < list.length; index++) {
    if ((entry.couldBits & ~haves[index]!) === 0 && covers(list[index]!.state, entry.state)) {
      return true;
    }
  }

  return false;
}

// For each starting index and pick count, the best total of each stat on its own. One item can't give
// the best of everything at once, so this overshoots, which is what makes it a safe bound.
function topSums(choices: Candidate[], capacity: number, useful: number): StatTotals[][] {
  const goalCount = Math.max(0, ...choices.map((choice) => choice.best.goalStats.length));

  return Array.from({ length: choices.length + 1 }, (_, start) => {
    const rest = choices.slice(start).map((choice) => choice.best);
    const best = (value: (totals: StatTotals) => number, picks: number) => topSum(rest.map(value), picks);

    return Array.from({ length: capacity + 1 }, (_, picks) => ({
      workEfficiency: Math.min(
        best((totals) => totals.workEfficiency, picks),
        useful,
      ),
      stepsPercent: -best((totals) => -totals.stepsPercent, picks),
      stepsFlat: -best((totals) => -totals.stepsFlat, picks),
      doubleAction: best((totals) => totals.doubleAction, picks),
      goalStats: Array.from({ length: goalCount }, (_, index) => best((totals) => totals.goalStats[index] ?? 0, picks)),
    }));
  });
}

export function topSum(values: number[], picks: number): number {
  return values
    .filter((value) => value > 0)
    .sort((left, right) => right - left)
    .slice(0, picks)
    .reduce((total, value) => total + value, 0);
}

function withoutIdlePicks(chosen: Candidate[], setScore: (set: Candidate[]) => Score): Candidate[] {
  const target = setScore(chosen);

  return chosen.reduce((kept, candidate) => {
    const without = kept.filter((other) => other !== candidate);

    return compareScores(setScore(without), target) >= 0 ? without : kept;
  }, chosen);
}
