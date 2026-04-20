use quasar_lang::{pda::based_try_find_program_address, prelude::*, sysvars::Sysvar as _};
use quasar_spl::{
    AssociatedTokenCpi, AssociatedTokenProgram, Mint, Token, TokenCpi, TokenInterface,
};

use crate::{
    errors::HeirloomError,
    state::{Estate, EstateInner, Vault, VaultInner},
};

#[derive(Accounts)]
pub struct UpdateHeir {
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    pub new_heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump = estate.bump)]
    pub estate: Account<Estate>,

    #[account(mut)]
    pub new_estate: UncheckedAccount,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump = vault.bump)]
    pub vault: Account<Vault>,

    #[account(mut)]
    pub new_vault: UncheckedAccount,

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<Token>>,

    // this will be created by the program
    #[account(mut)]
    pub new_vault_token_account: Option<UncheckedAccount>,

    #[account(mut)]
    pub mint: Option<Account<Mint>>,

    pub token_program: Interface<TokenInterface>,

    pub associated_token_program: Program<AssociatedTokenProgram>,

    pub rent: Sysvar<Rent>,

    pub clock: Sysvar<Clock>,

    pub system_program: Program<System>,
}

impl UpdateHeir {
    #[inline(always)]
    pub fn update_heir_handler<'a>(ctx: &mut Ctx<UpdateHeir>) -> Result<(), ProgramError> {
        let authority_addr = *ctx.accounts.authority.address();
        let new_heir_addr = *ctx.accounts.new_heir.address();

        let (new_estate_addr, new_estate_bump) = based_try_find_program_address(
            &[
                b"estate",
                authority_addr.as_array(),
                new_heir_addr.as_array(),
            ],
            &crate::ID,
        )?;
        let (new_vault_addr, new_vault_bump) = based_try_find_program_address(
            &[
                b"vault",
                authority_addr.as_array(),
                new_heir_addr.as_array(),
            ],
            &crate::ID,
        )?;

        ctx.accounts
            .validate_inputs(&new_vault_addr, &new_estate_addr)?;

        ctx.accounts.create_new_accounts(
            authority_addr,
            new_heir_addr,
            new_estate_bump,
            new_vault_bump,
        )?;

        ctx.accounts
            .set_new_account_data(new_estate_addr, new_estate_bump, new_vault_bump)?;

        ctx.accounts.migrate_assets(&ctx.bumps)?;

