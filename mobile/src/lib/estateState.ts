import type { Estate } from "@historiah/heirloom";

export type EstateUiState = "active" | "grace" | "claimable" | "distributed";

export const STATUS_COLOR: Record<EstateUiState, string> = {
  active: "#65A30D",
  grace: "#CA8A04",
  claimable: "#DC2626",
  distributed: "#888888",
};

export function computeEstateState(args: {
  lastHeartbeat: number;
  heartbeatInterval: number;
  gracePeriod: number;
  pausedUntil: number;
  createdAt: number;
  vaultEmpty: boolean;
}): { state: EstateUiState; secondsUntilGrace: number; secondsUntilClaimable: number } {
  const { lastHeartbeat, heartbeatInterval, gracePeriod, pausedUntil, createdAt, vaultEmpty } =
    args;

  if (vaultEmpty) {
    return { state: "distributed", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  const anchor = lastHeartbeat > 0 ? lastHeartbeat : createdAt;
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = anchor + heartbeatInterval;
  const claimableAt = Math.max(graceDeadline + gracePeriod, pausedUntil);

  if (now >= claimableAt) {
    return { state: "claimable", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  if (now >= graceDeadline) {
    return { state: "grace", secondsUntilGrace: 0, secondsUntilClaimable: claimableAt - now };
  }
  return {
    state: "active",
    secondsUntilGrace: graceDeadline - now,
    secondsUntilClaimable: claimableAt - now,
  };
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${rest}s`;
}

export function isVaultEmpty(claimableAssets: number, claimableLamports: bigint): boolean {
  return claimableAssets === 0 && claimableLamports === 0n;
}

export function holdingsLine(claimableLamports: bigint, tokenCount: number): string {
  const sol = Number(claimableLamports) / 1e9;
  const solText = `${sol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
  if (tokenCount === 0) return solText;
  if (tokenCount === 1) return `${solText} · 1 token`;
  return `${solText} · ${tokenCount} tokens`;
}

export function estateStatusLine(
  data: Estate,
  vaultEmpty: boolean,
): { state: EstateUiState; line: string } {
  const result = computeEstateState({
    lastHeartbeat: Number(data.lastHeartbeat),
    heartbeatInterval: Number(data.heartbeatInterval),
    gracePeriod: Number(data.gracePeriod),
    pausedUntil: Number(data.pausedUntil),
    createdAt: Number(data.createdAt),
    vaultEmpty,
  });

  if (result.state === "distributed") {
    return { state: result.state, line: "Distributed" };
  }
  if (result.state === "claimable") {
    return { state: result.state, line: "Claimable" };
  }
  if (result.state === "grace") {
    return {
      state: result.state,
      line: `Grace · ${formatDuration(result.secondsUntilClaimable)} until claimable`,
    };
  }
  return {
    state: result.state,
    line: `Active · ${formatDuration(result.secondsUntilGrace)} until grace`,
  };
}
