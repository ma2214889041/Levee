/**
 * Read-only on-chain reader for the dashboard.
 *
 * Everything is best-effort: if the program isn't deployed yet, the IDL is
 * missing, or an account doesn't exist, the helpers return null and the UI
 * shows "not deployed / no data" instead of crashing.
 */
import * as fs from "fs";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, PROGRAM_IDL_PATH, RPC_URL } from "./config";

function regionSeed(regionId: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(regionId, 0);
  return b;
}

let _program: anchor.Program | null | undefined;
function getProgram(): anchor.Program | null {
  if (_program !== undefined) return _program;
  try {
    const idl = JSON.parse(fs.readFileSync(PROGRAM_IDL_PATH, "utf-8"));
    idl.address = PROGRAM_ID;
    const connection = new Connection(RPC_URL, "confirmed");
    // Read-only: minimal wallet stub, we never sign on the dashboard.
    const readOnlyWallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any) => txs,
    };
    const provider = new anchor.AnchorProvider(connection, readOnlyWallet as any, {
      commitment: "confirmed",
    });
    _program = new anchor.Program(idl as anchor.Idl, provider);
  } catch {
    _program = null;
  }
  return _program;
}

const pid = () => new PublicKey(PROGRAM_ID);
const pdaVault = () => PublicKey.findProgramAddressSync([Buffer.from("vault")], pid())[0];
const pdaRegion = (id: number) =>
  PublicKey.findProgramAddressSync([Buffer.from("region"), regionSeed(id)], pid())[0];
const pdaRegistry = (id: number) =>
  PublicKey.findProgramAddressSync([Buffer.from("beneficiaries"), regionSeed(id)], pid())[0];

export interface OnChainRegion {
  thresholdBps: number;
  payoutAmount: string;
  cap: string;
  cooldownSeconds: number;
  lastTriggeredAt: number;
  totalPaidOut: string;
  decisionCount: number;
  thresholdLocked: boolean;
  oracleFeed: string;
}

export interface OnChainDecision {
  sequence: number;
  riskBps: number;
  thresholdBps: number;
  triggered: boolean;
  payoutTotal: string;
  oracleTimestamp: number;
  evaluatedAt: number;
  note: string;
}

export async function getOnChainRegion(regionId: number): Promise<OnChainRegion | null> {
  const program = getProgram();
  if (!program) return null;
  try {
    const r: any = await (program.account as any).regionConfig.fetch(pdaRegion(regionId));
    return {
      thresholdBps: r.thresholdBps,
      payoutAmount: r.payoutAmount.toString(),
      cap: r.cap.toString(),
      cooldownSeconds: Number(r.cooldownSeconds),
      lastTriggeredAt: Number(r.lastTriggeredAt),
      totalPaidOut: r.totalPaidOut.toString(),
      decisionCount: Number(r.decisionCount),
      thresholdLocked: r.thresholdLocked,
      oracleFeed: r.oracleFeed.toBase58(),
    };
  } catch {
    return null;
  }
}

export async function getBeneficiaryCount(regionId: number): Promise<number | null> {
  const program = getProgram();
  if (!program) return null;
  try {
    const reg: any = await (program.account as any).beneficiaryRegistry.fetch(
      pdaRegistry(regionId)
    );
    return reg.beneficiaries.length;
  } catch {
    return null;
  }
}

export async function getVaultBalanceUsdc(): Promise<number | null> {
  const program = getProgram();
  if (!program) return null;
  try {
    const v: any = await (program.account as any).vaultState.fetch(pdaVault());
    const bal = await program.provider.connection.getTokenAccountBalance(
      v.vaultTokenAccount
    );
    return bal.value.uiAmount;
  } catch {
    return null;
  }
}

export async function getDecisions(
  regionId: number,
  limit = 10
): Promise<OnChainDecision[]> {
  const program = getProgram();
  if (!program) return [];
  try {
    const all: any[] = await (program.account as any).decisionLog.all();
    return all
      .map((a) => a.account)
      .filter((d) => Number(d.regionId) === regionId)
      .map((d) => ({
        sequence: Number(d.sequence),
        riskBps: d.riskBps,
        thresholdBps: d.thresholdBps,
        triggered: d.triggered,
        payoutTotal: d.payoutTotal.toString(),
        oracleTimestamp: Number(d.oracleTimestamp),
        evaluatedAt: Number(d.evaluatedAt),
        note: d.note,
      }))
      .sort((a, b) => b.sequence - a.sequence)
      .slice(0, limit);
  } catch {
    return [];
  }
}
