import {
  GOALS,
  efficiencyCap,
  goalStats,
  levelBonus,
  ownedKey,
  SAME_STEPS,
  setStats,
  skillLevelOf,
  toolSlotsOf,
  wornSteps,
  type GearData,
  type GearSuggestion,
  type OptimizeTarget,
  type PlayerProfile,
  type StepsResult,
} from "@squire/api/gear-data";
import { formatNumber } from "./format";
import { efficiencyStatus, formatStatValue, statGroups, statLabel, type StatGroups, type StatTile } from "./gear-stats";
import type { GearTarget } from "./gear-targets";

export interface GearAnswerView {
  suggestion: GearSuggestion;
  equipped: Map<string, number> | null;
  efficiencyStatus: string;
  results: StatTile[];
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
  const character = profile.kind === "character" ? profile.character : null;
  const before = character ? wornSteps(gear, character, optimize, suggestion.location) : null;
  const lines = setStats(gear, profile, optimize, suggestion);
  const level = skillLevelOf(profile, optimize.skill);
  const parts = {
    used: suggestion.result.efficiency - 1,
    cap: efficiencyCap(optimize),
    gear: lines.find((l) => l.stat === "workEfficiency" && l.isPercent)?.value ?? 0,
    level: levelBonus(optimize, level),
  };
  const stepsTile = stepsResultTile(suggestion.result, before);
  const results = suggestion.goals.map((id): StatTile => {
    const stat = GOALS.find((g) => g.id === id)!.stat;
    if (!stat) {
      return stepsTile;
    }
    const line = lines.find((l) => l.stat === stat && l.isPercent);
    return {
      key: stat,
      value: formatStatValue(line ?? { value: 0, isPercent: true }),
      label: statLabel(stat),
      highlight: false,
    };
  });
  return {
    suggestion,
    equipped: character && wornCounts(Object.values(character.equipped).map(ownedKey)),
    efficiencyStatus: efficiencyStatus(parts),
    results: suggestion.goals.includes("steps") ? results : [...results, stepsTile],
    stats: statGroups(lines, parts, goalStats(suggestion.goals)),
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

function wornCounts(keys: string[]): Map<string, number> {
  return keys.reduce((counts, key) => counts.set(key, (counts.get(key) ?? 0) + 1), new Map<string, number>());
}

function stepsResultTile(result: StepsResult, before: StepsResult | null): StatTile {
  const average = Math.round(result.averageSteps);
  const change = before ? average - Math.round(before.averageSteps) : null;
  const notes = [
    "Steps",
    ...(average < result.steps ? [`${formatNumber(average)} avg`] : []),
    ...(change === null
      ? []
      : change === 0
        ? ["same as now"]
        : [`${change < 0 ? "−" : "+"}${formatNumber(Math.abs(change))} vs now`]),
  ];
  return { key: "steps", value: formatNumber(result.steps), label: notes.join(" · "), highlight: false };
}
