use anchor_lang::prelude::*;

/// Ika dWallet program ID
pub const IKA_DWALLET_PROGRAM_ID: Pubkey = pubkey!("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY");

/// Treasury address for protocol fees
pub const TREASURY_ADDRESS: Pubkey = pubkey!("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q");

/// Maximum label length
pub const LABEL_MAX_LEN: usize = 32;

/// Maximum heir/owner address length (sufficient for BTC bech32)
pub const HEIR_ADDR_MAX_LEN: usize = 64;

/// Secp256r1 precompile program address (SIMD-0075)
pub const SECP256R1_PROGRAM_ADDRESS: Pubkey =
    pubkey!("Secp256r1SigVerify1111111111111111111111111");
