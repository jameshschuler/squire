import { words, type LocationSummary, type LootType, type RecipeBook, type SkillLevel } from "@squire/api/recipe-book";
import { GOALS, type Goal, type OptimizeTarget } from "@squire/api/gear-data";
import { matchesWords } from "./match";

export interface GearTarget {
  key: string;
  name: string;
  icon: string;
  skill: SkillLevel;
  workRequired: number;
  maxWorkEfficiency: number | null;
  locations: LocationSummary[];
  lootTypes: LootType[];
}

export const BEST_LOCATION = "best";

const SUGGESTION_LIMIT = 8;

export function gearTargets(book: RecipeBook): GearTarget[] {
  const activities = book.activities.map((activity) => ({
    ...activity,
    key: `activity:${activity.id}`,
    lootTypes: activity.drops.map((d) => d.lootType),
  }));
  const recipes = book.recipes.map((recipe) => ({
    ...recipe,
    key: `recipe:${recipe.id}`,
    locations: recipe.service?.locations ?? [],
    lootTypes: [],
  }));
  return [...activities, ...recipes]
    .flatMap(({ key, name, icon, skills: [skill], workRequired, maxWorkEfficiency, locations, lootTypes }) =>
      skill && workRequired !== null
        ? [{ key, name, icon, skill, workRequired, maxWorkEfficiency, locations, lootTypes }]
        : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function searchGearTargets(targets: GearTarget[], query: string): GearTarget[] {
  const terms = words(query);
  if (terms.length === 0) {
    return [];
  }
  return targets.filter((target) => matchesWords(terms, [target.name])).slice(0, SUGGESTION_LIMIT);
}

export function optimizeTarget(target: GearTarget, location: string | undefined): OptimizeTarget {
  const pinned = target.locations.find((l) => l.id === location);
  return {
    skill: target.skill.id,
    level: target.skill.level ?? 1,
    workRequired: target.workRequired,
    maxWorkEfficiency: target.maxWorkEfficiency,
    locationIds: (pinned ? [pinned] : target.locations).map((l) => l.id),
  };
}

export function goalsFor(target: GearTarget): Goal[] {
  const isActivity = target.key.startsWith("activity:");
  return GOALS.filter(
    (goal) => (goal.id !== "fine" || isActivity) && (!goal.lootType || target.lootTypes.includes(goal.lootType)),
  );
}
