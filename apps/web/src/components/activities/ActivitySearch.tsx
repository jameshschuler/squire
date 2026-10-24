import { useMemo } from "react";
import { searchActivities, type ActivityView } from "@squire/api/recipe-book";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkillFilter } from "@/components/shared/SkillFilter";
import { useGameDataContext } from "@/contexts/game-data-context";
import { knownOption, skillOptions } from "@/lib/skills";
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
  const filters = useMemo(() => skillOptions(activities), [activities]);
  const filter = knownOption(filters, skill);
  const results = useMemo(() => searchActivities(activities, query, { skill: filter }), [activities, query, filter]);
  const listKey = `activities|${filter ?? "all"}|${query}`;

  return (
    <div className="space-y-3 pt-3">
      <SearchInput value={query} placeholder="Search activities, drops…" onChange={onQueryChange} />
      <SkillFilter skills={filters} selected={filter} onSelect={onSkillChange} />
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
