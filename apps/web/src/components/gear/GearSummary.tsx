import { Gauge } from "lucide-react";
import type { StatRow } from "@/lib/gear-stats";

interface GearSummaryProps {
  priorities: StatRow[];
  efficiencyStatus: string;
  steps: string | null;
  context: string[];
  compare: { label: string; onClick: () => void } | null;
}

export function GearSummary({ priorities, efficiencyStatus, steps, context, compare }: GearSummaryProps) {
  return (
    <section aria-label="Summary" className="space-y-1.5">
      <ol className="space-y-0.5">
        {priorities.map((priority, i) => (
          <li key={priority.label} className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {i + 1}. {priority.label}
            </span>
            <span className="text-right font-semibold">{priority.value}</span>
          </li>
        ))}
      </ol>
      {steps && <p className="text-sm">{steps}</p>}
      <p className="flex items-center gap-1.5 text-sm">
        <Gauge className="size-4 shrink-0 text-muted-foreground" />
        {efficiencyStatus}
      </p>
      {context.length > 0 && <p className="text-xs text-muted-foreground">{context.join(" · ")}</p>}
      {compare && (
        <button type="button" onClick={compare.onClick} className="text-xs font-medium underline underline-offset-4">
          {compare.label}
        </button>
      )}
    </section>
  );
}
