import type { FastifyBaseLogger } from "fastify";
import type { WalkScapeClient } from "@walkscape-community/data-api-client";
import { loadGameData } from "./game-data.js";
import { buildGearData, type GearData } from "./gear-data/index.js";
import { buildRecipeBook, type RecipeBook } from "./recipe-book/index.js";

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export interface Books {
  recipeBook: RecipeBook;
  gearData: GearData;
}

export type BookSource = () => Promise<Books>;

type Logger = Pick<FastifyBaseLogger, "info">;

interface BookSourceOptions {
  onLoad?: (books: Books) => void;
  now?: () => number;
}

export function createBookSource(
  client: WalkScapeClient,
  log: Logger,
  { onLoad, now = Date.now }: BookSourceOptions = {},
): BookSource {
  let books: Books | undefined;
  let checkedAt = 0;
  let pending: Promise<Books> | undefined;

  async function load(): Promise<Books> {
    const startedAt = now();
    const data = await loadGameData(client);
    const loaded = { recipeBook: buildRecipeBook(data), gearData: buildGearData(data) };
    log.info(
      {
        version: data.version,
        recipes: loaded.recipeBook.recipes.length,
        gear: loaded.gearData.items.length,
        ms: now() - startedAt,
      },
      "Loaded game data",
    );
    onLoad?.(loaded);
    return loaded;
  }

  async function refresh(): Promise<Books> {
    if (!books) {
      books = await load();
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
