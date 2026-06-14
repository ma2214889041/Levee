# Deploy

Live URLs (Cloudflare Pages):

| App | URL | Source |
|-----|-----|--------|
| **Landing + dashboard** | https://levee-600.pages.dev | `frontend/` (Next.js static export) |
| **Confidential Relief (0xbow)** | https://levee-privacy.pages.dev | `privacy/` (Vite) |

Both are static deployments on Cloudflare Pages (account `b407b9a9…`). The
landing is fully live; the dashboard on Pages shows a clearly-labelled
**preview-data** snapshot (`demo: true`) because Pages can't run the live
server-side `/api/state` route (Solana RPC + the model API). For the live
dashboard, run the frontend on a Node host (see "Frontend (live/Node)" below).

## Prereqs

```bash
# Cloudflare Pages auth (token stored in macOS keychain as `erp-cf-pages`)
export CLOUDFLARE_API_TOKEN="$(security find-generic-password -s erp-cf-pages -w)"
export CLOUDFLARE_ACCOUNT_ID="b407b9a9f1270b220d0218bd64282d7d"
```

## Privacy app → Pages (`levee-privacy`)

```bash
cd privacy && npm install && npm run build      # → privacy/dist
npx wrangler pages deploy dist --project-name=levee-privacy --branch=main --commit-dirty=true
```

## Frontend (static) → Pages (`levee`)

```bash
cd frontend && npm install
npm run build:pages                              # NEXT_STATIC=1 next build → frontend/out
npx wrangler pages deploy out --project-name=levee --branch=main --commit-dirty=true
```

`build:pages` sets `NEXT_STATIC=1`, which makes `next.config.mjs` emit a static
export and makes `app/api/state/route.ts` prerender the demo snapshot
(`lib/demoState.ts`).

### AI on the edge (Cloudflare Pages Function)

`frontend/public/_worker.js` is an advanced-mode Pages Function (copied to
`out/_worker.js` by the export) that serves the **risk model on Cloudflare's
edge** — a JS port of `model/app` (calibrated logistic model + alert bands + grid
exposure + contributing factors). Deployed automatically with the frontend.

```
GET /api/health
GET /api/regions
GET /api/risk?region_id=1[&rain_72h=..&rain_24h=..&rain_3h=..&rain_intensity=..&rain_1h=..]
GET /api/alerts
```

Live e.g. https://levee-600.pages.dev/api/risk?region_id=1 . Per-region "current
conditions" are an illustrative snapshot (no live weather feed on the edge) and
overridable via query params; the full Python service (`model/`) remains the
source of truth for training + the live data pipeline.

## Frontend (live / Node)

For the **real** dashboard (live Solana reads + model risk), run the unmodified
Next app on any Node host (Render / Fly / Railway / a VPS):

```bash
cd frontend && npm install && npm run build && npm run start   # → :3000, live /api/state
```

Requires the model API reachable (`MODEL_API_URL`) and `RPC_URL` /
`LEVEE_PROGRAM_ID` set for on-chain reads.

## Notes

- Custom domains (e.g. a `gopromp.com` subdomain) are **not** attached — add via
  the Cloudflare dashboard or `wrangler pages deployment` if desired.
- `.npmrc` (0xbow token) and `.env*` are git-ignored and never deployed.
