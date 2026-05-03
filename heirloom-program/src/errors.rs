use quasar_lang::prelude::*;

#[error_code]
pub enum HeirloomError {
    Unauthorized,
    AlreadyClaimed,
    NotYetClaimable,
    MintMismatch,
    MissingTokenAccounts,
    InsufficientVaultBalance,
    AlreadyDeferred,
    DeferWindowExpired,
    ClaimDefferred,
    MismatchedAddress,
    EstatePaused,
    MissingAccount,
    InvalidAccount,
    ClaimableAssetsRemaining,
    ZeroDepositAmount,
    TooManyClaimableAssets,
    LabelTooLong,
    MathOverflow,
}
