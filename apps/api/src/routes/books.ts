import type { FastifyInstance } from "fastify";
import { HTTP_STATUS } from "../http-status.js";
import { encodeJson, preferredEncoding, type EncodedJson } from "../encoded-json.js";
import type { BookSource, Books } from "../book-source.js";

interface VersionedJson {
  schema: number;
  version: string;
}

export function bookRoutes(books: BookSource) {
  return async (app: FastifyInstance): Promise<void> => {
    versionedJsonRoute(app, "/api/recipes", books, (loaded) => loaded.recipeBook);
    versionedJsonRoute(app, "/api/gear", books, (loaded) => loaded.gearData);
  };
}

function versionedJsonRoute(
  app: FastifyInstance,
  path: string,
  books: BookSource,
  pick: (books: Books) => VersionedJson,
): void {
  let encoded: { version: string; body: Promise<EncodedJson> } | undefined;

  function encodedBody(json: VersionedJson): Promise<EncodedJson> {
    if (encoded?.version !== json.version) {
      encoded = { version: json.version, body: encodeJson(json) };
    }
    return encoded.body;
  }

  app.get(path, async (request, reply) => {
    const loaded = await books();
    const json = pick(loaded);
    const etag = `"${json.schema}-${json.version}"`;
    reply.header("ETag", etag).header("Cache-Control", "no-cache").header("Vary", "Accept-Encoding");
    if (request.headers["if-none-match"] === etag) {
      return reply.code(HTTP_STATUS.NOT_MODIFIED).send();
    }
    const encoding = preferredEncoding(request.headers["accept-encoding"]);
    const encodings = await encodedBody(json);
    const body = encodings[encoding];
    if (encoding !== "identity") {
      reply.header("Content-Encoding", encoding);
    }
    return reply.type("application/json; charset=utf-8").send(body);
  });
}
