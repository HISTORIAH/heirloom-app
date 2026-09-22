//! Shared math, timing checks, and the Token-2022 guards that make tokenized
//! equities safe to cover.
//!
//! The guards are split in two. [`inspect_mint_for_coverage`] runs once, when an
//! asset is first covered, and refuses mints this program cannot move.
//! [`assert_transferable`] runs again on every payout, because an issuer can
//! change a mint's configuration underneath a live plan.

use anchor_lang::prelude::*;
use anchor_spl::{
    extensions::{
        is_some_address, CpiGuard, DefaultAccountState, NonTransferable, PausableConfig,
        PermanentDelegate, TransferHook,
    },
    token_interface::{Mint, TokenAccount, TokenInterfaceAccountExtensions},
};

use crate::{
    constants::{ACCOUNT_STATE_FROZEN, BPS_DENOMINATOR, MAX_INTERVAL_SECONDS},
    error::StocksError,
    IssuerRegistry,
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
        .ok_or(StocksError::MathUnderflow)?;

    Ok((protocol_fee, payout))
}

/// Ensures `value` is a non-negative interval that does not exceed the max
/// allowed duration.
pub(crate) fn validate_interval(value: i64) -> Result<()> {
    require!(value >= 0, StocksError::IntervalNegative);
    require!(value <= MAX_INTERVAL_SECONDS, StocksError::IntervalTooLong);
    Ok(())
}

/// Applies a basis-point allocation to a raw token balance, rounding down.
pub(crate) fn apply_allocation(balance: u64, allocation_bps: u16) -> Result<u64> {
    let scaled = (balance as u128)
        .checked_mul(allocation_bps as u128)
        .ok_or(StocksError::MathOverflow)?
        / BPS_DENOMINATOR as u128;

    Ok(scaled as u64)
}

pub(crate) fn validate_allocation(allocation_bps: u16) -> Result<()> {
    require!(
        allocation_bps > 0 && allocation_bps <= BPS_DENOMINATOR,
        StocksError::InvalidAllocation
    );
    Ok(())
}

// ----------------------------------------------------------------- Issuer curation

/// Confirms `mint` was issued by the authority the registry entry was opened for.
///
/// Issuers reuse one mint authority across their entire catalogue, so matching on
/// it admits every asset from a curated issuer without listing mints one by one.
pub(crate) fn assert_issuer_matches(
    mint: &InterfaceAccount<Mint>,
    issuer: &BorshAccount<IssuerRegistry>,
) -> Result<()> {
    require!(issuer.enabled, StocksError::IssuerNotSupported);

    let mint_authority = mint
        .mint_authority()
        .ok_or(StocksError::MintAuthorityMissing)?;

    require_keys_eq!(
        *mint_authority,
        issuer.mint_authority,
        StocksError::IssuerNotSupported
    );

    Ok(())
}

// ----------------------------------------------------------------- Token-2022 guards

/// One-time checks run when an asset is first covered.
///
/// Returns whether the mint currently has a permanent delegate, which the caller
/// records so a later change is detectable. A permanent delegate is not
/// disqualifying — the largest tokenized-equity issuer uses one — but it means the
/// issuer can move tokens out from under a plan without the plan's signature, so
/// it is surfaced rather than silently accepted.
pub(crate) fn inspect_mint_for_coverage(mint: &InterfaceAccount<Mint>) -> Result<bool> {
    if mint.get_extension::<NonTransferable>().is_ok() {
        return Err(StocksError::NonTransferableMint.into());
    }

    // Frozen-by-default mints thaw only for holders the issuer has allowlisted,
    // so neither a vault account nor a recovery destination can be relied on.
    if let Ok(default_state) = mint.get_extension::<DefaultAccountState>() {
        require!(
            default_state.state != ACCOUNT_STATE_FROZEN,
            StocksError::FrozenByDefaultMint
        );
    }

    assert_no_active_transfer_hook(mint)?;

    let has_permanent_delegate = mint
        .get_extension::<PermanentDelegate>()
        .map(|pd| is_some_address(&pd.delegate))
        .unwrap_or(false);

    Ok(has_permanent_delegate)
}

