import type { FastifyBaseLogger } from "fastify";
import type { WalkScapeClient } from "@walkscape-community/data-api-client";
import { loadGameData } from "./game-data.js";
import { buildRecipeBook, type RecipeBook } from "./recipe-book/index.js";

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export type RecipeBookSource = () => Promise<RecipeBook>;

type Logger = Pick<FastifyBaseLogger, "info">;

interface RecipeBookSourceOptions {
  onLoad?: (book: RecipeBook) => void;
  now?: () => number;
}

export function createRecipeBookSource(
  client: WalkScapeClient,
  log: Logger,
  { onLoad, now = Date.now }: RecipeBookSourceOptions = {},
): RecipeBookSource {
  let book: RecipeBook | undefined;
  let checkedAt = 0;
  let pending: Promise<RecipeBook> | undefined;

  async function load(): Promise<RecipeBook> {
    const startedAt = now();
    const data = await loadGameData(client);
    const loaded = buildRecipeBook(data);
    log.info({ version: loaded.version, recipes: loaded.recipes.length, ms: now() - startedAt }, "Loaded recipe book");
    onLoad?.(loaded);
    return loaded;
  }

  async function refresh(): Promise<RecipeBook> {
    if (!book) {
      book = await load();
    } else {
      const { version } = await client.version();
      if (version !== book.version) {
        log.info({ from: book.version, to: version }, "Game data changed");
        book = await load();
      }
    }
    checkedAt = now();
    return book;
  }

  return () => {
    if (book && now() - checkedAt < VERSION_CHECK_INTERVAL_MS) {
      return Promise.resolve(book);
    }
    pending ??= refresh().finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
