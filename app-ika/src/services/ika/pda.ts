import { getProgramDerivedAddress, type Address } from "@solana/kit";
import {
  CPI_AUTHORITY_SEED,
  SEED_DWALLET,
  SEED_DWALLET_COORDINATOR,
  SEED_MESSAGE_APPROVAL,
} from "./constants";

function u16le(n: number): Uint8Array {
  const buf = new Uint8Array(2);
  buf[0] = n & 0xff;
  buf[1] = (n >> 8) & 0xff;
  return buf;
}

function chunkSeeds(data: Uint8Array): Uint8Array[] {
  const seeds: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += 32) {
    seeds.push(data.slice(i, Math.min(i + 32, data.length)));
  }
  return seeds;
}

export function dwalletPdaSeeds(curve: number, publicKey: Uint8Array): Uint8Array[] {
  const payload = new Uint8Array(2 + publicKey.length);
  payload.set(u16le(curve), 0);
  payload.set(publicKey, 2);
  return [new TextEncoder().encode(SEED_DWALLET), ...chunkSeeds(payload)];
}

export async function getDWalletPda(
  ikaProgramId: Address,
  curve: number,
  publicKey: Uint8Array,
): Promise<readonly [Address, number]> {
  return getProgramDerivedAddress({
    programAddress: ikaProgramId,
    seeds: dwalletPdaSeeds(curve, publicKey),
  });
}

export function messageApprovalPdaSeeds(
  curve: number,
  publicKey: Uint8Array,
  signatureScheme: number,
  messageHash: Uint8Array,
): Uint8Array[] {
  const seeds = dwalletPdaSeeds(curve, publicKey);
  seeds.push(new TextEncoder().encode(SEED_MESSAGE_APPROVAL));
  seeds.push(u16le(signatureScheme));
  seeds.push(messageHash);
  return seeds;
}

export async function getMessageApprovalPda(
  ikaProgramId: Address,
  curve: number,
  publicKey: Uint8Array,
  signatureScheme: number,
  messageHash: Uint8Array,
): Promise<readonly [Address, number]> {
  return getProgramDerivedAddress({
    programAddress: ikaProgramId,
    seeds: messageApprovalPdaSeeds(curve, publicKey, signatureScheme, messageHash),
  });
}

export async function getCpiAuthorityPda(
  ourProgramId: Address,
): Promise<readonly [Address, number]> {
  return getProgramDerivedAddress({
    programAddress: ourProgramId,
    seeds: [new TextEncoder().encode(CPI_AUTHORITY_SEED)],
  });
}

export async function getCoordinatorPda(
  ikaProgramId: Address,
): Promise<readonly [Address, number]> {
  return getProgramDerivedAddress({
    programAddress: ikaProgramId,
    seeds: [new TextEncoder().encode(SEED_DWALLET_COORDINATOR)],
  });
}
