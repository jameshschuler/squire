import { QUALITIES, type ItemQuality } from "../recipe-book/types.js";

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

export interface Character {
  name: string;
  skillLevels: Record<string, number>;
  totalSkillLevel: number;
  lifetimeSteps: number;
  characterLevel: number;
  toolSlots: number;
  achievementPoints: number;
  collectibles: string[];
  equipped: Partial<Record<EquipmentSlot, OwnedItem>>;
  owned: OwnedItem[];
  pets: OwnedPet[];
  petOut: OwnedPet | null;
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

export function skillLevel(xp: number): number {
  return SKILL_XP_BY_LEVEL.filter((required) => required <= xp).length;
}

export function characterLevel(lifetimeSteps: number): number {
  return SKILL_XP_BY_LEVEL.filter((xp) => Math.round(xp * CHARACTER_STEPS_PER_XP) <= lifetimeSteps).length;
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
  const ownedIds = new Set([
    ...equippedIds.map(([, id]) => id),
    ...Object.keys(data.bank),
    ...Object.keys(data.inventory),
  ]);
  return {
    name: data.name,
    skillLevels,
    totalSkillLevel: Object.values(skillLevels).reduce((total, level) => total + level, 0),
    lifetimeSteps: data.steps,
    characterLevel: level,
    toolSlots: toolSlots(level),
    achievementPoints: data.achievement_points,
    collectibles: data.collectibles,
    equipped: Object.fromEntries(equippedIds.map(([slot, id]) => [slot, ownedItem(id)])),
    owned: [...ownedIds].filter((id) => !id.endsWith(FINE_SUFFIX)).map(ownedItem),
    pets: [...(data.pets?.pet ? [data.pets.pet] : []), ...(data.available_pets ?? [])].map(ownedPet),
    petOut: data.pets?.pet ? ownedPet(data.pets.pet) : null,
  };
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
