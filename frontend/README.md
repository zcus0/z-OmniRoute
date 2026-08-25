# /frontend — OmniRoute SPA Dashboard

Lightweight static client for the OmniRoute backend API. Vite + React, no UI
framework — production bundle ≈ **62KB gzipped** total.

```bash
npm install
npm run dev        # http://localhost:8080, proxies /api + /v1 → localhost:20128
npm run build      # pure static output in dist/
```

All data via `fetch` with `Authorization: Bearer <jwt>` (`src/api/client.ts`).
Token obtained from `POST /api/auth/token` on the backend.

## Pages (fase 1)

| Hash | Page | Backend |
| --- | --- | --- |
| `#keys` | Registered API keys (read) | `GET /v1/registered-keys` |
| `#models` | Model catalog | `GET /v1/models` |
| `#health` | Provider health | `GET /api/monitoring/health` |

Deploy: any static host. Point at backend with `VITE_API_BASE=https://api.example.com`
(baked at build time) or serve same-origin behind one reverse proxy.
