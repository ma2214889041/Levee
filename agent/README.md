# Levee agent (Solana Agent Kit V2 + Privy)

The autonomous agent. Each cycle, per region, it:

1. pulls risk from the model (`GET /risk`) — **missing data ⇒ no trigger**;
2. reads the **authoritative on-chain `RegionConfig`** (threshold, cap, cooldown,
   oracle feed) — it never invents a threshold;
3. checks every gate off-chain (mirror of the program, fail-safe);
4. if a payout is warranted: **human-in-the-loop** approval for large amounts →
   refresh the Switchboard feed → `execute_payout` → `log_decision`;
5. otherwise records `log_decision(triggered=false)`.

## Wallet

- **Production:** Privy embedded **server wallet** (`@privy-io/server-auth`) —
  the agent never holds raw keys; Privy signs on request.
- **Fallback:** a local keypair (`ADMIN_KEYPAIR_PATH`) for devnet bring-up / CI,
  used automatically when `PRIVY_*` env is absent.

Both implement Agent Kit V2's `BaseWallet`, so the same wallet drives the
`SolanaAgentKit` handle and the Anchor provider.

## Hard safety invariants (enforced here AND on-chain)

| Invariant                                   | Where                                  |
|---------------------------------------------|----------------------------------------|
| Only the on-chain threshold triggers payout | agent compares to `region.thresholdBps`; program re-checks vs oracle |
| Missing / stale data ⇒ no trigger           | agent skips on `/risk` failure; program rejects stale feed |
| Pay only registered beneficiaries           | agent reads on-chain registry; program validates each token-account owner |
| Never exceed cap / cooldown                 | agent pre-checks; program enforces     |
| Large payouts need a human                  | `HITL_APPROVAL_THRESHOLD_USDC` (deny if non-interactive) |
| Prefer under-trigger over over-pay          | any uncertainty ⇒ skip                 |

## Run

```bash
cd agent
npm install            # (or from repo root — workspaces)
npm run typecheck

# Requires: LEVEE_PROGRAM_ID + the IDL (program/target/idl/levee.json after
# `anchor build`), a funded vault + initialized region/registry, and either
# PRIVY_* env or ADMIN_KEYPAIR_PATH.

npm run once           # single evaluation pass (AGENT_DRY_RUN=true by default)
npm run start          # continuous loop (AGENT_POLL_INTERVAL_SECONDS)
```

Set `AGENT_DRY_RUN=false` to actually send transactions. With dry-run on, the
agent prints exactly what it *would* do and sends nothing.
