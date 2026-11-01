import { ENVIRONMENTS, createClient } from "@walkscape-community/data-api-client";
import { describe, expect, it } from "vitest";
import { HTTP_STATUS } from "../src/http-status.js";
import { loadGameData } from "../src/game-data.js";
import { buildRecipeBook } from "../src/recipe-book/index.js";

const apiKey = process.env.WALKSCAPE_API_KEY;

describe.skipIf(!apiKey)("recipe book from the live dev API", () => {
  it("finds service locations and material sources", { timeout: 120_000 }, async () => {
    let requests = 0;
    const countingFetch: typeof fetch = async (input, init) => {
      const res = await fetch(input, init);

      if (res.status !== HTTP_STATUS.TOO_MANY_REQUESTS) {
        requests++;
      }

      return res;
    };

    const data = await loadGameData(createClient({ apiKey: apiKey!, baseUrl: ENVIRONMENTS.dev, fetch: countingFetch }));
    const book = buildRecipeBook(data);

    expect(requests).toBeLessThan(70);
    expect(book.recipes.filter((recipe) => recipe.service && recipe.service.locations.length === 0)).toEqual([]);
    expect(book.sources.bones?.map((bone) => bone.name)).toContain("Bear hunting");
    expect(book.sources.bones?.every((bone) => bone.kind === "activity" && bone.locations.length > 0)).toBe(true);
    expect(book.sources.log_splitter?.map((source) => source.name)).toContain("Woodcutting chest");
    expect(book.sources.simple_pan?.some((source) => source.kind === "shop")).toBe(true);
  });
});
