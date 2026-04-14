use quasar_lang::{pda::find_program_address_const, prelude::*, sysvars::Sysvar as _};
use quasar_spl::{Mint, Token, TokenCpi, TokenInterface};

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

#[derive(Accounts)]
pub struct UpdateHeir<'info> {
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    pub new_heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump = estate.bump)]
    pub estate: Account<Estate<'info>>,

    #[account(mut)]
    pub new_estate: UncheckedAccount,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump = estate.bump)]
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

    pub rent: Sysvar<Rent>,

    pub clock: Sysvar<Clock>,

    pub system_program: Program<System>,
}

impl UpdateHeir<'_> {
    #[inline(always)]
    pub fn handler<'a>(ctx: &mut Ctx<'a, UpdateHeir<'a>>) -> Result<(), ProgramError> {
        let rent = Rent::get()?;
        let authority_view = ctx.accounts.authority.to_account_view();
        let new_heir_view = ctx.accounts.new_heir.to_account_view();
        let new_estate_view = ctx.accounts.new_estate.to_account_view();
        let new_vault_view = ctx.accounts.new_vault.to_account_view();

        let (new_estate_addr, new_estate_bump) = find_program_address_const(
            &[
                b"estate",
                authority_view.address().as_array(),
                new_heir_view.address().as_array(),
            ],
            &crate::ID,
        );
        let (new_vault_addr, new_vault_bump) = find_program_address_const(
            &[
                b"vault",
                authority_view.address().as_array(),
                new_heir_view.address().as_array(),
            ],
            &crate::ID,
        );

        ctx.accounts
            .validate_inputs(&new_estate_addr, &new_vault_addr)?;

        // --- create new estate ---
        let estate_space = Estate::SPACE;
        let estate_lamports = rent.try_minimum_balance(estate_space)?;

        ctx.accounts
            .system_program
            .create_account(
                authority_view,
                new_estate_view,
                estate_lamports,
                estate_space as u64,
                &crate::id(),
            )
            .invoke()?;

        // --- create new vault ---
        let vault_space = Vault::SPACE;
        let vault_lamports = rent.try_minimum_balance(vault_space)?;

        ctx.accounts
            .system_program
            .create_account(
                authority_view,
                new_vault_view,
                vault_lamports,
                vault_space as u64,
                &crate::id(),
            )
            .invoke()?;

        // --- write estate data to new estate, preserving created_at ---
        // TODO: write to estate account
        // ctx.accounts.new_estate.set_inner(EstateInner {
        //     authority: *authority_view.address(),
        //     heir: *new_heir_view.address(),
        //     heartbeat_interval: ctx.accounts.estate.heartbeat_interval,
        //     grace_period: ctx.accounts.estate.grace_period,
        //     last_heartbeat: ctx.accounts.estate.last_heartbeat,
        //     created_at: ctx.accounts.estate.created_at,   // preserved — fee clock not reset
        //     bump: new_estate_bump,
        //     is_claimed: false,
        //     delegate: ctx.accounts.estate.delegate,
        //     mint: ctx.accounts.estate.mint,
        //     label: ctx.accounts.estate.label(),
        //     pause_duration: ctx.accounts.estate.pause_duration,
        //     paused_until: 0,
        //     is_deferred: false,
        // }, authority_view, Some(&ctx.accounts.rent))?;

        // ctx.accounts.new_vault.set_inner(VaultInner {
        //     estate: *new_estate_view.address(),
        //     bump: new_vault_bump,
        // });

        // --- token path: transfer tokens and close old vault token account ---
        if let Some(vault_ta) = ctx.accounts.vault_token_account.as_ref() {
            let new_vault_ta = ctx.accounts.new_vault_token_account.as_ref().unwrap();
            let mint = ctx.accounts.mint.as_ref().unwrap();
            let amount = vault_ta.amount();

            // init new vault token account if uninitialized
            if new_vault_ta.to_account_view().is_data_empty() {
                ctx.accounts
                    .token_program
                    .initialize_account3(new_vault_ta, mint, new_vault_view.address())
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
            let amount = old_vault_view.lamports();

            set_lamports(old_vault_view, 0);
            set_lamports(new_vault_view, new_vault_view.lamports() + amount);
        }

        // --- close old estate and vault, rent back to authority ---
        ctx.accounts.estate.close(authority_view)?;
        ctx.accounts.vault.close(authority_view)?;

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
        if let Some(mint_acc) = self.mint.as_ref() {
            let vault_ta = self
                .vault_token_account
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;
            let _new_vault_ta = self
                .new_vault_token_account
                .as_ref()
                .ok_or(HeirloomError::MissingTokenAccounts)?;

            let estate_mint = self.estate.mint.ok_or(HeirloomError::MissingAccount)?;
            require_eq!(
                &estate_mint,
                mint_acc.address(),
                HeirloomError::MintMismatch
            );
            require_eq!(
                vault_ta.mint(),
                mint_acc.address(),
                HeirloomError::MintMismatch
            );
        }

        Ok(())
    }
}
