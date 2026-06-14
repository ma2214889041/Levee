/**
 * MOCK PrivacyPoolAdapter — in-memory, no chain. Lets the Confidential Relief UI
 * build, run and demo the full UX without the private SDK / a funded Sepolia
 * wallet. It is clearly labelled "mock" everywhere in the UI so no one mistakes
 * it for real privacy. Replace with the real adapter once the SDK token works.
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Deterministic pseudo-hash for demo ids (NOT cryptographic). */
function fakeHash(input: string): string {
  let h = 0n;
  for (const ch of input) h = (h * 1000003n + BigInt(ch.charCodeAt(0))) % (1n << 160n);
  return "0x" + h.toString(16).padStart(40, "0");
}

export class MockPrivacyPoolAdapter implements PrivacyPoolAdapter {
  readonly kind = "mock" as const;
  private account?: string;
  private balance = 0n;
  private seq = 0;

  async connect(account: string): Promise<void> {
    this.account = account;
  }

  async status(): Promise<PoolStatus> {
    return {
      kind: this.kind,
      connected: !!this.account,
      account: this.account,
      chainId: SEPOLIA_CHAIN_ID,
      privateBalanceWei: this.balance,
    };
  }

  async deposit(amountWei: bigint): Promise<DepositResult> {
    await wait(500);
    this.balance += amountWei;
    return {
      commitment: fakeHash(`deposit:${this.account}:${amountWei}:${this.seq++}`),
      txHash: fakeHash(`tx:${Date.now()}:${this.seq}`),
    };
  }

  async disburse(splits: BeneficiarySplit[]): Promise<DisburseResult> {
    await wait(700);
    const total = splits.reduce((a, s) => a + s.amountWei, 0n);
    if (total > this.balance) throw new Error("Insufficient shielded balance for this split.");
    this.balance -= total;
    const notes = splits.map((s, i) => ({
      address: s.address,
      amountWei: s.amountWei,
      noteId: fakeHash(`note:${s.address}:${s.amountWei}:${this.seq}:${i}`),
    }));
    return { notes, totalWei: total, txHash: fakeHash(`tx:disburse:${Date.now()}`) };
  }

  async proveAssociation(withdrawalAddress: string): Promise<AssociationProof> {
    await wait(500);
    return {
      withdrawalAddress,
      proof: fakeHash(`proof:${withdrawalAddress}:${Date.now()}`),
      root: fakeHash("asp-root"),
      verified: true,
    };
  }
}
