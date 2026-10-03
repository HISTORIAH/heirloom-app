import NfcManager, { NfcTech } from "react-native-nfc-manager";

import { addressInTag, summarizeTag } from "@/lib/nfc/tag";
import { errorMessage, isUserCancel } from "@/lib/text";
import type { CardScan, NfcCapability, TagSummary } from "@/types/nfc";

let started = false;

async function ensureNfcStarted(): Promise<void> {
  if (started) return;
  await NfcManager.start();
  started = true;
}

export async function readNfcCapability(): Promise<NfcCapability> {
  await ensureNfcStarted();
  if (!(await NfcManager.isSupported())) return { status: "unsupported" };
  if (!(await NfcManager.isEnabled())) return { status: "disabled" };
  return { status: "ready" };
}

export async function openNfcSettings(): Promise<void> {
  await NfcManager.goToNfcSetting();
}

/** Temporary: read any nearby tag. Replaced by Java Card APDUs later. */
async function scanAnyTag(): Promise<TagSummary> {
  await ensureNfcStarted();
  try {
    await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA, NfcTech.IsoDep], {
      alertMessage: "Hold the credential to the phone",
    });
    const tag = await NfcManager.getTag();
    if (!tag) throw new Error("No tag data returned");
    return summarizeTag(tag);
  } finally {
    await cancelScan();
  }
}

/** Tap a credential and read the address on it. Never throws. */
export async function scanCardAddress(onListening?: () => void): Promise<CardScan> {
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
    const value = addressInTag(await scanAnyTag());
    return value === undefined ? { kind: "empty" } : { kind: "address", value };
  } catch (cause) {
    if (isUserCancel(cause)) return { kind: "cancelled" };
    return { kind: "failed", message: errorMessage(cause, "Could not read the credential") };
  }
}

export async function cancelScan(): Promise<void> {
  await NfcManager.cancelTechnologyRequest().catch(() => undefined);
}
