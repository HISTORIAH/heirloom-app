import NfcManager, { NfcTech, type TagEvent } from "react-native-nfc-manager";

export type NfcCapability =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "disabled" }
  | { status: "ready" };

export type TagSummary = {
  idHex?: string;
  techs: string[];
  ndefType?: string;
  ndefRecordCount?: number;
  maxSize?: number;
};

let started = false;

export async function ensureNfcStarted(): Promise<void> {
  if (started) return;
  await NfcManager.start();
  started = true;
}

export async function readNfcCapability(): Promise<NfcCapability> {
  await ensureNfcStarted();
  const supported = await NfcManager.isSupported();
  if (!supported) return { status: "unsupported" };
  const enabled = await NfcManager.isEnabled();
  if (!enabled) return { status: "disabled" };
  return { status: "ready" };
}

export async function openNfcSettings(): Promise<void> {
  await NfcManager.goToNfcSetting();
}

function toHexId(id: TagEvent["id"]): string | undefined {
  if (id === undefined) return undefined;
  if (typeof id === "string") return id.toUpperCase();
  if (Array.isArray(id)) {
    return (id as number[])
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }
  return undefined;
}

export function summarizeTag(tag: TagEvent): TagSummary {
  const techs = tag.techTypes ?? [];
  const ndef = tag.ndefMessage;
  return {
    idHex: toHexId(tag.id),
    techs,
    ndefType: typeof tag.type === "string" ? tag.type : undefined,
    ndefRecordCount: Array.isArray(ndef) ? ndef.length : undefined,
    maxSize: typeof tag.maxSize === "number" ? tag.maxSize : undefined,
  };
}

/** Temporary: read any nearby tag. Replaced by Java Card APDUs later. */
export async function scanAnyTag(): Promise<TagSummary> {
  await ensureNfcStarted();
  try {
    await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA, NfcTech.IsoDep], {
      alertMessage: "Hold your card to the phone",
    });
    const tag = await NfcManager.getTag();
    if (!tag) throw new Error("No tag data returned");
    return summarizeTag(tag);
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
}

export async function cancelScan(): Promise<void> {
  await NfcManager.cancelTechnologyRequest().catch(() => undefined);
}
