import { getBase64Decoder, getBase64Encoder, type Address } from "@solana/kit";
import { JUPITER_API_KEY, JUPITER_API_URL } from "@/config";

/**
 * Jupiter, for everything about a stock that lives on mainnet but doesn't
 * involve the stocks program: its price, what a wallet holds of it, and
 * swapping into or out of it. All of it is mainnet whatever cluster the app
 * reads, and needs no RPC of ours — Jupiter quotes, builds, and lands the swap;
 * the wallet only signs.
 *
 * The parsers are exported for the tests, and take `unknown` because nothing
 * about a third-party response is trusted.
 */

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address;
export const SOL_MINT = "So11111111111111111111111111111111111111112" as Address;

/** The tokens a stock can be bought with or sold into. */
export const QUOTE_TOKENS = {
  USDC: { mint: USDC_MINT, decimals: 6 },
  SOL: { mint: SOL_MINT, decimals: 9 },
} as const;
export type QuoteSymbol = keyof typeof QUOTE_TOKENS;

/** The price API takes at most this many ids per request. */
export const PRICE_BATCH = 50;

export class JupiterError extends Error {
  constructor(
    message: string,
    /** Set when a swap reached the chain and failed there. */
    readonly signature: string | null = null,
  ) {
    super(message);
    this.name = "JupiterError";
  }
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
const raw = (value: unknown): bigint => {
  try {
    return typeof value === "string" || typeof value === "number" ? BigInt(value) : 0n;
  } catch {
    return 0n;
  }
};

// ------------------------------------------------------------------ prices

export interface TokenPrice {
  /**
   * Per token as wallets display it, with the dividend multiplier applied. Null
   * when the token has no on-chain market yet — most xStocks listings — and
   * Jupiter can't quote a trade in it.
   */
  usd: number | null;
  /** Percent, e.g. 0.43 for +0.43%. */
  change24h: number | null;
  /** The listed share the token tracks, as Jupiter reports it. */
  underlyingUsd: number | null;
  decimals: number | null;
  scaled: ScaledUiConfig | null;
}

/** A mint's `ScaledUiAmount` schedule: the multiplier now, and the next one. */
export interface ScaledUiConfig {
  multiplier: number;
  newMultiplier: number;
  /** Seconds since the epoch. */
  newMultiplierEffectiveAt: number;
}

export function parsePrices(json: unknown): Map<Address, TokenPrice> {
  const prices = new Map<Address, TokenPrice>();
  if (!isObject(json)) return prices;

  for (const [mint, value] of Object.entries(json)) {
    if (!isObject(value)) continue;
    const usd = num(value.usdPrice);
    const stock = isObject(value.stockData) ? value.stockData : null;
    const underlyingUsd = stock ? num(stock.price) : null;
    if (usd === null && underlyingUsd === null) continue;

    const config = isObject(value.scaledUiConfig) ? value.scaledUiConfig : null;
    const effectiveAt = config ? Date.parse(String(config.newMultiplierEffectiveAt)) : NaN;
    const scaled =
      config && num(config.multiplier) !== null
        ? {
            multiplier: num(config.multiplier)!,
            newMultiplier: num(config.newMultiplier) ?? num(config.multiplier)!,
            newMultiplierEffectiveAt: Number.isFinite(effectiveAt) ? effectiveAt / 1000 : 0,
          }
        : null;

    prices.set(mint as Address, {
      usd,
      change24h: num(value.priceChange24h),
      underlyingUsd,
      decimals: num(value.decimals),
      scaled,
    });
  }
  return prices;
}

/** The multiplier in force at `now`: raw units times this is what a wallet shows. */
export function multiplierAt(scaled: ScaledUiConfig | null, now: number): number {
  if (!scaled) return 1;
  return now >= scaled.newMultiplierEffectiveAt ? scaled.newMultiplier : scaled.multiplier;
}

// ---------------------------------------------------------------- holdings

export interface MainnetBalance {
  /** Raw units across every account of the mint. */
  raw: bigint;
  /** As a wallet displays it: Jupiter applies a stock's multiplier already. */
  ui: number;
  /**
   * Raw units a swap can spend: Jupiter sells from the owner's associated
   * account, and a frozen one can't move at all.
   */
  sellable: bigint;
  decimals: number;
}

export interface MainnetHoldings {
  sol: MainnetBalance;
  tokens: Map<Address, MainnetBalance>;
}

export function parseHoldings(json: unknown): MainnetHoldings {
  const root = isObject(json) ? json : {};
  const lamports = raw(root.amount);
  const holdings: MainnetHoldings = {
    sol: { raw: lamports, ui: num(root.uiAmount) ?? 0, sellable: lamports, decimals: 9 },
    tokens: new Map(),
  };

  const tokens = isObject(root.tokens) ? root.tokens : {};
  for (const [mint, accounts] of Object.entries(tokens)) {
    if (!Array.isArray(accounts)) continue;
    const balance: MainnetBalance = { raw: 0n, ui: 0, sellable: 0n, decimals: 0 };
    for (const account of accounts) {
      if (!isObject(account)) continue;
      const amount = raw(account.amount);
      balance.raw += amount;
      balance.ui += num(account.uiAmount) ?? 0;
      balance.decimals = num(account.decimals) ?? balance.decimals;
      if (account.isAssociatedTokenAccount === true && account.isFrozen !== true) {
        balance.sellable += amount;
      }
    }
    if (balance.raw > 0n) holdings.tokens.set(mint as Address, balance);
  }
  return holdings;
}

// ------------------------------------------------------------------- swaps

export interface SwapOrder {
  requestId: string;
  inAmount: bigint;
  outAmount: bigint;
  inUsd: number | null;
  outUsd: number | null;
  /** Percent; negative means the trade moves the price against the taker. */
  priceImpact: number | null;
  feeBps: number | null;
  /** Jupiter pays the network fees and any rent. */
  gasless: boolean;
  /** Base64, to be signed by the taker. Null for a quote without one. */
  transaction: string | null;
}

export function parseOrder(json: unknown): SwapOrder {
  if (!isObject(json)) throw new JupiterError("Jupiter returned no quote.");
  const error = str(json.errorMessage) ?? str(json.error);
  const requestId = str(json.requestId);
  if (error || !requestId) throw new JupiterError(error ?? "Jupiter returned no quote.");

  const impact = num(json.priceImpact);
  const impactPct = Number(json.priceImpactPct);
  return {
    requestId,
    inAmount: raw(json.inAmount),
    outAmount: raw(json.outAmount),
    inUsd: num(json.inUsdValue),
    outUsd: num(json.outUsdValue),
    priceImpact: impact ?? (Number.isFinite(impactPct) ? impactPct * 100 : null),
    feeBps: num(json.feeBps),
    gasless: json.gasless === true,
    transaction: str(json.transaction),
  };
}

export interface SwapResult {
  signature: string;
  inAmount: bigint | null;
  outAmount: bigint | null;
}

export function parseExecute(json: unknown): SwapResult {
  const body = isObject(json) ? json : {};
  const signature = str(body.signature);
  if (body.status !== "Success" || !signature) {
    throw new JupiterError(str(body.error) ?? "The swap didn't go through.", signature);
  }
  return {
    signature,
    inAmount: body.inputAmountResult != null ? raw(body.inputAmountResult) : null,
    outAmount: body.outputAmountResult != null ? raw(body.outputAmountResult) : null,
  };
}

// ------------------------------------------------------------------ amounts

/** A typed amount in display units to raw units, or null if it isn't a positive number. */
export function toRawAmount(text: string, decimals: number, multiplier = 1): bigint | null {
  const value = Number(text.trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  const amount = BigInt(Math.floor((value / multiplier) * 10 ** decimals));
  return amount > 0n ? amount : null;
}

/** Raw units as a wallet displays them. */
export function toDisplayAmount(amount: bigint, decimals: number, multiplier = 1): number {
  return (Number(amount) / 10 ** decimals) * multiplier;
}

// --------------------------------------------------------------------- api

async function jupiter(path: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  if (JUPITER_API_KEY) headers.set("x-api-key", JUPITER_API_KEY);
  const response = await fetch(`${JUPITER_API_URL}${path}`, { ...init, headers });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isObject(body) ? (str(body.error) ?? str(body.errorMessage)) : null;
    throw new JupiterError(message ?? `Jupiter responded ${response.status}.`);
  }
  return body;
}

/** Prices for up to `PRICE_BATCH` mints. Mints Jupiter has no price for are absent. */
export async function fetchPrices(mints: Address[]): Promise<Map<Address, TokenPrice>> {
  if (mints.length === 0) return new Map();
  return parsePrices(await jupiter(`/price/v3?ids=${mints.join(",")}`));
}

/** What `owner` holds on mainnet. */
export async function fetchHoldings(owner: Address): Promise<MainnetHoldings> {
  return parseHoldings(await jupiter(`/ultra/v1/holdings/${owner}`));
}

/**
 * A quote for swapping `amount` raw units of `inputMint`. With a `taker`, it
 * also carries the transaction for that wallet to sign; without, it is a quote
 * only.
 */
export async function fetchOrder(input: {
  inputMint: Address;
  outputMint: Address;
  amount: bigint;
  taker?: Address;
}): Promise<SwapOrder> {
  const params = new URLSearchParams({
    inputMint: input.inputMint,
    outputMint: input.outputMint,
    amount: input.amount.toString(),
  });
  if (input.taker) params.set("taker", input.taker);
  return parseOrder(await jupiter(`/ultra/v1/order?${params}`));
}

/** Hands Jupiter the signed transaction; it lands it and reports the outcome. */
export async function executeOrder(input: {
  requestId: string;
  signedTransaction: Uint8Array;
}): Promise<SwapResult> {
  return parseExecute(
    await jupiter("/ultra/v1/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: input.requestId,
        signedTransaction: base64Decoder.decode(input.signedTransaction),
      }),
    }),
  );
}

const base64Encoder = getBase64Encoder();
const base64Decoder = getBase64Decoder();

/** An order's transaction as the bytes a wallet signs. */
export function transactionBytes(order: SwapOrder): Uint8Array {
  if (!order.transaction) throw new JupiterError("This quote has no transaction to sign.");
  // Copied through `ArrayLike`, the same way the program tests copy kit's
  // `ReadonlyUint8Array`: the wallet wants a plain, mutable `Uint8Array`.
  return new Uint8Array(base64Encoder.encode(order.transaction) as unknown as ArrayLike<number>);
}

/**
 * Jupiter's own swap page with this pair preselected. It must be the
 * `sell`/`buy` query form: the older `/swap/A-B` path silently falls back to
 * SOL for tokens it doesn't recognise by symbol.
 */
export function jupiterSwapUrl(buy: Address, sell: Address = USDC_MINT): string {
  return `https://jup.ag/swap?sell=${sell}&buy=${buy}`;
}

/** A mainnet transaction on the explorer, whatever cluster the app reads. */
export function mainnetTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}`;
}
