import type {
  ActivitiesRequirement,
  ActivityDetail,
  KeywordInput,
  LootTableDetail,
  SpecificInput,
} from "@walkscape-community/data-api-client";
import { itemsIn, lootTypeOf } from "./game-rules.js";
import { skillLevels } from "./lookup.js";
import { byActivityLevel } from "./order.js";
import { humanize } from "./text.js";
import type {
  ActivityDrops,
  ActivityNeed,
  ActivityView,
  ItemSummary,
  LocationSummary,
  LootType,
  SkillLevel,
} from "./types.js";

const LOOT_ORDER: LootType[] = ["main", "secondary", "gem", "birdNest", "chestTable", "collectible", "petEgg"];

export interface ActivityIndexes {
  summary: (id: string) => ItemSummary;
  skillName: (id: string) => string;
  locationsByActivity: Map<string, LocationSummary[]>;
  tables: Map<string, LootTableDetail>;
}

export function activityViews(activities: ActivityDetail[], indexes: ActivityIndexes): ActivityView[] {
  return activities
    .map((activity) => activityView(activity, indexes))
    .filter((activity) => activity.drops.length > 0)
    .sort(byActivityLevel);
}

function activityView(activity: ActivityDetail, indexes: ActivityIndexes): ActivityView {
  const requirements = activity.requirements ?? [];
  return {
    id: activity.id,
    name: activity.name,
    icon: activity.icon ?? "",
    skills: skillLevels(activity.relatedSkillsList, requirements, indexes.skillName),
    locations: indexes.locationsByActivity.get(activity.id) ?? [],
    needs: requirements.flatMap((requirement) => needOf(requirement, indexes)),
    uses: (activity.options ?? []).flatMap((option) =>
      option.type === "inputActivity" ? option.inputs.map((input) => useOf(input, indexes)) : [],
    ),
    drops: dropsOf(activity, indexes),
    workRequired: activity.workRequired,
    maxWorkEfficiency: activity.maxWorkEfficiency,
  };
}

const need = (label: string, level: SkillLevel | null = null, item: ItemSummary | null = null): ActivityNeed => ({
  label,
  level,
  item,
});

function needOf(requirement: ActivitiesRequirement, { summary, skillName }: ActivityIndexes): ActivityNeed[] {
  if (requirement.opposite) {
    return [];
  }
  switch (requirement.type) {
    case "keywordEquipped":
      return [need(humanize(requirement.requirement.keyword))];
    case "keywordWithLevelEquipped": {
      const { keyword, skill, level } = requirement.requirement;
      return [need(humanize(keyword), { id: skill, name: skillName(skill), level })];
    }
    case "distinctKeywordItemsEquipped": {
      const { quantity, keywords } = requirement.requirement;
      const kinds = humanize(keywords.join(" or "));
      return [need(quantity > 1 ? `${kinds} (${quantity} different)` : kinds)];
    }
    case "itemEquipped": {
      const item = summary(requirement.requirement.item);
      return [need(item.name, null, item)];
    }
    case "itemAnywhereWithYou": {
      const item = summary(requirement.requirement.item);
      return [need(`${item.name} with you`, null, item)];
    }
    case "achievementPoint": {
      const { value, isPercentage } = requirement.requirement;
      return [need(isPercentage ? `${value}% of achievement points` : `${value} achievement points`)];
    }
    default:
      return [];
  }
}

function useOf(input: KeywordInput | SpecificInput, { summary, skillName }: ActivityIndexes): ActivityNeed {
  if (input.type === "specific") {
    const item = summary(input.item);
    return need(`${input.quantity} × ${item.name}`, null, item);
  }
  const [tier] = input.requirements ?? [];
  const level = tier
    ? { id: tier.requirement.skill, name: skillName(tier.requirement.skill), level: tier.requirement.level }
    : null;
  return need(humanize(input.keyword), level);
}

function dropsOf(activity: ActivityDetail, { summary, tables }: ActivityIndexes): ActivityDrops[] {
  const byType = new Map<LootType, Set<string>>();
  for (const ref of activity.tables ?? []) {
    const lootType = lootTypeOf(ref);
    const itemIds = byType.get(lootType) ?? new Set<string>();
    for (const itemId of itemsIn(ref, tables)) {
      itemIds.add(itemId);
    }
    byType.set(lootType, itemIds);
  }
  return [...byType]
    .filter(([, itemIds]) => itemIds.size > 0)
    .map(([lootType, itemIds]) => ({ lootType, items: [...itemIds].map(summary) }))
    .sort((a, b) => LOOT_ORDER.indexOf(a.lootType) - LOOT_ORDER.indexOf(b.lootType));
}
