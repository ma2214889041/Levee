/**
 * Risk data source: calls the model's /risk endpoint for a region.
 * On any failure it throws — the agent treats missing data as "do not trigger".
 */
import { MODEL_API_URL } from "./config";

export interface RiskResult {
  region_id: number;
  risk_score: number; // P(landslide) in [0,1]
  risk_bps: number;
  threshold_bps: number;
  would_trigger: boolean;
  alert_level?: string; // NORMAL | WATCH | WARNING | CRITICAL
  grid_exposure_score?: number;
  affected_assets?: { id: string; name: string; asset_risk: number }[];
  contributing_factors: { name: string; label: string; contribution: number }[];
  model: string;
  timestamp: number;
}

export async function fetchRisk(regionId: number): Promise<RiskResult> {
  const url = `${MODEL_API_URL.replace(/\/$/, "")}/risk?region_id=${regionId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`/risk ${regionId} → HTTP ${res.status}`);
  return (await res.json()) as RiskResult;
}

/** Top contributing factor label, for the on-chain decision note. */
export function topFactorNote(r: RiskResult): string {
  const top = r.contributing_factors?.[0];
  const base = top ? `${top.label}` : "n/a";
  return `risk=${r.risk_score.toFixed(2)} top=${base}`.slice(0, 80);
}
