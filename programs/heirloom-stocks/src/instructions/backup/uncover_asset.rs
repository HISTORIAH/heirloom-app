use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Revoke, TokenAccount};

use crate::{error::StocksError, state::PLAN_MODE_BACKUP, CoveredAsset, StockPlan};

/// Withdraws coverage from one asset and refunds the marker's rent.
///
/// This must never be able to fail in a way that traps the owner, because a stuck
/// `CoveredAsset` also blocks closing the plan. Three situations make the revoke
/// CPI impossible or inappropriate, and all are handled by closing the marker
/// without it:
///
/// - **The account is closed.** Wallets offer to close empty token accounts to
///   reclaim rent, so an owner who sold a covered position may have done exactly
///   that. It is passed as `None`. Nothing is left to revoke.
/// - **The account is frozen.** Token-2022 rejects `Revoke` on a frozen account.
///   The allowance is moot anyway, since a frozen account cannot transfer.
/// - **The plan is no longer the delegate.** A later approval to some other
///   protocol replaced it. Revoking would clear *their* allowance, so it is left
///   alone.
///
/// Skipping the revoke never leaves the plan able to act: moving tokens as
/// delegate goes through `recover`, which needs the marker this closes.
#[derive(Accounts)]
pub struct UncoverAsset {
    #[account(mut, address = plan.owner @ StocksError::Unauthorized)]
    pub owner: Signer,

    /// The account the marker names, or `None` once the owner has closed it.
    #[account(mut)]
    pub owner_token_account: Option<InterfaceAccount<TokenAccount>>,

    #[account(
        mut,
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    #[account(
        mut,
        close = owner,
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

    pub system_program: Program<System>,
}

impl UncoverAsset {
    pub fn uncover_asset_handler(ctx: &mut Context<UncoverAsset>) -> Result<()> {
        ctx.accounts.validate()?;

        if ctx.accounts.should_revoke() {
            ctx.accounts.revoke_delegation()?;
        }

        ctx.accounts.plan.covered_assets = ctx.accounts.plan.covered_assets.saturating_sub(1);

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        require!(
            self.plan.mode == PLAN_MODE_BACKUP,
            StocksError::WrongPlanMode
        );

        if let Some(source) = &self.owner_token_account {
            require_keys_eq!(
                source.address(),
                &self.covered_asset.source_token_account,
                StocksError::InvalidAccount
            );
        }

        Ok(())
    }

    fn should_revoke(&self) -> bool {
        let Some(source) = &self.owner_token_account else {
            return false;
        };

        if source.is_frozen() {
            return false;
        }

        matches!(
            source.delegate(),
            Some(delegate) if delegate == self.plan.address()
        )
    }

    fn revoke_delegation(&mut self) -> Result<()> {
        let authority = self.owner.to_cpi_handle();
        let Some(source) = self.owner_token_account.as_mut() else {
            return Ok(());
        };

        let cpi_accounts = Revoke {
            source: source.to_cpi_handle_mut(),
            authority,
        };

        let token_program_addr = self.token_program.address();
        let cpi_context = CpiContext::new(token_program_addr, cpi_accounts);

        token_interface::revoke(cpi_context)?;

        Ok(())
    }
}
