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

| Function                                   | What it does                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadGameData(client)`                     | Loads every recipe, item (in full), skill, crafting service, location, faction, activity, loot table and shop: about 60 requests, a couple of seconds.                                  |
| `buildRecipeBook(data)`                    | Display-ready recipes (names, icons and keywords resolved, material alternatives grouped, the service needed and where to find it), sorted by level, plus `sources` for every material. |
| `searchRecipes(recipes, query, { skill })` | Matches recipe names, outputs and materials. Best matches first.                                                                                                                        |
| `recipesMaking(recipes, itemId)`           | Recipes that produce an item.                                                                                                                                                           |
| `recipesUsing(recipes, itemId)`            | Recipes that take an item as a material.                                                                                                                                                |
| `findItem(recipes, itemId)`                | An item's name, icon and in-game keywords.                                                                                                                                              |
| `recipeBookIcons(book)`                    | Every icon path the book shows (recipes, materials, outputs and sources), each once.                                                                                                    |
| `lowestSkillLevels(skills)`                | The lowest level needed per skill, lowest first.                                                                                                                                        |
| `sourceKey(source)`                        | A stable key for one source of an item, e.g. for list keys or de-duplication.                                                                                                           |

A recipe's service counts higher tiers too: an advanced kitchen can cook basic kitchen recipes. Each location carries its region and the lowest tier it has that qualifies, so you can mark the ones that only have a better service.

### Where to get items

`book.sources` lists every way to get each recipe material, keyed by item id. Each source has a `kind`:

| Kind       | Fields                                                                                                             | Example                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `activity` | `skills`, `lootType` (`main` loot, a `secondary` roll, or a special table such as `gem`), `locations` with regions | Bones from _Wolf hunting_ at Sanguine Hills |
| `chest`    | `skills`: the lowest levels of the activities that drop the chest                                                  | Log splitter from the _Woodcutting chest_   |
| `shop`     | `locations` when the game data links the shop to one (often it doesn't)                                            | Simple pan from _granfiddich tool stall_    |

Sources are ordered activities (main loot first, then by level), then shops, then chests. Shop names come through as the API gives them, in lowercase.

```ts
book.sources.bones?.map((s) => s.name);
// ["Wolf hunting", "Lizard hunting", "Deer hunting", ...]
```

`book.schema` is `RECIPE_BOOK_SCHEMA`. It changes whenever the book's shape does, so it's safe to include in cache keys.

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
