use crate::{Estate, Vault};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenAccount;

#[derive(Accounts)]
pub struct DeployYield<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount<'info>,

    /// CHECK: optional delegate pubkey
    pub delegate: Option<UncheckedAccount<'info>>,

    /// CHECK: optional hot-signer pubkey
    pub hb_signer: Option<UncheckedAccount<'info>>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = estate.bump,
    )]
    pub estate: Account<'info, Estate>,

    #[account(
        mut,
        seeds = [Vault::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

impl DeployYield<'_> {
    pub fn deploy_yield_handler(ctx: Context<DeployYield>) -> Result<()> {
        let _remaining_accs = ctx.remaining_accounts;

        Ok(())
    }

    pub fn validate() -> Result<()> {
        Ok(())
    }
}
