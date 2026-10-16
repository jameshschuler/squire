import { createClient } from "@jameshschuler/walkscape-data-client";
import { buildApp } from "./app.js";
import { readEnv } from "./env.js";

const env = readEnv();
const app = buildApp({
  client: createClient({ apiKey: env.apiKey, baseUrl: env.baseUrl }),
  logLevel: env.logLevel,
  corsOrigins: env.corsOrigins,
});
await app.listen({ port: env.port, host: "0.0.0.0" });
