/**
 * @levee/shared — single source of truth for cross-module constants and types.
 *
 * The same region registry (../regions.json) is read by the Python model,
 * the oracle scripts and the agent so that region_id, thresholds and payout
 * parameters never drift between off-chain and on-chain components.
 *
 * IMPORTANT: the values here are *seeds / defaults*. Once a region is
 * initialized on-chain via `initialize_region`, the ON-CHAIN RegionConfig is
 * the authoritative threshold/cap/cooldown. The agent must always read the
 * chain, never trust these JSON values for payout decisions.
 */
import * as fs from "fs";
import * as path from "path";

/** Risk scores are stored on-chain as integer basis points (0..10000). */
export const RISK_SCALE = 10000;

/** USDC has 6 decimals on Solana (devnet + mainnet). */
export const USDC_DECIMALS = 6;

/** Devnet USDC mint (Circle's official devnet mint). Override via env in prod. */
export const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/** PDA seed prefixes — MUST match the Rust program (program/src/lib.rs). */
export const SEEDS = {
  VAULT: "vault",
  REGION: "region",
  BENEFICIARIES: "beneficiaries",
  DECISION: "decision",
} as const;

export interface RegionDef {
  region_id: number;
  slug: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
  /** On-chain trigger threshold in basis points (risk_score * 10000). */
  threshold_bps: number;
  /** Per-beneficiary payout in whole USDC. */
  payout_amount_usdc: number;
  /** Lifetime cap for the region in whole USDC. */
  cap_usdc: number;
  cooldown_seconds: number;
  /** Static landslide susceptibility [0,1] — a model feature, not on-chain. */
  static_susceptibility: number;
}

interface RegionsFile {
  RISK_SCALE: number;
  regions: RegionDef[];
}

const REGIONS_PATH = path.resolve(__dirname, "..", "regions.json");

let _cache: RegionsFile | null = null;
function load(): RegionsFile {
  if (!_cache) {
    _cache = JSON.parse(fs.readFileSync(REGIONS_PATH, "utf-8")) as RegionsFile;
  }
  return _cache;
}

export function getRegions(): RegionDef[] {
  return load().regions;
}

export function getRegion(regionId: number): RegionDef {
  const r = getRegions().find((x) => x.region_id === regionId);
  if (!r) throw new Error(`Unknown region_id=${regionId} (not in shared/regions.json)`);
  return r;
}

/** Convert a model probability [0,1] to on-chain basis points (0..10000). */
export function probToBps(p: number): number {
  return Math.round(Math.max(0, Math.min(1, p)) * RISK_SCALE);
}

/** Convert whole USDC to base units (6 decimals). */
export function usdcToBaseUnits(usdc: number): bigint {
  return BigInt(Math.round(usdc * 10 ** USDC_DECIMALS));
}

/** region_id encoded as 2 little-endian bytes for PDA seeds (matches Rust u16::to_le_bytes). */
export function regionSeedBytes(regionId: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(regionId, 0);
  return b;
}
