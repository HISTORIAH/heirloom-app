import {
  getBytesEncoder,
  getProgramDerivedAddress,
  getAddressEncoder,
  type Address,
  type ProgramDerivedAddress,
} from "@solana/kit";
import { HEIRLOOM_PROGRAM_PROGRAM_ADDRESS } from "../generated";

export type EstateSeeds = {
  authority: Address;
  heir: Address;
};

export async function findEstatePda(
  seeds: EstateSeeds,
  config: { programAddress?: Address | undefined } = {},
): Promise<ProgramDerivedAddress> {
  const {
    programAddress = HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
  } = config;
  return await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([101, 115, 116, 97, 116, 101])),
      getAddressEncoder().encode(seeds.authority),
      getAddressEncoder().encode(seeds.heir),
    ],
  });
}

export type VaultSeeds = {
  authority: Address;
  heir: Address;
};

export async function findVaultPda(
  seeds: VaultSeeds,
  config: { programAddress?: Address | undefined } = {},
): Promise<ProgramDerivedAddress> {
  const {
    programAddress = HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
  } = config;
  return await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([118, 97, 117, 108, 116])),
      getAddressEncoder().encode(seeds.authority),
      getAddressEncoder().encode(seeds.heir),
    ],
  });
}
