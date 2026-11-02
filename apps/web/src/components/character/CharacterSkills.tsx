import { skillProgress, type Character } from "@walkscape-community/gear-optimizer";
import { LevelBar } from "@/components/character/LevelBar";
import { Section } from "@/components/shared/Section";
import { formatNumber, formatTitle } from "@/lib/format";

export function CharacterSkills({ character }: { character: Character }) {
  const skills = Object.entries(character.skillXp)
    .map(([skill, xp]) => ({ name: formatTitle(skill), progress: skillProgress(xp) }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <Section title="Skills">
      <ul aria-label="Skill levels" className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-3">
        {skills.map(({ name, progress }) => (
          <li key={name} className="min-w-0">
            <div className="flex justify-between gap-2">
              <span className="truncate">{name}</span>
              <span className="text-muted-foreground tabular-nums">{progress.level}</span>
            </div>
            <LevelBar name={name} progress={progress} unit="XP" className="mt-1" />
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between border-t pt-3 text-sm font-medium">
        <span>Total skill level</span>
        <span className="tabular-nums">{formatNumber(character.totalSkillLevel)}</span>
      </p>
    </Section>
  );
}
