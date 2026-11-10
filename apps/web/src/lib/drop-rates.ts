import type { DropRate, DropRateRange, ItemSource, ItemSummary, ValueRange } from "@squire/api/recipe-book";
import { formatNumber } from "./format";

const CHANCE = "Chance per action of getting at least one";
const STEPS = "Average steps to get one, at max work efficiency and at base rate (no work efficiency)";
const BY_LEVEL = ". Changes with skill level.";
const PERCENT = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 });

export interface ItemRate {
  rate: DropRate;
  range: DropRateRange | null;
  from: string | null;
}

export function itemRate(item: ItemSummary, sources: ItemSource[]): ItemRate | null {
  if (!item.isCollectible) {
    return null;
  }

  const rated = sources.flatMap((source) =>
    source.kind === "activity" && source.rate.stepsEach !== null
      ? [{ rate: source.rate, range: source.rateRange, steps: source.rate.stepsEach, name: source.name }]
      : [],
  );
  const [fastest] = rated.sort((faster, slower) => faster.steps - slower.steps);

  if (!fastest) {
    return null;
  }

  return { rate: fastest.rate, range: fastest.range, from: rated.length > 1 ? fastest.name : null };
}

export function formatChance({ chance }: DropRate, range: DropRateRange | null): string {
  if (range?.chance) {
    const { min, max } = range.chance;
    const chances = `${percent(min)}–${percent(max)}`;

    return odds(max) > 1
      ? `${chances} · 1 in ${formatNumber(odds(max))}–${formatNumber(odds(min))} actions`
      : `${chances} of actions`;
  }

  if (odds(chance) > 1) {
    return `${percent(chance)} · 1 in ${formatNumber(odds(chance))} actions`;
  }

  return percent(chance) === "100%" ? "Every action" : `${percent(chance)} of actions`;
}

export function formatRateSteps({ stepsEach, baseSteps }: DropRate, range: DropRateRange | null): string | null {
  const steps = range?.stepsEach ? formatRange(range.stepsEach) : stepsEach !== null && formatNumber(stepsEach);
  const base = range?.baseSteps ? formatRange(range.baseSteps) : baseSteps !== null && formatNumber(baseSteps);

  if (!base) {
    return null;
  }

  return steps ? `~${steps} steps · ${base} at base rate` : `~${base} steps at base rate`;
}

export function chanceDescription(range: DropRateRange | null): string {
  return range?.chance ? `${CHANCE}${BY_LEVEL}` : CHANCE;
}

export function stepsDescription(range: DropRateRange | null): string {
  return range?.stepsEach || range?.baseSteps ? `${STEPS}${BY_LEVEL}` : STEPS;
}

export function fromSource(description: string, from: string | null): string {
  return from ? `${description}, from ${from}` : description;
}

function percent(chance: number): string {
  return `${PERCENT.format(chance * 100)}%`;
}

function odds(chance: number): number {
  return Math.round(1 / chance);
}

function formatRange({ min, max }: ValueRange): string {
  return `${formatNumber(min)}–${formatNumber(max)}`;
}
