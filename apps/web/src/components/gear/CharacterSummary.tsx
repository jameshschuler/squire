import type { Character } from "@squire/api/character";
import { RefreshCw } from "lucide-react";
import { RemoveCharacterButton } from "@/components/gear/RemoveCharacterButton";
import { Button } from "@/components/ui/button";
import { formatTitle } from "@/lib/format";

export function CharacterSummary({ character, onUpdate }: { character: Character; onUpdate: () => void }) {
  const skills = Object.entries(character.skillLevels).sort(([a], [b]) => a.localeCompare(b));
  return (
    <section className="space-y-4 pt-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{character.name}</h2>
          <p className="text-sm text-muted-foreground">
            Character level {character.characterLevel} · {character.toolSlots} tool slots
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={onUpdate}>
            <RefreshCw />
            Update
          </Button>
          <RemoveCharacterButton />
        </div>
      </div>
      <ul aria-label="Skill levels" className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {skills.map(([skill, level]) => (
          <li key={skill} className="flex justify-between">
            <span>{formatTitle(skill)}</span>
            <span className="text-muted-foreground tabular-nums">{level}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {Object.keys(character.equipped).length} items equipped · {character.achievementPoints} achievement points
      </p>
    </section>
  );
}
