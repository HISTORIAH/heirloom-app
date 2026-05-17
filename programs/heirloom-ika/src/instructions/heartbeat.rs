use anchor_lang::prelude::*;

use crate::{
    constants::SECP256R1_PROGRAM_ADDRESS, error::HeirloomIkaError, helpers::load_instruction_at,
    state::Estate,
};

#[derive(Accounts)]
pub struct Heartbeat<'info> {
    /// Relayer pays gas — has no authority over the estate
    #[account(mut)]
    pub relayer: Signer<'info>,

    #[account(
        mut,
        seeds = [Estate::SEED, estate.estate_id.as_ref()],
        bump = estate.bump,
    )]
    pub estate: Account<'info, Estate>,

    /// CHECK: Instructions sysvar — used to inspect the secp256r1 precompile instruction
    #[account(address = solana_instructions_sysvar::ID @ HeirloomIkaError::InvalidProgram)]
    pub instructions: UncheckedAccount<'info>,
}

impl<'info> Heartbeat<'info> {
    pub fn heartbeat_handler(ctx: Context<Heartbeat>) -> Result<()> {
        ctx.accounts.validate()?;

        let nonce = ctx.accounts.estate.heartbeat_nonce;
        verify_heartbeat_precompile(
            &ctx.accounts.instructions,
            &ctx.accounts.estate.passkey_pubkey,
        )?;

        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.estate.last_heartbeat = now;
        ctx.accounts.estate.heartbeat_nonce =
            nonce.checked_add(1).ok_or(HeirloomIkaError::MathOverflow)?;
        ctx.accounts.estate.is_deferred = false;
        ctx.accounts.estate.paused_until = 0;

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        require!(
            !self.estate.is_claimed,
            HeirloomIkaError::EstateAlreadyClaimed
        );

        let now = Clock::get()?.unix_timestamp;

        require!(
            now >= self.estate.paused_until,
            HeirloomIkaError::EstatePaused
        );

        Ok(())
    }
}

/// Verify that instruction 0 is the secp256r1 precompile (SIMD-0075) and
/// that the pubkey in the instruction matches the estate's registered passkey.
fn verify_heartbeat_precompile(
    instructions_sysvar: &UncheckedAccount,
    expected_pubkey: &[u8; 33],
) -> Result<()> {
    let sysvar_data = instructions_sysvar.try_borrow_data()?;
    let (program_id, ix_data) = load_instruction_at(&sysvar_data, 0)?;

    require_keys_eq!(
        Pubkey::try_from(program_id).map_err(|_| HeirloomIkaError::InvalidProgram)?,
        SECP256R1_PROGRAM_ADDRESS,
        HeirloomIkaError::InvalidProgram
    );

    // secp256r1 precompile data layout (SIMD-0075):
    //   [0]:       num_signatures (must be 1)
    //   [1]:       padding
    //   [2..4]:    signature_offset (u16 LE)
    //   [4..6]:    signature_instruction_index (u16 LE)
    //   [6..8]:    public_key_offset (u16 LE)
    //   [8..10]:   public_key_instruction_index (u16 LE)
    //   [10..12]:  message_data_offset (u16 LE)
    //   [12..14]:  message_data_size (u16 LE)
    //   [14..16]:  message_instruction_index (u16 LE)
    //   [16..]:    packed data (pubkey first, then signature, then message)
    require!(
        ix_data.len() >= 16 && ix_data[0] == 1,
        HeirloomIkaError::InvalidTxPayload
    );

    let pubkey_offset = u16::from_le_bytes([ix_data[6], ix_data[7]]) as usize;
    require!(
        ix_data.len() >= pubkey_offset + 33,
        HeirloomIkaError::InvalidTxPayload
    );

    let precompile_pubkey = &ix_data[pubkey_offset..pubkey_offset + 33];
    require!(
        precompile_pubkey == expected_pubkey.as_ref(),
        HeirloomIkaError::Unauthorized
    );

    Ok(())
}
