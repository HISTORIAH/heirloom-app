import {
  getCheckInInstruction,
  getClosePlanInstruction,
  getCoverAssetInstruction,
  getGuardianDeferInstruction,
  getInitializeBackupPlanInstruction,
  getInitializeVaultPlanInstruction,
  getRecoverInstruction,
  getUncoverAssetInstruction,
  getUpdatePlanInstruction,
  getVaultAddAssetInstruction,
  getVaultClaimInstruction,
  getVaultDepositInstruction,
  getVaultWithdrawInstruction,
  TREASURY_ADDRESS,
} from "@historiah/heirloom-stocks";
import type { Address, Instruction, TransactionSigner } from "@solana/kit";
import type { StockAsset } from "./mints";
import {
  getAtaAddress,
  getCoveredAssetAddress,
  getIssuerAddress,
  getPlanAddress,
  type PlanMode,
} from "./pdas";

// ---------------------------------------------------------------------------
// Pure instruction builders. The only work beyond encoding is PDA derivation,
// and every account is passed explicitly: the generated builders fall back to
// the original token program when `tokenProgram` is omitted, which is wrong
// for every Token-2022 equity.
// ---------------------------------------------------------------------------

/** The part of a `StockAsset` that account derivation depends on. */
export type AssetRef = Pick<StockAsset, "mint" | "tokenProgram">;

/** An asset about to be covered, which must be matched to a curated issuer. */
export type CoverableAsset = AssetRef & { mintAuthority: Address };

/** Which plan an instruction acts on, for signers that are not its owner. */
export type PlanRef = { owner: Address; mode: PlanMode };

export type PlanTiming = {
  checkinIntervalSecs: bigint;
  gracePeriodSecs: bigint;
  pauseDurationSecs: bigint;
};

// ------------------------------------------------------------ plan lifecycle

export async function buildInitializePlanIx(
  owner: TransactionSigner,
  mode: PlanMode,
  input: PlanTiming & { destination: Address; checkinSigner?: Address; guardian?: Address },
): Promise<Instruction> {
  const plan = await getPlanAddress(owner.address, mode);
  const args = { owner, plan, ...input };
  return mode === "backup"
    ? getInitializeBackupPlanInstruction(args)
    : getInitializeVaultPlanInstruction(args);
}

/** Proof of life. `signer` is the owner or the plan's hot check-in wallet. */
export async function buildCheckInIx(
  signer: TransactionSigner,
  plan: PlanRef,
): Promise<Instruction> {
  return getCheckInInstruction({
    signer,
    plan: await getPlanAddress(plan.owner, plan.mode),
  });
}

export type PlanChanges = Partial<PlanTiming> & {
  destination?: Address;
  checkinSigner?: Address;
  guardian?: Address;
  clearCheckinSigner?: boolean;
  clearGuardian?: boolean;
};

/** Owner-only settings changes. Deliberately not a check-in. */
export async function buildUpdatePlanIx(
  owner: TransactionSigner,
  mode: PlanMode,
  changes: PlanChanges,
): Promise<Instruction> {
  return getUpdatePlanInstruction({
    owner,
    plan: await getPlanAddress(owner.address, mode),
    newDestination: changes.destination,
    newCheckinSigner: changes.checkinSigner,
    newGuardian: changes.guardian,
    checkinIntervalSecs: changes.checkinIntervalSecs ?? null,
    gracePeriodSecs: changes.gracePeriodSecs ?? null,
    pauseDurationSecs: changes.pauseDurationSecs ?? null,
    clearCheckinSigner: changes.clearCheckinSigner ?? false,
    clearGuardian: changes.clearGuardian ?? false,
  });
}

export async function buildGuardianDeferIx(
  guardian: TransactionSigner,
  plan: PlanRef,
): Promise<Instruction> {
  return getGuardianDeferInstruction({
    guardian,
    plan: await getPlanAddress(plan.owner, plan.mode),
  });
}

