use anchor_lang::{address, prelude::*};

pub const CLAIM_FEE_BPS: u16 = 75;

pub const EMERGENCY_EXIT_FEE_BPS: u16 = 50;

pub const YIELD_FEE_BPS: u16 = 1000; // 10%

pub const MAX_INTERVAL_SECONDS: i64 = 31_536_000; // 365 days

// TEMP! for testing
pub const TREASURY: Address = address!("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q");

pub const KAMINO_PROGRAM_ID: Address = address!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

pub const KAMINO_FARMS_PROGRAM_ID: Address =
    address!("FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr");

pub const SCOPE_PRICES_PROGRAM_ID: Address =
    address!("HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ");

pub const KAMINO_PROTOCOL_AUTHORITY: Address =
    address!("4dg3naKuGezNCzNY2qrTFCzsNZG8hcdkzzNT5PFLZFLR");

pub const KAMINO_PROTOCOL_TOKEN_ACCOUNT: Address =
    address!("mZovrHTXASkL3jUE5Usqtgtau7iKF5dXStAwbAu1wyx");
