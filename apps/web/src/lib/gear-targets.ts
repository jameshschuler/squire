import {
  words,
  type GearNeed,
  type LocationSummary,
  type LootType,
  type RecipeBook,
  type SkillLevel,
} from "@squire/api/recipe-book";
import { GOALS, type Goal, type GoalId, type OptimizeTarget } from "@walkscape-community/gear-optimizer";
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
  needs: GearNeed[];
  baseXp: number;
}

export const BEST_LOCATION = "best";

const SUGGESTION_LIMIT = 8;

// One action, then the game moves you on, so nobody wants a gear set for it (and its search is slow).
const ONE_TRIP_ACTIVITIES = new Set(["venture_into_the_hideout"]);

export function gearTargets(book: RecipeBook): GearTarget[] {
  const tiered = new Set(book.gear.filter((gearItem) => gearItem.effects?.tiers.length).map((gearItem) => gearItem.id));
  const activities = book.activities
    .filter((activity) => !ONE_TRIP_ACTIVITIES.has(activity.id))
    .map((activity) => ({
      ...activity,
      key: `activity:${activity.id}`,
      lootTypes: activity.drops.map((drop) => drop.lootType),
      kind: "activity" as const,
      makesTieredGear: false,
      needs: activity.gearNeeds,
    }));
  const recipes = book.recipes.map((recipe) => ({
    ...recipe,
    key: `recipe:${recipe.id}`,
    locations: recipe.service?.locations ?? [],
    lootTypes: [],
    kind: "recipe" as const,
    makesTieredGear: recipe.outputs.some((output) => tiered.has(output.id)),
    needs: [],
  }));

  return [...activities, ...recipes]
    .flatMap((entry) => {
      const [skill] = entry.skills;

      return skill && entry.workRequired !== null
        ? [
            {
              key: entry.key,
              name: entry.name,
              icon: entry.icon,
              skill,
              workRequired: entry.workRequired,
              maxWorkEfficiency: entry.maxWorkEfficiency,
              locations: entry.locations,
              lootTypes: entry.lootTypes,
              kind: entry.kind,
              makesTieredGear: entry.makesTieredGear,
              needs: entry.needs,
              baseXp: entry.xp.find((reward) => reward.id === skill.id)?.amount ?? 0,
            },
          ]
        : [];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function searchGearTargets(targets: GearTarget[], query: string): GearTarget[] {
  const terms = words(query);

  if (terms.length === 0) {
    return [];
  }

  return targets.filter((target) => matchesWords(terms, [target.name])).slice(0, SUGGESTION_LIMIT);
}

export function locationLabel(target: GearTarget, locationId: string, bestAt: LocationSummary | null): string {
  const chosen = target.locations.find((location) => location.id === locationId);

  if (chosen) {
    return chosen.name;
  }

  return bestAt ? `Best location: ${bestAt.name}` : "Best location";
}

export function locationRegion(target: GearTarget, locationId: string, bestAt: LocationSummary | null): string | null {
  return target.locations.find((location) => location.id === locationId)?.region ?? bestAt?.region ?? null;
}

export function optimizeTarget(target: GearTarget, locationId: string | undefined): OptimizeTarget {
  const pinned = target.locations.find((location) => location.id === locationId);

  return {
    skill: target.skill.id,
    level: target.skill.level ?? 1,
    workRequired: target.workRequired,
    maxWorkEfficiency: target.maxWorkEfficiency,
    locationIds: (pinned ? [pinned] : target.locations).map((location) => location.id),
    needs: target.needs,
    baseXp: target.baseXp,
  };
}

export function goalsFor(target: GearTarget): Goal[] {
  const lootTypes = new Set(target.lootTypes);

  return GOALS.filter(
    (goal) =>
      (goal.kind === "any" || goal.kind === target.kind) &&
      (!goal.lootType || lootTypes.has(goal.lootType)) &&
      (goal.id !== "quality" || target.makesTieredGear),
  );
}

export function recommendedGoals(target: GearTarget): GoalId[] {
  const offered = new Set(goalsFor(target).map((goal) => goal.id));
  const preferred: GoalId[] =
    target.kind === "recipe" ? ["steps", "materials", "quality", "xp"] : ["steps", "items", "chests", "xp"];

  return preferred.filter((id) => offered.has(id)).slice(0, MAX_GOALS);
}

export function tieBreakersFor(target: GearTarget, goals: GoalId[]): GoalId[] {
  const picked = new Set(goals);

  return recommendedGoals(target)
    .filter((id) => !picked.has(id))
    .slice(0, MAX_GOALS - goals.length);
}
