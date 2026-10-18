import { createFileRoute } from "@tanstack/react-router";
import { EffectItemSearch } from "@/components/effects/EffectItemSearch";
import { validateListSearch } from "@/lib/list-search";

export const Route = createFileRoute("/loot")({
  validateSearch: validateListSearch,
  component: LootPage,
});

function LootPage() {
  const { q = "", skill } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <EffectItemSearch
      kind="loot"
      noun="loot"
      query={q}
      skill={skill}
      onQueryChange={(value) => navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true })}
      onSkillChange={(value) => navigate({ search: (prev) => ({ ...prev, skill: value }), replace: true })}
    />
  );
}
