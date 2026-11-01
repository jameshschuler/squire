import { ENVIRONMENTS, type Environment } from "@walkscape-community/data-api-client";
import { DEFAULT_GAME_DATA_CACHE_PATH } from "./game-data-cache.js";

export interface Env {
  apiKey: string;
  baseUrl: string;
  port: number;
  logLevel: string;
  corsOrigins: string[];
  gameDataCachePath: string;
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const apiKey = source.WALKSCAPE_API_KEY;

  if (!apiKey) {
    throw new Error("WALKSCAPE_API_KEY is not set");
  }

  const environment = (source.WALKSCAPE_ENV ?? "prod") as Environment;

  if (!(environment in ENVIRONMENTS)) {
    throw new Error(`WALKSCAPE_ENV must be one of: ${Object.keys(ENVIRONMENTS).join(", ")}`);
  }

  return {
    apiKey,
    baseUrl: ENVIRONMENTS[environment],
    port: Number(source.PORT ?? 3000),
    logLevel: source.LOG_LEVEL ?? "info",
    corsOrigins: (source.CORS_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    gameDataCachePath: source.GAME_DATA_CACHE_PATH || DEFAULT_GAME_DATA_CACHE_PATH,
  };
}
