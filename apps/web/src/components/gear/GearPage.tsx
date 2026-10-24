import { useState } from "react";
import { CharacterImport } from "@/components/gear/CharacterImport";
import { CharacterSummary } from "@/components/gear/CharacterSummary";
import { useCharacterContext } from "@/contexts/character-context";

export function GearPage() {
  const { character } = useCharacterContext();
  const [updating, setUpdating] = useState(false);

  if (!character || updating) {
    return (
      <CharacterImport onSaved={() => setUpdating(false)} onCancel={character ? () => setUpdating(false) : undefined} />
    );
  }
  return <CharacterSummary character={character} onUpdate={() => setUpdating(true)} />;
}
