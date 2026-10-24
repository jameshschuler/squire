import { useState } from "react";
import { CharacterImport } from "@/components/character/CharacterImport";
import { BackButton } from "@/components/layout/BackButton";
import { CharacterSummary } from "@/components/character/CharacterSummary";
import { useCharacterContext } from "@/contexts/character-context";

export function CharacterPage() {
  const { character } = useCharacterContext();
  const [updating, setUpdating] = useState(false);

  return (
    <div className="pt-2">
      <BackButton />
      {!character || updating ? (
        <CharacterImport
          onSaved={() => setUpdating(false)}
          onCancel={character ? () => setUpdating(false) : undefined}
        />
      ) : (
        <CharacterSummary character={character} onUpdate={() => setUpdating(true)} />
      )}
    </div>
  );
}
