import { useRef, useState } from "react";

import { txFailureMessage } from "@/lib/solana/txErrors";
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

  function fail(cap: string, cause: unknown) {
    pending.current = undefined;
    extraRun.current = undefined;
    setAsk({
      cap,
      title: txFailureMessage(cause, "Something went wrong"),
      confirmLabel: "OK",
      confirmTone: "yellow",
      kind: "fail",
    });
  }

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
