import type { GearType } from "@walkscape-community/data-api-client";
import {
  gearCandidate,
  petCandidate,
  situationFor,
  withSetBonuses,
  type GearPick,
  type Situation,
} from "./candidates.js";
import {
  BEST_IN_GAME,
  ownedGear,
  ownedPets,
  skillLevelOf,
  toolSlotsOf,
  type OwnedPetView,
  type PlayerProfile,
} from "./profile.js";
import {
  compareScores,
  goalOf,
  goalScorer,
  goalStats,
  goalValue,
  marginOf,
  type GoalId,
  type Margin,
  type Score,
} from "./goals.js";
import { keywordRules, prune, type KeywordRules } from "./pruning.js";
import { GEAR_SLOTS, slotCapacity } from "./slots.js";
import { fillFreeSlots, type FreeSlotChoice } from "./free-slots.js";
import { bestSet, type SearchResult, type SlotGroup } from "./search.js";
import {
  NO_STATS,
  efficiencyCap,
  stepsPerAction,
  type StatTotals,
  type StepsResult,
  type WorkTarget,
} from "./steps.js";
import type { GearData, LocationView } from "./types.js";

export type { GearPick } from "./candidates.js";

export interface OptimizeTarget extends WorkTarget {
  locationIds: string[];
}

export interface GearSuggestion {
  location: LocationView | null;
  picks: GearPick[];
  pet: OwnedPetView | null;
  totals: StatTotals;
  result: StepsResult;
  goals: GoalId[];
  score: Score;
  margin: Margin | null;
  searchMs: number;
}

type Search = Omit<GearSuggestion, "margin" | "searchMs"> & { ceiling: Score | null };

const SEARCH_STATES = 1000;
const SEARCH_BUDGET_MS = 10_000;
const FEWEST_STEPS_BUDGET_MS = 1_000;
const STATES_GROWTH = 4;
const MAX_SEARCH_STATES = 16_000;
const CLOSE_ENOUGH = 0.01;

export interface SearchLimits {
  maxStates?: number;
  timeBudgetMs?: number;
  checkedGoals?: number;
}

export function optimizeGear(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget,
  goals: GoalId[] = ["steps"],
  { maxStates = SEARCH_STATES, timeBudgetMs = SEARCH_BUDGET_MS, checkedGoals = goals.length }: SearchLimits = {},
): GearSuggestion {
  const start = performance.now();
  const deadline = start + timeBudgetMs;
  const checked = goals.slice(0, checkedGoals);
  const locations = gear.locations.filter((l) => target.locationIds.includes(l.id));
  const plans = distinctLocations(gear, locations).map((location) =>
    planAt(gear, situationFor(gear, profile, target, location, goalStats(goals)), goals),
  );
  let found: Search | null = null;
  for (let limit = maxStates; ; limit *= STATES_GROWTH) {
    found = tightest(found, searchRound(plans, goals, limit, deadline));
    const margin = marginOf(checked, found.score, found.ceiling);
    if (!margin || margin.gap <= CLOSE_ENOUGH || limit >= MAX_SEARCH_STATES || performance.now() >= deadline) {
      const { ceiling: _ceiling, ...best } = found;
      return { ...best, margin, searchMs: Math.round(performance.now() - start) };
    }
  }
}

interface LocationPlan {
  situation: Situation;
  choices: FreeSlotChoice[];
  groups: SlotGroup[];
  rules: KeywordRules;
  useful: number;
  level: number;
  score: (totals: StatTotals) => Score;
  capacityOf: (slot: GearType) => number;
  primaryValue: ((goalStats: number[]) => number) | null;
}

interface LocationProgress {
  plan: LocationPlan;
  searched: SearchResult;
  found: Score;
  firstGoalLimit: number;
}

function searchRound(plans: LocationPlan[], goals: GoalId[], maxStates: number, deadline: number): Search {
  let live: LocationProgress[] = plans.map((plan) => ({
    plan,
    searched: { set: [], ceiling: null },
    found: [],
    firstGoalLimit: Number.POSITIVE_INFINITY,
  }));
  for (const i of goals.keys()) {
    live = live.map((progress) => searchPass(progress, i, goals, maxStates, deadline));
    const leader = live.map((p) => p.found).reduce((a, b) => (compareScores(b, a) > 0 ? b : a));
    live = live.filter((p) => compareScores(higher(p.found, p.searched.ceiling)!, leader) >= 0);
  }
  const searches = live.map((progress) => finish(progress, goals));
  return { ...bestOf(searches), ceiling: searches.map((s) => s.ceiling).reduce(higher) };
}

