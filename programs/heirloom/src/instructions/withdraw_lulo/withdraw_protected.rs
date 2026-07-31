use crate::{
    error::HeirloomError, helpers::*, lulo_v2, AssetRecord, Estate, Vault,
    KAMINO_PROTOCOL_AUTHORITY, KAMINO_PROTOCOL_TOKEN_ACCOUNT, TREASURY, YIELD_FEE_BPS,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, TokenAccount, TransferChecked},
};

#[derive(Accounts)]
pub struct WithdrawProtected<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// FIXME: when heir is calling the ix as authority, this will cause an issue with the dup acc check
    /// CHECK: heir pubkey, stored in estate
    pub heir: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = estate.bump,
    )]
    pub estate: Box<Account<'info, Estate>>,

    #[account(
        mut,
        seeds = [Vault::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Box<Account<'info, Vault>>,

    // We expect this to exist
    #[account(
        mut,
        token::mint = lulo_accounts.input_mint,
        token::authority = vault,
        token::token_program = lulo_accounts.input_mint_token_program,
    )]
    pub vault_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

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

    pub kamino_accounts: GenericKamino<'info>,

    /// CHECK: Lulo CPI
    #[account(mut, address = KAMINO_PROTOCOL_AUTHORITY)]
    pub protocol_authority: UncheckedAccount<'info>,

    /// CHECK: Lulo CPI
    #[account(mut, address = KAMINO_PROTOCOL_TOKEN_ACCOUNT)]
    pub protocol_authority_token_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub treasury_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawProtected<'info> {
    pub fn withdraw_protected_handler(
        ctx: Context<'info, WithdrawProtected<'info>>,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        // vault balance before withdrawal
        let vault_balance_before = ctx.accounts.vault_token_account.amount;
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

        // fee calculation
        ctx.accounts.vault_token_account.reload()?;
        let returned = ctx
            .accounts
            .vault_token_account
            .amount
            .checked_sub(vault_balance_before)
            .ok_or(HeirloomError::MathUnderflow)?;
        let principal_returned = returned.min(ctx.accounts.asset_record.principal_deployed);
        let yield_amount = returned
            .checked_sub(principal_returned)
            .ok_or(HeirloomError::MathUnderflow)?;

        ctx.accounts.asset_record.principal_deployed -= principal_returned;

        if yield_amount > 0 {
            let (fee, _) = calculate_distribution(yield_amount, YIELD_FEE_BPS)?;
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.vault_token_account.to_account_info(),
                mint: ctx.accounts.lulo_accounts.input_mint.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            };

            let token_program_addr = ctx.accounts.lulo_accounts.input_mint_token_program.key();
            let cpi_context =
                CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

            token_interface::transfer_checked(
                cpi_context,
                fee,
                ctx.accounts.lulo_accounts.input_mint.decimals,
            )?;
        }

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        // check treasury token account
        require_eq!(
            self.treasury_token_account.owner.key(),
            TREASURY,
            HeirloomError::InvalidAccount
        );

        // this can be the heir / estate authority
        let caller = self.authority.key();
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

        err!(HeirloomError::Unauthorized)
    }
}
