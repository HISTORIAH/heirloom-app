import type { Address } from "@solana/kit";

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

/** One unit on the live hero countdown. Days → hours → minutes → seconds. */
export type CountdownUnit = "days" | "hours" | "minutes" | "seconds";

export type Countdown = {
  value: number;
  unit: CountdownUnit;
};

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
  /** Seconds until grace (active) or until claimable (grace). */
  remainingSecs: number;
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

/** What the dashboard hero card needs: span fields plus the single countdown. */
export type DashboardView = {
  state: EstateUiState;
  slab: string;
  /** One number: days, then hours, then seconds as the next edge gets close. */
  countdown: Countdown;
  intervalDays: number;
  graceDays: number;
  elapsedDays: number;
};

/** One asset sitting in an estate's vault: native SOL or a registered token. */
export type EstateHolding = {
  /** SOL_ASSET_ID for native SOL, else the mint. */
  id: string;
  /** Undefined for native SOL. */
  mint?: Address;
  symbol: string;
  name: string;
  image?: string;
  decimals: number;
  /** Raw units in the vault. */
  amount: bigint;
  /** USD value of `amount`; null when DAS has no price. */
  usd: number | null;
  /** False when DAS had neither a name nor a symbol for the mint. */
  named: boolean;
};

/** One row in the top-up picker: something the wallet holds, and what the estate already has of it. */
export type TopUpAsset = {
  /** SOL_ASSET_ID for native SOL, else the mint. */
  id: string;
  /** Undefined for native SOL. */
  mint?: Address;
  symbol: string;
  name: string;
  image?: string;
  decimals: number;
  /** Raw units in the wallet. */
  held: bigint;
  /** Raw units already in the estate. */
  inEstate: bigint;
  /** On the estate already. A new token is registered (opened) instead of transferred. */
  registered: boolean;
  /** USD value of `held`; null when DAS has no price. */
  usd: number | null;
  named: boolean;
};

/** What the owner chose on the top-up sheet. `amount` is in raw units. */
export type TopUpPick = { asset: TopUpAsset; amount: bigint };
