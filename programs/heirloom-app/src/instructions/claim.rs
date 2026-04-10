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
        constraint = token_a_mint.key() == vault.token_a_mint @ ErrorCode::InvalidMint,
    )]
    pub token_a_mint: Account<'info, Mint>,

    #[account(
        constraint = token_b_mint.key() == vault.token_b_mint @ ErrorCode::InvalidMint,
    )]
    pub token_b_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_a_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_b_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_b: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = heir,
        associated_token::mint = token_a_mint,
        associated_token::authority = heir,
    )]
    pub heir_token_a: Box<Account<'info, TokenAccount>>,

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
    let (heir_index, _split_bps, token_a_share, token_b_share, owner_key, bump, heir_count, claims_count, token_a_balance, token_b_balance) = {
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
        let token_a_share =
            (vault.token_a_balance as u128 * split_bps as u128 / BASIS_POINTS as u128) as u64;
        let token_b_share =
            (vault.token_b_balance as u128 * split_bps as u128 / BASIS_POINTS as u128) as u64;

        (
            heir_index,
            split_bps,
            token_a_share,
            token_b_share,
            vault.owner,
            vault.bump,
            vault.heir_count,
            vault.claims_count,
            vault.token_a_balance,
            vault.token_b_balance,
        )
    };

    // --- Phase 2: CPI transfers (needs immutable vault for to_account_info) ---
    let seeds: &[&[u8]] = &[VAULT_SEED, owner_key.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    if token_a_share > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault_token_a.to_account_info(),
                    to: ctx.accounts.heir_token_a.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            ),
            token_a_share,
        )?;
    }

    if token_b_share > 0 {
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

    // --- Phase 3: Update vault state (mutable access) ---
    let vault = &mut ctx.accounts.vault;
    vault.heirs[heir_index].has_claimed = true;

    let new_claims_count = claims_count + 1;
    let all_claimed = new_claims_count == heir_count;

    vault.token_a_balance = token_a_balance.saturating_sub(token_a_share);
    vault.token_b_balance = token_b_balance.saturating_sub(token_b_share);
    vault.claims_count = new_claims_count;
    vault.is_distributed = all_claimed;

    Ok(())
}
