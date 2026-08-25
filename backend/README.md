# /backend — Headless API Server

API-only OmniRoute image. Built with `OMNIROUTE_BUILD_BACKEND_ONLY=1`: all
dashboard pages are stubbed before `next build`, so the output is a pure API
server (chat/completions/embeddings proxy, management API, MCP, A2A) with no
UI rendering.

```bash
docker build -t omniroute-backend -f backend/Dockerfile .
docker run -p 20128:20128 -e JWT_SECRET=$(openssl rand -base64 48) -v omniroute-data:/app/data omniroute-backend
```

Or via compose: `docker compose -f docker-compose.split.yml up --build`.

## Key endpoints

| Area | Endpoint | Auth |
| --- | --- | --- |
| Token login (SPA) | `POST /api/auth/token` `{password}` → `{token}` | public + brute-force guard |
| Proxy LLM | `/v1/chat/completions`, `/v1/completions`, `/v1/responses`, `/v1/messages`, `/v1/embeddings` | Bearer API key |
| Models | `GET /v1/models` | Bearer |
| Registered keys | `GET/POST /v1/registered-keys` | dashboard session |
| Health | `GET /api/monitoring/health` | public |

Dashboard session = `auth_token` cookie **or** `Authorization: Bearer <jwt>`
(both verified by `isDashboardSessionAuthenticated`).

CORS for cross-origin SPA: set `CORS_ALLOWED_ORIGINS=https://ui.example.com`.