function searchPass(
  { plan, searched, firstGoalLimit }: LocationProgress,
  i: number,
  goals: GoalId[],
  maxStates: number,
  deadline: number,
): LocationProgress {
  const passScore = (totals: StatTotals) => {
    const [first = 0, ...rest] = plan.score(totals).slice(0, i + 1);
    return [Math.min(first, firstGoalLimit), ...rest];
  };
  const next = bestSet(plan.groups, plan.rules, plan.useful, passScore, {
    seed: searched.set,
    maxStates,
    goalDims: goalStats(goals.slice(0, i + 1)).length,
    primaryValue: plan.primaryValue,
    repair: i === goals.length - 1,
    deadline,
  });
  const found = passScore(withSetBonuses(next.set));
  return {
    plan,
    searched: next,
    found,
    firstGoalLimit: i === 0 ? Math.max(found[0]!, next.ceiling?.[0] ?? Number.NEGATIVE_INFINITY) : firstGoalLimit,
  };
}

function bestOf(searches: Search[]): Search {
  return searches.reduce((a, b) => (compareScores(b.score, a.score) > 0 ? b : a));
}

function tightest(previous: Search | null, next: Search): Search {
  if (!previous) {
    return next;
  }
  const best = compareScores(next.score, previous.score) > 0 ? next : previous;
  return { ...best, ceiling: lower(previous.ceiling, next.ceiling) };
}

function higher(a: Score | null, b: Score | null): Score | null {
  if (!a || !b) {
    return a ?? b;
  }
  return compareScores(a, b) >= 0 ? a : b;
}

function lower(a: Score | null, b: Score | null): Score | null {
  if (!a || !b) {
    return null;
  }
  return compareScores(a, b) <= 0 ? a : b;
}

export function fewestSteps(gear: GearData, target: OptimizeTarget): number {
  return optimizeGear(gear, BEST_IN_GAME, target, ["steps"], { timeBudgetMs: FEWEST_STEPS_BUDGET_MS }).result.steps;
}

function planAt(gear: GearData, situation: Situation, goals: GoalId[]): LocationPlan {
  const { profile, target } = situation;
  const choices = ownedGear(profile, gear.items).map((owned) => ({
    owned,
    candidate: gearCandidate(situation, owned),
  }));
  const items = choices.map((c) => c.candidate);
  const pets = ownedPets(profile, gear.pets).map((pet) => petCandidate(situation, pet));
  const level = skillLevelOf(profile, target.skill);
  const goalScore = goalScorer(goals);
  const score = (totals: StatTotals) => goalScore(stepsPerAction(target, level, totals), totals);
  const useful = usefulEfficiency(target, level);
  const rules = keywordRules(gear.bannedKeywords, [...items, ...pets]);
  const capacityOf = (slot: GearType) => slotCapacity(slot, toolSlotsOf(profile));
  const groups: SlotGroup[] = GEAR_SLOTS.map(({ slot }) => ({
    capacity: capacityOf(slot),
    choices: items.filter((c) => c.slot === slot),
  }))
    .concat({ capacity: 1, choices: pets })
    .map(({ capacity, choices }) => ({
      capacity,
      choices: prune(choices, capacity, rules, useful).sort((a, b) => compareScores(score(b.best), score(a.best))),
    }))
    .filter((group) => group.choices.length > 0);
  const primary = goals[0];
  const primaryValue = primary === undefined || goalOf(primary).stats.length === 0 ? null : goalValue(goals, primary);
  return { situation, choices, groups, rules, useful, level, score, capacityOf, primaryValue };
}

function finish({ plan, searched }: LocationProgress, goals: GoalId[]): Search {
  const { situation, choices, capacityOf, rules, score, level } = plan;
  const chosen = fillFreeSlots(situation, searched.set, choices, capacityOf, rules, score);
  const totals = withSetBonuses(chosen);
  return {
    location: situation.location,
    picks: chosen.flatMap((c) => (c.pick ? [c.pick] : [])),
    pet: chosen.find((c) => c.pet)?.pet ?? null,
    totals,
    result: stepsPerAction(situation.target, level, totals),
    goals,
    score: score(totals),
    ceiling: searched.ceiling,
  };
}

function usefulEfficiency(target: WorkTarget, level: number): number {
  return Math.max(efficiencyCap(target) - (stepsPerAction(target, level, NO_STATS).efficiency - 1), 0);
}

function distinctLocations(gear: GearData, locations: LocationView[]): (LocationView | null)[] {
  if (locations.length === 0) {
    return [null];
  }
  const conditions = [
    ...gear.items.flatMap((i) => [i.stats, ...Object.values(i.tierStats)]),
    ...gear.pets.flatMap((p) => p.levels.map((l) => l.stats)),
  ].flatMap((stats) => stats.flatMap((stat) => stat.conditions));
  const realms = new Set(conditions.flatMap((c) => (c.type === "realm" ? [c.requirement.realm] : [])));
  const keywords = new Set(conditions.flatMap((c) => (c.type === "locationHasKeywords" ? c.requirement.keywords : [])));
  const bySignature = new Map<string, LocationView>();
  for (const location of locations) {
    const signature = JSON.stringify([
      location.realms.filter((r) => realms.has(r)).sort(),
      location.keywords.filter((k) => keywords.has(k)).sort(),
    ]);
    if (!bySignature.has(signature)) {
      bySignature.set(signature, location);
    }
  }
  return [...bySignature.values()];
}
