use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    pub token_b_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = token_b_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_b: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<CreateVault>,
    heartbeat_interval: i64,
    grace_period: i64,
    heirs_data: Vec<HeirInput>,
    guardian: Option<Pubkey>,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Allow creation if vault is new (created_at == 0) or fully distributed
    if vault.created_at != 0 {
        require!(vault.is_distributed, ErrorCode::VaultAlreadyExists);
    }

    // Validate at least one heir and within max
    require!(!heirs_data.is_empty(), ErrorCode::NoHeirs);
    require!(heirs_data.len() <= MAX_HEIRS, ErrorCode::InvalidSplits);

    // Validate splits sum to exactly 10000 basis points
    let total_splits: u16 = heirs_data.iter().map(|h| h.split_bps).sum();
    require!(total_splits == BASIS_POINTS, ErrorCode::InvalidSplits);

    let clock = Clock::get()?;

    vault.owner = ctx.accounts.owner.key();
    vault.token_b_mint = ctx.accounts.token_b_mint.key();
    vault.heartbeat_interval = heartbeat_interval;
    vault.grace_period = grace_period;
    vault.last_heartbeat = clock.unix_timestamp;
    vault.sol_balance = 0;
    vault.token_b_balance = 0;
    vault.guardian = guardian;
    vault.guardian_pause_used = false;
    vault.is_distributed = false;
    vault.created_at = clock.unix_timestamp;
    vault.heir_count = heirs_data.len() as u8;
    vault.claims_count = 0;
    vault.bump = ctx.bumps.vault;

    // Store heirs (reset claim status for all)
    vault.heirs = heirs_data
        .iter()
        .map(|h| HeirEntry {
            heir: h.heir,
            split_bps: h.split_bps,
            has_claimed: false,
            is_active: true,
        })
        .collect();

    Ok(())
}
