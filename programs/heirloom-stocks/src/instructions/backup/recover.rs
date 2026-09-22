use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TransferChecked},
};

use crate::{
    constants::{RECOVERY_FEE_BPS, TREASURY},
    error::StocksError,
    helpers::{
        apply_allocation, assert_delegation_intact, assert_transferable, calculate_distribution,
    },
    state::PLAN_MODE_BACKUP,
    CoveredAsset, StockPlan,
};

/// Moves one covered asset out of a wallet the owner can no longer reach.
///
/// Signed by the **destination**, which is the point: the owner's key is assumed
/// lost, so nothing here depends on it. The destination is fixed on the plan at
/// setup and re-read from it here, so this instruction cannot be used to send the
/// assets anywhere the owner did not nominate in advance.
///
/// There is no keeper and no bounty. The wallet that receives the assets is the
/// one that pays for the transaction, which keeps the trigger permissionless in
/// effect while removing any need for off-chain infrastructure.
///
/// One asset per call. The owner's token account is left open, since it still
/// belongs to them and may hold the share `allocation_bps` did not cover.
#[derive(Accounts)]
pub struct Recover {
    #[account(mut, address = plan.destination @ StocksError::Unauthorized)]
    pub destination: Signer,

    pub mint: InterfaceAccount<Mint>,

    /// The owner's token account. The plan moves tokens out of it as delegate; the
    /// owner never signs.
    #[account(mut)]
    pub owner_token_account: InterfaceAccount<TokenAccount>,

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

impl Recover {
    pub fn recover_handler(ctx: &mut Context<Recover>) -> Result<()> {
        let amount = ctx.accounts.validate()?;

        ctx.accounts.transfer_to_destination(amount)?;

        let remaining = ctx.accounts.plan.covered_assets.saturating_sub(1);
        ctx.accounts.plan.covered_assets = remaining;

        // The owner cannot sign to reclaim the plan's rent, so the destination
        // takes it once nothing is left to recover.
        if remaining == 0 {
            let destination_view = ctx.accounts.destination.account().clone();
            ctx.accounts.plan.close(destination_view)?;
        }

        Ok(())
    }

    /// Returns the raw amount to move.
    pub fn validate(&self) -> Result<u64> {
        require!(
            self.plan.mode == PLAN_MODE_BACKUP,
            StocksError::WrongPlanMode
        );

        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= self.plan.recoverable_at()?,
            StocksError::NotYetRecoverable
        );

        require_keys_eq!(
            self.owner_token_account.address(),
            &self.covered_asset.source_token_account,
            StocksError::InvalidAccount
        );

        require_keys_eq!(
            self.owner_token_account.mint(),
            self.mint.address(),
            StocksError::MintMismatch
        );

        require_keys_eq!(
            *self.mint.address(),
            self.covered_asset.mint,
            StocksError::MintMismatch
        );

        // The issuer can change a mint's configuration while a plan is live, so
        // coverage-time checks are re-run rather than trusted.
        assert_transferable(
            &self.mint,
            &self.owner_token_account,
            self.covered_asset.had_permanent_delegate,
        )?;

        let balance = self.owner_token_account.amount();
        require!(balance > 0, StocksError::InsufficientBalance);

        let amount = apply_allocation(balance, self.covered_asset.allocation_bps)?;
        require!(amount > 0, StocksError::InsufficientBalance);

        // Any later approval to another protocol would have replaced this one, and
        // changing the account's owner would have cleared it outright.
        assert_delegation_intact(&self.owner_token_account, self.plan.address(), amount)?;

        Ok(amount)
    }

    /// See `CoverAsset::approve_plan_as_delegate` for why the plan's borrow has to
    /// be handed back: it signs these transfers as delegate, so it travels into the
    /// CPI while `BorshAccount` would otherwise still hold its data.
    ///
    /// The seeds are read first because a released `BorshAccount` panics on deref.
    fn transfer_to_destination(&mut self, amount: u64) -> Result<()> {
        let seed_parts = (
            *self.plan.owner.as_array(),
            [self.plan.mode],
            [self.plan.bump],
        );

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
                from: self.owner_token_account.to_cpi_handle_mut(),
                mint: self.mint.to_cpi_handle(),
                to: self.treasury_token_account.to_cpi_handle_mut(),
                authority: self.plan.to_cpi_handle(),
            };

            let transfer_ctx =
                CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

            token_interface::transfer_checked(
                transfer_ctx,
                protocol_fee,
                self.covered_asset.mint_decimals,
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
            from: self.owner_token_account.to_cpi_handle_mut(),
            mint: self.mint.to_cpi_handle(),
            to: self.destination_token_account.to_cpi_handle_mut(),
            authority: self.plan.to_cpi_handle(),
        };

        let transfer_ctx =
            CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

        token_interface::transfer_checked(transfer_ctx, payout, self.covered_asset.mint_decimals)?;

        Ok(())
    }
}
