import {
  efficiencyCap,
  goalStats,
  levelBonus,
  NO_STATS,
  setStats,
  skillLevelOf,
  stepsPerAction,
  toolSlotsOf,
  type GearData,
  type GearSuggestion,
  type OptimizeTarget,
  type PlayerProfile,
  type StepsResult,
} from "@squire/api/gear-data";
import { formatNumber } from "./format";
import { statGroups, type StatGroups, type StatTile } from "./gear-stats";
import type { GearTarget } from "./gear-targets";

export interface GearAnswerView {
  suggestion: GearSuggestion;
  stats: StatGroups;
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
  const lines = setStats(gear, profile, optimize, suggestion);
  const level = skillLevelOf(profile, optimize.skill);
  const parts = {
    used: suggestion.result.efficiency - 1,
    cap: efficiencyCap(optimize),
    gear: lines.find((l) => l.stat === "workEfficiency" && l.isPercent)?.value ?? 0,
    level: levelBonus(optimize, level),
  };
  const noGear = stepsPerAction(optimize, level, NO_STATS);
  return {
    suggestion,
    stats: statGroups(lines, parts, goalStats(suggestion.goals), stepsTile(suggestion, noGear)),
    notes: answerNotes(suggestion, target, profile.kind === "character" ? level : null),
    toolSlots: toolSlotsOf(profile),
  };
}

export function answerNotes(suggestion: GearSuggestion, target: GearTarget, skillLevel: number | null): string[] {
  const required = target.skill.level ?? 1;
  const tooLow =
    skillLevel !== null && skillLevel < required
      ? [`You need ${target.skill.name} level ${required} for this. Here's the set for when you get there.`]
      : [];
  if (suggestion.picks.length === 0 && !suggestion.pet) {
    return [...tooLow, "No gear helps with this."];
  }
  return tooLow;
}

export function stepsTile({ result, goals }: GearSuggestion, noGear: StepsResult): StatTile {
  const average = Math.round(result.averageSteps);
  const saved = noGear.steps - result.steps;
  const details = [
    ...(average < result.steps ? [`${formatNumber(average)} on average with double action`] : []),
    ...(saved > 0 ? [`${formatNumber(saved)} fewer than with no gear`] : []),
  ];
  return {
    key: "steps",
    value: formatNumber(result.steps),
    label: "Steps per action",
    details,
    highlight: goals.includes("steps"),
  };
}
