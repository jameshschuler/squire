import { isDeepStrictEqual } from "node:util";
import { Ajv2019 } from "ajv/dist/2019.js";
import { describe, expect, it } from "vitest";
import { ENVIRONMENTS, createClient, type ResourceName } from "../src/index.js";
import { LISTS_WITH_FULL_ENTRIES } from "../src/full-lists.js";

const apiKey = process.env.WALKSCAPE_API_KEY;
const SAMPLE_SIZE = 10;

type Schema = Record<string, unknown>;

function toJsonSchema(node: unknown, inAllOf = false): unknown {
  if (Array.isArray(node)) {
    return node.map((child) => toJsonSchema(child, inAllOf));
  }
  if (!node || typeof node !== "object") {
    return node;
  }
  const { nullable, discriminator: _discriminator, example: _example, oneOf, ...rest } = node as Schema;
  const out: Schema = {};
  for (const [key, value] of Object.entries(rest)) {
    out[key] =
      key === "properties"
        ? Object.fromEntries(Object.entries(value as Schema).map(([name, schema]) => [name, toJsonSchema(schema)]))
        : toJsonSchema(value, key === "allOf");
  }
  if (oneOf) {
    out.anyOf = toJsonSchema(oneOf);
  }
  if (typeof out.$ref === "string") {
    out.$ref = out.$ref.replace("#/components/schemas", inAllOf ? "spec#/components/open" : "spec#/components/schemas");
  }
  if (!inAllOf && (out.properties || out.allOf) && out.additionalProperties === undefined) {
    out.unevaluatedProperties = false;
  }
  if (!nullable) {
    return out;
  }
  return typeof out.type === "string" && !out.enum
    ? { ...out, type: [out.type, "null"] }
    : { anyOf: [out, { type: "null" }] };
}

describe.skipIf(!apiKey)("live dev API matches its OpenAPI spec", () => {
  it("returns list and detail shapes the spec describes for every resource", { timeout: 300_000 }, async () => {
    const specResponse = await fetch(`${ENVIRONMENTS.dev}/docs/openapi.json`);
    const spec = await specResponse.json();
    const schemas = Object.entries(spec.components.schemas as Schema);
    const ajv = new Ajv2019({ strict: false, allErrors: true });
    ajv.addSchema({
      $id: "spec",
      components: {
        schemas: Object.fromEntries(schemas.map(([name, schema]) => [name, toJsonSchema(schema)])),
        open: Object.fromEntries(schemas.map(([name, schema]) => [name, toJsonSchema(schema, true)])),
      },
    });
    const responseSchema = (path: string) =>
      toJsonSchema(spec.paths[path].get.responses["200"].content["application/json"].schema) as Schema;
    const client = createClient({ apiKey: apiKey!, baseUrl: ENVIRONMENTS.dev });
    const resources = Object.keys(spec.paths).flatMap((path) => /^\/(\w+)\/id\/\{id\}$/.exec(path)?.[1] ?? []);
    const mismatches: string[] = [];
    const check = (label: string, schema: Schema, data: unknown) => {
      const validate = ajv.compile(schema);
      if (!validate(data)) {
        const errors = (validate.errors ?? []).filter((e) => e.keyword !== "anyOf");
        mismatches.push(...errors.map((e) => `${label}${e.instancePath} ${e.message} ${JSON.stringify(e.params)}`));
      }
    };

    for (const resource of resources as ResourceName[]) {
      const list = await client.list(resource);
      check(`${resource} list`, responseSchema(`/${resource}/`), list);
      for (const listed of (list as { id: string }[]).slice(0, SAMPLE_SIZE)) {
        const { id } = listed;
        const entry = await client.get(resource, id);
        check(`${resource}/${id}`, responseSchema(`/${resource}/id/{id}`), entry);
        if (LISTS_WITH_FULL_ENTRIES.has(resource) && !isDeepStrictEqual(listed, entry)) {
          mismatches.push(`${resource}/${id} list entry differs from the full entry`);
        }
      }
    }

    expect(resources.length).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });
});
