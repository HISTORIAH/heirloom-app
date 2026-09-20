import type { Address } from "@solana/kit";

/** Unique pubkeys that receive the initialize SOL float. One transfer if heir === signer. */
export function floatDestinations(input: {
  heir: Address;
  hbSigner?: Address;
  fundHeir?: boolean;
}): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];
  function add(addr: Address) {
    if (seen.has(addr)) return;
    seen.add(addr);
    out.push(addr);
  }
  if (input.hbSigner) add(input.hbSigner);
  if (input.fundHeir) add(input.heir);
  return out;
}

