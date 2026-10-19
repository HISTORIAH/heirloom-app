use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount},
};

use crate::{
    constants::{CLAIM_FEE_BPS, TREASURY},
    error::HeirloomError,
    helpers::{
        close_vault_token_account, create_token_account_if_missing, is_nft_mint,
        move_lamports_from_vault, split_amount_into_fee_and_payout, transfer_tokens_checked,
    },
    AssetRecord, Estate, Vault,
};

#[derive(Accounts)]
pub struct Claim {
    #[account(mut, address = estate.heir @ HeirloomError::Unauthorized)]
    pub heir: Signer,

    /// CHECK: authority verified via estate.authority
    #[account(address = estate.authority)]
    pub authority: UncheckedAccount,

    /// CHECK: optional delegate
    #[account(mut)]
    pub delegate: Option<UncheckedAccount>,

    /// CHECK: heir's ATA, created idempotently if needed
    #[account(mut)]
    pub heir_token_account: Option<UncheckedAccount>,

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
    pub vault_token_account: Option<InterfaceAccount<TokenAccount>>,

    #[account(mut)]
    pub mint: Option<InterfaceAccount<Mint>>,

    /// Proves `mint` was actually registered as a claimable asset for this
    /// estate, rather than an arbitrary vault-owned token account.
    #[account(
        mut,
        close = heir,
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

impl Claim {
    pub fn claim_handler(ctx: &mut Context<Claim>) -> Result<()> {
        ctx.accounts.validate()?;

        ctx.accounts.transfer_assets()?;

        let heir_view = ctx.accounts.heir.account().clone();
        let remaining = ctx.accounts.estate.claimable_assets.saturating_sub(1);
        ctx.accounts.estate.claimable_assets = remaining;

        if remaining == 0 {
            ctx.accounts.estate.close(heir_view.clone())?;
            ctx.accounts.vault.close(heir_view)?;
            msg!(
                "DEBUG: vault bal after close {}",
                ctx.accounts.vault.get_lamports()
            ); // ! DEBUG STATEMENT
        }

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        if let (Some(stored_delegate), Some(delegate_acc)) =
            (self.estate.delegate, self.delegate.as_ref())
        {
            require_keys_eq!(
                stored_delegate,
                *delegate_acc.address(),
                HeirloomError::MismatchedAddress
            );
        }

        let now = Clock::get()?.unix_timestamp;
        let claimable_at = self
            .estate
            .last_check_in_ts
            .checked_add(self.estate.check_in_interval_secs)
            .and_then(|t| t.checked_add(self.estate.grace_period_secs))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        require!(
            now >= claimable_at.max(self.estate.delegate_pause_expires_at),
            HeirloomError::NotYetClaimable
        );

        match self.heir_token_account.as_ref() {
            Some(_) => {
                if self.vault_token_account.is_none() || self.mint.is_none() {
                    return Err(HeirloomError::MissingTokenAccounts.into());
                }
                let _treasury_ta = self
                    .treasury_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                self.asset_record
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                let vault_ta = self.vault_token_account.as_ref().unwrap();
                require_keys_eq!(
                    vault_ta.owner(),
                    self.vault.address(),
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
                require!(
                    self.estate.claimable_assets <= 1,
                    HeirloomError::TokensFirst
                );
                require!(
                    self.vault.get_lamports() > 0,
                    HeirloomError::InsufficientVaultBalance
                );
            }
        }

        Ok(())
    }

    pub fn transfer_assets(&mut self) -> Result<()> {
        let vault_seeds = Vault::signer_seeds_for(
            self.authority.address(),
            self.heir.address(),
            self.vault.bump,
        );
        let vault_seeds = vault_seeds.as_seeds();
        let signer_seeds: &[&[&[u8]]] = &[&vault_seeds];
        let token_program_addr = self.token_program.address();
        let associated_token_program_addr = self.associated_token_program.address();

        match self.heir_token_account.take() {
            Some(mut heir_ta) => {
                let mut treasury_ta = self.treasury_token_account.take().unwrap();
                let mut vault_ta = self.vault_token_account.take().unwrap();
                let mint = self.mint.as_ref().unwrap();
                let amount = vault_ta.amount();

                // NFTs paid a flat fee on deposit
                let fee_bps = if is_nft_mint(mint) { 0 } else { CLAIM_FEE_BPS };
                let (protocol_fee, heir_payout) =
                    split_amount_into_fee_and_payout(amount, fee_bps)?;

                if protocol_fee > 0 {
                    create_token_account_if_missing(
                        associated_token_program_addr,
                        self.heir.to_cpi_handle_mut(),
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
                        protocol_fee,
                        signer_seeds,
                    )?;
                }

                // heir
                let heir_handle = self.heir.to_cpi_handle_mut();
                create_token_account_if_missing(
                    associated_token_program_addr,
                    heir_handle,
                    heir_ta.to_cpi_handle_mut(),
                    heir_handle.into_readonly(),
                    mint.to_cpi_handle(),
                    self.system_program.to_cpi_handle(),
                    self.token_program.to_cpi_handle(),
                )?;

                transfer_tokens_checked(
                    token_program_addr,
                    vault_ta.to_cpi_handle_mut(),
                    heir_ta.to_cpi_handle_mut(),
                    self.vault.to_cpi_handle(),
                    mint,
                    heir_payout,
                    signer_seeds,
                )?;

                close_vault_token_account(
                    token_program_addr,
                    vault_ta.to_cpi_handle_mut(),
                    self.heir.to_cpi_handle_mut(),
                    self.vault.to_cpi_handle(),
                    signer_seeds,
                )?;
            }
            None => {
                let vault_lamports = self.vault.get_lamports();
                let (protocol_fee, _) =
                    split_amount_into_fee_and_payout(vault_lamports, CLAIM_FEE_BPS)?;

                move_lamports_from_vault(&mut self.vault, &mut self.treasury, protocol_fee)?;

                // NOTE: Heir payout happens implicitly via `close_pda` helper
            }
        }

        Ok(())
    }
}
