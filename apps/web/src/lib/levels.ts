import type { LevelProgress } from "@walkscape-community/gear-optimizer";
import { formatNumber } from "./format";

export function levelPercent({ gained, needed }: LevelProgress): number {
  return needed === null ? 100 : (gained / needed) * 100;
}

export function nextLevelLabel({ level, gained, needed }: LevelProgress, unit: "XP" | "steps"): string {
  if (needed === null) {
    return "Max level";
  }

  return `${formatNumber(gained)} / ${formatNumber(needed)} ${unit} to level ${level + 1}`;
}
