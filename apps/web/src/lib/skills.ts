import type { RecipeView } from "@jameshschuler/walkscape-sdk";

export interface SkillOption {
  id: string;
  name: string;
}

export function uniqueSkills(skills: SkillOption[]): SkillOption[] {
  const byId = new Map(skills.map((s) => [s.id, s.name]));
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function knownOption(options: SkillOption[], selected: string | undefined): string | undefined {
  return options.some((o) => o.id === selected) ? selected : undefined;
}

export function recipeSkills(recipes: RecipeView[]): SkillOption[] {
  return uniqueSkills(recipes.flatMap((r) => r.skills));
}
