import { describe, expect, test } from "bun:test";
import {
  address,
  getBase58Encoder,
  none,
  some,
  SolanaError,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  type Address,
  type GetProgramAccountsMemcmpFilter,
} from "@solana/kit";
import {
  getStockPlanEncoder,
  HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED,
  HEIRLOOM_STOCKS_ERROR__DELEGATE_EVICTED,
} from "@historiah/heirloom-stocks";

import { companyName, filterGroups, groupByCompany, jupiterSwapUrl } from "./browse";
import {
  isHttpsUrl,
  isValidMint,
  mergeCatalog,
  parseCatalog,
  parseOndoConstants,
  parseXStocksPage,
  withTokenLabels,
  type CatalogEntry,
} from "./catalog";
import { assessCoverage, assessVaultAsset, canReapprove } from "./coverage";
import { multiplierState, uiAmount } from "./dividends";
import { coverBlockers, holdingLabel, type StockHolding, type TokenPosition } from "./holdings";
import type { MintDetails } from "./mints";
import {
  canDefer,
  namingFilters,
  planTimeline,
  rolesFor,
  type CoveredRecord,
  type PlanView,
} from "./plans";
import { ISSUER_POWERS, riskFlags } from "./risk";
import { programErrorCode, programErrorKey } from "./tx";

const MINT = address("XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp");
const PLAN = address("8ZwqSnyXupsKsFqseEP62P9pw6hmvaBRu52PeYGo21mm");
const OWNER = address("7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj");
const DEST = address("9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD");
const HOT = address("DQSTm2WtpKBdpKx9t2cYL9Ja8fe7v4yEVEtA7NnSsdqb");
const GUARD = address("5aMNNLQJwAEeoemTEMkv5NVjqKwvvefRYCQ5Z67HFvEq");
const DEX = address("JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs");

function mint(overrides: Partial<MintDetails> = {}): MintDetails {
  return {
    mint: MINT,
    tokenProgram: address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
    decimals: 8,
    mintAuthority: OWNER,
    freezeAuthority: null,
    name: "Apple xStock",
    symbol: "AAPLx",
    permanentDelegate: null,
    pausable: null,
    transferHook: null,
    scaledUiAmount: null,
    frozenByDefault: false,
    nonTransferable: false,
    ...overrides,
  };
}

function position(overrides: Partial<TokenPosition> = {}): TokenPosition {
  return {
    tokenAccount: address("S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS"),
    mint: MINT,
    tokenProgram: address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
    amount: 1_000n,
    delegate: PLAN,
    delegatedAmount: 2n ** 64n - 1n,
    frozen: false,
    cpiGuard: false,
    ...overrides,
  };
}

const record: CoveredRecord = {
  address: address("11111111111111111111111111111112"),
  mint: MINT,
  sourceTokenAccount: position().tokenAccount,
  allocationBps: 10_000,
  hadPermanentDelegate: false,
  coveredAt: 0,
};

function plan(overrides: Partial<PlanView> = {}): PlanView {
  return {
    address: PLAN,
    mode: "backup",
    owner: OWNER,
    destination: DEST,
    checkinSigner: null,
    guardian: null,
    checkinIntervalSecs: 100,
    gracePeriodSecs: 50,
    pauseDurationSecs: 30,
    lastCheckinTs: 1_000,
    pausedUntil: 0,
    createdAt: 1_000,
    coveredAssets: 1,
    ...overrides,
  };
}

// ------------------------------------------------------------------- catalog

