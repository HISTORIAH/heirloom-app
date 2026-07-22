use anchor_lang::{
    prelude::*,
    system_program::{self},
};
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{error::HeirloomError, Estate, Vault};

#[derive(Accounts)]
pub struct RegisterAsset<'info> {
    #[account(mut, address = estate.authority @ HeirloomError::Unauthorized)]
    pub authority: Signer<'info>,

    /// CHECK: heir verified via estate
    #[account(address = estate.heir)]
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

    /// CHECK: vault ATA, created idempotently if needed
    #[account(mut)]
    pub vault_token_account: Option<UncheckedAccount<'info>>,

    pub mint: Option<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterAsset<'info> {
    pub fn register_asset_handler(ctx: Context<RegisterAsset>, amount: u64) -> Result<()> {
        ctx.accounts.validate(amount)?;

        if ctx.accounts.mint.is_none() {
            require!(amount > 0, HeirloomError::ZeroDepositAmount);
        }

        match ctx.accounts.mint.as_ref() {
            Some(mint) => {
                let vault_ta = ctx.accounts.vault_token_account.as_ref().unwrap();
                let authority_ta = ctx.accounts.authority_token_account.as_ref().unwrap();

                let cpi_accounts = associated_token::Create {
                    payer: ctx.accounts.authority.to_account_info(),
                    associated_token: vault_ta.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                    mint: mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                };

                let associated_program_addr = ctx.accounts.associated_token_program.key();
                let cpi_context = CpiContext::new(associated_program_addr, cpi_accounts);

                associated_token::create_idempotent(cpi_context)?;

                // transfer
                let cpi_accounts = TransferChecked {
                    from: authority_ta.to_account_info(),
                    mint: mint.to_account_info(),
                    to: vault_ta.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                };

                let token_program_addr = ctx.accounts.token_program.key();
                let cpi_context = CpiContext::new(token_program_addr, cpi_accounts);

                token_interface::transfer_checked(cpi_context, amount, mint.decimals)?;

                ctx.accounts.estate.claimable_assets = ctx
                    .accounts
                    .estate
                    .claimable_assets
                    .checked_add(1)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
            }
            None => {
                let cpi_accounts = system_program::Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                };

                let cpi_program_addr = ctx.accounts.system_program.key();
                let cpi_context = CpiContext::new(cpi_program_addr, cpi_accounts);

                system_program::transfer(cpi_context, amount)?;
            }
        }

        Ok(())
    }

    pub fn validate(&self, amount: u64) -> Result<()> {
        require!(amount > 0, HeirloomError::ZeroDepositAmount);

        match self.mint.as_ref() {
            Some(_) => {
                self.authority_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                let vault_ta = self
                    .vault_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                require!(vault_ta.data_is_empty(), HeirloomError::InvalidAccount);
            }
            None => {
                if self.vault_token_account.is_some() || self.authority_token_account.is_some() {
                    return err!(HeirloomError::MissingTokenAccounts);
                }

                let vault_sol_bal = self.vault.get_lamports();
                let vault_rent_bal = self
                    .rent
                    .minimum_balance(self.vault.to_account_info().data_len());
                require!(
                    vault_sol_bal <= vault_rent_bal,
                    HeirloomError::InvalidAccount
                );
            }
        }

        Ok(())
    }
}
