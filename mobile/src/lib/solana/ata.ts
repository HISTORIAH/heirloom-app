import { getAddressEncoder, getProgramDerivedAddress, type Address } from "@solana/kit";

import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS } from "@/constants/solana";

export async function findAtaPda(owner: Address, mint: Address, tokenProgram: Address): Promise<Address> {
  const encode = getAddressEncoder();
  const [pda] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [encode.encode(owner), encode.encode(tokenProgram), encode.encode(mint)],
  });
  return pda;
}
