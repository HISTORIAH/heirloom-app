import NfcManager from "react-native-nfc-manager";

import { isCardApduError } from "./apdu";
import { cancelScan, ensureNfcStarted } from "./isoDep";
import { cardProblemMessage } from "./messages";
import { createNfcJavaCardSigner } from "./signer";
import { isUserCancel } from "@/lib/text";
import type { CardScan, NfcCapability } from "@/types/nfc";
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
  run: () => Promise<string>,
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
    return { kind: "address", value: await run() };
  } catch (cause) {
    return scanCatch(cause, treatNoKeyAsEmpty);
  }
}

export async function scanCardAddress(onListening?: () => void): Promise<CardScan> {
  const signer = createNfcJavaCardSigner();
  return withCapability(onListening, () => signer.getPublicKey(), true);
}

export async function setupBlankCard(
  onProgress?: (progress: TapProgress) => void,
): Promise<CardScan> {
  const signer = createNfcJavaCardSigner();
  return withCapability(undefined, () => signer.generateKeypair(onProgress), false);
}
