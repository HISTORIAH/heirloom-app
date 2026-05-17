use anchor_lang::prelude::*;

#[error_code]
pub enum HeirloomIkaError {
    #[msg("Invalid dWallet PDA")]
    InvalidDWalletPda,
    #[msg("Invalid public key length")]
    InvalidPublicKey,
    #[msg("Invalid curve")]
    InvalidCurve,
    #[msg("Invalid signature scheme")]
    InvalidSignatureScheme,
    #[msg("Invalid heir or owner address")]
    InvalidHeirAddress,
    #[msg("Estate already claimed")]
    EstateAlreadyClaimed,
    #[msg("Estate not yet claimable")]
    NotYetClaimable,
    #[msg("Estate is paused")]
    EstatePaused,
    #[msg("Heartbeat called too soon")]
    HeartbeatTooSoon,
    #[msg("Invalid transaction payload")]
    InvalidTxPayload,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid program or sysvar address")]
    InvalidProgram,
    #[msg("Invalid coordinator")]
    InvalidCoordinator,
    #[msg("Invalid CPI authority")]
    InvalidCpiAuthority,
    #[msg("dWallet not owned by Ika")]
    DWalletNotOwnedByIka,
}
