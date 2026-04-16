use quasar_lang::prelude::*;
use quasar_spl::{Mint, Token, TokenCpi, TokenInterface};

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

/// Creates an ATA for the vault PDA for a given mint and increments claimable_assets.
/// Must be called by authority before heir can claim that token type.
#[derive(Accounts)]
pub struct RegisterAsset {
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump = estate.bump)]
    pub estate: Account<Estate>,

    #[account(seeds = Vault::seeds(authority, heir), bump = vault.bump)]
    pub vault: Account<Vault>,

    /// the token account to create, owned by vault PDA
    #[account(mut)]
    pub vault_token_account: InterfaceAccount<Token>,

    pub mint: Account<Mint>,

    pub token_program: Interface<TokenInterface>,

    pub rent: Sysvar<Rent>,

    pub system_program: Program<System>,
}

impl RegisterAsset {
    #[inline(always)]
    pub fn register_asset_handler<'a>(
        ctx: &mut Ctx<'a, RegisterAsset>,
    ) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        // create the vault token account owned by the vault PDA
        ctx.accounts
            .token_program
            .initialize_account3(
                &ctx.accounts.vault_token_account,
                &ctx.accounts.mint,
                ctx.accounts.vault.address(),
            )
            .invoke()?;

        // register the new asset on the estate
        ctx.accounts.estate.claimable_assets = ctx
            .accounts
            .estate
            .claimable_assets
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        if self.estate.is_claimed.get() {
            return Err(HeirloomError::AlreadyClaimed.into());
        }

        // vault token account must not already be initialized
        if !self.vault_token_account.to_account_view().is_data_empty() {
            return Err(HeirloomError::InvalidAccount.into());
        }

        Ok(())
    }
}
