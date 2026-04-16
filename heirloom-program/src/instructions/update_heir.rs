use quasar_lang::{pda::find_program_address_const, prelude::*, sysvars::Sysvar as _};
use quasar_spl::{AssociatedTokenProgram, Mint, Token, TokenCpi, TokenInterface};

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

    // token path — optional
    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub new_vault_token_account: Option<InterfaceAccount<Token>>,

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
    pub fn handler<'a>(ctx: &mut Ctx<UpdateHeir>) -> Result<(), ProgramError> {
        let rent = Rent::get()?;

        // extract addresses as owned values so we don't hold views across the mutable borrow
        let authority_addr = *ctx.accounts.authority.address();
        let new_heir_addr = *ctx.accounts.new_heir.address();

        let (new_estate_addr, new_estate_bump) = find_program_address_const(
            &[
                b"estate",
                authority_addr.as_array(),
                new_heir_addr.as_array(),
            ],
            &crate::ID,
        );
        let (new_vault_addr, new_vault_bump) = find_program_address_const(
            &[
                b"vault",
                authority_addr.as_array(),
                new_heir_addr.as_array(),
            ],
            &crate::ID,
        );

        ctx.accounts
            .validate_inputs(&new_estate_addr, &new_vault_addr)?;

        // --- create new estate ---
        let estate_lamports = rent.try_minimum_balance(Estate::SPACE)?;
        {
            let authority_view = ctx.accounts.authority.to_account_view();
            let new_estate_view = ctx.accounts.new_estate.to_account_view();
            ctx.accounts
                .system_program
                .create_account(
                    authority_view,
                    new_estate_view,
                    estate_lamports,
                    Estate::SPACE as u64,
                    &crate::id(),
                )
                .invoke()?;
        }

        // --- create new vault ---
        let vault_lamports = rent.try_minimum_balance(Vault::SPACE)?;
        {
            let authority_view = ctx.accounts.authority.to_account_view();
            let new_vault_view = ctx.accounts.new_vault.to_account_view();
            ctx.accounts
                .system_program
                .create_account(
                    authority_view,
                    new_vault_view,
                    vault_lamports,
                    Vault::SPACE as u64,
                    &crate::id(),
                )
                .invoke()?;
        }

        // --- write data into new estate and vault ---
        ctx.accounts
            .set_new_account_data(new_estate_addr, new_estate_bump, new_vault_bump)?;

        // --- token path: transfer tokens and close old vault token account ---
        if let Some(vault_ta) = ctx.accounts.vault_token_account.as_ref() {
            let new_vault_ta = ctx.accounts.new_vault_token_account.as_ref().unwrap();
            let mint = ctx.accounts.mint.as_ref().unwrap();
            let amount = vault_ta.amount();
            let new_vault_addr = *ctx.accounts.new_vault.address();

            //  create and init new vault ata
            if new_vault_ta.to_account_view().is_data_empty() {
                ctx.accounts
                    .token_program
                    .initialize_account3(new_vault_ta, mint, &new_vault_addr)
                    .invoke()?;
            }

            // transfer tokens from old vault TA to new vault TA
            ctx.accounts
                .token_program
                .transfer_checked(
                    vault_ta,
                    mint,
                    new_vault_ta,
                    &ctx.accounts.vault,
                    amount,
                    mint.decimals(),
                )
                .invoke()?;

            // close old vault token account, rent back to authority
            ctx.accounts
                .token_program
                .close_account(vault_ta, &ctx.accounts.authority, &ctx.accounts.vault)
                .invoke()?;
        } else {
            // --- SOL path: transfer lamports from old vault to new vault ---
            let old_vault_view = ctx.accounts.vault.to_account_view();
            let new_vault_view = ctx.accounts.new_vault.to_account_view();
            let amount = old_vault_view.lamports();

            set_lamports(old_vault_view, 0);
            set_lamports(new_vault_view, new_vault_view.lamports() + amount);
        }

        // --- close old estate and vault, rent back to authority ---
        let authority_view = ctx.accounts.authority.to_account_view();
        crate::helpers::close_account(&mut ctx.accounts.estate, authority_view)?;
        crate::helpers::close_account(&mut ctx.accounts.vault, authority_view)?;

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

        let new_vault_acc =
            unsafe { &mut *(&mut self.new_vault as *mut UncheckedAccount as *mut Vault) };

        new_vault_acc.set_inner(VaultInner {
            estate: new_estate_addr,
            bump: new_vault_bump,
        });

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

        // token path: if mint provided, all token accounts must be present
        // token path: if mint is provided, all token accounts must be present
        // and the vault TA must be owned by the vault PDA
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
}
