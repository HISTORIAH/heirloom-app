import type { NdefRecord, TagEvent } from "react-native-nfc-manager";

import { firstAddressIn } from "@/lib/solana/address";
import type { TagSummary } from "@/types/nfc";

/** Pure NDEF parsing: no NFC hardware calls in here. */

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

export function addressInTag(summary: TagSummary): string | undefined {
  for (const text of summary.texts) {
    const found = firstAddressIn(text);
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
