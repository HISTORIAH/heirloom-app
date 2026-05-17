use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    constants::{CLAIM_FEE_BPS, TREASURY},
    error::HeirloomError,
    helpers::{calculate_distribution, close_account as close_pda},
    Estate, Vault,
};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut, address = estate.heir @ HeirloomError::Unauthorized)]
    pub heir: Signer<'info>,

    /// CHECK: authority verified via estate.authority
    #[account(address = estate.authority)]
    pub authority: UncheckedAccount<'info>,

    /// CHECK: optional delegate
    #[account(mut)]
    pub delegate: Option<UncheckedAccount<'info>>,

    /// CHECK: heir's ATA, created idempotently if needed
    #[account(mut)]
    pub heir_token_account: Option<UncheckedAccount<'info>>,

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
    pub vault_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub mint: Option<InterfaceAccount<'info, Mint>>,

    /// CHECK: treasury address
    #[account(mut, address = TREASURY @ HeirloomError::MismatchedAddress)]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: treasury ATA, created idempotently if needed
    #[account(mut)]
    pub treasury_token_account: Option<UncheckedAccount<'info>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Claim<'info> {
    pub fn claim_handler(ctx: Context<Claim>) -> Result<()> {
        ctx.accounts.validate()?;
        ctx.accounts.transfer_assets()?;

        let heir_info = ctx.accounts.heir.to_account_info();
        let remaining = ctx.accounts.estate.claimable_assets.saturating_sub(1);
        ctx.accounts.estate.claimable_assets = remaining;

        if remaining == 0 {
            close_pda(ctx.accounts.estate.to_account_info(), heir_info.clone())?;
            close_pda(ctx.accounts.vault.to_account_info(), heir_info)?;
        }

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        require!(!self.estate.is_claimed, HeirloomError::AlreadyClaimed);

        if let (Some(stored_delegate), Some(delegate_acc)) =
            (self.estate.delegate, self.delegate.as_ref())
        {
            require_keys_eq!(
                stored_delegate,
                delegate_acc.key(),
                HeirloomError::MismatchedAddress
            );
        }

        let now = Clock::get()?.unix_timestamp;
        let claimable_at = self
            .estate
            .last_heartbeat
            .checked_add(self.estate.heartbeat_interval)
            .and_then(|t| t.checked_add(self.estate.grace_period))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        require!(
            now >= claimable_at.max(self.estate.paused_until),
            HeirloomError::NotYetClaimable
        );

        match self.heir_token_account.as_ref() {
            Some(_) => {
                if self.vault_token_account.is_none() || self.mint.is_none() {
                    return err!(HeirloomError::MissingTokenAccounts);
                }
                let _treasury_ta = self
                    .treasury_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                let vault_ta = self.vault_token_account.as_ref().unwrap();
                require_keys_eq!(
                    vault_ta.owner,
                    self.vault.key(),
                    HeirloomError::InvalidAccount
                );
                require!(vault_ta.amount > 0, HeirloomError::InsufficientVaultBalance);
            }
            None => {
                require!(
                    self.vault.to_account_info().lamports() > 0,
                    HeirloomError::InsufficientVaultBalance
                );
            }
        }

        Ok(())
    }

    pub fn transfer_assets(&self) -> Result<()> {
        // let vault_bump = claim_bumps.vault;
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            self.authority.key.as_ref(),
            self.heir.key.as_ref(),
            &[self.vault.bump],
        ];
        let signer_seeds = &[vault_seeds];
        let token_program_addr = self.token_program.key();
        let associated_token_program_addr = self.associated_token_program.key();

        match self.heir_token_account.as_ref() {
            Some(heir_ta) => {
                let treasury_ta = self.treasury_token_account.as_ref().unwrap();
                let vault_ta = self.vault_token_account.as_ref().unwrap();
                let mint = self.mint.as_ref().unwrap();
                let amount = vault_ta.amount;

                let (protocol_fee, heir_payout) = calculate_distribution(amount, CLAIM_FEE_BPS)?;

                if protocol_fee > 0 {
                    let cpi_accounts = associated_token::Create {
                        payer: self.heir.to_account_info(),
                        associated_token: treasury_ta.to_account_info(),
                        authority: self.treasury.to_account_info(),
                        mint: mint.to_account_info(),
                        system_program: self.system_program.to_account_info(),
                        token_program: self.token_program.to_account_info(),
                    };

                    let create_idempotent_ctx =
                        CpiContext::new(associated_token_program_addr, cpi_accounts);

                    associated_token::create_idempotent(create_idempotent_ctx)?;

                    // transfer
                    let cpi_accounts = TransferChecked {
                        from: vault_ta.to_account_info(),
                        mint: mint.to_account_info(),
                        to: treasury_ta.to_account_info(),
                        authority: self.vault.to_account_info(),
                    };

                    let transfer_ctx =
                        CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

                    token_interface::transfer_checked(transfer_ctx, protocol_fee, mint.decimals)?;
                }

                // heir
                let cpi_accounts = associated_token::Create {
                    payer: self.heir.to_account_info(),
                    associated_token: heir_ta.to_account_info(),
                    authority: self.heir.to_account_info(),
                    mint: mint.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    token_program: self.token_program.to_account_info(),
                };

                let token_program_addr = self.token_program.key();
                let create_idempotent_ctx =
                    CpiContext::new(associated_token_program_addr, cpi_accounts);

                associated_token::create_idempotent(create_idempotent_ctx)?;

                // transfer
                let cpi_accounts = TransferChecked {
                    from: vault_ta.to_account_info(),
                    mint: mint.to_account_info(),
                    to: heir_ta.to_account_info(),
                    authority: self.vault.to_account_info(),
                };

                let transfer_ctx =
                    CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

                token_interface::transfer_checked(transfer_ctx, heir_payout, mint.decimals)?;

                // close accounts
                let close_cpi_accounts = token_interface::CloseAccount {
                    account: vault_ta.to_account_info(),
                    destination: self.heir.to_account_info(),
                    authority: self.vault.to_account_info(),
                };
                let close_ctx = CpiContext::new_with_signer(
                    token_program_addr,
                    close_cpi_accounts,
                    signer_seeds,
                );

                token_interface::close_account(close_ctx)?;
            }
            None => {
                let vault_info = self.vault.to_account_info();
                let treasury_info = self.treasury.to_account_info();
                let vault_lamports = vault_info.lamports();
                let (protocol_fee, _) = calculate_distribution(vault_lamports, CLAIM_FEE_BPS)?;

                vault_info.sub_lamports(protocol_fee)?;
                treasury_info.add_lamports(protocol_fee)?;
            }
        }

        Ok(())
    }
}
