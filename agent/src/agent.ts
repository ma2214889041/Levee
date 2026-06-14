/**
 * Levee autonomous agent — main evaluation loop.
 *
 * Per region, each cycle:
 *   1. pull risk from the model (/risk)            ← data missing ⇒ NO trigger
 *   2. read the AUTHORITATIVE on-chain RegionConfig (threshold/cap/cooldown/feed)
 *   3. check every gate off-chain (mirror of the program, fail-safe)
 *   4. if a payout is warranted: HITL for large amounts → refresh the oracle →
 *      execute_payout → log_decision
 *   5. otherwise: log_decision(triggered=false)
 *
 * Hard invariants (also enforced on-chain — this is defense in depth):
 *   • only the on-chain threshold authorizes a payout; never invent one
 *   • missing / stale data ⇒ do not trigger
 *   • pay only registered beneficiaries; never exceed cap
 *   • prefer under-triggering over over-paying
 */
import { BN } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit";
import {
  AGENT_DRY_RUN,
  AGENT_REGIONS,
  HITL_APPROVAL_THRESHOLD_USDC,
  POLL_INTERVAL_SECONDS,
  USDC_DECIMALS,
  getRegionDef,
} from "./config";
import { LeveeProgram } from "./program";
import { fetchRisk, topFactorNote, RiskResult } from "./risk";
import { updateFeed } from "./oracleUpdate";
import { requestApproval } from "./hitl";
import type { AgentWallet } from "./wallet";

const USDC = 10 ** USDC_DECIMALS;

export interface AgentContext {
  connection: Connection;
  wallet: AgentWallet;
  levee: LeveeProgram;
  agentKit: SolanaAgentKit; // Solana Agent Kit V2 framework handle
}

function bnToUsdc(x: BN): number {
  return Number(x.toString()) / USDC;
}

async function logDecisionSafe(
  ctx: AgentContext,
  regionId: number,
  risk: RiskResult | null,
  triggered: boolean,
  payoutTotal: BN,
  note: string
) {
  if (AGENT_DRY_RUN) return; // dry-run never writes on-chain
  try {
    const fresh = await ctx.levee.getRegion(regionId);
    if (!fresh) return;
    await ctx.levee.logDecision(
      regionId,
      fresh.decisionCount,
      risk ? risk.risk_bps : 0,
      triggered,
      payoutTotal,
      new BN(risk ? risk.timestamp : Math.floor(Date.now() / 1000)),
      note
    );
  } catch (e) {
    console.warn(`  log_decision failed: ${(e as Error).message}`);
  }
}

export async function evaluateRegion(ctx: AgentContext, regionId: number): Promise<void> {
  const def = getRegionDef(regionId);
  console.log(`\n[region ${regionId}] ${def.name}`);

  // 1) Risk data. Missing ⇒ do not trigger.
  let risk: RiskResult;
  try {
    risk = await fetchRisk(regionId);
  } catch (e) {
    console.log(`  ✗ risk data unavailable (${(e as Error).message}) → no trigger`);
    await logDecisionSafe(ctx, regionId, null, false, new BN(0), "model unavailable");
    return;
  }

  // 2) Authoritative on-chain config.
  const region = await ctx.levee.getRegion(regionId);
  if (!region) {
    console.log("  ✗ region not initialized on-chain → skip");
    return;
  }
  const vault = await ctx.levee.getVault();
  const beneficiaries = await ctx.levee.getBeneficiaries(regionId);
  const now = Math.floor(Date.now() / 1000);
  const cooldownEnd = region.lastTriggeredAt.toNumber() + region.cooldownSeconds.toNumber();
  const payoutTotal = region.payoutAmount.mul(new BN(beneficiaries.length));
  const capRemaining = region.cap.sub(region.totalPaidOut);
  const vaultBalance = await ctx.levee.getVaultBalance(vault.vaultTokenAccount);

  // 3) Gates (compare against ON-CHAIN threshold only).
  const reasons: string[] = [];
  if (risk.risk_bps < region.thresholdBps) reasons.push("below threshold");
  if (now < cooldownEnd) reasons.push(`cooldown (${cooldownEnd - now}s left)`);
  if (beneficiaries.length === 0) reasons.push("no beneficiaries");
  if (payoutTotal.gt(capRemaining)) reasons.push("cap exceeded");
  if (BigInt(payoutTotal.toString()) > vaultBalance) reasons.push("insufficient vault balance");

  console.log(
    `  risk=${risk.risk_score.toFixed(3)} (${risk.risk_bps}bps) ` +
      `threshold=${region.thresholdBps}bps payout=${bnToUsdc(payoutTotal)} USDC ` +
      `(${beneficiaries.length} ben) capRemaining=${bnToUsdc(capRemaining)} USDC`
  );

  if (reasons.length > 0) {
    console.log(`  → NO trigger: ${reasons.join(", ")}`);
    await logDecisionSafe(ctx, regionId, risk, false, new BN(0), reasons[0]);
    return;
  }

  // 4) Payout warranted.
  const payoutUsdc = bnToUsdc(payoutTotal);
  if (payoutUsdc > HITL_APPROVAL_THRESHOLD_USDC) {
    const ok = await requestApproval(
      `region ${regionId}: pay ${payoutUsdc} USDC to ${beneficiaries.length} beneficiaries ` +
        `(risk ${risk.risk_score.toFixed(2)} ≥ threshold ${(region.thresholdBps / 100).toFixed(0)}%)`
    );
    if (!ok) {
      console.log("  → HITL denied → no payout");
      await logDecisionSafe(ctx, regionId, risk, false, new BN(0), "HITL denied");
      return;
    }
  }

  if (AGENT_DRY_RUN) {
    console.log(`  ✓ DRY_RUN: would execute_payout for ${payoutUsdc} USDC (no tx sent)`);
    return;
  }

  // Refresh the oracle so the program reads a fresh value (fresh or nothing).
  await updateFeed(ctx.connection, ctx.wallet, region.oracleFeed, region.minOracleSamples);

  try {
    const sig = await ctx.levee.executePayout(
      regionId,
      vault,
      region.oracleFeed,
      beneficiaries
    );
    console.log(`  ✓ execute_payout sent: ${sig}`);
    await logDecisionSafe(ctx, regionId, risk, true, payoutTotal, topFactorNote(risk));
  } catch (e) {
    // On-chain fail-closed (e.g. stale oracle, threshold recheck). Record it.
    console.log(`  ✗ execute_payout rejected on-chain: ${(e as Error).message}`);
    await logDecisionSafe(ctx, regionId, risk, false, new BN(0), "payout rejected on-chain");
  }
}

export async function runLoop(ctx: AgentContext, once: boolean): Promise<void> {
  console.log(
    `Levee agent | regions=[${AGENT_REGIONS.join(",")}] ` +
      `dryRun=${AGENT_DRY_RUN} hitl>${HITL_APPROVAL_THRESHOLD_USDC}USDC ` +
      `interval=${POLL_INTERVAL_SECONDS}s`
  );
  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const regionId of AGENT_REGIONS) {
      try {
        await evaluateRegion(ctx, regionId);
      } catch (e) {
        console.error(`[region ${regionId}] cycle error:`, (e as Error).message);
      }
    }
    if (once) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_SECONDS * 1000));
  }
}

export { PublicKey };
