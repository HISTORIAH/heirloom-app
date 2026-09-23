/**
 * Registers the curated equity issuers on a cluster.
 *
 *   bun scripts/register-issuers.ts --rpc https://api.devnet.solana.com
 *   bun scripts/register-issuers.ts --rpc <url> --keypair ~/.config/solana/admin.json --send
 *
 * Without `--send` it only reports which registry entries exist. With it, it
 * registers the missing ones, signed by `--keypair`, which must be the
 * program's `ADMIN`. Entries that already exist are never touched; change them
 * with `update_issuer` instead.
 *
 * Risk tiers follow each issuer's mint extensions as verified on mainnet:
 * xStocks can claw back (permanent delegate), pause, and freeze; Ondo can pause
 * and freeze but has no permanent delegate. Remora's extension set has not
 * been checked yet, so it is tiered conservatively — review it before sending.
 */
import { homedir } from "node:os";
import { parseArgs } from "node:util";

import { createClient, type Address } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { signerFromFile } from "@solana/kit-plugin-signer";

import {
  ADMIN_ADDRESS,
  fetchAllMaybeIssuerRegistry,
  findIssuerPda,
  heirloomStocksProgram,
  ISSUER_MINT_AUTHORITIES,
  type IssuerKey,
} from "../src/main";

const ISSUERS: Record<IssuerKey, { label: string; riskTier: number }> = {
  xstocks: { label: "xstocks", riskTier: 3 },
  ondo: { label: "ondo", riskTier: 2 },
  remora: { label: "remora", riskTier: 3 },
};

const { values } = parseArgs({
  options: {
    rpc: { type: "string" },
    keypair: { type: "string", default: "~/.config/solana/id.json" },
    send: { type: "boolean", default: false },
  },
});

if (!values.rpc) {
  console.error("usage: register-issuers.ts --rpc <url> [--keypair <path>] [--send]");
  process.exit(1);
}

const keypairPath = values.keypair!.replace(/^~(?=\/)/, homedir());
const client = await createClient()
  .use(signerFromFile(keypairPath))
  .use(solanaRpc({ rpcUrl: values.rpc }))
  .use(heirloomStocksProgram());

const entries = await Promise.all(
  (Object.keys(ISSUERS) as IssuerKey[]).map(async (key) => {
    const mintAuthority = ISSUER_MINT_AUTHORITIES[key];
    const [registry] = await findIssuerPda({ mintAuthority });
    return { key, mintAuthority, registry };
  }),
);
const accounts = await fetchAllMaybeIssuerRegistry(
  client.rpc,
  entries.map((e) => e.registry),
);

const missing: typeof entries = [];
for (const [i, entry] of entries.entries()) {
  const account = accounts[i]!;
  const state = account.exists
    ? `registered (tier ${account.data.riskTier}, ${account.data.enabled ? "enabled" : "disabled"})`
    : "missing";
  console.log(`${entry.key.padEnd(8)} ${entry.mintAuthority}  ${entry.registry}  ${state}`);
  if (!account.exists) missing.push(entry);
}

if (missing.length === 0) {
  console.log("\nAll issuers are registered.");
  process.exit(0);
}
if (!values.send) {
  console.log(`\n${missing.length} to register. Rerun with --send to register them.`);
  process.exit(0);
}
if (client.identity.address !== ADMIN_ADDRESS) {
  console.error(
    `\n${keypairPath} is ${client.identity.address}, not the program admin ${ADMIN_ADDRESS}.`,
  );
  process.exit(1);
}

for (const { key, mintAuthority } of missing) {
  const { label, riskTier } = ISSUERS[key];
  await client.heirloomStocks.instructions
    .registerIssuer({
      admin: client.identity,
      mintAuthority: mintAuthority as Address,
      label,
      riskTier,
    })
    .sendTransaction();
  console.log(`registered ${key}`);
}
