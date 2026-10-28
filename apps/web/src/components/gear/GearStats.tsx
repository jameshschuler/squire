import type { EfficiencyRow, StatGroups } from "@/lib/gear-stats";
import { StatRows } from "./StatRows";

interface GearStatsProps {
  efficiency: EfficiencyRow;
  groups: StatGroups;
}

export function GearStats({ efficiency, groups }: GearStatsProps) {
  return (
    <section aria-label="Set stats" className="space-y-3 rounded-lg bg-background p-3 text-sm">
      <div>
        <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Steps</h3>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <dt>Work efficiency</dt>
          <dd className="text-right">
            {efficiency.value}
            <span className="block text-xs text-muted-foreground">{efficiency.detail}</span>
          </dd>
          <StatRows rows={groups.steps} />
        </dl>
      </div>
      {groups.other.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Other bonuses</h3>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
            <StatRows rows={groups.other} />
          </dl>
        </div>
      )}
    </section>
  );
}
