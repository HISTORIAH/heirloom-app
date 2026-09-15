import {
  createSolanaDevnet,
  createSolanaLocalnet,
  createSolanaMainnet,
  createSolanaTestnet,
  type AppIdentity,
  type SolanaCluster,
} from "@wallet-ui/react-native-kit";

// Public Solana devnet. Override for a laptop validator
// (`http://10.0.2.2:8899` from the Android emulator).
export const SOLANA_RPC_ENDPOINT =
  process.env.EXPO_PUBLIC_SOLANA_RPC_ENDPOINT ??
  "https://api.devnet.solana.com";

function websocketUrl(httpUrl: string): string {
  const fromEnv = process.env.EXPO_PUBLIC_SOLANA_RPC_WS_ENDPOINT;
  if (fromEnv) return fromEnv;

  try {
    const parsed = new URL(httpUrl);
    if (parsed.port === "8899") parsed.port = "8900";
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return httpUrl.replace(/^http/, "ws");
  }
}

function clusterForRpc(url: string): SolanaCluster {
  const urlWs = websocketUrl(url);
  const props = { url, urlWs };
  if (url.includes("mainnet")) return createSolanaMainnet(props);
  if (url.includes("testnet")) return createSolanaTestnet(props);
  if (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("10.0.2.2")
  ) {
    return createSolanaLocalnet(props);
  }
  return createSolanaDevnet(props);
}

export const solanaCluster = clusterForRpc(SOLANA_RPC_ENDPOINT);

export const walletIdentity: AppIdentity = {
  name: "Heirloom",
  uri: "https://heirlm.xyz",
  icon: "favicon.png",
};
