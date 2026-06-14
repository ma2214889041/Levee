# Levee Confidential Relief (Privacy Pools v2)

The **privacy + compliance layer** for Levee's relief disbursement, built on
**0xbow Privacy Pools v2** (Sepolia / EVM).

## Why

Disaster-relief recipients often don't want "I received aid" permanently and
publicly tied to their wallet (stigma, safety). But donors and regulators must
be able to verify funds went to legitimate recipients, not bad actors. Those two
needs usually conflict — which is exactly what Privacy Pools resolves.

Levee's Solana program decides *when* and *how much* relief to release
(transparent, on-chain, auditable). This module is the **last mile**: it lets a
sponsor **privately split** relief to many beneficiaries while each can produce a
**Proof of Association** showing the funds are clean — privacy for recipients,
compliance for everyone else.

> Note: Privacy Pools v2 is EVM (Sepolia); Levee's core is Solana. This is a
> complementary cross-chain prototype, not on-chain-unified with the program.

## What it does (UI)

1. **Shield funds** — deposit relief into the Privacy Pool.
2. **Private disbursement (split)** — pay many beneficiaries at once (payroll /
   tx-splitter pattern) without publicly linking recipients.
3. **Proof of Association** — generate a compliance proof for a withdrawal address.

## Architecture — swappable adapter

The UI only talks to `PrivacyPoolAdapter` (`src/privacy/adapter.ts`):

- `mockAdapter.ts` — in-memory simulation (default). Builds & demos the full UX
  with no SDK/token/chain. Clearly labelled "MOCK MODE" in the UI.
- `realAdapter.ts` — wires 0xbow's `@0xbow-io/privacy-pools-v2-sdk`
  (`PoolSessionBuilder.create`, `DEFAULT_CIRCUIT_MANIFEST`). Compiles without the
  package (dynamic import); activate per `INSTALL.md` + `VITE_USE_REAL_SDK=true`.

> Status: the hackathon token returned `401 Unauthorized`, so the real SDK could
> not be installed/inspected here. The mock ships a working demo; swapping in the
> real SDK is a localized change once a valid token is available.

## Run

```bash
cd privacy
npm install          # (or from repo root — workspaces)
npm run dev          # http://localhost:5173  (mock mode)
npm run build        # production build
```

To go real: see [`INSTALL.md`](INSTALL.md).
