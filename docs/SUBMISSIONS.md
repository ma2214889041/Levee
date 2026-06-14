# Levee — ctrl/shift 2026 submission packet

One project, submitted to several tracks. This is the judge-ready map: for each
track, the **one-line pitch**, the **exact artifact** in this repo that satisfies
it, and **how to see it**. Nothing here claims more than the code does — where a
piece is a devnet/mock prototype, it says so.

> **TL;DR** — Levee is an autonomous AI agent on Solana that monitors landslide
> risk and auto-disburses USDC relief the moment risk crosses an **on-chain**
> threshold, with every decision and payout publicly auditable — plus a private,
> compliant last-mile on 0xbow Privacy Pools v2.

| # | Track | What proves it | Path |
|---|-------|----------------|------|
| 1 | **Main Track** (AI × Web3) | Autonomous agent that coordinates value under on-chain rules; polished end-to-end product | whole repo + `frontend/` + `privacy/` |
| 2 | **Terna** (landslide risk → grid) | Risk model + grid-asset exposure + multi-tier early warning + data methodology | `model/`, `docs/DATA.md`, `frontend` alert banner |
| 3 | **Blockchain for Good** | Transparent, auditable, dignity-preserving disaster relief | `program/` DecisionLog, `frontend` audit trail, `privacy/` |
| 4 | **Solana** (AI agents) | Agent Kit V2 + Privy autonomous loop executing on an Anchor program | `agent/`, `program/` |
| 5 | **SiteLab** (best landing page) | Web3 Concept marketing site | `frontend/` route `/` |
| 6 | **Mood** (innovative AI use case) | Calibrated risk model → oracle → bounded autonomous payout | `model/` → `oracle/` → `program/` |
| 7 | **0xbow** (Privacy Pools v2 UI) | Confidential Relief UI: shield → private split → Proof of Association | `privacy/` |

---

## 1 · Main Track — AI × Web3

**Pitch:** Disaster relief that *decides, pays, and proves itself* — an autonomous
agent whose authority to move money is an immutable on-chain rule, not a human or
a black-box model.

**Why it fits the rubric**
- **Bold** — removes the human from the critical path of moving relief money, and
  makes that safe by bounding the agent with on-chain invariants.
- **Functional** — runs end to end today: risk model → oracle → Anchor program →
  agent → dashboard, with a one-command demo.
- **Useful** — turns an existing forecast into money on the ground in one tx.
- **Beautifully executed** — a cohesive Web3 product (landing + dashboard +
  confidential-relief app) sharing one design language.

**See it:** `./scripts/run-demo.sh` (Sarno 1998 replay), then the landing `/` and
dashboard `/dashboard`. Trust model in [`SECURITY.md`](../SECURITY.md).

## 2 · Terna — landslide risk to the National Transmission Grid

**Pitch:** A data pipeline that turns climate + terrain + infrastructure data into
**multi-tier early warnings** (WATCH / WARNING / CRITICAL) for grid assets, where
CRITICAL is the same band that arms an on-chain relief payout.

**What proves it**
- `model/` — calibrated LightGBM exposing `GET /risk` with `alert_level`,
  `grid_exposure_score`, `affected_assets`, and `GET /alerts` (grid-operator view).
- Optional `ALERT_WEBHOOK_URL` push for operator integration.
- [`docs/DATA.md`](DATA.md) — data assumptions, methodology, risk indicators, and
  next steps for validation (exactly the deliverable Terna asks for).
- `frontend/` early-warning banner + grid-asset exposure bars.

**See it:** `cd model && uvicorn app.main:app --port 8000`, then
`python scripts/replay_campania.py` and watch the tiers escalate.

> Scope note: trains on a synthetic, physically-motivated catalogue — swap in a
> curated historical dataset for production. Stated plainly in the README.

## 3 · Blockchain for Good Alliance

**Pitch:** Relief that is transparent and accountable **by construction** — the
payout rule is public and re-computable, every disbursement is on-chain, and
recipients keep their dignity via private disbursement.

**What proves it**
- **Transparency / accountability:** on-chain `RegionConfig` threshold, `Vault`,
  `DecisionLog`, and the dashboard audit trail (every payout links to an explorer).
