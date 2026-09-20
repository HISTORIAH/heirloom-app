import type { Address } from "@solana/kit";

/**
 * Testing stand-in: treat a typed `hbSigner` (and optional heir) as a card that
 * needs fee SOL. Production should only float when the owner explicitly adds a
 * card wallet in the mobile app — not because a check-in address was pasted.
 */
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

