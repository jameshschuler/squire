import type { SourcedStat, StepsResult } from "@walkscape-community/gear-optimizer";
import { formatNumber, formatPercent } from "./format";
import { formatStatValue } from "./gear-stats";

export interface BreakdownStep {
  label: string;
  detail: string | null;
  result: string;
  sources: string[];
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
// each step naming the items behind it.
export function stepsBreakdown({ workRequired, levelBonus, cap, result, sources }: BreakdownInput): BreakdownStep[] {
  const linesOf = (stat: StepStat, isPercent: boolean) =>
    sources.filter((source) => source.stat === stat && source.isPercent === isPercent);
  const total = (stat: StepStat, isPercent: boolean) =>
    linesOf(stat, isPercent).reduce((sum, line) => sum + line.value, 0);
  const named = (stat: StepStat, isPercent: boolean) => namedSources(linesOf(stat, isPercent));

  const efficiency = 1 + levelBonus + total("workEfficiency", true);
  const percent = total("stepsRequired", true);
  const flat = total("stepsRequired", false);
  const afterEfficiency = workRequired / result.efficiency;
  const afterPercent = afterEfficiency * (1 + percent);
  const levelSource = levelBonus > 0 ? [`Level bonus ${formatStatValue({ value: levelBonus, isPercent: true })}`] : [];

  return [
    { label: "Base steps", detail: null, result: formatNumber(workRequired), sources: [] },
    {
      label: "Work efficiency",
      detail:
        efficiency > 1 + cap
          ? `${formatPercent(efficiency, 1)}, max ${formatPercent(1 + cap, 1)}`
          : formatPercent(efficiency, 1),
      result: `÷ ${formatPercent(result.efficiency, 1)} = ${formatSteps(afterEfficiency)}`,
      sources: [...levelSource, ...named("workEfficiency", true)],
    },
    ...(percent === 0
      ? []
      : [
          {
            label: "Steps required",
            detail: formatStatValue({ value: percent, isPercent: true }),
            result: formatSteps(afterPercent),
            sources: named("stepsRequired", true),
          },
        ]),
    ...(flat === 0
      ? []
      : [
          {
            label: "Steps required (flat)",
            detail: formatStatValue({ value: flat, isPercent: false }),
            result: formatSteps(afterPercent + flat),
            sources: named("stepsRequired", false),
          },
        ]),
    { label: "Rounded up", detail: null, result: formatNumber(result.steps), sources: [] },
  ];
}

function namedSources(lines: SourcedStat[]): string[] {
  const bySource = new Map<string, SourcedStat>();

  for (const line of lines) {
    const seen = bySource.get(line.source);

    bySource.set(line.source, { ...line, value: (seen?.value ?? 0) + line.value });
  }

  return [...bySource.values()].map((line) => `${line.source} ${formatStatValue(line)}`);
}

function formatSteps(steps: number): string {
  return formatNumber(Number(steps.toFixed(1)));
}
