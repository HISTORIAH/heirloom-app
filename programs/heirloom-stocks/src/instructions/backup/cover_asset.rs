use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, ApproveChecked, Mint, TokenAccount};

use crate::{
    error::StocksError,
    helpers::{
        assert_issuer_matches, assert_no_cpi_guard, inspect_mint_for_coverage, validate_allocation,
    },
    state::{ACCOUNT_VERSION, PLAN_MODE_BACKUP},
    CoveredAsset, IssuerRegistry, StockPlan,
};

/// Brings one tokenized equity under a backup plan.
///
/// The tokens do not move and are not escrowed. This grants the plan PDA an
/// unlimited SPL delegate allowance on the owner's own token account, which is
/// what lets a recovery happen later without the owner's key. The owner keeps full
/// use of the position in the meantime: it stays tradeable and still works as
/// collateral, because a delegate allowance does not restrict the owner.
///
/// The allowance is set to `u64::MAX` rather than the current balance. Token-2022
/// only decrements `delegated_amount` when the *delegate* spends, never when the
/// owner does, so a single maximal approval survives arbitrary trading instead of
/// silently draining toward zero and clearing itself.
#[derive(Accounts)]
pub struct CoverAsset {
    #[account(mut, address = plan.owner @ StocksError::Unauthorized)]
    pub owner: Signer,

    pub mint: InterfaceAccount<Mint>,

    /// The owner's own token account. Stays owned by the owner throughout.
    #[account(mut)]
    pub owner_token_account: InterfaceAccount<TokenAccount>,

    #[account(
        mut,
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    /// Curation entry for the issuer that minted `mint`. Its stored authority is
    /// checked against the mint's real authority in `validate`, so this cannot be
    /// satisfied with an entry belonging to a different issuer.
    #[account(
        seeds = [IssuerRegistry::SEED, issuer.mint_authority.as_ref()],
        bump = issuer.bump,
    )]
    pub issuer: BorshAccount<IssuerRegistry>,

    #[account(
        init,
        payer = owner,
        space = CoveredAsset::LEN,
        seeds = [CoveredAsset::SEED, plan.address().as_ref(), mint.address().as_ref()],
        bump,
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

impl CoverAsset {
    pub fn cover_asset_handler(ctx: &mut Context<CoverAsset>, allocation_bps: u16) -> Result<()> {
        ctx.accounts.validate(allocation_bps)?;

        let had_permanent_delegate = inspect_mint_for_coverage(&ctx.accounts.mint)?;

        ctx.accounts.approve_plan_as_delegate()?;

        let now = Clock::get()?.unix_timestamp;
        let mint_addr = *ctx.accounts.mint.address();
        let source_addr = *ctx.accounts.owner_token_account.address();
        let decimals = ctx.accounts.mint.decimals();
        let bump = ctx.bumps.covered_asset;

        let covered = &mut ctx.accounts.covered_asset;
        covered.version = ACCOUNT_VERSION;
        covered.mint = mint_addr;
        covered.source_token_account = source_addr;
        covered.mint_decimals = decimals;
        covered.allocation_bps = allocation_bps;
        covered.had_permanent_delegate = had_permanent_delegate;
        covered.covered_at = now;
        covered.bump = bump;

        ctx.accounts.plan.covered_assets = ctx
            .accounts
            .plan
            .covered_assets
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }

    pub fn validate(&self, allocation_bps: u16) -> Result<()> {
        require!(
            self.plan.mode == PLAN_MODE_BACKUP,
            StocksError::WrongPlanMode
        );

        validate_allocation(allocation_bps)?;
        assert_issuer_matches(&self.mint, &self.issuer)?;

        require_keys_eq!(
            self.owner_token_account.mint(),
            self.mint.address(),
            StocksError::MintMismatch
        );

        require_keys_eq!(
            self.owner_token_account.owner(),
            self.owner.address(),
            StocksError::InvalidAccount
        );

        require!(
            !self.owner_token_account.is_frozen(),
            StocksError::AccountFrozen
        );

        assert_no_cpi_guard(&self.owner_token_account)?;

        Ok(())
    }

    /// Issues the delegate approval. The owner signs, so no PDA seeds are needed.
    ///
    /// `BorshAccount` pins a `RefMut` on the plan's data for its whole lifetime,
    /// and the runtime rejects a CPI that carries an already-borrowed account. The
    /// plan is both this program's state and the delegate being approved, so the
    /// buffer has to go back for the duration of the call. `release_borrow`
    /// commits pending mutations and `reacquire_borrow_mut` re-reads after, so
    /// writes on either side survive.
    pub fn approve_plan_as_delegate(&mut self) -> Result<()> {
        self.plan.release_borrow()?;
        let result = self.approve_checked_cpi();
        self.plan.reacquire_borrow_mut()?;
        result
    }

    fn approve_checked_cpi(&mut self) -> Result<()> {
        let cpi_accounts = ApproveChecked {
            to: self.owner_token_account.to_cpi_handle_mut(),
            mint: self.mint.to_cpi_handle(),
            delegate: self.plan.to_cpi_handle(),
            authority: self.owner.to_cpi_handle(),
        };

        let token_program_addr = self.token_program.address();
        let cpi_context = CpiContext::new(token_program_addr, cpi_accounts);

        token_interface::approve_checked(cpi_context, u64::MAX, self.mint.decimals())?;

        Ok(())
    }
}
