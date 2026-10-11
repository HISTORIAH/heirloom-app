import { generateKeyPairSync, sign } from "crypto";
import { getAddressDecoder, getBase16Decoder, getBase16Encoder, type TransactionPartialSigner } from "@solana/kit";
import { describe, expect, test } from "bun:test";

import { TANGEM_MAX_MESSAGE_BYTES } from "@/constants/tangem";
import type { TangemCredential } from "@/types/nfc";

import { createTangemTransactionSigner, type TangemSignMessages } from "@/lib/nfc/tangem/signer";

type CompiledTx = Parameters<TransactionPartialSigner["signTransactions"]>[0][number];

const hex = getBase16Decoder();
const bytes = getBase16Encoder();

/** A stand-in card: a real Ed25519 key that signs whatever it's handed. */
function fakeCard() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  const credential: TangemCredential = {
    cardId: "CB79000000000001",
    address: getAddressDecoder().decode(raw),
    walletPublicKey: hex.decode(raw),
    derivationPath: "m/44'/501'/0'",
  };
  const signMessages: TangemSignMessages = async (_card, messagesHex) =>
    messagesHex.map((message) => hex.decode(sign(null, Buffer.from(bytes.encode(message)), privateKey)));
  return { credential, signMessages };
}

function txWith(message: Uint8Array): CompiledTx {
  return { messageBytes: message, signatures: {} } as unknown as CompiledTx;
}

describe("createTangemTransactionSigner", () => {
  test("signs every transaction in one card call", async () => {
    const { credential, signMessages } = fakeCard();
    let calls = 0;
    const signer = createTangemTransactionSigner(credential, async (card, messages) => {
      calls += 1;
      return signMessages(card, messages);
    });
    const dicts = await signer.signTransactions([txWith(Uint8Array.of(1, 2)), txWith(Uint8Array.of(3))]);
    expect(calls).toBe(1);
    expect(dicts.map((dict) => dict[credential.address]?.length)).toEqual([64, 64]);
  });

  test("rejects a message over the card's limit before tapping", async () => {
    const { credential } = fakeCard();
    const signer = createTangemTransactionSigner(credential, async () => {
      throw new Error("should not sign");
    });
    const tooBig = new Uint8Array(TANGEM_MAX_MESSAGE_BYTES + 1);
    await expect(signer.signTransactions([txWith(tooBig)])).rejects.toThrow("too large");
  });

  test("rejects a signature from a different key", async () => {
    const registered = fakeCard();
    const otherCard = fakeCard();
    const signer = createTangemTransactionSigner(registered.credential, otherCard.signMessages);
    await expect(signer.signTransactions([txWith(Uint8Array.of(1))])).rejects.toThrow("different key");
  });
});
