# Levee — security & threat model

Levee moves real value (USDC) autonomously, so safety is the primary design
constraint. The guiding principle is **fail closed**: when anything is uncertain,
no funds move.

## Trust model

- **Authoritative state is on-chain.** Threshold, cap, cooldown, beneficiaries
  and the oracle feed live in the program. Off-chain components (model, agent,
  frontend) are *advisory*; they can never widen what the program permits.
- **No discretionary human or LLM in the money path.** The payout decision is a
  deterministic comparison enforced by the program. An LLM is never allowed to
  authorize a transfer (non-determinism / prompt-injection risk).
- **Permissionless verification.** Anyone can recompute every decision from the
  on-chain `DecisionLog`, the feed value, and the region config.

## Core invariants (enforced in `program/`)

1. **Threshold gate** — a payout requires `oracle_risk_bps ≥ region.threshold_bps`.
   The threshold is set once and **locked** (`threshold_locked`); no instruction
   mutates it.
2. **Freshness gate** — the oracle result must be within `max_staleness_seconds`
   and meet `min_oracle_samples`, else `StaleOracle`. Enforced **on-chain in
   seconds** *and* at the feed level (slots) — defense in depth.
3. **Cooldown gate** — `now ≥ last_triggered_at + cooldown_seconds`, else `InCooldown`.
4. **Cap gate** — `total_paid_out + payout ≤ cap`, else `CapExceeded`.
5. **Beneficiary gate** — every destination token account's owner must be in the
   on-chain `BeneficiaryRegistry`, and its mint must equal the vault USDC mint,
   else `UnauthorizedBeneficiary` / `WrongMint`.
6. **Custody** — pooled USDC is held by a token account whose authority is the
   Vault PDA; only the program can move it, only via `execute_payout`.
7. **State-after-effects ordering** — transfers happen before `last_triggered_at`
   / `total_paid_out` are updated, and all arithmetic is checked
   (`overflow-checks = true`, `checked_*`).

## Threat model & mitigations

| Threat | Mitigation |
|--------|-----------|
| **Oracle forgery / single-point failure** | Single feed is a known limitation. Production MUST require agreement across **multiple independent oracles** (distinct operators + a second provider, e.g. Pyth) and take a median before triggering. Feed pinned per-region (`WrongOracleFeed`). |
| **Stale data replay** | Seconds-based staleness on-chain + slot-based at the feed; min samples required. |
| **Drain via spam triggers** | Cooldown + lifetime cap bound total outflow; payouts only to a fixed registry. |
| **Misdirected funds** | Destinations validated against the on-chain registry and the vault mint; permissionless caller cannot redirect — funds only ever go to registered owners. |
| **Threshold tampering** | Threshold immutable after commitment; only `initialize_region` sets it. |
| **Compromised agent / key** | Agent can only *attempt* what the program already allows; it cannot exceed cap, skip cooldown, pay non-beneficiaries, or change the threshold. Privy server wallet (no raw key on the agent host); large payouts gated by human-in-the-loop. |
| **Prompt injection via external data** | No LLM authorizes payments; the model consumes only numeric features; oracle parsing is strict. |
| **Model error (false positive)** | Calibrated probabilities + conservative threshold + cap + cooldown bound the blast radius; bands tuned to limit false alarms; prefer under-trigger. |
| **Front-running / MEV** | Payouts are fixed-amount transfers to fixed recipients; no economic edge to extract. |

## Test coverage

`program/tests/levee.ts` (run `anchor test -- --features mock-oracle`) covers:
normal trigger, below-threshold (`ThresholdNotMet`), cooldown (`InCooldown`),
cap (`CapExceeded`), and stale oracle (`StaleOracle`).

## Known limitations (devnet)

- **One oracle** — must be multi-oracle before mainnet (see above).
- `MockOracle` / `set_mock_oracle` exist for tests and should be **removed for a
  hardened mainnet build** (the production reader never trusts them, but remove
  to minimize surface).
- `declare_id!` is a placeholder — run `anchor keys sync` before deploying.
- The risk model trains on a synthetic catalogue; validate on real events first.

## Audit scope (for reviewers)

Primary: `program/programs/levee/src/` — `lib.rs` (instructions/accounts),
`oracle.rs` (feed parsing & freshness), `state.rs`, `errors.rs`. Secondary:
`agent/src/` payout path (it should never be able to exceed on-chain limits).

## Reporting

Found an issue? Open a private security advisory on the GitHub repository rather
than a public issue.
