import NfcManager from "react-native-nfc-manager";

import { isCardApduError } from "./apdu";
import { cancelScan, ensureNfcStarted } from "./isoDep";
import { cardProblemMessage } from "./messages";
import { PIN_TRY_LIMIT } from "./pin";
import { createNfcJavaCardSigner, scanCardIdentity } from "./signer";
import { isUserCancel } from "@/lib/text";
import type { CardScan, NfcCapability, PinStatus } from "@/types/nfc";
import type { TapProgress } from "@/types/create";

export { cancelScan };

export async function readNfcCapability(): Promise<NfcCapability> {
  await ensureNfcStarted();
  if (!(await NfcManager.isSupported())) return { status: "unsupported" };
  if (!(await NfcManager.isEnabled())) return { status: "disabled" };
  return { status: "ready" };
}

export async function openNfcSettings(): Promise<void> {
  await NfcManager.goToNfcSetting();
}

function scanCatch(cause: unknown, treatNoKeyAsEmpty: boolean): CardScan {
  if (isUserCancel(cause)) return { kind: "cancelled" };
  if (treatNoKeyAsEmpty && isCardApduError(cause) && cause.kind === "no_key") {
    return { kind: "empty" };
  }
  return { kind: "failed", message: cardProblemMessage(cause, "Could not read the credential") };
}

async function withCapability(
  onListening: (() => void) | undefined,
  run: () => Promise<{ value: string; pin: PinStatus }>,
  treatNoKeyAsEmpty: boolean,
): Promise<CardScan> {
  let cap: NfcCapability;
  try {
    cap = await readNfcCapability();
  } catch {
    return { kind: "unsupported" };
  }
  if (cap.status === "unsupported") return { kind: "unsupported" };
  if (cap.status === "disabled") return { kind: "off" };
  onListening?.();
  try {
    const found = await run();
    return { kind: "address", value: found.value, pin: found.pin };
  } catch (cause) {
    return scanCatch(cause, treatNoKeyAsEmpty);
  }
}

export async function scanCardAddress(onListening?: () => void): Promise<CardScan> {
  return withCapability(
    onListening,
    async () => {
      const id = await scanCardIdentity();
      return { value: id.address, pin: id.pin };
    },
    true,
  );
}

export async function setupBlankCard(
  onProgress?: (progress: TapProgress) => void,
  pin?: Uint8Array,
): Promise<CardScan> {
  const signer = createNfcJavaCardSigner();
  const pinState: PinStatus =
    pin === undefined ? { kind: "none" } : { kind: "set", triesLeft: PIN_TRY_LIMIT };
  return withCapability(
    undefined,
    async () => ({ value: await signer.generateKeypair(onProgress, pin), pin: pinState }),
    false,
  );
}