- **Social impact:** faster, fairer relief to climate-threatened communities.
- **Interoperability:** model/oracle/agent/program/frontend are cleanly separated.
- **Dignity:** `privacy/` lets aid arrive without "I received aid" being publicly
  tied to a wallet — while still provably clean funds.

## 4 · Solana — AI Agents on Solana

**Pitch:** An autonomous on-chain agent (Solana Agent Kit V2 + Privy) that
transacts **only** within on-chain rules.

**What proves it**
- `agent/` — autonomous loop + admin CLI; reads the oracle feed, calls
  `execute_payout` / `log_decision`, HITL for large amounts, fails closed on stale
  data, `AGENT_DRY_RUN` by default.
- `program/` — Anchor program (Vault, RegionConfig, BeneficiaryRegistry,
  `execute_payout`, `log_decision`) with tests for the required scenarios.

**See it:** `program/` → `anchor test -- --features mock-oracle` (normal trigger /
below-threshold / cooldown / cap / stale-oracle). Devnet steps in the root README.

## 5 · SiteLab — best landing page / website

**Pitch:** A premium Web3 landing page that makes an autonomous-relief protocol
feel inevitable.

**What proves it**
- `frontend/` route `/` — immersive deep-space canvas, **generative topographic
  contour terrain** (marching squares), glassmorphism, cyan→violet gradient
  headline, live risk card + gauge, amber "aid delivered" accents, and a scrolling
  on-chain payout ticker. Bilingual (EN + 中文). Responsive + reduced-motion aware.
- Design language is shared with the `privacy/` app for a coherent product feel.

**See it:** `cd frontend && npm run dev` → `http://localhost:3000`.

## 6 · Mood Global Services — best innovative AI use case

**Pitch:** AI where being wrong is expensive, made safe by bounding it on-chain —
a calibrated risk model whose output can move real money, but only within rules a
human can audit.

**What proves it:** the model → oracle → program → agent chain. The "innovation"
is not the model alone but the **trust envelope** around an autonomous AI that
disburses funds: thresholds locked on-chain, stale data fails closed, caps and
cooldowns enforced, large payouts gated by humans.

## 7 · 0xbow — UI on Privacy Pools v2

**Pitch:** The private, compliant **last mile** of relief — privately split funds
to many beneficiaries (payroll / tx-splitter pattern) while each can prove their
funds are clean.

**What proves it** (`privacy/`)
- **Shield → Private split → Proof of Association** UI on **0xbow Privacy Pools
  v2** (Sepolia), in the Web3 Concept design.
- Swappable adapter: a working in-memory **mock** (default, clearly labelled) and
  a **real-SDK adapter** (`@0xbow-io/privacy-pools-v2-sdk`) behind
  `VITE_USE_REAL_SDK=true`.
- Mandatory dev requirement met: [`privacy/INSTALL.md`](../privacy/INSTALL.md)
  (note the repo-root `.npmrc` workspace caveat documented there).

**See it:** `cd privacy && npm run dev` → `http://localhost:5173` (mock mode).

> Status: with a valid GitHub Packages token, flip `VITE_USE_REAL_SDK=true` to use
> the real SDK; the hackathon token currently returns `401`, so the shipped demo
> runs in mock mode (full UX, no real privacy).

---

## Also-fits (secondary)

- **Sentry** — optional monitoring across model + agent + frontend, active only
  when `SENTRY_DSN` is set.
- **Dedaub** — auditable Anchor program + [`SECURITY.md`](../SECURITY.md) threat
  model and on-chain invariants.

## Demo cheat-sheet

```bash
# 1) Risk model + Campania replay (Terna / Mood)
cd model && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
uvicorn app.main:app --port 8000 &
python scripts/replay_campania.py --api-url http://localhost:8000

# 2) Landing + dashboard (Main / SiteLab / BGA)
npm install && cd frontend && npm run dev        # http://localhost:3000

# 3) Confidential Relief UI (0xbow)
cd privacy && npm install && npm run dev          # http://localhost:5173 (mock)

# 4) On-chain program tests (Solana / Dedaub)
cd program && anchor test -- --features mock-oracle
```
