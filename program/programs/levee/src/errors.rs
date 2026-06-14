use anchor_lang::prelude::*;

/// Custom program errors. The first four are the spec-mandated safety errors;
/// the rest guard the oracle / accounting invariants.
#[error_code]
pub enum LeveeError {
    #[msg("Risk score is below the on-chain threshold; no payout.")]
    ThresholdNotMet,
    #[msg("Region is still within its cooldown window; refusing to re-trigger.")]
    InCooldown,
    #[msg("Payout would exceed the region's lifetime cap.")]
    CapExceeded,
    #[msg("A target token account owner is not in the beneficiary registry.")]
    UnauthorizedBeneficiary,

    // ---- oracle / freshness ----
    #[msg("Oracle feed account does not match the one configured for this region.")]
    WrongOracleFeed,
    #[msg("Oracle data is stale or has too few samples; refusing to act.")]
    StaleOracle,
    #[msg("Failed to parse the oracle feed value.")]
    OracleParseError,

    // ---- config / accounting ----
    #[msg("Threshold is locked and cannot be changed after commitment.")]
    ThresholdLocked,
    #[msg("Beneficiary registry is full.")]
    RegistryFull,
    #[msg("Beneficiary already registered.")]
    BeneficiaryExists,
    #[msg("Beneficiary not found in registry.")]
    BeneficiaryNotFound,
    #[msg("No beneficiary token accounts were provided.")]
    NoBeneficiaries,
    #[msg("A provided token account has the wrong mint.")]
    WrongMint,
    #[msg("Arithmetic overflow.")]
    MathOverflow,
    #[msg("Unauthorized: signer is not the admin authority.")]
    Unauthorized,
}
