import type { WalkScapeClient } from "./client.js";
import type { CompactEntity, Item, Location, Recipe, Service, Skill } from "./types.js";

export interface GameData {
  version: string;
  recipes: Recipe[];
  items: Item[];
  skills: Skill[];
  services: Service[];
  locations: Location[];
}

const CONCURRENCY = 4;

export async function loadGameData(client: WalkScapeClient): Promise<GameData> {
  const [{ version }, skills, items, services, compactRecipes, compactLocations] = await Promise.all([
    client.version(),
    client.list<Skill>("skills"),
    client.list<Item>("items"),
    client.search<Service>("services", { serviceType: "crafting" }, { detailed: true }),
    client.list<CompactEntity>("recipes"),
    client.list<CompactEntity>("locations"),
  ]);

  const recipesBySkill = await mapPool(skills, (skill) =>
    client.search<Recipe>("recipes", { relatedSkills: skill.id }, { detailed: true }),
  );
  const recipes = new Map(recipesBySkill.flat().map((r) => [r.id, r]));
  const missing = compactRecipes.filter((r) => !recipes.has(r.id));
  for (const recipe of await mapPool(missing, (r) => client.get<Recipe>("recipes", r.id))) {
    recipes.set(recipe.id, recipe);
  }

  const locations = await mapPool(compactLocations, (l) => client.get<Location>("locations", l.id));

  return { version, recipes: [...recipes.values()], items, skills, services, locations };
}

async function mapPool<T, R>(inputs: T[], fn: (input: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < inputs.length) {
      const i = next++;
      results[i] = await fn(inputs[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, inputs.length) }, worker));
  return results;
}
