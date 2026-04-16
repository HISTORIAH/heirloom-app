use quasar_lang::prelude::*;

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

/// Authority closes the estate and vault, reclaiming rent.
/// All token assets (claimable_assets) must have been withdrawn first.
#[derive(Accounts)]
pub struct CloseEstate {
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump = estate.bump)]
    pub estate: Account<Estate>,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump = vault.bump)]
    pub vault: Account<Vault>,

    pub rent: Sysvar<Rent>,

    pub system_program: Program<System>,
}

impl CloseEstate {
    #[inline(always)]
    pub fn handler(ctx: &mut Ctx<CloseEstate>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        let authority_view = ctx.accounts.authority.to_account_view();
        crate::helpers::close_account(&mut ctx.accounts.estate, authority_view)?;
        crate::helpers::close_account(&mut ctx.accounts.vault, authority_view)?;

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
