/**
 * Oracle environment + shared region config.
 *
 * Reads the repo-root .env and the canonical shared/regions.json so the feed
 * uses the same region_id / threshold as everything else.
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

export const RPC_URL = process.env.RPC_URL || clusterApiUrl("devnet");
export const MODEL_API_URL = process.env.MODEL_API_URL || "http://localhost:8000";

// Freshness guards. maxStaleness for an On-Demand feed is expressed in SLOTS;
// we derive it from the seconds value the rest of the system uses (~2.5 slots/s
// on Solana). The PROGRAM independently enforces a seconds-based staleness in
// execute_payout, so this is defense-in-depth, not the only check.
export const ORACLE_MAX_STALENESS_SECONDS = Number(
  process.env.ORACLE_MAX_STALENESS_SECONDS || 300
);
export const ORACLE_MAX_STALENESS_SLOTS = Math.round(
  ORACLE_MAX_STALENESS_SECONDS * 2.5
);
export const ORACLE_MIN_SAMPLES = Number(process.env.ORACLE_MIN_SAMPLES || 1);

export const SWITCHBOARD_FEED_PUBKEY = process.env.SWITCHBOARD_FEED_PUBKEY || "";

export function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

/** Load the admin/payer keypair from ADMIN_KEYPAIR_PATH (never committed). */
export function loadKeypair(): Keypair {
  const p = process.env.ADMIN_KEYPAIR_PATH;
  if (!p) throw new Error("ADMIN_KEYPAIR_PATH is not set in .env");
  const secret = JSON.parse(fs.readFileSync(p.replace(/^~/, process.env.HOME || ""), "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

// ---- shared region registry ----
interface RegionDef {
  region_id: number;
  slug: string;
  name: string;
  threshold_bps: number;
  [k: string]: unknown;
}
const regionsFile = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "..", "shared", "regions.json"), "utf-8")
) as { RISK_SCALE: number; regions: RegionDef[] };

export const RISK_SCALE = regionsFile.RISK_SCALE;
export function getRegion(regionId: number): RegionDef {
  const r = regionsFile.regions.find((x) => x.region_id === regionId);
  if (!r) throw new Error(`Unknown region_id=${regionId}`);
  return r;
}

/** Path where created-feed pubkeys are recorded for a region. */
export function feedRecordPath(regionId: number): string {
  return path.resolve(__dirname, "..", "feeds", `region-${regionId}.json`);
}
