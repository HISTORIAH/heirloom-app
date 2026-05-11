pub const IKA_DWALLET_PROGRAM_ID: solana_address::Address =
    solana_address::address!("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY");

/// Treasury address for protocol fees
#[allow(dead_code)]
pub const TREASURY_ADDRESS: solana_address::Address =
    solana_address::address!("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q");

/// Maximum label length
#[allow(dead_code)]
pub const LABEL_MAX_LEN: usize = 32;

/// Maximum heir address length (sufficient for BTC bech32)
#[allow(dead_code)]
pub const HEIR_ADDR_MAX_LEN: usize = 64;
