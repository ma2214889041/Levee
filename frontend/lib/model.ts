/** Calls the risk model API. Best-effort — returns null on failure. */
import { MODEL_API_URL } from "./config";

export interface RiskResult {
  region_id: number;
  risk_score: number;
  risk_bps: number;
  threshold_bps: number;
  would_trigger: boolean;
  contributing_factors: { name: string; label: string; value: number; contribution: number }[];
  model: string;
  timestamp: number;
}

export async function fetchRisk(regionId: number): Promise<RiskResult | null> {
  try {
    const res = await fetch(
      `${MODEL_API_URL.replace(/\/$/, "")}/risk?region_id=${regionId}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    return (await res.json()) as RiskResult;
  } catch {
    return null;
  }
}
