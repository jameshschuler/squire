import type { BreakdownRow } from "@/lib/gear-stats";

export function EfficiencyBreakdown({ rows, open }: { rows: BreakdownRow[]; open: boolean }) {
  return (
    <details open={open} className="rounded-lg border bg-background px-2 py-1.5 text-xs">
      <summary className="cursor-pointer font-medium">How work efficiency adds up</summary>
      <dl className="mt-1 space-y-0.5">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
