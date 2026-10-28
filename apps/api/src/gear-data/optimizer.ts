import type { GearType } from "@walkscape-community/data-api-client";
import { MAX_LEVEL, toolSlots, type Character } from "../character/character.js";
import { toCandidate, withSetBonuses, type Candidate, type GearPick, type Situation } from "./candidates.js";
import { ownedKey, stackedStats } from "./items.js";
import {
  ownedGear,
  ownedPets,
  petAt,
  skillLevelOf,
  toolSlotsOf,
  type OwnedGear,
  type OwnedPetView,
  type PlayerProfile,
} from "./profile.js";
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

export const GEAR_SLOTS: { slot: GearType; capacity: number }[] = [
  { slot: "head", capacity: 1 },
  { slot: "cape", capacity: 1 },
  { slot: "back", capacity: 1 },
  { slot: "chest", capacity: 1 },
  { slot: "primary", capacity: 1 },
  { slot: "secondary", capacity: 1 },
  { slot: "hands", capacity: 1 },
  { slot: "legs", capacity: 1 },
  { slot: "neck", capacity: 1 },
  { slot: "feet", capacity: 1 },
  { slot: "ring", capacity: 2 },
  { slot: "tool", capacity: toolSlots(MAX_LEVEL) },
];

export function optimizeGear(gear: GearData, profile: PlayerProfile, target: OptimizeTarget): GearSuggestion {
  const skillType = skillTypeOf(gear, target.skill);
  const locations = gear.locations.filter((l) => target.locationIds.includes(l.id));
  return distinctLocations(gear, locations)
    .map((location) => optimizeAt(gear, { target, skillType, location, profile }))
    .reduce((best, next) => (next.result.averageSteps < best.result.averageSteps ? next : best));
}

function optimizeAt(gear: GearData, situation: Situation): GearSuggestion {
  const { profile, target } = situation;
  const items = ownedGear(profile, gear.items).map((owned) => gearCandidate(situation, owned));
  const pets = ownedPets(profile, gear.pets).map((pet) => petCandidate(situation, pet));
  const level = skillLevelOf(profile, target.skill);
  const averageSteps = (totals: StatTotals) => stepsPerAction(target, level, totals).averageSteps;
  const useful = usefulEfficiency(target, level);
  const rules = keywordRules(gear.bannedKeywords, [...items, ...pets]);
  const groups: SlotGroup[] = GEAR_SLOTS.map(({ slot, capacity }) => ({
    capacity: slot === "tool" ? toolSlotsOf(profile) : capacity,
    choices: items.filter((c) => c.slot === slot),
  }))
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

export function wornSteps(
  gear: GearData,
  character: Character,
  target: WorkTarget,
  location: LocationView | null,
): StepsResult {
  const profile: PlayerProfile = { kind: "character", character };
  const situation: Situation = { target, skillType: skillTypeOf(gear, target.skill), location, profile };
  const byId = new Map(gear.items.map((item) => [item.id, item]));
  const items = Object.values(character.equipped).flatMap(({ id, quality }) => {
    const item = byId.get(id);
    return item ? [gearCandidate(situation, { item, quality, stats: stackedStats(item, quality) })] : [];
  });
  const pet = character.petOut && petAt(gear.pets, character.petOut);
  const pets = pet ? [petCandidate(situation, pet)] : [];
  return stepsPerAction(target, skillLevelOf(profile, target.skill), withSetBonuses([...items, ...pets]));
}

function gearCandidate(situation: Situation, owned: OwnedGear): Candidate {
  return toCandidate(
    situation,
    {
      id: ownedKey({ id: owned.item.id, quality: owned.quality }),
      slot: owned.item.slot,
      keywords: owned.item.keywords,
      pick: { slot: owned.item.slot, item: owned.item, quality: owned.quality },
      pet: null,
    },
    owned.stats,
  );
}

function petCandidate(situation: Situation, pet: OwnedPetView): Candidate {
  return toCandidate(situation, { id: `pet:${pet.pet.id}`, slot: "pet", keywords: [], pick: null, pet }, pet.stats);
}

function skillTypeOf(gear: GearData, skill: string): string {
  return gear.skills.find((s) => s.id === skill)?.type ?? "";
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
