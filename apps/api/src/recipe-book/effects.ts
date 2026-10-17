import type { Attribute, ItemDetail } from "@jameshschuler/walkscape-data-client";
import type { Effect, ItemEffects } from "./types.js";

interface StatValue {
  value: number;
  isPercent: boolean;
}

export function itemEffects(item: ItemDetail): ItemEffects | null {
  const buff = item.type === "consumable" ? item.buffs?.[0] : undefined;
  if (!buff) {
    return null;
  }
  const effects = buff.data.flatMap((data) =>
    data.buffs.flatMap((group) =>
      group.attributes.flatMap((attribute, i) => effectLine(attribute, group.fineAttributes[i])),
    ),
  );
  return { steps: "steps" in buff.duration ? buff.duration.steps : null, effects };
}

function effectLine(attribute: Attribute, fine: Attribute | undefined): Effect[] {
  const stat = statValue(attribute);
  if (!stat) {
    return [];
  }
  const isChance = attribute.customText !== "";
  const format = (value: StatValue) => (isChance ? formatAmount(value) : formatSigned(value));
  const fineStat = (fine && statValue(fine)) ?? stat;
  return [
    {
      condition: condition(attribute),
      stat: isChance ? stripTags(attribute.customText) : attribute.statText,
      normal: format(stat),
      fine: format(fineStat),
    },
  ];
}

function statValue(attribute: Attribute): StatValue | undefined {
  return attribute.stats[0] as StatValue | undefined;
}

function condition(attribute: Attribute): string {
  if (attribute.skillText) {
    return `While doing ${attribute.skillText}`;
  }
  const requirement = attribute.requirements?.[0];
  if (requirement?.type === "traveling") {
    return "While travelling";
  }
  if (requirement?.type === "mainSkillType") {
    return `While doing ${requirement.requirement.type} skills`;
  }
  return "Global";
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
