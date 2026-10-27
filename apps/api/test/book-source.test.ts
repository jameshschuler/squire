import { describe, expect, it, vi } from "vitest";
import { createBookSource } from "../src/book-source.js";
import { fakeClient } from "./fake-client.js";

const MINUTE = 60 * 1000;

function setup() {
  const fake = fakeClient();
  const clock = { now: 0 };
  const log = { info: vi.fn() };
  const onLoad = vi.fn();
  const books = createBookSource(fake.client, log, { onLoad, now: () => clock.now });
  return { ...fake, clock, log, onLoad, books };
}

describe("createBookSource", () => {
  it("serves from memory without asking the API within 5 minutes", async () => {
    const { books, calls, clock } = setup();
    await books();
    clock.now = 4 * MINUTE;
    await books();
    expect(calls.version).toBe(1);
  });

  it("checks the version after 5 minutes but keeps the data when it hasn't changed", async () => {
    const { books, calls, clock } = setup();
    const first = await books();
    const loadsAfterFirst = calls.lists;
    clock.now = 6 * MINUTE;
    await expect(books()).resolves.toBe(first);
    expect(calls.version).toBe(2);
    expect(loadsAfterFirst).toBeGreaterThan(0);
    expect(calls.lists).toBe(loadsAfterFirst);
  });

  it("reloads and logs when the game data version changes", async () => {
    const { books, state, clock, log, calls } = setup();
    await books();
    const loadsAfterFirst = calls.lists;
    state.version = "v2";
    clock.now = 6 * MINUTE;
    const reloaded = await books();
    expect(reloaded.recipeBook.version).toBe("v2");
    expect(reloaded.gearData.version).toBe("v2");
    expect(calls.lists).toBe(2 * loadsAfterFirst);
    expect(log.info).toHaveBeenCalledWith({ from: "v1", to: "v2" }, "Game data changed");
  });

  it("calls onLoad with each newly loaded set of books, not on cache hits", async () => {
    const { books, onLoad, state, clock } = setup();
    const first = await books();
    await books();
    state.version = "v2";
    clock.now = 6 * MINUTE;
    const second = await books();
    expect(onLoad.mock.calls).toEqual([[first], [second]]);
  });

  it("logs each load with its version, recipe count and gear count", async () => {
    const { books, log } = setup();
    await books();
    expect(log.info).toHaveBeenCalledWith({ version: "v1", recipes: 3, gear: 0, ms: 0 }, "Loaded game data");
  });

  it("shares one load between concurrent requests", async () => {
    const { books, calls } = setup();
    await Promise.all([books(), books(), books()]);
    expect(calls.version).toBe(1);
  });

  it("retries on the next request after a failed load", async () => {
    const { books, client } = setup();
    const version = client.version;
    client.version = async () => {
      throw new Error("down");
    };
    await expect(books()).rejects.toThrow("down");
    client.version = version;
    await expect(books()).resolves.toMatchObject({ recipeBook: { version: "v1" } });
  });
});
