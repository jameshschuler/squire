import { words, type LocationSummary, type RecipeBook, type SkillLevel } from "@squire/api/recipe-book";
import type { OptimizeTarget } from "@squire/api/gear-data";
import { matchesWords } from "./match";

export interface GearTarget {
  key: string;
  name: string;
  icon: string;
  skill: SkillLevel;
  workRequired: number;
  maxWorkEfficiency: number | null;
  locations: LocationSummary[];
}

export const BEST_LOCATION = "best";

const SUGGESTION_LIMIT = 8;

export function gearTargets(book: RecipeBook): GearTarget[] {
  const activities = book.activities.map((activity) => ({ ...activity, key: `activity:${activity.id}` }));
  const recipes = book.recipes.map((recipe) => ({
    ...recipe,
    key: `recipe:${recipe.id}`,
    locations: recipe.service?.locations ?? [],
  }));
  return [...activities, ...recipes]
    .flatMap(({ key, name, icon, skills: [skill], workRequired, maxWorkEfficiency, locations }) =>
      skill && workRequired !== null ? [{ key, name, icon, skill, workRequired, maxWorkEfficiency, locations }] : [],
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
