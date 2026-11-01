import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { GameData } from "./recipe-book/index.js";

// Bump whenever loadGameData's shape changes (a resource added or reshaped), so an older file is
// ignored and refetched instead of being built into a broken book. A test pins the resources to it.
export const GAME_DATA_CACHE_SCHEMA = 1;

// In the API package's node_modules, which git ignores, wherever the server is started from.
export const DEFAULT_GAME_DATA_CACHE_PATH = fileURLToPath(
  new URL("../node_modules/.cache/squire/game-data.json", import.meta.url),
);

export interface GameDataCache {
  read: () => Promise<GameData | null>;
  write: (data: GameData) => Promise<void>;
}

interface CacheFile {
  schema: number;
  data: GameData;
}

// A missing, unreadable or outdated file reads as nothing saved. Each write goes to its own temporary
// file and is then renamed into place, so a crash or an overlapping write never leaves half a file.
export function fileCache(path: string): GameDataCache {
  return {
    read: async () => {
      try {
        const text = await readFile(path, "utf8");
        const file = JSON.parse(text) as CacheFile;

        return file.schema === GAME_DATA_CACHE_SCHEMA ? file.data : null;
      } catch {
        return null;
      }
    },
    write: async (data) => {
      const file: CacheFile = { schema: GAME_DATA_CACHE_SCHEMA, data };
      const temporary = `${path}.${randomUUID()}.tmp`;

      await mkdir(dirname(path), { recursive: true });
      await writeFile(temporary, JSON.stringify(file));
      await rename(temporary, path);
    },
  };
}
