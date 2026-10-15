import { ENVIRONMENTS, createClient, loadGameData } from "@jameshschuler/walkscape-sdk";
import { describe, expect, it } from "vitest";
import { buildRecipeBook } from "../src/recipe-book/index.js";

const apiKey = process.env.WALKSCAPE_API_KEY;

describe.skipIf(!apiKey)("recipe book from the live dev API", () => {
  it("finds service locations and material sources", { timeout: 120_000 }, async () => {
    const book = buildRecipeBook(await loadGameData(createClient({ apiKey: apiKey!, baseUrl: ENVIRONMENTS.dev })));

    expect(book.recipes.filter((r) => r.service && r.service.locations.length === 0)).toEqual([]);
    expect(book.sources.bones?.map((s) => s.name)).toContain("Bear hunting");
    expect(book.sources.bones?.every((s) => s.kind === "activity" && s.locations.length > 0)).toBe(true);
    expect(book.sources.log_splitter?.map((s) => s.name)).toContain("Woodcutting chest");
    expect(book.sources.simple_pan?.some((s) => s.kind === "shop")).toBe(true);
  });
});
