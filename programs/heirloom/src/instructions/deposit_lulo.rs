use crate::{error::HeirloomError, helpers::*, lulo_v2, AssetRecord, DepositType, Estate, Vault};
use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::TokenAccount};

#[derive(Accounts)]
pub struct DepositLulo<'info> {
    // only authority can authorize this hence the address gate
    #[account(mut, address = estate.authority)]
    pub authority: Signer<'info>,

    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount<'info>,

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

    // NOTE: remove me if ix size is too large
    #[account(
        mut,
        seeds = [Estate::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = estate.bump,
    )]
    pub estate: Account<'info, Estate>,

    #[account(
        mut,
        seeds = [
            AssetRecord::SEED,
            estate.key().as_ref(),
            lulo_accounts.input_mint.key().as_ref()
        ],
        bump = asset_record.bump,
    )]
    pub asset_record: Box<Account<'info, AssetRecord>>,

    pub lulo_accounts: LuloAccounts<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

impl<'info> DepositLulo<'info> {
    pub fn deploy_yield_handler(
        ctx: Context<'info, DepositLulo<'info>>,
        amount: u64,
        deposit_type: DepositType,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        let asset_record = &mut ctx.accounts.asset_record;
        let vault_bump = ctx.accounts.vault.bump;
        let authority_key = ctx.accounts.authority.key();
        let heir_key = ctx.accounts.heir.key();
        let lulo_cpi_program_addr = ctx.accounts.lulo_accounts.program_id.key();

        let DepositLulo { lulo_accounts, .. } = ctx.accounts;

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

        // update principal deployed
        asset_record.principal_deployed = asset_record
            .principal_deployed
            .checked_add(amount)
            .ok_or(HeirloomError::MathOverflow)?;

        Ok(())
    }

    // TODO
    pub fn validate(&self) -> Result<()> {
        Ok(())
    }
}
