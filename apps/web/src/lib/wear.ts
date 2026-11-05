import type { ActivitySource, ItemSource } from "@squire/api/recipe-book";

export type WearSource = ActivitySource & { wear: number };

export function wearSources(sources: ItemSource[]): WearSource[] {
  return sources
    .filter((source): source is WearSource => source.kind === "activity" && source.wear !== null)
    .sort((faster, slower) => faster.wear - slower.wear);
}
