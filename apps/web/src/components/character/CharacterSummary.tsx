import type { Character } from "@squire/api/character";
import { RefreshCw } from "lucide-react";
import { RemoveCharacterButton } from "@/components/character/RemoveCharacterButton";
import { Button } from "@/components/ui/button";
import { formatStepCount, formatTitle } from "@/lib/format";

export function CharacterSummary({ character, onUpdate }: { character: Character; onUpdate: () => void }) {
  const skills = Object.entries(character.skillLevels).sort(([a], [b]) => a.localeCompare(b));
  return (
    <section className="space-y-4 pt-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-lg font-semibold">{character.name}</h2>
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" size="sm" onClick={onUpdate}>
              <RefreshCw />
              Update
            </Button>
            <RemoveCharacterButton />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Character level {character.characterLevel} · {character.toolSlots} tool slots
        </p>
        <p className="text-sm text-muted-foreground">
          {formatStepCount(character.lifetimeSteps)} walked · {character.achievementPoints} achievement points
        </p>
      </div>
      <ul aria-label="Skill levels" className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {skills.map(([skill, level]) => (
          <li key={skill} className="flex justify-between">
            <span>{formatTitle(skill)}</span>
            <span className="text-muted-foreground tabular-nums">{level}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
