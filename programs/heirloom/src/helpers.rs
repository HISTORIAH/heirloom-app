use anchor_lang::prelude::*;

use crate::error::HeirloomError;

pub fn calculate_distribution(gross_amount: u64, fee_bps: u16) -> Result<(u64, u64)> {
    let gross = gross_amount as u128;
    let fee = fee_bps as u128;
    let protocol_fee = (gross * fee / 10_000) as u64;

    let payout = gross_amount
        .checked_sub(protocol_fee)
        .ok_or(HeirloomError::MathUnderflow)?;

    Ok((protocol_fee, payout))
}

/// Closes an account by zeroing lamports and marking with Anchor's closed discriminator.
pub fn close_account<'info>(
    account: AccountInfo<'info>,
    destination: AccountInfo<'info>,
) -> Result<()> {
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
