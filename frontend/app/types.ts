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
export interface Risk {
  risk_score: number;
  risk_bps: number;
  threshold_bps: number;
  would_trigger: boolean;
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
}
