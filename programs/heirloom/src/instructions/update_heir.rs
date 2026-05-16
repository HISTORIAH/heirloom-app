use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{error::HeirloomError, helpers::close_account as close_pda, Estate, Vault};

#[derive(Accounts)]
pub struct UpdateHeir<'info> {
    #[account(mut, address = estate.authority @ HeirloomError::Unauthorized)]
    pub authority: Signer<'info>,

    /// CHECK: current heir verified via estate
    #[account(address = estate.heir)]
    pub heir: UncheckedAccount<'info>,

    /// CHECK: new heir pubkey
    pub new_heir: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = estate.bump,
    )]
    pub estate: Account<'info, Estate>,

    #[account(
        init,
        payer = authority,
        space = Estate::LEN,
        seeds = [Estate::SEED, authority.key().as_ref(), new_heir.key().as_ref()],
        bump
    )]
    pub new_estate: Account<'info, Estate>,

    #[account(
        mut,
        seeds = [Vault::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = authority,
        space = Vault::LEN,
        seeds = [Vault::SEED, authority.key().as_ref(), new_heir.key().as_ref()],
        bump
    )]
    pub new_vault: Account<'info, Vault>,

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: new vault ATA, created by this instruction
    #[account(mut)]
    pub new_vault_token_account: Option<UncheckedAccount<'info>>,

    #[account(mut)]
    pub mint: Option<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> UpdateHeir<'info> {
    pub fn update_heir_handler(ctx: Context<UpdateHeir>) -> Result<()> {
        ctx.accounts.validate_inputs()?;

        ctx.accounts
            .set_new_account_data(ctx.bumps.new_estate, ctx.bumps.new_vault)?;

        ctx.accounts.migrate_assets()?;

        let authority_info = ctx.accounts.authority.to_account_info();
        close_pda(
            ctx.accounts.estate.to_account_info(),
            authority_info.clone(),
        )?;
        close_pda(ctx.accounts.vault.to_account_info(), authority_info)?;

        Ok(())
    }

    pub fn validate_inputs(&self) -> Result<()> {
        require!(!self.estate.is_claimed, HeirloomError::AlreadyClaimed);
        require!(
            self.estate.claimable_assets <= 1,
            HeirloomError::TooManyClaimableAssets
        );

        let now = Clock::get()?.unix_timestamp;
        require!(now >= self.estate.paused_until, HeirloomError::EstatePaused);

        if let Some(mint_acc) = self.mint.as_ref() {
            let vault_ta = self
                .vault_token_account
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;
            let _new_vault_ta = self
                .new_vault_token_account
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;

            require_keys_eq!(
                vault_ta.owner,
                self.vault.key(),
                HeirloomError::InvalidAccount
            );
            require_keys_eq!(vault_ta.mint, mint_acc.key(), HeirloomError::MintMismatch);
        }

        Ok(())
    }

    pub fn set_new_account_data(&mut self, new_estate_bump: u8, new_vault_bump: u8) -> Result<()> {
        let authority_key = self.authority.key();
        let new_heir_key = self.new_heir.key();

        self.new_estate.authority = authority_key;
        self.new_estate.heir = new_heir_key;
        self.new_estate.heartbeat_interval = self.estate.heartbeat_interval;
        self.new_estate.grace_period = self.estate.grace_period;
        self.new_estate.last_heartbeat = self.estate.last_heartbeat;
        self.new_estate.created_at = self.estate.created_at;
        self.new_estate.bump = new_estate_bump;
        self.new_estate.is_claimed = false;
        self.new_estate.delegate = self.estate.delegate;
        self.new_estate.hb_signer = self.estate.hb_signer;
        self.new_estate.claimable_assets = self.estate.claimable_assets;
        self.new_estate.label = self.estate.label.clone();
        self.new_estate.pause_duration = self.estate.pause_duration;
        self.new_estate.paused_until = 0;
        self.new_estate.is_deferred = false;

        self.new_vault.estate = self.new_estate.key();
        self.new_vault.bump = new_vault_bump;

        Ok(())
    }

    pub fn migrate_assets(&self) -> Result<()> {
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            self.authority.key.as_ref(),
            self.heir.key.as_ref(),
            &[self.vault.bump],
        ];
        let signer_seeds = &[vault_seeds];

        if let Some(vault_ta) = self.vault_token_account.as_ref() {
            let new_vault_ta = self.new_vault_token_account.as_ref().unwrap();
            let token_program_addr = self.token_program.key();
            let mint = self.mint.as_ref().unwrap();
            let amount = vault_ta.amount;

            let cpi_accounts = associated_token::Create {
                payer: self.authority.to_account_info(),
                associated_token: new_vault_ta.to_account_info(),
                authority: self.new_vault.to_account_info(),
                mint: mint.to_account_info(),
                system_program: self.system_program.to_account_info(),
                token_program: self.token_program.to_account_info(),
            };

            let associated_program_addr = self.associated_token_program.key();
            let create_idempotent_ctx = CpiContext::new(associated_program_addr, cpi_accounts);

            associated_token::create_idempotent(create_idempotent_ctx)?;

            // transfer
            let cpi_accounts = TransferChecked {
                from: vault_ta.to_account_info(),
                mint: mint.to_account_info(),
                to: new_vault_ta.to_account_info(),
                authority: self.vault.to_account_info(),
            };

            let transfer_ctx =
                CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

            token_interface::transfer_checked(transfer_ctx, amount, mint.decimals)?;

            // close account
            let close_cpi_accounts = token_interface::CloseAccount {
                account: vault_ta.to_account_info(),
                destination: self.authority.to_account_info(),
                authority: self.vault.to_account_info(),
            };
            let close_ctx =
                CpiContext::new_with_signer(token_program_addr, close_cpi_accounts, signer_seeds);

            token_interface::close_account(close_ctx)?;
        } else {
            let old_vault_info = self.vault.to_account_info();
            let new_vault_info = self.new_vault.to_account_info();
            let amount = old_vault_info.lamports();

            old_vault_info.sub_lamports(amount)?;
            new_vault_info.add_lamports(amount)?;
        }

        Ok(())
    }
}
