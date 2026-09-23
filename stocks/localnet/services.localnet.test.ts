/**
 * The read side of the app against a real validator.
 *
 * The program's own tests run in litesvm, which does not serve
 * `getProgramAccounts` or parsed token-account queries — exactly the calls the
 * portfolio, the coverage monitor, and the recovery view depend on. So these
 * start a local validator, build state with the same instruction builders the
 * pages use, and read it back through the same services.
 *
 *   bun run test:localnet
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Address, KeyPairSigner } from "@solana/kit";
import {
  getApproveCheckedInstruction,
  getCloseAccountInstruction,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";

import {
  buildCoverAssetIx,
  buildInitializePlanIx,
  buildReapproveIxs,
  buildVaultAddAssetIx,
  getAtaAddress,
  type AssetRef,
} from "../src/lib/stocks";
import type { CatalogEntry } from "../src/services/catalog";
import { multiplierState } from "../src/services/dividends";
import { holdingLabel } from "../src/services/holdings";
import { loadNamedPlans, loadOwnerOverview } from "../src/services/overview";
import { riskFlags } from "../src/services/risk";
import {
  createEquities,
  createLocalClient,
  fundedSigner,
  generateIssuers,
  issuerGenesis,
  mintTo,
  startValidator,
  type LocalClient,
  type LocalEquity,
  type LocalIssuers,
  type Validator,
} from "./localnet";

let validator: Validator;
let client: LocalClient;
let issuers: LocalIssuers;
let xstock: LocalEquity;
let ondo: LocalEquity;

const NO_CATALOG = new Map<Address, CatalogEntry>();
const DAY = 86_400n;
const TIMING = {
  checkinIntervalSecs: 30n * DAY,
  gracePeriodSecs: 7n * DAY,
  pauseDurationSecs: 3n * DAY,
};

beforeAll(async () => {
  issuers = await generateIssuers();
  validator = await startValidator({ accounts: await issuerGenesis(issuers) });
  client = await createLocalClient(validator);
  ({ xstock, ondo } = await createEquities(client, issuers));
}, 120_000);

afterAll(async () => {
  await validator?.stop();
});

async function holder(): Promise<KeyPairSigner> {
  const owner = await fundedSigner(client);
  await mintTo(client, issuers.xstocks, xstock, owner.address, 25n * 10n ** 8n);
  await mintTo(client, issuers.ondo, ondo, owner.address, 40n * 10n ** 9n);
  return owner;
}

const asset = (equity: LocalEquity): AssetRef => ({
  mint: equity.mint,
  tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
});

const coverable = (equity: LocalEquity, authority: KeyPairSigner) => ({
  ...asset(equity),
  mintAuthority: authority.address,
});

describe("portfolio", () => {
  test("holdings are recognised through the on-chain registry and labelled from mint metadata", async () => {
    const owner = await holder();
    const { holdings, backup, vault } = await loadOwnerOverview(
      client.rpc,
      owner.address,
      NO_CATALOG,
    );

    expect(backup).toBeNull();
    expect(vault).toBeNull();

    const bySymbol = new Map(holdings.map((h) => [holdingLabel(h).symbol, h]));
    expect([...bySymbol.keys()].sort()).toEqual(["TSTon", "TSTx"]);

    const x = bySymbol.get("TSTx")!;
    expect(holdingLabel(x).name).toBe("Test Apple xStock");
    expect(x.issuer).toMatchObject({ label: "xstocks", riskTier: 3, enabled: true });
    expect(x.position.amount).toBe(25n * 10n ** 8n);
    expect(riskFlags(x.mint)).toEqual(["clawback", "pausable", "freezable", "hook-slot"]);

    const now = Math.floor(Date.now() / 1000);
    const dividend = multiplierState(x.mint, now)!;
    expect(dividend.current).toBe(1);
    expect(dividend.upcoming?.multiplier).toBe(1.0035);

    const o = bySymbol.get("TSTon")!;
    expect(riskFlags(o.mint)).not.toContain("clawback");
    expect(multiplierState(o.mint, now)).toEqual({ current: 1.004, upcoming: null });
  });
});

describe("coverage monitor", () => {
  test("follows a holding from covered, to evicted, to re-approved", async () => {
    const owner = await holder();
    const destination = await fundedSigner(client);

    await client.sendTransaction(
      await buildInitializePlanIx(owner, "backup", { destination: destination.address, ...TIMING }),
    );
    await client.sendTransaction(
      await buildCoverAssetIx(owner, coverable(xstock, issuers.xstocks), 10_000),
    );

    const covered = await loadOwnerOverview(client.rpc, owner.address, NO_CATALOG);
    expect(covered.backup?.rows.map((r) => r.health)).toEqual(["covered"]);
    expect(covered.backup?.missing).toBe(0);

    // A DEX approval silently replaces the plan as delegate.
    const ownerAta = await getAtaAddress(owner.address, xstock.mint, TOKEN_2022_PROGRAM_ADDRESS);
    const dex = await fundedSigner(client, 1n);
    await client.sendTransaction(
      getApproveCheckedInstruction(
        {
          source: ownerAta,
          mint: xstock.mint,
          delegate: dex.address,
          owner,
          amount: 1n,
          decimals: xstock.decimals,
        },
        { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
      ),
    );
    const evicted = await loadOwnerOverview(client.rpc, owner.address, NO_CATALOG);
    expect(evicted.backup?.rows.map((r) => r.health)).toEqual(["evicted"]);

    await client.sendTransaction(
      await buildReapproveIxs(owner, coverable(xstock, issuers.xstocks), {
        sourceTokenAccount: ownerAta,
        allocationBps: 10_000,
      }),
    );
    const repaired = await loadOwnerOverview(client.rpc, owner.address, NO_CATALOG);
    expect(repaired.backup?.rows.map((r) => r.health)).toEqual(["covered"]);
  });

  test("a record whose account was closed is still found, through the catalog", async () => {
    const owner = await holder();
    const destination = await fundedSigner(client);

    await client.sendTransaction(
      await buildInitializePlanIx(owner, "backup", { destination: destination.address, ...TIMING }),
    );
    await client.sendTransaction(
      await buildCoverAssetIx(owner, coverable(ondo, issuers.ondo), 10_000),
    );

    // Sell out and close the account: the mint leaves the wallet entirely.
    const buyer = await fundedSigner(client, 1n);
    const ownerAta = await getAtaAddress(owner.address, ondo.mint, TOKEN_2022_PROGRAM_ADDRESS);
    const buyerAta = await getAtaAddress(buyer.address, ondo.mint, TOKEN_2022_PROGRAM_ADDRESS);
    await client.sendTransaction([
      await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: buyer,
        owner: buyer.address,
        mint: ondo.mint,
        tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
      }),
      getTransferCheckedInstruction(
        {
          source: ownerAta,
          mint: ondo.mint,
          destination: buyerAta,
          authority: owner,
          amount: 40n * 10n ** 9n,
          decimals: ondo.decimals,
        },
        { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
      ),
      getCloseAccountInstruction(
        { account: ownerAta, destination: owner.address, owner },
        { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
      ),
    ]);

    const blind = await loadOwnerOverview(client.rpc, owner.address, NO_CATALOG);
    expect(blind.backup?.rows).toEqual([]);
    expect(blind.backup?.missing).toBe(1);

    const catalog = new Map<Address, CatalogEntry>([
      [
        ondo.mint,
        {
          mint: ondo.mint,
          symbol: "TSTon",
          name: "Test",
          issuer: "ondo",
          underlying: "TST",
          logo: null,
        },
      ],
    ]);
    const found = await loadOwnerOverview(client.rpc, owner.address, catalog);
    expect(found.backup?.rows.map((r) => [r.health, r.position])).toEqual([["closed", null]]);
    expect(found.backup?.missing).toBe(0);
  });
});

describe("plans that name a wallet", () => {
  test("are found for the destination, the guardian, and the hot check-in wallet", async () => {
    const owner = await holder();
    const [destination, guardian, hot] = await Promise.all([
      fundedSigner(client),
      fundedSigner(client, 1n),
      fundedSigner(client, 1n),
    ]);

    await client.sendTransaction(
      await buildInitializePlanIx(owner, "backup", {
        destination: destination.address,
        guardian: guardian.address,
        checkinSigner: hot.address,
        ...TIMING,
      }),
    );
    await client.sendTransaction(
      await buildCoverAssetIx(owner, coverable(xstock, issuers.xstocks), 5_000),
    );

    const forDestination = await loadNamedPlans(client.rpc, destination.address, NO_CATALOG);
    expect(forDestination.map((p) => [p.plan.owner, p.roles])).toEqual([
      [owner.address, ["destination"]],
    ]);
    expect(
      forDestination[0]!.rows.map((r) => [r.mint.symbol, r.record.allocationBps, r.health]),
    ).toEqual([["TSTx", 5_000, "covered"]]);

    const forGuardian = await loadNamedPlans(client.rpc, guardian.address, NO_CATALOG);
    expect(forGuardian.map((p) => p.roles)).toEqual([["guardian"]]);
    expect(forGuardian[0]!.rows).toEqual([]);

    const forHot = await loadNamedPlans(client.rpc, hot.address, NO_CATALOG);
    expect(forHot.map((p) => p.roles)).toEqual([["checkin"]]);
  });

  test("a guardian with no check-in wallet before it is found at its other offset", async () => {
    const owner = await holder();
    const [heir, guardian] = await Promise.all([fundedSigner(client), fundedSigner(client, 1n)]);

    await client.sendTransaction(
      await buildInitializePlanIx(owner, "vault", {
        destination: heir.address,
        guardian: guardian.address,
        ...TIMING,
      }),
    );

    const plans = await loadNamedPlans(client.rpc, guardian.address, NO_CATALOG);
    expect(plans.map((p) => [p.plan.mode, p.roles])).toEqual([["vault", ["guardian"]]]);
  });
});

describe("vault", () => {
  test("vaulted assets are read from the plan's own accounts, for owner and heir", async () => {
    const owner = await holder();
    const heir = await fundedSigner(client);

    await client.sendTransaction(
      await buildInitializePlanIx(owner, "vault", { destination: heir.address, ...TIMING }),
    );
    await client.sendTransaction(
      await buildVaultAddAssetIx(owner, coverable(ondo, issuers.ondo), 15n * 10n ** 9n),
    );

    const overview = await loadOwnerOverview(client.rpc, owner.address, NO_CATALOG);
    expect(overview.vault?.rows.map((r) => [r.mint.symbol, r.position?.amount, r.health])).toEqual([
      ["TSTon", 15n * 10n ** 9n, "covered"],
    ]);
    const ownerOndo = overview.holdings.find((h) => h.mint.mint === ondo.mint);
    expect(ownerOndo?.position.amount).toBe(25n * 10n ** 9n);

    const forHeir = await loadNamedPlans(client.rpc, heir.address, NO_CATALOG);
    expect(forHeir.map((p) => [p.plan.mode, p.rows.length])).toEqual([["vault", 1]]);
  });
});
