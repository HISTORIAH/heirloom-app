use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Caller is not a registered heir")]
    NotHeir,
    #[msg("Caller is not the guardian")]
    NotGuardian,
    #[msg("Vault not found")]
    VaultNotFound,
    #[msg("Vault is not yet claimable")]
    VaultNotClaimable,
    #[msg("Heir has already claimed")]
    AlreadyClaimed,
    #[msg("Heir splits do not sum to 10000 basis points")]
    InvalidSplits,
    #[msg("Vault already exists for this owner")]
    VaultAlreadyExists,
    #[msg("Vault has been fully distributed")]
    VaultDistributed,
    #[msg("Guardian pause has already been used")]
    GuardianPauseUsed,
    #[msg("Vault is not in grace period")]
    NotInGrace,
    #[msg("Deposit amount must be greater than zero")]
    NoBalance,
    #[msg("Not the vault owner")]
    NotOwner,
    #[msg("Must have at least one heir")]
    NoHeirs,
    #[msg("Token mint does not match vault configuration")]
    InvalidMint,
    #[msg("Arithmetic overflow")]
    Overflow,
}
