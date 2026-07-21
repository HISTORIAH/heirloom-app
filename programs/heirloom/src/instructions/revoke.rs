use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    constants::{EMERGENCY_EXIT_FEE_BPS, TREASURY},
    error::HeirloomError,
    helpers::{calculate_distribution, close_account as close_pda},
    Estate, Vault,
};

#[derive(Accounts)]
pub struct Revoke<'info> {
    #[account(mut, address = estate.authority @ HeirloomError::Unauthorized)]
    pub authority: Signer<'info>,

    /// CHECK: heir verified via estate
    pub heir: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = estate.bump,
    )]
    pub estate: Account<'info, Estate>,

    #[account(
        mut,
        seeds = [Vault::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub mint: Option<InterfaceAccount<'info, Mint>>,

    /// CHECK: treasury address
    #[account(mut, address = TREASURY @ HeirloomError::MismatchedAddress)]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: treasury ATA, created idempotently if needed
    #[account(mut)]
    pub treasury_token_account: Option<UncheckedAccount<'info>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Revoke<'info> {
    pub fn revoke_handler(ctx: Context<Revoke>) -> Result<()> {
        ctx.accounts.validate()?;

        ctx.accounts.return_assets()?;

        let authority_info = ctx.accounts.authority.to_account_info();
        let remaining = ctx.accounts.estate.claimable_assets.saturating_sub(1);
        ctx.accounts.estate.claimable_assets = remaining;

        if remaining == 0 {
            close_pda(
                ctx.accounts.estate.to_account_info(),
                authority_info.clone(),
            )?;
            close_pda(ctx.accounts.vault.to_account_info(), authority_info)?;
        }

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        require!(!self.estate.is_claimed, HeirloomError::AlreadyClaimed);

        match self.mint.as_ref() {
            Some(mint) => {
                let vault_ta = self
                    .vault_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;
                let _treasury_ta = self
                    .treasury_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;
                let authority_ta = self
                    .authority_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                require_keys_eq!(
                    vault_ta.owner,
                    self.vault.key(),
                    HeirloomError::InvalidAccount
                );
                require_keys_eq!(authority_ta.mint, mint.key(), HeirloomError::MintMismatch);
                require_keys_eq!(vault_ta.mint, mint.key(), HeirloomError::MintMismatch);
            }
            None => {
                if self.authority_token_account.is_none() && self.estate.claimable_assets > 1 {
                    return err!(HeirloomError::RevokeTokensFirst);
                }
            }
        }

        Ok(())
    }

    pub fn return_assets(&self) -> Result<()> {
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            self.authority.key.as_ref(),
            self.heir.key.as_ref(),
            &[self.vault.bump],
        ];
        let signer_seeds = &[vault_seeds];

        match self.authority_token_account.as_ref() {
            Some(authority_ta) => {
                let vault_ta = self.vault_token_account.as_ref().unwrap();
                let treasury_ta = self.treasury_token_account.as_ref().unwrap();
                let token_program_addr = self.token_program.key();
                let mint = self.mint.as_ref().unwrap();
                let amount = vault_ta.amount;

                let (fee, authority_amt) = calculate_distribution(amount, EMERGENCY_EXIT_FEE_BPS)?;

                if fee > 0 {
                    let cpi_accounts = associated_token::Create {
                        payer: self.authority.to_account_info(),
                        associated_token: treasury_ta.to_account_info(),
                        authority: self.treasury.to_account_info(),
                        mint: mint.to_account_info(),
                        system_program: self.system_program.to_account_info(),
                        token_program: self.token_program.to_account_info(),
                    };

                    let associated_program_addr = self.associated_token_program.key();
                    let cpi_context = CpiContext::new(associated_program_addr, cpi_accounts);

                    associated_token::create_idempotent(cpi_context)?;

                    // transfer fee
                    let cpi_accounts = TransferChecked {
                        from: vault_ta.to_account_info(),
                        mint: mint.to_account_info(),
                        to: treasury_ta.to_account_info(),
                        authority: self.vault.to_account_info(),
                    };

                    let token_program_addr = self.token_program.key();
                    let cpi_context =
                        CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

                    token_interface::transfer_checked(cpi_context, fee, mint.decimals)?;
                }

                // transfer back to authority
                let cpi_accounts = TransferChecked {
                    from: vault_ta.to_account_info(),
                    mint: mint.to_account_info(),
                    to: authority_ta.to_account_info(),
                    authority: self.vault.to_account_info(),
                };

                let transfer_ctx =
                    CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

                token_interface::transfer_checked(transfer_ctx, authority_amt, mint.decimals)?;

                // close token account
                let close_cpi_accounts = token_interface::CloseAccount {
                    account: vault_ta.to_account_info(),
                    destination: self.authority.to_account_info(),
                    authority: self.vault.to_account_info(),
                };
                let close_ctx = CpiContext::new_with_signer(
                    token_program_addr,
                    close_cpi_accounts,
                    signer_seeds,
                );

                token_interface::close_account(close_ctx)?;
            }
            None => {
                let vault_info = self.vault.to_account_info();
                let authority_info = self.authority.to_account_info();
                let treasury_info = self.treasury.to_account_info();
                let vault_lamports = vault_info.lamports();

                let (protocol_fee, return_amount) =
                    calculate_distribution(vault_lamports, EMERGENCY_EXIT_FEE_BPS)?;

                vault_info.sub_lamports(protocol_fee)?;
                treasury_info.add_lamports(protocol_fee)?;

                vault_info.sub_lamports(return_amount)?;
                authority_info.add_lamports(return_amount)?;
            }
        }

        Ok(())
    }
}
