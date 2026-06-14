/**
 * Entry point. Wires the wallet (Privy or local fallback), the Solana Agent Kit
 * V2 framework handle, and the Levee program client, then runs the loop.
 *
 *   ts-node src/index.ts          # continuous loop
 *   ts-node src/index.ts --once   # single evaluation pass (good for the demo)
 */
import { SolanaAgentKit } from "solana-agent-kit";
import { getConnection, RPC_URL } from "./config";
import { getWallet } from "./wallet";
import { LeveeProgram } from "./program";
import { runLoop, AgentContext } from "./agent";
import { initMonitoring } from "./monitor";

async function main() {
  initMonitoring();
  const once = process.argv.includes("--once");
  const connection = getConnection();
  const { wallet, kind } = getWallet(connection);
  console.log(`Wallet: ${kind} (${wallet.publicKey.toBase58()})`);

  // Solana Agent Kit V2 framework handle (wallet + connection + plugins).
  const agentKit = new SolanaAgentKit(wallet, RPC_URL, {});

  const levee = new LeveeProgram(connection, wallet);
  const ctx: AgentContext = { connection, wallet, levee, agentKit };

  await runLoop(ctx, once);
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
