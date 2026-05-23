export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  const d = Math.round(seconds / 86400);
  return `${d} day${d !== 1 ? "s" : ""}`;
}

export function isValidEthAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

export function formatWei(wei: string): string {
  try {
    const eth = Number(BigInt(wei)) / 1e18;
    return eth.toFixed(6) + " ETH";
  } catch {
    return wei + " wei";
  }
}
