use anchor_lang::prelude::*;

use crate::{error::HeirloomIkaError, state::Estate};

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Relayer pays for account creation
    #[account(mut)]
    pub relayer: Signer<'info>,

    /// CHECK: estate_id pubkey, used as seed for PDA
    pub estate_id: UncheckedAccount<'info>,

    /// Estate PDA: seeds = [b"ika_estate", estate_id]
    #[account(
        init,
        payer = relayer,
        space = Estate::LEN,
        seeds = [Estate::SEED, estate_id.key().as_ref()],
        bump
    )]
    pub estate: Account<'info, Estate>,

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn initialize_handler(
        ctx: Context<Initialize>,
        dwallet_pda: Pubkey,
        public_key: [u8; 33],
        public_key_len: u8,
        curve: u16,
        signature_scheme: u16,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        passkey_pubkey: [u8; 33],
        owner_address: String,
        heir_address: String,
        label: String,
    ) -> Result<()> {
        ctx.accounts
            .validate(public_key_len, curve, &heir_address, &label, &owner_address)?;

        let now = Clock::get()?.unix_timestamp;

        ctx.accounts.set_acc_fields(
            ctx.accounts.estate_id.key(),
            dwallet_pda,
            public_key,
            public_key_len,
            curve,
            signature_scheme,
            heartbeat_interval,
            grace_period,
            pause_duration,
            passkey_pubkey,
            owner_address,
            heir_address,
            label,
            now,
            ctx.bumps.estate,
        )?;

        Ok(())
    }

    pub fn validate(
        &self,
        public_key_len: u8,
        curve: u16,
        heir_address: &str,
        label: &str,
        owner_address: &str,
    ) -> Result<()> {
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

    #[allow(clippy::too_many_arguments)]
    pub fn set_acc_fields(
        &mut self,
        estate_id: Pubkey,
        dwallet_pda: Pubkey,
        public_key: [u8; 33],
        public_key_len: u8,
        curve: u16,
        signature_scheme: u16,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        passkey_pubkey: [u8; 33],
        owner_address: String,
        heir_address: String,
        label: String,
        now: i64,
        estate_bump: u8,
    ) -> Result<()> {
        self.estate.estate_id = estate_id;
        self.estate.dwallet_pda = dwallet_pda;
        self.estate.public_key = public_key;
        self.estate.public_key_len = public_key_len;
        self.estate.curve = curve;
        self.estate.signature_scheme = signature_scheme;
        self.estate.heartbeat_interval = heartbeat_interval;
        self.estate.grace_period = grace_period;
        self.estate.last_heartbeat = now;
        self.estate.created_at = now;
        self.estate.pause_duration = pause_duration;
        self.estate.paused_until = 0;
        self.estate.is_claimed = false;
        self.estate.is_deferred = false;
        self.estate.bump = estate_bump;
        self.estate.passkey_pubkey = passkey_pubkey;
        self.estate.heartbeat_nonce = 0;
        self.estate.heir_address = heir_address;
        self.estate.label = label;
        self.estate.owner_address = owner_address;

        Ok(())
    }
}
