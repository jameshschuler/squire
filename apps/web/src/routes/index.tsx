import { createFileRoute } from "@tanstack/react-router";
import { RecipeSearch } from "@/components/recipes/RecipeSearch";
import { validateListSearch } from "@/lib/list-search";

export const Route = createFileRoute("/")({
  validateSearch: validateListSearch,
  component: SearchPage,
});

function SearchPage() {
  const { q = "", skill } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <RecipeSearch
      query={q}
      skill={skill}
      onQueryChange={(value) => navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true })}
      onSkillChange={(value) => navigate({ search: (prev) => ({ ...prev, skill: value }), replace: true })}
    />
  );
}
