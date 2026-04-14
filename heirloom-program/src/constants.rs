/// Fee rate in basis points per day (1 bp = 0.01%).
/// e.g. 1 = 0.01%/day
pub const FEE_RATE_BPS_PER_DAY: u64 = 1;

/// Maximum fee for a normal claim, in basis points.
/// e.g. 200 = 2% cap
pub const MAX_CLAIM_FEE_BPS: u64 = 200;

/// Maximum fee for an emergency withdraw, in basis points.
/// Higher than claim to discourage premature withdrawals.
/// e.g. 500 = 5% cap
pub const MAX_WITHDRAW_FEE_BPS: u64 = 500;

pub const SECONDS_PER_DAY: u64 = 86_400;
pub const BPS_DENOMINATOR: u64 = 10_000;

// max length of label
pub const MAX_LABEL_LENGTH: usize = 32;
