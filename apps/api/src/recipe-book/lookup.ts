import { isSkillLevelRequirement } from "./game-rules.js";
import type { ItemSource, ItemWithEffects, RecipeBook, RecipeView, SkillLevel } from "./types.js";

export function findItem(book: RecipeBook, itemId: string): ItemWithEffects | undefined {
  const listed =
    book.foods.find((item) => item.id === itemId) ??
    book.loot.find((item) => item.id === itemId) ??
    book.gear.find((item) => item.id === itemId);
  if (listed) {
    return listed;
  }
  for (const recipe of book.recipes) {
    const found = [...recipe.outputs, ...recipe.materials.flat()].find((i) => i.id === itemId);
    if (found) {
      const { amount: _amount, ...item } = found;
      return { ...item, effects: null };
    }
  }
  return undefined;
}

export function findRecipesByOutput(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.outputs.some((o) => o.id === itemId));
}

export function findRecipesByMaterial(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.materials.some((slot) => slot.some((m) => m.id === itemId)));
}

export function recipeBookIcons(book: RecipeBook): string[] {
  const recipeIcons = book.recipes.flatMap((r) => [r, ...r.outputs, ...r.materials.flat()]);
  const activityIcons = book.activities.flatMap((a) => [
    a,
    ...a.drops.flatMap((d) => d.items),
    ...[...a.needs, ...a.uses].flatMap((n) => (n.item ? [n.item] : [])),
  ]);
  const sourceIcons = Object.values(book.sources).flat();
  return [
    ...new Set(
      [...recipeIcons, ...activityIcons, ...book.foods, ...book.loot, ...book.gear, ...sourceIcons]
        .map((i) => i.icon)
        .filter(Boolean),
    ),
  ];
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

export function skillLevels(
  skillIds: string[],
  requirements: { type: string }[],
  skillName: (id: string) => string,
): SkillLevel[] {
  const levels = new Map(
    requirements.filter(isSkillLevelRequirement).map((r) => [r.requirement.skill, r.requirement.level]),
  );
  return skillIds.map((id) => ({ id, name: skillName(id), level: levels.get(id) ?? null }));
}
