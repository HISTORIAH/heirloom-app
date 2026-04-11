use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ErrorCode::NotOwner,
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(!vault.is_distributed, ErrorCode::VaultDistributed);
    require!(amount > 0, ErrorCode::NoBalance);

    // Transfer native SOL from owner to vault PDA
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: vault.to_account_info(),
            },
        ),
        amount,
    )?;

    vault.sol_balance = vault
        .sol_balance
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;

    Ok(())
}
