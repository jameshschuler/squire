import { createClient } from "@walkscape-community/data-api-client";
import { buildApp } from "./app.js";
import { readEnv } from "./env.js";
import { fileCache } from "./game-data-cache.js";

const env = readEnv();
const app = buildApp({
  client: createClient({ apiKey: env.apiKey, baseUrl: env.baseUrl }),
  logLevel: env.logLevel,
  corsOrigins: env.corsOrigins,
  cache: fileCache(env.gameDataCachePath),
  warmOnStart: true,
});

await app.listen({ port: env.port, host: "0.0.0.0" });
