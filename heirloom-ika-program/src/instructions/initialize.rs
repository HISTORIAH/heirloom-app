use quasar_lang::prelude::*;

use crate::{
    errors::HeirloomIkaError,
    state::{Estate, EstateInner},
};

#[derive(Accounts)]
pub struct Initialize {
    /// Relayer pays for account creation
    #[account(mut)]
    pub relayer: Signer,

    /// Estate PDA: seeds = [b"ika_estate", estate_id]
    #[account(mut, init, payer = relayer)]
    pub estate: Account<Estate>,

    pub clock: Sysvar<Clock>,

    pub rent: Sysvar<Rent>,

    #[allow(unused)]
    pub system_program: Program<SystemProgram>,
}

impl Initialize {
    #[inline(always)]
    pub fn initialize_handler(
        ctx: &mut Ctx<Initialize>,
        estate_id: Address,
        dwallet_pda: Address,
        public_key: [u8; 33],
        public_key_len: u8,
        curve: u16,
        signature_scheme: u16,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        heir_address: &str,
        label: &str,
        owner_address: &str,
        passkey_pubkey: [u8; 33],
    ) -> Result<(), ProgramError> {
        ctx.accounts.validate(
            public_key_len,
            curve,
            signature_scheme,
            heir_address,
            label,
            owner_address,
        )?;

        let seeds: &[&[u8]] = &[b"ika_estate", estate_id.as_ref()];
        let (expected_pda, estate_bump) =
            quasar_lang::pda::based_try_find_program_address(seeds, &crate::ID)?;
        if *ctx.accounts.estate.address() != expected_pda {
            return Err(HeirloomIkaError::InvalidDWalletPda.into());
        }

        let now = ctx.accounts.clock.unix_timestamp.get();

        ctx.accounts.estate.set_inner(
            EstateInner {
                estate_id,
                dwallet_pda,
                public_key,
                public_key_len,
                curve,
                signature_scheme,
                heartbeat_interval,
                grace_period,
                last_heartbeat: now.into(),
                created_at: now.into(),
                pause_duration,
                paused_until: 0.into(),
                is_claimed: false.into(),
                is_deferred: false.into(),
                heir_address,
                label,
                owner_address,
                passkey_pubkey,
                heartbeat_nonce: 0,
                bump: estate_bump,
            },
            ctx.accounts.relayer.to_account_view(),
            ctx.accounts.rent.lamports_per_byte(),
            ctx.accounts.rent.exemption_threshold_raw(),
        )?;

        Ok(())
    }

    #[inline(always)]
    pub fn validate(
        &self,
        public_key_len: u8,
        curve: u16,
        _signature_scheme: u16,
        heir_address: &str,
        label: &str,
        owner_address: &str,
    ) -> Result<(), ProgramError> {
        require!(
            public_key_len == 32 || public_key_len == 33,
            HeirloomIkaError::InvalidPublicKey
        );
        require!(curve <= 3, HeirloomIkaError::InvalidCurve);
        require!(
            !heir_address.is_empty() && heir_address.len() <= 64,
            HeirloomIkaError::InvalidHeirAddress
        );
        require!(
            !label.is_empty() && label.len() <= 32,
            HeirloomIkaError::InvalidHeirAddress
        );
        require!(
            !owner_address.is_empty() && owner_address.len() <= 64,
            HeirloomIkaError::InvalidHeirAddress
        );
        Ok(())
    }
}
