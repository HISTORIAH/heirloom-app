use anchor_lang::prelude::*;

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

/// 10000 basis points = 100%
pub const BASIS_POINTS: u16 = 10_000;

/// Maximum number of heirs per vault
pub const MAX_HEIRS: usize = 10;

/// Guardian pause bonus: 30 days in seconds (2592000)
pub const GUARDIAN_PAUSE_BONUS: i64 = 2_592_000;