describe("catalog", () => {
  test("keeps only the Solana deployment of an xStocks asset", () => {
    const entries = parseXStocksPage({
      nodes: [
        {
          symbol: "AAPLx",
          name: "Apple xStock",
          underlyingSymbol: "AAPL",
          logo: "https://example.com/AAPLx.png",
          deployments: [
            { network: "Ethereum", address: "0x1234" },
            { network: "Solana", address: MINT },
          ],
        },
        { symbol: "NOSOL", deployments: [{ network: "Ton", address: "EQ..." }] },
      ],
    });
    expect(entries).toEqual([
      {
        mint: MINT,
        symbol: "AAPLx",
        name: "Apple xStock",
        issuer: "xstocks",
        underlying: "AAPL",
        logo: "https://example.com/AAPLx.png",
      },
    ]);
  });

  test("drops Ondo's malformed ONDSon mint, which decodes to 31 bytes", () => {
    const source = `
      ("AAPLon", "123mowTSJVM7BuTzXVUmv8dPZn5uYHd5ooT2zYjpondo"),
      ("ONDSon", "7qy1j4Mechfyr6AST3djH4vk4kiEYC2cjEytXdondo"),
    `;
    expect(getBase58Encoder().encode("7qy1j4Mechfyr6AST3djH4vk4kiEYC2cjEytXdondo").length).toBe(31);
    const entries = parseOndoConstants(source);
    expect(entries.map((e) => e.symbol)).toEqual(["AAPLon"]);
    expect(entries[0]).toMatchObject({ issuer: "ondo", underlying: "AAPL" });
  });

  test("deduplicates by mint and re-validates what it loads", () => {
    const entry: CatalogEntry = {
      mint: MINT,
      symbol: "AAPLx",
      name: "Apple",
      issuer: "xstocks",
      underlying: "AAPL",
      logo: null,
    };
    expect(mergeCatalog([entry], [{ ...entry, name: "dup" }])).toEqual([entry]);
    expect(isValidMint("not-a-key")).toBe(false);
    expect(
      parseCatalog({
        generatedAt: "x",
        entries: [entry, { ...entry, mint: "7qy1j4Mechfyr6AST3djH4vk4kiEYC2cjEytXdondo" }, null],
      }).entries,
    ).toEqual([entry]);
    expect(parseCatalog("garbage").entries).toEqual([]);
  });

  test("fills names and logos from mint metadata, keeping the snapshot's where a read failed", () => {
    const ondo = (mint: Address, symbol: string): CatalogEntry => ({
      mint,
      symbol,
      name: symbol,
      issuer: "ondo",
      underlying: symbol.slice(0, -2),
      logo: null,
    });
    const read = ondo(MINT, "AAPLon");
    const unread = ondo(PLAN, "TSLAon");
    const labelled = withTokenLabels(
      [read, unread],
      new Map([[MINT, { name: "Apple (Ondo Tokenized)", logo: "https://cdn.example/aapl.png" }]]),
      new Map([
        [PLAN, { ...unread, name: "Tesla (Ondo Tokenized)", logo: "https://cdn.example/tsla.png" }],
      ]),
    );
    expect(labelled.map((e) => [e.name, e.logo])).toEqual([
      ["Apple (Ondo Tokenized)", "https://cdn.example/aapl.png"],
      ["Tesla (Ondo Tokenized)", "https://cdn.example/tsla.png"],
    ]);
    expect(isHttpsUrl("https://cdn.example/a.png")).toBe(true);
    expect(isHttpsUrl("http://cdn.example/a.png")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl(42)).toBe(false);
  });
});

// -------------------------------------------------------------------- browse

