use quasar_lang::prelude::*;
use quasar_spl::{
    AssociatedTokenCpi, AssociatedTokenProgram, Mint, Token, TokenCpi, TokenInterface,
};

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

/// Registers a new asset on an existing estate and increments claimable_assets.
///
#[derive(Accounts)]
pub struct RegisterAsset {
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump = estate.bump)]
    pub estate: Account<Estate>,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump = vault.bump)]
    pub vault: Account<Vault>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub vault_token_account: Option<UncheckedAccount>,

    /// token path only
    pub mint: Option<Account<Mint>>,

    pub token_program: Interface<TokenInterface>,

    pub associated_token_program: Program<AssociatedTokenProgram>,

    pub rent: Sysvar<Rent>,

    pub system_program: Program<System>,
}

impl RegisterAsset {
    #[inline(always)]
    pub fn register_asset_handler(
        ctx: &mut Ctx<RegisterAsset>,
        amount: u64,
    ) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        // SOL path: amount must be non-zero
        if ctx.accounts.mint.is_none() {
            require!(amount > 0, HeirloomError::ZeroDepositAmount);
        }

        match ctx.accounts.mint.as_ref() {
            Some(mint) => {
                let vault_ta = ctx.accounts.vault_token_account.as_ref().unwrap();
                let authority_ta = ctx.accounts.authority_token_account.as_ref().unwrap();

                ctx.accounts
                    .associated_token_program
                    .create_idempotent(
                        ctx.accounts.authority.to_account_view(),
                        &vault_ta.to_account_view(),
                        ctx.accounts.vault.to_account_view(),
                        mint,
                        &ctx.accounts.system_program,
                        &ctx.accounts.token_program,
                    )
                    .invoke()?;

                // transfer assets
                ctx.accounts
                    .token_program
                    .transfer_checked(
                        authority_ta,
                        mint,
                        vault_ta,
                        &ctx.accounts.authority,
                        amount,
                        mint.decimals(),
                    )
                    .invoke()?;
            }
            None => {
                // SOL path: transfer lamports from authority to vault
                ctx.accounts
                    .system_program
                    .transfer(&ctx.accounts.authority, &ctx.accounts.vault, amount)
                    .invoke()?;
            }
        }

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

        match self.mint.as_ref() {
            Some(_mint) => {
                // token path: both authority TA and vault TA must be present
                self.authority_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                let vault_ta = self
                    .vault_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                if !vault_ta.to_account_view().is_data_empty() {
                    return Err(HeirloomError::InvalidAccount.into());
                }
            }
            None => {
                // SOL path: no token accounts expected
                if self.vault_token_account.is_some() || self.authority_token_account.is_some() {
                    return Err(HeirloomError::MissingTokenAccounts.into());
                }
            }
        }

        Ok(())
    }
}
