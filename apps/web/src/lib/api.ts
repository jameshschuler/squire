import { RECIPE_BOOK_SCHEMA, type RecipeBook } from "@squire/api/recipe-book";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function fetchRecipeBook(): Promise<RecipeBook> {
  const res = await fetch(`${API_URL}/api/recipes?schema=${RECIPE_BOOK_SCHEMA}`);
  if (!res.ok) {
    throw new Error(`Failed to load recipes (${res.status})`);
  }
  const book: RecipeBook = await res.json();
  if (book.schema !== RECIPE_BOOK_SCHEMA) {
    throw new Error("Recipes are updating. Try again in a minute.");
  }
  return book;
}

export function iconUrl(path: string): string {
  return `${API_URL}/api/icons/${path}`;
}
