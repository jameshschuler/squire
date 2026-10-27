import type { GearType } from "@walkscape-community/data-api-client";
import { toCandidate, withSetBonuses, type GearPick, type Situation } from "./candidates.js";
import { ownedGear, ownedPets, skillLevelOf, toolSlotsOf, type OwnedPetView, type PlayerProfile } from "./profile.js";
import { keywordRules, prune } from "./pruning.js";
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
}

const SLOT_CAPACITY: [GearType, number][] = [
  ["head", 1],
  ["cape", 1],
  ["back", 1],
  ["chest", 1],
  ["primary", 1],
  ["secondary", 1],
  ["hands", 1],
  ["legs", 1],
  ["neck", 1],
  ["feet", 1],
  ["ring", 2],
];

export function optimizeGear(gear: GearData, profile: PlayerProfile, target: OptimizeTarget): GearSuggestion {
  const skillType = gear.skills.find((s) => s.id === target.skill)?.type ?? "";
  const locations = gear.locations.filter((l) => target.locationIds.includes(l.id));
  return distinctLocations(gear, locations)
    .map((location) => optimizeAt(gear, { target, skillType, location, profile }))
    .reduce((best, next) => (next.result.averageSteps < best.result.averageSteps ? next : best));
}

function optimizeAt(gear: GearData, situation: Situation): GearSuggestion {
  const { profile, target } = situation;
  const items = ownedGear(profile, gear.items).map((owned) =>
    toCandidate(
      situation,
      {
        id: `${owned.item.id}:${owned.quality ?? ""}`,
        slot: owned.item.slot,
        keywords: owned.item.keywords,
        pick: { slot: owned.item.slot, item: owned.item, quality: owned.quality },
        pet: null,
      },
      owned.stats,
    ),
  );
  const pets = ownedPets(profile, gear.pets).map((pet) =>
    toCandidate(situation, { id: `pet:${pet.pet.id}`, slot: "pet", keywords: [], pick: null, pet }, pet.stats),
  );
  const level = skillLevelOf(profile, target.skill);
  const averageSteps = (totals: StatTotals) => stepsPerAction(target, level, totals).averageSteps;
  const useful = usefulEfficiency(target, level);
  const rules = keywordRules(gear.bannedKeywords, [...items, ...pets]);
  const groups: SlotGroup[] = [...SLOT_CAPACITY, ["tool", toolSlotsOf(profile)] as const]
    .map(([slot, capacity]) => ({ capacity, choices: items.filter((c) => c.slot === slot) }))
    .concat({ capacity: 1, choices: pets })
    .map(({ capacity, choices }) => ({
      capacity,
      choices: prune(choices, capacity, rules, useful).sort((a, b) => averageSteps(a.best) - averageSteps(b.best)),
    }))
    .filter((group) => group.choices.length > 0);

  const chosen = bestSet(groups, rules, useful, averageSteps);
  const totals = withSetBonuses(chosen);
  return {
    location: situation.location,
    picks: chosen.flatMap((c) => (c.pick ? [c.pick] : [])),
    pet: chosen.find((c) => c.pet)?.pet ?? null,
    totals,
    result: stepsPerAction(target, level, totals),
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
