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
import { compareScores, goalOf, goalScorer, goalStats, goalValue, type GoalId, type Score } from "./goals.js";
import { keywordRules, prune } from "./pruning.js";
import { GEAR_SLOTS, slotCapacity } from "./slots.js";
import { fillFreeSlots } from "./free-slots.js";
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
  proven: boolean;
  searchMs: number;
}

type LocationSearch = Omit<GearSuggestion, "proven" | "searchMs"> & { ceiling: Score | null };

const SEARCH_STATES = 1000;
const SEARCH_BUDGET_MS = 10_000;
const STATES_GROWTH = 4;

export interface SearchLimits {
  maxStates?: number;
  timeBudgetMs?: number;
}

export function optimizeGear(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget,
  goals: GoalId[] = ["steps"],
  { maxStates = SEARCH_STATES, timeBudgetMs = SEARCH_BUDGET_MS }: SearchLimits = {},
): GearSuggestion {
  const start = performance.now();
  for (let limit = maxStates; ; limit *= STATES_GROWTH) {
    const roundStart = performance.now();
    const suggestion = optimizeWithin(gear, profile, target, goals, limit);
    const now = performance.now();
    if (suggestion.proven || now - start + (now - roundStart) * STATES_GROWTH ** 2 >= timeBudgetMs) {
      return { ...suggestion, searchMs: Math.round(now - start) };
    }
  }
}

function optimizeWithin(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget,
  goals: GoalId[],
  maxStates: number,
): Omit<GearSuggestion, "searchMs"> {
  const locations = gear.locations.filter((l) => target.locationIds.includes(l.id));
  const searches = distinctLocations(gear, locations).map((location) =>
    optimizeAt(gear, situationFor(gear, profile, target, location, goalStats(goals)), goals, maxStates),
  );
  const { ceiling: _ceiling, ...best } = searches.reduce((a, b) => (compareScores(b.score, a.score) > 0 ? b : a));
  const proven = searches.every(({ ceiling }) => ceiling === null || compareScores(best.score, ceiling) >= 0);
  return { ...best, proven };
}

export function fewestSteps(gear: GearData, target: OptimizeTarget): number {
  return optimizeGear(gear, BEST_IN_GAME, target, ["steps"], { timeBudgetMs: 0 }).result.steps;
}

function optimizeAt(gear: GearData, situation: Situation, goals: GoalId[], maxStates: number): LocationSearch {
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
  const searched = goals.reduce<SearchResult>(
    ({ set }, _, i) =>
      bestSet(groups, rules, useful, (totals) => score(totals).slice(0, i + 1), {
        seed: set,
        maxStates,
        goalDims: goalStats(goals.slice(0, i + 1)).length,
        primaryValue,
        repair: i === goals.length - 1,
      }),
    { set: [], ceiling: null },
  );
  const chosen = fillFreeSlots(situation, searched.set, choices, capacityOf, rules, score);
  const totals = withSetBonuses(chosen);
  return {
    location: situation.location,
    picks: chosen.flatMap((c) => (c.pick ? [c.pick] : [])),
    pet: chosen.find((c) => c.pet)?.pet ?? null,
    totals,
    result: stepsPerAction(target, level, totals),
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
