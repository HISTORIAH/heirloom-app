use quasar_lang::prelude::*;
use quasar_spl::{Mint, Token, TokenCpi, TokenInterface};

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

#[derive(Accounts)]
pub struct Revoke {
    #[account(
        mut,
        address = estate.authority,
    )]
    pub authority: Signer,

    pub heir: UncheckedAccount,

    #[account(mut, address = Estate::seeds(authority.address(), heir.address()))]
    pub estate: Account<Estate>,

    #[account(mut, address = Vault::seeds(authority.address(), heir.address()))]
    pub vault: Account<Vault>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub mint: Option<Account<Mint>>,

    pub rent: Sysvar<Rent>,

    pub token_program: Interface<TokenInterface>,

    pub system_program: Program<SystemProgram>,
}

impl Revoke {
    #[inline(always)]
    pub fn revoke_handler(ctx: &mut Ctx<Revoke>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        // return funds to authority
        ctx.accounts.return_assets(&ctx.bumps)?;

        // close estate and vault, rent lamports go back to authority
        let authority_view = ctx.accounts.authority.to_account_view();

        let remaining = ctx.accounts.estate.claimable_assets.saturating_sub(1);
        ctx.accounts.estate.claimable_assets = remaining;

        if remaining == 0 {
            crate::helpers::close_account(&mut ctx.accounts.estate, authority_view)?;
            crate::helpers::close_account(&mut ctx.accounts.vault, authority_view)?;
        }

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        // cannot revoke an already claimed estate
        if self.estate.is_claimed.get() {
            return Err(HeirloomError::AlreadyClaimed.into());
        }

        match self.mint.as_ref() {
            Some(mint) => {
                let vault_token_account = self
                    .vault_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                let authority_token_account = self
                    .authority_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                // vault token account must be owned by vault
                if vault_token_account.owner() != self.vault.address() {
                    return Err(HeirloomError::InvalidAccount.into());
                }

                require_eq!(
                    authority_token_account.mint(),
                    mint.address(),
                    HeirloomError::MintMismatch
                );
                require_eq!(
                    vault_token_account.mint(),
                    mint.address(),
                    HeirloomError::MintMismatch
                );
            }
            None => {
                // SOL revoke drains all vault lamports — must be last, after all tokens are revoked
                if self.authority_token_account.is_none() && self.estate.claimable_assets > 1 {
                    return Err(HeirloomError::TooManyClaimableAssets.into());
                }
            }
        }

        // // token accounts must all be present together
        // if self.authority_token_account.is_some()
        //     && (self.vault_token_account.is_none() || self.mint.is_none())
        // {
        //     return Err(HeirloomError::MissingTokenAccounts.into());
        // }

        // // vault token account must be owned by vault PDA
        // if let Some(vault_ta) = self.vault_token_account.as_ref() {
        //     if vault_ta.owner() != self.vault.address() {
        //         return Err(HeirloomError::InvalidAccount.into());
        //     }
        // }

        // // token accounts must all be present together — check mint too, not just authority TA
        // if self.vault_token_account.is_some() && self.mint.is_none() {
        //     return Err(HeirloomError::MissingTokenAccounts.into());
        // }

        // // SOL revoke drains all vault lamports — must be last, after all tokens are revoked
        // if self.authority_token_account.is_none() && self.estate.claimable_assets > 1 {
        //     return Err(HeirloomError::TooManyClaimableAssets.into());
        // }

        Ok(())
    }

    #[inline(always)]
    pub fn return_assets(&self, revoke_ix_bumps: &RevokeBumps) -> Result<(), ProgramError> {
        match self.authority_token_account.as_ref() {
            Some(authority_ta) => {
                let vault_token_account = self.vault_token_account.as_ref().unwrap();
                let mint = self.mint.as_ref().unwrap();
                let amount = vault_token_account.amount();

                // signer seeds
                let bump = [revoke_ix_bumps.vault];
                let vault_seeds = [
                    Seed::from(b"vault" as &[u8]),
                    Seed::from(self.authority.address().as_ref()),
                    Seed::from(self.heir.address().as_ref()),
                    Seed::from(bump.as_ref()),
                ];

                self.token_program
                    .transfer_checked(
                        vault_token_account,
                        mint,
                        authority_ta,
                        &self.vault,
                        amount,
                        mint.decimals(),
                    )
                    .invoke_signed(&vault_seeds)?;

                // close vault token account, rent back to authority
                self.token_program
                    .close_account(vault_token_account, &self.authority, &self.vault)
                    .invoke_signed(&vault_seeds)?;
            }
            // SOL path: drain vault lamports back to authority
            None => {
                let vault_view = self.vault.to_account_view();
                let authority_view = self.authority.to_account_view();
                let amount = vault_view.lamports();

                set_lamports(vault_view, 0);
                set_lamports(authority_view, authority_view.lamports() + amount);
            }
        }

        Ok(())
    }
}
