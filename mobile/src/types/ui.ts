/** What the confirm/notice sheet shows. */
export type ConfirmAsk = {
  cap: string;
  title: string;
  body?: string;
  cancelLabel?: string;
  confirmLabel: string;
  confirmTone?: "yellow" | "ink" | "paper";
  extraLabel?: string;
  kind?: "confirm" | "notice" | "fail";
};

export type NoticeAsk = {
  cap: string;
  title: string;
  body?: string;
  doneLabel?: string;
  extraLabel?: string;
};
