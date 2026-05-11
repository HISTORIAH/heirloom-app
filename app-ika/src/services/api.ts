const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:3040/v1/ika";

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `${res.status} ${res.statusText}`);
  return { data, status: res.status };
}

async function get(path: string) {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `${res.status} ${res.statusText}`);
  return { data, status: res.status };
}

export async function getHealth() {
  const { data } = await get("/health");
  return data as { backend: string; ika_grpc: string };
}

export async function createVault(body: {
  estate_id: string;
  authority_pubkey: string;
  heir_eth_address: string;
  chain_id: number;
}) {
  return post("/create-vault", body);
}

export async function getChallenge(estate_id: string) {
  return get(`/challenge/${estate_id}`) as Promise<{ data: { challenge: string; nonce: number }; status: number }>;
}

export async function claimVault(body: {
  estate_id: string;
  heir_eth_address: string;
  eth_signature: string;
  challenge: string;
}) {
  return post("/claim", body);
}

export async function withdrawVault(body: {
  estate_id: string;
  destination_eth: string;
  authority_signature: string;
  challenge: string;
}) {
  return post("/withdraw", body);
}

export async function personalSign(message: string): Promise<string> {
  const provider = (window as any).ethereum;
  if (!provider) throw new Error("MetaMask not installed. Please install MetaMask.");

  const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("No accounts found in MetaMask.");

  return provider.request({
    method: "personal_sign",
    params: [message, accounts[0]],
  });
}

export async function connectEthWallet(): Promise<{ address: string }> {
  const provider = (window as any).ethereum;
  if (!provider) throw new Error("MetaMask not installed.");

  const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("No accounts found.");

  return { address: accounts[0] };
}
