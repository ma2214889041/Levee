/**
 * Admin CLI — one-time devnet setup for the Levee program.
 *
 * Uses the LOCAL keypair (ADMIN_KEYPAIR_PATH) as admin/payer. Run after
 * `anchor deploy` (so the IDL + program id exist) and after creating the
 * Switchboard feed (oracle/createFeed.ts).
 *
 *   ts-node src/admin.ts init-vault
 *   ts-node src/admin.ts deposit <usdcAmount> <depositorTokenAccount>
 *   ts-node src/admin.ts init-region <regionId> [oracleFeedPubkey]
 *   ts-node src/admin.ts init-registry <regionId>
 *   ts-node src/admin.ts add-beneficiary <regionId> <ownerPubkey>
 *
 * Region policy (threshold/payout/cap/cooldown) is taken from
 * shared/regions.json; oracle staleness/samples from .env.
 */
import * as fs from "fs";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PROGRAM_ID,
  PROGRAM_IDL_PATH,
  RISK_SCALE,
  USDC_DECIMALS,
  getConnection,
  getRegionDef,
  pdaVault,
  pdaRegion,
  pdaRegistry,
} from "./config";
import { getWallet } from "./wallet";

const USDC = 10 ** USDC_DECIMALS;
const toBase = (usdc: number) => new BN(Math.round(usdc * USDC));

function buildProgram() {
  const connection = getConnection();
  const { wallet, kind } = getWallet(connection);
  if (kind !== "local-keypair") {
    console.warn(`(admin using ${kind} wallet — ensure it is the program admin)`);
  }
  const provider = new anchor.AnchorProvider(connection, wallet as unknown as anchor.Wallet, {
    commitment: "confirmed",
  });
  const idl = JSON.parse(fs.readFileSync(PROGRAM_IDL_PATH, "utf-8"));
  idl.address = PROGRAM_ID.toBase58();
  const program = new anchor.Program(idl as anchor.Idl, provider);
  return { program, provider };
}

function resolveOracleFeed(regionId: number, cliArg?: string): PublicKey {
  if (cliArg) return new PublicKey(cliArg);
  if (process.env.SWITCHBOARD_FEED_PUBKEY) return new PublicKey(process.env.SWITCHBOARD_FEED_PUBKEY);
  const rec = path.resolve(__dirname, "..", "..", "oracle", "feeds", `region-${regionId}.json`);
  if (fs.existsSync(rec)) return new PublicKey(JSON.parse(fs.readFileSync(rec, "utf-8")).feed_pubkey);
  throw new Error("Provide an oracle feed pubkey (arg, SWITCHBOARD_FEED_PUBKEY, or oracle/feeds/region-<id>.json)");
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const { program, provider } = buildProgram();
  const admin = provider.wallet.publicKey;
  const usdcMint = new PublicKey(
    process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );

  switch (cmd) {
    case "init-vault": {
      const vaultTokenAccount = getAssociatedTokenAddressSync(usdcMint, pdaVault(), true);
      const sig = await (program.methods as any)
        .initializeVault()
        .accounts({
          admin,
          vault: pdaVault(),
          usdcMint,
          vaultTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("init-vault:", sig, "\nvaultTokenAccount:", vaultTokenAccount.toBase58());
      break;
    }
    case "deposit": {
      const amount = toBase(Number(args[0]));
      const depositorTokenAccount = new PublicKey(args[1]);
      const vaultTokenAccount = getAssociatedTokenAddressSync(usdcMint, pdaVault(), true);
      const sig = await (program.methods as any)
        .deposit(amount)
        .accounts({
          depositor: admin,
          vault: pdaVault(),
          vaultTokenAccount,
          depositorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      console.log("deposit:", sig);
      break;
    }
    case "init-region": {
      const regionId = Number(args[0]);
      const def = getRegionDef(regionId);
      const oracleFeed = resolveOracleFeed(regionId, args[1]);
      const maxStaleness = new BN(Number(process.env.ORACLE_MAX_STALENESS_SECONDS || 300));
      const minSamples = Number(process.env.ORACLE_MIN_SAMPLES || 1);
      const sig = await (program.methods as any)
        .initializeRegion(
          regionId,
          def.threshold_bps,
          toBase(def.payout_amount_usdc),
          toBase(def.cap_usdc),
          new BN(def.cooldown_seconds),
          maxStaleness,
          minSamples,
          oracleFeed
        )
        .accounts({
          admin,
          vault: pdaVault(),
          region: pdaRegion(regionId),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(`init-region ${regionId} (threshold ${def.threshold_bps}bps, feed ${oracleFeed.toBase58()}):`, sig);
      break;
    }
    case "init-registry": {
      const regionId = Number(args[0]);
      const sig = await (program.methods as any)
        .initBeneficiaryRegistry(regionId)
        .accounts({
          admin,
          vault: pdaVault(),
          registry: pdaRegistry(regionId),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(`init-registry ${regionId}:`, sig);
      break;
    }
    case "add-beneficiary": {
      const regionId = Number(args[0]);
      const owner = new PublicKey(args[1]);
      const sig = await (program.methods as any)
        .addBeneficiary(regionId, owner)
        .accounts({ admin, vault: pdaVault(), registry: pdaRegistry(regionId) })
        .rpc();
      console.log(`add-beneficiary ${regionId} ${owner.toBase58()}:`, sig);
      break;
    }
    default:
      console.log(
        "commands: init-vault | deposit <usdc> <depositorTokenAccount> | " +
          "init-region <id> [feed] | init-registry <id> | add-beneficiary <id> <owner>"
      );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
