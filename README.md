# Levee 🌊

> An **autonomous AI agent on Solana (devnet)** that monitors landslide risk for
> a region and **auto-disburses USDC relief** to registered community wallets the
> moment risk crosses a threshold **committed on-chain**. Every decision and
> every payout is written on-chain and **publicly auditable**.

Levee turns disaster relief into code: a calibrated risk model produces a
landslide probability, a Switchboard oracle carries it on-chain, and a Solana
program releases pre-funded USDC **only** when the on-chain rules say so — no
human in the critical path, but every action transparent and bounded.

---

## How it works

```
                         ┌─────────────┐
 rainfall / soil / ────▶ │  model/     │  P(landslide) + factors  (FastAPI /risk)
 terrain features        │ LightGBM    │
                         └──────┬──────┘
                                │ /risk?region_id=N
                         ┌──────▼──────┐
                         │  oracle/    │  Switchboard On-Demand pull feed
                         │ (job→chain) │  (maxStaleness / minSamples)
                         └──────┬──────┘
                                │ on-chain feed value
   ┌──────────┐  reads   ┌──────▼──────────────────────────┐
   │ agent/   │ ───────▶ │  program/ (Anchor)              │
   │ Agent Kit│ execute_ │  Vault · RegionConfig (🔒thr)   │
   │ V2+Privy │ payout / │  BeneficiaryRegistry            │
   │  (HITL)  │ log_dec. │  execute_payout · log_decision  │
   └──────────┘          └──────┬──────────────────────────┘
                                │ USDC transfers + DecisionLog
                         ┌──────▼──────┐
                         │ frontend/   │  live dashboard + audit trail
                         └─────────────┘
```

**Hard safety invariants** (enforced in the agent *and* re-checked on-chain):

1. Only the **on-chain threshold** can authorize a payout — the agent never invents one.
2. **Missing or stale** oracle data ⇒ **no trigger**.
3. Funds go **only** to addresses in the on-chain beneficiary registry.
4. Region **cap** and **cooldown** are enforced on-chain.
5. Large payouts require **human-in-the-loop** approval.
6. When in doubt, **under-trigger rather than over-pay**.

---

## Monorepo layout

| Path        | Stack                         | What                                                     |
|-------------|-------------------------------|---------------------------------------------------------|
| `program/`  | Anchor / Rust                 | Vault, RegionConfig, BeneficiaryRegistry, `execute_payout`, `log_decision` + tests. |
| `model/`    | Python · LightGBM · FastAPI   | Risk model + `/risk` API + Campania rainfall replay.    |
| `oracle/`   | TS · Switchboard On-Demand    | Custom feed (pulls `/risk`) + on-demand push scripts.   |
| `agent/`    | TS · Solana Agent Kit V2 · Privy | Autonomous loop + admin CLI.                         |
| `frontend/` | Next.js (TS)                  | English dashboard: live risk, on-chain policy, payouts. |
| `shared/`   | TS + JSON                     | `regions.json` — single source of truth.                |
| `scripts/`  | bash                          | Devnet setup + demo orchestration.                      |

Each module has its own `README.md` with details.

---

## Quick start (local, no chain needed)

Preview the model + dashboard end-to-end without deploying anything:

```bash
# 1) Risk model API
cd model
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000

# 2) Campania (Sarno 1998) rainfall replay — watch risk cross the threshold
python scripts/replay_campania.py --api-url http://localhost:8000

# 3) Dashboard (new terminal, from repo root)
npm install
cd frontend && npm run dev          # → http://localhost:3000
```

The agent runs in `AGENT_DRY_RUN=true` by default, so it prints exactly what it
*would* pay without sending transactions.

---

## Full devnet deployment

Prereqs: [Solana CLI](https://docs.anza.xyz/cli/install), [Anchor](https://www.anchor-lang.com/docs/installation) 0.30.1 (via `avm`), Node 18+, Python 3.10+, a funded devnet keypair, a [Privy](https://dashboard.privy.io) app (optional — local keypair fallback works).

```bash
cp .env.example .env        # fill in RPC, keypair path, Privy, etc.
chmod +x scripts/*.sh

# Guided end-to-end setup (airdrop → deploy → feed → init → fund):
./scripts/setup-devnet.sh
```

Or step by step:

```bash
# Program
cd program && anchor build && anchor keys sync
anchor deploy --provider.cluster devnet     # put the id in .env: LEVEE_PROGRAM_ID

# Oracle feed (writes oracle/feeds/region-1.json)
cd ../oracle && npx ts-node src/createFeed.ts --region 1   # → SWITCHBOARD_FEED_PUBKEY

# Vault + region + beneficiaries  (admin CLI)
cd ../agent
npx ts-node src/admin.ts init-vault
npx ts-node src/admin.ts init-region 1
npx ts-node src/admin.ts init-registry 1
npx ts-node src/admin.ts add-beneficiary 1 <ownerPubkey>
npx ts-node src/admin.ts deposit 5000 <depositorTokenAccount>

# Run it
npx ts-node src/push.ts --region 1 --watch 30   # (oracle/) keep the feed fresh
AGENT_DRY_RUN=false npm run start                # (agent/) the autonomous loop
```

---

## Demo

```bash
./scripts/run-demo.sh
```

Starts the model, replays the **5–6 May 1998 Sarno (Campania)** rainfall buildup,
and runs one agent pass. In the replay, `P(landslide)` climbs as soils saturate
and the convective burst hits, crossing the on-chain threshold — the point where
Levee would call `execute_payout`. The dashboard shows the live risk, the locked
threshold, the vault, and the on-chain decision/payout history.

---

## Testing

```bash
# On-chain program (4 required scenarios + stale-oracle), on a local validator:
cd program && anchor test -- --features mock-oracle
#   1 normal trigger · 2 below threshold · 3 cooldown · 4 cap · 5 stale oracle

# Host-only Rust sanity check (no validator):
cargo check -p levee --features mock-oracle && cargo check -p levee

# TypeScript:
npm install && npm -w @levee/oracle run typecheck \
            && npm -w @levee/agent run typecheck \
            && npm -w @levee/frontend run typecheck
```

---

## Security & limitations (devnet)

- **One oracle = single point of failure.** Production must require agreement
  across **multiple independent oracles** before any payout (see `oracle/README.md`).
- The model trains on a **synthetic, physically-motivated** catalogue; swap in a
  curated historical landslide dataset for real use.
- `MockOracle` / `set_mock_oracle` exist for tests — delete them for a hardened deploy.
- All secrets live in `.env` (never committed). The program id in `declare_id!`
  is a placeholder — run `anchor keys sync` after the first build.

## License

MIT
