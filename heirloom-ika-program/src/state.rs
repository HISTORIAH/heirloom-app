use quasar_lang::prelude::*;

/// Estate account for multi-chain vaults.
/// PDA seeds: [b"ika_estate", estate_id: Address]
///
/// The dWallet itself is an account owned by the Ika dWallet program.
/// This estate stores the policy (heartbeat, heir) and a reference to
/// the dWallet PDA. The dWallet's authority must be this program's
/// CPI authority PDA (`["__ika_cpi_authority"]`).
#[account(discriminator = 1, set_inner)]
#[seeds(b"ika_estate", estate_id: Address)]
pub struct Estate {
    /// Unique identifier for this estate (client-generated)
    pub estate_id: Address,

    /// Ika dWallet PDA address (owned by Ika dWallet program)
    pub dwallet_pda: Address,

    /// Public key bytes from the dWallet (33 for compressed ECDSA, 32 for EdDSA)
    pub public_key: [u8; 33],

    /// Actual length of public_key (32 or 33)
    pub public_key_len: u8,

    /// Curve type: 0 = Secp256k1, 1 = Secp256r1, 2 = Curve25519, 3 = Ristretto
    pub curve: u16,

    /// Signature scheme: 0 = EcdsaKeccak256, 1 = EcdsaSha256, etc.
    pub signature_scheme: u16,

    /// Heartbeat interval in seconds
    pub heartbeat_interval: i64,

    /// Grace period in seconds
    pub grace_period: i64,

    /// Last heartbeat timestamp
    pub last_heartbeat: i64,

    /// Created at timestamp
    pub created_at: i64,

    /// Pause duration in seconds
    pub pause_duration: i64,

    /// Paused until timestamp (0 = not paused)
    pub paused_until: i64,

    /// Whether the estate has been claimed
    pub is_claimed: bool,

    /// Whether the estate has been deferred by a guardian
    pub is_deferred: bool,

    /// Bump
    pub bump: u8,

    /// Heir address on the target chain (e.g., ETH 20-byte address, BTC bech32)
    pub heir_address: String<64>,

    /// Label for the estate
    pub label: String<32>,
}
