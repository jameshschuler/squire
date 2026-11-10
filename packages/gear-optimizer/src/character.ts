import { QUALITIES, type ItemQuality } from "./game-data.js";

export const EQUIPMENT_SLOTS = [
  "head",
  "cape",
  "back",
  "chest",
  "primary",
  "secondary",
  "hands",
  "legs",
  "neck",
  "feet",
  "ring_1",
  "ring_2",
  "tool_1",
  "tool_2",
  "tool_3",
  "tool_4",
  "tool_5",
  "tool_6",
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export interface OwnedItem {
  id: string;
  quality: ItemQuality | null;
}

export interface OwnedPet {
  species: string;
  level: number;
}

export interface OwnedStack extends OwnedItem {
  count: number;
}

export interface Character {
  name: string;
  skillLevels: Record<string, number>;
  skillXp: Record<string, number>;
  totalSkillLevel: number;
  lifetimeSteps: number;
  characterLevel: number;
  toolSlots: number;
  achievementPoints: number;
  collectibles: string[];
  equipped: Partial<Record<EquipmentSlot, OwnedItem>>;
  owned: OwnedStack[];
  fineItems: string[];
  pets: OwnedPet[];
}

// How far past its current level something is: XP for a skill, steps for the character. `needed` is
// what the next level takes from the start of this one, or null at the max level.
export interface LevelProgress {
  level: number;
  gained: number;
  needed: number | null;
}

interface CharacterExport {
  name: string;
  steps: number;
  achievement_points: number;
  skills: Record<string, number>;
  gear: Record<string, string>;
  bank: Record<string, number>;
  inventory: Record<string, number>;
  collectibles: string[];
  pets?: { pet?: OwnedPet | null };
  available_pets?: OwnedPet[];
}

export const MAX_LEVEL = 99;
const CHARACTER_STEPS_PER_XP = 4.6;
const BASE_TOOL_SLOTS = 3;
const TOOL_SLOTS_BY_LEVEL = [
  { level: 80, slots: 6 },
  { level: 50, slots: 5 },
  { level: 20, slots: 4 },
];
const QUALITY_SUFFIX = new RegExp(`_(${QUALITIES.join("|")})$`);
const FINE_SUFFIX = "_fine";

const SKILL_XP_BY_LEVEL = Array.from({ length: MAX_LEVEL }, (_, index) => {
  let points = 0;

  for (let level = 1; level <= index; level++) {
    points += Math.floor(level + 300 * 2 ** (level / 7));
  }

  return Math.floor(points / 4);
});

const CHARACTER_STEPS_BY_LEVEL = SKILL_XP_BY_LEVEL.map((xp) => Math.round(xp * CHARACTER_STEPS_PER_XP));

export function skillLevel(xp: number): number {
  return skillProgress(xp).level;
}

export function characterLevel(lifetimeSteps: number): number {
  return characterProgress(lifetimeSteps).level;
}

export function skillProgress(xp: number): LevelProgress {
  return progressOn(SKILL_XP_BY_LEVEL, xp);
}

export function characterProgress(lifetimeSteps: number): LevelProgress {
  return progressOn(CHARACTER_STEPS_BY_LEVEL, lifetimeSteps);
}

export function toolSlots(level: number): number {
  return TOOL_SLOTS_BY_LEVEL.find((tier) => level >= tier.level)?.slots ?? BASE_TOOL_SLOTS;
}

export function ownedItem(exportId: string): OwnedItem {
  const quality = QUALITY_SUFFIX.exec(exportId)?.[1] as ItemQuality | undefined;

  return quality ? { id: exportId.slice(0, -quality.length - 1), quality } : { id: exportId, quality: null };
}

export function parseCharacterExport(text: string): Character {
  const data = parseJson(text);

  if (!isCharacterExport(data)) {
    throw new Error("That isn't a WalkScape character export.");
  }

  const level = characterLevel(data.steps);
  const skillLevels = Object.fromEntries(Object.entries(data.skills).map(([skill, xp]) => [skill, skillLevel(xp)]));
  const equippedIds = EQUIPMENT_SLOTS.flatMap((slot) => (data.gear[slot] ? [[slot, data.gear[slot]] as const] : []));
  const counts = new Map<string, number>();
  const held = [...Object.entries(data.bank), ...Object.entries(data.inventory)].filter(([, count]) => count > 0);

  for (const [id, count] of [...equippedIds.map(([, id]) => [id, 1] as const), ...held]) {
    counts.set(id, (counts.get(id) ?? 0) + count);
  }

  return {
    name: data.name,
    skillLevels,
    skillXp: data.skills,
    totalSkillLevel: Object.values(skillLevels).reduce((total, level) => total + level, 0),
    lifetimeSteps: data.steps,
    characterLevel: level,
    toolSlots: toolSlots(level),
    achievementPoints: data.achievement_points,
    collectibles: data.collectibles,
    equipped: Object.fromEntries(equippedIds.map(([slot, id]) => [slot, ownedItem(id)])),
    owned: [...counts]
      .filter(([id, count]) => count > 0 && !id.endsWith(FINE_SUFFIX))
      .map(([id, count]) => ({ ...ownedItem(id), count })),
    fineItems: [
      ...new Set(held.flatMap(([id]) => (id.endsWith(FINE_SUFFIX) ? [id.slice(0, -FINE_SUFFIX.length)] : []))),
    ],
    pets: [...(data.pets?.pet ? [data.pets.pet] : []), ...(data.available_pets ?? [])].map(ownedPet),
  };
}

function progressOn(thresholds: number[], amount: number): LevelProgress {
  const level = thresholds.filter((required) => required <= amount).length;
  const start = thresholds[level - 1] ?? 0;
  const next = thresholds[level];

  return { level, gained: amount - start, needed: next === undefined ? null : next - start };
}

function ownedPet({ species, level }: OwnedPet): OwnedPet {
  return { species, level };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("That isn't valid JSON. Copy the export from WalkScape again and paste all of it.");
  }
}

function isCharacterExport(data: unknown): data is CharacterExport {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.name === "string" &&
    typeof data.steps === "number" &&
    typeof data.achievement_points === "number" &&
    isRecordOf(data.skills, "number") &&
    isRecordOf(data.gear, "string") &&
    isRecordOf(data.bank, "number") &&
    isRecordOf(data.inventory, "number") &&
    Array.isArray(data.collectibles) &&
    data.collectibles.every((id) => typeof id === "string") &&
    (data.available_pets === undefined || (Array.isArray(data.available_pets) && data.available_pets.every(isPet))) &&
    (data.pets === undefined || (isRecord(data.pets) && (data.pets.pet == null || isPet(data.pets.pet))))
  );
}

function isPet(value: unknown): boolean {
  return isRecord(value) && typeof value.species === "string" && typeof value.level === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecordOf(value: unknown, type: "number" | "string"): boolean {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === type);
}
