import type { FastifyInstance } from "fastify";
import type { RecipeBookSource } from "../recipe-book.js";

export function recipeRoutes(recipeBook: RecipeBookSource) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get("/api/recipes", async (request, reply) => {
      const book = await recipeBook();
      const etag = `"${book.version}"`;
      reply.header("ETag", etag).header("Cache-Control", "no-cache");
      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send();
      }
      return book;
    });
  };
}
