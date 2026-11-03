import type { GearType, StatType } from "@walkscape-community/data-api-client";
import { conditionHolds, situationFor, type Situation } from "./candidates.js";
import { stackedStats } from "./items.js";
import type { GearSuggestion } from "./optimizer.js";
import { ownedGear, ownedPets, toolSlotsOf, type PlayerProfile } from "./profile.js";
import { conflicts } from "./pruning.js";
import { copiesAllowed, slotCapacity } from "./slots.js";
import { STEP_STAT_SET, type WorkTarget } from "./steps.js";
import type { GearCondition, GearData, GearStat, LocationView } from "./types.js";

export interface StatLine {
  stat: StatType;
  isPercent: boolean;
  value: number;
}

export interface SourcedStat extends StatLine {
  source: string;
}

interface WornPiece {
  id: string;
  name: string;
  slot: GearType | "pet";
  keywords: string[];
  stats: GearStat[];
}

export function setStats(
  gear: GearData,
  profile: PlayerProfile,
  target: WorkTarget,
  suggestion: GearSuggestion,
): StatLine[] {
  const { pieces, holds } = worn(gear, profile, target, suggestion);

  return sumLines(pieces.flatMap((piece) => piece.stats).filter((stat) => stat.conditions.every(holds)));
}

// Each worn item's bonuses that apply here, to show where a set's stats come from.
export function setStatsBySource(
  gear: GearData,
  profile: PlayerProfile,
  target: WorkTarget,
  suggestion: GearSuggestion,
): SourcedStat[] {
  const { pieces, holds } = worn(gear, profile, target, suggestion);

  return pieces.flatMap((piece) =>
    sumLines(piece.stats.filter((stat) => stat.conditions.every(holds))).map((line) => ({
      ...line,
      source: piece.name,
    })),
  );
}

// Each worn item's bonuses that only apply because of the location, for the "Location bonuses" tiles.
export function locationBonuses(
  gear: GearData,
  profile: PlayerProfile,
  target: WorkTarget,
  suggestion: GearSuggestion,
): SourcedStat[] {
  const { pieces, holds } = worn(gear, profile, target, suggestion);
  const applies = (stat: GearStat) => stat.conditions.some(isLocationCondition) && stat.conditions.every(holds);

  return pieces.flatMap((piece) =>
    sumLines(piece.stats.filter(applies)).map((line) => ({ ...line, source: piece.name })),
  );
}

// A short summary per location for the "Where?" choices: the location-only bonuses a player could get
// there. It's a quick greedy pick (best speed bonuses first, skipping items that cost anything here,
// respecting slots, copies and bans), not a full search, so it's only a hint.
export function gearBonusesByLocation(
  gear: GearData,
  profile: PlayerProfile,
  target: WorkTarget,
  locations: LocationView[],
): Map<string, StatLine[]> {
  const pieces: WornPiece[] = [
    ...ownedGear(profile, gear.items).map(({ item, stats }) => ({
      id: item.id,
      name: item.name,
      slot: item.slot,
      keywords: item.keywords,
      stats,
    })),
    ...ownedPets(profile, gear.pets).map(({ pet, stats }) => ({
      id: `pet:${pet.id}`,
      name: pet.name,
      slot: "pet" as const,
      keywords: [],
      stats,
    })),
  ].filter(({ stats }) => stats.some((stat) => stat.conditions.some(isLocationCondition)));
  const tools = toolSlotsOf(profile);
  const fits = (kept: WornPiece[], piece: WornPiece) =>
    kept.filter((other) => other.slot === piece.slot).length < slotCapacity(piece.slot, tools) &&
    kept.filter((other) => other.id === piece.id).length < copiesAllowed(piece.slot) &&
    !kept.some((other) => conflicts(gear, other, piece));

  return new Map(
    locations.map((location) => [location.id, bonusesAt(situationFor(gear, profile, target, location), pieces, fits)]),
  );
}

