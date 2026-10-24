import { Link } from "@tanstack/react-router";
import type { ActivityView } from "@squire/api/recipe-book";
import { GameIcon } from "@/components/shared/GameIcon";
import { formatSkillLevel } from "@/lib/format";

export function ActivityListItem({ activity }: { activity: ActivityView }) {
  const details = [...activity.skills.map(formatSkillLevel), ...activity.needs.map((need) => need.label)].join(" · ");
  return (
    <li>
      <Link
        to="/activities/$activityId"
        params={{ activityId: activity.id }}
        className="flex items-center gap-3 py-2.5"
      >
        <GameIcon path={activity.icon} />
        <span className="min-w-0">
          <span className="block font-medium">{activity.name}</span>
          <span className="block truncate text-sm text-muted-foreground">{details}</span>
        </span>
      </Link>
    </li>
  );
}
