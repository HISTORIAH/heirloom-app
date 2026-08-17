use crate::{error::HeirloomError, helpers::*, lulo_v2, AssetRecord, DepositType, Estate, Vault};
use anchor_lang::prelude::*;

use anchor_spl::{associated_token::AssociatedToken, token, token_interface::TokenAccount};

#[derive(Accounts)]
pub struct DepositLulo {
    // only authority can authorize this hence the address gate
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount,

    #[account(
        mut,
        seeds = [Vault::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<Vault>,

    // We expect this to exist
    #[account(
        mut,
        token::mint = lulo_accounts.input_mint.address(),
        token::authority = vault,
        token::token_program = lulo_accounts.input_mint_token_program.address(),
    )]
    pub vault_token_account: Box<InterfaceAccount<TokenAccount>>,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = estate.bump,
    )]
    pub estate: BorshAccount<Estate>,

    #[account(
        mut,
        seeds = [
            AssetRecord::SEED,
            estate.address().as_ref(),
            lulo_accounts.input_mint.address().as_ref()
        ],
        bump = asset_record.bump,
    )]
    pub asset_record: Box<BorshAccount<AssetRecord>>,

    pub lulo_accounts: Nested<LuloAccounts>,

    pub associated_token_program: Program<AssociatedToken>,

    pub rent: Sysvar<Rent>,

    pub system_program: Program<System>,
}

impl DepositLulo {
    pub fn deploy_yield_handler(
        ctx: &mut Context<DepositLulo>,
        amount: u64,
        deposit_type: DepositType,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        // let lulo_cpi_program_addr = ctx.accounts.lulo_accounts.0.program_id.address();

        let authority_addr_arr = *ctx.accounts.authority.address().as_array();
        let heir_addr_arr = *ctx.accounts.heir.address().as_array();
        let vault_seeds: &[&[u8]] = &[
            Vault::SEED,
            authority_addr_arr.as_ref(),
            heir_addr_arr.as_ref(),
            &[ctx.accounts.vault.bump],
        ];
        let signer_seeds = &[vault_seeds];

        match deposit_type {
            DepositType::Protected => {
                let remaining_accounts = ctx.remaining_accounts()?;
                let remaining_handles: Vec<_> = remaining_accounts
                    .iter()
                    .map(anchor_lang::ToCpiHandle::to_cpi_handle)
                    .collect();

                let cpi_accounts = lulo_v2::cpi::accounts::DepositProtectedPool {
                    owner: ctx.accounts.vault.to_cpi_handle_mut(),
                    fee_payer: ctx.accounts.authority.to_cpi_handle_mut(),
                    input_mint: ctx.accounts.lulo_accounts.0.input_mint.to_cpi_handle(),
                    owner_input_token_account: ctx
                        .accounts
                        .vault_token_account
                        .to_cpi_handle_mut()
                        .clone(),
                    pool: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .pool_account
                        .to_cpi_handle_mut(),
                    pool_input_token_account: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .pool_reserve_token_account
                        .to_cpi_handle_mut(),
                    pool_mint: ctx.accounts.lulo_accounts.0.lp_mint.to_cpi_handle_mut(),
                    pool_user: ctx.accounts.lulo_accounts.0.pool_user.to_cpi_handle_mut(),
                    pool_user_lp_token_account: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .pool_user_lp_token_account
                        .to_cpi_handle_mut(),
                    input_mint_token_program: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .input_mint_token_program
                        .to_cpi_handle(),
                    lp_mint_token_program: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .lp_mint_token_program
                        .to_cpi_handle(),
                    flex_program: ctx.accounts.lulo_accounts.0.program_id.to_cpi_handle(),
                    associated_token_program: ctx
                        .accounts
                        .associated_token_program
                        .to_cpi_handle()
                        .clone(),
                    system_program: ctx.accounts.system_program.to_cpi_handle().clone(),
                    rent: ctx.accounts.rent.to_cpi_handle().clone(),
                    referrer_pool_user: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .referrer_pool_user
                        .to_cpi_handle_mut(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.lulo_accounts.0.program_id.address(),
                    cpi_accounts,
                    signer_seeds,
                );

                lulo_v2::cpi::deposit_protected_pool(
                    cpi_ctx.with_remaining_accounts(remaining_handles),
                    amount,
                )?;
            }
            DepositType::Boosted => {
                let remaining_accounts = ctx.remaining_accounts()?;
                let remaining_handles: Vec<_> = remaining_accounts
                    .iter()
                    .map(anchor_lang::ToCpiHandle::to_cpi_handle)
                    .collect();

                let cpi_accounts = lulo_v2::cpi::accounts::DepositRegularPool {
                    owner: ctx.accounts.vault.to_cpi_handle_mut(),
                    fee_payer: ctx.accounts.authority.to_cpi_handle_mut(),
                    input_mint: ctx.accounts.lulo_accounts.0.input_mint.to_cpi_handle(),
                    owner_input_token_account: ctx.accounts.vault_token_account.to_cpi_handle_mut(),
                    pool: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .pool_account
                        .to_cpi_handle_mut(),
                    pool_input_token_account: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .pool_reserve_token_account
                        .to_cpi_handle_mut(),
                    pool_mint: ctx.accounts.lulo_accounts.0.lp_mint.to_cpi_handle_mut(),
                    pool_user: ctx.accounts.lulo_accounts.0.pool_user.to_cpi_handle_mut(),
                    pool_user_lp_token_account: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .pool_user_lp_token_account
                        .to_cpi_handle_mut(),
                    input_mint_token_program: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .input_mint_token_program
                        .to_cpi_handle(),
                    lp_mint_token_program: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .lp_mint_token_program
                        .to_cpi_handle(),
                    flex_program: ctx.accounts.lulo_accounts.0.program_id.to_cpi_handle(),
                    associated_token_program: ctx.accounts.associated_token_program.to_cpi_handle(),
                    system_program: ctx.accounts.system_program.to_cpi_handle(),
                    rent: ctx.accounts.rent.to_cpi_handle(),
                    referrer_pool_user: ctx
                        .accounts
                        .lulo_accounts
                        .0
                        .referrer_pool_user
                        .to_cpi_handle_mut(),
                };

                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.lulo_accounts.0.program_id.address(),
                    cpi_accounts,
                    signer_seeds,
                );

                lulo_v2::cpi::deposit_regular_pool(
                    cpi_ctx.with_remaining_accounts(remaining_handles),
                    amount,
                )?;
            }
        };

        let asset_record = &mut ctx.accounts.asset_record;
        match deposit_type {
            DepositType::Protected => asset_record.has_protected_exposure = true,
            DepositType::Boosted => asset_record.has_boosted_exposure = true,
        }

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
