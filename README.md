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

Game data and icons © WalkScape.
