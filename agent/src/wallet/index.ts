/**
 * Wallet selection. Uses the Privy embedded wallet when PRIVY_* env is present;
 * otherwise falls back to a local keypair (devnet bring-up / CI).
 */
import { Connection } from "@solana/web3.js";
import type { BaseWallet } from "solana-agent-kit";
import { PrivyWallet } from "./privy";
import { LocalKeypairWallet } from "./localKeypair";

export type AgentWallet = BaseWallet;

export function getWallet(connection: Connection): { wallet: AgentWallet; kind: string } {
  const { PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_WALLET_ID, PRIVY_WALLET_ADDRESS } =
    process.env;

  if (PRIVY_APP_ID && PRIVY_APP_SECRET && PRIVY_WALLET_ID && PRIVY_WALLET_ADDRESS) {
    return {
      wallet: new PrivyWallet({
        appId: PRIVY_APP_ID,
        appSecret: PRIVY_APP_SECRET,
        walletId: PRIVY_WALLET_ID,
        publicKey: PRIVY_WALLET_ADDRESS,
        connection,
      }),
      kind: "privy",
    };
  }

  const keyPath = process.env.ADMIN_KEYPAIR_PATH;
  if (!keyPath) {
    throw new Error(
      "No wallet configured: set PRIVY_APP_ID/PRIVY_APP_SECRET/PRIVY_WALLET_ID/" +
        "PRIVY_WALLET_ADDRESS, or ADMIN_KEYPAIR_PATH for the local fallback."
    );
  }
  return { wallet: LocalKeypairWallet.fromFile(keyPath, connection), kind: "local-keypair" };
}
