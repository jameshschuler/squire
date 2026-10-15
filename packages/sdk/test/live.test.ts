import { describe, expect, it } from "vitest";
import { ENVIRONMENTS, buildRecipeBook, createClient, loadGameData } from "../src/index.js";

const apiKey = process.env.WALKSCAPE_API_KEY;

describe.skipIf(!apiKey)("live dev API", () => {
  it("loads every recipe and finds a location for each service", { timeout: 120_000 }, async () => {
    const client = createClient({ apiKey: apiKey!, baseUrl: ENVIRONMENTS.dev });
    const data = await loadGameData(client);
    const { recipes } = buildRecipeBook(data);

    expect(recipes).toHaveLength((await client.list("recipes")).length);
    expect(recipes.filter((r) => r.service && r.service.locations.length === 0)).toEqual([]);
  });
});
