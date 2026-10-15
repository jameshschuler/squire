export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatSteps(workRequired: number, maxWorkEfficiency: number): string {
  const baseSteps = `${workRequired} base steps`;
  if (maxWorkEfficiency <= 1) {
    return baseSteps;
  }
  return `${baseSteps} · ${Math.ceil(workRequired / maxWorkEfficiency)} min steps`;
}

export function formatSkillLevel(skill: { name: string; level: number | null }): string {
  return skill.level === null ? skill.name : `${skill.name} lvl. ${skill.level}`;
}
