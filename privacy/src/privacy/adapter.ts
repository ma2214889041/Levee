/**
 * PrivacyPoolAdapter — the seam between the Confidential Relief UI and 0xbow's
 * Privacy Pools v2. The UI only ever talks to this interface, so we can ship a
 * working mock now and drop in the real `@0xbow-io/privacy-pools-v2-sdk` later
 * by swapping a single factory (see ./index.ts) — no UI changes.
 *
 * Domain framing (Levee): a relief sponsor deposits funds into a Privacy Pool,
 * then privately SPLITS them to many beneficiary addresses (like a payroll / tx
 * splitter), while each beneficiary can produce a Proof of Association showing
 * the funds are clean — privacy for recipients, compliance for donors/regulators.
 */

export interface BeneficiarySplit {
  /** Beneficiary EVM address (0x...). */
  address: string;
  /** Amount in wei. */
  amountWei: bigint;
}

export interface DepositResult {
  commitment: string;
  txHash?: string;
}

export interface DisbursementNote {
  address: string;
  amountWei: bigint;
  /** Private note / nullifier id the beneficiary later withdraws against. */
  noteId: string;
}

export interface DisburseResult {
  notes: DisbursementNote[];
  totalWei: bigint;
  txHash?: string;
}

export interface AssociationProof {
  withdrawalAddress: string;
  /** Opaque proof blob (ZK proof) provided to a verifier. */
  proof: string;
  /** Association-set root the proof is anchored to. */
  root: string;
  verified: boolean;
}

export interface PoolStatus {
  kind: "mock" | "real";
  connected: boolean;
  account?: string;
  chainId: number;
  /** Sponsor's private (shielded) balance available to disburse, in wei. */
  privateBalanceWei: bigint;
}

export interface PrivacyPoolAdapter {
  readonly kind: "mock" | "real";
  /** Bind the adapter to a connected wallet account. */
  connect(account: string): Promise<void>;
  status(): Promise<PoolStatus>;
  /** Shield funds into the pool. */
  deposit(amountWei: bigint): Promise<DepositResult>;
  /** Privately disburse to many beneficiaries in one logical operation. */
  disburse(splits: BeneficiarySplit[]): Promise<DisburseResult>;
  /** Produce a Proof of Association for a withdrawal address. */
  proveAssociation(withdrawalAddress: string): Promise<AssociationProof>;
}

export const SEPOLIA_CHAIN_ID = 11155111;
