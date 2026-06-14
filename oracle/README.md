# Levee oracle (Switchboard On-Demand)

Bridges the off-chain risk model to the chain. A custom **On-Demand pull feed**
runs a job that calls the model's `/risk?region_id=...` endpoint, parses
`risk_score` (a probability in `[0,1]`), and makes it readable on-chain. The
Levee program reads this feed inside `execute_payout` and **rejects stale data**.

## Files

| File                | Purpose                                                        |
|---------------------|---------------------------------------------------------------|
| `src/jobs.ts`       | The `OracleJob` (httpTask `/risk` → jsonParseTask `$.risk_score`). |
| `src/createFeed.ts` | Create the devnet pull feed (maxStaleness / minSamples).      |
| `src/push.ts`       | On-demand push/crank: fetch signed responses, submit update.  |
| `src/config.ts`     | Env + shared region registry + keypair loading.               |
| `feeds/`            | Records created feed pubkeys (`region-<id>.json`).            |

## Usage (devnet)

```bash
cd oracle
npm install          # (or from repo root — workspaces)
npm run typecheck

# 1) Create the feed for a region (writes feeds/region-1.json):
ts-node src/createFeed.ts --region 1
#    → copy the printed pubkey into .env (SWITCHBOARD_FEED_PUBKEY) and use it as
#      the region's oracle_feed in initialize_region.

# 2) Push a fresh value on demand (once, or watch on an interval):
ts-node src/push.ts --region 1
ts-node src/push.ts --region 1 --watch 30
```

## Freshness config

- `ORACLE_MAX_STALENESS_SECONDS` → converted to **slots** for the feed config,
  and **independently enforced in seconds** by the on-chain program. Belt and
  suspenders: a stale feed can never trigger a payout.
- `ORACLE_MIN_SAMPLES` → `minResponses` / `minSampleSize` / `numSignatures`.

## ⚠️ Production hardening

A single feed is a **single point of failure / forgery**. For a real deployment:

- Provision **multiple independent feeds** (distinct oracle operators) and, ideally,
  a **second oracle provider** (e.g. Pyth) as a cross-check.
- Require **agreement / a median** across them before triggering a payout.
- Tighten `maxVariance`, raise `minSampleSize`, and shorten `maxStaleness`.

This demo provisions one feed for end-to-end clarity.
