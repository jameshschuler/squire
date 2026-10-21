# Squire

A WalkScape companion app, live at [wssquire.app](https://wssquire.app). Search recipes, materials, food and loot to see what they're made from, where to find them and what their effects do. It installs as an app on your phone and works offline.

| Package                | What it is                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `packages/data-client` | Typed client for the WalkScape Data API, published as `@walkscape-community/data-api-client` |
| `apps/api`             | Fastify server. Holds the API key, builds and caches the recipe book                         |
| `apps/web`             | React PWA                                                                                    |

## Run it

You need Node 24 (see `.node-version`), pnpm and a WalkScape Data API key (ask in the "Walkscape Data API" thread on the WalkScape Discord).

```sh
cp .env.example .env   # then add your key
pnpm install
pnpm dev               # API on :3000, web on :5173
```

Other commands: `pnpm test`, `pnpm typecheck`, `pnpm build`.

## Config

API (`.env`):

| Variable            | Default |                                                                                                                                              |
| ------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `WALKSCAPE_API_KEY` |         | Required                                                                                                                                     |
| `WALKSCAPE_ENV`     | `prod`  | `prod` or `dev`                                                                                                                              |
| `PORT`              | `3000`  |                                                                                                                                              |
| `LOG_LEVEL`         | `info`  | `debug`, `info`, `warn`, `error`, `silent`                                                                                                   |
| `CORS_ORIGINS`      | none    | Comma-separated origins allowed to call the API, e.g. `https://squire.example`. Only needed when the web app is hosted on a different domain |

Web: set `VITE_API_URL` at build time when the API is on a different domain. Leave it unset to call `/api` on the same domain.

Set `WALKSCAPE_API_KEY` in your shell to also run the live API tests (`*.live.test.ts`).

## Deploy (Render)

`render.yaml` is a Render Blueprint with two services:

- `squire-api`: Node web service running `apps/api`
- `squire-web`: static site serving `apps/web/dist`

In Render, pick **New → Blueprint** and point it at this repo. Render asks for the values it can't fill in:

| Service      | Variable            | Value                                                     |
| ------------ | ------------------- | --------------------------------------------------------- |
| `squire-api` | `WALKSCAPE_API_KEY` | Your Data API key                                         |
| `squire-api` | `CORS_ORIGINS`      | The web app's URL, e.g. `https://squire-web.onrender.com` |
| `squire-web` | `VITE_API_URL`      | The API's URL, e.g. `https://squire-api.onrender.com`     |

You only know the URLs after the first deploy, so set `CORS_ORIGINS` and `VITE_API_URL` then and redeploy both. `VITE_API_URL` is baked in at build time.

The API is on the free plan, which sleeps after 15 minutes idle. The first request after that takes a while: Render wakes the service, then the API loads game data (about 4 seconds).

Want to help? See [CONTRIBUTING.md](CONTRIBUTING.md).

Code is [MIT licensed](LICENSE). Game data and icons © WalkScape, not covered by that license.
