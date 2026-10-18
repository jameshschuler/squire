import { createFileRoute } from "@tanstack/react-router";
import { EffectItemSearch } from "@/components/effects/EffectItemSearch";
import { validateListSearch } from "@/lib/list-search";

export const Route = createFileRoute("/food")({
  validateSearch: validateListSearch,
  component: FoodPage,
});

function FoodPage() {
  const { q = "", skill } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <EffectItemSearch
      kind="foods"
      noun="food"
      query={q}
      skill={skill}
      onQueryChange={(value) => navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true })}
      onSkillChange={(value) => navigate({ search: (prev) => ({ ...prev, skill: value }), replace: true })}
    />
  );
}
