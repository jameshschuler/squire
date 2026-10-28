import type { StatRow } from "@/lib/gear-stats";

export function StatRows({ rows }: { rows: StatRow[] }) {
  return rows.map((row) => (
    <div key={row.label} className="contents">
      <dt>{row.label}</dt>
      <dd className="text-right">{row.value}</dd>
    </div>
  ));
}
