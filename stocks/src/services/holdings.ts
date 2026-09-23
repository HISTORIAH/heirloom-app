import {
  getUtf8Decoder,
  type Address,
  type GetMultipleAccountsApi,
  type GetTokenAccountsByOwnerApi,
  type Rpc,
} from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import { fetchAllMaybeIssuerRegistry } from "@historiah/heirloom-stocks";
import { getIssuerAddress } from "@/lib/stocks";
import type { CatalogEntry } from "@/services/catalog";
import { chunk, fetchMintDetails, type MintDetails } from "@/services/mints";

/** One token account, as the coverage monitor needs to see it. */
export interface TokenPosition {
  tokenAccount: Address;
  mint: Address;
  tokenProgram: Address;
  /** Raw units. Dividends move the display multiplier, never this. */
  amount: bigint;
  delegate: Address | null;
  delegatedAmount: bigint;
  frozen: boolean;
  /** Token-2022 CPI Guard, which blocks a delegate approval made through a program. */
  cpiGuard: boolean;
}

/** A curated issuer, read from its on-chain `IssuerRegistry` entry. */
export interface IssuerInfo {
  address: Address;
  mintAuthority: Address;
  label: string;
  riskTier: number;
  enabled: boolean;
}

export interface StockHolding {
  position: TokenPosition;
  mint: MintDetails;
  issuer: IssuerInfo | null;
  catalog: CatalogEntry | null;
}

type ParsedTokenAccount = {
  mint: Address;
  tokenAmount: { amount: string };
  delegate?: Address;
  delegatedAmount?: { amount: string };
  state: string;
  extensions?: { extension: string; state?: { lockCpi?: boolean } }[];
};

type RpcWithTokens = Rpc<GetTokenAccountsByOwnerApi & GetMultipleAccountsApi>;

const utf8 = getUtf8Decoder();

/** Every token account `owner` holds, under both token programs. */
export async function fetchTokenPositions(
  rpc: Rpc<GetTokenAccountsByOwnerApi>,
  owner: Address,
): Promise<TokenPosition[]> {
  const programs = [TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS] as Address[];
  const responses = await Promise.all(
    programs.map((programId) =>
      rpc
        .getTokenAccountsByOwner(
          owner,
          { programId },
          { encoding: "jsonParsed", commitment: "confirmed" },
        )
        .send(),
    ),
  );

  return responses.flatMap(({ value }, i) =>
    value.map(({ pubkey, account }) => {
      const info = account.data.parsed.info as unknown as ParsedTokenAccount;
      const cpiGuard = info.extensions?.find((e) => e.extension === "cpiGuard");
      return {
        tokenAccount: pubkey,
        mint: info.mint,
        tokenProgram: programs[i]!,
        amount: BigInt(info.tokenAmount.amount),
        delegate: info.delegate ?? null,
        delegatedAmount: BigInt(info.delegatedAmount?.amount ?? "0"),
        frozen: info.state === "frozen",
        cpiGuard: cpiGuard?.state?.lockCpi ?? false,
      };
    }),
  );
}

/** Registry entries for the given mint authorities, keyed by authority. */
export async function fetchIssuers(
  rpc: Rpc<GetMultipleAccountsApi>,
  mintAuthorities: Address[],
): Promise<Map<Address, IssuerInfo>> {
  const issuers = new Map<Address, IssuerInfo>();
  const authorities = [...new Set(mintAuthorities)];

  for (const batch of chunk(authorities)) {
    const addresses = await Promise.all(batch.map(getIssuerAddress));
    const accounts = await fetchAllMaybeIssuerRegistry(rpc, addresses, { commitment: "confirmed" });
    for (const account of accounts) {
      if (!account.exists) continue;
      const { mintAuthority, label, riskTier, enabled } = account.data;
      issuers.set(mintAuthority, {
        address: account.address,
        mintAuthority,
        label: utf8.decode(label).replace(/\0+$/, ""),
        riskTier,
        enabled,
      });
    }
  }

  return issuers;
}

/**
 * Combines positions, mints, issuers, and the catalog into stock holdings.
 *
 * A position counts as a stock when its issuer is registered on-chain — the
 * check `cover_asset` itself makes — or when the catalog lists its mint, so an
 * equity whose issuer is not registered on this cluster still shows, marked as
 * not yet coverable.
 */
export function toStockHoldings(
  positions: TokenPosition[],
  mints: Map<Address, MintDetails>,
  issuers: Map<Address, IssuerInfo>,
  catalog: Map<Address, CatalogEntry>,
): StockHolding[] {
  const holdings: StockHolding[] = [];
  for (const position of positions) {
    const mint = mints.get(position.mint);
    if (!mint) continue;
    const issuer = mint.mintAuthority ? (issuers.get(mint.mintAuthority) ?? null) : null;
    const entry = catalog.get(position.mint) ?? null;
    if (!issuer && !entry) continue;
    holdings.push({ position, mint, issuer, catalog: entry });
  }
  return holdings;
}

/** The stock holdings of `owner`. */
export async function fetchStockHoldings(
  rpc: RpcWithTokens,
  owner: Address,
  catalog: Map<Address, CatalogEntry>,
): Promise<StockHolding[]> {
  const positions = await fetchTokenPositions(rpc, owner);
  const mints = await fetchMintDetails(
    rpc,
    positions.map((p) => p.mint),
  );
  const authorities = [...mints.values()]
    .map((m) => m.mintAuthority)
    .filter((a): a is Address => a !== null);
  const issuers = await fetchIssuers(rpc, authorities);

  return toStockHoldings(positions, mints, issuers, catalog);
}

/** Display symbol and name, preferring the catalog, then on-chain metadata. */
export function holdingLabel(holding: Pick<StockHolding, "mint" | "catalog">): {
  symbol: string;
  name: string;
} {
  const symbol = holding.catalog?.symbol ?? holding.mint.symbol ?? holding.mint.mint.slice(0, 4);
  const name = holding.mint.name ?? holding.catalog?.name ?? symbol;
  return { symbol, name };
}

/**
 * Why `cover_asset` would refuse this holding, checked up front so the UI can
 * explain instead of failing a transaction. Mirrors the program's guards.
 */
export type CoverBlocker =
  | "issuer-unregistered"
  | "issuer-disabled"
  | "no-mint-authority"
  | "frozen-by-default"
  | "non-transferable"
  | "transfer-hook"
  | "account-frozen"
  | "cpi-guard";

export function coverBlockers(holding: StockHolding): CoverBlocker[] {
  const { mint, position, issuer } = holding;
  const blockers: CoverBlocker[] = [];
  if (!mint.mintAuthority) blockers.push("no-mint-authority");
  else if (!issuer) blockers.push("issuer-unregistered");
  else if (!issuer.enabled) blockers.push("issuer-disabled");
  if (mint.nonTransferable) blockers.push("non-transferable");
  if (mint.frozenByDefault) blockers.push("frozen-by-default");
  if (mint.transferHook?.programId) blockers.push("transfer-hook");
  if (position.frozen) blockers.push("account-frozen");
  if (position.cpiGuard) blockers.push("cpi-guard");
  return blockers;
}
