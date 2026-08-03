use anchor_lang::prelude::*;

#[error_code]
pub enum HeirloomError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Estate not yet claimable")]
    NotYetClaimable,
    #[msg("Mint mismatch")]
    MintMismatch,
    #[msg("Missing token accounts")]
    MissingTokenAccounts,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Estate already deferred")]
    AlreadyDeferred,
    #[msg("Defer window expired")]
    DeferWindowExpired,
    #[msg("Mismatched address")]
    MismatchedAddress,
    #[msg("Estate paused")]
    EstatePaused,
    #[msg("Invalid account")]
    InvalidAccount,
    #[msg("Zero deposit amount")]
    ZeroDepositAmount,
    #[msg("Resolve token assets first, then SOL.")]
    TokensFirst,
    #[msg("Label too long")]
    LabelTooLong,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Math underflow")]
    MathUnderflow,
    #[msg("Interval exceeds maximum of 365 days.")]
    IntervalTooLong,
    #[msg("Interval cannot be less than 0.")]
    IntervalNegative,
    #[msg("Cannot claim/close while funds are still deployed.")]
    FundsStillDeployed,
}
