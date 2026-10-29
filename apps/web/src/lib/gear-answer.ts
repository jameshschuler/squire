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
import { efficiencyStatus, formatStatValue, statGroups, statLabel, type StatGroups, type StatRow } from "./gear-stats";
import type { GearTarget } from "./gear-targets";

export interface GearAnswerView {
  suggestion: GearSuggestion;
  before: StepsResult | null;
  equipped: Map<string, number> | null;
  efficiencyStatus: string;
  priorities: StatRow[];
  steps: string | null;
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
  const priorities = suggestion.goals.map((id): StatRow => {
    const goal = GOALS.find((g) => g.id === id)!;
    if (!goal.stat) {
      return { label: goal.label, value: formatStepsResult(suggestion.result) };
    }
    const line = lines.find((l) => l.stat === goal.stat && l.isPercent);
    return {
      label: goal.label,
      value: `${statLabel(goal.stat)} ${line ? formatStatValue(line) : "+0%"}`,
    };
  });
  return {
    suggestion,
    before,
    equipped: character && wornCounts(Object.values(character.equipped).map(ownedKey)),
    efficiencyStatus: efficiencyStatus(parts),
    priorities,
    steps: suggestion.goals.includes("steps") ? null : formatStepsResult(suggestion.result),
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

export function formatStepsResult({ steps, averageSteps }: StepsResult): string {
  const perAction = `${formatNumber(steps)} steps per action`;
  return averageSteps < steps ? `${perAction} (${formatNumber(Number(averageSteps.toFixed(1)))} avg)` : perAction;
}

function wornCounts(keys: string[]): Map<string, number> {
  return keys.reduce((counts, key) => counts.set(key, (counts.get(key) ?? 0) + 1), new Map<string, number>());
}
