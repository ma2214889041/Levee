/**
 * Local keypair wallet — implements Agent Kit's BaseWallet from a keypair file.
 *
 * Useful for devnet bring-up / CI before wiring Privy. NOT for production:
 * production uses the Privy embedded wallet (see privy.ts).
 */
import * as fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SendOptions,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { BaseWallet } from "solana-agent-kit";

export class LocalKeypairWallet implements BaseWallet {
  readonly publicKey: PublicKey;
  constructor(private readonly keypair: Keypair, private readonly connection: Connection) {
    this.publicKey = keypair.publicKey;
  }

  static fromFile(filePath: string, connection: Connection): LocalKeypairWallet {
    const secret = JSON.parse(
      fs.readFileSync(filePath.replace(/^~/, process.env.HOME || ""), "utf-8")
    );
    return new LocalKeypairWallet(Keypair.fromSecretKey(Uint8Array.from(secret)), connection);
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof VersionedTransaction) tx.sign([this.keypair]);
    else tx.partialSign(this.keypair);
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((t) => this.signTransaction(t)));
  }

  async signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
    options?: SendOptions
  ): Promise<{ signature: string }> {
    const signed = await this.signTransaction(tx);
    const raw = signed.serialize();
    const signature = await this.connection.sendRawTransaction(raw, options);
    return { signature };
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // tweetnacl detached signature over the message with the keypair secret.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nacl = require("tweetnacl");
    return nacl.sign.detached(message, this.keypair.secretKey);
  }
}
