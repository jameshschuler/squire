import { useMemo } from "react";
import { Search } from "lucide-react";
import { searchRecipes, type RecipeView } from "@squire/walkscape-sdk";
import { Input } from "@/components/ui/input";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { useGameDataContext } from "@/contexts/game-data-context";
import { recipeSkills } from "@/lib/skills";
import { RecipeResults } from "./RecipeResults";
import { SkillFilter } from "./SkillFilter";

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
  const skills = useMemo(() => recipeSkills(recipes), [recipes]);
  const listKey = `${skill ?? "all"}|${query}`;
  const results = useMemo(() => searchRecipes(recipes, query, { skill }), [recipes, query, skill]);

  return (
    <div className="space-y-3 pt-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search recipes, outputs, materials…"
          className="h-11 pl-9 text-base"
          autoFocus
        />
      </div>
      <SkillFilter skills={skills} selected={skill} onSelect={onSkillChange} />
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
