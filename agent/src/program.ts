/**
 * Anchor program client: load the Levee program, read on-chain state, and build
 * + send execute_payout / log_decision using the agent's wallet.
 *
 * The on-chain RegionConfig is the AUTHORITATIVE policy — the agent reads
 * threshold / cap / cooldown / oracle_feed from here and never invents them.
 */
import * as fs from "fs";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PROGRAM_ID,
  PROGRAM_IDL_PATH,
  pdaVault,
  pdaRegion,
  pdaRegistry,
  pdaDecision,
} from "./config";
import type { AgentWallet } from "./wallet";

export interface RegionState {
  thresholdBps: number;
  payoutAmount: BN;
  cap: BN;
  cooldownSeconds: BN;
  maxStalenessSeconds: BN;
  minOracleSamples: number;
  lastTriggeredAt: BN;
  totalPaidOut: BN;
  decisionCount: BN;
  oracleFeed: PublicKey;
  thresholdLocked: boolean;
}

export interface VaultState {
  usdcMint: PublicKey;
  vaultTokenAccount: PublicKey;
}

export class LeveeProgram {
  readonly program: anchor.Program;
  readonly provider: anchor.AnchorProvider;

  constructor(connection: Connection, wallet: AgentWallet) {
    this.provider = new anchor.AnchorProvider(
      connection,
      wallet as unknown as anchor.Wallet,
      { commitment: "confirmed" }
    );
    const idl = JSON.parse(fs.readFileSync(PROGRAM_IDL_PATH, "utf-8"));
    idl.address = PROGRAM_ID.toBase58(); // ensure id matches our config
    this.program = new anchor.Program(idl as anchor.Idl, this.provider);
  }

  // ---- reads ----
  async getVault(): Promise<VaultState> {
    return (await (this.program.account as any).vaultState.fetch(pdaVault())) as VaultState;
  }
  async getRegion(regionId: number): Promise<RegionState | null> {
    try {
      return (await (this.program.account as any).regionConfig.fetch(
        pdaRegion(regionId)
      )) as RegionState;
    } catch {
      return null; // not initialized
    }
  }
  async getBeneficiaries(regionId: number): Promise<PublicKey[]> {
    const reg = (await (this.program.account as any).beneficiaryRegistry.fetch(
      pdaRegistry(regionId)
    )) as { beneficiaries: PublicKey[] };
    return reg.beneficiaries;
  }
  async getVaultBalance(vaultTokenAccount: PublicKey): Promise<bigint> {
    const bal = await this.provider.connection.getTokenAccountBalance(vaultTokenAccount);
    return BigInt(bal.value.amount);
  }

  // ---- writes ----
  /** Beneficiary owner pubkeys → their USDC ATAs (remaining accounts). */
  beneficiaryAtas(owners: PublicKey[], usdcMint: PublicKey) {
    return owners.map((owner) => ({
      pubkey: getAssociatedTokenAddressSync(usdcMint, owner, true),
      isWritable: true,
      isSigner: false,
    }));
  }

  async executePayout(
    regionId: number,
    vault: VaultState,
    oracleFeed: PublicKey,
    beneficiaryOwners: PublicKey[]
  ): Promise<string> {
    return (this.program.methods as any)
      .executePayout(regionId)
      .accounts({
        caller: this.provider.wallet.publicKey,
        vault: pdaVault(),
        vaultTokenAccount: vault.vaultTokenAccount,
        region: pdaRegion(regionId),
        registry: pdaRegistry(regionId),
        oracleFeed,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(this.beneficiaryAtas(beneficiaryOwners, vault.usdcMint))
      .rpc();
  }

  async logDecision(
    regionId: number,
    sequence: BN,
    riskBps: number,
    triggered: boolean,
    payoutTotal: BN,
    oracleTimestamp: BN,
    note: string
  ): Promise<string> {
    return (this.program.methods as any)
      .logDecision(regionId, riskBps, triggered, payoutTotal, oracleTimestamp, note)
      .accounts({
        agent: this.provider.wallet.publicKey,
        region: pdaRegion(regionId),
        decision: pdaDecision(regionId, BigInt(sequence.toString())),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }
}

// Re-export for callers that build raw txs.
export type { Transaction, VersionedTransaction };
