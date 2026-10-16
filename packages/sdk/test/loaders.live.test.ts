import { describe, expect, it } from "vitest";
import { HTTP_STATUS } from "../src/http-status.js";
import { ENVIRONMENTS, createClient, loadAll, lootTableItemIds, recipesUsing } from "../src/index.js";

const apiKey = process.env.WALKSCAPE_API_KEY;

describe.skipIf(!apiKey)("loadAll against the live dev API", () => {
  it("loads whole resources in a few requests", { timeout: 120_000 }, async () => {
    let requests = 0;
    const countingFetch: typeof fetch = async (input, init) => {
      const res = await fetch(input, init);
      if (res.status !== HTTP_STATUS.TOO_MANY_REQUESTS) {
        requests++;
      }
      return res;
    };
    const client = createClient({ apiKey: apiKey!, baseUrl: ENVIRONMENTS.dev, fetch: countingFetch });
    const [recipes, activities, lootTables] = await Promise.all([
      loadAll(client, "recipes"),
      loadAll(client, "activities"),
      loadAll(client, "loot_tables"),
    ]);
    const loadRequests = requests;

    const [recipeList, activityList] = await Promise.all([client.list("recipes"), client.list("activities")]);
    expect(recipes).toHaveLength(recipeList.length);
    expect(activities).toHaveLength(activityList.length);
    const tables = new Map(lootTables.map((t) => [t.id, t]));
    const referenced = activities.flatMap((a) => (a.tables ?? []).flatMap((ref) => ref.tables));
    expect(referenced.filter((id) => !tables.has(id))).toEqual([]);
    const bearHunting = activities.find((a) => a.name === "Bear hunting");
    const drops = (bearHunting?.tables ?? []).flatMap((ref) =>
      ref.tables.flatMap((id) => lootTableItemIds(tables.get(id)!)),
    );
    expect(drops).toContain("bones");
    expect(recipesUsing(recipes, "bones").length).toBeGreaterThan(0);
    expect(loadRequests).toBeLessThan(35);
  });
});
