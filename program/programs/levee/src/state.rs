use crate::constants::{MAX_BENEFICIARIES, MAX_NOTE_LEN};
use anchor_lang::prelude::*;

/// The Vault holds the USDC relief pool. Its PDA is the authority of
/// `vault_token_account`, so only this program can move pooled funds — and only
/// through `execute_payout`. Anyone may `deposit` into it.
#[account]
#[derive(InitSpace)]
pub struct VaultState {
    /// Admin allowed to initialize regions / manage registries.
    pub admin: Pubkey,
    /// USDC mint this vault denominates (devnet USDC by default).
    pub usdc_mint: Pubkey,
    /// The token account (owned/authority = this PDA) that holds the pool.
    pub vault_token_account: Pubkey,
    pub bump: u8,
}

/// Per-region risk + payout policy. The threshold is committed once and locked.
/// This account is the AUTHORITATIVE source of truth the agent must obey.
#[account]
#[derive(InitSpace)]
pub struct RegionConfig {
    pub region_id: u16,
    /// Admin authority that initialized this region.
    pub authority: Pubkey,
    /// Switchboard On-Demand pull feed that publishes this region's risk score.
    pub oracle_feed: Pubkey,
    /// Trigger threshold in basis points (risk_score * 10_000). IMMUTABLE.
    pub threshold_bps: u16,
    /// Per-beneficiary payout, in USDC base units (6 decimals).
    pub payout_amount: u64,
    /// Lifetime cap on total disbursed for this region, in USDC base units.
    pub cap: u64,
    /// Minimum seconds between triggers.
    pub cooldown_seconds: i64,
    /// Max age (seconds) of the oracle result before it is considered stale.
    pub max_staleness_seconds: i64,
    /// Minimum number of oracle samples required.
    pub min_oracle_samples: u32,
    /// Unix timestamp of the last successful trigger (0 = never).
    pub last_triggered_at: i64,
    /// Running total disbursed for this region (base units), enforced vs `cap`.
    pub total_paid_out: u64,
    /// Monotonic counter used as the DecisionLog PDA seed.
    pub decision_count: u64,
    /// Once true the threshold can never be changed.
    pub threshold_locked: bool,
    pub bump: u8,
}

/// The set of community wallets eligible to receive relief for a region.
/// `beneficiaries` are OWNER wallet pubkeys; at payout time each provided token
/// account's `.owner` must be present here, else `UnauthorizedBeneficiary`.
#[account]
#[derive(InitSpace)]
pub struct BeneficiaryRegistry {
    pub region_id: u16,
    pub authority: Pubkey,
    #[max_len(MAX_BENEFICIARIES)]
    pub beneficiaries: Vec<Pubkey>,
    pub bump: u8,
}

/// An immutable, on-chain record of one evaluation cycle — written every loop
/// by the agent via `log_decision`, whether or not a payout occurred.
#[account]
#[derive(InitSpace)]
pub struct DecisionLog {
    pub region_id: u16,
    pub sequence: u64,
    /// Risk score used for the decision, in basis points.
    pub risk_bps: u16,
    /// Threshold in effect at decision time, in basis points.
    pub threshold_bps: u16,
    pub triggered: bool,
    /// Total USDC disbursed in this cycle (base units), 0 if not triggered.
    pub payout_total: u64,
    /// Oracle result timestamp the decision relied on (0 if none).
    pub oracle_timestamp: i64,
    /// When the decision was recorded on-chain.
    pub evaluated_at: i64,
    /// Short human-readable note (e.g. dominant contributing factor).
    #[max_len(MAX_NOTE_LEN)]
    pub note: String,
    pub bump: u8,
}

/// Mock oracle account used by the test suite to drive the payout logic on a
/// local validator without a live Switchboard feed.
///
/// It is compiled in ALL builds (Anchor's `#[program]` macro cannot reference a
/// `#[cfg]`-gated instruction's client-accounts module). That is safe: only the
/// ORACLE READER is feature-gated — a production build parses real Switchboard
/// pull feeds and NEVER trusts a MockOracle account. For a hardened mainnet
/// deploy, delete `MockOracle` + `set_mock_oracle` entirely.
#[account]
#[derive(InitSpace)]
pub struct MockOracle {
    pub region_id: u16,
    /// Risk value in basis points (0..=10_000).
    pub value_bps: u64,
    /// Unix timestamp of the "result".
    pub timestamp: i64,
    pub num_samples: u32,
    pub bump: u8,
}
