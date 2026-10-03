export type EstateKind = "heirloom" | "ika";

export type EstateResponse = {
  id: string;
  address: string;
  kind: EstateKind;
  name: string | null;
  description: string | null;
  createdAt: string;
};

/** Request body for POST /v1/estates (register after on-chain creation). */
export type RegisterEstateRequest = {
  estateAddress: string;
  txSignature: string;
  description?: string;
};

/** Request body for PATCH /v1/estates/:estateAddress (rename / edit description). */
export type UpdateEstateRequest = {
  name?: string;
  description?: string;
};

/** Timing an owner can change on an existing estate. Omitted fields stay as they are. */
export type EstateTimingFields = {
  checkInIntervalSecs?: bigint;
  gracePeriodSecs?: bigint;
  delegatePauseDurationSecs?: bigint;
};

/** Where an estate is in its life, from the owner's side. */
export type EstateUiState = "active" | "grace" | "claimable" | "distributed";

/** Days and dates derived from an estate's timing, at this moment. */
export type EstateSpan = {
  state: EstateUiState;
  /** Fill for anything coloured by state. */
  slab: string;
  intervalDays: number;
  graceDays: number;
  elapsedDays: number;
  /** "Checked in Sep 2" */
  legendFrom: string;
  /** "Heir can claim Dec 1" / "Open since Dec 1" / "Estate claimed" */
  legendTo: string;
  daysUntilCheckIn: number;
  daysUntilClaim: number;
  /** Days the claim window has been open (claimable only). */
  daysOpen: number;
};

/** Where a guardian's one pause stands. */
export type GateKind = "holdable" | "unset" | "holding" | "spent" | "late" | "ended";

export type GuardianView = {
  slab: string;
  eyebrow: string;
  value: string;
  unit: string;
  advice?: string;
  hold: string;
  canHold: boolean;
  pauseDays: number;
  elapsedPause: number;
  legendFrom: string;
  legendTo: string;
};

export type RenameEstateInput = {
  estateAddress: string;
  name: string;
};

/** What the dashboard hero card needs: span fields plus the single countdown number. */
export type DashboardView = {
  state: EstateUiState;
  slab: string;
  /** The big number: days to check-in (active), days to claim (grace), days open (claimable). */
  days: number;
  intervalDays: number;
  graceDays: number;
  elapsedDays: number;
};
