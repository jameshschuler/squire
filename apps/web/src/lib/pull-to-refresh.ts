export const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

export function pullDistance(dragged: number): number {
  return Math.min(MAX_PULL, Math.max(0, dragged / 2));
}
