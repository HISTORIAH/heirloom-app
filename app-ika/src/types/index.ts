export type ChainId = 1 | 11155111 | 42161 | 8453 | 10 | 56 | 43114 | 137 | 2;

export interface ChainInfo {
  id: ChainId;
  name: string;
  symbol: string;
}

export interface DWalletInfo {
  pda: string;
  publicKey: Uint8Array;
  curve: number;
  signatureScheme: number;
}

export interface SignResult {
  signature: Uint8Array;
}

export interface IkaGrpcTransport {
  submitTransaction(userSignature: Uint8Array, signedRequestData: Uint8Array): Promise<Uint8Array>;
}

// ── App domain types ──────────────────────────────────────────────────────────

export interface Vault {
  estateId: string;
  estatePda?: string;
  label: string;
  ethDepositAddress: string;
  dwalletSolana?: string;
  balanceEth?: string;
  heartbeatInterval: number;
  gracePeriod: number;
  lastHeartbeat: number;
  isClaimed: boolean;
}

export type UiState = "active" | "grace" | "claimable" | "distributed";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
