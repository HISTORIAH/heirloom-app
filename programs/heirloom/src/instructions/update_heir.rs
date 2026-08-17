use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TransferChecked},
};

use crate::{error::HeirloomError, AssetRecord, Estate, Vault};

#[derive(Accounts)]
pub struct UpdateHeir {
    #[account(mut, address = estate.authority @ HeirloomError::Unauthorized)]
    pub authority: Signer,

    /// CHECK: current heir verified via estate
    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    /// CHECK: new heir pubkey
    pub new_heir: UncheckedAccount,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = estate.bump,
    )]
    pub estate: BorshAccount<Estate>,

    #[account(
        init_if_needed,
        payer = authority,
        space = Estate::LEN,
        seeds = [Estate::SEED, authority.address().as_ref(), new_heir.address().as_ref()],
        bump
    )]
    pub new_estate: BorshAccount<Estate>,

    #[account(
        mut,
        seeds = [Vault::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<Vault>,

    #[account(
        init_if_needed,
        payer = authority,
        space = Vault::LEN,
        seeds = [Vault::SEED, authority.address().as_ref(), new_heir.address().as_ref()],
        bump
    )]
    pub new_vault: Account<Vault>,

    #[account(mut)]
    pub vault_token_account: Option<Box<InterfaceAccount<TokenAccount>>>,

    /// CHECK: new vault ATA, created by this instruction
    #[account(mut)]
    pub new_vault_token_account: Option<UncheckedAccount>,

    #[account(mut)]
    pub mint: Option<Box<InterfaceAccount<Mint>>>,

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
    pub asset_record: Option<Box<BorshAccount<AssetRecord>>>,

    #[account(
        init,
        payer = authority,
        space = AssetRecord::LEN,
        seeds = [
            AssetRecord::SEED,
            new_estate.address().as_ref(),
            mint.as_ref().unwrap().address().as_ref(),
        ],
        bump,
    )]
    pub new_asset_record: Option<Box<BorshAccount<AssetRecord>>>,

    /// CHECK: verified below via constraint, Switch to Interface<TokenInterface>/similar on stable release.
    #[account(
        constraint = *token_program.address() == Token::id()
            || *token_program.address() == Token2022::id()
    )]
    pub token_program: UncheckedAccount,
    pub associated_token_program: Program<AssociatedToken>,
    pub system_program: Program<System>,
}

impl UpdateHeir {
    pub fn update_heir_handler(ctx: &mut Context<UpdateHeir>) -> Result<()> {
        ctx.accounts.validate()?;

        let is_first_call = ctx.accounts.new_estate.authority == Address::default();

        if is_first_call {
            ctx.accounts
                .set_new_account_data(ctx.bumps.new_estate, ctx.bumps.new_vault)?;
        }

        ctx.accounts.migrate_token(ctx.bumps.new_asset_record)?;

        // claimable_assets = (number of token ATAs) + 1 for the SOL deposit.
        // Tokens are fully migrated when the caller passes no vault_ta (nothing left to transfer)
        // and the counter is at most 1 (only the SOL entry remains).
        // Closing the vault moves all SOL to new_vault.
        let all_tokens_migrated =
            ctx.accounts.vault_token_account.is_none() && ctx.accounts.estate.claimable_assets <= 1;

        if all_tokens_migrated {
            ctx.accounts.new_estate.is_migrating = false;

            let authority_view = ctx.accounts.authority.account();
            let new_vault_view = ctx.accounts.new_vault.account();

            ctx.accounts.estate.close(*authority_view)?;
            ctx.accounts.vault.close(*new_vault_view)?;
        }

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(now >= self.estate.paused_until, HeirloomError::EstatePaused);

        let is_first_call = self.new_estate.authority == Address::default();

        if !is_first_call {
            // Subsequent calls: ensure new_estate belongs to this authority and is
            // mid-migration (is_migrating), not an unrelated live estate.
            require_keys_eq!(
                self.new_estate.authority,
                *self.authority.address(),
                HeirloomError::Unauthorized
            );
            require!(self.new_estate.is_migrating, HeirloomError::InvalidAccount);
        }

        if let Some(mint_acc) = self.mint.as_ref() {
            let vault_ta = self
                .vault_token_account
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;
            let _new_vault_ta = self
                .new_vault_token_account
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;
            self.asset_record
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;
            self.new_asset_record
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;

            require_keys_eq!(
                vault_ta.owner(),
                self.vault.address(),
                HeirloomError::InvalidAccount
            );
            require_keys_eq!(
                vault_ta.mint(),
                mint_acc.address(),
                HeirloomError::MintMismatch
            );
        }

        Ok(())
    }

