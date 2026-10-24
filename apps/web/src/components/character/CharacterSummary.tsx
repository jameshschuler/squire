import type { Character } from "@squire/api/character";
import { RefreshCw } from "lucide-react";
import { RemoveCharacterButton } from "@/components/character/RemoveCharacterButton";
import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber, formatTitle } from "@/lib/format";

interface CharacterSummaryProps {
  character: Character;
  savedAt: string | null;
  onUpdate: () => void;
}

export function CharacterSummary({ character, savedAt, onUpdate }: CharacterSummaryProps) {
  const skills = Object.entries(character.skillLevels).sort(([a], [b]) => a.localeCompare(b));
  const stats = [
    { label: "Character level", value: character.characterLevel },
    { label: "Steps walked", value: character.lifetimeSteps },
    { label: "Collectibles", value: character.collectibles.length },
    { label: "Achievement points", value: character.achievementPoints },
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
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>
      <Section title="Skills">
        <ul aria-label="Skill levels" className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-3">
          {skills.map(([skill, level]) => (
            <li key={skill} className="flex justify-between">
              <span>{formatTitle(skill)}</span>
              <span className="text-muted-foreground tabular-nums">{level}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t pt-3 text-sm font-medium">
          <span>Total skill level</span>
          <span className="tabular-nums">{formatNumber(character.totalSkillLevel)}</span>
        </p>
      </Section>
    </article>
  );
}
