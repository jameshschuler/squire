import Fastify, { type FastifyInstance } from "fastify";
import compress from "@fastify/compress";
import cors from "@fastify/cors";
import { WalkScapeApiError, recipeBookIcons, type WalkScapeClient } from "@jameshschuler/walkscape-sdk";
import { createIconStore } from "./icons.js";
import { createRecipeBookSource } from "./recipe-book.js";
import { healthRoutes } from "./routes/health.js";
import { iconRoutes } from "./routes/icons.js";
import { recipeRoutes } from "./routes/recipes.js";

export interface AppOptions {
  client: WalkScapeClient;
  logLevel: string;
  corsOrigins: string[];
}

export function buildApp({ client, logLevel, corsOrigins }: AppOptions): FastifyInstance {
  const app = Fastify({ logger: { level: logLevel } });

  app.setErrorHandler((error, request, reply) => {
    if (!(error instanceof WalkScapeApiError)) {
      return reply.send(error);
    }
    if (error.status === 404) {
      return reply.code(404).send({ error: "Not found" });
    }
    request.log.error({ err: error }, "WalkScape API request failed");
    return reply.code(502).send({ error: "WalkScape API unavailable" });
  });

  const icons = createIconStore(client);
  const recipeBook = createRecipeBookSource(client, app.log, {
    onLoad: (book) => {
      icons
        .warm(recipeBookIcons(book))
        .then((loaded) => app.log.info({ icons: loaded }, "Warmed icon cache"))
        .catch((err: unknown) => app.log.warn({ err }, "Failed to warm icon cache"));
    },
  });

  app.register(compress, { encodings: ["br", "gzip"] });
  app.register(cors, { origin: corsOrigins.length > 0 ? corsOrigins : false, methods: ["GET"] });
  app.register(healthRoutes);
  app.register(recipeRoutes(recipeBook));
  app.register(iconRoutes(icons));
  return app;
}
