import { MAX_LEVEL, toolSlots, type Character } from "../character/character.js";
import { QUALITIES, type ItemQuality } from "../recipe-book/types.js";
import { stackedStats } from "./items.js";
import type { GearCondition, GearItem, GearStat, PetView } from "./types.js";

export type PlayerProfile = { kind: "best" } | { kind: "character"; character: Character };

export interface OwnedGear {
  item: GearItem;
  quality: ItemQuality | null;
  stats: GearStat[];
}

export interface OwnedPetView {
  pet: PetView;
  level: number;
  stats: GearStat[];
}

export const BEST_IN_GAME: PlayerProfile = { kind: "best" };

export function skillLevelOf(profile: PlayerProfile, skill: string): number {
  return profile.kind === "best" ? MAX_LEVEL : (profile.character.skillLevels[skill] ?? 1);
}

export function toolSlotsOf(profile: PlayerProfile): number {
  return profile.kind === "best" ? toolSlots(MAX_LEVEL) : profile.character.toolSlots;
}

export function ownedGear(profile: PlayerProfile, items: GearItem[]): OwnedGear[] {
  if (profile.kind === "best") {
    return items.map((item) => {
      const quality = bestQuality(item);
      return { item, quality, stats: stackedStats(item, quality) };
    });
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  return profile.character.owned.flatMap(({ id, quality }) => {
    const item = byId.get(id);
    return item && meetsRequirements(profile.character, item.requirements)
      ? [{ item, quality, stats: stackedStats(item, quality) }]
      : [];
  });
}

export function ownedPets(profile: PlayerProfile, pets: PetView[]): OwnedPetView[] {
  if (profile.kind === "best") {
    return pets.flatMap((pet) => {
      const top = pet.levels.at(-1);
      return top ? [{ pet, level: top.level, stats: top.stats }] : [];
    });
  }
  return profile.character.pets.flatMap(({ species, level }) => {
    const pet = pets.find((p) => p.id === species || p.rareId === species);
    const reached = pet?.levels.filter((l) => l.level <= level).at(-1);
    return pet && reached ? [{ pet, level: reached.level, stats: reached.stats }] : [];
  });
}

export function playerConditionHolds(profile: PlayerProfile, condition: GearCondition): boolean | undefined {
  if (profile.kind === "best") {
    return true;
  }
  const { character } = profile;
  switch (condition.type) {
    case "collectiblesOwned":
      return character.collectibles.length >= condition.requirement.amount;
    case "achievementPoint":
      return condition.requirement.isPercentage
        ? undefined
        : character.achievementPoints >= condition.requirement.value;
    case "totalSkillLevel":
      return character.totalSkillLevel >= condition.requirement.levels;
    case "skillLevel":
      return (character.skillLevels[condition.requirement.skill] ?? 1) >= condition.requirement.level;
    case "characterLevel":
      return character.characterLevel >= condition.requirement.level;
    case "itemAnywhere":
      return character.owned.some((owned) => owned.id === condition.requirement.item);
    default:
      return undefined;
  }
}

function meetsRequirements(character: Character, requirements: GearCondition[]): boolean {
  const profile: PlayerProfile = { kind: "character", character };
  return requirements.every((requirement) => {
    const holds = playerConditionHolds(profile, requirement);
    return holds === undefined || holds !== requirement.opposite;
  });
}

function bestQuality(item: GearItem): ItemQuality | null {
  return QUALITIES.filter((quality) => item.tierStats[quality]).at(-1) ?? null;
}
