# Levee frontend (Next.js dashboard)

English-language dashboard for Levee. It shows, per monitored region:

- **live risk** (from the model `/risk`) with the dominant contributing factors;
- the **on-chain threshold** (🔒 immutable), payout, cap usage, cooldown, and
  last-trigger time read straight from the Levee program;
- **vault balance**, beneficiary count, and a **status** badge
  (MONITORING / COOLDOWN / TRIGGER CONDITION MET);
- the **auditable decision & payout history** (on-chain `DecisionLog` records).

Everything is best-effort: if the program isn't deployed yet or the model is
offline, cards degrade gracefully (show config defaults / "no data") instead of
breaking.

## Architecture

```
browser ──poll /api/state (15s)──▶ Next.js route ──▶ model /risk  (live risk)
                                                  └─▶ Solana RPC  (on-chain policy,
                                                                   vault, decisions)
```

All chain/model access happens **server-side** in `app/api/state/route.ts`
(`lib/chain.ts`, `lib/model.ts`); the browser only sees aggregated JSON.

## Run

```bash
cd frontend
npm install            # (or from repo root — workspaces)
npm run build && npm start   # or: npm run dev

# It reads RPC_URL, MODEL_API_URL, LEVEE_PROGRAM_ID and the program IDL
# (program/target/idl/levee.json) from the repo-root .env.
```

Open http://localhost:3000. Run the model API (`model/`) for live risk; deploy
the program + initialize a region for on-chain data.
