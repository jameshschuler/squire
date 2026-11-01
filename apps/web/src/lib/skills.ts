export interface SkillOption {
  id: string;
  name: string;
}

export function uniqueSkills(skills: SkillOption[]): SkillOption[] {
  const byId = new Map(skills.map((skill) => [skill.id, skill.name]));

  return [...byId].map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name));
}

export function knownOption(options: SkillOption[], selected: string | undefined): string | undefined {
  return options.some((option) => option.id === selected) ? selected : undefined;
}

export function skillOptions(entries: { skills: SkillOption[] }[]): SkillOption[] {
  return uniqueSkills(entries.flatMap((entry) => entry.skills));
}
