import Fastify, { type FastifyInstance } from "fastify";
import compress from "@fastify/compress";
import cors from "@fastify/cors";
import { WalkScapeApiError, type WalkScapeClient } from "@walkscape-community/data-api-client";
import { gearDataIcons } from "./gear-data/index.js";
import { recipeBookIcons } from "./recipe-book/index.js";
import { HTTP_STATUS } from "./http-status.js";
import { createIconStore } from "./icons.js";
import { createBookSource } from "./book-source.js";
import { healthRoutes } from "./routes/health.js";
import { iconRoutes } from "./routes/icons.js";
import { bookRoutes } from "./routes/books.js";

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
    if (error.status === HTTP_STATUS.NOT_FOUND) {
      return reply.code(HTTP_STATUS.NOT_FOUND).send({ error: "Not found" });
    }
    request.log.error({ err: error }, "WalkScape API request failed");
    return reply.code(HTTP_STATUS.BAD_GATEWAY).send({ error: "WalkScape API unavailable" });
  });

  const icons = createIconStore(client);
  const books = createBookSource(client, app.log, {
    onLoad: ({ recipeBook, gearData }) => {
      icons
        .warm([...new Set([...recipeBookIcons(recipeBook), ...gearDataIcons(gearData)])])
        .then((loaded) => app.log.info({ icons: loaded }, "Warmed icon cache"))
        .catch((err: unknown) => app.log.warn({ err }, "Failed to warm icon cache"));
    },
  });

  app.register(compress, { encodings: ["br", "gzip"] });
  app.register(cors, { origin: corsOrigins.length > 0 ? corsOrigins : false, methods: ["GET"] });
  app.register(healthRoutes);
  app.register(bookRoutes(books));
  app.register(iconRoutes(icons));
  return app;
}
