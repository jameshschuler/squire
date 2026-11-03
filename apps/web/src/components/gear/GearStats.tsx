import type { StatGroups } from "@/lib/gear-stats";
import type { BreakdownStep } from "@/lib/steps-breakdown";
import { StatTiles } from "./StatTiles";
import { StepsBreakdown } from "./StepsBreakdown";

export function GearStats({ groups, breakdown }: { groups: StatGroups; breakdown: BreakdownStep[] }) {
  return (
    <section aria-label="Set stats" className="space-y-2">
      <div>
        <StatTiles title="Steps" tiles={groups.steps} />
        <StepsBreakdown steps={breakdown} />
      </div>
      {groups.other.length > 0 && <StatTiles title="Other bonuses" tiles={groups.other} />}
    </section>
  );
}
