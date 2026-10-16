import type { paths } from "./generated/openapi.js";

export type ApiResource = { [P in keyof paths]: P extends `/${infer R}/id/{id}` ? R : never }[keyof paths];

export type CamelCase<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;

export type ApiResourceOf<R extends string> = { [A in ApiResource]: CamelCase<A> extends R ? A : never }[ApiResource];
