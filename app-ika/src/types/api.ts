// ── Vault ─────────────────────────────────────────────────────────────────────

export interface CreateVaultPayload {
  heir_eth_address: string;
  owner_address: string;
  passkey_pubkey_hex: string;
  network_id: number;
  heartbeat_interval_secs?: number;
  grace_period_secs?: number;
  pause_duration_secs?: number;
  label?: string;
}

export interface CreateVaultResult {
  estate_id: string;
  estate_pda: string;
  eth_deposit_address: string;
  dwallet_solana_address: string;
}

export interface VaultBalance {
  estate_id: string;
  eth_address: string;
  balance_wei: string;
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

export interface HeartbeatChallenge {
  estate_id: string;
  challenge_b64: string;
}

// ── Claim ─────────────────────────────────────────────────────────────────────

export interface ClaimTxInfo {
  estate_id: string;
  eth_from: string;
  amount_wei: string;
  message_hash_hex: string;
}

// ── Withdraw ──────────────────────────────────────────────────────────────────

export interface WithdrawTxInfo {
  estate_id: string;
  eth_from: string;
  eth_to: string;
  amount_wei: string;
  message_hash_hex: string;
}
