import { useMemo } from "react";
import type { RecipeView } from "@squire/api/recipe-book";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkillFilter } from "@/components/shared/SkillFilter";
import { useFavoritesContext } from "@/contexts/favorites-context";
import { useGameDataContext } from "@/contexts/game-data-context";
import { FAVORITES_FILTER, filterRecipes, recipeFilters } from "@/lib/recipe-filters";
import { knownOption } from "@/lib/skills";
import { ClearFavoritesButton } from "./ClearFavoritesButton";
import { RecipeResults } from "./RecipeResults";

const NO_RECIPES: RecipeView[] = [];

interface RecipeSearchProps {
  query: string;
  skill: string | undefined;
  onQueryChange: (query: string) => void;
  onSkillChange: (skill: string | undefined) => void;
}

export function RecipeSearch({ query, skill, onQueryChange, onSkillChange }: RecipeSearchProps) {
  const state = useGameDataContext();
  const recipes = state.status === "ready" ? state.book.recipes : NO_RECIPES;
  const { favoriteIds } = useFavoritesContext();
  const filters = useMemo(() => recipeFilters(recipes, favoriteIds), [recipes, favoriteIds]);
  const filter = knownOption(filters, skill);
  const listKey = `${filter ?? "all"}|${query}`;
  const results = useMemo(
    () => filterRecipes(recipes, query, filter, favoriteIds),
    [recipes, query, filter, favoriteIds],
  );

  return (
    <div className="space-y-3 pt-3">
      <SearchInput value={query} placeholder="Search recipes, outputs, materials…" onChange={onQueryChange} />
      <SkillFilter skills={filters} selected={filter} onSelect={onSkillChange} />
      {filter === FAVORITES_FILTER && (
        <div className="flex justify-end">
          <ClearFavoritesButton onCleared={() => onSkillChange(undefined)} />
        </div>
      )}
      {state.status !== "ready" ? (
        <GameDataStatus state={state} />
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No recipes match.</p>
      ) : (
        <RecipeResults key={listKey} listKey={listKey} recipes={results} />
      )}
    </div>
  );
}
