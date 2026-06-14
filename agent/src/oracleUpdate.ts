/**
 * Best-effort inline Switchboard On-Demand update.
 *
 * Before reading a feed on-chain, the agent pushes a fresh signed value so the
 * program sees current data. If this fails, the agent still attempts the payout
 * and the PROGRAM fails closed (stale feed → no payout). Fresh-or-nothing.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { PullFeed, getDefaultDevnetQueue, asV0Tx } from "@switchboard-xyz/on-demand";
import { CrossbarClient } from "@switchboard-xyz/common";
import { RPC_URL } from "./config";
import type { AgentWallet } from "./wallet";

export async function updateFeed(
  connection: Connection,
  wallet: AgentWallet,
  feedPubkey: PublicKey,
  numSignatures = 1
): Promise<string | null> {
  try {
    const queue = await getDefaultDevnetQueue(RPC_URL);
    const feed = new PullFeed(queue.program, feedPubkey);
    const [ixs, , numSuccess] = await feed.fetchUpdateIx({
      crossbarClient: CrossbarClient.default(),
      numSignatures,
      network: "devnet",
    });
    if (!ixs || numSuccess < 1) return null;

    const tx = await asV0Tx({ connection, ixs, payer: wallet.publicKey });
    const signed = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");
    return sig;
  } catch (e) {
    console.warn(`  oracle update failed (will rely on program staleness check): ${(e as Error).message}`);
    return null;
  }
}
