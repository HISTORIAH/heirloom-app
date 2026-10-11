import { useEffect, useRef, useState } from "react";

import { FAILURE_TOAST_MS } from "@/constants/ui";
import { describeFailure } from "@/lib/failure";
import type { ConfirmAsk, NoticeAsk } from "@/types/ui";

/** State for `<ConfirmSheet>`: confirmations, notices and failures. */
export function useConfirmSheet() {
  const pending = useRef<(() => void) | undefined>(undefined);
  const extraRun = useRef<(() => void) | undefined>(undefined);
  const [ask, setAsk] = useState<ConfirmAsk | undefined>(undefined);

  function close() {
    pending.current = undefined;
    extraRun.current = undefined;
    setAsk(undefined);
  }

  /** Ask before doing something; `run` fires on confirm. */
  function prompt(next: ConfirmAsk, run: () => void) {
    pending.current = run;
    extraRun.current = undefined;
    setAsk({ ...next, kind: "confirm" });
  }

  function notice(next: NoticeAsk, extra?: () => void) {
    pending.current = undefined;
    extraRun.current = extra;
    setAsk({
      cap: next.cap,
      title: next.title,
      body: next.body,
      confirmLabel: next.doneLabel ?? "OK",
      confirmTone: "yellow",
      extraLabel: next.extraLabel,
      kind: "notice",
    });
  }

  /** "Coming next" notice for a control whose integration hasn't landed. */
  function comingNext(title: string, body?: string) {
    notice({ cap: "Coming next", title, body });
  }

  /**
   * `action` ("Check-in", "Claim") failed. A cancel becomes a toast; anything else a sheet with
   * human copy and the raw error behind "Technical details". `retry` backs Try again / Retry.
   */
  function fail(action: string, cause: unknown, retry?: () => void) {
    const view = describeFailure(cause, action);
    pending.current = retry;
    extraRun.current = undefined;
    if (view.presentation === "toast") {
      setAsk({ cap: action, title: view.title, confirmLabel: retry !== undefined ? "Retry" : "", kind: "toast" });
      return;
    }
    setAsk({
      cap: action,
      title: view.title,
      body: view.body,
      details: view.details,
      failureKind: view.kind,
      confirmLabel: retry !== undefined ? "Try again" : "OK",
      cancelLabel: retry !== undefined ? "Not now" : undefined,
      confirmTone: "yellow",
      kind: "fail",
    });
  }

  // A cancel toast clears itself.
  useEffect(() => {
    if (ask?.kind !== "toast") return;
    const id = setTimeout(() => {
      pending.current = undefined;
      setAsk(undefined);
    }, FAILURE_TOAST_MS);
    return () => clearTimeout(id);
  }, [ask]);

  function confirm() {
    const run = pending.current;
    close();
    run?.();
  }

  function extra() {
    const run = extraRun.current;
    close();
    run?.();
  }

  /** Spread onto `<ConfirmSheet>`. */
  const sheet = { ask, onCancel: close, onConfirm: confirm, onExtra: extra };

  return { ask, prompt, notice, comingNext, fail, cancel: close, confirm, extra, sheet };
}
