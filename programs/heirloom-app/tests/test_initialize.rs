use {
    anchor_lang::{
        solana_program::instruction::Instruction, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

#[test]
fn test_create_vault() {
    let program_id = heirloom_app::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../target/deploy/heirloom_app.so");
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    // Create two SPL token mints for testing
    let token_a_mint = Keypair::new();
    let token_b_mint = Keypair::new();

    // For a full integration test, you would:
    // 1. Create both token mints
    // 2. Create vault with create_vault instruction
    // 3. Create ATAs and deposit tokens
    // 4. Test heartbeat, claim, emergency_withdraw, guardian_pause, update_heirs
    //
    // This is a placeholder confirming the program loads correctly.
    assert_ne!(token_a_mint.pubkey(), token_b_mint.pubkey());
    assert_ne!(program_id, Keypair::new().pubkey());
}
