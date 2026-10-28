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

interface WornPiece {
  id: string;
  keywords: string[];
  stats: GearStat[];
}

export function setStats(
  gear: GearData,
  profile: PlayerProfile,
  target: WorkTarget,
  suggestion: GearSuggestion,
): StatLine[] {
  const situation = situationFor(gear, profile, target, suggestion.location);
  const pieces: WornPiece[] = [
    ...suggestion.picks.map((p) => ({
      id: p.item.id,
      keywords: p.item.keywords,
      stats: stackedStats(p.item, p.quality),
    })),
    ...(suggestion.pet ? [{ id: `pet:${suggestion.pet.pet.id}`, keywords: [], stats: suggestion.pet.stats }] : []),
  ];
  const count = (keywords: string[]) =>
    new Set(pieces.filter((p) => p.keywords.some((k) => keywords.includes(k))).map((p) => p.id)).size;
  const holds = (condition: GearCondition) =>
    condition.type === "distinctKeywordItemsEquipped"
      ? count(condition.requirement.keywords) >= condition.requirement.quantity !== condition.opposite
      : conditionHolds(situation, condition);
  const totals = new Map<string, StatLine>();
  for (const { stat, isPercent, value, conditions } of pieces.flatMap((p) => p.stats)) {
    if (!conditions.every(holds)) {
      continue;
    }
    const key = `${stat}:${isPercent}`;
    const total = totals.get(key);
    totals.set(key, { stat, isPercent, value: (total?.value ?? 0) + value });
  }
  return [...totals.values()].filter((line) => Math.abs(line.value) > 1e-9);
}
