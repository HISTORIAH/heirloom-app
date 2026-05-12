use quasar_lang::prelude::*;

use crate::{errors::HeirloomIkaError, state::Estate};

#[derive(Accounts)]
pub struct Heartbeat {
    /// Relayer pays gas — has no authority over the estate
    #[allow(unused)]
    #[account(mut)]
    pub relayer: Signer,

    #[account(mut)]
    pub estate: Account<Estate>,

    pub clock: Sysvar<Clock>,

    /// Instructions sysvar — used to inspect the secp256r1 precompile instruction
    pub instructions: UncheckedAccount,
}

impl Heartbeat {
    #[inline(always)]
    pub fn heartbeat_handler(ctx: &mut Ctx<Heartbeat>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        let nonce = ctx.accounts.estate.heartbeat_nonce.get();
        verify_heartbeat_precompile(
            ctx.accounts.instructions.to_account_view(),
            &ctx.accounts.estate.passkey_pubkey,
        )?;

        let now = ctx.accounts.clock.unix_timestamp.get();
        ctx.accounts.estate.last_heartbeat = now.into();
        ctx.accounts.estate.heartbeat_nonce = (nonce + 1).into();
        ctx.accounts.estate.is_deferred = false.into();
        ctx.accounts.estate.paused_until = 0.into();

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        require!(
            !self.estate.is_claimed.get(),
            HeirloomIkaError::EstateAlreadyClaimed
        );

        let now = self.clock.unix_timestamp.get();
        let last = self.estate.last_heartbeat.get();
        if now < last + 60 {
            return Err(HeirloomIkaError::HeartbeatTooSoon.into());
        }

        if now < self.estate.paused_until.get() {
            return Err(HeirloomIkaError::EstatePaused.into());
        }

        require!(
            *self.instructions.address()
                == solana_address::address!(
                    "Sysvar1nstructions1111111111111111111111111"
                ),
            HeirloomIkaError::InvalidProgram
        );

        Ok(())
    }
}

/// Verify that instruction 0 is the secp256r1 precompile (SIMD-0075) and
/// that the pubkey in the instruction matches the estate's registered passkey.
fn verify_heartbeat_precompile(
    instructions_sysvar: &AccountView,
    expected_pubkey: &[u8; 33],
) -> Result<(), ProgramError> {
    // Safety: instructions sysvar is read-only and not writable in this tx.
    let sysvar_data = unsafe { instructions_sysvar.borrow_unchecked() };
    let (program_id, ix_data) = super::load_instruction_at(sysvar_data, 0)?;

    let secp256r1 = solana_address::address!("Secp256r1SigVerify1111111111111111111111111");
    if program_id != secp256r1.as_ref() {
        return Err(HeirloomIkaError::InvalidProgram.into());
    }

    // secp256r1 precompile data layout (SIMD-0075):
    //   [0]:      num_signatures (must be 1)
    //   [1..3]:   sig_offset (u16 LE)
    //   [3]:      sig_instruction_index
    //   [4..6]:   pubkey_offset (u16 LE)
    //   [6]:      pubkey_instruction_index
    //   [7..9]:   msg_offset (u16 LE)
    //   [9..11]:  msg_size (u16 LE)
    //   [11]:     msg_instruction_index
    //   [12..]:   packed data
    if ix_data.len() < 12 || ix_data[0] != 1 {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }

    let pubkey_offset = u16::from_le_bytes([ix_data[4], ix_data[5]]) as usize;
    if ix_data.len() < pubkey_offset + 33 {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }

    let precompile_pubkey = &ix_data[pubkey_offset..pubkey_offset + 33];
    if precompile_pubkey != expected_pubkey.as_ref() {
        return Err(HeirloomIkaError::Unauthorized.into());
    }

    Ok(())
}
