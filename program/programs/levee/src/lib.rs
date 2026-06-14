//! Levee — autonomous landslide-relief disbursement program.
//!
//! Flow: a Vault holds a USDC pool; each RegionConfig pins an IMMUTABLE risk
//! threshold + payout policy; a BeneficiaryRegistry lists eligible wallets; the
//! agent calls `execute_payout` (which reads the region's oracle feed and pays
//! registered beneficiaries only if risk ≥ threshold, outside cooldown, under
//! cap) and `log_decision` (which records every evaluation on-chain).

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

pub mod constants;
pub mod errors;
pub mod events;
pub mod oracle;
pub mod state;

use constants::*;
use errors::LeveeError;
use events::*;
use state::*;

// Replace after `anchor keys list` / first deploy. Must match Anchor.toml.
declare_id!("GYMBo4SUqjSCvvN1Bzjmu5MPjFzt47GM3vVDZFM7sUMq");

#[program]
pub mod levee {
    use super::*;

    /// Create the Vault PDA and its USDC token account (authority = Vault PDA).
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.admin = ctx.accounts.admin.key();
        vault.usdc_mint = ctx.accounts.usdc_mint.key();
        vault.vault_token_account = ctx.accounts.vault_token_account.key();
        vault.bump = ctx.bumps.vault;
        msg!("Vault initialized; admin={}", vault.admin);
        Ok(())
    }

    /// Permissionless top-up of the relief pool.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let cpi = Transfer {
            from: ctx.accounts.depositor_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi),
            amount,
        )?;
        msg!("Deposited {} USDC base units into vault", amount);
        Ok(())
    }

    /// Commit a region's policy. The threshold is locked here and can never be
    /// changed afterwards (no instruction mutates it).
    #[allow(clippy::too_many_arguments)]
    pub fn initialize_region(
        ctx: Context<InitializeRegion>,
        region_id: u16,
        threshold_bps: u16,
        payout_amount: u64,
        cap: u64,
        cooldown_seconds: i64,
        max_staleness_seconds: i64,
        min_oracle_samples: u32,
        oracle_feed: Pubkey,
    ) -> Result<()> {
        require!(threshold_bps as u64 <= RISK_SCALE, LeveeError::ThresholdNotMet);
        require!(cooldown_seconds >= 0, LeveeError::InCooldown);
        require!(max_staleness_seconds > 0, LeveeError::StaleOracle);

        let region = &mut ctx.accounts.region;
        region.region_id = region_id;
        region.authority = ctx.accounts.admin.key();
        region.oracle_feed = oracle_feed;
        region.threshold_bps = threshold_bps;
        region.payout_amount = payout_amount;
        region.cap = cap;
        region.cooldown_seconds = cooldown_seconds;
        region.max_staleness_seconds = max_staleness_seconds;
        region.min_oracle_samples = min_oracle_samples;
        region.last_triggered_at = 0;
        region.total_paid_out = 0;
        region.decision_count = 0;
        region.threshold_locked = true; // immutable from now on
        region.bump = ctx.bumps.region;

        msg!(
            "Region {} committed: threshold={}bps payout={} cap={} cooldown={}s",
            region_id, threshold_bps, payout_amount, cap, cooldown_seconds
        );
        Ok(())
    }

    /// Create an (initially empty) beneficiary registry for a region.
    pub fn init_beneficiary_registry(
        ctx: Context<InitBeneficiaryRegistry>,
        region_id: u16,
    ) -> Result<()> {
        let reg = &mut ctx.accounts.registry;
        reg.region_id = region_id;
        reg.authority = ctx.accounts.admin.key();
        reg.beneficiaries = Vec::new();
        reg.bump = ctx.bumps.registry;
        Ok(())
    }

    /// Add a community wallet to a region's registry (admin only).
    pub fn add_beneficiary(
        ctx: Context<ManageRegistry>,
        _region_id: u16,
        beneficiary: Pubkey,
    ) -> Result<()> {
        let reg = &mut ctx.accounts.registry;
        require!(
            reg.beneficiaries.len() < MAX_BENEFICIARIES,
            LeveeError::RegistryFull
        );
        require!(
            !reg.beneficiaries.contains(&beneficiary),
            LeveeError::BeneficiaryExists
        );
        reg.beneficiaries.push(beneficiary);
        Ok(())
    }

    /// Remove a community wallet from a region's registry (admin only).
    pub fn remove_beneficiary(
        ctx: Context<ManageRegistry>,
        _region_id: u16,
        beneficiary: Pubkey,
    ) -> Result<()> {
        let reg = &mut ctx.accounts.registry;
        let idx = reg
            .beneficiaries
            .iter()
            .position(|b| b == &beneficiary)
            .ok_or(LeveeError::BeneficiaryNotFound)?;
        reg.beneficiaries.swap_remove(idx);
        Ok(())
    }

    /// THE core instruction. Reads the region's oracle feed and disburses
    /// `payout_amount` USDC to EACH registered beneficiary token account passed
    /// in `remaining_accounts` — only if every safety condition holds.
    ///
    /// Order of checks is deliberate: we fail closed (no payout) on the first
    /// violated invariant.
    pub fn execute_payout<'info>(
        ctx: Context<'_, '_, 'info, 'info, ExecutePayout<'info>>,
        _region_id: u16,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let region = &mut ctx.accounts.region;

        // (0) The oracle account must be the one pinned in the region config.
        require_keys_eq!(
            ctx.accounts.oracle_feed.key(),
            region.oracle_feed,
            LeveeError::WrongOracleFeed
        );

        // (1) Read risk from the oracle. Stale / unparseable ⇒ refuse to act.
        let reading = oracle::read_risk_bps(
            &ctx.accounts.oracle_feed,
            &clock,
            region.max_staleness_seconds,
            region.min_oracle_samples,
        )?;

        // (2) Threshold gate — the ONLY thing that authorizes a payout.
        require!(
            reading.risk_bps >= region.threshold_bps as u64,
            LeveeError::ThresholdNotMet
        );

        // (3) Cooldown gate.
        let next_allowed = region
            .last_triggered_at
            .checked_add(region.cooldown_seconds)
            .ok_or(LeveeError::MathOverflow)?;
        require!(clock.unix_timestamp >= next_allowed, LeveeError::InCooldown);

        // (4) Validate beneficiaries & compute the total.
        let beneficiary_accounts = ctx.remaining_accounts;
        let count = beneficiary_accounts.len() as u64;
        require!(count >= 1, LeveeError::NoBeneficiaries);

        let payout_total = region
            .payout_amount
            .checked_mul(count)
            .ok_or(LeveeError::MathOverflow)?;

        // (5) Cap gate.
        let new_total = region
            .total_paid_out
            .checked_add(payout_total)
            .ok_or(LeveeError::MathOverflow)?;
        require!(new_total <= region.cap, LeveeError::CapExceeded);

        // (6) Transfer to each beneficiary, signed by the Vault PDA.
        let vault = &ctx.accounts.vault;
        let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, &[vault.bump]]];

        for acc in beneficiary_accounts.iter() {
            // Deserialize & validate the token account.
            let ta = Account::<TokenAccount>::try_from(acc)
                .map_err(|_| error!(LeveeError::WrongMint))?;
            require_keys_eq!(ta.mint, vault.usdc_mint, LeveeError::WrongMint);
            require!(
                ctx.accounts.registry.beneficiaries.contains(&ta.owner),
                LeveeError::UnauthorizedBeneficiary
            );

            let cpi = Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: acc.clone(),
                authority: vault.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi,
                    signer_seeds,
                ),
                region.payout_amount,
            )?;
        }

        // (7) Update state AFTER successful transfers.
        region.last_triggered_at = clock.unix_timestamp;
        region.total_paid_out = new_total;

        emit!(PayoutExecuted {
            region_id: region.region_id,
            risk_bps: reading.risk_bps,
            threshold_bps: region.threshold_bps,
            beneficiary_count: count as u32,
            payout_total,
            oracle_timestamp: reading.timestamp,
            triggered_at: clock.unix_timestamp,
        });
        msg!(
            "PAYOUT region={} risk={}bps total={} to {} beneficiaries",
            region.region_id, reading.risk_bps, payout_total, count
        );
        Ok(())
    }

    /// Append an immutable decision record for this evaluation cycle. Called by
    /// the agent every loop, whether or not a payout happened, so the full
    /// decision history is publicly auditable.
    pub fn log_decision(
        ctx: Context<LogDecision>,
        _region_id: u16,
        risk_bps: u16,
        triggered: bool,
        payout_total: u64,
        oracle_timestamp: i64,
        note: String,
    ) -> Result<()> {
        require!(note.len() <= MAX_NOTE_LEN, LeveeError::OracleParseError);
        let clock = Clock::get()?;
        let region = &mut ctx.accounts.region;
        let sequence = region.decision_count;

        let log = &mut ctx.accounts.decision;
        log.region_id = region.region_id;
        log.sequence = sequence;
        log.risk_bps = risk_bps;
        log.threshold_bps = region.threshold_bps; // stamp from chain, not arg
        log.triggered = triggered;
        log.payout_total = payout_total;
        log.oracle_timestamp = oracle_timestamp;
        log.evaluated_at = clock.unix_timestamp;
        log.note = note;
        log.bump = ctx.bumps.decision;

        region.decision_count = sequence.checked_add(1).ok_or(LeveeError::MathOverflow)?;

        emit!(DecisionRecorded {
            region_id: log.region_id,
            sequence,
            risk_bps,
            threshold_bps: log.threshold_bps,
            triggered,
            payout_total,
            evaluated_at: log.evaluated_at,
        });
        Ok(())
    }

    // ---- TEST UTILITY: write a MockOracle account the test suite reads via the
    // `mock-oracle` reader. Inert in production (real reader ignores it). ----
    pub fn set_mock_oracle(
        ctx: Context<SetMockOracle>,
        region_id: u16,
        value_bps: u64,
        timestamp: i64,
        num_samples: u32,
    ) -> Result<()> {
        let m = &mut ctx.accounts.mock;
        m.region_id = region_id;
        m.value_bps = value_bps;
        m.timestamp = timestamp;
        m.num_samples = num_samples;
        m.bump = ctx.bumps.mock;
        Ok(())
    }
}