/** Only succeeds once every asset has been uncovered or withdrawn. */
export async function buildClosePlanIx(
  owner: TransactionSigner,
  mode: PlanMode,
): Promise<Instruction> {
  return getClosePlanInstruction({
    owner,
    plan: await getPlanAddress(owner.address, mode),
  });
}

// ------------------------------------------------------------- backup mode

/**
 * Grants the owner's backup plan a delegate allowance over one holding. Nothing
 * moves. `ownerTokenAccount` defaults to the owner's associated account.
 */
export async function buildCoverAssetIx(
  owner: TransactionSigner,
  asset: CoverableAsset,
  allocationBps: number,
  ownerTokenAccount?: Address,
): Promise<Instruction> {
  const plan = await getPlanAddress(owner.address, "backup");
  const [coveredAsset, issuer, ownerAta] = await Promise.all([
    getCoveredAssetAddress(plan, asset.mint),
    getIssuerAddress(asset.mintAuthority),
    ownerTokenAccount ?? getAtaAddress(owner.address, asset.mint, asset.tokenProgram),
  ]);

  return getCoverAssetInstruction({
    owner,
    mint: asset.mint,
    ownerTokenAccount: ownerAta,
    plan,
    issuer,
    coveredAsset,
    tokenProgram: asset.tokenProgram,
    allocationBps,
  });
}

/**
 * Withdraws coverage from one holding. `sourceTokenAccount` is the account the
 * `CoveredAsset` record names, which is what the program checks against, or
 * `null` once the owner has closed it.
 */
export async function buildUncoverAssetIx(
  owner: TransactionSigner,
  asset: AssetRef,
  sourceTokenAccount: Address | null,
): Promise<Instruction> {
  const plan = await getPlanAddress(owner.address, "backup");

  return getUncoverAssetInstruction({
    owner,
    ownerTokenAccount: sourceTokenAccount ?? undefined,
    plan,
    coveredAsset: await getCoveredAssetAddress(plan, asset.mint),
    tokenProgram: asset.tokenProgram,
  });
}

/**
 * Restores coverage after another approval evicted the plan as delegate.
 *
 * SPL Token keeps one delegate per account, so the fix is a fresh approval.
 * Uncovering first retires the old record — without revoking, since the plan
 * is no longer the delegate — and covering again re-approves the plan and
 * writes a new one, in a single transaction. The previous allocation carries
 * over unless a new one is given.
 */
export async function buildReapproveIxs(
  owner: TransactionSigner,
  asset: CoverableAsset,
  input: { sourceTokenAccount: Address; allocationBps: number },
): Promise<Instruction[]> {
  return Promise.all([
    buildUncoverAssetIx(owner, asset, input.sourceTokenAccount),
    buildCoverAssetIx(owner, asset, input.allocationBps, input.sourceTokenAccount),
  ]);
}

/**
 * Moves one covered holding to the plan's destination, signed by that
 * destination. The owner's key is not involved.
 */
export async function buildRecoverIx(
  destination: TransactionSigner,
  input: { owner: Address; asset: AssetRef; sourceTokenAccount: Address },
): Promise<Instruction> {
  const { owner, asset, sourceTokenAccount } = input;
  const plan = await getPlanAddress(owner, "backup");
  const [coveredAsset, destinationTokenAccount, treasuryTokenAccount] = await Promise.all([
    getCoveredAssetAddress(plan, asset.mint),
    getAtaAddress(destination.address, asset.mint, asset.tokenProgram),
    getAtaAddress(TREASURY_ADDRESS, asset.mint, asset.tokenProgram),
  ]);

  return getRecoverInstruction({
    destination,
    mint: asset.mint,
    ownerTokenAccount: sourceTokenAccount,
    destinationTokenAccount,
    treasury: TREASURY_ADDRESS,
    treasuryTokenAccount,
    plan,
    coveredAsset,
    tokenProgram: asset.tokenProgram,
  });
}

// -------------------------------------------------------------- vault mode

