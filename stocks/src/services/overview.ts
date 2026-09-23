import type {
  Address,
  GetMultipleAccountsApi,
  GetProgramAccountsApi,
  GetTokenAccountsByOwnerApi,
  Rpc,
} from "@solana/kit";
import type { CatalogEntry } from "@/services/catalog";
import { assessCoverage, assessVaultAsset, type CoverageHealth } from "@/services/coverage";
import {
  fetchIssuers,
  fetchTokenPositions,
  toStockHoldings,
  type StockHolding,
  type TokenPosition,
} from "@/services/holdings";
import { fetchMintDetails, type MintDetails } from "@/services/mints";
import {
  fetchCoveredRecords,
  fetchOwnerPlans,
  findPlansNaming,
  type CoveredRecord,
  type NamedPlan,
  type PlanView,
} from "@/services/plans";

type OverviewRpc = Rpc<GetTokenAccountsByOwnerApi & GetMultipleAccountsApi>;

/** One asset a plan covers, joined with the state that decides its health. */
export interface CoveredRow {
  mint: MintDetails;
  record: CoveredRecord;
  /** The account the record covers, or null once it has been closed. */
  position: TokenPosition | null;
  catalog: CatalogEntry | null;
  health: CoverageHealth;
}

export interface PlanOverview {
  plan: PlanView;
  rows: CoveredRow[];
  /**
   * Records the plan counts but that could not be matched to a mint — see
   * `fetchCoveredRecords` for why records are found by derivation.
   */
  missing: number;
}

export interface OwnerOverview {
  holdings: StockHolding[];
  backup: PlanOverview | null;
  vault: PlanOverview | null;
}

function rowsFor(
  mode: "backup" | "vault",
  plan: PlanView,
  records: Map<Address, CoveredRecord>,
  positions: TokenPosition[],
  mints: Map<Address, MintDetails>,
  catalog: Map<Address, CatalogEntry>,
): CoveredRow[] {
  const rows: CoveredRow[] = [];
  for (const record of records.values()) {
    const mint = mints.get(record.mint);
    if (!mint) continue;
    const position = positions.find((p) => p.tokenAccount === record.sourceTokenAccount) ?? null;
    const health =
      mode === "backup"
        ? assessCoverage({ plan: plan.address, record, position, mint })
        : assessVaultAsset({ record, position, mint });
    rows.push({ mint, record, position, catalog: catalog.get(record.mint) ?? null, health });
  }
  return rows;
}

/**
 * Finds a plan's records among `candidates`, and, if the plan still counts
 * more, among every catalogued mint as well. The second pass is what surfaces
 * a record whose account the owner closed after selling out: that mint is no
 * longer in the wallet, and without it the record cannot be retired and the
 * plan cannot close.
 */
async function findRecords(
  rpc: OverviewRpc,
  plan: PlanView,
  candidates: Address[],
  catalog: Map<Address, CatalogEntry>,
): Promise<Map<Address, CoveredRecord>> {
  const records = await fetchCoveredRecords(rpc, plan.address, candidates);
  if (records.size >= plan.coveredAssets || catalog.size === 0) return records;

  const checked = new Set(candidates);
  const rest = [...catalog.keys()].filter((mint) => !checked.has(mint));
  for (const [mint, record] of await fetchCoveredRecords(rpc, plan.address, rest)) {
    records.set(mint, record);
  }
  return records;
}

/** Everything the owner-side pages show: holdings, and both plans with their assets. */
export async function loadOwnerOverview(
  rpc: OverviewRpc,
  owner: Address,
  catalog: Map<Address, CatalogEntry>,
): Promise<OwnerOverview> {
  const [positions, plans] = await Promise.all([
    fetchTokenPositions(rpc, owner),
    fetchOwnerPlans(rpc, owner),
  ]);
  const vaultPositions = plans.vault ? await fetchTokenPositions(rpc, plans.vault.address) : [];

  const [backupRecords, vaultRecords] = await Promise.all([
    plans.backup
      ? findRecords(
          rpc,
          plans.backup,
          positions.map((p) => p.mint),
          catalog,
        )
      : Promise.resolve(new Map<Address, CoveredRecord>()),
    plans.vault
      ? findRecords(
          rpc,
          plans.vault,
          vaultPositions.map((p) => p.mint),
          catalog,
        )
      : Promise.resolve(new Map<Address, CoveredRecord>()),
  ]);

  const mints = await fetchMintDetails(rpc, [
    ...positions.map((p) => p.mint),
    ...vaultPositions.map((p) => p.mint),
    ...backupRecords.keys(),
    ...vaultRecords.keys(),
  ]);
  const issuers = await fetchIssuers(
    rpc,
    [...mints.values()].map((m) => m.mintAuthority).filter((a): a is Address => a !== null),
  );

  const overview = (
    mode: "backup" | "vault",
    plan: PlanView | null,
    records: Map<Address, CoveredRecord>,
    held: TokenPosition[],
  ): PlanOverview | null => {
    if (!plan) return null;
    const rows = rowsFor(mode, plan, records, held, mints, catalog);
    return { plan, rows, missing: Math.max(0, plan.coveredAssets - rows.length) };
  };

  return {
    holdings: toStockHoldings(positions, mints, issuers, catalog),
    backup: overview("backup", plans.backup, backupRecords, positions),
    vault: overview("vault", plans.vault, vaultRecords, vaultPositions),
  };
}

/** A plan that names the connected wallet, with its assets when the wallet is its destination. */
export interface NamedPlanOverview extends NamedPlan {
  rows: CoveredRow[];
}

/**
 * The recovery-side view: every plan naming `wallet`, and for those it is the
 * destination of, the assets it would receive. A backup plan's assets live in
 * the owner's wallet; a vault plan's in the plan's own accounts.
 */
export async function loadNamedPlans(
  rpc: OverviewRpc & Rpc<GetProgramAccountsApi>,
  wallet: Address,
  catalog: Map<Address, CatalogEntry>,
): Promise<NamedPlanOverview[]> {
  const named = await findPlansNaming(rpc, wallet);

  return Promise.all(
    named.map(async ({ plan, roles }) => {
      if (!roles.includes("destination")) return { plan, roles, rows: [] };

      const holder = plan.mode === "backup" ? plan.owner : plan.address;
      const positions = await fetchTokenPositions(rpc, holder);
      const records = await findRecords(
        rpc,
        plan,
        positions.map((p) => p.mint),
        catalog,
      );
      const mints = await fetchMintDetails(rpc, [...records.keys()]);
      return { plan, roles, rows: rowsFor(plan.mode, plan, records, positions, mints, catalog) };
    }),
  );
}
