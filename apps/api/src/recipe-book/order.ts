import type { ActivityView, RecipeView, SkillLevel } from "./types.js";

export function minLevel(skills: SkillLevel[]): number {
  return skills.length > 0 ? Math.min(...skills.map((skill) => skill.level ?? 0)) : Number.POSITIVE_INFINITY;
}

export function byLevel(left: RecipeView, right: RecipeView): number {
  return (
    minLevel(left.skills) - minLevel(right.skills) ||
    sortName(left).localeCompare(sortName(right)) ||
    left.name.localeCompare(right.name)
  );
}

function sortName(recipe: RecipeView): string {
  return recipe.outputs[0]?.name ?? recipe.name;
}

export function byActivityLevel(left: ActivityView, right: ActivityView): number {
  return minLevel(left.skills) - minLevel(right.skills) || left.name.localeCompare(right.name);
}
