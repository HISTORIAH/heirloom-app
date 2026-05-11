//! Inline Quasar CPI SDK for the Ika dWallet program.
//!
//! Mirrors `chains/solana/program-sdk/quasar/src/cpi.rs` from the
//! dwallet-labs/ika-pre-alpha repository.

extern crate alloc;
use alloc::vec;
use alloc::vec::Vec;

use quasar_lang::{
    cpi::{CpiAccount, InstructionAccount, InstructionView, Seed, Signer},
    prelude::*,
};

/// Seed for deriving the CPI authority PDA from a caller program.
pub const CPI_AUTHORITY_SEED: &[u8] = b"__ika_cpi_authority";

// ── Instruction discriminators (must match IkaDWalletInstructionDiscriminators) ──
const IX_APPROVE_MESSAGE: u8 = 8;
#[allow(dead_code)]
const IX_TRANSFER_OWNERSHIP: u8 = 24;

/// CPI context for invoking Ika dWallet instructions.
pub struct DWalletContext<'a> {
    /// The Ika dWallet program account.
    pub dwallet_program: &'a AccountView,
    /// The CPI authority PDA (derived from caller program).
    pub cpi_authority: &'a AccountView,
    /// The calling program account (must be executable).
    pub caller_program: &'a AccountView,
    /// Bump seed for the CPI authority PDA.
    pub cpi_authority_bump: u8,
}

impl<'a> DWalletContext<'a> {
    /// Approve a message for signing via CPI.
    ///
    /// Creates a MessageApproval PDA on behalf of the calling program.
    /// The dWallet's authority must be set to this program's CPI authority PDA.
    pub fn approve_message(
        &self,
        coordinator: &'a AccountView,
        message_approval: &'a AccountView,
        dwallet: &'a AccountView,
        payer: &'a AccountView,
        system_program: &'a AccountView,
        message_digest: [u8; 32],
        message_metadata_digest: [u8; 32],
        user_pubkey: [u8; 32],
        signature_scheme: u16,
        bump: u8,
    ) -> Result<(), ProgramError> {
        // Build instruction data: [discriminator, bump, message_digest(32),
        //   message_metadata_digest(32), user_pubkey(32), signature_scheme(2)] = 100 bytes
        let mut ix_data = [0u8; 100];
        ix_data[0] = IX_APPROVE_MESSAGE;
        ix_data[1] = bump;
        ix_data[2..34].copy_from_slice(&message_digest);
        ix_data[34..66].copy_from_slice(&message_metadata_digest);
        ix_data[66..98].copy_from_slice(&user_pubkey);
        ix_data[98..100].copy_from_slice(&signature_scheme.to_le_bytes());

        let ix_accounts = [
            InstructionAccount::new(coordinator.address(), false, false),
            InstructionAccount::new(message_approval.address(), true, false),
            InstructionAccount::new(dwallet.address(), false, false),
            InstructionAccount::new(self.caller_program.address(), false, false),
            InstructionAccount::new(self.cpi_authority.address(), false, true),
            InstructionAccount::new(payer.address(), true, true),
            InstructionAccount::new(system_program.address(), false, false),
        ];

        let cpi_accts = [
            CpiAccount::from(coordinator),
            CpiAccount::from(message_approval),
            CpiAccount::from(dwallet),
            CpiAccount::from(self.caller_program),
            CpiAccount::from(self.cpi_authority),
            CpiAccount::from(payer),
            CpiAccount::from(system_program),
        ];

        let bump_byte = [self.cpi_authority_bump];
        let signer_seeds: [Seed; 2] = [
            Seed::from(CPI_AUTHORITY_SEED),
            Seed::from(&bump_byte as &[u8]),
        ];
        let signers = [Signer::from(&signer_seeds[..])];

        let instruction = InstructionView {
            program_id: self.dwallet_program.address(),
            accounts: &ix_accounts,
            data: &ix_data,
        };

        unsafe {
            solana_instruction_view::cpi::invoke_signed_unchecked(
                &instruction,
                &cpi_accts,
                &signers,
            );
        }
        Ok(())
    }

    /// Transfer dWallet authority via CPI.
    #[allow(dead_code)]
    pub fn transfer_dwallet(
        &self,
        dwallet: &'a AccountView,
        new_authority: [u8; 32],
    ) -> Result<(), ProgramError> {
        let mut ix_data = [0u8; 33];
        ix_data[0] = IX_TRANSFER_OWNERSHIP;
        ix_data[1..33].copy_from_slice(&new_authority);

        let ix_accounts = [
            InstructionAccount::new(self.caller_program.address(), false, false),
            InstructionAccount::new(self.cpi_authority.address(), false, true),
            InstructionAccount::new(dwallet.address(), true, false),
        ];

        let cpi_accts = [
            CpiAccount::from(self.caller_program),
            CpiAccount::from(self.cpi_authority),
            CpiAccount::from(dwallet),
        ];

        let bump_byte = [self.cpi_authority_bump];
        let signer_seeds: [Seed; 2] = [
            Seed::from(CPI_AUTHORITY_SEED),
            Seed::from(&bump_byte as &[u8]),
        ];
        let signers = [Signer::from(&signer_seeds[..])];

        let instruction = InstructionView {
            program_id: self.dwallet_program.address(),
            accounts: &ix_accounts,
            data: &ix_data,
        };

        unsafe {
            solana_instruction_view::cpi::invoke_signed_unchecked(
                &instruction,
                &cpi_accts,
                &signers,
            );
        }
        Ok(())
    }
}

/// Derive dWallet PDA seeds from curve and public key.
///
/// Mirrors `ika_dwallet_program::state::dwallet::DWalletPdaSeeds::new`:
/// concatenate `curve_u16_le || public_key` into a single buffer and split
/// it into 32-byte chunks (Solana's MAX_SEED_LEN).
pub fn dwallet_pda_seeds(curve: u16, public_key: &[u8]) -> Vec<Vec<u8>> {
    let mut payload = Vec::with_capacity(2 + public_key.len());
    payload.extend_from_slice(&curve.to_le_bytes());
    payload.extend_from_slice(public_key);

    let mut seeds: Vec<Vec<u8>> = vec![b"dwallet".to_vec()];
    for chunk in payload.chunks(32) {
        seeds.push(chunk.to_vec());
    }
    seeds
}

/// Derive MessageApproval PDA seeds.
pub fn message_approval_pda_seeds(
    curve: u16,
    public_key: &[u8],
    signature_scheme: u16,
    message_hash: &[u8; 32],
) -> Vec<Vec<u8>> {
    let mut seeds = dwallet_pda_seeds(curve, public_key);
    seeds.push(b"message_approval".to_vec());
    seeds.push(signature_scheme.to_le_bytes().to_vec());
    seeds.push(message_hash.to_vec());
    seeds
}
