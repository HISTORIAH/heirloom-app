import {
  fetchMaybeEstate,
  findEstatePda,
  findVaultPda,
  getInitializeInstructionAsync,
  getUpdateFieldInstruction,
} from "@historiah/heirloom";
import {
  address,
  type Address,
  type Instruction,
  type Rpc,
  type SolanaRpcApi,
  type TransactionSigner,
} from "@solana/kit";

import { floatDestinations } from "@/lib/cardFloat";
import { CARD_FEE_FLOAT_LAMPORTS, LABEL_MAX_LEN } from "@/lib/constants";
import { transferSolIx } from "@/lib/transferSol";

export type EstateRpc = Rpc<SolanaRpcApi>;

export type CreateEstateInput = {
  heir: Address;
  label: string;
  heartbeatInterval: bigint;
  gracePeriod: bigint;
  amountLamports: bigint;
  delegate?: Address;
  hbSigner?: Address;
  fundHeir?: boolean;
};

function trimmedLabel(label: string): string {
  const next = label.trim();
  if (next.length === 0) return "estate";
  return next.slice(0, LABEL_MAX_LEN);
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

export async function buildHeartbeatIx(
  authority: TransactionSigner,
  heir: Address,
): Promise<Instruction> {
  const [estate] = await findEstatePda({ authority: authority.address, heir });
  return getUpdateFieldInstruction({
    authority,
    heir,
    estate,
    heartbeatInterval: null,
    gracePeriod: null,
    pauseDuration: null,
    label: null,
  });
}

export function buildTopUpSolIx(
  authority: TransactionSigner,
  vault: Address,
  lamports: bigint,
): Instruction {
  return transferSolIx(authority, vault, lamports);
}

export async function assertEstateFree(
  rpc: EstateRpc,
  authority: Address,
  heir: Address,
): Promise<void> {
  const [estatePda] = await findEstatePda({ authority, heir });
  const maybe = await fetchMaybeEstate(rpc, estatePda);
  if (maybe.exists && maybe.lamports > 0n) {
    throw new Error(
      "An estate already exists for this heir. Close it or pick a different heir.",
    );
  }
}

export async function buildCreateEstateIxs(
  authority: TransactionSigner,
  input: CreateEstateInput,
): Promise<Instruction[]> {
  if (input.amountLamports <= 0n) {
    throw new Error("Select at least some SOL to create a vault.");
  }
  const initIx = await getInitializeInstructionAsync({
    authority,
    heir: input.heir,
    amount: input.amountLamports,
    label: trimmedLabel(input.label),
    heartbeatInterval: input.heartbeatInterval,
    gracePeriod: input.gracePeriod,
    pauseDuration: 0n,
    delegate: input.delegate,
    hbSigner: input.hbSigner,
  });
  // Testing: typed signer / fund-heir checkbox. Product: only after "add card".
  const dests = floatDestinations({
    heir: input.heir,
    hbSigner: input.hbSigner,
    fundHeir: input.fundHeir,
  });
  const floatIxs = dests.map((destination) =>
    transferSolIx(authority, destination, CARD_FEE_FLOAT_LAMPORTS),
  );
  return [initIx, ...floatIxs];
}

export { findVaultPda };
