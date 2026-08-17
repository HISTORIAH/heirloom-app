use crate::{
    error::HeirloomError, helpers::*, lulo_v2, AssetRecord, DepositType, Estate, Vault,
    KAMINO_PROTOCOL_AUTHORITY, KAMINO_PROTOCOL_TOKEN_ACCOUNT, TREASURY,
};
use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token, token_interface::TokenAccount};

#[derive(Accounts)]
pub struct WithdrawProtected {
    #[account(mut)]
    pub caller: Signer,

    /// CHECK: estate authority pubkey, stored in estate; used for PDA seeds
    pub authority: UncheckedAccount,

    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = estate.bump,
    )]
    pub estate: Box<BorshAccount<Estate>>,

    #[account(
        mut,
        seeds = [Vault::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Box<Account<Vault>>,

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
        seeds = [
            AssetRecord::SEED,
            estate.address().as_ref(),
            lulo_accounts.input_mint.address().as_ref()
        ],
        bump = asset_record.bump,
    )]
    pub asset_record: Box<BorshAccount<AssetRecord>>,

    pub lulo_accounts: Nested<LuloAccounts>,

    pub kamino_accounts: Nested<GenericKamino>,

    /// CHECK: Lulo CPI
    #[account(mut, address = KAMINO_PROTOCOL_AUTHORITY)]
    pub protocol_authority: UncheckedAccount,

    /// CHECK: Lulo CPI
    #[account(mut, address = KAMINO_PROTOCOL_TOKEN_ACCOUNT)]
    pub protocol_authority_token_account: UncheckedAccount,

    #[account(mut)]
    pub treasury_token_account: Box<InterfaceAccount<TokenAccount>>,

    pub associated_token_program: Program<AssociatedToken>,

    pub system_program: Program<System>,
}

impl WithdrawProtected {
    #[inline(never)]
    pub fn withdraw_protected_handler(
        ctx: &mut Context<WithdrawProtected>,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        let remaining_accounts = ctx.remaining_accounts()?;
        let remaining_handles: Vec<_> = remaining_accounts
            .iter()
            .map(anchor_lang::ToCpiHandle::to_cpi_handle)
            .collect();

        // vault balance before withdrawal
        let vault_balance_before = ctx.accounts.vault_token_account.amount();
        let authority_addr_arr = *ctx.accounts.authority.address().as_array();
        let heir_addr_arr = *ctx.accounts.heir.address().as_array();

        let vault_seeds: &[&[u8]] = &[
            Vault::SEED,
            authority_addr_arr.as_ref(),
            heir_addr_arr.as_ref(),
            &[ctx.accounts.vault.bump],
        ];
        let signer_seeds = &[vault_seeds];

        let cpi_accounts = lulo_v2::cpi::accounts::WithdrawProtectedPool {
            owner: ctx.accounts.vault.to_cpi_handle(),
            fee_payer: ctx.accounts.caller.to_cpi_handle_mut(),
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
            protected_mint: ctx.accounts.lulo_accounts.0.lp_mint.to_cpi_handle_mut(),
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
            system_program: ctx.accounts.system_program.to_cpi_handle(),
            referrer_pool_user: ctx
                .accounts
                .lulo_accounts
                .0
                .referrer_pool_user
                .to_cpi_handle_mut(),
            protocol_authority: ctx.accounts.protocol_authority.to_cpi_handle_mut(),
            protocol_authority_token_account: ctx
                .accounts
                .protocol_authority_token_account
                .to_cpi_handle_mut(),
            market: ctx.accounts.kamino_accounts.0.market.to_cpi_handle_mut(),
            obligation: ctx
                .accounts
                .kamino_accounts
                .0
                .obligation
                .to_cpi_handle_mut(),
            reserve: ctx.accounts.kamino_accounts.0.reserve.to_cpi_handle_mut(),
            reserve_liquidity_supply: ctx
                .accounts
                .kamino_accounts
                .0
                .reserve_liquidity_supply
                .to_cpi_handle_mut(),
            lending_market_authority: ctx
                .accounts
                .kamino_accounts
                .0
                .lending_market_authority
                .to_cpi_handle(),
            collateral_mint: ctx
                .accounts
                .kamino_accounts
                .0
                .collateral_mint
                .to_cpi_handle_mut(),
            collateral_token_account: ctx
                .accounts
                .kamino_accounts
                .0
                .collateral_token_account
                .to_cpi_handle_mut(),
            reserve_collateral_supply: ctx
                .accounts
                .kamino_accounts
                .0
                .reserve_collateral_supply
                .to_cpi_handle_mut(),
            collateral_token_program: ctx
                .accounts
                .kamino_accounts
                .0
                .collateral_token_program
                .to_cpi_handle(),
            instructions_sysvar: ctx
                .accounts
                .kamino_accounts
                .0
                .instructions_sysvar
                .to_cpi_handle(),
            kamino_program: ctx
                .accounts
                .kamino_accounts
                .0
                .kamino_program
                .to_cpi_handle(),
            farms_program: ctx.accounts.kamino_accounts.0.farms_program.to_cpi_handle(),
            reserve_farm_state: ctx
                .accounts
                .kamino_accounts
                .0
                .reserve_farm_state
                .as_mut()
                .map(|a| a.to_cpi_handle_mut()),
            obligation_farm_user_state: ctx
                .accounts
                .kamino_accounts
                .0
                .obligation_farm_user_state
                .as_mut()
                .map(|a| a.to_cpi_handle_mut()),
            scope_prices: ctx
                .accounts
                .kamino_accounts
                .0
                .scope_prices
                .as_ref()
                .map(|a| a.to_cpi_handle()),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.lulo_accounts.0.program_id.address(),
            cpi_accounts,
            signer_seeds,
        );
        lulo_v2::cpi::withdraw_protected_pool(
            cpi_ctx.with_remaining_accounts(remaining_handles),
            amount,
        )?;

        // fee calculation
        let token_program_addr = ctx
            .accounts
            .lulo_accounts
            .0
            .input_mint_token_program
            .address();
        skim_lulo_yield_fee(
            &mut ctx.accounts.vault_token_account,
            &mut ctx.accounts.asset_record,
            &ctx.accounts.lulo_accounts.0.input_mint,
            &mut ctx.accounts.treasury_token_account,
            &ctx.accounts.vault,
            token_program_addr,
            signer_seeds,
            vault_balance_before,
        )?;

        // close-safety: refresh from the real Lulo position, not our bookkeeping
        refresh_lulo_exposure(
            &mut ctx.accounts.asset_record,
            &ctx.accounts.lulo_accounts.0.pool_user_lp_token_account,
            DepositType::Protected,
        )?;

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        // check treasury token account
        require_keys_eq!(
            *self.treasury_token_account.owner(),
            TREASURY,
            HeirloomError::InvalidAccount
        );

        // this can be the heir / estate authority
        let caller = *self.caller.address();
        let now = Clock::get()?.unix_timestamp;

        if caller == self.estate.authority {
            return Ok(());
        }

        if caller == self.estate.heir {
            let claimable_at = self
                .estate
                .last_heartbeat
                .checked_add(self.estate.heartbeat_interval)
                .and_then(|t| t.checked_add(self.estate.grace_period))
                .ok_or(ProgramError::ArithmeticOverflow)?;

            require!(
                now >= claimable_at.max(self.estate.paused_until),
                HeirloomError::NotYetClaimable
            );

            return Ok(());
        }

        Err(HeirloomError::Unauthorized.into())
    }
}
