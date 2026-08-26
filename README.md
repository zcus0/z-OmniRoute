# OmniRoute

Unified AI router — one OpenAI-compatible endpoint, hundreds of providers, auto-fallback.

```
backend/    API server + the original Next.js dashboard UI (routing, keys, fallback, metrics)
docs/       documentation
```

## Run

```bash
cp backend/.env.example .env   # set JWT_SECRET
docker compose up --build      # http://localhost:20128
```

## Develop

`npm run dev` serves the **full OmniRoute app** — the Express API and the
original Next.js dashboard (`backend/src/app`) on a single origin:

```bash
npm install
npm run dev
# Dashboard + API → http://localhost:20128
```

Auth: sign in on `/login` with the management password (`INITIAL_PASSWORD`,
default `CHANGEME`) — session cookie works through the proxy. Headless clients
can `POST /api/auth/token` for a Bearer JWT.
Proxy endpoints accept standard `Authorization: Bearer <api-key>`.

MIT licensed.
