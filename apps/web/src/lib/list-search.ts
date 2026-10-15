export interface ListSearch {
  q?: string;
  skill?: string;
}

export function validateListSearch(search: Record<string, unknown>): ListSearch {
  return {
    q: typeof search.q === "string" ? search.q : undefined,
    skill: typeof search.skill === "string" ? search.skill : undefined,
  };
}