/// Refuses mints whose transfer hook is actually wired to a program.
///
/// Major issuers allocate the hook extension slot but leave `program_id` unset,
/// and keep an authority that can point it at a real program at any time without
/// redeploying the mint. Resolving a hook's `ExtraAccountMetaList` has to happen
/// in the transaction builder, and it cannot be done through
/// `anchor_spl::token_interface::transfer_checked`, which forwards
/// `remaining_accounts` as multisig signer keys rather than as extra accounts. So
/// this program fails closed on a live hook instead of transferring incorrectly.
pub(crate) fn assert_no_active_transfer_hook(mint: &InterfaceAccount<Mint>) -> Result<()> {
    if let Ok(hook) = mint.get_extension::<TransferHook>() {
        require!(
            !is_some_address(&hook.program_id),
            StocksError::TransferHookUnsupported
        );
    }

    Ok(())
}

/// Conditions that make any transfer of this asset impossible right now.
///
/// Applies to the owner's own withdrawals as much as to payouts — if the issuer
/// has paused the mint or frozen the account, Token-2022 will reject the transfer
/// regardless, and failing here produces an error the UI can explain.
pub(crate) fn assert_not_blocked(
    mint: &InterfaceAccount<Mint>,
    source: &InterfaceAccount<TokenAccount>,
) -> Result<()> {
    if let Ok(pausable) = mint.get_extension::<PausableConfig>() {
        require!(!pausable.is_paused(), StocksError::AssetPaused);
    }

    require!(!source.is_frozen(), StocksError::AccountFrozen);

    assert_no_active_transfer_hook(mint)?;

    Ok(())
}

/// Checks run immediately before a payout to a destination, in either mode.
///
/// A mint's configuration is the issuer's to change while a plan is live, so
/// nothing verified at coverage time can be trusted here.
///
/// Deliberately stricter than [`assert_not_blocked`]: this is used where the assets
/// are leaving for someone else, so it also refuses to proceed if the custody
/// assumptions have shifted. The owner's own exit path uses the looser check, since
/// an owner should never be trapped by an issuer's change.
pub(crate) fn assert_transferable(
    mint: &InterfaceAccount<Mint>,
    source: &InterfaceAccount<TokenAccount>,
    had_permanent_delegate: bool,
) -> Result<()> {
    assert_not_blocked(mint, source)?;

    // Gaining clawback power mid-plan is a material change to the custody
    // assumptions the owner agreed to, so it stops the payout rather than
    // proceeding quietly.
    if !had_permanent_delegate {
        let has_permanent_delegate = mint
            .get_extension::<PermanentDelegate>()
            .map(|pd| is_some_address(&pd.delegate))
            .unwrap_or(false);

        require!(!has_permanent_delegate, StocksError::PermanentDelegateAdded);
    }

    Ok(())
}

/// Confirms this program is still the delegate on an owner-held account and that
/// its allowance covers `amount`.
///
/// SPL Token stores exactly one delegate per token account, so any later approval
/// to a DEX or lending protocol silently replaces this one and changing the
/// account's owner clears it outright. Backup coverage can therefore lapse with no
/// on-chain error, which is why this is checked rather than assumed.
pub(crate) fn assert_delegation_intact(
    source: &InterfaceAccount<TokenAccount>,
    expected_delegate: &Address,
    amount: u64,
) -> Result<()> {
    let delegate = source.delegate().ok_or(StocksError::DelegateEvicted)?;

    require_keys_eq!(*delegate, *expected_delegate, StocksError::DelegateEvicted);

    require!(
        source.delegated_amount() >= amount,
        StocksError::DelegateAmountTooLow
    );

    Ok(())
}

/// Rejects accounts whose CPI Guard would make a delegate approval fail.
///
/// Token-2022 returns `CpiGuardApproveBlocked` for an approval issued through CPI
/// while the guard is on. It does not block the later delegate transfer, because
/// that is authorised by the plan PDA rather than by the account owner — so only
/// coverage setup needs this check.
pub(crate) fn assert_no_cpi_guard(source: &InterfaceAccount<TokenAccount>) -> Result<()> {
    if let Ok(guard) = source.get_extension::<CpiGuard>() {
        require!(!guard.is_enabled(), StocksError::CpiGuardEnabled);
    }

    Ok(())
}
