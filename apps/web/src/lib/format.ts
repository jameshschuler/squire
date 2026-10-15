export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatSkillLevel(skill: { name: string; level: number | null }): string {
  return skill.level === null ? skill.name : `${skill.name} Lvl ${skill.level}`;
}
