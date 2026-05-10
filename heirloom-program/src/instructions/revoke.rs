use quasar_lang::prelude::*;
use quasar_spl::{
    AssociatedTokenCpi, AssociatedTokenProgram, Mint, Token, TokenCpi, TokenInterface,
};

use crate::{
    constants::{EMERGENCY_EXIT_FEE_BPS, TREASURY_ADDRESS},
    errors::HeirloomError,
    helpers::calculate_distribution,
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

    #[account(mut, address = TREASURY_ADDRESS)]
    pub treasury: UncheckedAccount,

    #[account(mut)]
    pub treasury_token_account: Option<UncheckedAccount>,

    pub rent: Sysvar<Rent>,

    pub token_program: Interface<TokenInterface>,

    pub associated_token_program: Program<AssociatedTokenProgram>,

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
            // crate::helpers::close_account(&mut ctx.accounts.estate, authority_view)?;
            // crate::helpers::close_account(&mut ctx.accounts.vault, authority_view)?;

            ctx.accounts.estate.close(authority_view)?;
            ctx.accounts.vault.close(authority_view)?;
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
                let _treasury_token_account = self
                    .treasury_token_account
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

                // TODO
                // TODO: treasury owner checks
                // if treasury_token_account.owner() != self.authority.address() {
                //     return Err(HeirloomError::InvalidAccount.into());
                // }

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

        Ok(())
    }

    #[inline(always)]
    pub fn return_assets(&self, revoke_ix_bumps: &RevokeBumps) -> Result<(), ProgramError> {
        match self.authority_token_account.as_ref() {
            Some(authority_ta) => {
                let vault_token_account = self.vault_token_account.as_ref().unwrap();
                let treasury_token_account = self.treasury_token_account.as_ref().unwrap();
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

                // calculate protocol fees
                let (fee, authority_amt) = calculate_distribution(amount, EMERGENCY_EXIT_FEE_BPS)?;

                if fee > 0 {
                    // create treasury token acc if not exists
                    self.associated_token_program
                        .create_idempotent(
                            self.authority.to_account_view(),
                            &treasury_token_account.to_account_view(),
                            self.treasury.to_account_view(),
                            mint,
                            &self.system_program,
                            &self.token_program,
                        )
                        .invoke()?;

                    // transfer to the treasury
                    self.token_program
                        .transfer_checked(
                            vault_token_account,
                            mint,
                            treasury_token_account,
                            &self.vault,
                            fee,
                            mint.decimals(),
                        )
                        .invoke_signed(&vault_seeds)?;
                }

                self.token_program
                    .transfer_checked(
                        vault_token_account,
                        mint,
                        authority_ta,
                        &self.vault,
                        authority_amt,
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
                let treasury_view = self.treasury.to_account_view();
                let vault_lamports = vault_view.lamports();

                let (protocol_fee, return_amount) =
                    calculate_distribution(vault_lamports, EMERGENCY_EXIT_FEE_BPS)?;

                // transfer to treasury
                set_lamports(vault_view, vault_lamports - protocol_fee);
                set_lamports(treasury_view, treasury_view.lamports() + protocol_fee);

                // transfer to authority
                set_lamports(vault_view, 0);
                set_lamports(authority_view, authority_view.lamports() + return_amount);
            }
        }

        Ok(())
    }
}