        Ok(())
    }

    #[inline(always)]
    pub fn validate_inputs(
        &self,
        expected_vault: &Address,
        expected_estate: &Address,
    ) -> Result<(), ProgramError> {
        let new_estate_view = self.new_estate.to_account_view();
        let new_vault_view = self.new_vault.to_account_view();

        require_eq!(
            self.estate.is_claimed.get(),
            false,
            HeirloomError::AlreadyClaimed
        );

        require!(
            self.estate.claimable_assets <= 1,
            HeirloomError::TooManyClaimableAssets
        );

        let now = self.clock.unix_timestamp;
        if now < self.estate.paused_until {
            return Err(HeirloomError::EstatePaused.into());
        }

        // new PDAs must be uninitialised
        require!(
            new_estate_view.is_data_empty(),
            HeirloomError::InvalidAccount
        );
        require!(
            new_vault_view.is_data_empty(),
            HeirloomError::InvalidAccount
        );

        require_eq!(
            new_estate_view.address(),
            expected_estate,
            HeirloomError::MismatchedAddress
        );
        require_eq!(
            new_vault_view.address(),
            expected_vault,
            HeirloomError::MismatchedAddress
        );

        // token path: if mint is provided, all token accounts must be present
        if let Some(mint_acc) = self.mint.as_ref() {
            let vault_ta = self
                .vault_token_account
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;
            let _new_vault_ta = self
                .new_vault_token_account
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;

            if vault_ta.owner() != self.vault.address() {
                return Err(HeirloomError::InvalidAccount.into());
            }
            require_eq!(
                vault_ta.mint(),
                mint_acc.address(),
                HeirloomError::MintMismatch
            );
        }

        Ok(())
    }

    #[inline(always)]
    pub fn create_new_accounts(
        &self,
        authority_addr: Address,
        new_heir_addr: Address,
        new_estate_bump: u8,
        new_vault_bump: u8,
    ) -> Result<(), ProgramError> {
        let rent = Rent::get()?;

        let estate_lamports = rent.try_minimum_balance(Estate::SPACE)?;
        let new_estate_bump_arr = [new_estate_bump];
        let new_estate_seeds = [
            Seed::from(<Estate as HasSeeds>::SEED_PREFIX),
            Seed::from(authority_addr.as_ref()),
            Seed::from(new_heir_addr.as_ref()),
            Seed::from(new_estate_bump_arr.as_slice()),
        ];
        self.system_program
            .create_account(
                self.authority.to_account_view(),
                self.new_estate.to_account_view(),
                estate_lamports,
                Estate::SPACE as u64,
                &crate::id(),
            )
            .invoke_signed(&new_estate_seeds)?;

        let vault_lamports = rent.try_minimum_balance(Vault::SPACE)?;
        let new_vault_bump_arr = [new_vault_bump];
        let new_vault_seeds = [
            Seed::from(<Vault as HasSeeds>::SEED_PREFIX),
            Seed::from(authority_addr.as_ref()),
            Seed::from(new_heir_addr.as_ref()),
            Seed::from(new_vault_bump_arr.as_slice()),
        ];
        self.system_program
            .create_account(
                self.authority.to_account_view(),
                self.new_vault.to_account_view(),
                vault_lamports,
                Vault::SPACE as u64,
                &crate::id(),
            )
            .invoke_signed(&new_vault_seeds)?;

        Ok(())
    }

    #[inline(always)]
    pub fn set_new_account_data(
        &mut self,
        new_estate_addr: Address,
        new_estate_bump: u8,
        new_vault_bump: u8,
    ) -> Result<(), ProgramError> {
        let authority_addr = *self.authority.address();
        let new_heir_addr = *self.new_heir.address();

        // `init` normally writes the discriminator before set_inner; since
        // new_estate/new_vault are UncheckedAccount (no init constraint), we
        // must write it manually — set_inner skips the first disc_len bytes.
        unsafe {
            core::ptr::copy_nonoverlapping(
                Estate::DISCRIMINATOR.as_ptr(),
                self.new_estate.to_account_view().data_ptr() as *mut u8,
                Estate::DISCRIMINATOR.len(),
            );
        }

        let new_estate_acc =
            unsafe { &mut *(&mut self.new_estate as *mut UncheckedAccount as *mut Estate) };

        new_estate_acc.set_inner(
            EstateInner {
                authority: authority_addr,
                heir: new_heir_addr,
                heartbeat_interval: self.estate.heartbeat_interval.get(),
                grace_period: self.estate.grace_period.get(),
                last_heartbeat: self.estate.last_heartbeat.get(),
                created_at: self.estate.created_at.get(), // for calc fee, clock not reset
                bump: new_estate_bump,
                is_claimed: false,
                delegate: self.estate.delegate,
                claimable_assets: self.estate.claimable_assets,
                label: self.estate.label(),
                pause_duration: self.estate.pause_duration.get(),
                paused_until: 0,
                is_deferred: false,
            },
            self.authority.to_account_view(),
            self.rent.lamports_per_byte(),
            self.rent.exemption_threshold_raw(),
        )?;

        unsafe {
            core::ptr::copy_nonoverlapping(
                Vault::DISCRIMINATOR.as_ptr(),
                self.new_vault.to_account_view().data_ptr() as *mut u8,
                Vault::DISCRIMINATOR.len(),
            );
        }

        let new_vault_acc =
            unsafe { &mut *(&mut self.new_vault as *mut UncheckedAccount as *mut Vault) };

        new_vault_acc.set_inner(VaultInner {
            estate: new_estate_addr,
            bump: new_vault_bump,
        });

        Ok(())
    }

    #[inline(always)]
    pub fn migrate_assets(
        &mut self,
        update_heir_ix_bumps: &UpdateHeirBumps,
    ) -> Result<(), ProgramError> {
        if let Some(vault_ta) = self.vault_token_account.as_ref() {
            let new_vault_ta = self.new_vault_token_account.as_ref().unwrap();
            let mint = self.mint.as_ref().unwrap();
            let amount = vault_ta.amount();
            let vault_seeds = self.vault_seeds(update_heir_ix_bumps);

            self.associated_token_program
                .create_idempotent(
                    self.authority.to_account_view(),
                    &new_vault_ta.to_account_view(),
                    self.new_vault.to_account_view(),
                    mint,
                    &self.system_program,
                    &self.token_program,
                )
                .invoke()?;

            self.token_program
                .transfer_checked(
                    vault_ta,
                    mint,
                    new_vault_ta,
                    &self.vault,
                    amount,
                    mint.decimals(),
                )
                .invoke_signed(&vault_seeds)?;

            self.token_program
                .close_account(vault_ta, &self.authority, &self.vault)
                .invoke_signed(&vault_seeds)?;
        } else {
            let old_vault_view = self.vault.to_account_view();
            let new_vault_view = self.new_vault.to_account_view();
            let amount = old_vault_view.lamports();

            set_lamports(old_vault_view, 0);
            set_lamports(new_vault_view, new_vault_view.lamports() + amount);
        }

        let authority_view = self.authority.to_account_view();
        crate::helpers::close_account(&mut self.estate, authority_view)?;
        crate::helpers::close_account(&mut self.vault, authority_view)?;

        Ok(())
    }
}