describe("browse", () => {
  const entry = (
    mint: Address,
    symbol: string,
    name: string,
    issuer: CatalogEntry["issuer"],
    underlying: string,
  ): CatalogEntry => ({ mint, symbol, name, issuer, underlying, logo: null });

  const AAPLX = entry(MINT, "AAPLx", "Apple xStock", "xstocks", "AAPL");
  const AAPLON = entry(PLAN, "AAPLon", "Apple (Ondo Tokenized)", "ondo", "AAPL");
  const IWMX = entry(OWNER, "IWMx", "Russell 2000 xStock", "xstocks", "IWM");
  const IWMON = entry(DEST, "IWMon", "iShares Russell 2000 ETF (Ondo Tokenized)", "ondo", "IWM");
  const AAPGX = entry(HOT, "AAPGx", "Ascentage Pharma xStock", "xstocks", "AAPG");
  const HK1024 = entry(GUARD, "1024x", "Kuaishou Technology xStock", "xstocks", "1024");
  const HK12 = entry(DEX, "12x", "Henderson Land xStock", "xstocks", "12");
  const groups = groupByCompany([IWMON, HK1024, AAPLON, AAPGX, HK12, IWMX, AAPLX]);

  test("strips each issuer's brand from the security's name", () => {
    expect(companyName(AAPLX)).toBe("Apple");
    expect(companyName(AAPLON)).toBe("Apple");
    expect(companyName({ ...AAPLX, name: "xStock" })).toBe("AAPLx");
  });

  test("groups both issuers' tokens under one ticker, xStocks first, named from Ondo", () => {
    // Numeric exchange codes go last, in numeric order.
    expect(groups.map((g) => g.ticker)).toEqual(["AAPG", "AAPL", "IWM", "12", "1024"]);
    const iwm = groups.find((g) => g.ticker === "IWM")!;
    expect(iwm.company).toBe("iShares Russell 2000 ETF");
    expect(iwm.listings.map((l) => l.symbol)).toEqual(["IWMx", "IWMon"]);
    expect(groups.find((g) => g.ticker === "AAPG")!.company).toBe("Ascentage Pharma");
  });

  test("ranks an exact ticker ahead of a prefix, and a prefix ahead of a name match", () => {
    const tickers = (query: string) =>
      filterGroups(groups, { query, issuer: "all" }).map((g) => g.ticker);
    expect(tickers("aapl")).toEqual(["AAPL"]);
    expect(tickers("AAP")).toEqual(["AAPG", "AAPL"]);
    expect(tickers("russell")).toEqual(["IWM"]);
    expect(tickers("aaplon")).toEqual(["AAPL"]);
    expect(tickers(PLAN)).toEqual(["AAPL"]);
    expect(tickers("no such stock")).toEqual([]);
    expect(tickers("")).toEqual(["AAPG", "AAPL", "IWM", "12", "1024"]);
  });

  test("filters listings by issuer and by what a wallet holds, dropping emptied groups", () => {
    const ondo = filterGroups(groups, { query: "", issuer: "ondo" });
    expect(ondo.map((g) => g.listings.map((l) => l.symbol))).toEqual([["AAPLon"], ["IWMon"]]);
    const held = filterGroups(groups, { query: "", issuer: "all", only: new Set([MINT]) });
    expect(held.map((g) => g.listings.map((l) => l.symbol))).toEqual([["AAPLx"]]);
  });

  test("links to Jupiter with the token preselected, and records each issuer's powers", () => {
    expect(jupiterSwapUrl(MINT)).toBe(
      `https://jup.ag/swap?sell=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&buy=${MINT}`,
    );
    expect(ISSUER_POWERS.xstocks).toContain("clawback");
    expect(ISSUER_POWERS.ondo).not.toContain("clawback");
  });
});

// --------------------------------------------------------------------- plans

describe("plan timeline", () => {
  test("moves from active to grace to recoverable", () => {
    const p = plan();
    expect(planTimeline(p, 1_050).phase).toBe("active");
    expect(planTimeline(p, 1_100).phase).toBe("grace");
    expect(planTimeline(p, 1_150)).toMatchObject({
      phase: "recoverable",
      graceStartsAt: 1_100,
      recoverableAt: 1_150,
    });
  });

  test("a guardian's defer pushes recovery out, once, and only before it is due", () => {
    const deferred = plan({ pausedUntil: 1_400 });
    expect(planTimeline(deferred, 1_200)).toMatchObject({ phase: "grace", recoverableAt: 1_400 });
    expect(canDefer(plan(), 1_149)).toBe(true);
    expect(canDefer(plan(), 1_150)).toBe(false);
    expect(canDefer(deferred, 1_120)).toBe(false);
  });
});

