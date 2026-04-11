use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ErrorCode::NotOwner,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        constraint = token_b_mint.key() == vault.token_b_mint @ ErrorCode::InvalidMint,
    )]
    pub token_b_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_b_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_b: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = token_b_mint,
        associated_token::authority = owner,
    )]
    pub owner_token_b: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<EmergencyWithdraw>) -> Result<()> {
    // --- Phase 1: Read values ---
    let (sol_bal, token_b_bal, owner_key, bump) = {
        let vault = &ctx.accounts.vault;
        require!(!vault.is_distributed, ErrorCode::VaultDistributed);
        (vault.sol_balance, vault.token_b_balance, vault.owner, vault.bump)
    };

    // --- Phase 2: Transfer native SOL back to owner ---
    if sol_bal > 0 {
        let vault_info = ctx.accounts.vault.to_account_info();
        let owner_info = ctx.accounts.owner.to_account_info();
        **vault_info.try_borrow_mut_lamports()? -= sol_bal;
        **owner_info.try_borrow_mut_lamports()? += sol_bal;
    }

    // --- Phase 3: Transfer USDC back to owner ---
    if token_b_bal > 0 {
        let seeds: &[&[u8]] = &[VAULT_SEED, owner_key.as_ref(), &[bump]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault_token_b.to_account_info(),
                    to: ctx.accounts.owner_token_b.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            ),
            token_b_bal,
        )?;
    }

    // --- Phase 4: Update vault state ---
    let vault = &mut ctx.accounts.vault;
    vault.sol_balance = 0;
    vault.token_b_balance = 0;
    vault.is_distributed = true;

    Ok(())
}
