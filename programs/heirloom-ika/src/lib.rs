pub mod constants;
pub mod error;
pub mod helpers;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use solana_security_txt::security_txt;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("9ede3aHXJiv14BNT67MWpgFGugtP1PSdBuLDuRX2D4sf");

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Heirloom Ika Program",
    project_url: "https://heirlm.xyz/",
    contacts: "email:info@heirlm.xyz, twitter:@heirloom_app",
    policy: "https://github.com/HISTORIAH/Heirloom-app",
    preferred_languages: "en",
    source_code: "https://github.com/HISTORIAH/Heirloom-app"
}

#[program]
pub mod heirloom_ika {
    use super::*;

    /// Initialize a new multi-chain estate.
    ///
    /// Prerequisites (client-side):
    /// 1. DKG completed via Ika gRPC — dWallet PDA created on-chain.
    /// 2. dWallet authority transferred to this program's CPI authority PDA
    ///    (PDA seeds: [b"__ika_cpi_authority"]).
    ///
    /// This instruction simply stores the estate policy data.
    pub fn initialize(
        ctx: Context<Initialize>,
        dwallet_pda: Pubkey,
        public_key: [u8; 33],
        public_key_len: u8,
        curve: u16,
        signature_scheme: u16,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        passkey_pubkey: [u8; 33],
        owner_address: String,
        heir_address: String,
        label: String,
    ) -> Result<()> {
        Initialize::initialize_handler(
            ctx,
            dwallet_pda,
            public_key,
            public_key_len,
            curve,
            signature_scheme,
            heartbeat_interval,
            grace_period,
            pause_duration,
            passkey_pubkey,
            owner_address,
            heir_address,
            label,
        )
    }

    /// Refresh the heartbeat timestamp.
    /// Anyone can call this via a relayer; no Ika interaction needed.
    pub fn heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
        Heartbeat::heartbeat_handler(ctx)
    }

    /// Claim assets.
    ///
    /// Verifies the estate is claimable, then CPI-calls the Ika dWallet
    /// program's `approve_message` instruction. This creates a
    /// MessageApproval PDA on-chain, which the heir then uses as an
    /// approval_proof when requesting the actual signature from Ika
    /// via gRPC.
    pub fn claim(
        ctx: Context<Claim>,
        message_hash: [u8; 32],
        message_approval_bump: u8,
    ) -> Result<()> {
        Claim::claim_handler(ctx, message_hash, message_approval_bump)
    }

    /// Revoke (emergency exit) before claim window opens.
    ///
    /// Similar to claim: CPI-calls Ika `approve_message` for a return
    /// transaction that sends assets back to the authority's address.
    pub fn revoke(
        ctx: Context<Revoke>,
        message_hash: [u8; 32],
        message_approval_bump: u8,
    ) -> Result<()> {
        Revoke::revoke_handler(ctx, message_hash, message_approval_bump)
    }
}
