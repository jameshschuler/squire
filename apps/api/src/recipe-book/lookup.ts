import { isSkillLevelRequirement } from "./game-rules.js";
import type {
  ActivityView,
  ItemSource,
  ItemSummary,
  ItemWithEffects,
  RecipeBook,
  RecipeView,
  SkillLevel,
  XpReward,
} from "./types.js";

export function findItem(book: RecipeBook, itemId: string): ItemWithEffects | undefined {
  const listed =
    book.foods.find((item) => item.id === itemId) ??
    book.loot.find((item) => item.id === itemId) ??
    book.gear.find((item) => item.id === itemId);

  if (listed) {
    return listed;
  }

  const found = [...recipeItems(book.recipes), ...activityItems(book.activities)].find((item) => item.id === itemId);

  if (!found) {
    return undefined;
  }

  return { ...found, effects: null };
}

export function activityItems(activities: ActivityView[]): ItemSummary[] {
  return activities.flatMap((activity) => [
    ...activity.drops.flatMap((drop) => drop.items),
    ...[...activity.needs, ...activity.uses].flatMap((entry) => (entry.item ? [entry.item] : [])),
  ]);
}

function recipeItems(recipes: RecipeView[]): ItemSummary[] {
  return recipes
    .flatMap((recipe) => [...recipe.outputs, ...recipe.materials.flat()])
    .map(({ amount: _amount, ...item }) => item);
}

export function findRecipesByOutput(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((recipe) => recipe.outputs.some((output) => output.id === itemId));
}

export function findRecipesByMaterial(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((recipe) => recipe.materials.some((slot) => slot.some((material) => material.id === itemId)));
}

export function recipeBookIcons(book: RecipeBook): string[] {
  const recipeIcons = [...book.recipes, ...recipeItems(book.recipes)];
  const activityIcons = [...book.activities, ...activityItems(book.activities)];
  const sourceIcons = Object.values(book.sources).flat();

  return [
    ...new Set(
      [...recipeIcons, ...activityIcons, ...book.foods, ...book.loot, ...book.gear, ...sourceIcons]
        .map((item) => item.icon)
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

  return [...lowest.values()].sort((left, right) => (left.level ?? 0) - (right.level ?? 0));
}

export function xpRewards(rewards: Record<string, number> | null, skillName: (id: string) => string): XpReward[] {
  return Object.entries(rewards ?? {}).map(([id, amount]) => ({ id, name: skillName(id), amount }));
}

export function skillLevels(
  skillIds: string[],
  requirements: { type: string }[],
  skillName: (id: string) => string,
): SkillLevel[] {
  const levels = new Map(
    requirements
      .filter(isSkillLevelRequirement)
      .map((skillRequirement) => [skillRequirement.requirement.skill, skillRequirement.requirement.level]),
  );

  return skillIds.map((id) => ({ id, name: skillName(id), level: levels.get(id) ?? null }));
}
