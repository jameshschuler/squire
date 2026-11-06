import { GEAR_DATA_SCHEMA, type GearData } from "@walkscape-community/gear-optimizer";
import { RECIPE_BOOK_SCHEMA, type RecipeBook } from "@squire/api/recipe-book";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function fetchRecipeBook({ fresh = false } = {}): Promise<RecipeBook> {
  return fetchVersioned<RecipeBook>("/api/recipes", RECIPE_BOOK_SCHEMA, "game data", fresh);
}

export function fetchGearData(): Promise<GearData> {
  return fetchVersioned<GearData>("/api/gear", GEAR_DATA_SCHEMA, "gear data", false);
}

async function fetchVersioned<T extends { schema: number }>(
  path: string,
  schema: number,
  label: string,
  fresh: boolean,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}?schema=${schema}${fresh ? "&fresh=1" : ""}`);

  if (!res.ok) {
    throw new Error(`Failed to load ${label} (${res.status})`);
  }

  const data: T = await res.json();

  if (data.schema !== schema) {
    throw new Error(`${label.charAt(0).toUpperCase()}${label.slice(1)} is updating. Try again in a minute.`);
  }

  return data;
}

export function sendGearSearchLog(body: string): void {
  fetch(`${API_URL}/api/gear-searches`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}

export function iconUrl(path: string): string {
  return `${API_URL}/api/icons/${path}`;
}
