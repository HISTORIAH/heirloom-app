use crate::constants::{
    BPS_DENOMINATOR, FEE_RATE_BPS_PER_DAY, MAX_CLAIM_FEE_BPS, MAX_WITHDRAW_FEE_BPS,
};

/// Calculates the protocol fee to deduct from `amount`.
///
/// `created_at` and `now` are Unix timestamps (seconds).
/// `max_fee_bps` controls the cap — use `MAX_CLAIM_FEE_BPS` for normal
/// claims and `MAX_WITHDRAW_FEE_BPS` for emergency withdrawals.
///
/// Returns `(fee, amount_after_fee)`.
pub fn calculate_fee(amount: u64, created_at: i64, now: i64, max_fee_bps: u64) -> (u64, u64) {
    let elapsed_secs = now.saturating_sub(created_at).max(0) as u64;
    let days_stored = elapsed_secs / crate::constants::SECONDS_PER_DAY;

    let accrued_bps = FEE_RATE_BPS_PER_DAY
        .saturating_mul(days_stored)
        .min(max_fee_bps);
    let fee = amount.saturating_mul(accrued_bps) / BPS_DENOMINATOR;

    (fee, amount.saturating_sub(fee))
}

pub fn claim_fee(amount: u64, created_at: i64, now: i64) -> (u64, u64) {
    calculate_fee(amount, created_at, now, MAX_CLAIM_FEE_BPS)
}

pub fn withdraw_fee(amount: u64, created_at: i64, now: i64) -> (u64, u64) {
    calculate_fee(amount, created_at, now, MAX_WITHDRAW_FEE_BPS)
}
