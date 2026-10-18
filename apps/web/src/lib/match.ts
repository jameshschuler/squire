import { words } from "@squire/api/recipe-book";

export function matchesWords(terms: string[], texts: string[]): boolean {
  const candidates = texts.flatMap(words);
  return terms.every((term) => candidates.some((word) => word.startsWith(term)));
}
