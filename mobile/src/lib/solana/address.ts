import { address, type Address } from "@solana/kit";

import { ADDRESS_PATTERN, SOLANA_URI_PATTERN } from "@/constants/solana";

export function shortAddress(value: string, take = 4): string {
  if (value.length < take * 2 + 2) return value;
  return `${value.slice(0, take)}…${value.slice(-take)}`;
}

/** Last four characters, for "credential ····7F2A". */
export function lastFour(value: string): string {
  return `····${value.slice(-4)}`;
}

export function parseAddress(raw: string, label: string): Address {
  const value = raw.trim();
  if (value.length === 0) throw new Error(`Enter a ${label}`);
  try {
    return address(value);
  } catch {
    throw new Error(`${label} is not a Solana address`);
  }
}

export function parseOptionalAddress(raw: string, label: string): Address | undefined {
  if (raw.trim().length === 0) return undefined;
  return parseAddress(raw, label);
}

/** True when the text parses as a Solana address. */
export function isAddress(raw: string): boolean {
  try {
    address(raw.trim());
    return true;
  } catch {
    return false;
  }
}

/** Pull an address out of pasted or scanned text, `solana:` URIs included. */
export function addressFromText(text: string): string {
  const trimmed = text.trim();
  return SOLANA_URI_PATTERN.exec(trimmed)?.[1] ?? trimmed;
}

/** First valid address anywhere in a blob of text. */
export function firstAddressIn(blob: string): Address | undefined {
  for (const hit of blob.match(ADDRESS_PATTERN) ?? []) {
    try {
      return address(hit);
    } catch {
      continue;
    }
  }
  return undefined;
}
