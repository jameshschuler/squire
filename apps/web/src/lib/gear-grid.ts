import type { GearPick } from "@squire/api/gear-data";

type Slot = GearPick["slot"];

export interface GearCell {
  label: string;
  pick: GearPick | null;
}

const GEAR_LAYOUT: [string, Slot, number][] = [
  ["Cape", "cape", 0],
  ["Head", "head", 0],
  ["Back", "back", 0],
  ["Hands", "hands", 0],
  ["Chest", "chest", 0],
  ["Neck", "neck", 0],
  ["Primary", "primary", 0],
  ["Legs", "legs", 0],
  ["Secondary", "secondary", 0],
  ["Ring 1", "ring", 0],
  ["Feet", "feet", 0],
  ["Ring 2", "ring", 1],
];

export function gearCells(picks: GearPick[]): GearCell[] {
  return GEAR_LAYOUT.map(([label, slot, index]) => cell(label, slot, index, picks));
}

export function toolCells(picks: GearPick[], toolSlots: number): GearCell[] {
  return Array.from({ length: toolSlots }, (_, index) => cell(`Tool ${index + 1}`, "tool", index, picks));
}

function cell(label: string, slot: Slot, index: number, picks: GearPick[]): GearCell {
  return { label, pick: picks.filter((p) => p.slot === slot)[index] ?? null };
}
