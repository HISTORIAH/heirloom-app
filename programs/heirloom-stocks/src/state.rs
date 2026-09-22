use anchor_lang::prelude::*;

/// Non-custodial coverage: the stock stays in the owner's own token account and
/// the plan PDA is only its SPL delegate.
pub const PLAN_MODE_BACKUP: u8 = 0;

/// Custodial coverage: the stock is deposited into a token account owned by the
/// plan PDA.
pub const PLAN_MODE_VAULT: u8 = 1;

/// Current layout version for all accounts in this program.
pub const ACCOUNT_VERSION: u8 = 1;

/// A coverage plan over one owner's tokenized equities.
///
/// The plan PDA is never just a record — it is the on-chain authority that moves
/// the assets. In `PLAN_MODE_BACKUP` it is the SPL *delegate* on the owner's own
/// token accounts; in `PLAN_MODE_VAULT` it is the *owner* of the vault token
/// accounts. Both roles need a PDA this program can sign for, so one account
/// serves both and no separate vault authority exists.
///
/// Seeds are mode-scoped, so an owner can run one backup plan and one vault plan
/// concurrently without a plan index or a `getProgramAccounts` scan.
#[account(borsh)]
pub struct StockPlan {
    pub version: u8,

    pub owner: Address,

    /// Where assets go when the plan fires. The owner's own recovery wallet in
    /// backup mode, the heir in vault mode. Fixed on-chain, so a recovery can
    /// never be redirected by whoever submits it.
    pub destination: Address,

    /// `PLAN_MODE_BACKUP` or `PLAN_MODE_VAULT`.
    pub mode: u8,

    pub checkin_interval_secs: i64,

    pub grace_period_secs: i64,

    pub last_checkin_ts: i64,

    pub created_at: i64,

    /// Seconds a guardian adds to the deadline with a single defer.
    pub pause_duration_secs: i64,

    /// Absolute deadline extension from a guardian defer. 0 when not deferred.
    pub paused_until: i64,

    /// Hot wallet permitted to check in but nothing else.
    pub checkin_signer: Option<Address>,

    /// Third party permitted to defer the deadline but nothing else.
    pub guardian: Option<Address>,

    /// Number of live `CoveredAsset` records under this plan.
    pub covered_assets: u16,

    pub bump: u8,
}

impl StockPlan {
    pub const SEED: &[u8] = b"stock_plan";

    pub const LEN: usize = 8 // discriminator
    + 1                      // version
    + 32                     // owner
    + 32                     // destination
    + 1                      // mode
    + 8                      // checkin_interval_secs
    + 8                      // grace_period_secs
    + 8                      // last_checkin_ts
    + 8                      // created_at
    + 8                      // pause_duration_secs
    + 8                      // paused_until
    + 1 + 32                 // checkin_signer
    + 1 + 32                 // guardian
    + 2                      // covered_assets
    + 1; // bump

    /// Timestamp from which `destination` may move the assets.
    ///
    /// A guardian defer can only ever push this later, never earlier.
    pub fn recoverable_at(&self) -> Result<i64> {
        let base = self
            .last_checkin_ts
            .checked_add(self.checkin_interval_secs)
            .and_then(|t| t.checked_add(self.grace_period_secs))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(base.max(self.paused_until))
    }
}

/// Marker PDA proving `mint` was registered under `plan`.
///
/// Its existence is the source of truth rather than the token account's, for the
/// same reason the inheritance program tracks assets this way: creating an ATA is
/// permissionless, so it can't be used as a registration check without allowing
/// front-running or double counting.
#[account(borsh)]
pub struct CoveredAsset {
    pub version: u8,

    pub mint: Address,

    /// The token account this record covers: the owner's own account in backup
    /// mode, the plan-owned vault account in vault mode.
    pub source_token_account: Address,

    /// The mint's raw decimals, cached for `transfer_checked`.
    ///
    /// This is the raw value, not a display scale. Issuers pay dividends and
    /// apply splits by moving the `ScaledUiAmount` multiplier, which never
    /// changes raw balances, so all transfer math stays in raw units.
    pub mint_decimals: u8,

    /// Share of the balance that moves on recovery, in basis points.
    ///
    /// Always `BPS_DENOMINATOR` in vault mode, where the owner sets how much is
    /// covered by how much they deposit.
    pub allocation_bps: u16,

    /// Whether the mint had a permanent delegate when it was covered. Re-checked
    /// on recovery so an issuer silently gaining clawback power is detectable.
    pub had_permanent_delegate: bool,

    pub covered_at: i64,

    pub bump: u8,
}

impl CoveredAsset {
    pub const SEED: &[u8] = b"covered";

    pub const LEN: usize = 8 // discriminator
    + 1                      // version
    + 32                     // mint
    + 32                     // source_token_account
    + 1                      // mint_decimals
    + 2                      // allocation_bps
    + 1                      // had_permanent_delegate
    + 8                      // covered_at
    + 1; // bump
}

/// Curation entry keyed by an issuer's *mint authority* rather than by mint.
///
/// One authority key signs for an issuer's whole catalogue — a single key covers
/// all 900+ xStocks mints and another covers all 400+ Ondo mints — so a handful
/// of these accounts gates thousands of assets without a per-mint allowlist.
#[account(borsh)]
pub struct IssuerRegistry {
    pub version: u8,

    /// The mint authority every mint from this issuer carries.
    pub mint_authority: Address,

    /// Short display label, zero-padded (e.g. `xstocks`).
    pub label: [u8; 16],

    /// Higher means more issuer control over holder funds. Surfaced in the UI,
    /// not enforced on-chain.
    pub risk_tier: u8,

    pub enabled: bool,

    pub bump: u8,
}

impl IssuerRegistry {
    pub const SEED: &[u8] = b"issuer";

    pub const LABEL_LEN: usize = 16;

    pub const LEN: usize = 8 // discriminator
    + 1                      // version
    + 32                     // mint_authority
    + 16                     // label
    + 1                      // risk_tier
    + 1                      // enabled
    + 1; // bump
}
