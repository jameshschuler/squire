import type { GearData } from "./types.js";

export function gearDataIcons(gear: GearData): string[] {
  return [...new Set([...gear.items, ...gear.pets, ...gear.foods].map((entry) => entry.icon).filter(Boolean))];
}
