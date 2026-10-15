import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";

const brotliAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

export type Encoding = "br" | "gzip" | "identity";

export type EncodedJson = Record<Encoding, Buffer>;

export async function encodeJson(value: unknown): Promise<EncodedJson> {
  const identity = Buffer.from(JSON.stringify(value));
  const [br, gz] = await Promise.all([
    brotliAsync(identity, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: identity.length,
      },
    }),
    gzipAsync(identity, { level: constants.Z_BEST_COMPRESSION }),
  ]);
  return { br, gzip: gz, identity };
}

export function preferredEncoding(acceptEncoding: string | undefined): Encoding {
  const accepted = (acceptEncoding ?? "").split(",").map((part) => part.trim().split(";")[0]);
  if (accepted.includes("br")) {
    return "br";
  }
  return accepted.includes("gzip") ? "gzip" : "identity";
}
