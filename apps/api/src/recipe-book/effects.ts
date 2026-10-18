import type { Attribute, ItemDetail, Requirement, SkillDetail } from "@jameshschuler/walkscape-data-client";
import { capitalize, spaced } from "./text.js";
import {
  QUALITIES,
  type Effect,
  type EffectTarget,
  type ItemEffects,
  type ItemQuality,
  type QualityEffects,
} from "./types.js";

export const TRAVELLING: EffectTarget = { id: "travelling", name: "Travelling" };
const OTHER_CONDITIONS = " (with other conditions)";

export interface EffectNames {
  skills: SkillDetail[];
  regions: Map<string, string>;
  items: Map<string, ItemDetail>;
}

interface StatValue {
  value: number;
  isPercent: boolean;
}

export function itemEffects(item: ItemDetail, names: EffectNames): ItemEffects | null {
  if (item.type === "consumable") {
    return foodEffects(item, names);
  }
  const gearEffects = (attributes: Attribute[]) =>
    attributes.flatMap((attribute) => effectLine(attribute, null, names));
  const base = item.itemAttrs ?? [];
  const effects = gearEffects(base);
  const tiers = qualityTotals(base, item.itemQualityAttrs ?? []).map(({ quality, attributes }): QualityEffects => ({
    quality,
    effects: gearEffects(attributes),
  }));
  return effects.length > 0 || tiers.length > 0 ? { steps: null, effects, tiers } : null;
}

function qualityTotals(
  base: Attribute[],
  tiers: { quality: ItemQuality; attributes: Attribute[] | null }[],
): { quality: ItemQuality; attributes: Attribute[] }[] {
  const totals = new Map(base.map((attribute) => [attributeKey(attribute), attribute]));
  return [...tiers]
    .sort((a, b) => QUALITIES.indexOf(a.quality) - QUALITIES.indexOf(b.quality))
    .map(({ quality, attributes }) => {
      for (const attribute of attributes ?? []) {
        const key = attributeKey(attribute);
        totals.set(key, addStats(totals.get(key), attribute));
      }
      return { quality, attributes: [...totals.values()] };
    });
}

function attributeKey(attribute: Attribute): string {
  return JSON.stringify([attribute.statText, attribute.customText, attribute.requirements ?? []]);
}

function addStats(total: Attribute | undefined, attribute: Attribute): Attribute {
  const stat = statValue(attribute);
  const totalStat = total && statValue(total);
  if (!stat || !totalStat) {
    return attribute;
  }
  return { ...attribute, stats: [{ ...stat, value: totalStat.value + stat.value }] };
}

function foodEffects(item: Extract<ItemDetail, { type: "consumable" }>, names: EffectNames): ItemEffects | null {
  const buff = item.buffs?.[0];
  if (!buff) {
    return null;
  }
  const effects = buff.data.flatMap((data) =>
    data.buffs.flatMap((group) =>
      group.attributes.flatMap((attribute, i) => effectLine(attribute, group.fineAttributes[i] ?? attribute, names)),
    ),
  );
  return { steps: "steps" in buff.duration ? buff.duration.steps : null, effects, tiers: [] };
}

function effectLine(attribute: Attribute, fine: Attribute | null, names: EffectNames): Effect[] {
  const stat = statValue(attribute);
  if (!stat) {
    return [];
  }
  const isChance = attribute.customText !== "";
  const format = (value: StatValue) => (isChance ? formatAmount(value) : formatSigned(value));
  return [
    {
      ...effectScope(attribute, names),
      stat: isChance ? customText(attribute.customText, names.items) : attribute.statText,
      normal: format(stat),
      fine: fine ? format(statValue(fine) ?? stat) : null,
    },
  ];
}

function statValue(attribute: Attribute): StatValue | undefined {
  return attribute.stats[0] as StatValue | undefined;
}

