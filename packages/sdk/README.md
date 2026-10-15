# @jameshschuler/walkscape-sdk

An unofficial TypeScript client for the [WalkScape](https://walkscape.app) Data API, plus helpers for working with recipes.

It runs anywhere with a global `fetch`: Node 22+, Deno, Bun, Cloudflare Workers and browsers. It has no runtime dependencies.

> Game data and icons are © WalkScape. This package isn't made or endorsed by the WalkScape team.

## Install

```sh
npm install @jameshschuler/walkscape-sdk
```

You need a Data API key. Keys are handed out in the "Walkscape Data API" thread on the [WalkScape Discord](https://discord.gg/Kk6VecJFEk). Keep the key on a server: don't ship it in browser code.

## Quick start

```ts
import { ENVIRONMENTS, buildRecipeBook, createClient, loadGameData, searchRecipes } from "@jameshschuler/walkscape-sdk";

const client = createClient({ apiKey: process.env.WALKSCAPE_API_KEY!, baseUrl: ENVIRONMENTS.dev });

const book = buildRecipeBook(await loadGameData(client));
const [recipe] = searchRecipes(book.recipes, "gold bar");

console.log(recipe.name); // "Smelt a gold bar"
console.log(recipe.materials); // [[{ name: "Gold nugget", amount: 7, ... }, { name: "Gold ore", amount: 2, ... }]]
console.log(recipe.service?.locations.map((l) => l.name)); // ["Bilgemont Port", "Granfiddich", ...]
```

## The client

`createClient(options)` returns a client for the API's resources (`items`, `recipes`, `locations`, `skills`, `services` and more):

| Method                                   | Returns                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `version()`                              | The current game data version. It changes whenever the data does.                                                    |
| `list(resource)`                         | Every entry, in compact form (usually `id`, `name`, `icon`).                                                         |
| `get(resource, id)`                      | One entry in full. Throws `WalkScapeApiError` (status 404) if it doesn't exist.                                      |
| `search(resource, params, { detailed })` | Entries matching every field in `params`, e.g. `{ relatedSkills: "cooking" }`. Full entries when `detailed` is true. |
| `icon(path)`                             | One icon image as a `Response`.                                                                                      |
| `icons(paths)`                           | Up to 200 icons in one request, as data URIs.                                                                        |

Options: `apiKey` (required), `baseUrl` (defaults to `ENVIRONMENTS.prod`), `locale` (translated strings, falls back to English), `fetch` and `maxRetries` (defaults to 3).

Errors from the API throw `WalkScapeApiError`, which has `status` and `path`.

## Recipe helpers

| Function                                          | What it does                                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `loadGameData(client)`                            | Loads every recipe, item, skill, crafting service, location, faction, activity and loot table: about 50 requests, a few seconds.          |
| `buildRecipeBook(data)`                           | Display-ready recipes: names and icons resolved, material alternatives grouped, the service needed and where to find it. Sorted by level. |
| `searchRecipes(recipes, query, { skill, limit })` | Matches recipe names, outputs and materials. Best matches first.                                                                          |
| `recipesMaking(recipes, itemId)`                  | Recipes that produce an item.                                                                                                             |
| `recipesUsing(recipes, itemId)`                   | Recipes that take an item as a material.                                                                                                  |
| `findItem(recipes, itemId)`                       | An item's name and icon.                                                                                                                  |
| `recipeBookIcons(book)`                           | Every icon path the book shows (recipes, materials, outputs and sources), each once.                                                      |

A recipe's service counts higher tiers too: an advanced kitchen can cook basic kitchen recipes. Each location carries its region and the lowest tier it has that qualifies, so you can group places by region and mark the ones that only have a better service.

`book.sources` says where to get each recipe material: the activities that drop it, keyed by item id. Each source has the activity's skill and level, its loot type (`main` loot, a `secondary` roll, or a special table such as `gem`), and the locations offering it, with regions. Materials no activity drops, such as tools sold in shops, have no entry.

```ts
book.sources.bones?.map((s) => `${s.name} at ${s.locations.map((l) => l.name).join(", ")}`);
// ["Wolf hunting at Sanguine Hills", "Lizard hunting at Old Arena Ruins", ...]
```

## Rate limits and caching

The API allows **120 requests a minute per IP**.

- JSON responses are cached by ETag, so asking again for unchanged data comes back as a cheap 304.
- Rate-limited (429) and server (5xx) responses are retried, waiting as long as the API's rate-limit headers say.
- Game data rarely changes. Load it once, keep it, and reload only when `version()` changes.
- Develop against `ENVIRONMENTS.dev`. Its data can change without warning.

## Terms

The Data API is free for community tools. Its terms ask you to:

- credit WalkScape somewhere visible;
- not redistribute the raw dataset as your own product;
- talk to the WalkScape team before any commercial use.

## License

[MIT](LICENSE). The license covers this package's code, not WalkScape's game data or icons.
