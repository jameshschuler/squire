import type { StatGroups } from "@/lib/gear-stats";
import { EfficiencyBreakdown } from "./EfficiencyBreakdown";
import { StatTiles } from "./StatTiles";

export function GearStats({ groups }: { groups: StatGroups }) {
  const overMax = groups.steps.some((tile) => tile.key === "workEfficiency" && tile.over);
  return (
    <section aria-label="Set stats" className="space-y-2">
      <StatTiles title="Steps" tiles={groups.steps} />
      {groups.efficiency.length > 0 && <EfficiencyBreakdown rows={groups.efficiency} open={overMax} />}
      {groups.other.length > 0 && <StatTiles title="Other bonuses" tiles={groups.other} />}
    </section>
  );
}
