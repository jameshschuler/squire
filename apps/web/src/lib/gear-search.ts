export type GearSource = "mine" | "best";

export interface GearSearch {
  target?: string;
  location?: string;
  gear?: GearSource;
}

export function validateGearSearch(search: Record<string, unknown>): GearSearch {
  return {
    target: typeof search.target === "string" ? search.target : undefined,
    location: typeof search.location === "string" ? search.location : undefined,
    gear: search.gear === "mine" || search.gear === "best" ? search.gear : undefined,
  };
}
