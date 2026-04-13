#![cfg_attr(not(test), no_std)]

use quasar_lang::prelude::*;

mod errors;
mod instructions;
mod state;
use instructions::*;

declare_id!("ErmBxYMvNYkrTuFuWnGv1yjTUyJSnfVUQm8LjUnFtWMa");

#[program]
mod heirloom_program {
    use super::*;

    #[instruction(discriminator = 0)]
    pub fn initialize(
        ctx: Ctx<Initialize>,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        label: String<u32, 10>,
        amount: u64, // in token amount
    ) -> Result<(), ProgramError> {
        Initialize::initialize_handler(
            &mut ctx,
            heartbeat_interval,
            grace_period,
            pause_duration,
            label,
            amount,
        )
    }

    #[instruction(discriminator = 1)]
    pub fn claim(ctx: Ctx<Claim>) -> Result<(), ProgramError> {
        Claim::claim_handler(&mut ctx)
    }

    #[instruction(discriminator = 2)]
    pub fn heartbeat(ctx: Ctx<Heartbeat>) -> Result<(), ProgramError> {
        Heartbeat::heartbeat_handler(&mut ctx)
    }

    // // draw small amounts here and there
    // #[instruction(discriminator = 3)]
    // pub fn withdraw(ctx: Ctx<Withdraw>) -> Result<(), ProgramError> {
    //     Withdraw::withdraw_handler(&mut ctx)
    // }

    // #[instruction(discriminator = 4)]
    // pub fn update(ctx: Ctx<Update>) -> Result<(), ProgramError> {
    //     Update::update_handler(&mut ctx)
    // }

    #[instruction(discriminator = 5)]
    pub fn revoke(ctx: Ctx<Revoke>) -> Result<(), ProgramError> {
        Revoke::revoke_handler(&mut ctx)
    }

    #[instruction(discriminator = 6)]
    pub fn delegate_defer(ctx: Ctx<Defer>) -> Result<(), ProgramError> {
        Defer::delegate_defer_handler(&mut ctx)
    }
}
