export function formatSteps(workRequired: number, maxWorkEfficiency: number): string {
  const steps = `${workRequired} steps`;
  if (maxWorkEfficiency <= 1) {
    return steps;
  }
  return `${steps} · ${Math.ceil(workRequired / maxWorkEfficiency)} at best`;
}

export function formatSkillLevel(skill: { name: string; level: number | null }): string {
  return skill.level === null ? skill.name : `${skill.name} Lvl ${skill.level}`;
}
