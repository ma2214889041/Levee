use anchor_lang::prelude::*;

/// Emitted on every successful payout so indexers/auditors get a cheap,
/// real-time signal in addition to the persistent DecisionLog account.
#[event]
pub struct PayoutExecuted {
    pub region_id: u16,
    pub risk_bps: u64,
    pub threshold_bps: u16,
    pub beneficiary_count: u32,
    pub payout_total: u64,
    pub oracle_timestamp: i64,
    pub triggered_at: i64,
}

/// Emitted by `log_decision` for every evaluation cycle (triggered or not).
#[event]
pub struct DecisionRecorded {
    pub region_id: u16,
    pub sequence: u64,
    pub risk_bps: u16,
    pub threshold_bps: u16,
    pub triggered: bool,
    pub payout_total: u64,
    pub evaluated_at: i64,
}
