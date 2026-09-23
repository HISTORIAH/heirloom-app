use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TransferChecked};

use crate::{error::StocksError, state::PLAN_MODE_VAULT, CoveredAsset, StockPlan};

/// Tops up an already-registered vault asset.
///
/// Does not check in. Adding funds is not evidence the owner is reachable, and
/// treating it as such would let a scheduled deposit keep an estate alive
/// indefinitely.
#[derive(Accounts)]
pub struct VaultDeposit {
    #[account(mut, address = plan.owner @ StocksError::Unauthorized)]
    pub owner: Signer,

    pub mint: InterfaceAccount<Mint>,

    #[account(mut)]
    pub owner_token_account: InterfaceAccount<TokenAccount>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<TokenAccount>,

    #[account(
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    #[account(
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

impl VaultDeposit {
    pub fn vault_deposit_handler(ctx: &mut Context<VaultDeposit>, amount: u64) -> Result<()> {
        ctx.accounts.validate(amount)?;

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.owner_token_account.to_cpi_handle_mut(),
            mint: ctx.accounts.mint.to_cpi_handle(),
            to: ctx.accounts.vault_token_account.to_cpi_handle_mut(),
            authority: ctx.accounts.owner.to_cpi_handle(),
        };

        let token_program_addr = ctx.accounts.token_program.address();
        let cpi_context = CpiContext::new(token_program_addr, cpi_accounts);

        token_interface::transfer_checked(
            cpi_context,
            amount,
            ctx.accounts.covered_asset.mint_decimals,
        )?;

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
}
