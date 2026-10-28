import {
  efficiencyCap,
  keptGear,
  levelBonus,
  ownedKey,
  SAME_STEPS,
  setStats,
  skillLevelOf,
  toolSlotsOf,
  wornSteps,
  type GearData,
  type GearPick,
  type GearSuggestion,
  type OptimizeTarget,
  type PlayerProfile,
  type StepsResult,
} from "@squire/api/gear-data";
import { formatNumber } from "./format";
import { efficiencySummary, statRows, type StatRow } from "./gear-stats";
import type { GearTarget } from "./gear-targets";

export interface GearAnswerView {
  suggestion: GearSuggestion;
  before: StepsResult | null;
  equipped: Set<string> | null;
  kept: GearPick[];
  efficiency: string;
  stats: StatRow[];
  notes: string[];
  toolSlots: number;
}

export function gearAnswer(
  gear: GearData,
  profile: PlayerProfile,
  target: GearTarget,
  optimize: OptimizeTarget,
  suggestion: GearSuggestion,
): GearAnswerView {
  const character = profile.kind === "character" ? profile.character : null;
  const before = character ? wornSteps(gear, character, optimize, suggestion.location) : null;
  const kept = character ? keptGear(gear, character, optimize, suggestion) : [];
  const worn = [...suggestion.picks, ...kept];
  const lines = setStats(gear, profile, optimize, suggestion, worn);
  const level = skillLevelOf(profile, optimize.skill);
  const efficiency = efficiencySummary({
    used: suggestion.result.efficiency - 1,
    cap: efficiencyCap(optimize),
    gear: lines.find((l) => l.stat === "workEfficiency" && l.isPercent)?.value ?? 0,
    level: levelBonus(optimize, level),
  });
  return {
    suggestion,
    before,
    equipped: character && new Set(Object.values(character.equipped).map(ownedKey)),
    kept,
    efficiency,
    stats: statRows(lines),
    notes: answerNotes(suggestion, target, before, character ? level : null),
    toolSlots: toolSlotsOf(profile),
  };
}

export function answerNotes(
  suggestion: GearSuggestion,
  target: GearTarget,
  before: StepsResult | null,
  skillLevel: number | null,
): string[] {
  const required = target.skill.level ?? 1;
  const tooLow =
    skillLevel !== null && skillLevel < required
      ? [`You need ${target.skill.name} level ${required} for this. Here's the set for when you get there.`]
      : [];
  if (before && before.averageSteps <= suggestion.result.averageSteps + SAME_STEPS) {
    return [...tooLow, "You're already wearing the best set for this."];
  }
  if (suggestion.picks.length === 0 && !suggestion.pet) {
    return [...tooLow, "No gear helps with this."];
  }
  return tooLow;
}

export function formatStepsResult({ steps, averageSteps }: StepsResult): string {
  const perAction = `${formatNumber(steps)} steps per action`;
  return averageSteps < steps ? `${perAction} (${formatNumber(Number(averageSteps.toFixed(1)))} avg)` : perAction;
}
