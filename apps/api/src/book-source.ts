import type { FastifyBaseLogger } from "fastify";
import type { WalkScapeClient } from "@walkscape-community/data-api-client";
import { loadGameData } from "./game-data.js";
import type { GameDataCache } from "./game-data-cache.js";
import { buildGearData, type GearData } from "./gear-data/index.js";
import { buildRecipeBook, type GameData, type RecipeBook } from "./recipe-book/index.js";

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export interface Books {
  recipeBook: RecipeBook;
  gearData: GearData;
}

export type BookSource = () => Promise<Books>;

type Logger = Pick<FastifyBaseLogger, "info" | "warn">;

interface BookSourceOptions {
  onLoad?: (books: Books) => void;
  now?: () => number;
  cache?: GameDataCache;
}

export function createBookSource(
  client: WalkScapeClient,
  log: Logger,
  { onLoad, now = Date.now, cache }: BookSourceOptions = {},
): BookSource {
  let books: Books | undefined;
  let checkedAt = 0;
  let pending: Promise<Books> | undefined;

  function build(data: GameData, from: "cache" | "api", startedAt: number): Books {
    const built = { recipeBook: buildRecipeBook(data), gearData: buildGearData(data) };

    log.info(
      {
        version: data.version,
        from,
        recipes: built.recipeBook.recipes.length,
        gear: built.gearData.items.length,
        ms: now() - startedAt,
      },
      "Loaded game data",
    );
    onLoad?.(built);

    return built;
  }

  async function load(): Promise<Books> {
    const startedAt = now();
    const data = await loadGameData(client);

    cache?.write(data).catch((err: unknown) => log.warn({ err }, "Failed to save game data"));

    return build(data, "api", startedAt);
  }

  async function firstLoad(): Promise<Books> {
    const startedAt = now();
    const cached = await cache?.read();

    if (!cached) {
      return load();
    }

    const version = await client.version().then(
      (response) => response.version,
      (err: unknown) => {
        log.warn({ err }, "Couldn't check the game data version, using the saved game data");

        return cached.version;
      },
    );

    return version === cached.version ? build(cached, "cache", startedAt) : load();
  }

  async function refresh(): Promise<Books> {
    if (!books) {
      books = await firstLoad();
    } else {
      const { version } = await client.version();

      if (version !== books.recipeBook.version) {
        log.info({ from: books.recipeBook.version, to: version }, "Game data changed");
        books = await load();
      }
    }

    checkedAt = now();

    return books;
  }

  return () => {
    if (books && now() - checkedAt < VERSION_CHECK_INTERVAL_MS) {
      return Promise.resolve(books);
    }

    pending ??= refresh().finally(() => {
      pending = undefined;
    });

    return pending;
  };
}