// The location bonuses at one place from the best piece per slot, speed bonuses first.
function bonusesAt(
  situation: Situation,
  pieces: WornPiece[],
  fits: (kept: WornPiece[], piece: WornPiece) => boolean,
): StatLine[] {
  const holds = (condition: GearCondition) =>
    condition.type !== "distinctKeywordItemsEquipped" && conditionHolds(situation, condition);
  const choices = pieces
    .map((piece) => {
      const applying = piece.stats.filter((stat) => stat.conditions.every(holds));

      return {
        piece,
        bonuses: sumLines(applying.filter((stat) => stat.conditions.some(isLocationCondition))),
        costs: sumLines(applying).some((line) => gain(line) < 0),
      };
    })
    .filter(({ bonuses, costs }) => bonuses.length > 0 && !costs)
    .sort((left, right) => compareBonuses(right.bonuses, left.bonuses));
  const chosen = choices.reduce<typeof choices>(
    (kept, choice) =>
      fits(
        kept.map((entry) => entry.piece),
        choice.piece,
      )
        ? [...kept, choice]
        : kept,
    [],
  );
  const bonuses = sumLines(chosen.flatMap(({ bonuses }) => bonuses.map((line) => ({ ...line, conditions: [] }))));

  return bonuses.sort(
    (left, right) =>
      Number(isStepStat(right)) - Number(isStepStat(left)) ||
      Number(right.isPercent) - Number(left.isPercent) ||
      gain(right) - gain(left),
  );
}

function compareBonuses(left: StatLine[], right: StatLine[]): number {
  const total = (lines: StatLine[], isPercent: boolean) =>
    lines.filter((line) => line.isPercent === isPercent).reduce((sum, line) => sum + gain(line), 0);

  return (
    total(left.filter(isStepStat), true) - total(right.filter(isStepStat), true) ||
    total(left.filter(isStepStat), false) - total(right.filter(isStepStat), false) ||
    total(left, true) - total(right, true) ||
    total(left, false) - total(right, false)
  );
}

function isStepStat({ stat }: StatLine): boolean {
  return STEP_STAT_SET.has(stat);
}

function worn(gear: GearData, profile: PlayerProfile, target: WorkTarget, suggestion: GearSuggestion) {
  const situation = situationFor(gear, profile, target, suggestion.location);
  const pieces: WornPiece[] = [
    ...suggestion.picks.map((pick) => ({
      id: pick.item.id,
      name: pick.item.name,
      slot: pick.item.slot,
      keywords: pick.item.keywords,
      stats: stackedStats(pick.item, pick.quality),
    })),
    ...(suggestion.pet
      ? [
          {
            id: `pet:${suggestion.pet.pet.id}`,
            name: suggestion.pet.pet.name,
            slot: "pet" as const,
            keywords: [],
            stats: suggestion.pet.stats,
          },
        ]
      : []),
  ];
  const count = (keywords: string[]) => {
    const counted = new Set(keywords);

    return new Set(
      pieces.filter((piece) => piece.keywords.some((keyword) => counted.has(keyword))).map((piece) => piece.id),
    ).size;
  };

  const holds = (condition: GearCondition) =>
    condition.type === "distinctKeywordItemsEquipped"
      ? count(condition.requirement.keywords) >= condition.requirement.quantity !== condition.opposite
      : conditionHolds(situation, condition);

  return { pieces, holds };
}

// How much a stat helps; fewer steps required is a gain, so its sign flips.
function gain({ stat, value }: StatLine): number {
  return stat === "stepsRequired" ? -value : value;
}

// A condition that depends on where the activity happens (and isn't an "anywhere but" condition).
function isLocationCondition({ type, opposite }: GearCondition): boolean {
  return !opposite && (type === "realm" || type === "locationHasKeywords");
}

function sumLines(stats: GearStat[]): StatLine[] {
  const totals = new Map<string, StatLine>();

  for (const { stat, isPercent, value } of stats) {
    const key = `${stat}:${isPercent}`;
    const total = totals.get(key);

    totals.set(key, { stat, isPercent, value: (total?.value ?? 0) + value });
  }

  return [...totals.values()].filter((line) => Math.abs(line.value) > 1e-9);
}