describe("plans that name a wallet", () => {
  const encoder = getStockPlanEncoder();

  function encode(checkinSigner: Address | null, guardian: Address | null): Uint8Array {
    return encoder.encode({
      version: 1,
      owner: OWNER,
      destination: DEST,
      mode: 0,
      checkinIntervalSecs: 1n,
      gracePeriodSecs: 1n,
      lastCheckinTs: 1n,
      createdAt: 1n,
      pauseDurationSecs: 1n,
      pausedUntil: 0n,
      checkinSigner: checkinSigner ? some(checkinSigner) : none(),
      guardian: guardian ? some(guardian) : none(),
      coveredAssets: 0,
      bump: 255,
    }) as Uint8Array;
  }

  function matches(bytes: Uint8Array, filters: GetProgramAccountsMemcmpFilter[]): boolean {
    return filters.every(({ memcmp }) => {
      const want = Array.from(
        getBase58Encoder().encode(memcmp.bytes) as unknown as ArrayLike<number>,
      );
      const at = Number(memcmp.offset);
      return want.every((b, i) => bytes[at + i] === b);
    });
  }

  function matchingQueries(bytes: Uint8Array, wallet: Address): number[] {
    return namingFilters(wallet)
      .map((filters, i) => (matches(bytes, filters) ? i : -1))
      .filter((i) => i >= 0);
  }

  test("each role is found in every layout the optional fields produce", () => {
    for (const [hot, guard] of [
      [null, null],
      [HOT, null],
      [null, GUARD],
      [HOT, GUARD],
    ] as const) {
      const bytes = encode(hot, guard);
      expect(matchingQueries(bytes, DEST)).toEqual([0]);
      expect(matchingQueries(bytes, HOT)).toEqual(hot ? [1] : []);
      expect(matchingQueries(bytes, GUARD)).toEqual(guard ? [hot ? 3 : 2] : []);
    }
  });

  test("bytes left behind by a cleared guardian do not match", () => {
    // Serialized in place: the longer layout first, then the shorter one over
    // it, which is what a re-serialisation after `clear_guardian` leaves.
    const before = encode(HOT, GUARD);
    const after = encode(HOT, null);
    const account = new Uint8Array(191);
    account.set(before);
    account.set(after);
    expect(matchingQueries(account, GUARD)).toEqual([]);
  });

  test("roles are re-derived from the decoded plan", () => {
    const p = plan({ checkinSigner: DEST, guardian: DEST });
    expect(rolesFor(p, DEST)).toEqual(["destination", "guardian", "checkin"]);
    expect(rolesFor(p, OWNER)).toEqual([]);
  });
});

// ------------------------------------------------------------------ coverage

describe("coverage health", () => {
  test("a plan that is still the delegate is covered", () => {
    expect(assessCoverage({ plan: PLAN, record, position: position(), mint: mint() })).toBe(
      "covered",
    );
  });

  test("another delegate, a revoke, or a spent allowance is an eviction", () => {
    for (const p of [
      position({ delegate: DEX }),
      position({ delegate: null, delegatedAmount: 0n }),
      position({ delegatedAmount: 999n }),
    ]) {
      expect(assessCoverage({ plan: PLAN, record, position: p, mint: mint() })).toBe("evicted");
    }
    expect(canReapprove("evicted", mint())).toBe(true);
    expect(
      canReapprove("evicted", mint({ transferHook: { authority: DEX, programId: DEX } })),
    ).toBe(false);
  });

  test("issuer actions are reported in order of what the owner can do about them", () => {
    const frozenAndEvicted = position({ frozen: true, delegate: DEX });
    expect(assessCoverage({ plan: PLAN, record, position: frozenAndEvicted, mint: mint() })).toBe(
      "frozen",
    );
    const paused = mint({ pausable: { paused: true } });
    expect(
      assessCoverage({ plan: PLAN, record, position: position({ delegate: DEX }), mint: paused }),
    ).toBe("evicted");
    expect(assessCoverage({ plan: PLAN, record, position: position(), mint: paused })).toBe(
      "paused",
    );
    expect(
      assessCoverage({
        plan: PLAN,
        record,
        position: position(),
        mint: mint({ transferHook: { authority: DEX, programId: DEX } }),
      }),
    ).toBe("hook-live");
    expect(
      assessCoverage({
        plan: PLAN,
        record,
        position: position(),
        mint: mint({ permanentDelegate: DEX }),
      }),
    ).toBe("clawback-added");
    expect(
      assessCoverage({
        plan: PLAN,
        record: { ...record, hadPermanentDelegate: true },
        position: position(),
        mint: mint({ permanentDelegate: DEX }),
      }),
    ).toBe("covered");
    expect(assessCoverage({ plan: PLAN, record, position: null, mint: mint() })).toBe("closed");
  });

  test("vault assets ignore delegation, which a vault never uses", () => {
    expect(assessVaultAsset({ record, position: position({ delegate: null }), mint: mint() })).toBe(
      "covered",
    );
  });
});

