# Levee program (Anchor)

On-chain program: Vault (USDC pool), RegionConfig (immutable threshold + payout
policy), BeneficiaryRegistry, `execute_payout`, `log_decision`.

## Instructions

| Instruction                 | Who    | Purpose                                            |
|-----------------------------|--------|----------------------------------------------------|
| `initialize_vault`          | admin  | Create Vault PDA + USDC token account.             |
| `deposit`                   | anyone | Top up the relief pool.                            |
| `initialize_region`         | admin  | Commit region policy; **locks the threshold**.     |
| `init_beneficiary_registry` | admin  | Create the region's beneficiary set.               |
| `add/remove_beneficiary`    | admin  | Manage eligible community wallets.                  |
| `execute_payout`            | agent  | Read oracle → pay registered beneficiaries if risk ≥ threshold, outside cooldown, under cap. |
| `log_decision`              | agent  | Append an immutable evaluation record.             |
| `set_mock_oracle`           | test   | Test utility — see note below.                     |

Custom errors: `ThresholdNotMet`, `InCooldown`, `CapExceeded`,
`UnauthorizedBeneficiary` (+ oracle/accounting guards).

## Build & test

```bash
# Install once: Solana CLI + Anchor 0.30.1 (avm), Node deps.
npm install            # from repo root (workspaces) or: cd program && npm i

# Run the full test suite on a local validator (uses the mock-oracle reader so
# payout logic is exercisable without a live Switchboard feed):
anchor test -- --features mock-oracle
# (equivalently: anchor build -- --features mock-oracle && anchor test --skip-build)

# Host-only sanity check of the Rust (no BPF / validator needed):
cargo check -p levee --features mock-oracle
cargo check -p levee            # production (real Switchboard) reader
```

After the first build, sync the program id:

```bash
anchor keys list      # prints the real program id
anchor keys sync      # writes it into declare_id! + Anchor.toml
```

## Oracle modes

- **Production (default features):** `execute_payout` parses a **Switchboard
  On-Demand pull feed** (`oracle/`) and rejects stale / low-sample data.
- **Tests (`--features mock-oracle`):** the oracle reader instead reads a
  `MockOracle` account written by `set_mock_oracle`, so the four required
  scenarios (trigger / below-threshold / cooldown / cap) — plus a stale-oracle
  case — run on localnet.

> ⚠️ A single oracle is a single point of failure. Production should require
> agreement across **multiple independent oracles** before triggering a payout.
> `MockOracle` / `set_mock_oracle` should be deleted for a hardened deploy.
