/**
 * Demo dashboard snapshot for the STATIC (Cloudflare Pages) build.
 *
 * Cloudflare Pages can't run the live `/api/state` route (it reads Solana RPC +
 * the model API server-side), so the static export ships this illustrative
 * snapshot instead. Region definitions are REAL (from shared/regions.json); only
 * the live risk / on-chain numbers are synthesized, and the dashboard flags the
 * data as "preview" so nothing is misrepresented. The Node deployment still
 * serves real data — see app/api/state/route.ts.
 */
import { PROGRAM_ID, REGIONS, RISK_SCALE, RPC_URL } from "./config";
import type {
  AffectedAsset,
  DashboardState,
  Decision,
  OnChainRegion,
  RegionState,
  Risk,
} from "../app/types";

const USDC = 1e6;
const NOW = 1_749_900_000; // fixed timestamp so the static snapshot is stable

// Illustrative per-region risk scores (Sarno breaches threshold — the 1998 replay story).
const SCORES = [0.861, 0.642, 0.471, 0.318, 0.205];

function level(score: number): Risk["alert_level"] {
  if (score >= 0.7) return "CRITICAL";
  if (score >= 0.6) return "WARNING";
  if (score >= 0.4) return "WATCH";
  return "NORMAL";
}

function riskFor(score: number, thresholdBps: number, susceptibility: number): Risk {
  const risk_bps = Math.round(score * RISK_SCALE);
  const assets: AffectedAsset[] = [
    { id: "TR-380", name: "380kV transmission tower", type: "transmission_tower", voltage_kv: 380, criticality: 0.95, asset_risk: Math.min(score * 0.95 + 0.05, 1) },
    { id: "SS-150", name: "Primary substation", type: "substation", voltage_kv: 150, criticality: 0.9, asset_risk: Math.min(score * 0.9, 1) },
  ];
  return {
    risk_score: score,
    risk_bps,
    threshold_bps: thresholdBps,
    would_trigger: risk_bps >= thresholdBps,
    alert_level: level(score),
    grid_exposure_score: Math.min(score * 0.9 + 0.1, 1),
    affected_assets: assets,
    contributing_factors: [
      { name: "rain_72h", label: "72h rainfall", value: score * 180, contribution: 0.42 * score },
      { name: "soil_sat", label: "Soil saturation", value: score, contribution: 0.31 * score },
      { name: "suscept", label: "Static susceptibility", value: susceptibility, contribution: 0.18 * score },
    ],
    model: "levee-lgbm (preview)",
    timestamp: NOW,
  };
}

function onchainFor(def: (typeof REGIONS)[number], score: number, beneficiaries: number): OnChainRegion {
  const triggered = score >= def.threshold_bps / RISK_SCALE;
  // one disbursement of ~9 beneficiaries, bounded by the on-chain cap.
  const paid = triggered ? Math.min(def.payout_amount_usdc * 9, def.cap_usdc) : 0;
  return {
    thresholdBps: def.threshold_bps,
    payoutAmount: String(def.payout_amount_usdc * USDC),
    cap: String(def.cap_usdc * USDC),
    cooldownSeconds: def.cooldown_seconds,
    lastTriggeredAt: triggered ? NOW - 3600 : 0,
    totalPaidOut: String(paid * USDC),
    decisionCount: triggered ? 2 : 1,
    thresholdLocked: true,
    oracleFeed: "Demo (Switchboard On-Demand)",
  };
}

function decisionsFor(def: (typeof REGIONS)[number], score: number): Decision[] {
  const risk_bps = Math.round(score * RISK_SCALE);
  const triggered = risk_bps >= def.threshold_bps;
  const out: Decision[] = [
    {
      sequence: 1,
      riskBps: Math.round(risk_bps * 0.7),
      thresholdBps: def.threshold_bps,
      triggered: false,
      payoutTotal: "0",
      oracleTimestamp: NOW - 7200,
      evaluatedAt: NOW - 7200,
      note: "below threshold — monitoring",
    },
  ];
  if (triggered) {
    out.push({
      sequence: 2,
      riskBps: risk_bps,
      thresholdBps: def.threshold_bps,
      triggered: true,
      payoutTotal: String(def.payout_amount_usdc * 9 * USDC),
      oracleTimestamp: NOW - 3600,
      evaluatedAt: NOW - 3600,
      note: "threshold breached — relief disbursed",
    });
  }
  return out;
}

export function buildDemoState(): DashboardState {
  const regions: RegionState[] = REGIONS.map((def, i) => {
    const score = SCORES[i % SCORES.length];
    const beneficiaries = 1284 - i * 137;
    return {
      def,
      risk: riskFor(score, def.threshold_bps, def.static_susceptibility),
      onchain: onchainFor(def, score, beneficiaries),
      beneficiaries,
      decisions: decisionsFor(def, score),
    };
  });

  const totalPaid = regions.reduce(
    (sum, r) => sum + (r.onchain ? Number(r.onchain.totalPaidOut) / USDC : 0),
    0
  );
  const vaultBalanceUsdc = 1_240_000 - totalPaid; // pre-funded relief pool minus disbursed

  return {
    rpcUrl: RPC_URL,
    programId: PROGRAM_ID,
    riskScale: RISK_SCALE,
    vaultBalanceUsdc,
    regions,
    generatedAt: NOW,
    demo: true,
  };
}
