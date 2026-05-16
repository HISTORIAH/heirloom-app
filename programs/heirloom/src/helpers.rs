use anchor_lang::prelude::*;

use crate::error::HeirloomError;

pub fn calculate_distribution(gross_amount: u64, fee_bps: u16) -> Result<(u64, u64)> {
    let protocol_fee = gross_amount
        .checked_mul(fee_bps as u64)
        .ok_or(HeirloomError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(HeirloomError::MathOverflow)?;

    let payout = gross_amount
        .checked_sub(protocol_fee)
        .ok_or(HeirloomError::MathOverflow)?;

    Ok((protocol_fee, payout))
}

/// Closes an account by zeroing lamports and marking with Anchor's closed discriminator.
pub fn close_account<'info>(
    account: AccountInfo<'info>,
    destination: AccountInfo<'info>,
) -> Result<()> {
    let lamports = account.lamports();
    **account.try_borrow_mut_lamports()? = 0;
    **destination.try_borrow_mut_lamports()? = destination
        .lamports()
        .checked_add(lamports)
        .ok_or(HeirloomError::MathOverflow)?;

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
