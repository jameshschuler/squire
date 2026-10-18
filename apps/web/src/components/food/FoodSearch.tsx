import { useMemo } from "react";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkillFilter } from "@/components/shared/SkillFilter";
import { useGameDataContext } from "@/contexts/game-data-context";
import type { Food } from "@squire/api/recipe-book";
import { foodFilters, searchFoods } from "@/lib/foods";
import { knownOption } from "@/lib/skills";
import { FoodResults } from "./FoodResults";

const NO_FOODS: Food[] = [];

interface FoodSearchProps {
  query: string;
  skill: string | undefined;
  onQueryChange: (query: string) => void;
  onSkillChange: (skill: string | undefined) => void;
}

export function FoodSearch({ query, skill, onQueryChange, onSkillChange }: FoodSearchProps) {
  const state = useGameDataContext();
  const book = state.status === "ready" ? state.book : undefined;
  const foods = book?.foods ?? NO_FOODS;
  const filters = useMemo(() => foodFilters(foods), [foods]);
  const filter = knownOption(filters, skill);
  const results = useMemo(() => searchFoods(foods, query, { filter }), [foods, query, filter]);
  const listKey = `food|${filter ?? "all"}|${query}`;

  return (
    <div className="space-y-3 pt-3">
      <SearchInput value={query} placeholder="Search food…" onChange={onQueryChange} />
      <SkillFilter skills={filters} selected={filter} onSelect={onSkillChange} />
      {state.status !== "ready" ? (
        <GameDataStatus state={state} />
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No food matches.</p>
      ) : (
        <FoodResults key={listKey} listKey={listKey} foods={results} filter={filter} />
      )}
    </div>
  );
}
