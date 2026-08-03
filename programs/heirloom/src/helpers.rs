use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};
use solana_instructions_sysvar::ID as SOLANA_SYSVAR_IX_ID;

use crate::{
    error::HeirloomError, lulo_v2, AssetRecord, KAMINO_FARMS_PROGRAM_ID, KAMINO_PROGRAM_ID,
    MAX_INTERVAL_SECONDS, SCOPE_PRICES_PROGRAM_ID, YIELD_FEE_BPS,
};

pub fn calculate_distribution(gross_amount: u64, fee_bps: u16) -> Result<(u64, u64)> {
    let gross = gross_amount as u128;
    let fee = fee_bps as u128;
    let protocol_fee = (gross * fee / 10_000) as u64;

    let payout = gross_amount
        .checked_sub(protocol_fee)
        .ok_or(HeirloomError::MathUnderflow)?;

    Ok((protocol_fee, payout))
}

/// Closes a program-owned PDA. Caller must ensure account is validated by Anchor constraints.
pub fn close_pda<'info>(
    account: AccountInfo<'info>,
    destination: AccountInfo<'info>,
) -> Result<()> {
    debug_assert!(account.key() != destination.key(), "cannot close to self");

    let lamports = account.lamports();
    account.sub_lamports(lamports)?;
    destination.add_lamports(lamports)?;

    let mut data = account.try_borrow_mut_data()?;
    for byte in data.iter_mut() {
        *byte = 0;
    }

    // Anchor's CLOSED_ACCOUNT_DISCRIMINATOR = [255; 8]
    if data.len() >= 8 {
        data[..8].copy_from_slice(&[255u8; 8]);
    }

    Ok(())
}

/// Splits a Lulo withdrawal's actual returned amount into principal vs. yield
/// (principal-first: any excess over what's still outstanding is yield) and
/// skims `YIELD_FEE_BPS` off the yield portion only.
#[inline(never)]
pub fn skim_lulo_yield_fee<'info>(
    vault_token_account: &mut InterfaceAccount<'info, TokenAccount>,
    asset_record: &mut Account<'info, AssetRecord>,
    input_mint: &InterfaceAccount<'info, Mint>,
    treasury_token_account: &InterfaceAccount<'info, TokenAccount>,
    vault: AccountInfo<'info>,
    token_program_addr: Pubkey,
    signer_seeds: &[&[&[u8]]],
    vault_balance_before: u64,
) -> Result<()> {
    vault_token_account.reload()?;
    let returned = vault_token_account
        .amount
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
            from: vault_token_account.to_account_info(),
            mint: input_mint.to_account_info(),
            to: treasury_token_account.to_account_info(),
            authority: vault,
        };

        let cpi_context =
            CpiContext::new_with_signer(token_program_addr, cpi_accounts, signer_seeds);

        token_interface::transfer_checked(cpi_context, fee, input_mint.decimals)?;
    }

    Ok(())
}

pub fn validate_interval(value: i64) -> Result<()> {
    require!(value >= 0, HeirloomError::IntervalNegative);
    require!(
        value <= MAX_INTERVAL_SECONDS,
        HeirloomError::IntervalTooLong
    );
    Ok(())
}

// ----------------------------------------------------------------- Lulo integration
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

/// withdraws (protected & complete_boosted_withdraw) will pull the USDC directly from Kamino
#[derive(Accounts)]
pub struct GenericKamino<'info> {
    /// CHECK: CPI
    #[account(mut)]
    pub market: UncheckedAccount<'info>,

    /// CHECK: CPI
    #[account(mut)]
    pub obligation: UncheckedAccount<'info>,

    /// CHECK: CPI
    #[account(mut)]
    pub reserve: UncheckedAccount<'info>,

    #[account(mut)]
    pub reserve_liquidity_supply: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: CPI
    pub lending_market_authority: UncheckedAccount<'info>,

    // collateral mint needs mut
    #[account(mut)]
    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub collateral_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub reserve_collateral_supply: Box<InterfaceAccount<'info, TokenAccount>>,

    pub collateral_token_program: Interface<'info, TokenInterface>,

    /// CHECK: SysInstructions
    #[account(address = SOLANA_SYSVAR_IX_ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    /// CHECK: CPI
    #[account(address = KAMINO_PROGRAM_ID)]
    pub kamino_program: UncheckedAccount<'info>,

    /// CHECK: CPI
    #[account(address = KAMINO_FARMS_PROGRAM_ID)]
    pub farms_program: UncheckedAccount<'info>,

    /// CHECK: CPI
    #[account(mut, owner = KAMINO_FARMS_PROGRAM_ID)]
    pub reserve_farm_state: Option<UncheckedAccount<'info>>,

    /// CHECK: CPI
    #[account(mut, owner = KAMINO_FARMS_PROGRAM_ID)]
    pub obligation_farm_user_state: Option<UncheckedAccount<'info>>,

    /// CHECK: CPI
    #[account(owner = SCOPE_PRICES_PROGRAM_ID)]
    pub scope_prices: Option<UncheckedAccount<'info>>,
}
