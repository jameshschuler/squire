import { afterEach, describe, expect, it, vi } from "vitest";
import { GEAR_DATA_SCHEMA } from "@squire/api/gear-data";
import { RECIPE_BOOK_SCHEMA } from "@squire/api/recipe-book";
import { fetchGearData, fetchRecipeBook } from "@/lib/api";

const respond = (body: unknown, status = 200) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );

afterEach(() => vi.unstubAllGlobals());

describe("fetchGearData", () => {
  it("asks for its own schema and returns the gear data", async () => {
    respond({ schema: GEAR_DATA_SCHEMA, version: "v1" });
    await expect(fetchGearData()).resolves.toMatchObject({ version: "v1" });
    expect(fetch).toHaveBeenCalledWith(`/api/gear?schema=${GEAR_DATA_SCHEMA}`);
  });

  it("says the gear data is updating when the server has a different schema", async () => {
    respond({ schema: GEAR_DATA_SCHEMA + 1, version: "v1" });
    await expect(fetchGearData()).rejects.toThrow("Gear data is updating. Try again in a minute.");
  });

  it("names the gear data when the request fails", async () => {
    respond({}, 500);
    await expect(fetchGearData()).rejects.toThrow("Failed to load gear data (500)");
  });
});

describe("fetchRecipeBook", () => {
  it("asks for a fresh copy when told to", async () => {
    respond({ schema: RECIPE_BOOK_SCHEMA, version: "v1" });
    await fetchRecipeBook({ fresh: true });
    expect(fetch).toHaveBeenCalledWith(`/api/recipes?schema=${RECIPE_BOOK_SCHEMA}&fresh=1`);
  });

  it("says the game data is updating when the server has a different schema", async () => {
    respond({ schema: RECIPE_BOOK_SCHEMA + 1, version: "v1" });
    await expect(fetchRecipeBook()).rejects.toThrow("Game data is updating. Try again in a minute.");
  });
});
