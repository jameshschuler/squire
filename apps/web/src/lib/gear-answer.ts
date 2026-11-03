import {
  efficiencyCap,
  goalOf,
  goalStats,
  levelBonus,
  locationBonuses,
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
} from "@walkscape-community/gear-optimizer";
import { formatNumber, formatPercent } from "./format";
import { locationTiles, statGroups, type StatGroups, type StatTile } from "./gear-stats";
import type { GearTarget } from "./gear-targets";

export interface AnswerLocation {
  name: string;
  region: string;
  tiles: StatTile[];
}

export interface GearAnswerView {
  suggestion: GearSuggestion;
  location: AnswerLocation | null;
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
    cap: efficiencyCap(optimize),
    gear: lines.find((line) => line.stat === "workEfficiency" && line.isPercent)?.value ?? 0,
    level: levelBonus(optimize, level),
  };
  const noGear = stepsPerAction(optimize, level, NO_STATS);
  const efficiencyOnly = stepsPerAction(optimize, level, { ...NO_STATS, workEfficiency: parts.gear });
  const fullEfficiency = Number.isFinite(parts.cap)
    ? stepsPerAction(optimize, level, { ...NO_STATS, workEfficiency: parts.cap })
    : null;
  const { location } = suggestion;
  const tiles = locationTiles(locationBonuses(gear, profile, optimize, suggestion));

  return {
    suggestion,
    location: location && tiles.length > 0 ? { name: location.name, region: location.region, tiles } : null,
    stats: statGroups(lines, parts, goalStats(suggestion.goals), [
      efficiencyStepsTile(efficiencyOnly, fullEfficiency, noGear),
      stepsTile(suggestion),
    ]),
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
  const missing = suggestion.missingNeeds.map((need) => need.label);
  const lacking =
    missing.length > 0 ? [`You don't have the gear this needs: ${missing.join(", ")}. The set leaves it out.`] : [];
  const before = [...tooLow, ...lacking];

  if (suggestion.picks.length === 0 && !suggestion.pet) {
    return suggestion.margin
      ? [...before, "No gear found that helps.", ...marginNotes(suggestion)]
      : [...before, "No gear helps with this."];
  }

  return [...before, ...marginNotes(suggestion)];
}

function marginNotes({ margin, goals }: GearSuggestion): string[] {
  if (!margin) {
    return [];
  }

  const first = goalOf(goals[0] ?? "steps").label;

  return [`Within ${formatPercent(Math.ceil(margin.gap * 1000) / 1000, 1)} of the best possible for ${first}.`];
}

export function stepsTile({ result, goals }: GearSuggestion): StatTile {
  return {
    key: "steps",
    value: formatNumber(result.steps),
    label: "Steps per action",
    details: [],
    highlight: goals.includes("steps"),
    over: false,
  };
}

// Steps from work efficiency alone, before step changes: what the wiki's "Minimum Steps" counts at
// max efficiency. `fullEfficiency` is null when the activity has no max.
export function efficiencyStepsTile(
  efficiencyOnly: StepsResult,
  fullEfficiency: StepsResult | null,
  noGear: StepsResult,
): StatTile {
  const max = `Max ${formatNumber(noGear.steps)}`;

  return {
    key: "efficiencySteps",
    value: formatNumber(efficiencyOnly.steps),
    label: "Steps after work efficiency",
    details: [fullEfficiency ? `Min ${formatNumber(fullEfficiency.steps)} · ${max}` : max],
    highlight: false,
    over: false,
  };
}
