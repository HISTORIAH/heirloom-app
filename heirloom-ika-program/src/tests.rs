use quasar_svm::{Account, Pubkey, QuasarSvm};
use solana_address::Address;
use solana_instruction::{AccountMeta, Instruction};

fn setup() -> QuasarSvm {
    let elf = std::fs::read("target/deploy/heirloom_ika_program.so").unwrap();
    QuasarSvm::new()
        .with_program(&Pubkey::from(crate::ID), &elf)
}

fn initialize_instruction(payer: Address, system_program: Address) -> Instruction {
    Instruction {
        program_id: Address::from(crate::ID.to_bytes()),
        accounts: vec![
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(system_program, false),
        ],
        data: vec![0],
    }
}

#[test]
fn test_initialize() {
    let mut svm = setup();

    let payer = Pubkey::new_unique();

    let instruction = initialize_instruction(
        Address::from(payer.to_bytes()),
        Address::from(quasar_svm::system_program::ID.to_bytes()),
    );

    let result = svm.process_instruction(
        &instruction,
        &[Account {
            address: payer,
            lamports: 10_000_000_000,
            data: vec![],
            owner: quasar_svm::system_program::ID,
            executable: false,
        }],
    );

    result.assert_success();
}