    pub fn set_new_account_data(&mut self, new_estate_bump: u8, new_vault_bump: u8) -> Result<()> {
        let authority_key = self.authority.address();
        let new_heir_key = self.new_heir.address();

        self.new_estate.authority = *authority_key;
        self.new_estate.heir = *new_heir_key;
        self.new_estate.heartbeat_interval = self.estate.heartbeat_interval;
        self.new_estate.grace_period = self.estate.grace_period;
        self.new_estate.last_heartbeat = self.estate.last_heartbeat;
        self.new_estate.created_at = self.estate.created_at;
        self.new_estate.bump = new_estate_bump;
        self.new_estate.delegate = self.estate.delegate;
        self.new_estate.hb_signer = self.estate.hb_signer;
        self.new_estate.claimable_assets = self.estate.claimable_assets;
        self.new_estate.label = self.estate.label.clone();
        self.new_estate.pause_duration = self.estate.pause_duration;
        self.new_estate.paused_until = 0;
        // Block claim on new estate until migration is complete.
        self.new_estate.is_migrating = true;

        // update vault
        self.new_vault.estate = *self.new_estate.address();
        self.new_vault.bump = new_vault_bump;

        Ok(())
    }

    pub fn migrate_token(&mut self, new_asset_record_bump: Option<u8>) -> Result<()> {
        let Some(mut vault_ta) = self.vault_token_account.take() else {
            // No token to migrate on this call — final SOL move is handled
            // by closing old_vault to new_vault in the handler.
            return Ok(());
        };

        let authority_addr_arr = *self.authority.address().as_array();
        let heir_addr_arr = *self.heir.address().as_array();
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            authority_addr_arr.as_ref(),
            heir_addr_arr.as_ref(),
            &[self.vault.bump],
        ];
        let signer_seeds = &[vault_seeds];

        let mut new_vault_ta = self.new_vault_token_account.take().unwrap();
        let token_program_addr = self.token_program.address();
        let mint = self.mint.as_ref().unwrap();
        let amount = vault_ta.amount();
        require!(amount > 0, HeirloomError::ZeroDepositAmount);

        // Create new vault ATA idempotently.
        let cpi_accounts = associated_token::Create {
            payer: self.authority.to_cpi_handle_mut(),
            associated_token: new_vault_ta.to_cpi_handle_mut(),
            authority: self.new_vault.to_cpi_handle(),
            mint: mint.to_cpi_handle(),
            system_program: self.system_program.to_cpi_handle(),
            token_program: self.token_program.to_cpi_handle(),
        };
        associated_token::create_idempotent(CpiContext::new(
            self.associated_token_program.address(),
            cpi_accounts,
        ))?;

        // Transfer tokens to new vault ATA.
        let transfer_ctx = CpiContext::new_with_signer(
            token_program_addr,
            TransferChecked {
                from: vault_ta.to_cpi_handle_mut(),
                mint: mint.to_cpi_handle(),
                to: new_vault_ta.to_cpi_handle_mut(),
                authority: self.vault.to_cpi_handle(),
            },
            signer_seeds,
        );
        token_interface::transfer_checked(transfer_ctx, amount, mint.decimals())?;

        // Close old ATA; rent goes back to authority.
        let close_ctx = CpiContext::new_with_signer(
            token_program_addr,
            token_interface::CloseAccount {
                account: vault_ta.to_cpi_handle_mut(),
                destination: self.authority.to_cpi_handle_mut(),
                authority: self.vault.to_cpi_handle(),
            },
            signer_seeds,
        );
        token_interface::close_account(close_ctx)?;

        self.new_asset_record.as_mut().unwrap().bump = new_asset_record_bump.unwrap();

        let unclaimed_assets_count = self.estate.claimable_assets.saturating_sub(1);
        self.estate.claimable_assets = unclaimed_assets_count;

        // put back the taken vault_ta. Leaving it None here would make
        // `vault_token_account` None, closing the estate/vault a call early.
        self.vault_token_account = Some(vault_ta);

        Ok(())
    }
}
