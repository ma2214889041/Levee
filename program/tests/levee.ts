/**
 * Levee program tests (run with the `mock-oracle` feature):
 *   anchor test -- --features mock-oracle
 *
 * Coverage:
 *   1. normal trigger (risk ≥ threshold, fresh oracle, under cap, not cooling)
 *   2. threshold not met            → ThresholdNotMet
 *   3. cooldown re-trigger          → InCooldown
 *   4. cap exceeded                 → CapExceeded
 *   5. stale oracle                 → StaleOracle  (bonus: freshness guard)
 *
 * The mock oracle stands in for a Switchboard On-Demand pull feed so the full
 * payout path is exercisable on a local validator.
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Levee } from "../target/types/levee";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import BN from "bn.js";

const USDC_DECIMALS = 6;
const ONE_USDC = new BN(10).pow(new BN(USDC_DECIMALS));
const PAYOUT = ONE_USDC.muln(100); // 100 USDC per beneficiary

function u16le(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}
function u64le(n: number | BN): Buffer {
  const b = Buffer.alloc(8);
  new BN(n).toArrayLike(Buffer, "le", 8).copy(b);
  return b;
}
const now = () => Math.floor(Date.now() / 1000);

describe("levee", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Levee as Program<Levee>;
  const admin = (provider.wallet as anchor.Wallet).payer;

  let usdcMint: PublicKey;
  let vaultPda: PublicKey;
  let vaultBump: number;
  let vaultTokenAccount: PublicKey;

  // Two registered beneficiaries + one un-registered (for the auth test).
  const ben1 = Keypair.generate();
  const ben2 = Keypair.generate();
  let ben1Ata: PublicKey;
  let ben2Ata: PublicKey;

  const pdaRegion = (id: number) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("region"), u16le(id)],
      program.programId
    )[0];
  const pdaRegistry = (id: number) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("beneficiaries"), u16le(id)],
      program.programId
    )[0];
  const pdaMock = (id: number) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("mock"), u16le(id)],
      program.programId
    )[0];

  async function setMock(id: number, valueBps: number, ts: number, samples = 3) {
    await program.methods
      .setMockOracle(id, new BN(valueBps), new BN(ts), samples)
      .accounts({
        authority: admin.publicKey,
        mock: pdaMock(id),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Initialize a region + its (populated) registry. */
  async function setupRegion(
    id: number,
    opts: { thresholdBps: number; cap: BN; cooldown: number; maxStaleness?: number }
  ) {
    const oracleFeed = pdaMock(id); // region's oracle is its mock feed in tests
    await program.methods
      .initializeRegion(
        id,
        opts.thresholdBps,
        PAYOUT,
        opts.cap,
        new BN(opts.cooldown),
        new BN(opts.maxStaleness ?? 600),
        1,
        oracleFeed
      )
      .accounts({
        admin: admin.publicKey,
        vault: vaultPda,
        region: pdaRegion(id),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .initBeneficiaryRegistry(id)
      .accounts({
        admin: admin.publicKey,
        vault: vaultPda,
        registry: pdaRegistry(id),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    for (const b of [ben1.publicKey, ben2.publicKey]) {
      await program.methods
        .addBeneficiary(id, b)
        .accounts({
          admin: admin.publicKey,
          vault: vaultPda,
          registry: pdaRegistry(id),
        })
        .rpc();
    }
  }

  async function triggerPayout(id: number) {
    return program.methods
      .executePayout(id)
      .accounts({
        caller: admin.publicKey,
        vault: vaultPda,
        vaultTokenAccount,
        region: pdaRegion(id),
        registry: pdaRegistry(id),
        oracleFeed: pdaMock(id),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: ben1Ata, isWritable: true, isSigner: false },
        { pubkey: ben2Ata, isWritable: true, isSigner: false },
      ])
      .rpc();
  }

  before(async () => {
    // Local "USDC": 6-decimal mint controlled by admin.
    usdcMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      USDC_DECIMALS
    );

    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    vaultTokenAccount = getAssociatedTokenAddressSync(usdcMint, vaultPda, true);

    // Initialize the vault (creates the vault USDC ATA, authority = vault PDA).
    await program.methods
      .initializeVault()
      .accounts({
        admin: admin.publicKey,
        vault: vaultPda,
        usdcMint,
        vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Fund the pool via the deposit instruction (exercises deposit too).
    const adminAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      usdcMint,
      admin.publicKey
    );
    await mintTo(
      provider.connection,
      admin,
      usdcMint,
      adminAta.address,
      admin,
      BigInt(ONE_USDC.muln(100000).toString())
    );
    await program.methods
      .deposit(new BN(ONE_USDC.muln(50000)))
      .accounts({
        depositor: admin.publicKey,
        vault: vaultPda,
        vaultTokenAccount,
        depositorTokenAccount: adminAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultBal = await getAccount(provider.connection, vaultTokenAccount);
    assert.equal(vaultBal.amount.toString(), ONE_USDC.muln(50000).toString());

    // Beneficiary ATAs.
    ben1Ata = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin,
        usdcMint,
        ben1.publicKey
      )
    ).address;
    ben2Ata = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin,
        usdcMint,
        ben2.publicKey
      )
    ).address;
  });

  it("1. normal trigger pays all registered beneficiaries", async () => {
    const id = 101;
    await setupRegion(id, { thresholdBps: 7000, cap: PAYOUT.muln(10), cooldown: 1 });
    await setMock(id, 8200, now()); // risk 0.82 ≥ 0.70

    const before1 = (await getAccount(provider.connection, ben1Ata)).amount;
    await triggerPayout(id);
    const after1 = (await getAccount(provider.connection, ben1Ata)).amount;
    const after2 = (await getAccount(provider.connection, ben2Ata)).amount;

    assert.equal((after1 - before1).toString(), PAYOUT.toString());
    assert.equal(after2.toString(), PAYOUT.toString());

    const region = await program.account.regionConfig.fetch(pdaRegion(id));
    assert.equal(region.totalPaidOut.toString(), PAYOUT.muln(2).toString());
    assert.isTrue(region.lastTriggeredAt.toNumber() > 0);
    assert.isTrue(region.thresholdLocked);

    // log_decision writes an auditable record.
    const decisionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("decision"), u16le(id), u64le(region.decisionCount)],
      program.programId
    )[0];
    await program.methods
      .logDecision(id, 8200, true, PAYOUT.muln(2), new BN(now()), "rain72h dominant")
      .accounts({
        agent: admin.publicKey,
        region: pdaRegion(id),
        decision: decisionPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const log = await program.account.decisionLog.fetch(decisionPda);
    assert.isTrue(log.triggered);
    assert.equal(log.thresholdBps, 7000);
  });

  it("2. below-threshold risk does not trigger (ThresholdNotMet)", async () => {
    const id = 102;
    await setupRegion(id, { thresholdBps: 7000, cap: PAYOUT.muln(10), cooldown: 1 });
    await setMock(id, 5000, now()); // 0.50 < 0.70
    try {
      await triggerPayout(id);
      assert.fail("expected ThresholdNotMet");
    } catch (e: any) {
      assert.equal(e.error.errorCode.code, "ThresholdNotMet");
    }
  });

  it("3. re-trigger inside cooldown is rejected (InCooldown)", async () => {
    const id = 103;
    await setupRegion(id, { thresholdBps: 7000, cap: PAYOUT.muln(10), cooldown: 100000 });
    await setMock(id, 9000, now());
    await triggerPayout(id); // first ok
    try {
      await triggerPayout(id); // immediate retry within cooldown
      assert.fail("expected InCooldown");
    } catch (e: any) {
      assert.equal(e.error.errorCode.code, "InCooldown");
    }
  });

  it("4. exceeding the lifetime cap is rejected (CapExceeded)", async () => {
    const id = 104;
    // cap == exactly one round (2 * PAYOUT); cooldown 0 so the 2nd attempt is
    // only blocked by the cap, not cooldown.
    await setupRegion(id, { thresholdBps: 7000, cap: PAYOUT.muln(2), cooldown: 0 });
    await setMock(id, 9000, now());
    await triggerPayout(id); // total now == cap
    try {
      await triggerPayout(id);
      assert.fail("expected CapExceeded");
    } catch (e: any) {
      assert.equal(e.error.errorCode.code, "CapExceeded");
    }
  });

  it("5. stale oracle data is rejected (StaleOracle)", async () => {
    const id = 105;
    await setupRegion(id, {
      thresholdBps: 7000,
      cap: PAYOUT.muln(10),
      cooldown: 1,
      maxStaleness: 300,
    });
    await setMock(id, 9000, now() - 100000); // far in the past
    try {
      await triggerPayout(id);
      assert.fail("expected StaleOracle");
    } catch (e: any) {
      assert.equal(e.error.errorCode.code, "StaleOracle");
    }
  });
});
