import type { Character } from "../character/character.js";
import {
  gearCandidate,
  petCandidate,
  situationFor,
  withSetBonuses,
  type Candidate,
  type GearPick,
} from "./candidates.js";
import { ownedKey, stackedStats } from "./items.js";
import { GEAR_SLOTS, type GearSuggestion } from "./optimizer.js";
import { petAt, skillLevelOf, type PlayerProfile } from "./profile.js";
import { conflicts, keywordRules } from "./pruning.js";
import { SAME_STEPS, stepsPerAction, type StepsResult, type WorkTarget } from "./steps.js";
import type { GearData, LocationView } from "./types.js";

export function wornSteps(
  gear: GearData,
  character: Character,
  target: WorkTarget,
  location: LocationView | null,
): StepsResult {
  const profile: PlayerProfile = { kind: "character", character };
  const situation = situationFor(gear, profile, target, location);
  const pet = character.petOut && petAt(gear.pets, character.petOut);
  const worn = wornGear(gear, character).map((owned) => gearCandidate(situation, owned));
  return stepsPerAction(
    target,
    skillLevelOf(profile, target.skill),
    withSetBonuses(pet ? [...worn, petCandidate(situation, pet)] : worn),
  );
}

export function keptGear(
  gear: GearData,
  character: Character,
  target: WorkTarget,
  suggestion: GearSuggestion,
): GearPick[] {
  const profile: PlayerProfile = { kind: "character", character };
  const situation = situationFor(gear, profile, target, suggestion.location);
  const level = skillLevelOf(profile, target.skill);
  const averageSteps = (set: Candidate[]) => stepsPerAction(target, level, withSetBonuses(set)).averageSteps;
  const toCandidate = (pick: GearPick) =>
    gearCandidate(situation, { ...pick, stats: stackedStats(pick.item, pick.quality) });
  let chosen = [
    ...suggestion.picks.map(toCandidate),
    ...(suggestion.pet ? [petCandidate(situation, suggestion.pet)] : []),
  ];
  const worn = wornGear(gear, character).map((owned) => gearCandidate(situation, owned));
  const rules = keywordRules(gear.bannedKeywords, [...chosen, ...worn]);
  const capacity = (slot: string) =>
    slot === "tool" ? character.toolSlots : (GEAR_SLOTS.find((s) => s.slot === slot)?.capacity ?? 0);
  const suggested = suggestion.picks.map((pick) => ownedKey({ id: pick.item.id, quality: pick.quality }));
  const kept: GearPick[] = [];
  for (const candidate of worn) {
    const alreadySuggested = suggested.indexOf(candidate.id);
    if (alreadySuggested >= 0) {
      suggested.splice(alreadySuggested, 1);
      continue;
    }
    const fits =
      chosen.filter((c) => c.slot === candidate.slot).length < capacity(candidate.slot) &&
      !chosen.some((c) => conflicts(rules, c, candidate));
    if (fits && Math.abs(averageSteps([...chosen, candidate]) - averageSteps(chosen)) <= SAME_STEPS) {
      chosen = [...chosen, candidate];
      kept.push(candidate.pick!);
    }
  }
  return kept;
}

function wornGear(gear: GearData, character: Character) {
  const byId = new Map(gear.items.map((item) => [item.id, item]));
  return Object.values(character.equipped).flatMap(({ id, quality }) => {
    const item = byId.get(id);
    return item ? [{ item, quality, stats: stackedStats(item, quality) }] : [];
  });
}
