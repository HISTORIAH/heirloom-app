use anchor_lang::prelude::*;

use crate::{constants::ADMIN, error::StocksError, IssuerRegistry, ACCOUNT_VERSION};

/// Opens a registry entry for one issuer's mint authority.
///
/// Curation is deliberately coarse. Issuers sign their whole catalogue with a
/// single mint authority, so one entry admits every asset they have minted and
/// every asset they mint later, without this program tracking thousands of mints.
#[derive(Accounts)]
pub struct RegisterIssuer {
    #[account(mut, address = ADMIN @ StocksError::Unauthorized)]
    pub admin: Signer,

    /// CHECK: the issuer's mint authority; only its address is used, as a seed.
    pub mint_authority: UncheckedAccount,

    #[account(
        init,
        payer = admin,
        space = IssuerRegistry::LEN,
        seeds = [IssuerRegistry::SEED, mint_authority.address().as_ref()],
        bump,
    )]
    pub issuer: BorshAccount<IssuerRegistry>,

    pub system_program: Program<System>,
}

impl RegisterIssuer {
    pub fn register_issuer_handler(
        ctx: &mut Context<RegisterIssuer>,
        label: String,
        risk_tier: u8,
    ) -> Result<()> {
        require!(
            label.len() <= IssuerRegistry::LABEL_LEN,
            StocksError::LabelTooLong
        );

        let mut padded = [0u8; IssuerRegistry::LABEL_LEN];
        padded[..label.len()].copy_from_slice(label.as_bytes());

        let issuer = &mut ctx.accounts.issuer;
        issuer.version = ACCOUNT_VERSION;
        issuer.mint_authority = *ctx.accounts.mint_authority.address();
        issuer.label = padded;
        issuer.risk_tier = risk_tier;
        issuer.enabled = true;
        issuer.bump = ctx.bumps.issuer;

        Ok(())
    }
}

/// Re-tiers or suspends an issuer.
///
/// Disabling stops new assets from being covered. It deliberately does not touch
/// live plans: assets already covered stay recoverable, because pulling coverage
/// out from under an owner would be the opposite of the guarantee this program
/// makes.
#[derive(Accounts)]
pub struct UpdateIssuer {
    #[account(mut, address = ADMIN @ StocksError::Unauthorized)]
    pub admin: Signer,

    /// CHECK: the issuer's mint authority; only its address is used, as a seed.
    pub mint_authority: UncheckedAccount,

    #[account(
        mut,
        seeds = [IssuerRegistry::SEED, mint_authority.address().as_ref()],
        bump = issuer.bump,
    )]
    pub issuer: BorshAccount<IssuerRegistry>,

    pub system_program: Program<System>,
}

impl UpdateIssuer {
    pub fn update_issuer_handler(
        ctx: &mut Context<UpdateIssuer>,
        enabled: Option<bool>,
        risk_tier: Option<u8>,
    ) -> Result<()> {
        let issuer = &mut ctx.accounts.issuer;

        if let Some(e) = enabled {
            issuer.enabled = e;
        }
        if let Some(t) = risk_tier {
            issuer.risk_tier = t;
        }

        Ok(())
    }
}
