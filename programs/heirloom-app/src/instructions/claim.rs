use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub heir: Signer<'info>,

    /// CHECK: The vault owner pubkey, validated by the vault's PDA seeds and constraint.
    pub vault_owner: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, vault_owner.key().as_ref()],
        bump = vault.bump,
        constraint = vault.owner == vault_owner.key() @ ErrorCode::NotOwner,
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
        payer = heir,
        associated_token::mint = token_b_mint,
        associated_token::authority = heir,
    )]
    pub heir_token_b: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<Claim>) -> Result<()> {
    let heir_key = ctx.accounts.heir.key();
    let clock = Clock::get()?;

    // --- Phase 1: Read and validate (immutable access to vault) ---
    let (heir_index, sol_share, token_b_share, owner_key, bump, heir_count, claims_count, sol_balance, token_b_balance) = {
        let vault = &ctx.accounts.vault;

        require!(!vault.is_distributed, ErrorCode::VaultDistributed);

        let elapsed = vault.get_elapsed(clock.unix_timestamp);
        let deadline = vault.get_effective_deadline();
        require!(elapsed >= deadline, ErrorCode::VaultNotClaimable);

        let heir_index = vault
            .heirs
            .iter()
            .position(|h| h.is_active && h.heir == heir_key)
            .ok_or(ErrorCode::NotHeir)?;

        require!(
            !vault.heirs[heir_index].has_claimed,
            ErrorCode::AlreadyClaimed
        );

        let split_bps = vault.heirs[heir_index].split_bps as u64;
        let sol_share =
            (vault.sol_balance as u128 * split_bps as u128 / BASIS_POINTS as u128) as u64;
        let token_b_share =
            (vault.token_b_balance as u128 * split_bps as u128 / BASIS_POINTS as u128) as u64;

        (
            heir_index,
            sol_share,
            token_b_share,
            vault.owner,
            vault.bump,
            vault.heir_count,
            vault.claims_count,
            vault.sol_balance,
            vault.token_b_balance,
        )
    };

    // --- Phase 2: Transfer native SOL share to heir ---
    if sol_share > 0 {
        let vault_info = ctx.accounts.vault.to_account_info();
        let heir_info = ctx.accounts.heir.to_account_info();
        **vault_info.try_borrow_mut_lamports()? -= sol_share;
        **heir_info.try_borrow_mut_lamports()? += sol_share;
    }

    // --- Phase 3: Transfer USDC share via SPL token ---
    if token_b_share > 0 {
        let seeds: &[&[u8]] = &[VAULT_SEED, owner_key.as_ref(), &[bump]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault_token_b.to_account_info(),
                    to: ctx.accounts.heir_token_b.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            ),
            token_b_share,
        )?;
    }

    // --- Phase 4: Update vault state ---
    let vault = &mut ctx.accounts.vault;
    vault.heirs[heir_index].has_claimed = true;

    let new_claims_count = claims_count + 1;
    let all_claimed = new_claims_count == heir_count;

    vault.sol_balance = sol_balance.saturating_sub(sol_share);
    vault.token_b_balance = token_b_balance.saturating_sub(token_b_share);
    vault.claims_count = new_claims_count;
    vault.is_distributed = all_claimed;

    Ok(())
}
