use anchor_lang::prelude::*;

#[error_code]
pub enum StocksError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Plan is not yet recoverable")]
    NotYetRecoverable,
    #[msg("Plan already deferred")]
    AlreadyDeferred,
    #[msg("Defer window has expired")]
    DeferWindowExpired,
    #[msg("Mint mismatch")]
    MintMismatch,
    #[msg("Mismatched address")]
    MismatchedAddress,
    #[msg("Missing token accounts")]
    MissingTokenAccounts,
    #[msg("Invalid account")]
    InvalidAccount,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Interval exceeds maximum of 365 days.")]
    IntervalTooLong,
    #[msg("Interval cannot be less than 0.")]
    IntervalNegative,
    #[msg("Allocation must be between 1 and 10000 basis points.")]
    InvalidAllocation,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Math underflow")]
    MathUnderflow,
    #[msg("Destination cannot be the owner's own covered wallet.")]
    DestinationIsOwner,
    #[msg("Wrong plan mode for this instruction.")]
    WrongPlanMode,
    #[msg("Plan still has covered assets.")]
    PlanNotEmpty,
    #[msg("Label exceeds 16 bytes.")]
    LabelTooLong,

    // ---------------------------------------------------------------- issuer curation
    #[msg("This issuer is not registered or has been disabled.")]
    IssuerNotSupported,
    #[msg("Mint has no mint authority, so its issuer cannot be verified.")]
    MintAuthorityMissing,

    // ---------------------------------------------------------------- token-2022 guards
    #[msg("Mint freezes new accounts by default, so it cannot be covered.")]
    FrozenByDefaultMint,
    #[msg("Mint has an active transfer hook, which is not supported yet.")]
    TransferHookUnsupported,
    #[msg("Issuer has paused this mint; transfers are blocked until it resumes.")]
    AssetPaused,
    #[msg("Token account is frozen by the issuer.")]
    AccountFrozen,
    #[msg("Mint is non-transferable.")]
    NonTransferableMint,
    #[msg("Token account has CPI Guard enabled, which blocks delegate approval.")]
    CpiGuardEnabled,
    #[msg("Mint gained a permanent delegate after this asset was covered.")]
    PermanentDelegateAdded,

    // ---------------------------------------------------------------- coverage health
    #[msg("Plan is no longer the delegate on this token account.")]
    DelegateEvicted,
    #[msg("Delegated amount is too low to move the covered balance.")]
    DelegateAmountTooLow,
}
