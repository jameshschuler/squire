import type { GearType } from "@walkscape-community/data-api-client";
import {
  gearCandidate,
  type Candidate,
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
import { compareScores, goalOf, goalScorer, goalStats, type GoalId, type Score } from "./goals.js";
import { keywordRules, prune } from "./pruning.js";
import { GEAR_SLOTS } from "./slots.js";
import { fillFreeSlots } from "./free-slots.js";
import { bestSet, type SlotGroup } from "./search.js";
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
}

const SEARCH_STATES = 300;

export function optimizeGear(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget,
  goals: GoalId[] = ["steps"],
): GearSuggestion {
  const locations = gear.locations.filter((l) => target.locationIds.includes(l.id));
  return distinctLocations(gear, locations)
    .map((location) => optimizeAt(gear, situationFor(gear, profile, target, location, goalStats(goals)), goals))
    .reduce((best, next) => (compareScores(next.score, best.score) > 0 ? next : best));
}

export function fewestSteps(gear: GearData, target: OptimizeTarget): number {
  return optimizeGear(gear, BEST_IN_GAME, target).result.steps;
}

function optimizeAt(gear: GearData, situation: Situation, goals: GoalId[]): GearSuggestion {
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
  const capacities = new Map(
    GEAR_SLOTS.map(({ slot, capacity }) => [slot, slot === "tool" ? toolSlotsOf(profile) : capacity]),
  );
  const capacityOf = (slot: GearType) => capacities.get(slot)!;
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

  const primaryIsSteps = goals[0] === undefined || goalOf(goals[0]).stat === null;
  const searched = goals.reduce<Candidate[]>(
    (seed, _, i) =>
      bestSet(groups, rules, useful, (totals) => score(totals).slice(0, i + 1), {
        seed,
        maxStates: SEARCH_STATES,
        goalDims: goalStats(goals.slice(0, i + 1)).length,
        statFirst: primaryIsSteps ? null : 0,
        repair: i === goals.length - 1,
      }),
    [],
  );
  const chosen = fillFreeSlots(situation, searched, choices, capacityOf, rules, score);
  const totals = withSetBonuses(chosen);
  return {
    location: situation.location,
    picks: chosen.flatMap((c) => (c.pick ? [c.pick] : [])),
    pet: chosen.find((c) => c.pet)?.pet ?? null,
    totals,
    result: stepsPerAction(target, level, totals),
    goals,
    score: score(totals),
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
