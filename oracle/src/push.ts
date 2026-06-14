/**
 * On-demand push (crank) for a Levee feed.
 *
 * Fetches fresh signed oracle responses for the feed and submits an update
 * transaction so the on-chain feed value is current. Run it on an interval, or
 * call it once right before triggering a payout. (The agent does the same thing
 * inline before reading the feed in execute_payout.)
 *
 * Usage (from oracle/):
 *   ts-node src/push.ts --region 1            # uses feeds/region-1.json
 *   ts-node src/push.ts --feed <PUBKEY>       # explicit feed
 *   ts-node src/push.ts --region 1 --watch 30 # repeat every 30s
 */
import * as fs from "fs";
import { PublicKey } from "@solana/web3.js";
import {
  PullFeed,
  getDefaultDevnetQueue,
  asV0Tx,
} from "@switchboard-xyz/on-demand";
import { CrossbarClient } from "@switchboard-xyz/common";
import {
  getConnection,
  loadKeypair,
  RPC_URL,
  SWITCHBOARD_FEED_PUBKEY,
  ORACLE_MIN_SAMPLES,
  feedRecordPath,
} from "./config";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function resolveFeedPubkey(): PublicKey {
  const explicit = arg("--feed") || SWITCHBOARD_FEED_PUBKEY;
  if (explicit) return new PublicKey(explicit);
  const region = arg("--region");
  if (region) {
    const rec = JSON.parse(fs.readFileSync(feedRecordPath(Number(region)), "utf-8"));
    return new PublicKey(rec.feed_pubkey);
  }
  throw new Error("Provide --feed <pubkey> or --region <id> (or set SWITCHBOARD_FEED_PUBKEY)");
}

export async function pushOnce(): Promise<string> {
  const connection = getConnection();
  const payer = loadKeypair();
  const queue = await getDefaultDevnetQueue(RPC_URL);
  const program = queue.program;
  const crossbar = CrossbarClient.default();

  const feed = new PullFeed(program, resolveFeedPubkey());

  // Pull fresh signed responses from the oracle gateway.
  const [ixs, responses, numSuccess] = await feed.fetchUpdateIx({
    crossbarClient: crossbar,
    numSignatures: Math.max(1, ORACLE_MIN_SAMPLES),
    network: "devnet",
  });
  if (!ixs || numSuccess < 1) {
    throw new Error(
      `No successful oracle responses (got ${numSuccess}/${responses.length})`
    );
  }

  const tx = await asV0Tx({
    connection,
    ixs,
    payer: payer.publicKey,
    signers: [payer],
  });
  const sig = await connection.sendTransaction(tx);
  await connection.confirmTransaction(sig, "confirmed");
  console.log(`pushed update: ${sig} (responses ok: ${numSuccess})`);
  return sig;
}

async function main() {
  const watch = arg("--watch");
  if (watch) {
    const everyMs = Number(watch) * 1000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await pushOnce();
      } catch (e) {
        console.error("push failed:", (e as Error).message);
      }
      await new Promise((r) => setTimeout(r, everyMs));
    }
  } else {
    await pushOnce();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
