#![cfg_attr(not(test), no_std)]

use quasar_lang::prelude::*;

mod constants;
mod errors;
mod helpers;
mod instructions;
mod state;

use instructions::*;

declare_id!("JE2LFHb9zAwSM533gd79XJXyByZvVwoy8nYxhCsiAnKN");

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
        label: String<32>,
    ) -> Result<(), ProgramError> {
        log("ix: initialize");
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
        log("ix: claim");
        Claim::claim_handler(&mut ctx)
    }

    // // draw small amounts here and there
    // #[instruction(discriminator = 2)]
    // pub fn withdraw(ctx: Ctx<Withdraw>) -> Result<(), ProgramError> {
    //     Withdraw::withdraw_handler(&mut ctx)
    // }

    #[instruction(discriminator = 3)]
    pub fn update_fields(
        ctx: Ctx<UpdateFields>,
        heartbeat_interval: Option<i64>,
        grace_period: Option<i64>,
        pause_duration: Option<i64>,
        // label: Option<String<32>>,
    ) -> Result<(), ProgramError> {
        UpdateFields::handler(
            &mut ctx,
            heartbeat_interval,
            grace_period,
            pause_duration,
            // label,
        )
    }

    #[instruction(discriminator = 4)]
    pub fn revoke(ctx: Ctx<Revoke>) -> Result<(), ProgramError> {
        log("ix: revoke");
        Revoke::revoke_handler(&mut ctx)
    }

    #[instruction(discriminator = 5)]
    pub fn delegate_defer(ctx: Ctx<Defer>) -> Result<(), ProgramError> {
        log("ix: delegate_defer");
        Defer::delegate_defer_handler(&mut ctx)
    }

    #[instruction(discriminator = 6)]
    pub fn update_heir(ctx: Ctx<UpdateHeir>) -> Result<(), ProgramError> {
        log("ix: update_heir");
        UpdateHeir::update_heir_handler(&mut ctx)
    }

    #[instruction(discriminator = 7)]
    pub fn register_asset(ctx: Ctx<RegisterAsset>) -> Result<(), ProgramError> {
        log("ix: register_asset");
        RegisterAsset::handler(&mut ctx)
    }

    // ! TEMP: WILL BE REMOVED AFTER estates are recovered
    #[instruction(discriminator = 8)]
    pub fn close_estate(ctx: Ctx<CloseEstate>) -> Result<(), ProgramError> {
        log("ix: close_estate");
        CloseEstate::handler(&mut ctx)
    }
}
