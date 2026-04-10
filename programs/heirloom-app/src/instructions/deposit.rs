use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ErrorCode::NotOwner,
    )]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let mint_key = ctx.accounts.mint.key();

    require!(!vault.is_distributed, ErrorCode::VaultDistributed);
    require!(amount > 0, ErrorCode::NoBalance);

    // Determine which token is being deposited and update internal balance
    if mint_key == vault.token_a_mint {
        vault.token_a_balance = vault
            .token_a_balance
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
    } else if mint_key == vault.token_b_mint {
        vault.token_b_balance = vault
            .token_b_balance
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
    } else {
        return Err(ErrorCode::InvalidMint.into());
    }

    // Transfer tokens from owner to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.owner_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}
