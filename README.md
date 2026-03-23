# Zoom MCP Proxy — TalentXM

Lightweight proxy that adds the required `x-api-key` header when Claude talks to Composio's Zoom MCP server.

## Why This Exists
Claude.ai's web connector only accepts a URL — it can't send custom headers.
Composio requires `x-api-key` in headers (not URL params).
This proxy sits in the middle and injects the key automatically.

## Deploy to Railway

1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Select the repo
4. Add these Environment Variables in Railway dashboard:
   - `COMPOSIO_API_KEY` = ak_oCPZdThrl0GQ64iEtUZT
   - `COMPOSIO_USER_ID` = pg-test-f05e8681-b134-4d43-8758-e034072ba59a
   - `COMPOSIO_SERVER_ID` = d18a3cd4-6152-44c0-ab8c-112c07a7bb3f
5. Railway auto-assigns a URL like: https://zoom-proxy-talentxm.up.railway.app

## Add to Claude.ai
Settings → Connectors → Edit Zoom_TalentXM → set URL to:
```
https://YOUR-RAILWAY-URL.up.railway.app/sse
```

## Endpoints
- `GET /health` — health check
- `GET /sse` — SSE stream (proxied to Composio with auth)
- `POST /message` — MCP messages (proxied to Composio with auth)
