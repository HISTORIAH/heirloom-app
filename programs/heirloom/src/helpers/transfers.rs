//! Moving SOL and tokens in and out of the vault, and the fee rules applied
//! when they move.

use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token,
    token_interface::{self, CloseAccount, Mint, TransferChecked},
};

use crate::{error::HeirloomError, Vault};

// ----------------------------------------------------------------- Fees

/// Splits `gross_amount` into a protocol fee and a net payout using ceiling
/// division so the fee always rounds up.
pub(crate) fn split_amount_into_fee_and_payout(
    gross_amount: u64,
    fee_bps: u16,
) -> Result<(u64, u64)> {
    let gross = gross_amount as u128;
    let fee = fee_bps as u128;
    let protocol_fee = ((gross * fee + 9_999) / 10_000) as u64;

    let payout = gross_amount
        .checked_sub(protocol_fee)
        .ok_or(HeirloomError::MathUnderflow)?;

    Ok((protocol_fee, payout))
}

/// A mint with no decimals and a supply of one is treated as an NFT. NFTs
/// pay a flat deposit fee instead of the bps fee, which would round up to
/// the whole token.
pub(crate) fn is_nft_mint(mint: &InterfaceAccount<Mint>) -> bool {
    mint.decimals() == 0 && mint.supply() == 1
}

// ----------------------------------------------------------------- SOL

/// Transfers `lamports` from a signing wallet to any writable account via
/// the system program.
pub(crate) fn transfer_sol_from_signer(
    from: &mut Signer,
    to: &mut impl ToCpiHandleMut,
    system_program: &Program<System>,
    lamports: u64,
) -> Result<()> {
    let cpi_accounts = system_program::Transfer {
        from: from.to_cpi_handle_mut(),
        to: to.to_cpi_handle_mut(),
    };

    let cpi_context = CpiContext::new(system_program.address(), cpi_accounts);

    system_program::transfer(cpi_context, lamports)?;

    Ok(())
}

/// Moves lamports straight out of the program-owned vault. The system
/// program can't debit an account with data, so this edits balances
/// directly instead of a CPI.
pub(crate) fn move_lamports_from_vault(
    vault: &mut Account<Vault>,
    to: &mut impl Lamports,
    lamports: u64,
) -> Result<()> {
    vault.sub_lamports(lamports)?;
    to.add_lamports(lamports)?;

    Ok(())
}

// ----------------------------------------------------------------- Tokens

/// Transfers `amount` tokens with `transfer_checked`. Pass empty
/// `signer_seeds` when a wallet signs, or the vault's seeds when the vault
/// is the authority.
pub(crate) fn transfer_tokens_checked<'a>(
    token_program: &'a Address,
    from: CpiHandleMut<'a>,
    to: CpiHandleMut<'a>,
    authority: CpiHandle<'a>,
    mint: &'a InterfaceAccount<Mint>,
    amount: u64,
    signer_seeds: &'a [&'a [&'a [u8]]],
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from,
        mint: mint.to_cpi_handle(),
        to,
        authority,
    };

    let cpi_context = CpiContext::new_with_signer(token_program, cpi_accounts, signer_seeds);

    token_interface::transfer_checked(cpi_context, amount, mint.decimals())?;

    Ok(())
}

/// Creates `owner`'s associated token account for `mint` if it doesn't exist
/// yet. ATA creation is permissionless, so it may already be there.
pub(crate) fn create_token_account_if_missing<'a>(
    associated_token_program: &'a Address,
    payer: CpiHandleMut<'a>,
    token_account: CpiHandleMut<'a>,
    owner: CpiHandle<'a>,
    mint: CpiHandle<'a>,
    system_program: CpiHandle<'a>,
    token_program: CpiHandle<'a>,
) -> Result<()> {
    let cpi_accounts = associated_token::Create {
        payer,
        associated_token: token_account,
        authority: owner,
        mint,
        system_program,
        token_program,
    };

    let cpi_context = CpiContext::new(associated_token_program, cpi_accounts);

    associated_token::create_idempotent(cpi_context)?;

    Ok(())
}

/// Closes an emptied vault token account, sending its rent to `rent_recipient`.
pub(crate) fn close_vault_token_account<'a>(
    token_program: &'a Address,
    vault_token_account: CpiHandleMut<'a>,
    rent_recipient: CpiHandleMut<'a>,
    vault: CpiHandle<'a>,
    signer_seeds: &'a [&'a [&'a [u8]]],
) -> Result<()> {
    let cpi_accounts = CloseAccount {
        account: vault_token_account,
        destination: rent_recipient,
        authority: vault,
    };

    let cpi_context = CpiContext::new_with_signer(token_program, cpi_accounts, signer_seeds);

    token_interface::close_account(cpi_context)?;

    Ok(())
}
