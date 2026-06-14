# Levee 🌊

> Autonomous AI agent on **Solana (devnet)** that monitors landslide risk for a
> region and **auto-disburses USDC relief** to registered community wallets when
> an **on-chain risk threshold** is crossed. Every decision and every payout is
> written on-chain and publicly auditable.

**Scaffolding in progress** — see [`docs / README` at the bottom of the repo](#)
for full run/deploy instructions (added in the final milestone).

## Monorepo layout

| Path        | What                                                                 |
|-------------|----------------------------------------------------------------------|
| `program/`  | Anchor/Rust on-chain program (Vault, RegionConfig, BeneficiaryRegistry, `execute_payout`, `log_decision`). |
| `model/`    | Python risk model (LightGBM → calibrated logistic regression fallback) + FastAPI `/risk` + Campania rainfall replay. |
| `oracle/`   | Switchboard On-Demand custom feed config + on-demand push scripts.   |
| `agent/`    | TypeScript autonomous agent (Solana Agent Kit V2 + Privy wallet).    |
| `shared/`   | Shared types, constants and the canonical `regions.json`.            |
| `scripts/`  | Devnet helper scripts (airdrop, init region, fund vault, e2e demo).  |

## Hard safety invariants (enforced in code)

1. Only the **on-chain** threshold triggers payouts — the agent never invents one.
2. **Missing or stale** oracle data ⇒ **no trigger**.
3. Payments go **only** to addresses in the on-chain beneficiary registry.
4. Region **cap** and **cooldown** are enforced on-chain and re-checked off-chain.
5. When in doubt, **under-trigger rather than over-pay**.
