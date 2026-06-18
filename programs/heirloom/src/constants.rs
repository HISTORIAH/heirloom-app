use anchor_lang::prelude::*;

pub const CLAIM_FEE_BPS: u16 = 75;
pub const EMERGENCY_EXIT_FEE_BPS: u16 = 50;

// TEMP! for testing
pub const TREASURY: Pubkey = pubkey!("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q");

// from: https://github.com/lulo-labs/lulo-v2-cpi/blob/8a5ef7fa489f44572f27aa2715b4bd706bd27c81/programs/defi_program/src/accts.rs#L6-L7
pub const LULO_MAIN_POOL_ADDRESS: Pubkey = pubkey!("A2qdjcuacp6gMVi8TxmEb2vsMZsHqCjM9CGjFeJ2bb2z");
