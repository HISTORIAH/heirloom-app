use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct UpdateHeirs<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ErrorCode::NotOwner,
    )]
    pub vault: Account<'info, Vault>,
}

pub fn handler(ctx: Context<UpdateHeirs>, new_heirs: Vec<HeirInput>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(!vault.is_distributed, ErrorCode::VaultDistributed);

    // Validate at least one heir and within max
    require!(!new_heirs.is_empty(), ErrorCode::NoHeirs);
    require!(new_heirs.len() <= MAX_HEIRS, ErrorCode::InvalidSplits);

    // Validate splits sum to exactly 10000 basis points
    let total_splits: u16 = new_heirs.iter().map(|h| h.split_bps).sum();
    require!(total_splits == BASIS_POINTS, ErrorCode::InvalidSplits);

    // Update heirs
    vault.heirs = new_heirs
        .iter()
        .map(|h| HeirEntry {
            heir: h.heir,
            split_bps: h.split_bps,
            has_claimed: false,
            is_active: true,
        })
        .collect();

    vault.heir_count = new_heirs.len() as u8;
    vault.claims_count = 0;

    Ok(())
}
