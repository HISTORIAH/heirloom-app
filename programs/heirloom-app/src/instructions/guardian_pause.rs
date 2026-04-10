use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct GuardianPause<'info> {
    pub guardian: Signer<'info>,

    /// CHECK: The vault owner pubkey, validated by the vault's PDA seeds and has_one constraint.
    pub vault_owner: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, vault_owner.key().as_ref()],
        bump = vault.bump,
        constraint = vault.owner == vault_owner.key() @ ErrorCode::NotOwner,
    )]
    pub vault: Account<'info, Vault>,
}

pub fn handler(ctx: Context<GuardianPause>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    // Must be the guardian
    require!(
        vault.guardian == Some(ctx.accounts.guardian.key()),
        ErrorCode::NotGuardian
    );

    let elapsed = vault.get_elapsed(clock.unix_timestamp);
    let interval = vault.heartbeat_interval;
    let total = interval + vault.grace_period;

    // Must be in grace period (past interval, before full deadline)
    require!(elapsed >= interval, ErrorCode::NotInGrace);
    require!(elapsed < total, ErrorCode::VaultNotClaimable);

    // Guardian can only pause once
    require!(!vault.guardian_pause_used, ErrorCode::GuardianPauseUsed);

    vault.guardian_pause_used = true;

    Ok(())
}
