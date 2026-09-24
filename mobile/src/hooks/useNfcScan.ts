import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import {
  cancelScan,
  openNfcSettings,
  readNfcCapability,
  scanAnyTag,
  type NfcCapability,
  type TagSummary,
} from "@/lib/nfc";

type ScanPhase = "idle" | "listening" | "done" | "error";

export function useNfcScan() {
  const [capability, setCapability] = useState<NfcCapability>({ status: "checking" });
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [tag, setTag] = useState<TagSummary | undefined>();
  const [error, setError] = useState<string | undefined>();

  const refreshCapability = useCallback(async () => {
    try {
      setCapability(await readNfcCapability());
    } catch {
      setCapability({ status: "unsupported" });
    }
  }, []);

  useEffect(() => {
    void refreshCapability();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void refreshCapability();
    });
    return () => {
      sub.remove();
      void cancelScan();
    };
  }, [refreshCapability]);

  const startScan = useCallback(async () => {
    setError(undefined);
    setTag(undefined);
    const cap = await readNfcCapability();
    setCapability(cap);
    if (cap.status !== "ready") return;

    setPhase("listening");
    try {
      const summary = await scanAnyTag();
      setTag(summary);
      setPhase("done");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not read the card";
      // User backed out of the system sheet — not an error to shout about.
      if (/cancel|UserCancel|interrupted/i.test(message)) {
        setPhase("idle");
        return;
      }
      setError(message);
      setPhase("error");
    }
  }, []);

  const stopScan = useCallback(async () => {
    await cancelScan();
    setPhase("idle");
  }, []);

  const reset = useCallback(() => {
    void cancelScan();
    setPhase("idle");
    setTag(undefined);
    setError(undefined);
  }, []);

  return {
    capability,
    phase,
    tag,
    error,
    refreshCapability,
    startScan,
    stopScan,
    reset,
    openSettings: openNfcSettings,
  };
}
