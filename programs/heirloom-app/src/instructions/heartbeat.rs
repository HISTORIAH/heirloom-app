use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Heartbeat<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ErrorCode::NotOwner,
    )]
    pub vault: Account<'info, Vault>,
}

pub fn handler(ctx: Context<Heartbeat>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(!vault.is_distributed, ErrorCode::VaultDistributed);

    let clock = Clock::get()?;
    vault.last_heartbeat = clock.unix_timestamp;

    Ok(())
}
