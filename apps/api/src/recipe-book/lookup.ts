import type { ItemSource, ItemSummary, RecipeBook, RecipeView, SkillLevel } from "./types.js";

export function findItem(book: RecipeBook, itemId: string): ItemSummary | undefined {
  for (const recipe of book.recipes) {
    const found = [...recipe.outputs, ...recipe.materials.flat()].find((i) => i.id === itemId);
    if (found) {
      return { id: found.id, name: found.name, icon: found.icon, keywords: found.keywords, effects: found.effects };
    }
  }
  return book.foods.find((food) => food.id === itemId) ?? book.loot.find((loot) => loot.id === itemId);
}

export function findRecipesByOutput(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.outputs.some((o) => o.id === itemId));
}

export function findRecipesByMaterial(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.materials.some((slot) => slot.some((m) => m.id === itemId)));
}

export function recipeBookIcons(book: RecipeBook): string[] {
  const recipeIcons = book.recipes.flatMap((r) => [r, ...r.outputs, ...r.materials.flat()]);
  const sourceIcons = Object.values(book.sources).flat();
  return [...new Set([...recipeIcons, ...book.foods, ...book.loot, ...sourceIcons].map((i) => i.icon).filter(Boolean))];
}

export function sourceKey(source: ItemSource): string {
  return source.kind === "activity" ? `activity:${source.id}:${source.lootType}` : `${source.kind}:${source.id}`;
}

export function lowestSkillLevels(skills: SkillLevel[]): SkillLevel[] {
  const lowest = new Map<string, SkillLevel>();
  for (const skill of skills) {
    const current = lowest.get(skill.id);
    if (!current || (skill.level ?? 0) < (current.level ?? 0)) {
      lowest.set(skill.id, skill);
    }
  }
  return [...lowest.values()].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
}
