import { describe, expect, it } from "vitest";
import { ENVIRONMENTS, buildRecipeBook, createClient, loadGameData } from "../src/index.js";

const apiKey = process.env.WALKSCAPE_API_KEY;

describe.skipIf(!apiKey)("live dev API", () => {
  it("loads every recipe, service location and material source", { timeout: 120_000 }, async () => {
    let requests = 0;
    const countingFetch: typeof fetch = (input, init) => {
      requests++;
      return fetch(input, init);
    };
    const client = createClient({ apiKey: apiKey!, baseUrl: ENVIRONMENTS.dev, fetch: countingFetch });
    const data = await loadGameData(client);
    const loadRequests = requests;
    const book = buildRecipeBook(data);

    expect(book.recipes).toHaveLength((await client.list("recipes")).length);
    expect(data.locations).toHaveLength((await client.list("locations")).length);
    expect(book.recipes.filter((r) => r.service && r.service.locations.length === 0)).toEqual([]);
    expect(book.sources.bones?.map((s) => s.name)).toContain("Bear hunting");
    expect(book.sources.bones?.every((s) => s.locations.length > 0)).toBe(true);
    expect(loadRequests).toBeLessThan(60);
  });
});
