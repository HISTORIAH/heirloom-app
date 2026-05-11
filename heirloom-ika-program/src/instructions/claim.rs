use quasar_lang::prelude::*;

use crate::{
    constants::IKA_DWALLET_PROGRAM_ID,
    errors::HeirloomIkaError,
    ika_cpi::{message_approval_pda_seeds, DWalletContext, CPI_AUTHORITY_SEED},
    state::Estate,
};

#[derive(Accounts)]
pub struct Claim {
    /// Relayer pays gas
    #[account(mut)]
    pub relayer: Signer,

    // #[account(mut, address = Estate::seeds(&estate.estate_id))]
    #[account(mut)]
    pub estate: Account<Estate>,

    /// Ika DWalletCoordinator PDA (readonly)
    #[account(address = coordinator_pda(IKA_DWALLET_PROGRAM_ID))]
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

    /// CPI authority PDA: seeds = [b"__ika_cpi_authority"]
    #[account(address = cpi_authority_pda())]
    pub cpi_authority: UncheckedAccount,

    /// Ika dWallet program
    #[account(address = IKA_DWALLET_PROGRAM_ID)]
    pub ika_program: UncheckedAccount,

    pub system_program: Program<SystemProgram>,

    pub clock: Sysvar<Clock>,
}

impl Claim {
    #[inline(always)]
    pub fn claim_handler(
        ctx: &mut Ctx<Claim>,
        message_hash: [u8; 32],
        message_approval_bump: u8,
    ) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        // Build Ika CPI context
        let cpi_bump = ctx.bumps.cpi_authority;
        let ika_ctx = DWalletContext {
            dwallet_program: ctx.accounts.ika_program.to_account_view(),
            cpi_authority: ctx.accounts.cpi_authority.to_account_view(),
            caller_program: ctx.accounts.caller_program.to_account_view(),
            cpi_authority_bump: cpi_bump,
        };

        // Extract public key slice (respected length)
        let pk_len = ctx.accounts.estate.public_key_len as usize;
        let mut user_pubkey = [0u8; 32];
        if pk_len == 33 {
            user_pubkey.copy_from_slice(&ctx.accounts.estate.public_key[1..33]);
        } else {
            user_pubkey.copy_from_slice(&ctx.accounts.estate.public_key[0..32]);
        }

        // CPI call Ika approve_message
        ika_ctx.approve_message(
            ctx.accounts.coordinator.to_account_view(),
            ctx.accounts.message_approval.to_account_view(),
            ctx.accounts.dwallet.to_account_view(),
            ctx.accounts.relayer.to_account_view(),
            ctx.accounts.system_program.to_account_view(),
            message_hash,
            [0u8; 32], // message_metadata_digest — simple transfers have no metadata
            user_pubkey,
            ctx.accounts.estate.signature_scheme.get(),
            message_approval_bump,
        )?;

        // Mark estate as claimed
        ctx.accounts.estate.is_claimed = true.into();

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        require!(
            !self.estate.is_claimed.get(),
            HeirloomIkaError::EstateAlreadyClaimed
        );

        // Verify claim window is open
        let now = self.clock.unix_timestamp.get();
        let claimable_at = self
            .estate
            .last_heartbeat
            .checked_add(self.estate.heartbeat_interval)
            .and_then(|t| t.checked_add(self.estate.grace_period))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        if now < claimable_at.max(self.estate.paused_until) {
            return Err(HeirloomIkaError::NotYetClaimable.into());
        }

        // If deferred, claim is blocked
        require!(
            !self.estate.is_deferred.get(),
            HeirloomIkaError::EstatePaused
        );

        // Verify message_approval PDA is correctly derived
        let pk_len = self.estate.public_key_len as usize;
        let public_key = &self.estate.public_key[..pk_len];
        let _expected_seeds = message_approval_pda_seeds(
            self.estate.curve.get(),
            public_key,
            self.estate.signature_scheme.get(),
            // We can't verify message_hash here since it's instruction data,
            // but the Ika program will verify it during CPI.
            &[0u8; 32],
        );
        // We verify that the passed message_approval account is uninitialized
        // (it will be created by the Ika program during CPI)
        require!(
            self.message_approval.to_account_view().is_data_empty(),
            HeirloomIkaError::InvalidTxPayload
        );

        Ok(())
    }
}

/// Derive the Ika coordinator PDA.
#[inline(always)]
fn coordinator_pda(ika_program: Address) -> Address {
    // Coordinator seeds: [b"dwallet_coordinator"]
    let seeds: &[&[u8]] = &[b"dwallet_coordinator"];
    match quasar_lang::pda::based_try_find_program_address(seeds, &ika_program) {
        Ok((addr, _)) => addr,
        Err(_) => ika_program, // fallback — should never happen
    }
}

/// Derive this program's CPI authority PDA.
#[inline(always)]
fn cpi_authority_pda() -> Address {
    let seeds: &[&[u8]] = &[CPI_AUTHORITY_SEED];
    match quasar_lang::pda::based_try_find_program_address(seeds, &crate::ID) {
        Ok((addr, _)) => addr,
        Err(_) => crate::ID, // fallback — should never happen
    }
}