/** The vault account for one asset: the plan's own associated account. */
async function getVaultTokenAccount(owner: Address, asset: AssetRef) {
  const plan = await getPlanAddress(owner, "vault");
  const [coveredAsset, vaultTokenAccount] = await Promise.all([
    getCoveredAssetAddress(plan, asset.mint),
    getAtaAddress(plan, asset.mint, asset.tokenProgram),
  ]);
  return { plan, coveredAsset, vaultTokenAccount };
}

/** Registers an asset under the vault plan and makes its first deposit. */
export async function buildVaultAddAssetIx(
  owner: TransactionSigner,
  asset: CoverableAsset,
  amount: bigint,
  ownerTokenAccount?: Address,
): Promise<Instruction> {
  const [{ plan, coveredAsset, vaultTokenAccount }, issuer, ownerAta] = await Promise.all([
    getVaultTokenAccount(owner.address, asset),
    getIssuerAddress(asset.mintAuthority),
    ownerTokenAccount ?? getAtaAddress(owner.address, asset.mint, asset.tokenProgram),
  ]);

  return getVaultAddAssetInstruction({
    owner,
    mint: asset.mint,
    ownerTokenAccount: ownerAta,
    vaultTokenAccount,
    plan,
    issuer,
    coveredAsset,
    tokenProgram: asset.tokenProgram,
    amount,
  });
}

export async function buildVaultDepositIx(
  owner: TransactionSigner,
  asset: AssetRef,
  amount: bigint,
  ownerTokenAccount?: Address,
): Promise<Instruction> {
  const [{ plan, coveredAsset, vaultTokenAccount }, ownerAta] = await Promise.all([
    getVaultTokenAccount(owner.address, asset),
    ownerTokenAccount ?? getAtaAddress(owner.address, asset.mint, asset.tokenProgram),
  ]);

  return getVaultDepositInstruction({
    owner,
    mint: asset.mint,
    ownerTokenAccount: ownerAta,
    vaultTokenAccount,
    plan,
    coveredAsset,
    tokenProgram: asset.tokenProgram,
    amount,
  });
}

/**
 * The owner's way back out, at any time. `amount` is gross; the exit fee comes
 * out of it. Always pays into the owner's associated account, which the program
 * creates if it has been closed.
 */
export async function buildVaultWithdrawIx(
  owner: TransactionSigner,
  asset: AssetRef,
  amount: bigint,
): Promise<Instruction> {
  const [{ plan, coveredAsset, vaultTokenAccount }, ownerTokenAccount, treasuryTokenAccount] =
    await Promise.all([
      getVaultTokenAccount(owner.address, asset),
      getAtaAddress(owner.address, asset.mint, asset.tokenProgram),
      getAtaAddress(TREASURY_ADDRESS, asset.mint, asset.tokenProgram),
    ]);

  return getVaultWithdrawInstruction({
    owner,
    mint: asset.mint,
    ownerTokenAccount,
    vaultTokenAccount,
    treasury: TREASURY_ADDRESS,
    treasuryTokenAccount,
    plan,
    coveredAsset,
    tokenProgram: asset.tokenProgram,
    amount,
  });
}

/** The heir's claim on one vaulted asset once the plan has lapsed. */
export async function buildVaultClaimIx(
  destination: TransactionSigner,
  input: { owner: Address; asset: AssetRef },
): Promise<Instruction> {
  const { owner, asset } = input;
  const [{ plan, coveredAsset, vaultTokenAccount }, destinationTokenAccount, treasuryTokenAccount] =
    await Promise.all([
      getVaultTokenAccount(owner, asset),
      getAtaAddress(destination.address, asset.mint, asset.tokenProgram),
      getAtaAddress(TREASURY_ADDRESS, asset.mint, asset.tokenProgram),
    ]);

  return getVaultClaimInstruction({
    destination,
    mint: asset.mint,
    vaultTokenAccount,
    destinationTokenAccount,
    treasury: TREASURY_ADDRESS,
    treasuryTokenAccount,
    plan,
    coveredAsset,
    tokenProgram: asset.tokenProgram,
  });
}
