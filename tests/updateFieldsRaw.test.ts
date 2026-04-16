/**
 * Raw update_fields test using correct OptionZc encoding.
 *
 * The generated client uses getOptionEncoder which encodes None as [0x00] (1 byte).
 * Quasar's OptionZc<i64> is always 9 bytes: 1 tag byte + 8 value bytes.
 * None = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
 * Some(x) = [0x01, ...little-endian i64]
 */

import { expect, test } from "bun:test";
import {
  createDefaultSolanaClient,
  sendInitialize,
  loadDefaultKeypair,
  createDefaultTransaction,
  signAndSendTransaction,
} from "./setup";
import {
  AccountRole,
  appendTransactionMessageInstruction,
  pipe,
  type Address,
  type KeyPairSigner,
} from "@solana/kit";
import {
  findEstatePda,
  HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
} from "@historiah/heirloom";

// Encodes Option<i64> as OptionZc: always 9 bytes (1 tag + 8 value, little-endian)
function encodeOptionZcI64(value: bigint | null): Uint8Array {
  const buf = new Uint8Array(9);
  if (value !== null) {
    buf[0] = 1;
    const view = new DataView(buf.buffer);
    view.setBigInt64(1, value, true); // little-endian
  }
  return buf;
}

function buildUpdateFieldsIx(
  authority: KeyPairSigner,
  heir: Address,
  estate: Address,
  heartbeatInterval: bigint | null,
  gracePeriod: bigint | null,
  pauseDuration: bigint | null,
) {
  // discriminator (1) + 3x OptionZc<i64> (3 * 9 = 27) = 28 bytes
  const data = new Uint8Array(28);
  data[0] = 3; // discriminator for update_fields
  data.set(encodeOptionZcI64(heartbeatInterval), 1);
  data.set(encodeOptionZcI64(gracePeriod), 10);
  data.set(encodeOptionZcI64(pauseDuration), 19);

  return {
    programAddress: HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
    accounts: [
      { address: authority.address, role: AccountRole.WRITABLE_SIGNER, signer: authority },
      { address: heir,              role: AccountRole.READONLY },
      { address: estate,            role: AccountRole.WRITABLE },
      { address: "SysvarC1ock11111111111111111111111111111111" as Address, role: AccountRole.READONLY },
      { address: "11111111111111111111111111111111" as Address,            role: AccountRole.READONLY },
    ],
    data,
  };
}

test("raw update_fields with OptionZc encoding — all None (heartbeat only)", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "raw-fields-test",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
  });

  const [estate] = await findEstatePda({
    authority: authority.address,
    heir: heir.address,
  });

  const ix = buildUpdateFieldsIx(
    authority,
    heir.address,
    estate,
    null, // heartbeatInterval — no change
    null, // gracePeriod — no change
    null, // pauseDuration — no change
  );

  // @ts-ignore — raw instruction, not fully typed
  await pipe(
    await createDefaultTransaction(client, authority),
    (tx) => appendTransactionMessageInstruction(ix, tx),
    (tx) => signAndSendTransaction(client, tx),
  );

  console.log("raw updateFields (all None) succeeded — encoding is correct");
});

test("raw update_fields with OptionZc encoding — set heartbeatInterval", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "raw-fields-test2",
    heartbeatInterval: 86400n,
    gracePeriod: 3600n,
    pauseDuration: 7200n,
  });

  const [estate] = await findEstatePda({
    authority: authority.address,
    heir: heir.address,
  });

  const ix = buildUpdateFieldsIx(
    authority,
    heir.address,
    estate,
    172800n, // new heartbeatInterval
    null,
    null,
  );

  // @ts-ignore — raw instruction, not fully typed
  await pipe(
    await createDefaultTransaction(client, authority),
    (tx) => appendTransactionMessageInstruction(ix, tx),
    (tx) => signAndSendTransaction(client, tx),
  );

  console.log("raw updateFields (Some heartbeatInterval) succeeded");
});
