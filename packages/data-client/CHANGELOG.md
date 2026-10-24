# Changelog

## Unreleased

- `client.items.ids(ids, to)` converts item ids to the game's internal ids (used in gear-set codes) and back, through `POST /items/ids`. The endpoint isn't in the API's OpenAPI spec yet, so its types are written by hand.

## 0.0.1

First release.

- A client for every resource in the WalkScape Data API, one namespace each: `client.items`, `client.recipes`, `client.lootTables` and the other 21. Each has `list()`, `get(id)` and `loadAll()`, plus `search(filters)` where the API has filters.
- Types for every response and search filter, generated from the API's OpenAPI spec.
- `loadAll()` loads a whole resource in a few requests, using bulk searches and then fetching anything they missed.
- `version()`, `health()`, `maps()`, `map(name)`, `icon(path)` and `icons(paths)`.
- JSON responses are cached by ETag, and rate-limited (429) and server (5xx) responses are retried.
