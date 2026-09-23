/**
 * A local validator with the stocks program and two issuers' equities on it.
 *
 * Used by the localnet tests, the browser end-to-end run, and `bun run
 * localnet` for clicking through the app by hand. Needs the Solana CLI and a
 * built program (`programs/heirloom-stocks/build.sh`).
 *
 * Two things differ from devnet. The program is loaded at its real address
 * with `--bpf-program`, so nothing has to be deployed. And the issuer registry
 * entries are written into the genesis ledger with `--account`, because
 * `register_issuer` needs the admin key, which is not in this repo — the same
 * reason the program's own tests forge them.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createClient,
  generateKeyPairSigner,
  getBase64Decoder,
  lamports,
  type Address,
  type KeyPairSigner,
} from "@solana/kit";
import { solanaLocalRpc } from "@solana/kit-plugin-rpc";
import { generatedSigner } from "@solana/kit-plugin-signer";
import { systemProgram } from "@solana-program/system";
import {
  getUpdateMultiplierScaledUiMintInstruction,
  token2022Program,
  TOKEN_2022_PROGRAM_ADDRESS,
  type ExtensionArgs,
} from "@solana-program/token-2022";
import { associatedTokenProgram } from "@solana-program/token";
import {
  findIssuerPda,
  getIssuerRegistryEncoder,
  HEIRLOOM_STOCKS_PROGRAM_ADDRESS,
  heirloomStocksProgram,
} from "@historiah/heirloom-stocks";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");
export const PROGRAM_BINARY = path.join(REPO_ROOT, "target", "deploy", "heirloom_stocks.so");

// ------------------------------------------------------------------ validator

export interface Validator {
  rpcUrl: string;
  wsUrl: string;
  stop(): Promise<void>;
}

export interface GenesisAccount {
  address: Address;
  data: Uint8Array;
  owner: Address;
  lamports: bigint;
}

const base64 = getBase64Decoder();

async function waitForHealth(rpcUrl: string, validator: ChildProcess, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (validator.exitCode !== null) {
      throw new Error(`solana-test-validator exited with code ${validator.exitCode}`);
    }
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      });
      const body = (await response.json()) as { result?: string };
      if (body.result === "ok") return;
    } catch {
      // Not listening yet.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("solana-test-validator did not become healthy in time");
}

/**
 * Starts a fresh validator on its own ports and ledger. The stocks program is
 * loaded at its real address, and `accounts` are written into genesis.
 */
