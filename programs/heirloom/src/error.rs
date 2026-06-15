use anchor_lang::prelude::*;

#[error_code]
pub enum HeirloomError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Estate already claimed")]
    AlreadyClaimed,
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
    #[msg("Claim deferred")]
    ClaimDeferred,
    #[msg("Mismatched address")]
    MismatchedAddress,
    #[msg("Estate paused")]
    EstatePaused,
    #[msg("Missing account")]
    MissingAccount,
    #[msg("Invalid account")]
    InvalidAccount,
    #[msg("Claimable assets still remaining")]
    ClaimableAssetsRemaining,
    #[msg("Zero deposit amount")]
    ZeroDepositAmount,
    #[msg("Too many claimable assets")]
    TooManyClaimableAssets,
    #[msg("Label too long")]
    LabelTooLong,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Math underflow")]
    MathUnderflow,
}