function effectScope(attribute: Attribute, names: EffectNames): Pick<Effect, "condition" | "scope" | "appliesTo"> {
  const everything = [...names.skills.map(skillTarget), TRAVELLING];
  const requirements = attribute.requirements ?? [];
  if (requirements.length === 0) {
    return { condition: "Global", scope: "Global", appliesTo: everything };
  }
  const known = requirements.flatMap((requirement) => {
    const named = describeRequirement(requirement, names);
    if (!named) {
      return [];
    }
    const not = requirement.opposite ? "not " : "";
    const narrowed = named.narrows && {
      ids: new Set(named.narrows.targets.map((target) => target.id)),
      scope: named.narrows.scope,
    };
    return [
      {
        label: `${not}${named.label}`,
        scope: narrowed && `${not}${narrowed.scope}`,
        matches: (target: EffectTarget) => !narrowed || narrowed.ids.has(target.id) !== requirement.opposite,
      },
    ];
  });
  if (known.length === 0) {
    return { condition: "Under certain conditions", scope: null, appliesTo: [] };
  }
  const others = known.length < requirements.length ? OTHER_CONDITIONS : "";
  const scopes = known.flatMap((part) => (part.scope ? [part.scope] : []));
  return {
    condition: `While ${known.map((part) => part.label).join(" and ")}${others}`,
    scope: scopes.length > 0 ? capitalize(scopes.join(" and ")) : "Global",
    appliesTo: everything.filter((target) => known.every((part) => part.matches(target))),
  };
}

interface RequirementDescription {
  label: string;
  narrows?: { scope: string; targets: EffectTarget[] };
}

function describeRequirement(
  { type, requirement }: Requirement,
  { skills, regions, items }: EffectNames,
): RequirementDescription | undefined {
  const skillName = (id: string) => skills.find((skill) => skill.id === id)?.name ?? id;
  const region = (id: string) => regions.get(id) ?? id;
  switch (type) {
    case "mainSkill": {
      const name = skillName(requirement.skill);
      const targets = skills.filter((skill) => skill.id === requirement.skill).map(skillTarget);
      return { label: `doing ${name}`, narrows: { scope: name, targets } };
    }
    case "mainSkillType": {
      const scope = `${requirement.type} skills`;
      const targets = skills.filter((skill) => skill.type === requirement.type).map(skillTarget);
      return { label: `doing ${scope}`, narrows: { scope, targets } };
    }
    case "traveling":
      return { label: "travelling", narrows: { scope: "travelling", targets: [TRAVELLING] } };
    case "realm":
      return { label: `in ${region(requirement.realm)}` };
    case "exploreRealm":
      return { label: `having explored ${region(requirement.realm)}` };
    case "locationHasKeywords":
      return { label: `at ${requirement.keywords.map(spaced).join(" or ")} locations` };
    case "distinctKeywordItemsEquipped": {
      const noun = requirement.quantity === 1 ? "item" : "items";
      return { label: `wearing ${requirement.quantity} ${requirement.keywords.map(spaced).join(" or ")} ${noun}` };
    }
    case "distinctKeywordItemInInventory":
      return { label: `carrying ${requirement.keywords.map(spaced).join(" or ")}` };
    case "collectiblesOwned":
      return { label: `owning ${requirement.amount} collectibles` };
    case "achievementPoint":
      return { label: `having ${requirement.value} achievement points` };
    case "totalSkillLevel":
      return { label: `at total skill level ${requirement.levels}` };
    case "skillLevel":
      return { label: `at ${skillName(requirement.skill)} level ${requirement.level}` };
    case "itemAnywhere":
      return { label: `owning ${items.get(requirement.item)?.name ?? requirement.item}` };
    case "activityType":
      return requirement.activity ? { label: spaced(requirement.activity) } : undefined;
    case "historyData":
      return describeHistory(requirement);
    default:
      return undefined;
  }
}

function describeHistory({
  category,
  data,
  value,
}: {
  category: string;
  data?: string;
  value: number;
}): RequirementDescription | undefined {
  if (category === "actionCompleted" && data) {
    return { label: `having done ${spaced(data)} ${value.toLocaleString("en-US")} times` };
  }
  if (category === "stepsWalkedTraveling") {
    return { label: `having travelled ${value.toLocaleString("en-US")} steps` };
  }
  return undefined;
}

function skillTarget(skill: SkillDetail): EffectTarget {
  return { id: skill.id, name: skill.name };
}

function formatSigned(stat: StatValue): string {
  return `${stat.value < 0 ? "-" : "+"}${formatAmount({ ...stat, value: Math.abs(stat.value) })}`;
}

function formatAmount({ value, isPercent }: StatValue): string {
  return isPercent ? `${Number((value * 100).toFixed(2))}%` : `${value}`;
}

function customText(text: string, items: Map<string, ItemDetail>): string {
  return text
    .replace(/<object id="([^"]+)"\s*\/>/g, (_, id: string) => items.get(id)?.name ?? spaced(id))
    .replace(/<[^>]+>/g, "")
    .replace(/^Chance to find (1 (?!to ))?/, "Find ")
    .replace(/^Find (\d+) to (\d+)/, "Find $1–$2");
}
