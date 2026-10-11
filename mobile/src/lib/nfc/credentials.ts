import type { Address } from "@solana/kit";
import { File, Paths } from "expo-file-system";

import { CREDENTIALS_FILE } from "@/constants/credentials";
import { TANGEM_MAX_MESSAGE_BYTES } from "@/constants/tangem";
import { MSG_MAX } from "./apdu";
import { withCardSigningSession } from "./signer";
import { tangemSignerFor } from "./tangem";
import type { CardSigningSession, CredentialAdapter, CredentialKind, CredentialRecord } from "@/types/nfc";

/** Every card kind we can sign with. A new kind of card adds an entry here and a session below. */
export const CREDENTIAL_ADAPTERS: Record<CredentialKind, CredentialAdapter> = {
  heirloom: { kind: "heirloom", label: "Heirloom card", maxMessageBytes: MSG_MAX, asksForOwnCode: false },
  tangem: { kind: "tangem", label: "Tangem card", maxMessageBytes: TANGEM_MAX_MESSAGE_BYTES, asksForOwnCode: true },
};

// ----------------------------------------------------------------- registry

/** Credentials read on this phone, by address. Loaded from disk on first use. */
let known: Map<string, CredentialRecord> | undefined;

function registryFile(): File {
  return new File(Paths.document, CREDENTIALS_FILE);
}

function loadKnown(): Map<string, CredentialRecord> {
  if (known !== undefined) return known;
  known = new Map();
  try {
    const file = registryFile();
    if (file.exists) {
      const records = JSON.parse(file.textSync()) as CredentialRecord[];
      records.forEach((record) => known?.set(record.address, record));
    }
  } catch {
    // A corrupt file only costs us the memory of which card is which; reading a card refills it.
  }
  return known;
}

/** Remembers how to sign with this credential. Call after every read of a card. */
export function rememberCredential(record: CredentialRecord): void {
  const records = loadKnown();
  records.set(record.address, record);
  try {
    registryFile().write(JSON.stringify([...records.values()]));
  } catch {
    // Still known for this session; the next read of the card saves it again.
  }
}

/** What we know about the card at `address`. Cards never read on this phone count as Heirloom cards. */
export function credentialFor(address: Address | string): CredentialRecord {
  return loadKnown().get(address) ?? { kind: "heirloom", address: address as Address };
}

export function adapterFor(address: Address | string): CredentialAdapter {
  return CREDENTIAL_ADAPTERS[credentialFor(address).kind];
}

// ----------------------------------------------------------------- signing

/**
 * A Tangem session: nothing to open up front. Each call to the signer is one tap through Tangem's
 * sheet, which also asks for the card's access code.
 */
function runTangemSession<T>(
  record: Extract<CredentialRecord, { kind: "tangem" }>,
  run: (session: CardSigningSession) => Promise<T>,
): Promise<T> {
  return run({
    address: record.address,
    signer: tangemSignerFor(record),
    pin: { kind: "none" },
    unlock: async () => undefined,
    maxMessageBytes: CREDENTIAL_ADAPTERS.tangem.maxMessageBytes,
  });
}

/** Opens a signing session with whichever card holds `address`. `pin` only applies to Heirloom cards. */
export function withCredentialSession<T>(
  address: Address,
  run: (session: CardSigningSession) => Promise<T>,
  pin?: Uint8Array,
): Promise<T> {
  const record = credentialFor(address);
  if (record.kind === "tangem") return runTangemSession(record, run);
  return withCardSigningSession(run, pin);
}
