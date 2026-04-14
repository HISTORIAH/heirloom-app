#![cfg_attr(not(test), no_std)]

use quasar_lang::prelude::*;

mod constants;
mod errors;
mod helpers;
mod instructions;
mod state;

use instructions::*;

declare_id!("BnH7XSqraycia4o5xDUKHUpheWg42AAnGQYWCx8tUEmv");

#[program]
mod heirloom_program {
    use super::*;

    #[instruction(discriminator = 0)]
    pub fn initialize(
        ctx: Ctx<Initialize>,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        amount: u64, // in token amount
        label: String<u32, 32>,
    ) -> Result<(), ProgramError> {
        Initialize::initialize_handler(
            &mut ctx,
            heartbeat_interval,
            grace_period,
            pause_duration,
            amount,
            label,
        )
    }

    #[instruction(discriminator = 1)]
    pub fn claim(ctx: Ctx<Claim>) -> Result<(), ProgramError> {
        Claim::claim_handler(&mut ctx)
    }

    // // draw small amounts here and there
    // #[instruction(discriminator = 2)]
    // pub fn withdraw(ctx: Ctx<Withdraw>) -> Result<(), ProgramError> {
    //     Withdraw::withdraw_handler(&mut ctx)
    // }

    #[instruction(discriminator = 3)]
    pub fn update_fields(
        ctx: Ctx<Update>,
        heartbeat_interval: Option<i64>,
        grace_period: Option<i64>,
        pause_duration: Option<i64>,
        // label: Option<String<u32, 32>>,
    ) -> Result<(), ProgramError> {
        Update::update_fields_handler(
            &mut ctx,
            heartbeat_interval,
            grace_period,
            pause_duration,
            // label.as_deref(),
        )
    }

    #[instruction(discriminator = 4)]
    pub fn revoke(ctx: Ctx<Revoke>) -> Result<(), ProgramError> {
        Revoke::revoke_handler(&mut ctx)
    }

    #[instruction(discriminator = 5)]
    pub fn delegate_defer(ctx: Ctx<Defer>) -> Result<(), ProgramError> {
        Defer::delegate_defer_handler(&mut ctx)
    }

    #[instruction(discriminator = 6)]
    pub fn transfer_heir(ctx: Ctx<Update>) -> Result<(), ProgramError> {
        Update::transfer_heir_handler(&mut ctx)
    }
}