export async function startValidator(
  options: { accounts?: GenesisAccount[]; rpcPort?: number; quiet?: boolean } = {},
): Promise<Validator> {
  const rpcPort = options.rpcPort ?? 20_000 + Math.floor(Math.random() * 20_000);
  const workdir = await mkdtemp(path.join(tmpdir(), "heirloom-stocks-localnet-"));
  // `--reset` clears the ledger directory on start, so genesis account files
  // have to live next to it rather than inside it.
  const ledger = path.join(workdir, "ledger");

  const args = [
    "--reset",
    "--quiet",
    "--ledger",
    ledger,
    "--bind-address",
    "127.0.0.1",
    "--rpc-port",
    String(rpcPort),
    "--faucet-port",
    String(rpcPort + 2),
    "--gossip-port",
    String(rpcPort + 3),
    "--dynamic-port-range",
    `${rpcPort + 10}-${rpcPort + 40}`,
    "--bpf-program",
    HEIRLOOM_STOCKS_PROGRAM_ADDRESS,
    PROGRAM_BINARY,
  ];

  for (const account of options.accounts ?? []) {
    const file = path.join(workdir, `${account.address}.json`);
    await writeFile(
      file,
      JSON.stringify({
        pubkey: account.address,
        account: {
          lamports: Number(account.lamports),
          data: [base64.decode(account.data), "base64"],
          owner: account.owner,
          executable: false,
          rentEpoch: 0,
          space: account.data.length,
        },
      }),
    );
    args.push("--account", account.address, file);
  }

  const child = spawn("solana-test-validator", args, {
    stdio: ["ignore", options.quiet === false ? "inherit" : "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
    if (options.quiet === false) process.stderr.write(chunk);
  });

  const rpcUrl = `http://127.0.0.1:${rpcPort}`;
  const wsUrl = `ws://127.0.0.1:${rpcPort + 1}`;
  try {
    await waitForHealth(rpcUrl, child, 60_000);
  } catch (error) {
    child.kill("SIGKILL");
    await rm(workdir, { recursive: true, force: true });
    throw new Error(`${(error as Error).message}\n${stderr.trim()}`);
  }

  return {
    rpcUrl,
    wsUrl,
    async stop() {
      child.kill("SIGINT");
      await new Promise((r) => child.once("exit", r));
      await rm(workdir, { recursive: true, force: true });
    },
  };
}

// ------------------------------------------------------------------- issuers

/** An `IssuerRegistry` entry as a genesis account, like `seedIssuer` in the client tests. */
export async function issuerAccount(
  mintAuthority: Address,
  options: { label: string; riskTier: number; enabled?: boolean },
): Promise<GenesisAccount> {
  const [address, bump] = await findIssuerPda({ mintAuthority });
  const label = new Uint8Array(16);
  label.set(new TextEncoder().encode(options.label).slice(0, 16));

  const encoded = getIssuerRegistryEncoder().encode({
    version: 1,
    mintAuthority,
    label,
    riskTier: options.riskTier,
    enabled: options.enabled ?? true,
    bump,
  });
  const data = new Uint8Array(encoded as unknown as ArrayLike<number>);

  return {
    address,
    data,
    owner: HEIRLOOM_STOCKS_PROGRAM_ADDRESS,
    lamports: 10_000_000n,
  };
}

// -------------------------------------------------------------------- client

export async function createLocalClient(validator: Pick<Validator, "rpcUrl" | "wsUrl">) {
  const client = await createClient()
    .use(generatedSigner())
    .use(
      solanaLocalRpc({
        rpcUrl: validator.rpcUrl,
        rpcSubscriptionsUrl: validator.wsUrl,
      }),
    )
    .use(heirloomStocksProgram())
    .use(systemProgram())
    .use(token2022Program())
    .use(associatedTokenProgram());
  await client.airdrop(client.payer.address, lamports(100_000_000_000n));
  return client;
}

export type LocalClient = Awaited<ReturnType<typeof createLocalClient>>;

export async function fundedSigner(client: LocalClient, sol = 20n): Promise<KeyPairSigner> {
  const signer = await generateKeyPairSigner();
  await client.airdrop(signer.address, lamports(sol * 1_000_000_000n));
  return signer;
}

// ------------------------------------------------------------------ equities

/**
 * The two issuers the seeded equities come from. Their authorities sign the
 * mints, and their registry entries go into genesis.
 */
export interface LocalIssuers {
  xstocks: KeyPairSigner;
  ondo: KeyPairSigner;
}

export async function generateIssuers(): Promise<LocalIssuers> {
  const [xstocks, ondo] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
  return { xstocks, ondo };
}

export async function issuerGenesis(issuers: LocalIssuers): Promise<GenesisAccount[]> {
  return Promise.all([
    issuerAccount(issuers.xstocks.address, { label: "xstocks", riskTier: 3 }),
    issuerAccount(issuers.ondo.address, { label: "ondo", riskTier: 1 }),
  ]);
}

export interface LocalEquity {
  mint: Address;
  symbol: string;
  decimals: number;
}

const DAY = 86_400;

/**
 * Mints configured like the real ones on mainnet: xStocks with a permanent
 * delegate and a dividend scheduled a few days out, Ondo without the delegate
 * and with a multiplier already applied. Both reserve the transfer-hook slot
 * without a program and carry their names in Token-2022 metadata.
 */
export async function createEquities(
  client: LocalClient,
  issuers: LocalIssuers,
): Promise<{ xstock: LocalEquity; ondo: LocalEquity }> {
  const now = Math.floor(Date.now() / 1000);

  const equity = async (
    authority: KeyPairSigner,
    symbol: string,
    name: string,
    decimals: number,
    extensions: (mint: Address) => ExtensionArgs[],
  ): Promise<LocalEquity> => {
    const mint = await generateKeyPairSigner();
    await client.token2022.instructions
      .createMint({
        newMint: mint,
        decimals,
        mintAuthority: authority,
        freezeAuthority: authority.address,
        extensions: [
          {
            __kind: "MetadataPointer",
            authority: authority.address,
            metadataAddress: mint.address,
          },
          {
            __kind: "TokenMetadata",
            updateAuthority: authority.address,
            mint: mint.address,
            name,
            symbol,
            uri: "",
            additionalMetadata: new Map(),
          },
          ...extensions(mint.address),
        ],
      })
      .sendTransaction();
    return { mint: mint.address, symbol, decimals };
  };

  const hookSlot = (authority: Address): ExtensionArgs => ({
    __kind: "TransferHook",
    authority,
    programId: "11111111111111111111111111111111" as Address,
  });

  const xstock = await equity(issuers.xstocks, "TSTx", "Test Apple xStock", 8, () => [
    { __kind: "PermanentDelegate", delegate: issuers.xstocks.address },
    { __kind: "PausableConfig", authority: issuers.xstocks.address, paused: false },
    hookSlot(issuers.xstocks.address),
    {
      __kind: "ScaledUiAmountConfig",
      authority: issuers.xstocks.address,
      multiplier: 1,
      newMultiplierEffectiveTimestamp: 0n,
      newMultiplier: 1,
    },
  ]);

  // Initialising the extension only sets the starting multiplier. A dividend is
  // scheduled afterwards, the way issuers do it: an update that names the new
  // multiplier and when it takes effect.
  await client.sendTransaction(
    getUpdateMultiplierScaledUiMintInstruction(
      {
        mint: xstock.mint,
        authority: issuers.xstocks,
        multiplier: 1.0035,
        effectiveTimestamp: BigInt(now + 5 * DAY),
      },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  const ondo = await equity(issuers.ondo, "TSTon", "Test Invesco QQQ (Ondo)", 9, () => [
    { __kind: "PausableConfig", authority: issuers.ondo.address, paused: false },
    hookSlot(issuers.ondo.address),
    {
      __kind: "ScaledUiAmountConfig",
      authority: issuers.ondo.address,
      multiplier: 1.004,
      newMultiplierEffectiveTimestamp: 0n,
      newMultiplier: 1.004,
    },
  ]);

  return { xstock, ondo };
}

/** Mints `amount` raw units of `equity` into `owner`'s associated account. */
export async function mintTo(
  client: LocalClient,
  issuer: KeyPairSigner,
  equity: LocalEquity,
  owner: Address,
  amount: bigint,
) {
  await client.token2022.instructions
    .mintToATA({
      mint: equity.mint,
      mintAuthority: issuer,
      owner,
      amount,
      decimals: equity.decimals,
    })
    .sendTransaction();
}
