/** What the confirm/notice sheet shows. */
export type ConfirmAsk = {
  cap: string;
  title: string;
  body?: string;
  cancelLabel?: string;
  confirmLabel: string;
  confirmTone?: "yellow" | "ink" | "paper";
  extraLabel?: string;
  /** `toast`: a cancel, shown above the nav with an optional Retry instead of a sheet. */
  kind?: "confirm" | "notice" | "fail" | "toast";
  /** For `fail`: picks the badge icon. */
  failureKind?: FailureKind;
  /** For `fail`: the raw error, behind "Technical details". */
  details?: string | null;
};

export type NoticeAsk = {
  cap: string;
  title: string;
  body?: string;
  doneLabel?: string;
  extraLabel?: string;
};

/** What went wrong, in the terms the user is shown. */
export type FailureKind =
  | "cancelled"
  | "walletUnreachable"
  | "noWallet"
  | "network"
  | "insufficientSol"
  | "expired"
  | "program"
  | "card"
  | "known"
  | "unknown";

/** A failure ready to show: a toast for a cancel, a sheet for the rest. */
export type FailureView = {
  kind: FailureKind;
  presentation: "toast" | "sheet";
  title: string;
  body: string;
  /** The raw error, only ever shown under "Technical details". */
  details: string | null;
};
