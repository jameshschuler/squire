import type { GearType } from "@walkscape-community/data-api-client";
import { MAX_LEVEL, toolSlots } from "../character/character.js";

export interface GearSlot {
  slot: GearType;
  capacity: number;
  copies: number;
}

export const GEAR_SLOTS: GearSlot[] = [
  { slot: "head", capacity: 1, copies: 1 },
  { slot: "cape", capacity: 1, copies: 1 },
  { slot: "back", capacity: 1, copies: 1 },
  { slot: "chest", capacity: 1, copies: 1 },
  { slot: "primary", capacity: 1, copies: 1 },
  { slot: "secondary", capacity: 1, copies: 1 },
  { slot: "hands", capacity: 1, copies: 1 },
  { slot: "legs", capacity: 1, copies: 1 },
  { slot: "neck", capacity: 1, copies: 1 },
  { slot: "feet", capacity: 1, copies: 1 },
  { slot: "ring", capacity: 2, copies: 2 },
  { slot: "tool", capacity: toolSlots(MAX_LEVEL), copies: 1 },
];

export function copiesAllowed(slot: GearType): number {
  return GEAR_SLOTS.find((s) => s.slot === slot)?.copies ?? 1;
}
