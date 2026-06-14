// Pure types shared with the client (no server-only imports).
export interface RegionDef {
  region_id: number;
  slug: string;
  name: string;
  description: string;
  threshold_bps: number;
  payout_amount_usdc: number;
  cap_usdc: number;
  cooldown_seconds: number;
  static_susceptibility: number;
}
export interface AffectedAsset {
  id: string;
  name: string;
  type: string;
  voltage_kv?: number;
  criticality: number;
  asset_risk: number;
}
export interface Risk {
  risk_score: number;
  risk_bps: number;
  threshold_bps: number;
  would_trigger: boolean;
  alert_level: "NORMAL" | "WATCH" | "WARNING" | "CRITICAL";
  grid_exposure_score: number;
  affected_assets: AffectedAsset[];
  contributing_factors: { name: string; label: string; value: number; contribution: number }[];
  model: string;
  timestamp: number;
}
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
export interface Decision {
  sequence: number;
  riskBps: number;
  thresholdBps: number;
  triggered: boolean;
  payoutTotal: string;
  oracleTimestamp: number;
  evaluatedAt: number;
  note: string;
}
export interface RegionState {
  def: RegionDef;
  risk: Risk | null;
  onchain: OnChainRegion | null;
  beneficiaries: number | null;
  decisions: Decision[];
}
export interface DashboardState {
  rpcUrl: string;
  programId: string;
  riskScale: number;
  vaultBalanceUsdc: number | null;
  regions: RegionState[];
  generatedAt: number;
  /** True when served from the static (Cloudflare Pages) build — illustrative data. */
  demo?: boolean;
}
