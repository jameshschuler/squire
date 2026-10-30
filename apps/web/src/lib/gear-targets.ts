import { words, type LocationSummary, type LootType, type RecipeBook, type SkillLevel } from "@squire/api/recipe-book";
import { GOALS, type Goal, type GoalId, type OptimizeTarget } from "@squire/api/gear-data";
import { MAX_GOALS } from "./gear-search";
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
  kind: "activity" | "recipe";
  makesTieredGear: boolean;
}

export const BEST_LOCATION = "best";

const SUGGESTION_LIMIT = 8;

export function gearTargets(book: RecipeBook): GearTarget[] {
  const tiered = new Set(book.gear.filter((g) => g.effects?.tiers.length).map((g) => g.id));
  const activities = book.activities.map((activity) => ({
    ...activity,
    key: `activity:${activity.id}`,
    lootTypes: activity.drops.map((d) => d.lootType),
    kind: "activity" as const,
    makesTieredGear: false,
  }));
  const recipes = book.recipes.map((recipe) => ({
    ...recipe,
    key: `recipe:${recipe.id}`,
    locations: recipe.service?.locations ?? [],
    lootTypes: [],
    kind: "recipe" as const,
    makesTieredGear: recipe.outputs.some((o) => tiered.has(o.id)),
  }));
  return [...activities, ...recipes]
    .flatMap((t) => {
      const [skill] = t.skills;
      return skill && t.workRequired !== null
        ? [
            {
              key: t.key,
              name: t.name,
              icon: t.icon,
              skill,
              workRequired: t.workRequired,
              maxWorkEfficiency: t.maxWorkEfficiency,
              locations: t.locations,
              lootTypes: t.lootTypes,
              kind: t.kind,
              makesTieredGear: t.makesTieredGear,
            },
          ]
        : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function searchGearTargets(targets: GearTarget[], query: string): GearTarget[] {
  const terms = words(query);
  if (terms.length === 0) {
    return [];
  }
  return targets.filter((target) => matchesWords(terms, [target.name])).slice(0, SUGGESTION_LIMIT);
}

export function locationLabel(target: GearTarget, location: string, bestAt: LocationSummary | null): string {
  const chosen = target.locations.find((l) => l.id === location);
  if (chosen) {
    return chosen.name;
  }
  return bestAt ? `Best location: ${bestAt.name}` : "Best location";
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
  return GOALS.filter(
    (goal) =>
      (goal.kind === "any" || goal.kind === target.kind) &&
      (!goal.lootType || target.lootTypes.includes(goal.lootType)) &&
      (goal.id !== "quality" || target.makesTieredGear),
  );
}

export function recommendedGoals(target: GearTarget): GoalId[] {
  const offered = goalsFor(target).map((g) => g.id);
  const preferred: GoalId[] =
    target.kind === "recipe" ? ["steps", "materials", "quality", "xp"] : ["steps", "items", "chests", "xp"];
  return preferred.filter((id) => offered.includes(id)).slice(0, MAX_GOALS);
}

export function tieBreakersFor(target: GearTarget, goals: GoalId[]): GoalId[] {
  return recommendedGoals(target)
    .filter((id) => !goals.includes(id))
    .slice(0, MAX_GOALS - goals.length);
}
