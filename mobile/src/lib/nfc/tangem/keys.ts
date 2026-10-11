import { getAddressDecoder, getBase16Encoder, type Address } from "@solana/kit";

import type { TangemScan, TangemWallet } from "@modules/tangem-card";
import type { TangemCredential } from "@/types/nfc";

const hexBytes = getBase16Encoder();
const addressOf = getAddressDecoder();

/** Newest first: Wallet 2.0 keeps Solana on the SLIP-0010 wallet, older firmware on plain Ed25519. */
const CURVE_PREFERENCE: TangemWallet["curve"][] = ["ed25519_slip0010", "ed25519"];

type SolanaKey = { publicKeyHex: string; derivationPath: string | null };

export function addressFromHex(publicKeyHex: string): Address {
  return addressOf.decode(hexBytes.encode(publicKeyHex));
}

/**
 * Where the Solana key sits on one wallet. HD cards derive it at `derivationPath`; cards
 * without HD wallets use the wallet key itself. Undefined when an HD card didn't derive it.
 */
function solanaKeyOn(wallet: TangemWallet, hdWalletAllowed: boolean, derivationPath: string): SolanaKey | undefined {
  if (!hdWalletAllowed) return { publicKeyHex: wallet.publicKey, derivationPath: null };
  if (wallet.derivedPublicKey === null) return undefined;
  return { publicKeyHex: wallet.derivedPublicKey, derivationPath };
}

/** The card's Solana key, from the preferred wallet that has one. Undefined if none does. */
export function pickSolanaKey(scan: TangemScan, derivationPath: string): TangemCredential | undefined {
  for (const curve of CURVE_PREFERENCE) {
    const wallet = scan.wallets.find((candidate) => candidate.curve === curve);
    if (wallet === undefined) continue;
    const key = solanaKeyOn(wallet, scan.hdWalletAllowed, derivationPath);
    if (key === undefined) continue;
    return {
      cardId: scan.cardId,
      address: addressFromHex(key.publicKeyHex),
      walletPublicKey: wallet.publicKey,
      derivationPath: key.derivationPath,
    };
  }
  return undefined;
}
