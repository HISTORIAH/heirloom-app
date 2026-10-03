import type { Address } from "@solana/kit";

/**
 * Wallets that get the 0.02 SOL fee float at create: the check-in signer, and
 * the heir when it is a credential. Deduped.
 */
export function floatDestinations(input: { heir: Address; checkInSigner?: Address; fundHeir?: boolean }): Address[] {
  const out = new Set<Address>();
  if (input.checkInSigner) out.add(input.checkInSigner);
  if (input.fundHeir) out.add(input.heir);
  return [...out];
}
