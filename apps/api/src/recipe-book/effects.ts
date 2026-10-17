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
  const subject = isChance ? lowerFirst(stripTags(attribute.customText)) : attribute.statText.toLowerCase();
  const effect = `${format(stat)} ${subject}${condition(attribute)}`;
  const fineStat = fine && statValue(fine);
  return [
    {
      text: isGlobal(attribute) ? `Global ${effect}` : effect,
      fine: fineStat && fineStat.value !== stat.value ? format(fineStat) : null,
    },
  ];
}

function statValue(attribute: Attribute): StatValue | undefined {
  return attribute.stats[0] as StatValue | undefined;
}

function condition(attribute: Attribute): string {
  if (attribute.skillText) {
    return ` while ${attribute.skillText}`;
  }
  const requirement = attribute.requirements?.[0];
  if (requirement?.type === "traveling") {
    return " while travelling";
  }
  if (requirement?.type === "mainSkillType") {
    return ` in ${requirement.requirement.type} skills`;
  }
  return "";
}

function isGlobal(attribute: Attribute): boolean {
  return !attribute.skillText && !attribute.requirements?.length;
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

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
