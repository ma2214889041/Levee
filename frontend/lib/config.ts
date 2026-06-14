/** Server-side config + shared region registry for the dashboard. */
import * as fs from "fs";
import * as path from "path";

export const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
export const MODEL_API_URL = process.env.MODEL_API_URL || "http://localhost:8000";
export const PROGRAM_ID =
  process.env.LEVEE_PROGRAM_ID || "GYMBo4SUqjSCvvN1Bzjmu5MPjFzt47GM3vVDZFM7sUMq";
export const PROGRAM_IDL_PATH =
  process.env.LEVEE_IDL_PATH ||
  path.resolve(process.cwd(), "..", "program", "target", "idl", "levee.json");

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

const regionsPath = path.resolve(process.cwd(), "..", "shared", "regions.json");
const regionsFile = JSON.parse(fs.readFileSync(regionsPath, "utf-8")) as {
  RISK_SCALE: number;
  regions: RegionDef[];
};

export const RISK_SCALE = regionsFile.RISK_SCALE;
export const REGIONS = regionsFile.regions;
