use crate::{lulo_v2, DepositType, Vault};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct DeployYield<'info> {
    // TODO: address constraint this to the estate auth
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

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

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

impl<'info> DeployYield<'info> {
    pub fn deploy_yield_handler(
        ctx: Context<'info, DeployYield<'info>>,
        amount: u64,
        deposit_type: DepositType,
    ) -> Result<()> {
        let vault_bump = ctx.accounts.vault.bump;
        let authority_key = ctx.accounts.authority.key();
        let heir_key = ctx.accounts.heir.key();
        let lulo_cpi_program_addr = ctx.accounts.lulo_accounts.program_id.key();

        let DeployYield { lulo_accounts, .. } = ctx.accounts;

        let vault_seeds: &[&[u8]] = &[
            Vault::SEED,
            authority_key.as_ref(),
            heir_key.as_ref(),
            &[vault_bump],
        ];
        let signer_seeds = &[vault_seeds];

        match deposit_type {
            DepositType::Protected => {
                let cpi_accounts = lulo_v2::cpi::accounts::DepositProtectedPool {
                    owner: ctx.accounts.vault.to_account_info(),
                    fee_payer: ctx.accounts.authority.to_account_info(),
                    input_mint: lulo_accounts.input_mint.to_account_info(),
                    owner_input_token_account: ctx
                        .accounts
                        .vault_token_account
                        .to_account_info()
                        .clone(),
                    pool: lulo_accounts.pool_account.to_account_info(),
                    pool_input_token_account: lulo_accounts
                        .pool_reserve_token_account
                        .to_account_info(),
                    pool_mint: lulo_accounts.lp_mint.to_account_info(),
                    pool_user: lulo_accounts.pool_user.to_account_info(),
                    pool_user_lp_token_account: lulo_accounts
                        .pool_user_lp_token_account
                        .to_account_info(),
                    input_mint_token_program: lulo_accounts
                        .input_mint_token_program
                        .to_account_info(),
                    lp_mint_token_program: lulo_accounts.lp_mint_token_program.to_account_info(),
                    flex_program: lulo_accounts.program_id.to_account_info(),
                    associated_token_program: ctx
                        .accounts
                        .associated_token_program
                        .to_account_info()
                        .clone(),
                    system_program: ctx.accounts.system_program.to_account_info().clone(),
                    rent: ctx.accounts.rent.to_account_info().clone(),
                    referrer_pool_user: lulo_accounts.referrer_pool_user.to_account_info(),
                };
                let cpi_ctx =
                    CpiContext::new_with_signer(lulo_cpi_program_addr, cpi_accounts, signer_seeds);
                lulo_v2::cpi::deposit_protected_pool(
                    cpi_ctx.with_remaining_accounts(ctx.remaining_accounts.to_vec()),
                    amount,
                )?;
            }
            DepositType::Boosted => {
                let cpi_accounts = lulo_v2::cpi::accounts::DepositRegularPool {
                    owner: ctx.accounts.vault.to_account_info(),
                    fee_payer: ctx.accounts.authority.to_account_info(),
                    input_mint: lulo_accounts.input_mint.to_account_info(),
                    owner_input_token_account: ctx.accounts.vault_token_account.to_account_info(),
                    pool: lulo_accounts.pool_account.to_account_info(),
                    pool_input_token_account: lulo_accounts
                        .pool_reserve_token_account
                        .to_account_info(),
                    pool_mint: lulo_accounts.lp_mint.to_account_info(),
                    pool_user: lulo_accounts.pool_user.to_account_info(),
                    pool_user_lp_token_account: lulo_accounts
                        .pool_user_lp_token_account
                        .to_account_info(),
                    input_mint_token_program: lulo_accounts
                        .input_mint_token_program
                        .to_account_info(),
                    lp_mint_token_program: lulo_accounts.lp_mint_token_program.to_account_info(),
                    flex_program: lulo_accounts.program_id.to_account_info(),
                    associated_token_program: ctx
                        .accounts
                        .associated_token_program
                        .to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                    referrer_pool_user: ctx
                        .accounts
                        .lulo_accounts
                        .referrer_pool_user
                        .to_account_info(),
                };

                let cpi_ctx =
                    CpiContext::new_with_signer(lulo_cpi_program_addr, cpi_accounts, signer_seeds);
                lulo_v2::cpi::deposit_regular_pool(
                    cpi_ctx.with_remaining_accounts(ctx.remaining_accounts.to_vec()),
                    amount,
                )?;
            }
        };

        Ok(())
    }

    pub fn validate() -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct LuloAccounts<'info> {
    /// CHECK: Lulo position pda
    #[account(mut)]
    pub pool_user: UncheckedAccount<'info>,

    /// CHECK: pool user input-mint ATA. intermediate hop.
    #[account(mut)]
    pub pool_user_token_account: UncheckedAccount<'info>,

    /// CHECK: the pool_user's LP-receipt ATA. created by deposit ix if missing.
    #[account(mut)]
    pub pool_user_lp_token_account: UncheckedAccount<'info>,

    /// CHECK: referrer's pool_user, must be owned by this program
    #[account(mut, constraint = referrer_pool_user.owner.key() == program_id.key())]
    pub referrer_pool_user: UncheckedAccount<'info>,

    pub input_mint: Box<InterfaceAccount<'info, Mint>>,

    /// pool's reserve token account (authority = pool_account).
    #[account(
        mut,
        token::mint = input_mint,
        token::authority = pool_account,
        token::token_program = input_mint_token_program,
    )]
    pub pool_reserve_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// the pool's LP/share mint (token22)
    #[account(mut)]
    pub lp_mint: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: Lulo pool state
    #[account(mut)]
    pub pool_account: UncheckedAccount<'info>,

    /// CHECK: Lulo program
    #[account(mut, address = lulo_v2::ID)]
    pub program_id: UncheckedAccount<'info>,

    pub input_mint_token_program: Interface<'info, TokenInterface>,
    pub lp_mint_token_program: Interface<'info, TokenInterface>,
}
