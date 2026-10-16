import { describe, expect, it } from "vitest";
import { ENVIRONMENTS, createClient, loadGameData, lootTableItemIds, recipesUsing } from "../src/index.js";

const apiKey = process.env.WALKSCAPE_API_KEY;

describe.skipIf(!apiKey)("live dev API", () => {
  it("loads every recipe, location, activity and the loot tables they drop from", { timeout: 120_000 }, async () => {
    let requests = 0;
    const countingFetch: typeof fetch = (input, init) => {
      requests++;
      return fetch(input, init);
    };
    const client = createClient({ apiKey: apiKey!, baseUrl: ENVIRONMENTS.dev, fetch: countingFetch });
    const data = await loadGameData(client);
    const loadRequests = requests;

    expect(data.recipes).toHaveLength((await client.list("recipes")).length);
    expect(data.locations).toHaveLength((await client.list("locations")).length);
    expect(data.activities).toHaveLength((await client.list("activities")).length);
    const tables = new Map(data.lootTables.map((t) => [t.id, t]));
    const referenced = data.activities.flatMap((a) => (a.tables ?? []).flatMap((ref) => ref.tables));
    expect(referenced.filter((id) => !tables.has(id))).toEqual([]);
    const bearHunting = data.activities.find((a) => a.name === "Bear hunting");
    const drops = (bearHunting?.tables ?? []).flatMap((ref) =>
      ref.tables.flatMap((id) => lootTableItemIds(tables.get(id)!)),
    );
    expect(drops).toContain("bones");
    expect(recipesUsing(data.recipes, "bones").length).toBeGreaterThan(0);
    expect(loadRequests).toBeLessThan(70);
  });
});
