/**
 * REAL PrivacyPoolAdapter — wires the UI to 0xbow's Privacy Pools v2 SDK.
 *
 * Status: WIRING STUB. It compiles today WITHOUT the private package installed
 * (the import is dynamic + ts-ignored). To activate:
 *   1. Get a valid GitHub Packages token and follow ../../INSTALL.md.
 *   2. `npm i @0xbow-io/privacy-pools-v2-sdk@beta` in this workspace.
 *   3. Set VITE_USE_REAL_SDK=true.
 *   4. Confirm the exact method names below against the SDK README and finish the
 *      TODOs (deposit / disburse / proof of association).
 *
 * The 401 we hit means the provided token could not authenticate, so the precise
 * runtime API surface (beyond `PoolSessionBuilder.create` and
 * `DEFAULT_CIRCUIT_MANIFEST`) is not yet confirmed — hence the guarded TODOs.
 */
import {
  AssociationProof,
  BeneficiarySplit,
  DepositResult,
  DisburseResult,
  PoolStatus,
  PrivacyPoolAdapter,
  SEPOLIA_CHAIN_ID,
} from "./adapter";

async function loadSdk(): Promise<any> {
  try {
    // Computed specifier + @vite-ignore so the bundler does NOT try to resolve
    // this optional private package at build time; it loads at runtime only
    // after INSTALL.md has installed it.
    const pkg = "@0xbow-io/privacy-pools-v2-sdk";
    // @ts-ignore — optional private dependency, present only after INSTALL.md.
    return await import(/* @vite-ignore */ pkg);
  } catch (e) {
    throw new Error(
      "Privacy Pools SDK not installed. Follow privacy/INSTALL.md (needs a valid " +
        "GitHub Packages token), then `npm i @0xbow-io/privacy-pools-v2-sdk@beta`."
    );
  }
}

export class RealPrivacyPoolAdapter implements PrivacyPoolAdapter {
  readonly kind = "real" as const;
  private account?: string;
  private session?: any;

  async connect(account: string): Promise<void> {
    this.account = account;
    const sdk = await loadSdk();
    // Documented entry points from INSTALL.md:
    //   import { DEFAULT_CIRCUIT_MANIFEST, PoolSessionBuilder } from "@0xbow-io/..."
    this.session = await sdk.PoolSessionBuilder.create({
      chainId: SEPOLIA_CHAIN_ID,
      circuitManifest: sdk.DEFAULT_CIRCUIT_MANIFEST,
      // TODO: pass the wallet client / signer derived from window.ethereum (viem),
      //       per the SDK README's configuration block.
    });
  }

  async status(): Promise<PoolStatus> {
    // TODO: read the shielded balance from `this.session` once the API is confirmed.
    return {
      kind: this.kind,
      connected: !!this.session,
      account: this.account,
      chainId: SEPOLIA_CHAIN_ID,
      privateBalanceWei: 0n,
    };
  }

  async deposit(_amountWei: bigint): Promise<DepositResult> {
    await loadSdk();
    // TODO: this.session.deposit({ amount: _amountWei }) — confirm method/params.
    throw new Error("RealPrivacyPoolAdapter.deposit not wired yet (see TODOs).");
  }

  async disburse(_splits: BeneficiarySplit[]): Promise<DisburseResult> {
    await loadSdk();
    // TODO: build one private withdrawal/transfer per beneficiary via the session.
    throw new Error("RealPrivacyPoolAdapter.disburse not wired yet (see TODOs).");
  }

  async proveAssociation(_withdrawalAddress: string): Promise<AssociationProof> {
    await loadSdk();
    // TODO: this.session.proveAssociation(...) → Proof of Association.
    throw new Error("RealPrivacyPoolAdapter.proveAssociation not wired yet (see TODOs).");
  }
}
