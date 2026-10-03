import { LAMPORTS_PER_SOL, SOL_DECIMALS } from "@/constants/solana";

/** "1.5" with `decimals` places → raw integer units. Throws on bad input. */
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
  return BigInt(whole) * 10n ** BigInt(decimals) + fracVal;
}

export function solToLamports(text: string): bigint {
  return uiAmountToRaw(text, SOL_DECIMALS);
}

/** Raw units → exact UI text, no trailing zeros: (1500000n, 6) → "1.5". */
export function rawToUiText(raw: bigint, decimals: number): string {
  const neg = raw < 0n;
  const abs = neg ? -raw : raw;
  const unit = 10n ** BigInt(decimals);
  const whole = abs / unit;
  const frac = decimals === 0 ? "" : (abs % unit).toString().padStart(decimals, "0").replace(/0+$/, "");
  const body = frac.length === 0 ? whole.toString() : `${whole.toString()}.${frac}`;
  return neg ? `-${body}` : body;
}

/** Exact, no trailing zeros: 1500000000n → "1.5". */
export function lamportsToSolText(lamports: bigint): string {
  return rawToUiText(lamports, SOL_DECIMALS);
}

/** For display: grouped, between `minFrac` and `maxFrac` places. (98889980000n, 6) → "98,889.98". */
export function unitsLabel(raw: bigint, decimals: number, maxFrac = 2, minFrac = 0): string {
  return (Number(raw) / 10 ** decimals).toLocaleString("en-US", {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  });
}

/** "$145", "$0.42", "<$0.01". */
export function usdLabel(usd: number): string {
  if (usd > 0 && usd < 0.01) return "<$0.01";
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: usd < 100 ? 2 : 0 })}`;
}

/** For display: "1.25 SOL", up to four places. */
export function solLabel(lamports: bigint): string {
  const sol = Number(lamports) / Number(LAMPORTS_PER_SOL);
  return `${sol.toLocaleString("en-US", { maximumFractionDigits: 4 })} SOL`;
}

/** Two fixed places: "1.25". */
export function solFixed(lamports: bigint): string {
  return (Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(2);
}
