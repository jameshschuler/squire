import type { FastifyInstance } from "fastify";
import { HTTP_STATUS } from "../http-status.js";
import type { IconStore } from "../icons.js";

const LOADING_RETRY_AFTER_SECONDS = 5;

export function iconRoutes(icons: IconStore) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get<{ Params: { "*": string } }>("/api/icons/*", async (request, reply) => {
      if (!icons.hasKnownIcons()) {
        return reply
          .code(HTTP_STATUS.SERVICE_UNAVAILABLE)
          .header("Retry-After", LOADING_RETRY_AFTER_SECONDS)
          .send({ error: "Icons aren't ready yet" });
      }
      const icon = await icons.get(request.params["*"]);
      if (!icon) {
        return reply.code(HTTP_STATUS.NOT_FOUND).send({ error: "Not found" });
      }
      return reply.type(icon.type).header("Cache-Control", "public, max-age=604800").send(icon.body);
    });
  };
}
