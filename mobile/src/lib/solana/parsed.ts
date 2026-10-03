/** Readers for `jsonParsed` RPC account data, which arrives untyped. */

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return value as Record<string, unknown>;
}

/** The `parsed.info` object of a jsonParsed account, if there is one. */
export function parsedInfo(data: unknown): Record<string, unknown> | undefined {
  const payload = Array.isArray(data) ? data[0] : data;
  return asRecord(asRecord(asRecord(payload)?.parsed)?.info);
}

/** Mint, raw amount and decimals of a parsed token account. */
export function parsedTokenAccount(
  data: unknown,
): { mint: string; amount: string; decimals?: number } | undefined {
  const info = parsedInfo(data);
  const mint = info?.mint;
  const tokenAmount = asRecord(info?.tokenAmount);
  const amount = tokenAmount?.amount;
  if (typeof mint !== "string" || typeof amount !== "string") return undefined;
  const decimals = typeof tokenAmount?.decimals === "number" ? tokenAmount.decimals : undefined;
  return { mint, amount, decimals };
}

/** Raw amount string → bigint, or undefined if it isn't one. */
export function toBigInt(raw: unknown): bigint | undefined {
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}
