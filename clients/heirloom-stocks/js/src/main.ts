export * from "./generated";

export * from "./constants";

/**
 * Backup and vault plans share a seed prefix and differ only by a trailing mode
 * byte, so Codama hoists them as two unrelated PDAs and names the second one
 * after the instruction it first saw. These aliases restore symmetry.
 */
export {
  findPlanPda as findBackupPlanPda,
  findInitializeVaultPlanPlanPda as findVaultPlanPda,
  type PlanSeeds as BackupPlanSeeds,
  type InitializeVaultPlanPlanSeeds as VaultPlanSeeds,
} from "./generated/pdas";
