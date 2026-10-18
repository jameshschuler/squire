import type { Attribute, ItemDetail, Requirement, SkillDetail } from "@jameshschuler/walkscape-data-client";
import type { Effect, EffectTarget, ItemEffects } from "./types.js";

export const TRAVELLING: EffectTarget = { id: "travelling", name: "Travelling" };

interface StatValue {
  value: number;
  isPercent: boolean;
}

export function itemEffects(item: ItemDetail, skills: SkillDetail[]): ItemEffects | null {
  const buff = item.type === "consumable" ? item.buffs?.[0] : undefined;
  if (!buff) {
    return null;
  }
  const effects = buff.data.flatMap((data) =>
    data.buffs.flatMap((group) =>
      group.attributes.flatMap((attribute, i) => effectLine(attribute, group.fineAttributes[i], skills)),
    ),
  );
  return { steps: "steps" in buff.duration ? buff.duration.steps : null, effects };
}

function effectLine(attribute: Attribute, fine: Attribute | undefined, skills: SkillDetail[]): Effect[] {
  const stat = statValue(attribute);
  if (!stat) {
    return [];
  }
  const isChance = attribute.customText !== "";
  const format = (value: StatValue) => (isChance ? formatAmount(value) : formatSigned(value));
  const fineStat = (fine && statValue(fine)) ?? stat;
  return [
    {
      ...scope(attribute, skills),
      stat: isChance ? stripTags(attribute.customText) : attribute.statText,
      normal: format(stat),
      fine: format(fineStat),
    },
  ];
}

function statValue(attribute: Attribute): StatValue | undefined {
  return attribute.stats[0] as StatValue | undefined;
}

function scope(attribute: Attribute, skills: SkillDetail[]): Pick<Effect, "condition" | "appliesTo"> {
  const everything = () => [...skills.map(skillTarget), TRAVELLING];
  const requirement = attribute.requirements?.[0];
  if (!requirement) {
    return { condition: "Global", appliesTo: everything() };
  }
  const named = describeRequirement(requirement, skills);
  if (!named) {
    return { condition: "Under certain conditions", appliesTo: [] };
  }
  if (!requirement.opposite) {
    return { condition: `While ${named.activity}`, appliesTo: named.targets };
  }
  const namedIds = new Set(named.targets.map((target) => target.id));
  return {
    condition: `While not ${named.activity}`,
    appliesTo: everything().filter((target) => !namedIds.has(target.id)),
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
