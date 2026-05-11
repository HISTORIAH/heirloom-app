use quasar_lang::prelude::*;

#[error_code]
pub enum HeirloomIkaError {
    InvalidDWalletPda,
    InvalidPublicKey,
    InvalidCurve,
    InvalidSignatureScheme,
    InvalidHeirAddress,
    EstateAlreadyClaimed,
    NotYetClaimable,
    EstatePaused,
    HeartbeatTooSoon,
    InvalidTxPayload,
    Unauthorized,
    MathOverflow,
    InvalidProgram,
    InvalidCoordinator,
    InvalidCpiAuthority,
    DWalletNotOwnedByIka,
}
