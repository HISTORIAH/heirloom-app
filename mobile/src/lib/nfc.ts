import { address } from "@solana/kit";
import NfcManager, { NfcTech, type NdefRecord, type TagEvent } from "react-native-nfc-manager";

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
  texts: string[];
};

export type CardScan =
  | { kind: "address"; value: string }
  | { kind: "cancelled" }
  | { kind: "empty" }
  | { kind: "off" }
  | { kind: "unsupported" }
  | { kind: "failed"; message: string };

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

function asBytes(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const bytes: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item)) return undefined;
    bytes.push(item & 0xff);
  }
  return bytes;
}

function latin1(bytes: number[]): string {
  return String.fromCharCode(...bytes);
}

function recordText(record: NdefRecord): string | undefined {
  const payload = asBytes(record.payload);
  if (payload === undefined || payload.length === 0) return undefined;
  const typeBytes =
    typeof record.type === "string" ? asBytes([...record.type].map((ch) => ch.charCodeAt(0))) : asBytes(record.type);
  if (typeBytes === undefined) return undefined;
  const type = latin1(typeBytes);
  if (type === "T") {
    const langLen = (payload[0] ?? 0) & 0x3f;
    const text = latin1(payload.slice(1 + langLen)).trim();
    return text.length > 0 ? text : undefined;
  }
  if (type === "U") {
    const uri = latin1(payload.slice(1)).trim();
    return uri.length > 0 ? uri : undefined;
  }
  const raw = latin1(payload).trim();
  return raw.length > 0 ? raw : undefined;
}

function textsOf(tag: TagEvent): string[] {
  const records = tag.ndefMessage;
  if (!Array.isArray(records)) return [];
  const texts: string[] = [];
  for (const record of records) {
    const text = recordText(record);
    if (text !== undefined) texts.push(text);
  }
  return texts;
}

function firstAddress(blob: string): string | undefined {
  const hits = blob.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
  if (hits === null) return undefined;
  for (const hit of hits) {
    try {
      return address(hit);
    } catch {
      continue;
    }
  }
  return undefined;
}

export function addressInTag(summary: TagSummary): string | undefined {
  for (const text of summary.texts) {
    const found = firstAddress(text);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function summarizeTag(tag: TagEvent): TagSummary {
  const techs = tag.techTypes ?? [];
  const ndef = tag.ndefMessage;
  return {
    idHex: toHexId(tag.id),
    techs,
    texts: textsOf(tag),
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

export async function scanCardAddress(onListening?: () => void): Promise<CardScan> {
  let cap: NfcCapability;
  try {
    cap = await readNfcCapability();
  } catch {
    return { kind: "unsupported" };
  }
  if (cap.status === "unsupported") return { kind: "unsupported" };
  if (cap.status === "disabled") return { kind: "off" };
  if (cap.status !== "ready") return { kind: "failed", message: "NFC is not ready." };
  onListening?.();
  try {
    const summary = await scanAnyTag();
    const value = addressInTag(summary);
    if (value === undefined) return { kind: "empty" };
    return { kind: "address", value };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not read the card";
    if (/cancel|UserCancel|interrupted/i.test(message)) return { kind: "cancelled" };
    return { kind: "failed", message };
  }
}

export async function cancelScan(): Promise<void> {
  await NfcManager.cancelTechnologyRequest().catch(() => undefined);
}
