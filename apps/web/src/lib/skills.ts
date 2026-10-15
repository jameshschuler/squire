import type { RecipeView } from "@squire/walkscape-sdk";

export interface SkillOption {
  id: string;
  name: string;
}

export function recipeSkills(recipes: RecipeView[]): SkillOption[] {
  const skills = new Map(recipes.flatMap((r) => r.skills).map((s) => [s.id, s.name]));
  return [...skills].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}
