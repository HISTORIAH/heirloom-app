import { PIN_STATUS_LEN } from "./apdu";
import type { PinStatus } from "@/types/nfc";

export const PIN_MIN_LEN = 4;
export const PIN_MAX_LEN = 8;
export const PIN_TRY_LIMIT = 3;

/** ASCII digit bytes for SET_PIN / VERIFY. Callers must not log the result. */
export function digitsToPinBytes(digits: string): Uint8Array {
  if (digits.length < PIN_MIN_LEN || digits.length > PIN_MAX_LEN || !/^\d+$/.test(digits)) {
    throw new Error(`PIN must be ${PIN_MIN_LEN} to ${PIN_MAX_LEN} digits.`);
  }
  const out = new Uint8Array(digits.length);
  for (let i = 0; i < digits.length; i++) out[i] = digits.charCodeAt(i);
  return out;
}

export function parsePinStatus(body: Uint8Array): PinStatus {
  if (body.length < PIN_STATUS_LEN) return { kind: "none" };
  const hasPin = body[1] === 1;
  if (!hasPin) return { kind: "none" };
  const triesLeft = body[2] ?? 0;
  if (triesLeft === 0) return { kind: "blocked" };
  return { kind: "set", triesLeft };
}
