use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount},
};

// TODO(nft-fee): restore with the treasury account below.
// use crate::{constants::{NFT_DEPOSIT_FEE_LAMPORTS, TREASURY}, helpers::is_nft_mint};
use crate::{
    error::HeirloomError,
    helpers::{create_token_account_if_missing, transfer_sol_from_signer, transfer_tokens_checked},
    AssetRecord, Estate, Vault,
};

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

    // TODO(nft-fee): disabled for the same reason as in `initialize`: a new
    // account here shifts every account after it and breaks `register_asset`
    // for clients built before the NFT fee (the hackathon APK). Until it's
    // re-enabled, NFTs registered here pay no fee.
    //
    // /// CHECK: treasury address
    // #[account(mut, address = TREASURY @ HeirloomError::MismatchedAddress)]
    // pub treasury: UncheckedAccount,

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

                create_token_account_if_missing(
                    ctx.accounts.associated_token_program.address(),
                    ctx.accounts.authority.to_cpi_handle_mut(),
                    vault_ta.to_cpi_handle_mut(),
                    ctx.accounts.vault.to_cpi_handle(),
                    mint.to_cpi_handle(),
                    ctx.accounts.system_program.to_cpi_handle(),
                    ctx.accounts.token_program.to_cpi_handle(),
                )?;

                transfer_tokens_checked(
                    ctx.accounts.token_program.address(),
                    authority_ta.to_cpi_handle_mut(),
                    vault_ta.to_cpi_handle_mut(),
                    ctx.accounts.authority.to_cpi_handle(),
                    &mint,
                    amount,
                    &[],
                )?;

                // TODO(nft-fee): see the `treasury` account above.
                // if is_nft_mint(&mint) {
                //     transfer_sol_from_signer(
                //         &mut ctx.accounts.authority,
                //         &mut ctx.accounts.treasury,
                //         &ctx.accounts.system_program,
                //         NFT_DEPOSIT_FEE_LAMPORTS,
                //     )?;
                // }

                ctx.accounts.asset_record.as_mut().unwrap().bump = ctx.bumps.asset_record.unwrap();

                ctx.accounts.estate.claimable_assets = ctx
                    .accounts
                    .estate
                    .claimable_assets
                    .checked_add(1)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
            }
            None => {
                transfer_sol_from_signer(
                    &mut ctx.accounts.authority,
                    &mut ctx.accounts.vault,
                    &ctx.accounts.system_program,
                    amount,
                )?;
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
