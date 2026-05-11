#![cfg_attr(not(test), no_std)]

use quasar_lang::prelude::*;

mod constants;
mod errors;
mod ika_cpi;
mod instructions;
mod state;

// NOTE: The CPI authority PDA is derived from this program ID:
//   PDA([b"__ika_cpi_authority"], this_program_id)
// The dWallet authority must be transferred to this PDA before initialize.
declare_id!("GmUKHL8q1htYdKHT5YQho8zA6hdqqo8QNqfnTHyWzpwa");

#[program]
mod heirloom_ika_program {
    use super::*;
    use crate::instructions::claim::Claim;
    use crate::instructions::heartbeat::Heartbeat;
    use crate::instructions::initialize::Initialize;
    use crate::instructions::revoke::Revoke;

    /// Initialize a new multi-chain estate.
    ///
    /// Prerequisites (client-side):
    /// 1. DKG completed via Ika gRPC — dWallet PDA created on-chain.
    /// 2. dWallet authority transferred to this program's CPI authority PDA
    ///    (PDA seeds: [b"__ika_cpi_authority"]).
    ///
    /// This instruction simply stores the estate policy data.
    #[instruction(discriminator = 0)]
    pub fn initialize(
        ctx: Ctx<Initialize>,
        estate_id: Address,
        dwallet_pda: Address,
        public_key: [u8; 33],
        public_key_len: u8,
        curve: u16,
        signature_scheme: u16,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        heir_address: String<64>,
        label: String<32>,
    ) -> Result<(), ProgramError> {
        log("ix: initialize");
        Initialize::initialize_handler(
            &mut ctx,
            estate_id,
            dwallet_pda,
            public_key,
            public_key_len,
            curve,
            signature_scheme,
            heartbeat_interval,
            grace_period,
            pause_duration,
            heir_address,
            label,
        )
    }

    /// Refresh the heartbeat timestamp.
    /// Anyone can call this via a relayer; no Ika interaction needed.
    #[instruction(discriminator = 1)]
    pub fn heartbeat(ctx: Ctx<Heartbeat>) -> Result<(), ProgramError> {
        log("ix: heartbeat");
        Heartbeat::heartbeat_handler(&mut ctx)
    }

    /// Claim assets.
    ///
    /// Verifies the estate is claimable, then CPI-calls the Ika dWallet
    /// program's `approve_message` instruction. This creates a
    /// MessageApproval PDA on-chain, which the heir then uses as an
    /// approval_proof when requesting the actual signature from Ika
    /// via gRPC.
    #[instruction(discriminator = 2)]
    pub fn claim(
        ctx: Ctx<Claim>,
        message_hash: [u8; 32],
        message_approval_bump: u8,
    ) -> Result<(), ProgramError> {
        log("ix: claim");
        Claim::claim_handler(&mut ctx, message_hash, message_approval_bump)
    }

    /// Revoke (emergency exit) before claim window opens.
    ///
    /// Similar to claim: CPI-calls Ika `approve_message` for a return
    /// transaction that sends assets back to the authority's address.
    #[instruction(discriminator = 3)]
    pub fn revoke(
        ctx: Ctx<Revoke>,
        message_hash: [u8; 32],
        message_approval_bump: u8,
    ) -> Result<(), ProgramError> {
        log("ix: revoke");
        Revoke::revoke_handler(&mut ctx, message_hash, message_approval_bump)
    }
}
