import type { SourcedStat, StepsResult } from "@walkscape-community/gear-optimizer";
import { formatNumber, formatPercent } from "./format";
import { formatStatValue } from "./gear-stats";

export interface BreakdownSource {
  name: string;
  value: string;
}

export interface BreakdownStep {
  label: string;
  detail: string | null;
  note: string | null;
  result: string;
  sources: BreakdownSource[];
}

export interface BreakdownInput {
  workRequired: number;
  levelBonus: number;
  cap: number;
  result: StepsResult;
  sources: SourcedStat[];
}

type StepStat = "workEfficiency" | "stepsRequired";

// The game's step formula worked through with one set's numbers, from base steps to steps per action,
// each step listing what's behind it, biggest help first.
export function stepsBreakdown({ workRequired, levelBonus, cap, result, sources }: BreakdownInput): BreakdownStep[] {
  const level: SourcedStat[] =
    levelBonus > 0 ? [{ stat: "workEfficiency", isPercent: true, value: levelBonus, source: "Level bonus" }] : [];
  const linesOf = (stat: StepStat, isPercent: boolean) =>
    [...level, ...sources].filter((source) => source.stat === stat && source.isPercent === isPercent);
  const total = (stat: StepStat, isPercent: boolean) =>
    linesOf(stat, isPercent).reduce((sum, line) => sum + line.value, 0);
  const step = (label: string, stat: StepStat, isPercent: boolean, after: number): BreakdownStep => ({
    label,
    detail: formatStatValue({ value: total(stat, isPercent), isPercent }),
    note: null,
    result: formatSteps(after),
    sources: bySource(linesOf(stat, isPercent)),
  });

  const efficiency = 1 + total("workEfficiency", true);
  const percent = total("stepsRequired", true);
  const flat = total("stepsRequired", false);
  const afterEfficiency = workRequired / result.efficiency;
  const afterPercent = afterEfficiency * (1 + percent);
  const capped = efficiency > 1 + cap;

  return [
    { label: "Base steps", detail: null, note: null, result: formatNumber(workRequired), sources: [] },
    {
      label: "Work efficiency",
      detail: `÷ ${formatPercent(result.efficiency, 1)}`,
      note: capped
        ? `${formatPercent(efficiency, 1)} from gear and level, capped at ${formatPercent(1 + cap, 1)}`
        : null,
      result: formatSteps(afterEfficiency),
      sources: bySource(linesOf("workEfficiency", true)),
    },
    ...(percent === 0 ? [] : [step("Steps required", "stepsRequired", true, afterPercent)]),
    ...(flat === 0 ? [] : [step("Flat steps", "stepsRequired", false, afterPercent + flat)]),
    { label: "Rounded up", detail: null, note: null, result: formatNumber(result.steps), sources: [] },
  ];
}

function bySource(lines: SourcedStat[]): BreakdownSource[] {
  const totals = new Map<string, SourcedStat>();

  for (const line of lines) {
    const seen = totals.get(line.source);

    totals.set(line.source, { ...line, value: (seen?.value ?? 0) + line.value });
  }

  return [...totals.values()]
    .sort((left, right) => gain(right) - gain(left))
    .map((line) => ({ name: line.source, value: formatStatValue(line) }));
}

// Fewer steps required is a gain, so its sign flips.
function gain({ stat, value }: SourcedStat): number {
  return stat === "stepsRequired" ? -value : value;
}

function formatSteps(steps: number): string {
  return formatNumber(Number(steps.toFixed(1)));
}
