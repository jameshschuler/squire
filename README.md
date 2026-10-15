# Squire

A WalkScape companion app. Right now it's a recipe book: search any recipe and see its materials, outputs and where to craft it.

| Package        | What it is                                             |
| -------------- | ------------------------------------------------------ |
| `packages/sdk` | Client for the WalkScape Data API, plus recipe helpers |
| `apps/api`     | Fastify server. Holds the API key and caches game data |
| `apps/web`     | React PWA                                              |

## Run it

You need Node 20+, pnpm and a WalkScape Data API key (ask in the "Walkscape Data API" thread on the WalkScape Discord).

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

Set `WALKSCAPE_API_KEY` in your shell to also run the live API test in `packages/sdk`.

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

Game data and icons © WalkScape.
