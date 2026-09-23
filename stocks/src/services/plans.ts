import {
  getBase58Decoder,
  parseBase64RpcAccount,
  unwrapOption,
  type Address,
  type Base58EncodedBytes,
  type GetMultipleAccountsApi,
  type GetProgramAccountsApi,
  type GetProgramAccountsMemcmpFilter,
  type Rpc,
} from "@solana/kit";
import {
  decodeStockPlan,
  fetchAllMaybeCoveredAsset,
  fetchAllMaybeStockPlan,
  HEIRLOOM_STOCKS_PROGRAM_ADDRESS,
  PLAN_MODE_BACKUP,
  STOCK_PLAN_DISCRIMINATOR,
  type StockPlan,
} from "@historiah/heirloom-stocks";
import { getCoveredAssetAddress, getPlanAddress, type PlanMode } from "@/lib/stocks";
import { chunk } from "@/services/mints";

/** A plan with its timestamps as plain seconds, which is what the UI works in. */
export interface PlanView {
  address: Address;
  mode: PlanMode;
  owner: Address;
  destination: Address;
  checkinSigner: Address | null;
  guardian: Address | null;
  checkinIntervalSecs: number;
  gracePeriodSecs: number;
  pauseDurationSecs: number;
  lastCheckinTs: number;
  pausedUntil: number;
  createdAt: number;
  coveredAssets: number;
}

export function planView(address: Address, plan: StockPlan): PlanView {
  return {
    address,
    mode: plan.mode === PLAN_MODE_BACKUP ? "backup" : "vault",
    owner: plan.owner,
    destination: plan.destination,
    checkinSigner: unwrapOption(plan.checkinSigner),
    guardian: unwrapOption(plan.guardian),
    checkinIntervalSecs: Number(plan.checkinIntervalSecs),
    gracePeriodSecs: Number(plan.gracePeriodSecs),
    pauseDurationSecs: Number(plan.pauseDurationSecs),
    lastCheckinTs: Number(plan.lastCheckinTs),
    pausedUntil: Number(plan.pausedUntil),
    createdAt: Number(plan.createdAt),
    coveredAssets: plan.coveredAssets,
  };
}

// ------------------------------------------------------------------ timeline

/**
 * `active` until the check-in interval runs out, `grace` until the grace period
 * also has, and `recoverable` from then on — the moment the destination can
 * sign. Mirrors `StockPlan::recoverable_at` on-chain.
 */
export type PlanPhase = "active" | "grace" | "recoverable";

export interface PlanTimeline {
  phase: PlanPhase;
  /** When the check-in interval runs out. */
  graceStartsAt: number;
  /** When the destination may move the assets. A guardian defer can push this out. */
  recoverableAt: number;
  deferred: boolean;
}

export function planTimeline(plan: PlanView, now: number): PlanTimeline {
  const graceStartsAt = plan.lastCheckinTs + plan.checkinIntervalSecs;
  const recoverableAt = Math.max(graceStartsAt + plan.gracePeriodSecs, plan.pausedUntil);
  const phase: PlanPhase =
    now >= recoverableAt ? "recoverable" : now >= graceStartsAt ? "grace" : "active";
  return { phase, graceStartsAt, recoverableAt, deferred: plan.pausedUntil > 0 };
}

/** A guardian may defer once, and only before the plan becomes recoverable. */
export function canDefer(plan: PlanView, now: number): boolean {
  return plan.pausedUntil === 0 && now < planTimeline(plan, now).recoverableAt;
}

// ------------------------------------------------------------------ fetching

export interface OwnerPlans {
  backup: PlanView | null;
  vault: PlanView | null;
}

export async function fetchOwnerPlans(
  rpc: Rpc<GetMultipleAccountsApi>,
  owner: Address,
): Promise<OwnerPlans> {
  const addresses = await Promise.all([
    getPlanAddress(owner, "backup"),
    getPlanAddress(owner, "vault"),
  ]);
  const [backup, vault] = await fetchAllMaybeStockPlan(rpc, addresses, { commitment: "confirmed" });
  return {
    backup: backup?.exists ? planView(backup.address, backup.data) : null,
    vault: vault?.exists ? planView(vault.address, vault.data) : null,
  };
}

export interface CoveredRecord {
  address: Address;
  mint: Address;
  sourceTokenAccount: Address;
  allocationBps: number;
  hadPermanentDelegate: boolean;
  coveredAt: number;
}

/**
 * The `CoveredAsset` records `plan` holds for the given mints, keyed by mint.
 *
 * A record does not store its plan — the plan is only part of its seeds — so a
 * plan's records cannot be listed by filter. They are found by deriving the
 * record address for each candidate mint instead: the owner's holdings in
 * backup mode, the vault's own token accounts in vault mode.
 */
