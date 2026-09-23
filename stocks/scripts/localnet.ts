/**
 * The app against a local validator, for clicking through by hand.
 *
 *   bun run localnet
 *
 * Starts a validator with the stocks program and two issuers' equities, gives
 * an owner wallet some of each, and serves the app with the development burner
 * wallet enabled. Open the printed links: each carries its wallet's key in
 * `?burner=`, so one browser profile per wallet keeps them apart. Ctrl+C stops
 * everything.
 */
import { spawn } from "node:child_process";
import path from "node:path";

import { createKeyPairSignerFromPrivateKeyBytes, getBase58Decoder, lamports } from "@solana/kit";

import {
  createEquities,
  createLocalClient,
  generateIssuers,
  issuerGenesis,
  mintTo,
  startValidator,
} from "../localnet/localnet";

const STOCKS_DIR = path.resolve(import.meta.dir, "..");
const PORT = Number(process.env.PORT ?? 5174);

const issuers = await generateIssuers();
const validator = await startValidator({ accounts: await issuerGenesis(issuers) });
const client = await createLocalClient(validator);
const { xstock, ondo } = await createEquities(client, issuers);

async function burner(label: string) {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const signer = await createKeyPairSignerFromPrivateKeyBytes(seed);
  await client.airdrop(signer.address, lamports(50n * 1_000_000_000n));
  return { label, address: signer.address, seed: getBase58Decoder().decode(seed) };
}

const owner = await burner("Owner");
const recovery = await burner("Recovery wallet");
const heir = await burner("Heir");
await mintTo(client, issuers.xstocks, xstock, owner.address, 25n * 10n ** 8n);
await mintTo(client, issuers.ondo, ondo, owner.address, 40n * 10n ** 9n);

const vite = spawn(
  path.join(STOCKS_DIR, "node_modules", ".bin", "vite"),
  ["--port", String(PORT), "--strictPort"],
  {
    cwd: STOCKS_DIR,
    stdio: ["ignore", "ignore", "inherit"],
    env: {
      ...process.env,
      VITE_SOLANA_RPC_ENDPOINT: validator.rpcUrl,
      VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT: validator.wsUrl,
      VITE_DEV_BURNER_WALLET: "true",
    },
  },
);

const url = `http://localhost:${PORT}`;
console.log(`
Local validator  ${validator.rpcUrl}
TSTx (xStocks-like, dividend scheduled)  ${xstock.mint}
TSTon (Ondo-like)                        ${ondo.mint}

Open each in its own browser profile, then Connect Wallet → Heirloom Burner:
`);
for (const wallet of [owner, recovery, heir]) {
  console.log(`  ${wallet.label.padEnd(16)} ${wallet.address}`);
  console.log(`  ${"".padEnd(16)} ${url}/?burner=${wallet.seed}\n`);
}
console.log("Ctrl+C to stop.");

const stop = async () => {
  vite.kill("SIGTERM");
  await validator.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
