import type { FastifyInstance } from "fastify";
import type { RecipeBook } from "@jameshschuler/walkscape-sdk";
import { encodeJson, preferredEncoding, type EncodedJson } from "../encoded-json.js";
import type { RecipeBookSource } from "../recipe-book.js";

export function recipeRoutes(recipeBook: RecipeBookSource) {
  let encoded: { version: string; body: Promise<EncodedJson> } | undefined;

  function encodedBody(book: RecipeBook): Promise<EncodedJson> {
    if (encoded?.version !== book.version) {
      encoded = { version: book.version, body: encodeJson(book) };
    }
    return encoded.body;
  }

  return async (app: FastifyInstance): Promise<void> => {
    app.get("/api/recipes", async (request, reply) => {
      const book = await recipeBook();
      const etag = `"${book.schema}-${book.version}"`;
      reply.header("ETag", etag).header("Cache-Control", "no-cache").header("Vary", "Accept-Encoding");
      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send();
      }
      const encoding = preferredEncoding(request.headers["accept-encoding"]);
      const body = (await encodedBody(book))[encoding];
      if (encoding !== "identity") {
        reply.header("Content-Encoding", encoding);
      }
      return reply.type("application/json; charset=utf-8").send(body);
    });
  };
}
