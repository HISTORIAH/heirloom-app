use quasar_lang::{log, prelude::*};

use crate::{
    constants::IKA_DWALLET_PROGRAM_ID, errors::HeirloomIkaError, ika_cpi::DWalletContext,
    state::Estate,
};

#[derive(Accounts)]
pub struct Revoke {
    /// Relayer pays gas
    #[account(mut)]
    pub relayer: Signer,

    #[account(mut)]
    pub estate: Account<Estate>,

    /// Ika DWalletCoordinator PDA (readonly) — address verified in validate()
    pub coordinator: UncheckedAccount,

    /// MessageApproval PDA to be created by Ika program (writable)
    #[account(mut)]
    pub message_approval: UncheckedAccount,

    /// Ika dWallet account (readonly, must match estate.dwallet_pda)
    #[account(address = estate.dwallet_pda)]
    pub dwallet: UncheckedAccount,

    /// This program's executable account (readonly)
    #[account(address = crate::ID)]
    pub caller_program: UncheckedAccount,

    /// CPI authority PDA — address verified in validate()
    pub cpi_authority: UncheckedAccount,

    /// Ika dWallet program — address verified in validate()
    pub ika_program: UncheckedAccount,

    pub system_program: Program<SystemProgram>,

    pub clock: Sysvar<Clock>,

    /// Instructions sysvar — used to read the secp256k1 precompile instruction
    pub instructions: UncheckedAccount,
}

impl Revoke {
    #[inline(always)]
    pub fn revoke_handler(
        ctx: &mut Ctx<Revoke>,
        message_hash: [u8; 32],
        message_approval_bump: u8,
    ) -> Result<(), ProgramError> {
        ctx.accounts.validate(&message_hash)?;

        // Verify secp256k1 precompile at ix[0]: recovered address == owner_address
        verify_owner_sig_precompile(
            ctx.accounts.instructions.to_account_view(),
            &message_hash,
            ctx.accounts.estate.owner_address().as_bytes(),
        )?;

        // ctx.bumps.dwallet;
        let ika_ctx = DWalletContext {
            dwallet_program: ctx.accounts.ika_program.to_account_view(),
            cpi_authority: ctx.accounts.cpi_authority.to_account_view(),
            caller_program: ctx.accounts.caller_program.to_account_view(),
            cpi_authority_bump: super::cpi_authority_pda().1,
        };

        let pk_len = ctx.accounts.estate.public_key_len as usize;
        let mut user_pubkey = [0u8; 32];
        if pk_len == 33 {
            user_pubkey.copy_from_slice(&ctx.accounts.estate.public_key[1..33]);
        } else {
            user_pubkey.copy_from_slice(&ctx.accounts.estate.public_key[0..32]);
        }

        ika_ctx.approve_message(
            ctx.accounts.coordinator.to_account_view(),
            ctx.accounts.message_approval.to_account_view(),
            ctx.accounts.dwallet.to_account_view(),
            ctx.accounts.relayer.to_account_view(),
            ctx.accounts.system_program.to_account_view(),
            message_hash,
            [0u8; 32],
            user_pubkey,
            ctx.accounts.estate.signature_scheme.get(),
            message_approval_bump,
        )?;

        ctx.accounts.estate.is_claimed = true.into();

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self, _message_hash: &[u8; 32]) -> Result<(), ProgramError> {
        // require!(
        //     !self.estate.is_claimed.get(),
        //     HeirloomIkaError::EstateAlreadyClaimed
        // );

        let now = self.clock.unix_timestamp.get();
        let claimable_at = self
            .estate
            .last_heartbeat
            .checked_add(self.estate.heartbeat_interval)
            .and_then(|t| t.checked_add(self.estate.grace_period))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        // ? should we allow this
        // Revoke must happen before claim window opens
        if now >= claimable_at.max(self.estate.paused_until) {
            return Err(HeirloomIkaError::NotYetClaimable.into());
        }

        require!(
            self.message_approval.to_account_view().is_data_empty(),
            HeirloomIkaError::InvalidTxPayload
        );

        require!(
            *self.instructions.address()
                == solana_address::address!("Sysvar1nstructions1111111111111111111111111"),
            HeirloomIkaError::InvalidProgram
        );

        require!(
            *self.coordinator.address() == super::coordinator_pda(),
            HeirloomIkaError::InvalidProgram
        );

        require!(
            *self.cpi_authority.address() == super::cpi_authority_pda().0,
            HeirloomIkaError::InvalidProgram
        );

        require!(
            *self.ika_program.address() == IKA_DWALLET_PROGRAM_ID,
            HeirloomIkaError::InvalidProgram
        );

        Ok(())
    }
}

/// Verify that ix[0] is a secp256k1 precompile where the recovered ETH address
/// matches the estate's `owner_address` (stored as a hex string).
///
/// The owner signs with MetaMask personal_sign (EIP-191 prefix applied by the wallet).
/// We verify only the recovered address; message binding comes from the MessageApproval PDA.
fn verify_owner_sig_precompile(
    instructions_sysvar: &AccountView,
    _message_hash: &[u8; 32],
    owner_address: &[u8],
) -> Result<(), ProgramError> {
    // Safety: instructions sysvar is read-only and not writable in this tx.
    let sysvar_data = unsafe { instructions_sysvar.borrow_unchecked() };
    let ix_data = super::load_ix_data(sysvar_data, 0)?;

    if ix_data.len() < 12 || ix_data[0] != 1 {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }

    let eth_addr_offset = u16::from_le_bytes([ix_data[4], ix_data[5]]) as usize;
    if ix_data.len() < eth_addr_offset + 20 {
        return Err(HeirloomIkaError::InvalidTxPayload.into());
    }

    let recovered_addr = &ix_data[eth_addr_offset..eth_addr_offset + 20];
    let owner_eth = super::parse_eth_address_str(owner_address)?;
    if recovered_addr != owner_eth.as_ref() {
        return Err(HeirloomIkaError::Unauthorized.into());
    }

    Ok(())
}
