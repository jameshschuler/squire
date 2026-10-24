import { createFileRoute } from "@tanstack/react-router";
import { ActivitiesPage } from "@/components/activities/ActivitiesPage";

export const Route = createFileRoute("/activities")({
  component: ActivitiesPage,
});
