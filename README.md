# OmniRoute

Unified AI router — one OpenAI-compatible endpoint, hundreds of providers, auto-fallback.

```
backend/    API server + the original Next.js dashboard UI (routing, keys, fallback, metrics)
frontend/   optional lightweight SPA dashboard (static build)
docs/       documentation
```

## Run

```bash
cp backend/.env.example .env   # set JWT_SECRET
docker compose up --build      # backend :20128 · frontend :8080
```

## Develop

`npm run dev` / `npm run frontend` serve the **original OmniRoute dashboard**
(the Next.js app in `backend/src/app`), proxying every API plane to the
standalone Express server — two processes, one origin:

```bash
npm install
npm run dev
# Express API  → http://localhost:3001
# Dashboard UI → http://localhost:5177  (UI only; /api,/v1,… proxied to :3001)
```

- `npm run backend` — standalone Express server only (`PORT=3001`)
- `npm run frontend` — the original dashboard, wired via `OMNIROUTE_UI_PROXY=http://localhost:3001`
- `npm run spa` — optional lightweight Vite SPA alternative (`frontend/`, proxies `/api`, `/v1`)

Auth: sign in on `/login` with the management password (`INITIAL_PASSWORD`,
default `CHANGEME`) — session cookie works through the proxy. Headless clients
can `POST /api/auth/token` for a Bearer JWT.
Proxy endpoints accept standard `Authorization: Bearer <api-key>`.

MIT licensed.
