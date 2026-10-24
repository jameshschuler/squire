import { parseCharacterExport, type Character } from "@squire/api/character";

export const CHARACTER_STORAGE_KEY = "squire-character";

export interface SavedCharacter {
  character: Character;
  savedAt: string;
}

export function storeCharacter(exportText: string, savedAt: Date): string {
  return JSON.stringify({ exportText, savedAt: savedAt.toISOString() });
}

export function readStoredCharacter(stored: string | null): SavedCharacter | null {
  if (!stored) {
    return null;
  }
  try {
    const { exportText, savedAt } = JSON.parse(stored) as { exportText?: unknown; savedAt?: unknown };
    if (typeof exportText !== "string" || typeof savedAt !== "string" || Number.isNaN(Date.parse(savedAt))) {
      return null;
    }
    return { character: parseCharacterExport(exportText), savedAt };
  } catch {
    return null;
  }
}
