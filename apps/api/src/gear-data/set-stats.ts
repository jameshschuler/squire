import type { StatType } from "@walkscape-community/data-api-client";
import { conditionHolds, situationFor } from "./candidates.js";
import { stackedStats } from "./items.js";
import type { GearSuggestion } from "./optimizer.js";
import type { PlayerProfile } from "./profile.js";
import type { WorkTarget } from "./steps.js";
import type { GearCondition, GearData, GearStat } from "./types.js";

export interface StatLine {
  stat: StatType;
  isPercent: boolean;
  value: number;
}

export interface LocationBonus extends StatLine {
  source: string;
}

interface WornPiece {
  id: string;
  name: string;
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
): LocationBonus[] {
  const { pieces, holds } = worn(gear, profile, target, suggestion);
  return pieces.flatMap((piece) =>
    sumLines(piece.stats.filter((s) => s.conditions.some(isLocationCondition) && s.conditions.every(holds))).map(
      (line) => ({ ...line, source: piece.name }),
    ),
  );
}

function worn(gear: GearData, profile: PlayerProfile, target: WorkTarget, suggestion: GearSuggestion) {
  const situation = situationFor(gear, profile, target, suggestion.location);
  const pieces: WornPiece[] = [
    ...suggestion.picks.map((p) => ({
      id: p.item.id,
      name: p.item.name,
      keywords: p.item.keywords,
      stats: stackedStats(p.item, p.quality),
    })),
    ...(suggestion.pet
      ? [
          {
            id: `pet:${suggestion.pet.pet.id}`,
            name: suggestion.pet.pet.name,
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
