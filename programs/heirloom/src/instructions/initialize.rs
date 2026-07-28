use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{error::HeirloomError, Estate, Vault};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount<'info>,

    /// CHECK: optional delegate pubkey
    pub delegate: Option<UncheckedAccount<'info>>,

    /// CHECK: optional hot-signer pubkey
    pub hb_signer: Option<UncheckedAccount<'info>>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        space = Estate::LEN,
        seeds = [Estate::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump
    )]
    pub estate: Account<'info, Estate>,

    #[account(
        init,
        payer = authority,
        space = Vault::LEN,
        seeds = [Vault::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: vault ATA, created by this instruction if needed
    #[account(mut)]
    pub vault_token_account: Option<UncheckedAccount<'info>>,

    pub mint: Option<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn initialize_handler(
        ctx: Context<Initialize>,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        amount: u64,
        label: String,
    ) -> Result<()> {
        ctx.accounts.validate_inputs(amount, &label)?;

        ctx.accounts.set_acc_fields(
            heartbeat_interval,
            grace_period,
            pause_duration,
            &label,
            ctx.bumps.estate,
            ctx.bumps.vault,
        )?;

        ctx.accounts.init_vault_token_account()?;
        ctx.accounts.transfer_assets(amount)?;

        Ok(())
    }

    pub fn validate_inputs(&self, amount: u64, label: &str) -> Result<()> {
        require!(amount > 0, HeirloomError::ZeroDepositAmount);
        require!(label.len() <= 32, HeirloomError::LabelTooLong);

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

                require_keys_eq!(authority_ta.mint, mint.key(), HeirloomError::MintMismatch);
                require!(
                    authority_ta.amount >= amount,
                    HeirloomError::InsufficientVaultBalance
                );
            }
            None => {
                if self.vault_token_account.is_some() || self.mint.is_some() {
                    return err!(HeirloomError::MissingTokenAccounts);
                }
                require!(
                    self.authority.get_lamports() >= amount,
                    HeirloomError::InsufficientVaultBalance
                );
            }
        }

        Ok(())
    }

    pub fn set_acc_fields(
        &mut self,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        label: &str,
        estate_bump: u8,
        vault_bump: u8,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        self.estate.authority = self.authority.key();
        self.estate.heir = self.heir.key();
        self.estate.heartbeat_interval = heartbeat_interval;
        self.estate.grace_period = grace_period;
        self.estate.last_heartbeat = now;
        self.estate.created_at = now;
        self.estate.bump = estate_bump;
        self.estate.delegate = self.delegate.as_ref().map(|a| a.key());
        self.estate.hb_signer = self.hb_signer.as_ref().map(|a| a.key());
        self.estate.claimable_assets = 1;
        self.estate.label = label.to_string();
        self.estate.pause_duration = pause_duration;
        self.estate.paused_until = 0;

        self.vault.estate = self.estate.key();
        self.vault.bump = vault_bump;

        Ok(())
    }

    pub fn init_vault_token_account(&mut self) -> Result<()> {
        let vault_ta = match self.vault_token_account.as_ref() {
            Some(ta) => ta,
            None => return Ok(()),
        };
        let mint = self.mint.as_ref().unwrap();

        let cpi_accounts = associated_token::Create {
            payer: self.authority.to_account_info(),
            associated_token: vault_ta.to_account_info(),
            authority: self.vault.to_account_info(),
            mint: mint.to_account_info(),
            system_program: self.system_program.to_account_info(),
            token_program: self.token_program.to_account_info(),
        };

        let cpi_program_addr = self.associated_token_program.key();
        let cpi_context = CpiContext::new(cpi_program_addr, cpi_accounts);

        associated_token::create_idempotent(cpi_context)?;

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

    pub fn transfer_assets(&self, amount: u64) -> Result<()> {
        match self.authority_token_account.as_ref() {
            Some(authority_ta) => {
                let vault_ta = self.vault_token_account.as_ref().unwrap();
                let mint = self.mint.as_ref().unwrap();

                let cpi_accounts = TransferChecked {
                    from: authority_ta.to_account_info(),
                    mint: mint.to_account_info(),
                    to: vault_ta.to_account_info().clone(),
                    authority: self.authority.to_account_info(),
                };

                let cpi_program_addr = self.token_program.key();
                let cpi_context = CpiContext::new(cpi_program_addr, cpi_accounts);

                token_interface::transfer_checked(cpi_context, amount, mint.decimals)?;
            }
            None => {
                let cpi_accounts = system_program::Transfer {
                    from: self.authority.to_account_info(),
                    to: self.vault.to_account_info(),
                };

                let cpi_program_addr = self.system_program.key();
                let cpi_context = CpiContext::new(cpi_program_addr, cpi_accounts);

                system_program::transfer(cpi_context, amount)?;
            }
        }

        Ok(())
    }
}
