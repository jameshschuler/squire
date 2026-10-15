import type { RecipeView, SkillLevel } from "./types.js";

export function minLevel(skills: SkillLevel[]): number {
  return skills.length > 0 ? Math.min(...skills.map((s) => s.level ?? 0)) : Number.POSITIVE_INFINITY;
}

export function byLevel(a: RecipeView, b: RecipeView): number {
  return (
    minLevel(a.skills) - minLevel(b.skills) || sortName(a).localeCompare(sortName(b)) || a.name.localeCompare(b.name)
  );
}

function sortName(recipe: RecipeView): string {
  return recipe.outputs[0]?.name ?? recipe.name;
}
