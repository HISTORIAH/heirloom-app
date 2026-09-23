/**
 * Test equities on devnet, where the stocks program is deployed.
 *
 * xStocks and Ondo mint only on mainnet, so devnet gets equities configured
 * like theirs (see `createEquity`) from two test issuers, registered through
 * the real `register_issuer`. Used by `scripts/devnet.ts` and by the browser
 * tests when they run against devnet.
 *
 * Nothing about them is kept off-chain. Each issuer holds a token account for
 * every equity it issues, as real issuers do, so the equities are found with
 * `getTokenAccountsByOwner` on the issuer: the same call the app makes for a
 * wallet. They can't be found by their mint authority instead, because Helius,
 * like most providers, refuses `getProgramAccounts` on Token-2022.
 *
 * The issuers' keys are kept in `~/.config/solana/heirloom-stocks-devnet/`,
 * next to the other Solana keys and never in the repo. Creating equities,
 * minting them, and scheduling dividends need those keys.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import {
  createClient,
  createKeyPairFromPrivateKeyBytes,
  createKeyPairSignerFromBytes,
  lamports,
  unwrapOption,
  type Address,
  type KeyPairSigner,
  type Signature,
} from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { signerFromFile } from "@solana/kit-plugin-signer";
import { getTransferSolInstruction, systemProgram } from "@solana-program/system";
import { associatedTokenProgram } from "@solana-program/token";
import {
  fetchAllMaybeMint,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  token2022Program,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import {
  ADMIN_ADDRESS,
  fetchAllMaybeIssuerRegistry,
  findIssuerPda,
  heirloomStocksProgram,
} from "@historiah/heirloom-stocks";

import {
  createEquity,
  mintTo,
  scheduleDividend,
  SEEDED_EQUITIES,
  type EquitySpec,
  type IssuerStyle,
  type LocalEquity,
  type LocalIssuers,
} from "../localnet/localnet";

export const ISSUER_KEYS_DIR = path.join(homedir(), ".config", "solana", "heirloom-stocks-devnet");

const ISSUER_REGISTRATION = {
  xstocks: { label: "xstocks", riskTier: 3 },
  ondo: { label: "ondo", riskTier: 2 },
} as const satisfies Record<IssuerStyle, unknown>;

const ISSUER_STYLES = Object.keys(ISSUER_REGISTRATION) as IssuerStyle[];

/** A test equity as read back from the chain. */
export interface TestEquity extends LocalEquity {
  name: string;
  issuer: IssuerStyle;
}

// ------------------------------------------------------------------- config

export interface ClusterConfig {
  rpcUrl: string;
  wsUrl: string;
  keypairPath: string;
}

/**
 * The Solana CLI's own settings, so the scripts use the same RPC and keypair as
 * `solana program deploy` did. Each can be overridden.
 */
export async function solanaCliConfig(
  overrides: Partial<ClusterConfig> = {},
): Promise<ClusterConfig> {
  const file = path.join(homedir(), ".config", "solana", "cli", "config.yml");
  const text = existsSync(file) ? await readFile(file, "utf8") : "";
  const read = (key: string) =>
    new RegExp(`^${key}:\\s*['"]?([^'"\\n]*)['"]?\\s*$`, "m").exec(text)?.[1]?.trim() ?? "";

  const rpcUrl = overrides.rpcUrl ?? read("json_rpc_url");
  if (!rpcUrl) throw new Error("No RPC URL: pass --rpc or set one with `solana config set`");
  const wsUrl = overrides.wsUrl ?? (read("websocket_url") || rpcUrl.replace(/^http/, "ws"));
  const keypairPath = (overrides.keypairPath ?? read("keypair_path")).replace(
    /^~(?=\/)/,
    homedir(),
  );
  if (!keypairPath)
    throw new Error("No keypair: pass --keypair or set one with `solana config set`");

  return { rpcUrl, wsUrl, keypairPath };
}

export async function createDevnetClient(config: ClusterConfig) {
  return createClient()
    .use(signerFromFile(config.keypairPath))
    .use(solanaRpc({ rpcUrl: config.rpcUrl, rpcSubscriptionsUrl: config.wsUrl }))
    .use(heirloomStocksProgram())
    .use(systemProgram())
    .use(token2022Program())
    .use(associatedTokenProgram());
}

export type DevnetClient = Awaited<ReturnType<typeof createDevnetClient>>;

// --------------------------------------------------------------- issuer keys

async function loadOrCreateKeypair(file: string): Promise<KeyPairSigner> {
  if (existsSync(file)) {
    return createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(await readFile(file, "utf8"))));
  }
  // The same 64-byte layout `solana-keygen` writes: seed, then public key.
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const pair = await createKeyPairFromPrivateKeyBytes(seed, true);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const bytes = [...seed, ...publicKey];
  await writeFile(file, JSON.stringify(bytes), { mode: 0o600 });
  return createKeyPairSignerFromBytes(new Uint8Array(bytes));
}

export async function loadIssuerKeys(create = false): Promise<LocalIssuers> {
  if (create) await mkdir(ISSUER_KEYS_DIR, { recursive: true, mode: 0o700 });
  const load = async (key: IssuerStyle) => {
    const file = path.join(ISSUER_KEYS_DIR, `${key}-issuer.json`);
    if (!create && !existsSync(file)) {
      throw new Error(
        `${file} not found. Run \`bun run devnet:seed\` on the machine that holds it.`,
      );
    }
    return loadOrCreateKeypair(file);
  };
  return { xstocks: await load("xstocks"), ondo: await load("ondo") };
}

// ------------------------------------------------------------------ discovery

