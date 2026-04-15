use quasar_lang::prelude::*;

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

/// Authority closes the estate and vault, reclaiming rent.
/// All token assets (claimable_assets) must have been withdrawn first.
#[derive(Accounts)]
pub struct CloseEstate<'info> {
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump = estate.bump)]
    pub estate: Account<Estate<'info>>,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump = vault.bump)]
    pub vault: Account<Vault>,

    pub system_program: Program<System>,
}

impl CloseEstate<'_> {
    #[inline(always)]
    pub fn handler<'a>(ctx: &mut Ctx<'a, CloseEstate<'a>>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        let authority_view = ctx.accounts.authority.to_account_view();
        ctx.accounts.estate.close(authority_view)?;
        ctx.accounts.vault.close(authority_view)?;

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        // all token assets must be withdrawn before closing
        if self.estate.claimable_assets > 0 {
            return Err(HeirloomError::ClaimableAssetsRemaining.into());
        }

        Ok(())
    }
}
