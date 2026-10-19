import { RECIPE_BOOK_SCHEMA, type RecipeBook } from "@squire/api/recipe-book";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function fetchRecipeBook({ fresh = false } = {}): Promise<RecipeBook> {
  const res = await fetch(`${API_URL}/api/recipes?schema=${RECIPE_BOOK_SCHEMA}${fresh ? "&fresh=1" : ""}`);
  if (!res.ok) {
    throw new Error(`Failed to load game data (${res.status})`);
  }
  const book: RecipeBook = await res.json();
  if (book.schema !== RECIPE_BOOK_SCHEMA) {
    throw new Error("Game data is updating. Try again in a minute.");
  }
  return book;
}

export function iconUrl(path: string): string {
  return `${API_URL}/api/icons/${path}`;
}