// ============================================================================
// Accounts contexts
// ============================================================================

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + VaultState::INIT_SPACE,
        seeds = [VAULT_SEED],
        bump
    )]
    pub vault: Account<'info, VaultState>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    #[account(mut, address = vault.vault_token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = depositor_token_account.mint == vault.usdc_mint @ LeveeError::WrongMint
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(region_id: u16)]
pub struct InitializeRegion<'info> {
    #[account(mut, address = vault.admin @ LeveeError::Unauthorized)]
    pub admin: Signer<'info>,
    #[account(seeds = [VAULT_SEED], bump = vault.bump, has_one = admin @ LeveeError::Unauthorized)]
    pub vault: Account<'info, VaultState>,
    #[account(
        init,
        payer = admin,
        space = 8 + RegionConfig::INIT_SPACE,
        seeds = [REGION_SEED, &region_id.to_le_bytes()],
        bump
    )]
    pub region: Account<'info, RegionConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(region_id: u16)]
pub struct InitBeneficiaryRegistry<'info> {
    #[account(mut, address = vault.admin @ LeveeError::Unauthorized)]
    pub admin: Signer<'info>,
    #[account(seeds = [VAULT_SEED], bump = vault.bump, has_one = admin @ LeveeError::Unauthorized)]
    pub vault: Account<'info, VaultState>,
    #[account(
        init,
        payer = admin,
        space = 8 + BeneficiaryRegistry::INIT_SPACE,
        seeds = [BENEFICIARIES_SEED, &region_id.to_le_bytes()],
        bump
    )]
    pub registry: Account<'info, BeneficiaryRegistry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(region_id: u16)]
