import { gearBonusesByLocation, type GearData, type PlayerProfile } from "@squire/api/gear-data";
import { formatStatValue, statName } from "./gear-stats";
import { BEST_LOCATION, optimizeTarget, type GearTarget } from "./gear-targets";

export interface LocationChoice {
  value: string;
  label: string;
  detail?: string;
}

const SHOWN_BONUSES = 2;

export function locationChoices(gear: GearData, profile: PlayerProfile, target: GearTarget): LocationChoice[] {
  const locations = gear.locations.filter((l) => target.locations.some((t) => t.id === l.id));
  const bonusesAt = gearBonusesByLocation(gear, profile, optimizeTarget(target, undefined), locations);
  return [
    { value: BEST_LOCATION, label: "Best location" },
    ...target.locations.map((summary) => {
      const bonuses = (bonusesAt.get(summary.id) ?? [])
        .flatMap((line) => {
          const name = statName(line);
          return name ? [`${formatStatValue(line)} ${name}`] : [];
        })
        .slice(0, SHOWN_BONUSES);
      return { value: summary.id, label: summary.name, ...(bonuses.length > 0 && { detail: bonuses.join(" · ") }) };
    }),
  ];
}
