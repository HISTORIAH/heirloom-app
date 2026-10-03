import { AccountRole, type Address, type Instruction, type TransactionSigner } from "@solana/kit";

import { SYSTEM_PROGRAM_ADDRESS } from "@/constants/solana";

function u64le(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let n = value;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

/** System program Transfer. Avoids a separate @solana-program/system dep on mobile. */
export function transferSolIx(source: TransactionSigner, destination: Address, lamports: bigint): Instruction {
  const data = new Uint8Array(12);
  data[0] = 2;
  data.set(u64le(lamports), 4);
  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: source.address, role: AccountRole.WRITABLE_SIGNER },
      { address: destination, role: AccountRole.WRITABLE },
    ],
    data,
  };
}
