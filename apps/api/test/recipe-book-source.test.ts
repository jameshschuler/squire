import { describe, expect, it, vi } from "vitest";
import { createRecipeBookSource } from "../src/recipe-book-source.js";
import { fakeClient } from "./fake-client.js";

const MINUTE = 60 * 1000;

function setup() {
  const fake = fakeClient();
  const clock = { now: 0 };
  const log = { info: vi.fn() };
  const onLoad = vi.fn();
  const recipeBook = createRecipeBookSource(fake.client, log, { onLoad, now: () => clock.now });
  return { ...fake, clock, log, onLoad, recipeBook };
}

describe("createRecipeBookSource", () => {
  it("serves from memory without asking the API within 5 minutes", async () => {
    const { recipeBook, calls, clock } = setup();
    await recipeBook();
    clock.now = 4 * MINUTE;
    await recipeBook();
    expect(calls.version).toBe(1);
  });

  it("checks the version after 5 minutes but keeps the data when it hasn't changed", async () => {
    const { recipeBook, calls, clock } = setup();
    const first = await recipeBook();
    const listsAfterLoad = calls.list;
    clock.now = 6 * MINUTE;
    expect(await recipeBook()).toBe(first);
    expect(calls.version).toBe(2);
    expect(calls.list).toBe(listsAfterLoad);
  });

  it("reloads and logs when the game data version changes", async () => {
    const { recipeBook, state, clock, log } = setup();
    await recipeBook();
    state.version = "v2";
    clock.now = 6 * MINUTE;
    expect((await recipeBook()).version).toBe("v2");
    expect(log.info).toHaveBeenCalledWith({ from: "v1", to: "v2" }, "Game data changed");
  });

  it("calls onLoad with each newly loaded book, not on cache hits", async () => {
    const { recipeBook, onLoad, state, clock } = setup();
    const first = await recipeBook();
    await recipeBook();
    state.version = "v2";
    clock.now = 6 * MINUTE;
    const second = await recipeBook();
    expect(onLoad.mock.calls).toEqual([[first], [second]]);
  });

  it("logs each load with its version and recipe count", async () => {
    const { recipeBook, log } = setup();
    await recipeBook();
    expect(log.info).toHaveBeenCalledWith({ version: "v1", recipes: 3, ms: 0 }, "Loaded recipe book");
  });

  it("shares one load between concurrent requests", async () => {
    const { recipeBook, calls } = setup();
    await Promise.all([recipeBook(), recipeBook(), recipeBook()]);
    expect(calls.version).toBe(1);
  });

  it("retries on the next request after a failed load", async () => {
    const { recipeBook, client } = setup();
    const version = client.version;
    client.version = async () => {
      throw new Error("down");
    };
    await expect(recipeBook()).rejects.toThrow("down");
    client.version = version;
    await expect(recipeBook()).resolves.toMatchObject({ version: "v1" });
  });
});
