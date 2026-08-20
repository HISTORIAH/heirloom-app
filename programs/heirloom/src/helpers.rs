//! Shared helpers and reusable CPI account structs.
//!
//! Contains math utilities, account lifecycle helpers, and account bundles
//! used when calling external programs (Lulo, Kamino).

use anchor_lang::prelude::*;
use anchor_spl::{
    token,
    token_interface::{self, Mint, TokenAccount},
};
use solana_instructions_sysvar::ID as SOLANA_SYSVAR_IX_ID;

use crate::{
    error::HeirloomError, lulo_v2, AssetRecord, DepositType, Vault, KAMINO_FARMS_PROGRAM_ID,
    KAMINO_PROGRAM_ID, MAX_INTERVAL_SECONDS, SCOPE_PRICES_PROGRAM_ID, YIELD_FEE_BPS,
};

// ----------------------------------------------------------------- Math & validation

/// Splits `gross_amount` into a protocol fee and a net payout using ceiling
/// division so the fee always rounds up.
pub(crate) fn calculate_distribution(gross_amount: u64, fee_bps: u16) -> Result<(u64, u64)> {
    let gross = gross_amount as u128;
    let fee = fee_bps as u128;
    let protocol_fee = ((gross * fee + 9_999) / 10_000) as u64;

    let payout = gross_amount
        .checked_sub(protocol_fee)
        .ok_or(HeirloomError::MathUnderflow)?;

    Ok((protocol_fee, payout))
}

/// Ensures `value` is a non-negative interval that does not exceed the max
/// allowed duration.
pub(crate) fn validate_interval(value: i64) -> Result<()> {
    require!(value >= 0, HeirloomError::IntervalNegative);
    require!(
        value <= MAX_INTERVAL_SECONDS,
        HeirloomError::IntervalTooLong
    );
    Ok(())
}

// ----------------------------------------------------------------- Lulo integration

/// Splits a Lulo withdrawal into principal and yield (principal is returned
/// first; any excess is yield), then transfers the protocol yield fee to the
/// treasury.
#[inline(never)]
pub(crate) fn skim_lulo_yield_fee(
    vault_token_account: &mut InterfaceAccount<TokenAccount>,
    asset_record: &mut BorshAccount<AssetRecord>,
    input_mint: &InterfaceAccount<Mint>,
    treasury_token_account: &mut InterfaceAccount<TokenAccount>,
    vault: &Account<Vault>,
    token_program_addr: &Address,
    signer_seeds: &[&[&[u8]]],
    vault_balance_before: u64,
) -> Result<()> {
    let returned = vault_token_account
        .amount()
        .checked_sub(vault_balance_before)
        .ok_or(HeirloomError::MathUnderflow)?;
    let principal_returned = returned.min(asset_record.principal_deployed);
    let yield_amount = returned
        .checked_sub(principal_returned)
        .ok_or(HeirloomError::MathUnderflow)?;

    asset_record.principal_deployed -= principal_returned;

    if yield_amount > 0 {
        let (fee, _) = calculate_distribution(yield_amount, YIELD_FEE_BPS)?;
        let cpi_accounts = token_interface::TransferChecked {
            from: vault_token_account.to_cpi_handle_mut(),
            mint: input_mint.to_cpi_handle(),
            to: treasury_token_account.to_cpi_handle_mut(),
            authority: vault.to_cpi_handle(),
        };

        let cpi_context =
            CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

        token_interface::transfer_checked(cpi_context, fee, input_mint.decimals())?;
    }

    Ok(())
}

/// Updates an `AssetRecord`'s exposure flags from the vault's LP-receipt
/// balance for the given deposit type.
#[inline(never)]
pub(crate) fn refresh_lulo_exposure(
    asset_record: &mut BorshAccount<AssetRecord>,
    pool_user_lp_token_account: &UncheckedAccount,
    deposit_type: DepositType,
) -> Result<()> {
    let lp_balance = {
        let data = pool_user_lp_token_account.account().try_borrow()?;
        bytemuck::from_bytes::<token::TokenAccount>(&data[..core::mem::size_of::<token::TokenAccount>()])
            .amount()
    };

    match deposit_type {
        DepositType::Protected => asset_record.has_protected_exposure = lp_balance > 0,
        DepositType::Boosted => {
            asset_record.has_boosted_exposure =
                lp_balance > 0 || asset_record.pending_boosted_withdrawals > 0
        }
    }

    Ok(())
}

