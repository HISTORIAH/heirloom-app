import NfcManager, { NfcTech } from "react-native-nfc-manager";

import type { IsoDepTransceive } from "@/types/nfc";

export const ISODEP_TIMEOUT_MS = 10_000;

let started = false;

export async function ensureNfcStarted(): Promise<void> {
  if (started) return;
  await NfcManager.start();
  started = true;
}

export async function cancelScan(): Promise<void> {
  await NfcManager.cancelTechnologyRequest().catch(() => undefined);
}

export async function withIsoDep<T>(run: (tx: IsoDepTransceive) => Promise<T>): Promise<T> {
  await ensureNfcStarted();
  try {
    await NfcManager.requestTechnology(NfcTech.IsoDep, {
      alertMessage: "Hold the credential to the phone",
    });
    await NfcManager.setTimeout(ISODEP_TIMEOUT_MS);
    const tx: IsoDepTransceive = async (apdu) => {
      const raw = await NfcManager.isoDepHandler.transceive([...apdu]);
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) out[i] = (raw[i] ?? 0) & 0xff;
      return out;
    };
    return await run(tx);
  } finally {
    await cancelScan();
  }
}
