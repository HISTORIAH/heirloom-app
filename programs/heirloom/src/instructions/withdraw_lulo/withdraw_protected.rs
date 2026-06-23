use crate::{
    helpers::*, lulo_v2, Estate, Vault, KAMINO_PROTOCOL_AUTHORITY, KAMINO_PROTOCOL_TOKEN_ACCOUNT,
};
use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::TokenAccount};

#[derive(Accounts)]
pub struct WithdrawProtected<'info> {
    // TODO: address constraint this to the estate auth
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount<'info>,

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

    // We expect this to exist
    #[account(
        mut,
        token::mint = lulo_accounts.input_mint,
        token::authority = vault,
        token::token_program = lulo_accounts.input_mint_token_program,
    )]
    pub vault_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub lulo_accounts: LuloAccounts<'info>,

    pub kamino_accounts: GenericKamino<'info>,

    /// CHECK: Lulo CPI
    #[account(mut, address = KAMINO_PROTOCOL_AUTHORITY)]
    pub protocol_authority: UncheckedAccount<'info>,

    /// CHECK: Lulo CPI
    #[account(mut, address = KAMINO_PROTOCOL_TOKEN_ACCOUNT)]
    pub protocol_authority_token_account: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawProtected<'info> {
    pub fn withdraw_protected_handler(
        ctx: Context<'info, WithdrawProtected<'info>>,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        let vault_bump = ctx.accounts.vault.bump;
        let authority_key = ctx.accounts.authority.key();
        let heir_key = ctx.accounts.heir.key();
        let lulo_cpi_program_addr = ctx.accounts.lulo_accounts.program_id.key();

        let vault_seeds: &[&[u8]] = &[
            Vault::SEED,
            authority_key.as_ref(),
            heir_key.as_ref(),
            &[vault_bump],
        ];
        let signer_seeds = &[vault_seeds];

        let cpi_accounts = lulo_v2::cpi::accounts::WithdrawProtectedPool {
            owner: ctx.accounts.vault.to_account_info(),
            fee_payer: ctx.accounts.authority.to_account_info(),
            input_mint: ctx.accounts.lulo_accounts.input_mint.to_account_info(),
            owner_input_token_account: ctx.accounts.vault_token_account.to_account_info(),
            pool: ctx.accounts.lulo_accounts.pool_account.to_account_info(),
            pool_input_token_account: ctx
                .accounts
                .lulo_accounts
                .pool_reserve_token_account
                .to_account_info(),
            protected_mint: ctx.accounts.lulo_accounts.lp_mint.to_account_info(),
            pool_user: ctx.accounts.lulo_accounts.pool_user.to_account_info(),
            pool_user_lp_token_account: ctx
                .accounts
                .lulo_accounts
                .pool_user_lp_token_account
                .to_account_info(),
            input_mint_token_program: ctx
                .accounts
                .lulo_accounts
                .input_mint_token_program
                .to_account_info(),
            lp_mint_token_program: ctx
                .accounts
                .lulo_accounts
                .lp_mint_token_program
                .to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            referrer_pool_user: ctx
                .accounts
                .lulo_accounts
                .referrer_pool_user
                .to_account_info(),
            protocol_authority: ctx.accounts.protocol_authority.to_account_info(),
            protocol_authority_token_account: ctx
                .accounts
                .protocol_authority_token_account
                .to_account_info(),
            market: ctx.accounts.kamino_accounts.market.to_account_info(),
            obligation: ctx.accounts.kamino_accounts.obligation.to_account_info(),
            reserve: ctx.accounts.kamino_accounts.reserve.to_account_info(),
            reserve_liquidity_supply: ctx
                .accounts
                .kamino_accounts
                .reserve_liquidity_supply
                .to_account_info(),
            lending_market_authority: ctx
                .accounts
                .kamino_accounts
                .lending_market_authority
                .to_account_info(),
            collateral_mint: ctx
                .accounts
                .kamino_accounts
                .collateral_mint
                .to_account_info(),
            collateral_token_account: ctx
                .accounts
                .kamino_accounts
                .collateral_token_account
                .to_account_info(),
            reserve_collateral_supply: ctx
                .accounts
                .kamino_accounts
                .reserve_collateral_supply
                .to_account_info(),
            collateral_token_program: ctx
                .accounts
                .kamino_accounts
                .collateral_token_program
                .to_account_info(),
            instructions_sysvar: ctx
                .accounts
                .kamino_accounts
                .instructions_sysvar
                .to_account_info(),
            kamino_program: ctx
                .accounts
                .kamino_accounts
                .kamino_program
                .to_account_info(),
            farms_program: ctx.accounts.kamino_accounts.farms_program.to_account_info(),
            reserve_farm_state: ctx
                .accounts
                .kamino_accounts
                .reserve_farm_state
                .as_ref()
                .map(|a| a.to_account_info()),
            obligation_farm_user_state: ctx
                .accounts
                .kamino_accounts
                .obligation_farm_user_state
                .as_ref()
                .map(|a| a.to_account_info()),
            scope_prices: ctx
                .accounts
                .kamino_accounts
                .scope_prices
                .as_ref()
                .map(|a| a.to_account_info()),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(lulo_cpi_program_addr, cpi_accounts, signer_seeds);
        lulo_v2::cpi::withdraw_protected_pool(
            cpi_ctx.with_remaining_accounts(ctx.remaining_accounts.to_vec()),
            amount,
        )?;

        Ok(())
    }

    // TODO
    pub fn validate(&self) -> Result<()> {
        Ok(())
    }
}
