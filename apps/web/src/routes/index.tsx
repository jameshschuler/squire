import { createFileRoute } from "@tanstack/react-router";
import { RecipeSearch } from "@/components/recipes/RecipeSearch";

interface SearchParams {
  q?: string;
  skill?: string;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
    skill: typeof search.skill === "string" ? search.skill : undefined,
  }),
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
