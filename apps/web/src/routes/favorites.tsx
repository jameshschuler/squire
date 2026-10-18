import { createFileRoute, redirect } from "@tanstack/react-router";
import { FAVORITES_FILTER } from "@/lib/recipe-filters";

export const Route = createFileRoute("/favorites")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { skill: FAVORITES_FILTER }, replace: true });
  },
});
