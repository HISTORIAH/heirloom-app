use crate::{
    constants::{CLAIM_FEE_BPS, EMERGENCY_EXIT_FEE_BPS},
    errors::HeirloomError,
};
use quasar_lang::prelude::*;
use solana_account_view::RuntimeAccount;

/// Generic fee calculation
/// basis_points: The fee in BPS (e.g., 100 for 1%)
/// amount: The total balance being processed
pub fn calculate_fee(amount: u64, basis_points: u16) -> Result<u64, ProgramError> {
    let fee_amount = amount
        .checked_mul(basis_points as u64)
        .ok_or(HeirloomError::MathOverflow)?
        .checked_div(10_000) // Dividing by 10,000 for BPS
        .ok_or(HeirloomError::MathOverflow)?;

    Ok(fee_amount)
}

/// Calculates the 1% fee for inheritance claims
pub fn calc_claim_fee(total_amount: u64) -> Result<u64, ProgramError> {
    calculate_fee(total_amount, CLAIM_FEE_BPS)
}

/// Calculates the 0.5% fee for emergency withdrawals
pub fn calc_exit_fee(total_amount: u64) -> Result<u64, ProgramError> {
    calculate_fee(total_amount, EMERGENCY_EXIT_FEE_BPS)
}

/// calculates protocol fees and take home amounts for users
pub fn calculate_distribution(gross_amount: u64, fee_bps: u16) -> Result<(u64, u64), ProgramError> {
    let protocol_fee = gross_amount
        .checked_mul(fee_bps as u64)
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_div(10_000)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    let payout = gross_amount
        .checked_sub(protocol_fee)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    Ok((protocol_fee, payout))
}

/// Closes a program-owned account: zeros all data, shrinks `data_len` to 0,
/// then drains all lamports to `destination`.
///
/// Why not use quasar's built-in `close()`:
///
/// 1. The generic `Account<T>::close()` casts `*mut Account<T>` directly to
///    `*mut AccountView`. For static accounts (T is `#[repr(transparent)]` over
///    `AccountView`) this is fine, but for dynamic accounts like `Estate<'_>`
///    the generated struct's first field is `&mut AccountView` (a pointer *to*
///    AccountView, not AccountView inline), so the cast reads that pointer value
///    as AccountView data — garbage — which then reaches a `system::transfer`
///    CPI referencing an unknown account.
///
/// 2. Both the generic and the derive-generated `close()` call `assign` before
///    `resize`. Once the account is owned by the system program the current
///    program can no longer modify `data_len` → "Failed to reallocate account data".
///
/// 3. Casting `&AccountView` to `&mut AccountView` is UB under Rust's aliasing
///    rules, even inside `unsafe`.
///
/// This helper avoids all three pitfalls:
/// - View obtained via `to_account_view()` → correct for static and dynamic types.
/// - All mutations go through `*mut _` raw pointers derived from `account_ptr()`
///   and `data_ptr()` (both take `&self`), mirroring quasar's own `set_lamports`.
/// - No ownership reassignment; the runtime GCs zero-lamport accounts at tx end.
pub fn close_account<T: AsAccountView>(
    account: &mut Account<T>,
    destination: &AccountView,
) -> Result<(), ProgramError> {
    if !destination.is_writable() {
        return Err(ProgramError::Immutable);
    }

    let view = account.to_account_view();

    // account_ptr() takes &self — cast *const → *mut follows the same pattern
    // quasar uses in its own set_lamports() free-function.
    // Type of `raw` is inferred as *mut RuntimeAccount from account_ptr()'s return type.
    let raw = view.account_ptr() as *mut RuntimeAccount;

    unsafe {
        let data_len = (*raw).data_len as usize;

        // 1. Zero all account data while the program still owns it.
        //    data_ptr() also takes &self, so no &mut reference is created.
        core::ptr::write_bytes(view.data_ptr() as *mut u8, 0, data_len);

        // 2. Shrink data_len to 0 and update the resize-delta stored in padding.
        //    Mirrors quasar's resize() but avoids the &mut AccountView requirement.
        let delta_ptr = core::ptr::addr_of_mut!((*raw).padding) as *mut i32;
        delta_ptr.write_unaligned(delta_ptr.read_unaligned() - data_len as i32);
        (*raw).data_len = 0;
    }

    // 3. Drain lamports — set_lamports() already takes &AccountView.
    let lamports = view.lamports();
    let new_dest_lamports = destination
        .lamports()
        .checked_add(lamports)
        .ok_or(ProgramError::InvalidArgument)?;
    set_lamports(destination, new_dest_lamports);
    set_lamports(view, 0);

    Ok(())
}
