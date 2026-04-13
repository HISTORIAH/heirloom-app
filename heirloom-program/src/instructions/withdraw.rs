use quasar_lang::prelude::*;

#[derive(Accounts)]
pub struct Withdraw {
    #[account(mut)]
    pub payer: Signer,

    pub system_program: Program<System>,
}

impl Withdraw {
    #[inline(always)]
    pub fn withdraw_handler(ctx: Ctx<Withdraw>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        // TODO

        Ok(())
    }
}
