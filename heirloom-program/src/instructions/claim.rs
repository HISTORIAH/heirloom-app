use quasar_lang::prelude::*;
use quasar_spl::{
    AssociatedTokenCpi, AssociatedTokenProgram, Mint, Token, TokenCpi, TokenInterface,
};

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

#[derive(Accounts)]
pub struct Claim {
    #[account(mut, address = estate.heir)]
    pub heir: Signer,

    #[account(address = estate.authority)]
    pub authority: UncheckedAccount,

    #[account(mut)]
    pub delegate: Option<UncheckedAccount>,

    #[account(mut)]
    pub heir_token_account: Option<UncheckedAccount>,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump = estate.bump)]
    pub estate: Account<Estate>,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump = vault.bump)]
    pub vault: Account<Vault>,

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub mint: Option<Account<Mint>>,

    pub token_program: Interface<TokenInterface>,

    pub associated_token_program: Program<AssociatedTokenProgram>,

    pub clock: Sysvar<Clock>,

    pub rent: Sysvar<Rent>,

    pub system_program: Program<System>,
}

impl Claim {
    #[inline(always)]
    pub fn claim_handler<'a>(ctx: &mut Ctx<Claim>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;
        ctx.accounts.transfer_assets(&ctx.bumps)?;
        let heir_view = &ctx.accounts.heir.to_account_view();

        let remaining = ctx.accounts.estate.claimable_assets.saturating_sub(1);
        ctx.accounts.estate.claimable_assets = remaining;

        if remaining == 0 {
            crate::helpers::close_account(&mut ctx.accounts.estate, heir_view)?;
            crate::helpers::close_account(&mut ctx.accounts.vault, heir_view)?;
        }

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        if self.estate.is_claimed.get() {
            return Err(HeirloomError::AlreadyClaimed.into());
        }

        if let (Some(delegate_stored), Some(delegate_acc)) =
            (self.estate.delegate, self.delegate.as_ref())
        {
            require_eq!(
                &delegate_stored,
                delegate_acc.address(),
                HeirloomError::MismatchedAddress
            )
        }

        let now = self.clock.unix_timestamp;
        let claimable_at = self
            .estate
            .last_heartbeat
            .checked_add(self.estate.heartbeat_interval)
            .and_then(|t| t.checked_add(self.estate.grace_period))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        if now < claimable_at.max(self.estate.paused_until) {
            return Err(HeirloomError::NotYetClaimable.into());
        }

        match self.heir_token_account.as_ref() {
            Some(_) => {
                if self.vault_token_account.is_none() || self.mint.is_none() {
                    return Err(HeirloomError::MissingTokenAccounts.into());
                }

                let vault_ta = self.vault_token_account.as_ref().unwrap();

                // vault token account must be owned by vault PDA —
                // proves it was registered under this estate's heir
                if vault_ta.owner() != self.vault.address() {
                    return Err(HeirloomError::InvalidAccount.into());
                }

                if vault_ta.amount() == 0 {
                    return Err(HeirloomError::InsufficientVaultBalance.into());
                }
            }
            None => {
                if self.vault.to_account_view().lamports() == 0 {
                    return Err(HeirloomError::InsufficientVaultBalance.into());
                }
            }
        }

        Ok(())
    }

    #[inline(always)]
    pub fn transfer_assets(&self, claim_ix_bumps: &ClaimBumps) -> Result<(), ProgramError> {
        match self.heir_token_account.as_ref() {
            Some(heir_ta) => {
                let vault_ta = self.vault_token_account.as_ref().unwrap();
                let mint = self.mint.as_ref().unwrap();
                let amount = vault_ta.amount();
                let vault_seeds = self.vault_seeds(claim_ix_bumps);

                // Create heir's ATA if it doesn't exist yet
                self.associated_token_program
                    .create_idempotent(
                        self.heir.to_account_view(),
                        &heir_ta.to_account_view(),
                        self.heir.to_account_view(),
                        mint,
                        &self.system_program,
                        &self.token_program,
                    )
                    .invoke()?;

                self.token_program
                    .transfer_checked(
                        vault_ta,
                        mint,
                        heir_ta,
                        &self.vault,
                        amount,
                        mint.decimals(),
                    )
                    .invoke_signed(&vault_seeds)?;

                // close vault TA, rent back to heir
                self.token_program
                    .close_account(vault_ta, &self.heir, &self.vault)
                    .invoke_signed(&vault_seeds)?;
            }
            // SOL path: close() in claim_handler transfers vault lamports to heir
            None => {}
        }

        Ok(())
    }
}
