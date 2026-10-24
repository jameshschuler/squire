import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { parseCharacterExport, type Character } from "@squire/api/character";
import { CHARACTER_STORAGE_KEY, readStoredCharacter } from "@/lib/character";

interface CharacterContextValue {
  character: Character | null;
  saveCharacter: (exportText: string) => void;
  clearCharacter: () => void;
}

const CharacterContext = createContext<CharacterContextValue | undefined>(undefined);
const readCharacter = () => readStoredCharacter(localStorage.getItem(CHARACTER_STORAGE_KEY));

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState(readCharacter);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CHARACTER_STORAGE_KEY) {
        setCharacter(readCharacter());
      }
    };
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);

  const value: CharacterContextValue = {
    character,
    saveCharacter: (exportText) => {
      const parsed = parseCharacterExport(exportText);
      try {
        localStorage.setItem(CHARACTER_STORAGE_KEY, exportText);
      } catch {
        throw new Error("Couldn't save your character on this device. Check that site storage is allowed.");
      }
      setCharacter(parsed);
    },
    clearCharacter: () => {
      localStorage.removeItem(CHARACTER_STORAGE_KEY);
      setCharacter(null);
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
