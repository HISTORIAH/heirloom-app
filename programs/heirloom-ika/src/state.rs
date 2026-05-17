use anchor_lang::prelude::*;

/// Estate account for multi-chain vaults.
/// PDA seeds: [b"ika_estate", estate_id: Pubkey]
///
/// The dWallet itself is an account owned by the Ika dWallet program.
/// This estate stores the policy (heartbeat, heir) and a reference to
/// the dWallet PDA. The dWallet's authority must be this program's
/// CPI authority PDA (`["__ika_cpi_authority"]`).
#[account]
pub struct Estate {
    /// Unique identifier for this estate (client-generated)
    pub estate_id: Pubkey,

    /// Ika dWallet PDA address (owned by Ika dWallet program)
    pub dwallet_pda: Pubkey,

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

    /// Passkey public key (P-256 compressed, always 33 bytes)
    pub passkey_pubkey: [u8; 33],

    /// Monotonic counter incremented on each heartbeat — prevents replay attacks
    pub heartbeat_nonce: u64,

    /// Heir address on the target chain (e.g., ETH 20-byte address, BTC bech32)
    pub heir_address: String,

    /// Label for the estate
    pub label: String,

    /// Owner's address on the target chain (hex string, e.g. "0x..." for ETH)
    pub owner_address: String,
}

impl Estate {
    pub const SEED: &[u8] = b"ika_estate";

    pub const LEN: usize = 8      // discriminator
        + 32                      // estate_id
        + 32                      // dwallet_pda
        + 33                      // public_key
        + 1                       // public_key_len
        + 2                       // curve
        + 2                       // signature_scheme
        + 8                       // heartbeat_interval
        + 8                       // grace_period
        + 8                       // last_heartbeat
        + 8                       // created_at
        + 8                       // pause_duration
        + 8                       // paused_until
        + 1                       // is_claimed
        + 1                       // is_deferred
        + 1                       // bump
        + 33                      // passkey_pubkey
        + 8                       // heartbeat_nonce
        + 4 + 64                  // heir_address (String: 4 len + 64 max)
        + 4 + 32                  // label (String: 4 len + 32 max)
        + 4 + 64; // owner_address (String: 4 len + 64 max)
}
