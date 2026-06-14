/**
 * Create a Switchboard On-Demand PULL FEED for a Levee region on devnet.
 *
 * Usage (from oracle/):
 *   ts-node src/createFeed.ts --region 1
 *
 * Writes the resulting feed pubkey to feeds/region-<id>.json. Put that pubkey in
 * .env as SWITCHBOARD_FEED_PUBKEY and also pass it as the region's oracle_feed
 * when calling initialize_region on the Levee program.
 *
 * ⚠️ PRODUCTION: a single feed is a single point of failure / forgery. A real
 * deployment should create MULTIPLE independent feeds (distinct oracle
 * operators, and ideally a second provider such as Pyth) and require agreement
 * across them before any payout. This script provisions ONE feed for the demo.
 */
import * as fs from "fs";
import { PullFeed, getDefaultDevnetQueue, asV0Tx } from "@switchboard-xyz/on-demand";
import {
  getConnection,
  loadKeypair,
  getRegion,
  RPC_URL,
  ORACLE_MAX_STALENESS_SLOTS,
  ORACLE_MIN_SAMPLES,
  feedRecordPath,
} from "./config";
import { buildRiskJob } from "./jobs";

function argRegion(): number {
  const i = process.argv.indexOf("--region");
  return i >= 0 ? Number(process.argv[i + 1]) : 1;
}

async function main() {
  const regionId = argRegion();
  const region = getRegion(regionId);
  const connection = getConnection();
  const payer = loadKeypair();

  // The devnet On-Demand queue ships with its own Anchor program handle.
  const queue = await getDefaultDevnetQueue(RPC_URL);
  const program = queue.program;

  const jobs = [buildRiskJob(regionId)];

  console.log(`Creating On-Demand feed for region ${regionId} (${region.name})`);
  const [feed, tx] = await PullFeed.initTx(program, {
    name: `levee-risk-${region.slug}`,
    queue: queue.pubkey,
    // Aggregation guards. maxVariance is in feed units (risk is 0..1, so 1.0 is
    // generous); minResponses/minSampleSize set the minimum oracle agreement.
    maxVariance: 1.0,
    minResponses: Math.max(1, ORACLE_MIN_SAMPLES),
    minSampleSize: Math.max(1, ORACLE_MIN_SAMPLES),
    maxStaleness: ORACLE_MAX_STALENESS_SLOTS,
    jobs,
    payer: payer.publicKey,
  });

  tx.sign([payer]);
  const sig = await connection.sendTransaction(tx);
  await connection.confirmTransaction(sig, "confirmed");

  const record = {
    region_id: regionId,
    slug: region.slug,
    feed_pubkey: feed.pubkey.toBase58(),
    queue: queue.pubkey.toBase58(),
    max_staleness_slots: ORACLE_MAX_STALENESS_SLOTS,
    min_sample_size: Math.max(1, ORACLE_MIN_SAMPLES),
    created_tx: sig,
  };
  fs.mkdirSync(feedRecordPath(regionId).replace(/\/[^/]+$/, ""), { recursive: true });
  fs.writeFileSync(feedRecordPath(regionId), JSON.stringify(record, null, 2));

  console.log("✅ Feed created:", feed.pubkey.toBase58());
  console.log("   tx:", sig);
  console.log(`   → set SWITCHBOARD_FEED_PUBKEY=${feed.pubkey.toBase58()} in .env`);
  console.log(`   → use this as oracle_feed in initialize_region(region ${regionId})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
