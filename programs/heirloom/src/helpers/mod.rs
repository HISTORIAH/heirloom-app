//! Shared helpers used across instructions.
//!
//! - `transfers`: moving SOL and tokens, the protocol fee split, NFT detection
//! - `integrations`: Lulo and Kamino CPI helpers and account bundles

pub mod integrations;
pub mod transfers;

pub use integrations::*;
pub(crate) use transfers::*;
