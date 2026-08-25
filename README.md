# OmniRoute

Unified AI router — one OpenAI-compatible endpoint, hundreds of providers, auto-fallback.

```
backend/    headless API server (routing, keys, fallback, metrics)
frontend/   SPA dashboard (static build, ~62KB gzipped)
docs/       documentation
```

## Run

```bash
cp backend/.env.example .env   # set JWT_SECRET
docker compose up --build      # backend :20128 · frontend :8080
```

## Develop

```bash
npm install
npm run dev -w backend     # API at http://localhost:20128
npm run dev -w frontend    # SPA at http://localhost:8080 (proxies /api, /v1)
```

Auth: `POST /api/auth/token` with the management password → Bearer JWT.
Proxy endpoints accept standard `Authorization: Bearer <api-key>`.

MIT licensed.
