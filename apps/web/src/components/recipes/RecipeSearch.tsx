import { useMemo } from "react";
import { searchRecipes, type RecipeView } from "@jameshschuler/walkscape-sdk";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkillFilter } from "@/components/shared/SkillFilter";
import { useGameDataContext } from "@/contexts/game-data-context";
import { knownOption, recipeSkills } from "@/lib/skills";
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
  const skills = useMemo(() => recipeSkills(recipes), [recipes]);
  const activeSkill = knownOption(skills, skill);
  const listKey = `${activeSkill ?? "all"}|${query}`;
  const results = useMemo(() => searchRecipes(recipes, query, { skill: activeSkill }), [recipes, query, activeSkill]);

  return (
    <div className="space-y-3 pt-3">
      <SearchInput value={query} placeholder="Search recipes, outputs, materials…" onChange={onQueryChange} />
      <SkillFilter skills={skills} selected={activeSkill} onSelect={onSkillChange} />
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
