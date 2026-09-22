use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TransferChecked},
};

use crate::{
    constants::{EXIT_FEE_BPS, TREASURY},
    error::StocksError,
    helpers::{assert_not_blocked, calculate_distribution},
    state::PLAN_MODE_VAULT,
    CoveredAsset, StockPlan,
};

/// The owner's way back out of a vault plan, available at any time.
///
/// Draining the position fully closes the vault token account and the asset's
/// marker, so the plan can eventually be closed too. `amount` is the gross taken
/// from the vault; the exit fee comes out of it and the owner receives the rest.
#[derive(Accounts)]
pub struct VaultWithdraw {
    #[account(mut, address = plan.owner @ StocksError::Unauthorized)]
    pub owner: Signer,

    pub mint: InterfaceAccount<Mint>,

    /// CHECK: owner ATA, created idempotently in case they closed it.
    #[account(mut)]
    pub owner_token_account: UncheckedAccount,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<TokenAccount>,

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

impl VaultWithdraw {
    pub fn vault_withdraw_handler(ctx: &mut Context<VaultWithdraw>, amount: u64) -> Result<()> {
        ctx.accounts.validate(amount)?;

        let drains_vault = amount == ctx.accounts.vault_token_account.amount();

        ctx.accounts.transfer_out(amount)?;

        if drains_vault {
            ctx.accounts.close_vault_token_account()?;

            let owner_view = ctx.accounts.owner.account().clone();
            ctx.accounts.covered_asset.close(owner_view)?;

            ctx.accounts.plan.covered_assets = ctx.accounts.plan.covered_assets.saturating_sub(1);
        }

        Ok(())
    }

    pub fn validate(&self, amount: u64) -> Result<()> {
        require!(
            self.plan.mode == PLAN_MODE_VAULT,
            StocksError::WrongPlanMode
        );
        require!(amount > 0, StocksError::ZeroAmount);

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

        require!(
            self.vault_token_account.amount() >= amount,
            StocksError::InsufficientBalance
        );

        // Looser than the payout path on purpose: an owner reclaiming their own
        // assets should not be blocked by a change the issuer made.
        assert_not_blocked(&self.mint, &self.vault_token_account)?;

        Ok(())
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
    fn transfer_out(&mut self, amount: u64) -> Result<()> {
        let seed_parts = self.plan_signer_parts();

        self.plan.release_borrow()?;
        let result = self.transfer_out_cpis(amount, seed_parts);
        self.plan.reacquire_borrow_mut()?;
        result
    }

    fn transfer_out_cpis(
        &mut self,
        amount: u64,
        (owner_bytes, mode, bump): ([u8; 32], [u8; 1], [u8; 1]),
    ) -> Result<()> {
        let plan_seeds: &[&[u8]] = &[StockPlan::SEED, owner_bytes.as_ref(), &mode, &bump];
        let signer_seeds = &[plan_seeds];

        let token_program_addr = self.token_program.address();
        let associated_token_program_addr = self.associated_token_program.address();
        let decimals = self.covered_asset.mint_decimals;

        let (protocol_fee, payout) = calculate_distribution(amount, EXIT_FEE_BPS)?;

        if protocol_fee > 0 {
            let cpi_accounts = associated_token::Create {
                payer: self.owner.to_cpi_handle_mut(),
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

        let owner_handle = self.owner.to_cpi_handle_mut();
        let cpi_accounts = associated_token::Create {
            payer: owner_handle,
            associated_token: self.owner_token_account.to_cpi_handle_mut(),
            authority: owner_handle.into_readonly(),
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
            to: self.owner_token_account.to_cpi_handle_mut(),
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
            destination: self.owner.to_cpi_handle_mut(),
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
