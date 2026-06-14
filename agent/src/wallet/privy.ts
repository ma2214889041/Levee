/**
 * Privy embedded (server) wallet — implements Agent Kit's BaseWallet by
 * delegating signing to a Privy server wallet via @privy-io/server-auth.
 *
 * The agent never holds raw private keys: Privy custodies the key and signs on
 * request. This is the production signer for the autonomous agent.
 */
import {
  Connection,
  PublicKey,
  SendOptions,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { PrivyClient } from "@privy-io/server-auth";
import type { BaseWallet } from "solana-agent-kit";

/** CAIP-2 chain ids Privy accepts for Solana. */
export type SolanaCaip2 =
  | "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" // mainnet
  | "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" // devnet
  | "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z"; // testnet

export interface PrivyWalletOpts {
  appId: string;
  appSecret: string;
  walletId: string;
  publicKey: string; // the wallet's Solana address
  connection: Connection;
  /** CAIP-2 id used for signAndSendTransaction. Devnet by default. */
  caip2?: SolanaCaip2;
}

export class PrivyWallet implements BaseWallet {
  readonly publicKey: PublicKey;
  private readonly privy: PrivyClient;
  private readonly walletId: string;
  private readonly connection: Connection;
  private readonly caip2: SolanaCaip2;

  constructor(opts: PrivyWalletOpts) {
    this.privy = new PrivyClient(opts.appId, opts.appSecret);
    this.walletId = opts.walletId;
    this.publicKey = new PublicKey(opts.publicKey);
    this.connection = opts.connection;
    // Solana devnet CAIP-2 genesis-hash id.
    this.caip2 = opts.caip2 || "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    const { signedTransaction } = await this.privy.walletApi.solana.signTransaction({
      walletId: this.walletId,
      transaction: tx,
    });
    return signedTransaction as T;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((t) => this.signTransaction(t)));
  }

  async signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
    _options?: SendOptions
  ): Promise<{ signature: string }> {
    const { hash } = await this.privy.walletApi.solana.signAndSendTransaction({
      walletId: this.walletId,
      caip2: this.caip2,
      transaction: tx,
    });
    return { signature: hash };
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const { signature } = await this.privy.walletApi.solana.signMessage({
      walletId: this.walletId,
      message,
    });
    return signature;
  }
}
