use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, InitSpace)]
pub struct HeirEntry {
    pub heir: Pubkey,
    pub split_bps: u16,
    pub has_claimed: bool,
    pub is_active: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub owner: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub heartbeat_interval: i64,
    pub grace_period: i64,
    pub last_heartbeat: i64,
    pub token_a_balance: u64,
    pub token_b_balance: u64,
    pub guardian: Option<Pubkey>,
    pub guardian_pause_used: bool,
    pub is_distributed: bool,
    pub created_at: i64,
    pub heir_count: u8,
    pub claims_count: u8,
    pub bump: u8,
    #[max_len(10)]
    pub heirs: Vec<HeirEntry>,
}

impl Vault {
    pub fn get_effective_deadline(&self) -> i64 {
        let base_deadline = self.heartbeat_interval + self.grace_period;
        let pause_bonus = if self.guardian_pause_used {
            crate::constants::GUARDIAN_PAUSE_BONUS
        } else {
            0
        };
        base_deadline + pause_bonus
    }

    pub fn get_elapsed(&self, now: i64) -> i64 {
        now - self.last_heartbeat
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct HeirInput {
    pub heir: Pubkey,
    pub split_bps: u16,
}
