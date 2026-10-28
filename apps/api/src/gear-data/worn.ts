import type { Character } from "../character/character.js";
import { gearCandidate, petCandidate, situationFor, withSetBonuses } from "./candidates.js";
import { stackedStats } from "./items.js";
import { petAt, skillLevelOf, type PlayerProfile } from "./profile.js";
import { stepsPerAction, type StepsResult, type WorkTarget } from "./steps.js";
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

function wornGear(gear: GearData, character: Character) {
  const byId = new Map(gear.items.map((item) => [item.id, item]));
  return Object.values(character.equipped).flatMap(({ id, quality }) => {
    const item = byId.get(id);
    return item ? [{ item, quality, stats: stackedStats(item, quality) }] : [];
  });
}
