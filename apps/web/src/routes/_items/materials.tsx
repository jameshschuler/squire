import { createFileRoute } from "@tanstack/react-router";
import { MaterialSearch } from "@/components/materials/MaterialSearch";
import { validateListSearch } from "@/lib/list-search";

export const Route = createFileRoute("/_items/materials")({
  validateSearch: validateListSearch,
  component: MaterialsPage,
});

function MaterialsPage() {
  const { q: query = "", skill } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <MaterialSearch
      query={query}
      skill={skill}
      onQueryChange={(value) => navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true })}
      onSkillChange={(value) => navigate({ search: (prev) => ({ ...prev, skill: value }), replace: true })}
    />
  );
}
