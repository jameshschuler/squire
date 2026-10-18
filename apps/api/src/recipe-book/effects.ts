import type { Attribute, ItemDetail, Requirement, SkillDetail } from "@jameshschuler/walkscape-data-client";
import type { Effect, EffectTarget, ItemEffects } from "./types.js";

export const TRAVELLING: EffectTarget = { id: "travelling", name: "Travelling" };
export const OTHER_CONDITIONS = " (with other conditions)";

interface StatValue {
  value: number;
  isPercent: boolean;
}

export function itemEffects(item: ItemDetail, skills: SkillDetail[]): ItemEffects | null {
  if (item.type === "loot") {
    const effects = (item.itemAttrs ?? []).flatMap((attribute) => effectLine(attribute, null, skills));
    return effects.length > 0 ? { steps: null, effects } : null;
  }
  const buff = item.type === "consumable" ? item.buffs?.[0] : undefined;
  if (!buff) {
    return null;
  }
  const effects = buff.data.flatMap((data) =>
    data.buffs.flatMap((group) =>
      group.attributes.flatMap((attribute, i) => effectLine(attribute, group.fineAttributes[i] ?? attribute, skills)),
    ),
  );
  return { steps: "steps" in buff.duration ? buff.duration.steps : null, effects };
}

function effectLine(attribute: Attribute, fine: Attribute | null, skills: SkillDetail[]): Effect[] {
  const stat = statValue(attribute);
  if (!stat) {
    return [];
  }
  const isChance = attribute.customText !== "";
  const format = (value: StatValue) => (isChance ? formatAmount(value) : formatSigned(value));
  return [
    {
      ...scope(attribute, skills),
      stat: isChance ? stripTags(attribute.customText) : attribute.statText,
      normal: format(stat),
      fine: fine ? format(statValue(fine) ?? stat) : null,
    },
  ];
}

function statValue(attribute: Attribute): StatValue | undefined {
  return attribute.stats[0] as StatValue | undefined;
}

function scope(attribute: Attribute, skills: SkillDetail[]): Pick<Effect, "condition" | "appliesTo"> {
  const everything = [...skills.map(skillTarget), TRAVELLING];
  const requirements = attribute.requirements ?? [];
  if (requirements.length === 0) {
    return { condition: "Global", appliesTo: everything };
  }
  const known = requirements.flatMap((requirement) => {
    const named = describeRequirement(requirement, skills);
    if (!named) {
      return [];
    }
    const ids = new Set(named.targets.map((target) => target.id));
    return [
      {
        label: requirement.opposite ? `not ${named.activity}` : named.activity,
        matches: (target: EffectTarget) => ids.has(target.id) !== requirement.opposite,
      },
    ];
  });
  if (known.length === 0) {
    return { condition: "Under certain conditions", appliesTo: [] };
  }
  const others = known.length < requirements.length ? OTHER_CONDITIONS : "";
  return {
    condition: `While ${known.map((part) => part.label).join(" and ")}${others}`,
    appliesTo: everything.filter((target) => known.every((part) => part.matches(target))),
  };
}

function describeRequirement(
  requirement: Requirement,
  skills: SkillDetail[],
): { activity: string; targets: EffectTarget[] } | undefined {
  if (requirement.type === "mainSkill") {
    const matching = skills.filter((skill) => skill.id === requirement.requirement.skill);
    return {
      activity: `doing ${matching[0]?.name ?? requirement.requirement.skill}`,
      targets: matching.map(skillTarget),
    };
  }
  if (requirement.type === "mainSkillType") {
    const matching = skills.filter((skill) => skill.type === requirement.requirement.type);
    return { activity: `doing ${requirement.requirement.type} skills`, targets: matching.map(skillTarget) };
  }
  if (requirement.type === "traveling") {
    return { activity: "travelling", targets: [TRAVELLING] };
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

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}
