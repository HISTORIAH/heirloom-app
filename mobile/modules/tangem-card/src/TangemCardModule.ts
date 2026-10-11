import { requireOptionalNativeModule } from "expo";

import type { TangemScan, TangemSignRequest } from "./TangemCard.types";

type TangemCardNative = {
  scan(derivationPath: string): Promise<TangemScan>;
  sign(request: TangemSignRequest): Promise<string[]>;
};

/** Null off Android, or in a dev client built before this module was added. */
const native = requireOptionalNativeModule<TangemCardNative>("TangemCard");

export const isTangemSupported = native !== null;

function requireNative(): TangemCardNative {
  if (native === null) throw new Error("This build can’t read Tangem cards.");
  return native;
}

/** One tap: reads the card and derives the key at `derivationPath` on each Ed25519 wallet. */
export function scanTangemCard(derivationPath: string): Promise<TangemScan> {
  return requireNative().scan(derivationPath);
}

/** One tap: signs every message. Signatures come back hex, in order. */
export function signWithTangemCard(request: TangemSignRequest): Promise<string[]> {
  return requireNative().sign(request);
}
