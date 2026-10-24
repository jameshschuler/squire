import { createFileRoute } from "@tanstack/react-router";
import { ActivitySearch } from "@/components/activities/ActivitySearch";
import { validateListSearch } from "@/lib/list-search";

export const Route = createFileRoute("/activities")({
  validateSearch: validateListSearch,
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { q = "", skill } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ActivitySearch
      query={q}
      skill={skill}
      onQueryChange={(value) => navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true })}
      onSkillChange={(value) => navigate({ search: (prev) => ({ ...prev, skill: value }), replace: true })}
    />
  );
}
