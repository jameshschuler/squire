import { describe, expect, it, vi } from "vitest";
import { createBookSource } from "../src/book-source.js";
import type { GameDataCache } from "../src/game-data-cache.js";
import type { GameData } from "../src/recipe-book/index.js";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { fakeClient } from "./fake-client.js";

const MINUTE = 60 * 1000;

function setup(cache?: GameDataCache) {
  const fake = fakeClient();
  const clock = { now: 0 };
  const log = { info: vi.fn(), warn: vi.fn() };
  const onLoad = vi.fn();
  const books = createBookSource(fake.client, log, { onLoad, now: () => clock.now, cache });

  return { ...fake, clock, log, onLoad, books };
}

function memoryCache(saved: GameData | null = null) {
  const cache = {
    saved,
    read: vi.fn(async () => cache.saved),
    write: vi.fn(async (data: GameData) => {
      cache.saved = data;
    }),
  };

  return cache;
}

function savedGameData(version: string): GameData {
  return { ...(sample as unknown as GameData), version };
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
    expect(log.info).toHaveBeenCalledWith(
      { version: "v1", from: "api", recipes: 3, gear: 0, ms: 0 },
      "Loaded game data",
    );
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

  describe("with saved game data", () => {
    it("builds from the saved data with one version check when it's still current", async () => {
      const cache = memoryCache(savedGameData("v1"));
      const { books, calls, log } = setup(cache);

      const loaded = await books();

      expect(loaded.recipeBook.version).toBe("v1");
      expect(calls.version).toBe(1);
      expect(calls.lists).toBe(0);
      expect(log.info).toHaveBeenCalledWith(expect.objectContaining({ from: "cache" }), "Loaded game data");
    });

    it("keeps the time the saved data was fetched, not when the server started", async () => {
      const cache = memoryCache({ ...savedGameData("v1"), fetchedAt: "2026-10-30T08:00:00.000Z" });
      const { books, clock } = setup(cache);

      clock.now = Date.parse("2026-11-04T09:00:00.000Z");

      await expect(books()).resolves.toMatchObject({ recipeBook: { updatedAt: "2026-10-30T08:00:00.000Z" } });
    });

    it("refetches and saves the new data when the saved version is out of date", async () => {
      const cache = memoryCache(savedGameData("v0"));
      const { books, calls } = setup(cache);

      const loaded = await books();

      expect(loaded.recipeBook.version).toBe("v1");
      expect(calls.lists).toBeGreaterThan(0);
      expect(cache.saved?.version).toBe("v1");
    });

    it("saves the data after a fetch when nothing was saved, stamped with when it was fetched", async () => {
      const cache = memoryCache();
      const { books, clock } = setup(cache);

      clock.now = Date.parse("2026-11-04T09:00:00.000Z");
      const loaded = await books();

      expect(cache.write).toHaveBeenCalledTimes(1);
      expect(cache.saved).toMatchObject({ version: "v1", fetchedAt: "2026-11-04T09:00:00.000Z" });
      expect(loaded.recipeBook.updatedAt).toBe("2026-11-04T09:00:00.000Z");
    });

    it("serves the saved data when the version check fails, so a WalkScape outage doesn't take the API down", async () => {
      const cache = memoryCache(savedGameData("v1"));
      const { books, client, calls, log } = setup(cache);

      client.version = () => Promise.reject(new Error("WalkScape API unavailable"));

      await expect(books()).resolves.toMatchObject({ recipeBook: { version: "v1" } });
      expect(calls.lists).toBe(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.anything(),
        "Couldn't check the game data version, using the saved game data",
      );
    });

    it("still serves the data when saving it fails, and logs a warning", async () => {
      const cache = memoryCache();

      cache.write.mockRejectedValueOnce(new Error("disk full"));
      const { books, log } = setup(cache);

      await expect(books()).resolves.toMatchObject({ recipeBook: { version: "v1" } });
      await vi.waitFor(() => expect(log.warn).toHaveBeenCalledWith(expect.anything(), "Failed to save game data"));
    });
  });
});