/**
 * Every test equity on the cluster, read from the chain: the mints behind each
 * issuer's own token accounts, kept only where that issuer is still the mint
 * authority, with their names from Token-2022 metadata.
 */
export async function findTestEquities(
  client: DevnetClient,
  issuers: LocalIssuers,
): Promise<TestEquity[]> {
  const equities: TestEquity[] = [];

  for (const style of ISSUER_STYLES) {
    const authority = issuers[style].address;
    const { value } = await client.rpc
      .getTokenAccountsByOwner(
        authority,
        { programId: TOKEN_2022_PROGRAM_ADDRESS },
        { encoding: "jsonParsed", commitment: "confirmed" },
      )
      .send();
    const mints = [
      ...new Set(value.map(({ account }) => account.data.parsed.info.mint as Address)),
    ];

    for (let i = 0; i < mints.length; i += 100) {
      const accounts = await fetchAllMaybeMint(client.rpc, mints.slice(i, i + 100), {
        commitment: "confirmed",
      });
      for (const account of accounts) {
        if (!account.exists || unwrapOption(account.data.mintAuthority) !== authority) continue;
        const metadata = unwrapOption(account.data.extensions)?.find(
          (e) => e.__kind === "TokenMetadata",
        );
        if (metadata?.__kind !== "TokenMetadata") continue;
        equities.push({
          mint: account.address,
          symbol: metadata.symbol,
          name: metadata.name,
          decimals: account.data.decimals,
          issuer: style,
        });
      }
    }
  }

  return equities.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/** The equity whose symbol (in any case) or mint address is `query`. */
export function pickEquity(equities: TestEquity[], query: string): TestEquity | undefined {
  return equities.find((e) => e.mint === query || e.symbol.toLowerCase() === query.toLowerCase());
}

// ------------------------------------------------------------------ creating

/**
 * Creates an equity from `style`'s issuer, then the issuer's own account for
 * it, which is what `findTestEquities` finds it by.
 */
export async function createTestEquity(
  client: DevnetClient,
  issuers: LocalIssuers,
  style: IssuerStyle,
  spec: EquitySpec,
): Promise<TestEquity> {
  const equity = await createEquity(client, issuers, style, spec);
  await client.sendTransaction(
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: client.payer,
      owner: issuers[style].address,
      mint: equity.mint,
      tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    }),
  );
  return { ...equity, name: spec.name, issuer: style };
}

/**
 * Registers the test issuers and creates the seeded equities, unless that has
 * already happened. Safe to run again: what the chain already has is reused.
 */
export async function seedDevnet(
  client: DevnetClient,
  log: (line: string) => void = console.log,
): Promise<TestEquity[]> {
  const issuers = await loadIssuerKeys(true);

  const registries = await Promise.all(
    ISSUER_STYLES.map(async (style) => {
      const [registry] = await findIssuerPda({ mintAuthority: issuers[style].address });
      return registry;
    }),
  );
  const accounts = await fetchAllMaybeIssuerRegistry(client.rpc, registries);

  for (const [i, style] of ISSUER_STYLES.entries()) {
    if (accounts[i]!.exists) {
      log(`issuer ${style} already registered`);
      continue;
    }
    if (client.identity.address !== ADMIN_ADDRESS) {
      throw new Error(
        `Registering issuers needs the program admin ${ADMIN_ADDRESS}; the keypair is ${client.identity.address}`,
      );
    }
    await client.heirloomStocks.instructions
      .registerIssuer({
        admin: client.identity,
        mintAuthority: issuers[style].address,
        ...ISSUER_REGISTRATION[style],
      })
      .sendTransaction();
    log(`registered issuer ${style}`);
  }

  const existing = await findTestEquities(client, issuers);
  for (const [key, { style, ...spec }] of Object.entries(SEEDED_EQUITIES)) {
    const found = pickEquity(existing, spec.symbol);
    if (found) {
      log(`${spec.symbol} already on devnet: ${found.mint}`);
      continue;
    }
    const equity = await createTestEquity(client, issuers, style, spec);
    log(`created ${spec.symbol} ${equity.mint}`);
    if (key === "xstock") {
      await scheduleTestDividend(client, issuers, equity, 0.0035, 5);
    }
  }

  return findTestEquities(client, issuers);
}

// ---------------------------------------------------------------- mint & fund

/** Whole tokens, before any display multiplier. */
export const DEFAULT_AMOUNT = 25;

export async function mintTestStock(
  client: DevnetClient,
  issuers: LocalIssuers,
  equity: TestEquity,
  to: Address,
  wholeTokens: number,
): Promise<Signature> {
  const raw = BigInt(Math.round(wholeTokens * 10 ** equity.decimals));
  return mintTo(client, issuers[equity.issuer], equity, to, raw);
}

/** Sends SOL from the CLI keypair, since devnet airdrops are rate-limited. */
export async function fundWithSol(
  client: DevnetClient,
  to: Address,
  sol: number,
): Promise<Signature> {
  const result = await client.sendTransaction(
    getTransferSolInstruction({
      source: client.payer,
      destination: to,
      amount: lamports(BigInt(Math.round(sol * 1_000_000_000))),
    }),
  );
  return result.context.signature;
}

/** Schedules `equity`'s next dividend `days` out, raising its multiplier by `change`. */
export async function scheduleTestDividend(
  client: DevnetClient,
  issuers: LocalIssuers,
  equity: TestEquity,
  change: number,
  days: number,
): Promise<Signature> {
  const effectiveAt = Math.floor(Date.now() / 1000) + Math.round(days * 86_400);
  return scheduleDividend(client, issuers[equity.issuer], equity, change, effectiveAt);
}
