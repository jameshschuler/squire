import { useState } from "react";
import { CharacterImport } from "@/components/gear/CharacterImport";
import { CharacterSummary } from "@/components/gear/CharacterSummary";
import { GearOptimizerBanner } from "@/components/gear/GearOptimizerBanner";
import { useCharacterContext } from "@/contexts/character-context";

export function GearPage() {
  const { character } = useCharacterContext();
  const [updating, setUpdating] = useState(false);

  return (
    <>
      <GearOptimizerBanner />
      {!character || updating ? (
        <CharacterImport
          onSaved={() => setUpdating(false)}
          onCancel={character ? () => setUpdating(false) : undefined}
        />
      ) : (
        <CharacterSummary character={character} onUpdate={() => setUpdating(true)} />
      )}
    </>
  );
}