export async function fetchCoveredRecords(
  rpc: Rpc<GetMultipleAccountsApi>,
  plan: Address,
  mints: Address[],
): Promise<Map<Address, CoveredRecord>> {
  const records = new Map<Address, CoveredRecord>();

  for (const batch of chunk([...new Set(mints)])) {
    const addresses = await Promise.all(batch.map((mint) => getCoveredAssetAddress(plan, mint)));
    const accounts = await fetchAllMaybeCoveredAsset(rpc, addresses, { commitment: "confirmed" });
    for (const account of accounts) {
      if (!account.exists) continue;
      const { mint, sourceTokenAccount, allocationBps, hadPermanentDelegate, coveredAt } =
        account.data;
      records.set(mint, {
        address: account.address,
        mint,
        sourceTokenAccount,
        allocationBps,
        hadPermanentDelegate,
        coveredAt: Number(coveredAt),
      });
    }
  }

  return records;
}

// ---------------------------------------------------- plans that name a wallet

/**
 * Byte offsets inside a `StockPlan`. Its two optional keys are Borsh options —
 * one tag byte, then 32 bytes only when set — so where the guardian sits
 * depends on whether a check-in signer precedes it. The tag bytes are part of
 * every filter below, which also keeps leftovers from a field that was later
 * cleared from matching.
 */
export const STOCK_PLAN_OFFSETS = {
  destination: 41,
  checkinSignerTag: 122,
  checkinSigner: 123,
  /** With no check-in signer. */
  guardianTagAfterNone: 123,
  guardianAfterNone: 124,
  /** With a check-in signer. */
  guardianTagAfterSome: 155,
  guardianAfterSome: 156,
} as const;

export type PlanRole = "destination" | "guardian" | "checkin";

export interface NamedPlan {
  plan: PlanView;
  roles: PlanRole[];
}

const base58 = getBase58Decoder();
const TAG_NONE = "1" as Base58EncodedBytes; // base58 of [0]
const TAG_SOME = "2" as Base58EncodedBytes; // base58 of [1]

function memcmp(offset: number, bytes: string): GetProgramAccountsMemcmpFilter {
  return {
    memcmp: { offset: BigInt(offset), bytes: bytes as Base58EncodedBytes, encoding: "base58" },
  };
}

/** The filter sets that find plans naming `wallet`, one per role and layout. */
export function namingFilters(wallet: Address): GetProgramAccountsMemcmpFilter[][] {
  const o = STOCK_PLAN_OFFSETS;
  const discriminator = memcmp(0, base58.decode(STOCK_PLAN_DISCRIMINATOR));
  return [
    [discriminator, memcmp(o.destination, wallet)],
    [discriminator, memcmp(o.checkinSignerTag, TAG_SOME), memcmp(o.checkinSigner, wallet)],
    [
      discriminator,
      memcmp(o.checkinSignerTag, TAG_NONE),
      memcmp(o.guardianTagAfterNone, TAG_SOME),
      memcmp(o.guardianAfterNone, wallet),
    ],
    [
      discriminator,
      memcmp(o.checkinSignerTag, TAG_SOME),
      memcmp(o.guardianTagAfterSome, TAG_SOME),
      memcmp(o.guardianAfterSome, wallet),
    ],
  ];
}

/** Which roles a decoded plan actually gives `wallet`. */
export function rolesFor(plan: PlanView, wallet: Address): PlanRole[] {
  const roles: PlanRole[] = [];
  if (plan.destination === wallet) roles.push("destination");
  if (plan.guardian === wallet) roles.push("guardian");
  if (plan.checkinSigner === wallet) roles.push("checkin");
  return roles;
}

/**
 * Every plan in which `wallet` is the destination, the guardian, or the hot
 * check-in wallet. Results are decoded and the roles re-derived from the data,
 * so the filters only ever narrow the search; they never decide a role.
 */
export async function findPlansNaming(
  rpc: Rpc<GetProgramAccountsApi>,
  wallet: Address,
): Promise<NamedPlan[]> {
  const results = await Promise.all(
    namingFilters(wallet).map((filters) =>
      rpc
        .getProgramAccounts(HEIRLOOM_STOCKS_PROGRAM_ADDRESS, {
          encoding: "base64",
          commitment: "confirmed",
          filters,
        })
        .send(),
    ),
  );

  const plans = new Map<Address, NamedPlan>();
  for (const { pubkey, account } of results.flat()) {
    if (plans.has(pubkey)) continue;
    try {
      const plan = planView(pubkey, decodeStockPlan(parseBase64RpcAccount(pubkey, account)).data);
      const roles = rolesFor(plan, wallet);
      if (roles.length > 0) plans.set(pubkey, { plan, roles });
    } catch {
      // Not a decodable plan; ignore.
    }
  }

  return [...plans.values()];
}
