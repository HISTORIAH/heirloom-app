export function solToLamports(text: string): bigint {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0n;
  const parts = trimmed.split(".");
  if (parts.length > 2) throw new Error("Enter a SOL amount");
  const whole = parts[0] ?? "0";
  const frac = parts[1] ?? "";
  if (!/^\d+$/.test(whole) || (frac.length > 0 && !/^\d+$/.test(frac))) {
    throw new Error("Enter a SOL amount");
  }
  if (frac.length > 9) throw new Error("SOL only has 9 decimals");
  const frac9 = (frac + "000000000").slice(0, 9);
  return BigInt(whole) * 1_000_000_000n + BigInt(frac9);
}

export function uiAmountToRaw(text: string, decimals: number): bigint {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0n;
  if (decimals < 0 || decimals > 18) throw new Error("Bad mint decimals");
  const parts = trimmed.split(".");
  if (parts.length > 2) throw new Error("Enter an amount");
  const whole = parts[0] ?? "0";
  const frac = parts[1] ?? "";
  if (!/^\d+$/.test(whole) || (frac.length > 0 && !/^\d+$/.test(frac))) {
    throw new Error("Enter an amount");
  }
  if (frac.length > decimals) throw new Error("Too many decimal places");
  const fracPad = (frac + "0".repeat(decimals)).slice(0, decimals);
  const fracVal = fracPad.length === 0 ? 0n : BigInt(fracPad);
  const base = 10n ** BigInt(decimals);
  return BigInt(whole) * base + fracVal;
}

export function lamportsToSolText(lamports: bigint): string {
  const neg = lamports < 0n;
  const abs = neg ? -lamports : lamports;
  const whole = abs / 1_000_000_000n;
  const frac = abs % 1_000_000_000n;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  const body = fracStr.length === 0 ? whole.toString() : `${whole.toString()}.${fracStr}`;
  return neg ? `-${body}` : body;
}
