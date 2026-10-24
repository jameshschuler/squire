import { createFileRoute } from "@tanstack/react-router";
import { ActivityDetail } from "@/components/activities/ActivityDetail";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { useGameDataContext } from "@/contexts/game-data-context";

export const Route = createFileRoute("/activities_/$activityId")({
  component: ActivityPage,
});

function ActivityPage() {
  const { activityId } = Route.useParams();
  const state = useGameDataContext();
  if (state.status !== "ready") {
    return <GameDataStatus state={state} />;
  }
  const activity = state.book.activities.find((a) => a.id === activityId);
  if (!activity) {
    return <p className="py-8 text-center text-muted-foreground">Activity not found.</p>;
  }
  return <ActivityDetail activity={activity} />;
}
