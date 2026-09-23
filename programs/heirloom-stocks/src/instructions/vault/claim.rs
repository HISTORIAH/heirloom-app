use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TransferChecked},
};

use crate::{
    constants::{RECOVERY_FEE_BPS, TREASURY},
    error::StocksError,
    helpers::{assert_transferable, calculate_distribution},
    state::PLAN_MODE_VAULT,
    CoveredAsset, StockPlan,
};

/// The heir's claim on one vaulted asset, once the plan has lapsed.
///
/// Signed by the destination stored on the plan, so the payout target was fixed
/// when the plan was created and cannot be changed by whoever submits this. The
/// whole vault balance moves, so the vault token account is always closed, and
/// the plan itself is closed once the last asset is claimed.
#[derive(Accounts)]
pub struct VaultClaim {
    #[account(mut, address = plan.destination @ StocksError::Unauthorized)]
    pub destination: Signer,

    pub mint: InterfaceAccount<Mint>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<TokenAccount>,

    /// CHECK: destination ATA, created idempotently if needed.
    #[account(mut)]
    pub destination_token_account: UncheckedAccount,

    /// CHECK: treasury address.
    #[account(mut, address = TREASURY @ StocksError::MismatchedAddress)]
    pub treasury: UncheckedAccount,

    /// CHECK: treasury ATA, created idempotently if needed.
    #[account(mut)]
    pub treasury_token_account: UncheckedAccount,

    #[account(
        mut,
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    #[account(
        mut,
        close = destination,
        seeds = [CoveredAsset::SEED, plan.address().as_ref(), covered_asset.mint.as_ref()],
        bump = covered_asset.bump,
    )]
    pub covered_asset: BorshAccount<CoveredAsset>,

    /// CHECK: verified below via constraint, Switch to Interface<TokenInterface>/similar on stable release.
    #[account(
        constraint = *token_program.address() == Token::id()
            || *token_program.address() == Token2022::id()
    )]
    pub token_program: UncheckedAccount,

    pub associated_token_program: Program<AssociatedToken>,

    pub system_program: Program<System>,
}

impl VaultClaim {
    pub fn vault_claim_handler(ctx: &mut Context<VaultClaim>) -> Result<()> {
        let amount = ctx.accounts.validate()?;

        ctx.accounts.transfer_to_destination(amount)?;
        ctx.accounts.close_vault_token_account()?;

        let remaining = ctx.accounts.plan.covered_assets.saturating_sub(1);
        ctx.accounts.plan.covered_assets = remaining;

        if remaining == 0 {
            let destination_view = ctx.accounts.destination.account().clone();
            ctx.accounts.plan.close(destination_view)?;
        }

        Ok(())
    }

    /// Returns the raw amount to move: the entire vault balance.
    pub fn validate(&self) -> Result<u64> {
        require!(
            self.plan.mode == PLAN_MODE_VAULT,
            StocksError::WrongPlanMode
        );

        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= self.plan.recoverable_at()?,
            StocksError::NotYetRecoverable
        );

        require_keys_eq!(
            self.vault_token_account.address(),
            &self.covered_asset.source_token_account,
            StocksError::InvalidAccount
        );

        require_keys_eq!(
            *self.mint.address(),
            self.covered_asset.mint,
            StocksError::MintMismatch
        );

        require_keys_eq!(
            self.vault_token_account.owner(),
            self.plan.address(),
            StocksError::InvalidAccount
        );

        assert_transferable(
            &self.mint,
            &self.vault_token_account,
            self.covered_asset.had_permanent_delegate,
        )?;

        let balance = self.vault_token_account.amount();
        require!(balance > 0, StocksError::InsufficientBalance);

