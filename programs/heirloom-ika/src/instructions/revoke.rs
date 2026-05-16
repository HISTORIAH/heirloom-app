use crate::{
    constants::IKA_DWALLET_PROGRAM_ID,
    error::HeirloomIkaError,
    helpers::{load_ix_data, parse_eth_address_str},
    instructions::claim::cpi_authority_bump,
    state::Estate,
};
use anchor_lang::prelude::*;
use ika_dwallet_anchor::DWalletContext;

#[derive(Accounts)]
pub struct Revoke<'info> {
    /// Relayer pays gas
    #[account(mut)]
    pub relayer: Signer<'info>,

    #[account(
        mut,
        seeds = [Estate::SEED, estate.estate_id.as_ref()],
        bump = estate.bump,
    )]
    pub estate: Account<'info, Estate>,

    /// CHECK: Ika DWalletCoordinator PDA (readonly) — address verified in validate()
    pub coordinator: UncheckedAccount<'info>,

    /// CHECK: MessageApproval PDA to be created by Ika program (writable)
    #[account(mut)]
    pub message_approval: UncheckedAccount<'info>,

    /// CHECK: Ika dWallet account (readonly, must match estate.dwallet_pda)
    #[account(address = estate.dwallet_pda @ HeirloomIkaError::InvalidDWalletPda)]
    pub dwallet: UncheckedAccount<'info>,

    /// CHECK: This program's executable account (readonly)
    #[account(address = crate::ID @ HeirloomIkaError::InvalidProgram)]
    pub caller_program: UncheckedAccount<'info>,

    /// CHECK: CPI authority PDA — address verified in validate()
    pub cpi_authority: UncheckedAccount<'info>,

    /// CHECK: Ika dWallet program — address verified in validate()
    pub ika_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: Instructions sysvar — used to read the secp256k1 precompile instruction
    #[account(address = solana_instructions_sysvar::ID @ HeirloomIkaError::InvalidProgram)]
    pub instructions: UncheckedAccount<'info>,
}

impl<'info> Revoke<'info> {
    pub fn revoke_handler(
        ctx: Context<Revoke>,
        message_hash: [u8; 32],
        message_approval_bump: u8,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        // Verify secp256k1 precompile at ix[0]: recovered address == owner_address
        verify_owner_sig_precompile(
            &ctx.accounts.instructions,
            &ctx.accounts.estate.owner_address,
        )?;

        let pk_len = ctx.accounts.estate.public_key_len as usize;
        let mut user_pubkey = [0u8; 32];
        if pk_len == 33 {
            user_pubkey.copy_from_slice(&ctx.accounts.estate.public_key[1..33]);
        } else {
            user_pubkey.copy_from_slice(&ctx.accounts.estate.public_key[0..32]);
        }

        let cpi_authority_bump = cpi_authority_bump()?;

        let ika_ctx = DWalletContext {
            dwallet_program: ctx.accounts.ika_program.to_account_info(),
            cpi_authority: ctx.accounts.cpi_authority.to_account_info(),
            caller_program: ctx.accounts.caller_program.to_account_info(),
            cpi_authority_bump,
        };

        ika_ctx.approve_message(
            &ctx.accounts.coordinator.to_account_info(),
            &ctx.accounts.message_approval.to_account_info(),
            &ctx.accounts.dwallet.to_account_info(),
            &ctx.accounts.relayer.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            message_hash,
            [0u8; 32],
            user_pubkey,
            ctx.accounts.estate.signature_scheme,
            message_approval_bump,
        )?;

        ctx.accounts.estate.is_claimed = true;

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let claimable_at = self
            .estate
            .last_heartbeat
            .checked_add(self.estate.heartbeat_interval)
            .and_then(|t| t.checked_add(self.estate.grace_period))
            .ok_or(HeirloomIkaError::MathOverflow)?;

        // Revoke must happen before claim window opens
        require!(
            now < claimable_at.max(self.estate.paused_until),
            HeirloomIkaError::NotYetClaimable
        );

        require!(
            self.message_approval.try_borrow_data()?.is_empty(),
            HeirloomIkaError::InvalidTxPayload
        );

        // Verify coordinator PDA
        let expected_coordinator = super::claim::coordinator_pda()?;
        require_keys_eq!(
            self.coordinator.key(),
            expected_coordinator,
            HeirloomIkaError::InvalidProgram
        );

        // Verify CPI authority PDA
        let expected_cpi_authority = super::claim::cpi_authority_pda()?;
        require_keys_eq!(
            self.cpi_authority.key(),
            expected_cpi_authority,
            HeirloomIkaError::InvalidCpiAuthority
        );

        // Verify Ika program
        require_keys_eq!(
            self.ika_program.key(),
            IKA_DWALLET_PROGRAM_ID,
            HeirloomIkaError::InvalidProgram
        );

        Ok(())
    }
}

/// Verify that ix[0] is a secp256k1 precompile where the recovered ETH address
/// matches the estate's `owner_address` (stored as a hex string).
fn verify_owner_sig_precompile(
    instructions_sysvar: &UncheckedAccount,
    owner_address: &str,
) -> Result<()> {
    let sysvar_data = instructions_sysvar.try_borrow_data()?;
    let ix_data = load_ix_data(&sysvar_data, 0)?;

    require!(
        ix_data.len() >= 12 && ix_data[0] == 1,
        HeirloomIkaError::InvalidTxPayload
    );

    let eth_addr_offset = u16::from_le_bytes([ix_data[4], ix_data[5]]) as usize;
    require!(
        ix_data.len() >= eth_addr_offset + 20,
        HeirloomIkaError::InvalidTxPayload
    );

    let recovered_addr = &ix_data[eth_addr_offset..eth_addr_offset + 20];
    let owner_eth = parse_eth_address_str(owner_address.as_bytes())?;
    require!(
        recovered_addr == owner_eth.as_ref(),
        HeirloomIkaError::Unauthorized
    );

    Ok(())
}
