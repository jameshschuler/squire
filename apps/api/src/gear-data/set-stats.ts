import type { GearType, StatType } from "@walkscape-community/data-api-client";
import { conditionHolds, situationFor } from "./candidates.js";
import { stackedStats } from "./items.js";
import type { GearSuggestion } from "./optimizer.js";
import { ownedGear, ownedPets, toolSlotsOf, type PlayerProfile } from "./profile.js";
import { conflicts } from "./pruning.js";
import { copiesAllowed, slotCapacity } from "./slots.js";
import { STEP_STATS, type WorkTarget } from "./steps.js";
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
  return sumLines(pieces.flatMap((p) => p.stats).filter((s) => s.conditions.every(holds)));
}

export function locationBonuses(
  gear: GearData,
  profile: PlayerProfile,
  target: WorkTarget,
  suggestion: GearSuggestion,
): SourcedStat[] {
  const { pieces, holds } = worn(gear, profile, target, suggestion);
  const applies = (s: GearStat) => s.conditions.some(isLocationCondition) && s.conditions.every(holds);
  return pieces.flatMap((piece) =>
    sumLines(piece.stats.filter(applies)).map((line) => ({ ...line, source: piece.name })),
  );
}

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
  ].filter(({ stats }) => stats.some((s) => s.conditions.some(isLocationCondition)));
  const tools = toolSlotsOf(profile);
  const fits = (kept: WornPiece[], piece: WornPiece) =>
    kept.filter((k) => k.slot === piece.slot).length < slotCapacity(piece.slot, tools) &&
    kept.filter((k) => k.id === piece.id).length < copiesAllowed(piece.slot) &&
    !kept.some((k) => conflicts(gear, k, piece));
  return new Map(
    locations.map((location) => {
      const situation = situationFor(gear, profile, target, location);
      const holds = (condition: GearCondition) =>
        condition.type !== "distinctKeywordItemsEquipped" && conditionHolds(situation, condition);
      const choices = pieces
        .map((piece) => {
          const applying = piece.stats.filter((s) => s.conditions.every(holds));
          return {
            piece,
            bonuses: sumLines(applying.filter((s) => s.conditions.some(isLocationCondition))),
            costs: sumLines(applying).some((line) => gain(line) < 0),
          };
        })
        .filter(({ bonuses, costs }) => bonuses.length > 0 && !costs)
        .sort((a, b) => compareBonuses(b.bonuses, a.bonuses));
      const worn = choices.reduce<typeof choices>(
        (kept, choice) =>
          fits(
            kept.map((k) => k.piece),
            choice.piece,
          )
            ? [...kept, choice]
            : kept,
        [],
      );
      const bonuses = sumLines(worn.flatMap(({ bonuses }) => bonuses.map((line) => ({ ...line, conditions: [] }))));
      return [
        location.id,
        bonuses.sort(
          (a, b) =>
            Number(isStepStat(b)) - Number(isStepStat(a)) ||
            Number(b.isPercent) - Number(a.isPercent) ||
            gain(b) - gain(a),
        ),
      ];
    }),
  );
}

function compareBonuses(a: StatLine[], b: StatLine[]): number {
  const total = (lines: StatLine[], isPercent: boolean) =>
    lines.filter((line) => line.isPercent === isPercent).reduce((sum, line) => sum + gain(line), 0);
  return (
    total(a.filter(isStepStat), true) - total(b.filter(isStepStat), true) ||
    total(a.filter(isStepStat), false) - total(b.filter(isStepStat), false) ||
    total(a, true) - total(b, true) ||
    total(a, false) - total(b, false)
  );
}

function isStepStat({ stat }: StatLine): boolean {
  return (STEP_STATS as readonly string[]).includes(stat);
}

function worn(gear: GearData, profile: PlayerProfile, target: WorkTarget, suggestion: GearSuggestion) {
  const situation = situationFor(gear, profile, target, suggestion.location);
  const pieces: WornPiece[] = [
    ...suggestion.picks.map((p) => ({
      id: p.item.id,
      name: p.item.name,
      slot: p.item.slot,
      keywords: p.item.keywords,
      stats: stackedStats(p.item, p.quality),
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
  const count = (keywords: string[]) =>
    new Set(pieces.filter((p) => p.keywords.some((k) => keywords.includes(k))).map((p) => p.id)).size;
  const holds = (condition: GearCondition) =>
    condition.type === "distinctKeywordItemsEquipped"
      ? count(condition.requirement.keywords) >= condition.requirement.quantity !== condition.opposite
      : conditionHolds(situation, condition);
  return { pieces, holds };
}

function gain({ stat, value }: StatLine): number {
  return stat === "stepsRequired" ? -value : value;
}

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
