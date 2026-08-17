use anchor_lang::{
    prelude::*,
    system_program::{self},
};
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TransferChecked},
};

use crate::{error::HeirloomError, AssetRecord, Estate, Vault};

#[derive(Accounts)]
pub struct RegisterAsset {
    #[account(mut, address = estate.authority @ HeirloomError::Unauthorized)]
    pub authority: Signer,

    /// CHECK: heir verified via estate
    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = estate.bump,
    )]
    pub estate: BorshAccount<Estate>,

    #[account(
        mut,
        seeds = [Vault::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<Vault>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<TokenAccount>>,

    /// CHECK: vault ATA, created idempotently if needed
    #[account(mut)]
    pub vault_token_account: Option<UncheckedAccount>,

    pub mint: Option<InterfaceAccount<Mint>>,

    /// Marker PDA proving mint is registered as claimable asset for current estate
    #[account(
        init,
        payer = authority,
        space = AssetRecord::LEN,
        seeds = [
            AssetRecord::SEED,
            estate.address().as_ref(),
            mint.as_ref().unwrap().address().as_ref(),
        ],
        bump,
    )]
    pub asset_record: Option<BorshAccount<AssetRecord>>,

    /// CHECK: verified below via constraint, Switch to Interface<TokenInterface>/similar on stable release.
    #[account(
        constraint = *token_program.address() == Token::id()
            || *token_program.address() == Token2022::id()
    )]
    pub token_program: UncheckedAccount,

    pub associated_token_program: Program<AssociatedToken>,
    pub rent: Sysvar<Rent>,
    pub system_program: Program<System>,
}

impl RegisterAsset {
    pub fn register_asset_handler(ctx: &mut Context<RegisterAsset>, amount: u64) -> Result<()> {
        ctx.accounts.validate(amount)?;

        if ctx.accounts.mint.is_none() {
            require!(amount > 0, HeirloomError::ZeroDepositAmount);
        }

        match ctx.accounts.mint.take() {
            Some(mint) => {
                let mut vault_ta = ctx.accounts.vault_token_account.take().unwrap();
                let mut authority_ta = ctx.accounts.authority_token_account.take().unwrap();

                let cpi_accounts = associated_token::Create {
                    payer: ctx.accounts.authority.to_cpi_handle_mut(),
                    associated_token: vault_ta.to_cpi_handle_mut(),
                    authority: ctx.accounts.vault.to_cpi_handle(),
                    mint: mint.to_cpi_handle(),
                    system_program: ctx.accounts.system_program.to_cpi_handle(),
                    token_program: ctx.accounts.token_program.to_cpi_handle(),
                };

                let associated_program_addr = ctx.accounts.associated_token_program.address();
                let cpi_context = CpiContext::new(associated_program_addr, cpi_accounts);

                associated_token::create_idempotent(cpi_context)?;

                // transfer
                let cpi_accounts = TransferChecked {
                    from: authority_ta.to_cpi_handle_mut(),
                    mint: mint.to_cpi_handle(),
                    to: vault_ta.to_cpi_handle_mut(),
                    authority: ctx.accounts.authority.to_cpi_handle(),
                };

                let token_program_addr = ctx.accounts.token_program.address();
                let cpi_context = CpiContext::new(token_program_addr, cpi_accounts);

                token_interface::transfer_checked(cpi_context, amount, mint.decimals())?;

                ctx.accounts.asset_record.as_mut().unwrap().bump = ctx.bumps.asset_record.unwrap();

                ctx.accounts.estate.claimable_assets = ctx
                    .accounts
                    .estate
                    .claimable_assets
                    .checked_add(1)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
            }
            None => {
                let cpi_accounts = system_program::Transfer {
                    from: ctx.accounts.authority.to_cpi_handle_mut(),
                    to: ctx.accounts.vault.to_cpi_handle_mut(),
                };

                let cpi_program_addr = ctx.accounts.system_program.address();
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

                self.vault_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                self.asset_record
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;
            }
            None => {
                if self.vault_token_account.is_some() || self.authority_token_account.is_some() {
                    return Err(HeirloomError::MissingTokenAccounts.into());
                }

                let vault_sol_bal = self.vault.get_lamports();

                let vault_rent_bal = self
                    .rent
                    .try_minimum_balance(self.vault.account().data_len())?;

                require!(
                    vault_sol_bal <= vault_rent_bal,
                    HeirloomError::InvalidAccount
                );
            }
        }

        Ok(())
    }
}
