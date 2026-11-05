import { characterProgress, type Character } from "@walkscape-community/gear-optimizer";
import { RefreshCw } from "lucide-react";
import { CharacterCollectibles } from "@/components/character/CharacterCollectibles";
import { CharacterPets } from "@/components/character/CharacterPets";
import { CharacterSkills } from "@/components/character/CharacterSkills";
import { LevelBar } from "@/components/character/LevelBar";
import { RemoveCharacterButton } from "@/components/character/RemoveCharacterButton";
import { Button } from "@/components/ui/button";
import { useGameDataContext } from "@/contexts/game-data-context";
import { useGearDataContext } from "@/contexts/gear-data-context";
import { collectionOf } from "@/lib/collectibles";
import { formatDateTime, formatNumber } from "@/lib/format";
import { nextLevelLabel } from "@/lib/levels";
import { petCollection } from "@/lib/pets";

interface CharacterSummaryProps {
  character: Character;
  savedAt: string | null;
  onUpdate: () => void;
}

export function CharacterSummary({ character, savedAt, onUpdate }: CharacterSummaryProps) {
  const gameData = useGameDataContext();
  const gearData = useGearDataContext();
  const collection = gameData.status === "ready" ? collectionOf(gameData.book.loot, character.collectibles) : null;
  const pets = gearData.status === "ready" ? petCollection(gearData.gear.pets, character.pets) : null;
  const levelProgress = characterProgress(character.lifetimeSteps);
  const stats = [
    { label: "Steps walked", value: formatNumber(character.lifetimeSteps) },
    { label: "Collectibles", value: formatNumber(character.collectibles.length) },
    { label: "Achievement points", value: formatNumber(character.achievementPoints) },
  ];

  return (
    <article className="space-y-6">
      <header>
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-2xl font-semibold">{character.name}</h1>
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" size="sm" onClick={onUpdate}>
              <RefreshCw />
              Update
            </Button>
            <RemoveCharacterButton />
          </div>
        </div>
        {savedAt && <p className="text-sm text-muted-foreground">Imported {formatDateTime(savedAt)}</p>}
      </header>
      <dl className="grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Character level</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(character.characterLevel)}</dd>
          <dd className="mt-2">
            <LevelBar name="Character level" progress={levelProgress} unit="steps" />
            <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
              {nextLevelLabel(levelProgress, "steps")}
            </p>
          </dd>
        </div>
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <CharacterSkills character={character} />
      {collection && <CharacterCollectibles collection={collection} />}
      {pets && <CharacterPets pets={pets} />}
    </article>
  );
}
