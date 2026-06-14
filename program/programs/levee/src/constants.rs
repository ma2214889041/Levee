//! Program-wide constants. PDA seed prefixes MUST stay in sync with
//! `shared/src/index.ts` (SEEDS) so off-chain code derives the same addresses.

/// Risk scores are stored on-chain as integer basis points (0..=10_000).
pub const RISK_SCALE: u64 = 10_000;

/// Maximum number of beneficiaries a single region registry can hold.
/// Bounds the account size and the number of CPI transfers per payout.
pub const MAX_BENEFICIARIES: usize = 25;

/// Maximum length of the optional human-readable note stored on a DecisionLog.
pub const MAX_NOTE_LEN: usize = 80;

// ---- PDA seed prefixes -----------------------------------------------------
pub const VAULT_SEED: &[u8] = b"vault";
pub const REGION_SEED: &[u8] = b"region";
pub const BENEFICIARIES_SEED: &[u8] = b"beneficiaries";
pub const DECISION_SEED: &[u8] = b"decision";
