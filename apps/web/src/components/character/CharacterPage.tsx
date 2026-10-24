import { useState } from "react";
import { CharacterImport } from "@/components/character/CharacterImport";
import { BackButton } from "@/components/layout/BackButton";
import { CharacterSummary } from "@/components/character/CharacterSummary";
import { useCharacterContext } from "@/contexts/character-context";

export function CharacterPage() {
  const { character, savedAt } = useCharacterContext();
  const [updating, setUpdating] = useState(false);

  return (
    <div className="space-y-4 pt-2">
      <BackButton />
      {!character || updating ? (
        <CharacterImport
          title={character ? "Update your character" : "Add your character"}
          onSaved={() => setUpdating(false)}
          onCancel={character ? () => setUpdating(false) : undefined}
        />
      ) : (
        <CharacterSummary character={character} savedAt={savedAt} onUpdate={() => setUpdating(true)} />
      )}
    </div>
  );
}
