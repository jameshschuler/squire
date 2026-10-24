import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { parseCharacterExport, type Character } from "@squire/api/character";
import { CHARACTER_STORAGE_KEY, readStoredCharacter, storeCharacter } from "@/lib/character";

interface CharacterContextValue {
  character: Character | null;
  savedAt: string | null;
  saveCharacter: (exportText: string) => void;
  clearCharacter: () => void;
}

const CharacterContext = createContext<CharacterContextValue | undefined>(undefined);
const readCharacter = () => readStoredCharacter(localStorage.getItem(CHARACTER_STORAGE_KEY));

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState(readCharacter);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CHARACTER_STORAGE_KEY) {
        setSaved(readCharacter());
      }
    };
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);

  const value: CharacterContextValue = {
    character: saved?.character ?? null,
    savedAt: saved?.savedAt ?? null,
    saveCharacter: (exportText) => {
      const character = parseCharacterExport(exportText);
      const savedAt = new Date();
      try {
        localStorage.setItem(CHARACTER_STORAGE_KEY, storeCharacter(exportText, savedAt));
      } catch {
        throw new Error("Couldn't save your character on this device. Check that site storage is allowed.");
      }
      setSaved({ character, savedAt: savedAt.toISOString() });
    },
    clearCharacter: () => {
      localStorage.removeItem(CHARACTER_STORAGE_KEY);
      setSaved(null);
    },
  };

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
}

export function useCharacterContext(): CharacterContextValue {
  const value = useContext(CharacterContext);
  if (!value) {
    throw new Error("useCharacterContext must be used inside CharacterProvider");
  }
  return value;
}
