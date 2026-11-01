import { createFileRoute } from "@tanstack/react-router";
import { GearPage } from "@/components/gear/GearPage";
import { validateGearSearch } from "@/lib/gear-search";

export const Route = createFileRoute("/gear")({
  validateSearch: validateGearSearch,
  component: GearRoute,
});

function GearRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <GearPage search={search} onSearchChange={(next) => navigate({ search: next })} />;
}
