import type { ActivityDrop, ItemSource, ItemSummary } from "@squire/api/recipe-book";
import { formatNumber, formatStepCount } from "./format";

const STEPS_EACH = "Average steps to get one at max work efficiency";

export interface ItemSteps {
  steps: number;
  from: string | null;
}

export function itemSteps(item: ItemSummary, sources: ItemSource[]): ItemSteps | null {
  if (!item.isCollectible) {
    return null;
  }

  const rated = sources.flatMap((source) =>
    source.kind === "activity" && source.stepsEach !== null ? [{ steps: source.stepsEach, name: source.name }] : [],
  );
  const [fastest] = rated.sort((faster, slower) => faster.steps - slower.steps);

  if (!fastest) {
    return null;
  }

  return { steps: fastest.steps, from: rated.length > 1 ? fastest.name : null };
}

export function itemStepsDescription({ from }: ItemSteps): string {
  return from ? `${STEPS_EACH}, from ${from}` : STEPS_EACH;
}

export function formatDropSteps({ stepsEach, stepsRange }: ActivityDrop): string | null {
  if (stepsEach === null) {
    return null;
  }

  return stepsRange
    ? `${formatNumber(stepsRange.min)}–${formatNumber(stepsRange.max)} steps each`
    : `${formatStepCount(stepsEach)} each`;
}

export function dropStepsDescription({ stepsEach, stepsRange }: ActivityDrop): string {
  if (!stepsRange || stepsEach === null) {
    return STEPS_EACH;
  }

  return `${STEPS_EACH}. Changes with skill level: ${formatStepCount(stepsEach)} once every drop here is at its full rate.`;
}
