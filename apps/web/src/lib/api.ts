import type { RecipeBook } from "@squire/api/recipe-book";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function fetchRecipeBook(): Promise<RecipeBook> {
  const res = await fetch(`${API_URL}/api/recipes`);
  if (!res.ok) {
    throw new Error(`Failed to load recipes (${res.status})`);
  }
  return res.json();
}

export function iconUrl(path: string): string {
  return `${API_URL}/api/icons/${path}`;
}
