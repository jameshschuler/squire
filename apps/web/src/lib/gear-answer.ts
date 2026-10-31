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
  type GoalId,
  type OptimizeTarget,
  type PlayerProfile,
  type StepsResult,
} from "@squire/api/gear-data";
import { formatNumber, formatPercent } from "./format";
import type { GearSolution } from "./gear-solution";
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
  { suggestion, fewestSteps }: GearSolution,
): GearAnswerView {
  const lines = setStats(gear, profile, optimize, suggestion);
  const level = skillLevelOf(profile, optimize.skill);
  const parts = {
    cap: efficiencyCap(optimize),
    gear: lines.find((l) => l.stat === "workEfficiency" && l.isPercent)?.value ?? 0,
    level: levelBonus(optimize, level),
  };
  const noGear = stepsPerAction(optimize, level, NO_STATS);
  const { location } = suggestion;
  const tiles = locationTiles(locationBonuses(gear, profile, optimize, suggestion));
  return {
    suggestion,
    location: location && tiles.length > 0 ? { name: location.name, region: location.region, tiles } : null,
    stats: statGroups(lines, parts, goalStats(suggestion.goals), stepsTile(suggestion, noGear, fewestSteps)),
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
  return [...tooLow, marginNote(suggestion)];
}

export function marginNote({ margin, goals }: GearSuggestion): string {
  if (!margin) {
    return "Proven best set for this gear.";
  }
  const label = (goal: GoalId) => goalOf(goal).label;
  const proven = goals.slice(0, goals.indexOf(margin.goal)).map(label);
  const within = `Within ${formatPercent(Math.ceil(margin.gap * 1000) / 1000, 1)} of the best possible for ${label(margin.goal)}.`;
  return proven.length > 0 ? `Proven best for ${proven.join(", ")}. ${within}` : within;
}

export function stepsTile({ result, goals }: GearSuggestion, noGear: StepsResult, fewest: number): StatTile {
  return {
    key: "steps",
    value: formatNumber(result.steps),
    label: "Steps per action",
    details: [`Min ${formatNumber(Math.min(fewest, result.steps))} · Max ${formatNumber(noGear.steps)}`],
    highlight: goals.includes("steps"),
    over: false,
  };
}
