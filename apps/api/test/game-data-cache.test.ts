import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_DATA_CACHE_SCHEMA, fileCache } from "../src/game-data-cache.js";
import type { GameData } from "../src/recipe-book/index.js";
import sample from "../../../fixtures/api/gamedata-sample.json";

const data = sample as unknown as GameData;
let folder = "";

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "squire-cache-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("fileCache", () => {
  it("reads back the game data it saved, creating the folder it needs", async () => {
    const cache = fileCache(join(folder, "nested", "game-data.json"));

    await cache.write(data);

    await expect(cache.read()).resolves.toEqual(data);
  });

  it("leaves no temporary file behind after saving", async () => {
    await fileCache(join(folder, "game-data.json")).write(data);

    await expect(readdir(folder)).resolves.toEqual(["game-data.json"]);
  });

  it.each([
    ["is missing", null],
    ["isn't JSON", "{ not json"],
    ["was saved in an older format", JSON.stringify({ schema: GAME_DATA_CACHE_SCHEMA - 1, data })],
  ])("reads as nothing saved when the file %s", async (_, contents) => {
    const path = join(folder, "game-data.json");

    if (contents !== null) {
      await writeFile(path, contents);
    }

    await expect(fileCache(path).read()).resolves.toBeNull();
  });
});
