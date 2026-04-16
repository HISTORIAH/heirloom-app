use quasar_lang::prelude::*;
use solana_account_view::RuntimeAccount;

use crate::constants::{
    BPS_DENOMINATOR, FEE_RATE_BPS_PER_DAY, MAX_CLAIM_FEE_BPS, MAX_WITHDRAW_FEE_BPS,
};

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
/// Calculates the protocol fee to deduct from `amount`.
///
/// `created_at` and `now` are Unix timestamps (seconds).
/// `max_fee_bps` controls the cap — use `MAX_CLAIM_FEE_BPS` for normal
/// claims and `MAX_WITHDRAW_FEE_BPS` for emergency withdrawals.
///
/// Returns `(fee, amount_after_fee)`.
pub fn calculate_fee(amount: u64, created_at: i64, now: i64, max_fee_bps: u64) -> (u64, u64) {
    let elapsed_secs = now.saturating_sub(created_at).max(0) as u64;
    let days_stored = elapsed_secs / crate::constants::SECONDS_PER_DAY;

    let accrued_bps = FEE_RATE_BPS_PER_DAY
        .saturating_mul(days_stored)
        .min(max_fee_bps);
    let fee = amount.saturating_mul(accrued_bps) / BPS_DENOMINATOR;

    (fee, amount.saturating_sub(fee))
}

pub fn claim_fee(amount: u64, created_at: i64, now: i64) -> (u64, u64) {
    calculate_fee(amount, created_at, now, MAX_CLAIM_FEE_BPS)
}

pub fn withdraw_fee(amount: u64, created_at: i64, now: i64) -> (u64, u64) {
    calculate_fee(amount, created_at, now, MAX_WITHDRAW_FEE_BPS)
}
