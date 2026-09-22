use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_interface::{self, Mint, TokenAccount, TransferChecked},
};

use crate::{
    constants::BPS_DENOMINATOR,
    error::StocksError,
    helpers::{assert_issuer_matches, inspect_mint_for_coverage},
    state::{ACCOUNT_VERSION, PLAN_MODE_VAULT},
    CoveredAsset, IssuerRegistry, StockPlan,
};

/// Registers a mint under a vault plan and makes the first deposit.
///
/// Unlike backup mode the tokens genuinely move: the vault token account is owned
/// by the plan PDA, so the owner gives up trading and collateral use in exchange
/// for coverage that no later delegate approval can displace.
///
/// There is no allocation argument. Everything in a vault goes to the heir, and
/// the owner decides how much of a position that is by how much they deposit. A
/// partial share would leave a remainder in a plan-owned account after the claim,
/// reachable only with the owner's key, which by then is presumed gone.
#[derive(Accounts)]
pub struct VaultAddAsset {
    #[account(mut, address = plan.owner @ StocksError::Unauthorized)]
    pub owner: Signer,

    pub mint: InterfaceAccount<Mint>,

    #[account(mut)]
    pub owner_token_account: InterfaceAccount<TokenAccount>,

    /// CHECK: vault ATA owned by the plan PDA; created here if absent. The
    /// associated-token program rejects any address that is not the canonical ATA
    /// for (plan, mint), which is what validates it.
    #[account(mut)]
    pub vault_token_account: UncheckedAccount,

    #[account(
        mut,
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

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

    pub associated_token_program: Program<AssociatedToken>,

    pub system_program: Program<System>,
}

impl VaultAddAsset {
    pub fn vault_add_asset_handler(ctx: &mut Context<VaultAddAsset>, amount: u64) -> Result<()> {
        ctx.accounts.validate(amount)?;

        let had_permanent_delegate = inspect_mint_for_coverage(&ctx.accounts.mint)?;

        ctx.accounts.create_vault_token_account()?;
        ctx.accounts.deposit(amount)?;

        let now = Clock::get()?.unix_timestamp;
        let mint_addr = *ctx.accounts.mint.address();
        let vault_addr = *ctx.accounts.vault_token_account.address();
        let decimals = ctx.accounts.mint.decimals();
        let bump = ctx.bumps.covered_asset;

        let covered = &mut ctx.accounts.covered_asset;
        covered.version = ACCOUNT_VERSION;
        covered.mint = mint_addr;
        covered.source_token_account = vault_addr;
        covered.mint_decimals = decimals;
        covered.allocation_bps = BPS_DENOMINATOR;
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

    pub fn validate(&self, amount: u64) -> Result<()> {
        require!(
            self.plan.mode == PLAN_MODE_VAULT,
            StocksError::WrongPlanMode
        );
        require!(amount > 0, StocksError::ZeroAmount);

        assert_issuer_matches(&self.mint, &self.issuer)?;

        require_keys_eq!(
            self.owner_token_account.mint(),
            self.mint.address(),
            StocksError::MintMismatch
        );

        require!(
            self.owner_token_account.amount() >= amount,
            StocksError::InsufficientBalance
        );

        Ok(())
    }

    /// See `CoverAsset::approve_plan_as_delegate` for why the plan's borrow has to
    /// be handed back: it is the vault account's authority, so it travels into the
    /// CPI while `BorshAccount` would otherwise still hold its data.
    fn create_vault_token_account(&mut self) -> Result<()> {
        self.plan.release_borrow()?;
        let result = self.create_vault_token_account_cpi();
        self.plan.reacquire_borrow_mut()?;
        result
    }

    fn create_vault_token_account_cpi(&mut self) -> Result<()> {
        let cpi_accounts = associated_token::Create {
            payer: self.owner.to_cpi_handle_mut(),
            associated_token: self.vault_token_account.to_cpi_handle_mut(),
            authority: self.plan.to_cpi_handle(),
            mint: self.mint.to_cpi_handle(),
            system_program: self.system_program.to_cpi_handle(),
            token_program: self.token_program.to_cpi_handle(),
        };

        let associated_token_program_addr = self.associated_token_program.address();
        associated_token::create_idempotent(CpiContext::new(
            associated_token_program_addr,
            cpi_accounts,
        ))?;

        Ok(())
    }

    fn deposit(&mut self, amount: u64) -> Result<()> {
        let cpi_accounts = TransferChecked {
            from: self.owner_token_account.to_cpi_handle_mut(),
            mint: self.mint.to_cpi_handle(),
            to: self.vault_token_account.to_cpi_handle_mut(),
            authority: self.owner.to_cpi_handle(),
        };

        let token_program_addr = self.token_program.address();
        let cpi_context = CpiContext::new(token_program_addr, cpi_accounts);

        token_interface::transfer_checked(cpi_context, amount, self.mint.decimals())?;

        Ok(())
    }
}