// ---------------------------------------------------------- risk & dividends

describe("risk and dividends", () => {
  test("flags what the issuer can still do", () => {
    expect(
      riskFlags(
        mint({
          permanentDelegate: DEX,
          pausable: { paused: false },
          freezeAuthority: DEX,
          transferHook: { authority: DEX, programId: null },
        }),
      ),
    ).toEqual(["clawback", "pausable", "freezable", "hook-slot"]);
    expect(riskFlags(mint({ pausable: { paused: true } }))).toEqual(["paused"]);
    expect(riskFlags(mint())).toEqual([]);
  });

  test("reads an upcoming dividend off the mint before it takes effect", () => {
    const withDividend = mint({
      scaledUiAmount: {
        multiplier: 1,
        newMultiplier: 1.01,
        newMultiplierEffectiveTimestamp: 2_000,
      },
    });
    const before = multiplierState(withDividend, 1_500)!;
    expect(before.current).toBe(1);
    expect(before.upcoming?.effectiveAt).toBe(2_000);
    expect(before.upcoming?.change).toBeCloseTo(0.01, 10);
    expect(multiplierState(withDividend, 2_000)).toEqual({ current: 1.01, upcoming: null });
    expect(uiAmount(100_000_000n, withDividend, 2_500)).toBeCloseTo(1.01, 10);
    expect(multiplierState(mint(), 0)).toBeNull();
  });
});

// ---------------------------------------------------------------- holdings

describe("holdings", () => {
  const issuer = {
    address: PLAN,
    mintAuthority: OWNER,
    label: "xstocks",
    riskTier: 2,
    enabled: true,
  };

  function holding(overrides: Partial<StockHolding> = {}): StockHolding {
    return { position: position(), mint: mint(), issuer, catalog: null, ...overrides };
  }

  test("explains up front why a holding cannot be covered", () => {
    expect(coverBlockers(holding())).toEqual([]);
    expect(coverBlockers(holding({ issuer: null }))).toEqual(["issuer-unregistered"]);
    expect(coverBlockers(holding({ issuer: { ...issuer, enabled: false } }))).toEqual([
      "issuer-disabled",
    ]);
    expect(
      coverBlockers(
        holding({
          mint: mint({ mintAuthority: null, frozenByDefault: true }),
          position: position({ frozen: true, cpiGuard: true }),
        }),
      ),
    ).toEqual(["no-mint-authority", "frozen-by-default", "account-frozen", "cpi-guard"]);
  });

  test("labels from the catalog first, then the mint's own metadata", () => {
    expect(holdingLabel(holding())).toEqual({ symbol: "AAPLx", name: "Apple xStock" });
    expect(holdingLabel(holding({ mint: mint({ name: null, symbol: null }) }))).toEqual({
      symbol: "XsbE",
      name: "XsbE",
    });
  });
});

// ------------------------------------------------------------------- errors

describe("program errors", () => {
  test("found in kit's cause chain", () => {
    const inner = new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM, {
      code: HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED,
      index: 0,
    });
    const outer = new Error("Failed to send", { cause: inner });
    expect(programErrorCode(outer)).toBe(HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED);
    expect(programErrorKey(outer)).toBe("assetPaused");
  });

  test("found in a wallet's message", () => {
    const hex = HEIRLOOM_STOCKS_ERROR__DELEGATE_EVICTED.toString(16);
    const error = new Error(`Transaction simulation failed: custom program error: 0x${hex}`);
    expect(programErrorKey(error)).toBe("delegateEvicted");
    expect(programErrorCode(new Error("User rejected the request"))).toBeNull();
  });
});