        Ok(balance)
    }

    fn plan_signer_parts(&self) -> ([u8; 32], [u8; 1], [u8; 1]) {
        (
            *self.plan.owner.as_array(),
            [self.plan.mode],
            [self.plan.bump],
        )
    }

    /// See `CoverAsset::approve_plan_as_delegate` for why the plan's borrow has to
    /// be handed back: it signs these transfers as the vault's authority, so it
    /// travels into the CPI while `BorshAccount` would otherwise still hold its
    /// data.
    ///
    /// The seeds are read first because a released `BorshAccount` panics on deref.
    fn transfer_to_destination(&mut self, amount: u64) -> Result<()> {
        let seed_parts = self.plan_signer_parts();

        self.plan.release_borrow()?;
        let result = self.transfer_to_destination_cpis(amount, seed_parts);
        self.plan.reacquire_borrow_mut()?;
        result
    }

    fn transfer_to_destination_cpis(
        &mut self,
        amount: u64,
        (owner_bytes, mode, bump): ([u8; 32], [u8; 1], [u8; 1]),
    ) -> Result<()> {
        let plan_seeds: &[&[u8]] = &[StockPlan::SEED, owner_bytes.as_ref(), &mode, &bump];
        let signer_seeds = &[plan_seeds];

        let token_program_addr = self.token_program.address();
        let associated_token_program_addr = self.associated_token_program.address();
        let decimals = self.covered_asset.mint_decimals;

        let (protocol_fee, payout) = calculate_distribution(amount, RECOVERY_FEE_BPS)?;

        if protocol_fee > 0 {
            let cpi_accounts = associated_token::Create {
                payer: self.destination.to_cpi_handle_mut(),
                associated_token: self.treasury_token_account.to_cpi_handle_mut(),
                authority: self.treasury.to_cpi_handle(),
                mint: self.mint.to_cpi_handle(),
                system_program: self.system_program.to_cpi_handle(),
                token_program: self.token_program.to_cpi_handle(),
            };

            associated_token::create_idempotent(CpiContext::new(
                associated_token_program_addr,
                cpi_accounts,
            ))?;

            let cpi_accounts = TransferChecked {
                from: self.vault_token_account.to_cpi_handle_mut(),
                mint: self.mint.to_cpi_handle(),
                to: self.treasury_token_account.to_cpi_handle_mut(),
                authority: self.plan.to_cpi_handle(),
            };

            token_interface::transfer_checked(
                CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds),
                protocol_fee,
                decimals,
            )?;
        }

        let destination_handle = self.destination.to_cpi_handle_mut();
        let cpi_accounts = associated_token::Create {
            payer: destination_handle,
            associated_token: self.destination_token_account.to_cpi_handle_mut(),
            authority: destination_handle.into_readonly(),
            mint: self.mint.to_cpi_handle(),
            system_program: self.system_program.to_cpi_handle(),
            token_program: self.token_program.to_cpi_handle(),
        };

        associated_token::create_idempotent(CpiContext::new(
            associated_token_program_addr,
            cpi_accounts,
        ))?;

        let cpi_accounts = TransferChecked {
            from: self.vault_token_account.to_cpi_handle_mut(),
            mint: self.mint.to_cpi_handle(),
            to: self.destination_token_account.to_cpi_handle_mut(),
            authority: self.plan.to_cpi_handle(),
        };

        token_interface::transfer_checked(
            CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds),
            payout,
            decimals,
        )?;

        Ok(())
    }

    fn close_vault_token_account(&mut self) -> Result<()> {
        let seed_parts = self.plan_signer_parts();

        self.plan.release_borrow()?;
        let result = self.close_vault_token_account_cpi(seed_parts);
        self.plan.reacquire_borrow_mut()?;
        result
    }

    fn close_vault_token_account_cpi(
        &mut self,
        (owner_bytes, mode, bump): ([u8; 32], [u8; 1], [u8; 1]),
    ) -> Result<()> {
        let plan_seeds: &[&[u8]] = &[StockPlan::SEED, owner_bytes.as_ref(), &mode, &bump];
        let signer_seeds = &[plan_seeds];

        let cpi_accounts = token_interface::CloseAccount {
            account: self.vault_token_account.to_cpi_handle_mut(),
            destination: self.destination.to_cpi_handle_mut(),
            authority: self.plan.to_cpi_handle(),
        };

        let token_program_addr = self.token_program.address();
        token_interface::close_account(CpiContext::new_with_signer(
            token_program_addr,
            cpi_accounts,
            signer_seeds,
        ))?;

        Ok(())
    }
}
