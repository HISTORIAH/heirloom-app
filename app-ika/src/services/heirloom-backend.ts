/**
 * HTTP client for the Heirloom Rust backend.
 *
 * The backend acts as a proxy to both:
 * - Solana network (fee-paying relayer)
 * - Ika gRPC network (dWallet operations)
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3040";

// ── Solana Transaction Relay ──

export interface RelayRequest {
  serializedTransaction: string;
}

export interface RelayResponse {
  signature: string;
  status: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function submitViaRelayer(serializedTransaction: Uint8Array): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/v1/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serializedTransaction: toBase64(serializedTransaction),
    } satisfies RelayRequest),
  });
  if (!response.ok) {
    throw new Error(`Backend relay error: ${await response.text()}`);
  }
  const { signature } = (await response.json()) as RelayResponse;
  return signature;
}

// ── Backend Health ──

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/v1/health`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}
