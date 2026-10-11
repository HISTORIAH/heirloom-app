import { describe, expect, test } from "bun:test";

import type { TangemScan, TangemWallet } from "@modules/tangem-card";

import { addressFromHex, pickSolanaKey } from "@/lib/nfc/tangem/keys";

const PATH = "m/44'/501'/0'";
const KEY_A = "11".repeat(32);
const KEY_B = "22".repeat(32);
const KEY_C = "33".repeat(32);

function wallet(curve: TangemWallet["curve"], publicKey: string, derivedPublicKey: string | null): TangemWallet {
  return { curve, publicKey, derivedPublicKey };
}

function scan(hdWalletAllowed: boolean, wallets: TangemWallet[]): TangemScan {
  return { cardId: "CB79000000000001", firmwareVersion: "6.33r", hdWalletAllowed, wallets };
}

describe("pickSolanaKey", () => {
  test("prefers the SLIP-0010 wallet's derived key, like the Tangem app", () => {
    const card = scan(true, [wallet("ed25519", KEY_A, KEY_B), wallet("ed25519_slip0010", KEY_C, KEY_A)]);
    expect(pickSolanaKey(card, PATH)).toEqual({
      cardId: "CB79000000000001",
      address: addressFromHex(KEY_A),
      walletPublicKey: KEY_C,
      derivationPath: PATH,
    });
  });

  test("falls back to plain Ed25519 on older firmware", () => {
    const card = scan(true, [wallet("ed25519", KEY_A, KEY_B)]);
    expect(pickSolanaKey(card, PATH)?.address).toBe(addressFromHex(KEY_B));
  });

  test("uses the wallet key itself on a card without HD wallets", () => {
    const credential = pickSolanaKey(scan(false, [wallet("ed25519", KEY_A, null)]), PATH);
    expect(credential?.address).toBe(addressFromHex(KEY_A));
    expect(credential?.derivationPath).toBeNull();
  });

  test("skips an HD wallet that didn't derive the path", () => {
    const card = scan(true, [wallet("ed25519_slip0010", KEY_A, null), wallet("ed25519", KEY_B, KEY_C)]);
    expect(pickSolanaKey(card, PATH)?.walletPublicKey).toBe(KEY_B);
  });

  test("has nothing for a card without Ed25519 wallets", () => {
    expect(pickSolanaKey(scan(true, []), PATH)).toBeUndefined();
  });
});
