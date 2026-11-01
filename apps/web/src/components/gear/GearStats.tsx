import type { StatGroups } from "@/lib/gear-stats";
import { StatTiles } from "./StatTiles";

export function GearStats({ groups }: { groups: StatGroups }) {
  return (
    <section aria-label="Set stats" className="space-y-2">
      <StatTiles title="Steps" tiles={groups.steps} />
      {groups.other.length > 0 && <StatTiles title="Other bonuses" tiles={groups.other} />}
    </section>
  );
}
