pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Bayy9jagJooeKL72hpy6NKTSYVNTBLAj4hSwRXBg7wCJ");

#[program]
pub mod heirloom_app {
    use super::*;

    /// Create a new inheritance vault (or re-create after full distribution).
    pub fn create_vault(
        ctx: Context<CreateVault>,
        heartbeat_interval: i64,
        grace_period: i64,
        heirs_data: Vec<HeirInput>,
        guardian: Option<Pubkey>,
    ) -> Result<()> {
        instructions::create_vault::handler(ctx, heartbeat_interval, grace_period, heirs_data, guardian)
    }

    /// Deposit SPL tokens (token A or token B) into the vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    /// Send heartbeat - proof of life that resets the countdown timer.
    pub fn heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
        instructions::heartbeat::handler(ctx)
    }

    /// Heir claims their share after the deadline has passed.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handler(ctx)
    }

    /// Emergency withdraw - owner reclaims all vault funds.
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        instructions::emergency_withdraw::handler(ctx)
    }

    /// Guardian pause - extends the grace period by 30 days (one-time use).
    pub fn guardian_pause(ctx: Context<GuardianPause>) -> Result<()> {
        instructions::guardian_pause::handler(ctx)
    }

    /// Update heir configuration (owner only, vault must not be distributed).
    pub fn update_heirs(ctx: Context<UpdateHeirs>, new_heirs: Vec<HeirInput>) -> Result<()> {
        instructions::update_heirs::handler(ctx, new_heirs)
    }
}
