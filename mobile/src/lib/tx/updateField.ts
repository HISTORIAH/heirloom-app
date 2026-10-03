import { findEstatePda, getUpdateFieldInstruction } from "@historiah/heirloom";
import type { Address, Instruction, TransactionSigner } from "@solana/kit";

import type { EstateTimingFields } from "@/types/estate";

/**
 * The one instruction behind check-ins and timing changes. Any field left out
 * stays as it is; with none set it is a plain check-in.
 */
export function buildUpdateFieldIx(
  signer: TransactionSigner,
  heir: Address,
  estate: Address,
  fields: EstateTimingFields = {},
): Instruction {
  return getUpdateFieldInstruction({
    authority: signer,
    heir,
    estate,
    checkInIntervalSecs: fields.checkInIntervalSecs ?? null,
    gracePeriodSecs: fields.gracePeriodSecs ?? null,
    delegatePauseDurationSecs: fields.delegatePauseDurationSecs ?? null,
  });
}

/** Check in on `owner`'s estate for `heir`. The signer is the owner or their check-in signer. */
export async function buildCheckInIx(signer: TransactionSigner, owner: Address, heir: Address): Promise<Instruction> {
  const [estate] = await findEstatePda({ authority: owner, heir });
  return buildUpdateFieldIx(signer, heir, estate);
}
