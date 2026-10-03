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

/** Outcome of tapping a credential to read its address. */
export type CardScan =
  | { kind: "address"; value: string }
  | { kind: "cancelled" }
  | { kind: "empty" }
  | { kind: "off" }
  | { kind: "unsupported" }
  | { kind: "failed"; message: string };
