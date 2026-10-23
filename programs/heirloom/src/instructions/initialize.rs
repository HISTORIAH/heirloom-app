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
pub struct Initialize {
    #[account(mut)]
    pub authority: Signer,

    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount,

    /// CHECK: optional delegate pubkey
    pub delegate: Option<UncheckedAccount>,

    /// CHECK: optional check_in signer pubkey
    pub check_in_signer: Option<UncheckedAccount>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<TokenAccount>>,

    #[account(
        init,
        payer = authority,
        space = Estate::LEN,
        seeds = [Estate::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump
    )]
    pub estate: BorshAccount<Estate>,

    #[account(
        init,
        payer = authority,
        space = Vault::LEN,
        seeds = [Vault::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump
    )]
    pub vault: BorshAccount<Vault>,

    /// CHECK: vault ATA, created by this instruction if needed
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

    // TODO(nft-fee): disabled so clients built before the NFT fee (the hackathon
    // APK) keep working: a new account here shifts every account after it and
    // breaks their `initialize` calls. Re-enable together with a client release,
    // or charge the fee another way (e.g. treasury via remaining_accounts only
    // for NFT deposits). Until then, NFTs deposited at initialize pay no fee.
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

    pub system_program: Program<System>,
}

impl Initialize {
    pub fn initialize_handler(
        ctx: &mut Context<Initialize>,
        check_in_interval_secs: i64,
        grace_period_secs: i64,
        delegate_pause_duration_secs: i64,
        amount: u64,
        total_periods: u16,
        period_secs: i64,
    ) -> Result<()> {
        ctx.accounts.validate(
            amount,
            check_in_interval_secs,
            grace_period_secs,
            delegate_pause_duration_secs,
            total_periods,
            period_secs,
        )?;

        ctx.accounts.set_acc_fields(
            check_in_interval_secs,
            grace_period_secs,
            delegate_pause_duration_secs,
            total_periods,
            period_secs,
            ctx.bumps.estate,
            ctx.bumps.vault,
        )?;

        ctx.accounts
            .init_vault_token_account(ctx.bumps.asset_record)?;
        ctx.accounts.transfer_assets(amount)?;

        Ok(())
    }

    pub fn validate(
        &self,
        amount: u64,
        check_in_interval_secs: i64,
        grace_period_secs: i64,
        delegate_pause_duration_secs: i64,
        total_periods: u16,
        period_secs: i64,
    ) -> Result<()> {
        require!(amount > 0, HeirloomError::ZeroDepositAmount);

        Estate::validate_interval_secs(check_in_interval_secs)?;
        Estate::validate_interval_secs(grace_period_secs)?;
        Estate::validate_interval_secs(delegate_pause_duration_secs)?;
        Estate::validate_schedule(total_periods, period_secs)?;

        match self.authority_token_account.as_ref() {
            Some(authority_ta) => {
                let _vault_ta = self
                    .vault_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;
                let mint = self
                    .mint
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;
                self.asset_record
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                require_keys_eq!(
                    authority_ta.mint(),
                    mint.address(),
                    HeirloomError::MintMismatch
                );
                require!(
                    authority_ta.amount() >= amount,
                    HeirloomError::InsufficientVaultBalance // misleading err name
                );
            }
            None => {
                if self.vault_token_account.is_some()
                    || self.mint.is_some()
                    || self.asset_record.is_some()
                {
                    return Err(HeirloomError::MissingTokenAccounts.into());
                }
                require!(
                    self.authority.get_lamports() >= amount,
                    HeirloomError::InsufficientVaultBalance // misleading err name
                );
            }
        }

        Ok(())
    }

    pub fn set_acc_fields(
        &mut self,
        check_in_interval_secs: i64,
        grace_period_secs: i64,
        delegate_pause_duration_secs: i64,
        total_periods: u16,
        period_secs: i64,
        estate_bump: u8,
        vault_bump: u8,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        self.estate.authority = *self.authority.address();
        self.estate.heir = *self.heir.address();
        self.estate.check_in_interval_secs = check_in_interval_secs;
        self.estate.grace_period_secs = grace_period_secs;
        self.estate.last_check_in_ts = now;
        self.estate.created_at = now;
        self.estate.bump = estate_bump;
        self.estate.delegate = self.delegate.as_ref().map(|a| *a.address());
        self.estate.check_in_signer = self.check_in_signer.as_ref().map(|a| *a.address());
        self.estate.claimable_assets = 1;
        self.estate.delegate_pause_duration_secs = delegate_pause_duration_secs;
        self.estate.delegate_pause_expires_at = 0;
        self.estate.total_periods = total_periods;
        self.estate.period_secs = period_secs;

        self.vault.estate = *self.estate.address();
        self.vault.bump = vault_bump;

        Ok(())
    }

    pub fn init_vault_token_account(&mut self, asset_record_bump: Option<u8>) -> Result<()> {
        let mut vault_ta = match self.vault_token_account.take() {
            Some(ta) => ta,
            None => return Ok(()),
        };
        let mint = self.mint.as_ref().unwrap();

        create_token_account_if_missing(
            self.associated_token_program.address(),
            self.authority.cpi_handle_mut(),
            vault_ta.cpi_handle_mut(),
            self.vault.cpi_handle(),
            mint.cpi_handle(),
            self.system_program.cpi_handle(),
            self.token_program.cpi_handle(),
        )?;

        self.vault_token_account = Some(vault_ta);

        self.asset_record.as_mut().unwrap().bump = asset_record_bump.unwrap();

        // edge case, we always count sol as an asset since we need
        // to close the vault and estate accounts
        // hence for token only inits, we need to add 1
        self.estate.claimable_assets = self
            .estate
            .claimable_assets
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }

    pub fn transfer_assets(&mut self, amount: u64) -> Result<()> {
        match self.authority_token_account.take() {
            Some(mut authority_ta) => {
                let mut vault_ta = self.vault_token_account.take().unwrap();
                let mint = self.mint.as_ref().unwrap();

                transfer_tokens_checked(
                    self.token_program.address(),
                    authority_ta.to_cpi_handle_mut(),
                    vault_ta.to_cpi_handle_mut(),
                    self.authority.to_cpi_handle(),
                    mint,
                    amount,
                    &[],
                )?;

                // TODO(nft-fee): see the `treasury` account above.
                // if is_nft_mint(mint) {
                //     transfer_sol_from_signer(
                //         &mut self.authority,
                //         &mut self.treasury,
                //         &self.system_program,
                //         NFT_DEPOSIT_FEE_LAMPORTS,
                //     )?;
                // }
            }
            None => {
                transfer_sol_from_signer(
                    &mut self.authority,
                    &mut self.vault,
                    &self.system_program,
                    amount,
                )?;
            }
        }

        Ok(())
    }
}
