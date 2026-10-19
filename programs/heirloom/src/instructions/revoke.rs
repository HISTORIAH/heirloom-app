use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount},
};

use crate::{
    constants::{EMERGENCY_EXIT_FEE_BPS, TREASURY},
    error::HeirloomError,
    helpers::{
        close_vault_token_account, create_token_account_if_missing, is_nft_mint,
        move_lamports_from_vault, split_amount_into_fee_and_payout, transfer_tokens_checked,
    },
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
        let vault_seeds = Vault::signer_seeds_for(
            self.authority.address(),
            self.heir.address(),
            self.vault.bump,
        );
        let vault_seeds = vault_seeds.as_seeds();
        let signer_seeds: &[&[&[u8]]] = &[&vault_seeds];

        match self.authority_token_account.take() {
            Some(mut authority_ta) => {
                let mut vault_ta = self.vault_token_account.take().unwrap();
                let mut treasury_ta = self.treasury_token_account.take().unwrap();
                let token_program_addr = self.token_program.address();
                let mint = self.mint.as_ref().unwrap();
                let amount = vault_ta.amount();

                // NFTs paid a flat fee on deposit
                let fee_bps = if is_nft_mint(mint) {
                    0
                } else {
                    EMERGENCY_EXIT_FEE_BPS
                };
                let (fee, authority_amt) = split_amount_into_fee_and_payout(amount, fee_bps)?;

                if fee > 0 {
                    create_token_account_if_missing(
                        self.associated_token_program.address(),
                        self.authority.to_cpi_handle_mut(),
                        treasury_ta.to_cpi_handle_mut(),
                        self.treasury.to_cpi_handle(),
                        mint.to_cpi_handle(),
                        self.system_program.to_cpi_handle(),
                        self.token_program.to_cpi_handle(),
                    )?;

                    transfer_tokens_checked(
                        token_program_addr,
                        vault_ta.to_cpi_handle_mut(),
                        treasury_ta.to_cpi_handle_mut(),
                        self.vault.to_cpi_handle(),
                        mint,
                        fee,
                        signer_seeds,
                    )?;
                }

                // transfer back to authority
                transfer_tokens_checked(
                    token_program_addr,
                    vault_ta.to_cpi_handle_mut(),
                    authority_ta.to_cpi_handle_mut(),
                    self.vault.to_cpi_handle(),
                    mint,
                    authority_amt,
                    signer_seeds,
                )?;

                close_vault_token_account(
                    token_program_addr,
                    vault_ta.to_cpi_handle_mut(),
                    self.authority.to_cpi_handle_mut(),
                    self.vault.to_cpi_handle(),
                    signer_seeds,
                )?;
            }
            None => {
                let vault_lamports = self.vault.get_lamports();
                let (protocol_fee, _) =
                    split_amount_into_fee_and_payout(vault_lamports, EMERGENCY_EXIT_FEE_BPS)?;

                move_lamports_from_vault(&mut self.vault, &mut self.treasury, protocol_fee)?;
            }
        }

        Ok(())
    }
}
