import type { GearSuggestion, StepsResult } from "@squire/api/gear-data";
import { formatNumber } from "./format";
import type { GearTarget } from "./gear-targets";

const SAME_STEPS = 1e-9;

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
  return averageSteps < steps
    ? `${perAction} · ${formatNumber(Number(averageSteps.toFixed(1)))} on average`
    : perAction;
}
