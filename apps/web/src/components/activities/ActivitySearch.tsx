import { useMemo } from "react";
import { searchActivities, type ActivityView } from "@squire/api/recipe-book";
import { ClearFavoritesButton } from "@/components/shared/ClearFavoritesButton";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkillFilter } from "@/components/shared/SkillFilter";
import { useFavoritesContext } from "@/contexts/favorites-context";
import { useGameDataContext } from "@/contexts/game-data-context";
import { FAVORITES_FILTER, filterList, listFilters } from "@/lib/list-filters";
import { knownOption } from "@/lib/skills";
import { ActivityResults } from "./ActivityResults";

const NO_ACTIVITIES: ActivityView[] = [];

interface ActivitySearchProps {
  query: string;
  skill: string | undefined;
  onQueryChange: (query: string) => void;
  onSkillChange: (skill: string | undefined) => void;
}

export function ActivitySearch({ query, skill, onQueryChange, onSkillChange }: ActivitySearchProps) {
  const state = useGameDataContext();
  const activities = state.status === "ready" ? state.book.activities : NO_ACTIVITIES;
  const favoriteIds = useFavoritesContext().favoriteIds("activity");
  const filters = useMemo(() => listFilters(activities, favoriteIds), [activities, favoriteIds]);
  const filter = knownOption(filters, skill);
  const results = useMemo(
    () => filterList(activities, searchActivities, { query, filter, favoriteIds }),
    [activities, query, filter, favoriteIds],
  );
  const listKey = `activities|${filter ?? "all"}|${query}`;

  return (
    <div className="space-y-3 pt-3">
      <SearchInput value={query} placeholder="Search activities, drops…" onChange={onQueryChange} />
      <SkillFilter skills={filters} selected={filter} onSelect={onSkillChange} />
      {filter === FAVORITES_FILTER && (
        <div className="flex justify-end">
          <ClearFavoritesButton kind="activity" onCleared={() => onSkillChange(undefined)} />
        </div>
      )}
      {state.status !== "ready" ? (
        <GameDataStatus state={state} />
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No activities match.</p>
      ) : (
        <ActivityResults key={listKey} listKey={listKey} activities={results} />
      )}
    </div>
  );
}
