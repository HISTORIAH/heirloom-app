use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TransferChecked},
};

use crate::{
    constants::{EMERGENCY_EXIT_FEE_BPS, TREASURY},
    error::HeirloomError,
    helpers::calculate_distribution,
    AssetRecord, Estate, Vault,
};

#[derive(Accounts)]
pub struct Revoke {
    #[account(mut, address = estate.authority @ HeirloomError::Unauthorized)]
    pub authority: Signer,

    /// CHECK: heir verified via estate
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

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<TokenAccount>>,

    #[account(mut)]
    pub mint: Option<InterfaceAccount<Mint>>,

    #[account(
        mut,
        close = authority,
        seeds = [
            AssetRecord::SEED,
            estate.address().as_ref(),
            mint.as_ref().unwrap().address().as_ref(),
        ],
        bump = asset_record.bump,
    )]
    pub asset_record: Option<BorshAccount<AssetRecord>>,

    /// CHECK: treasury address
    #[account(mut, address = TREASURY @ HeirloomError::MismatchedAddress)]
    pub treasury: UncheckedAccount,

    /// CHECK: treasury ATA, created idempotently if needed
    #[account(mut)]
    pub treasury_token_account: Option<UncheckedAccount>,

    /// CHECK: verified below via constraint, Switch to Interface<TokenInterface>/similar on stable release.
    #[account(
        constraint = *token_program.address() == Token::id()
            || *token_program.address() == Token2022::id()
    )]
    pub token_program: UncheckedAccount,
    pub associated_token_program: Program<AssociatedToken>,
    pub system_program: Program<System>,
}

impl Revoke {
    pub fn revoke_handler(ctx: &mut Context<Revoke>) -> Result<()> {
        ctx.accounts.validate()?;

        ctx.accounts.return_assets()?;

        let remaining = ctx.accounts.estate.claimable_assets.saturating_sub(1);
        ctx.accounts.estate.claimable_assets = remaining;

        let authority_view = ctx.accounts.authority.account();
        if remaining == 0 {
            ctx.accounts.estate.close(authority_view.clone())?;
            ctx.accounts.vault.close(*authority_view)?;
            msg!(
                "DEBUG: vault bal after close {}",
                ctx.accounts.vault.get_lamports()
            ); // ! DEBUG STATEMENT
        }

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
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

                self.asset_record
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                require_keys_eq!(
                    vault_ta.owner(),
                    self.vault.address(),
                    HeirloomError::InvalidAccount
                );
                require_keys_eq!(
                    authority_ta.mint(),
                    mint.address(),
                    HeirloomError::MintMismatch
                );
                require_keys_eq!(
                    authority_ta.owner(),
                    self.authority.address(),
                    HeirloomError::InvalidAccount
                );

                require!(
                    vault_ta.amount() > 0,
                    HeirloomError::InsufficientVaultBalance
                );

                let asset_record = self.asset_record.as_ref().unwrap();
                require!(
                    !asset_record.has_protected_exposure && !asset_record.has_boosted_exposure,
                    HeirloomError::FundsStillDeployed
                );
            }
            None => {
                if self.authority_token_account.is_none() && self.estate.claimable_assets > 1 {
                    return Err(HeirloomError::TokensFirst.into());
                }

                // zero amt check, in the case where the funds are pending a withdrawal
                // in lulo disallow no-op withdrawals
                require!(
                    self.vault.get_lamports() > 0,
                    HeirloomError::InsufficientVaultBalance
                );
            }
        }

        Ok(())
    }

    pub fn return_assets(&mut self) -> Result<()> {
        let authority_addr_arr = *self.authority.address().as_array();
        let heir_addr_arr = *self.heir.address().as_array();
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            authority_addr_arr.as_ref(),
            heir_addr_arr.as_ref(),
            &[self.vault.bump],
        ];
        let signer_seeds = &[vault_seeds];

        match self.authority_token_account.take() {
            Some(mut authority_ta) => {
                let mut vault_ta = self.vault_token_account.take().unwrap();
                let mut treasury_ta = self.treasury_token_account.take().unwrap();
                let token_program_addr = self.token_program.address();
                let mint = self.mint.as_ref().unwrap();
                let amount = vault_ta.amount();

                let (fee, authority_amt) = calculate_distribution(amount, EMERGENCY_EXIT_FEE_BPS)?;

                if fee > 0 {
                    let cpi_accounts = associated_token::Create {
                        payer: self.authority.to_cpi_handle_mut(),
                        associated_token: treasury_ta.to_cpi_handle_mut(),
                        authority: self.treasury.to_cpi_handle(),
                        mint: mint.to_cpi_handle(),
                        system_program: self.system_program.to_cpi_handle(),
                        token_program: self.token_program.to_cpi_handle(),
                    };

                    let associated_program_addr = self.associated_token_program.address();
                    let cpi_context = CpiContext::new(associated_program_addr, cpi_accounts);

                    associated_token::create_idempotent(cpi_context)?;

                    // transfer fee
                    let cpi_accounts = TransferChecked {
                        from: vault_ta.to_cpi_handle_mut(),
                        mint: mint.to_cpi_handle(),
                        to: treasury_ta.to_cpi_handle_mut(),
                        authority: self.vault.to_cpi_handle(),
                    };

                    let token_program_addr = self.token_program.address();
                    let cpi_context =
                        CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

                    token_interface::transfer_checked(cpi_context, fee, mint.decimals())?;
                }

                // transfer back to authority
                let cpi_accounts = TransferChecked {
                    from: vault_ta.to_cpi_handle_mut(),
                    mint: mint.to_cpi_handle(),
                    to: authority_ta.to_cpi_handle_mut(),
                    authority: self.vault.to_cpi_handle(),
                };

                let transfer_ctx =
                    CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

                token_interface::transfer_checked(transfer_ctx, authority_amt, mint.decimals())?;

                // close token account
                let close_cpi_accounts = token_interface::CloseAccount {
                    account: vault_ta.to_cpi_handle_mut(),
                    destination: self.authority.to_cpi_handle_mut(),
                    authority: self.vault.to_cpi_handle(),
                };
                let close_ctx = CpiContext::new_with_signer(
                    token_program_addr,
                    close_cpi_accounts,
                    signer_seeds,
                );

                token_interface::close_account(close_ctx)?;
            }
            None => {
                let vault_view = self.vault.account();
                let treasury_view = self.treasury.account();

                let (protocol_fee, _) =
                    calculate_distribution(vault_view.get_lamports(), EMERGENCY_EXIT_FEE_BPS)?;

                vault_view.sub_lamports(protocol_fee)?;
                treasury_view.add_lamports(protocol_fee)?;

                // ! REMOVED SINCE acc close above will move funds into auth acc
                // vault_info.sub_lamports(return_amount)?;
                // authority_info.add_lamports(return_amount)?;
            }
        }

        Ok(())
    }
}
