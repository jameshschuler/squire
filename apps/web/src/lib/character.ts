import { parseCharacterExport, type Character } from "@squire/api/character";

export const CHARACTER_STORAGE_KEY = "squire-character";

export function readStoredCharacter(stored: string | null): Character | null {
  if (!stored) {
    return null;
  }
  try {
    return parseCharacterExport(stored);
  } catch {
    return null;
  }
}