pub struct ManageRegistry<'info> {
    #[account(address = vault.admin @ LeveeError::Unauthorized)]
    pub admin: Signer<'info>,
    #[account(seeds = [VAULT_SEED], bump = vault.bump, has_one = admin @ LeveeError::Unauthorized)]
    pub vault: Account<'info, VaultState>,
    #[account(
        mut,
        seeds = [BENEFICIARIES_SEED, &region_id.to_le_bytes()],
        bump = registry.bump
    )]
    pub registry: Account<'info, BeneficiaryRegistry>,
}

#[derive(Accounts)]
#[instruction(region_id: u16)]
pub struct ExecutePayout<'info> {
    /// Permissionless executor (the autonomous agent). All conditions are
    /// enforced on-chain, so allowing anyone to trigger cannot misdirect funds.
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    #[account(mut, address = vault.vault_token_account)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [REGION_SEED, &region_id.to_le_bytes()],
        bump = region.bump
    )]
    pub region: Account<'info, RegionConfig>,
    #[account(
        seeds = [BENEFICIARIES_SEED, &region_id.to_le_bytes()],
        bump = registry.bump
    )]
    pub registry: Account<'info, BeneficiaryRegistry>,
    /// CHECK: validated against `region.oracle_feed`, then parsed by the oracle
    /// reader (Switchboard pull feed in prod, MockOracle under `mock-oracle`).
    pub oracle_feed: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    // remaining_accounts = beneficiary USDC token accounts (writable).
}

#[derive(Accounts)]
#[instruction(region_id: u16)]
pub struct LogDecision<'info> {
    #[account(mut)]
    pub agent: Signer<'info>,
    #[account(
        mut,
        seeds = [REGION_SEED, &region_id.to_le_bytes()],
        bump = region.bump
    )]
    pub region: Account<'info, RegionConfig>,
    #[account(
        init,
        payer = agent,
        space = 8 + DecisionLog::INIT_SPACE,
        seeds = [DECISION_SEED, &region_id.to_le_bytes(), &region.decision_count.to_le_bytes()],
        bump
    )]
    pub decision: Account<'info, DecisionLog>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(region_id: u16)]
pub struct SetMockOracle<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + MockOracle::INIT_SPACE,
        seeds = [b"mock".as_ref(), &region_id.to_le_bytes()],
        bump
    )]
    pub mock: Account<'info, MockOracle>,
    pub system_program: Program<'info, System>,
}
