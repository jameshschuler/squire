import type { ItemSource } from "@squire/api/recipe-book";

export interface ItemWear {
  steps: number;
  from: string | null;
}

export function itemWear(sources: ItemSource[]): ItemWear | null {
  const rated = sources.flatMap((source) =>
    source.kind === "activity" && source.wear !== null ? [{ steps: source.wear, name: source.name }] : [],
  );
  const [fastest] = rated.sort((faster, slower) => faster.steps - slower.steps);

  if (!fastest) {
    return null;
  }

  return { steps: fastest.steps, from: rated.length > 1 ? fastest.name : null };
}

export function wearDescription({ from }: ItemWear): string {
  const description = "Average steps to get one at max work efficiency";

  return from ? `${description}, from ${from}` : description;
}
