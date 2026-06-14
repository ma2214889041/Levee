//! Oracle reader abstraction.
//!
//! `read_risk_bps` returns `(risk_bps, oracle_unix_timestamp)` for a region, or
//! a `StaleOracle` error if the data is too old / has too few samples.
//!
//! PRODUCTION (default features): reads a Switchboard On-Demand *pull feed*.
//! TEST (`--features mock-oracle`): reads a tiny `MockOracle` account that the
//! test harness writes directly, so the payout logic is fully exercisable on a
//! local validator without a live oracle.
//!
//! ⚠️ SECURITY: a single feed is a single point of failure. In production this
//! region should be backed by MULTIPLE INDEPENDENT oracles (e.g. several
//! Switchboard feeds from distinct operators, or Switchboard + Pyth) and this
//! reader should require agreement / a median across them before triggering a
//! payout. The single-feed path below is for the devnet demo only.

use crate::constants::RISK_SCALE;
use crate::errors::LeveeError;
use anchor_lang::prelude::*;

/// Result of an oracle read: risk in basis points and the result's unix ts.
pub struct OracleReading {
    pub risk_bps: u64,
    pub timestamp: i64,
}

#[cfg(not(feature = "mock-oracle"))]
pub fn read_risk_bps(
    feed_ai: &AccountInfo,
    clock: &Clock,
    max_staleness_seconds: i64,
    min_samples: u32,
) -> Result<OracleReading> {
    use rust_decimal::prelude::ToPrimitive;
    use rust_decimal::Decimal;
    use switchboard_on_demand::on_demand::accounts::pull_feed::PullFeedAccountData;

    // Parse the Switchboard On-Demand pull feed account (v0.3.x layout).
    let data = feed_ai.try_borrow_data()?;
    let feed =
        PullFeedAccountData::parse(data).map_err(|_| error!(LeveeError::OracleParseError))?;

    // Freshness by result timestamp (seconds). We check wall-clock age rather
    // than only slot age so it lines up with the maxStaleness configured in the
    // off-chain Switchboard job.
    let result_ts = feed.result_ts();
    let age = clock.unix_timestamp.saturating_sub(result_ts);
    require!(
        age >= 0 && age <= max_staleness_seconds,
        LeveeError::StaleOracle
    );

    // Require a minimum number of contributing samples.
    require!(
        (feed.result.num_samples as u32) >= min_samples,
        LeveeError::StaleOracle
    );

    // The current accepted result, as a Decimal in feed units. Our Switchboard
    // job emits the risk probability in [0,1].
    let value: Decimal = feed.result.value().ok_or(LeveeError::StaleOracle)?;
    let scaled = value
        .checked_mul(Decimal::from(RISK_SCALE))
        .ok_or(LeveeError::OracleParseError)?;
    let risk_bps = scaled
        .floor()
        .to_u64()
        .ok_or(LeveeError::OracleParseError)?
        .min(RISK_SCALE); // clamp to 100%

    Ok(OracleReading {
        risk_bps,
        timestamp: result_ts,
    })
}

#[cfg(feature = "mock-oracle")]
pub fn read_risk_bps(
    feed_ai: &AccountInfo,
    clock: &Clock,
    max_staleness_seconds: i64,
    min_samples: u32,
) -> Result<OracleReading> {
    use crate::state::MockOracle;

    // Deserialize the test-only MockOracle account.
    let data = feed_ai.try_borrow_data()?;
    let mock = MockOracle::try_deserialize(&mut &data[..])
        .map_err(|_| LeveeError::OracleParseError)?;

    let age = clock.unix_timestamp.saturating_sub(mock.timestamp);
    require!(
        age >= 0 && age <= max_staleness_seconds,
        LeveeError::StaleOracle
    );
    require!(mock.num_samples >= min_samples, LeveeError::StaleOracle);

    Ok(OracleReading {
        risk_bps: mock.value_bps.min(RISK_SCALE),
        timestamp: mock.timestamp,
    })
}
