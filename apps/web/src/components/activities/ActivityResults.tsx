import type { ActivityView } from "@squire/api/recipe-book";
import { useIncrementalList } from "@/hooks/useIncrementalList";
import { ActivityListItem } from "./ActivityListItem";

const PAGE_SIZE = 50;

interface ActivityResultsProps {
  activities: ActivityView[];
  listKey: string;
}

export function ActivityResults({ activities, listKey }: ActivityResultsProps) {
  const { visibleItems, hasMore, sentinelRef } = useIncrementalList(activities, listKey, PAGE_SIZE);
  return (
    <>
      <ul className="divide-y">
        {visibleItems.map((activity) => (
          <ActivityListItem key={activity.id} activity={activity} />
        ))}
      </ul>
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
    </>
  );
}