/// Accounts required for Lulo v2 CPI calls.
#[derive(Accounts)]
pub struct LuloAccounts {
    /// CHECK: Lulo position PDA.
    #[account(mut)]
    pub pool_user: UncheckedAccount,

    /// CHECK: Pool user input-mint ATA; intermediate hop.
    #[account(mut)]
    pub pool_user_token_account: UncheckedAccount,

    /// CHECK: Pool user's LP-receipt ATA; created by the deposit ix if missing.
    #[account(mut)]
    pub pool_user_lp_token_account: UncheckedAccount,

    /// CHECK: Referrer's pool_user; must be owned by this program.
    #[account(mut, constraint = referrer_pool_user.owner() == program_id.address())]
    pub referrer_pool_user: UncheckedAccount,

    pub input_mint: Box<InterfaceAccount<Mint>>,

    /// Pool's reserve token account (authority = pool_account).
    #[account(
        mut,
        token::mint = input_mint,
        token::authority = pool_account,
        token::token_program = input_mint_token_program,
    )]
    pub pool_reserve_token_account: Box<InterfaceAccount<TokenAccount>>,

    /// The pool's LP/share mint (Token-2022).
    #[account(mut)]
    pub lp_mint: Box<InterfaceAccount<Mint>>,

    /// CHECK: Lulo pool state.
    #[account(mut)]
    pub pool_account: UncheckedAccount,

    /// CHECK: Lulo program.
    #[account(mut, address = lulo_v2::ID)]
    pub program_id: UncheckedAccount,

    /// CHECK: verified below via constraint, Switch to Interface<TokenInterface>/similar on stable release.
    #[account(
        constraint = *input_mint_token_program.address() == Token::id()
            || *input_mint_token_program.address() == Token2022::id()
    )]
    pub input_mint_token_program: UncheckedAccount,

    /// CHECK: verified below via constraint, Switch to Interface<TokenInterface>/similar on stable release.
    #[account(
        constraint = *lp_mint_token_program.address() == Token::id()
            || *lp_mint_token_program.address() == Token2022::id()
    )]
    pub lp_mint_token_program: UncheckedAccount,
}

// ----------------------------------------------------------------- Kamino integration

/// Accounts required for Kamino lending CPI calls (e.g. withdrawals).
#[derive(Accounts)]
pub struct GenericKamino {
    /// CHECK: CPI
    #[account(mut)]
    pub market: UncheckedAccount,

    /// CHECK: CPI
    #[account(mut)]
    pub obligation: UncheckedAccount,

    /// CHECK: CPI
    #[account(mut)]
    pub reserve: UncheckedAccount,

    #[account(mut)]
    pub reserve_liquidity_supply: Box<InterfaceAccount<TokenAccount>>,

    /// CHECK: CPI
    pub lending_market_authority: UncheckedAccount,

    /// Collateral mint; needs mut.
    #[account(mut)]
    pub collateral_mint: Box<InterfaceAccount<Mint>>,

    #[account(mut)]
    pub collateral_token_account: Box<InterfaceAccount<TokenAccount>>,

    #[account(mut)]
    pub reserve_collateral_supply: Box<InterfaceAccount<TokenAccount>>,

    /// CHECK: verified below via constraint, Switch to Interface<TokenInterface>/similar on stable release.
    #[account(
        constraint = *collateral_token_program.address() == Token::id()
            || *collateral_token_program.address() == Token2022::id()
    )]
    pub collateral_token_program: UncheckedAccount,

    /// CHECK: SysInstructions
    #[account(address = SOLANA_SYSVAR_IX_ID)]
    pub instructions_sysvar: UncheckedAccount,

    /// CHECK: CPI
    #[account(address = KAMINO_PROGRAM_ID)]
    pub kamino_program: UncheckedAccount,

    /// CHECK: CPI
    #[account(address = KAMINO_FARMS_PROGRAM_ID)]
    pub farms_program: UncheckedAccount,

    /// CHECK: CPI
    #[account(mut, owner = KAMINO_FARMS_PROGRAM_ID)]
    pub reserve_farm_state: Option<UncheckedAccount>,

    /// CHECK: CPI
    #[account(mut, owner = KAMINO_FARMS_PROGRAM_ID)]
    pub obligation_farm_user_state: Option<UncheckedAccount>,

    /// CHECK: CPI
    #[account(owner = SCOPE_PRICES_PROGRAM_ID)]
    pub scope_prices: Option<UncheckedAccount>,
}
