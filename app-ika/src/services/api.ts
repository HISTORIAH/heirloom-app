// Base is just the host + /v1/ika — no trailing slash.
// The env var should be e.g. "http://localhost:3040" (no path).
const BASE_HOST = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3040").replace(/\/$/, "");
const API_BASE = `${BASE_HOST}/v1/ika`;

async function post<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `${res.status} ${res.statusText}`);
  return (data.data ?? data) as T;
}

async function get<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `${res.status} ${res.statusText}`);
  return (data.data ?? data) as T;
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ backend: string; ika_grpc: string }> {
  return get("/health");
}

// ── Vault creation ────────────────────────────────────────────────────────────

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

export async function createVault(body: CreateVaultPayload): Promise<CreateVaultResult> {
  return post("/create-vault", body);
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

export interface HeartbeatChallenge {
  estate_id: string;
  challenge_b64: string;
}

export async function getHeartbeatChallenge(estateId: string): Promise<HeartbeatChallenge> {
  return get(`/heartbeat/${estateId}`);
}

export async function postHeartbeat(body: {
  estate_id: string;
  signature_b64: string;
  authenticator_data_b64: string;
  client_data_json: string;
}): Promise<{ solana_tx: string }> {
  return post("/heartbeat", body);
}

// ── Claim (heir flow) ─────────────────────────────────────────────────────────

export interface ClaimTxInfo {
  estate_id: string;
  eth_from: string;
  amount_wei: string;
  message_hash_hex: string;
}

export async function getClaimTx(estateId: string): Promise<ClaimTxInfo> {
  return get(`/claim-tx/${estateId}`);
}

export async function postClaim(body: {
  estate_id: string;
  heir_eth_address: string;
  eth_signature: string;
}): Promise<{ solana_tx: string; eth_tx: string }> {
  return post("/claim", body);
}

// ── Withdraw (owner emergency exit) ──────────────────────────────────────────

export interface WithdrawTxInfo {
  estate_id: string;
  eth_from: string;
  eth_to: string;
  amount_wei: string;
  message_hash_hex: string;
}

export async function getWithdrawTx(
  estateId: string,
  destinationEth: string
): Promise<WithdrawTxInfo> {
  return get(`/withdraw-tx/${estateId}?destination_eth=${encodeURIComponent(destinationEth)}`);
}

export async function postWithdraw(body: {
  estate_id: string;
  destination_eth: string;
  owner_address: string;
  owner_signature: string;
}): Promise<{ solana_tx: string; eth_tx: string }> {
  return post("/withdraw", body);
}

// ── Ethereum wallet helpers ───────────────────────────────────────────────────

/**
 * Sign a 32-byte message hash with MetaMask personal_sign.
 *
 * MetaMask applies the EIP-191 prefix: keccak256("\x19Ethereum Signed Message:\n32" + hash).
 * The backend accounts for this prefix when building the secp256k1 precompile instruction.
 *
 * `messageHashHex` — 32 bytes as hex string WITHOUT 0x prefix.
 * `ethAddress`     — the Ethereum address to sign with (MetaMask must control it).
 */
export async function signMessageHash(messageHashHex: string, ethAddress: string): Promise<string> {
  const provider = (window as any).ethereum;
  if (!provider) throw new Error("MetaMask not installed.");
  return provider.request({
    method: "personal_sign",
    params: [`0x${messageHashHex}`, ethAddress],
  });
}
