/**
 * Test equities for the devnet deployment. Everything is read from and written
 * to the chain; each step prints the explorer link that shows it.
 *
 *   bun run devnet:list [--owner <address>]
 *       The test equities on devnet, and optionally what a wallet holds of each.
 *
 *   bun run devnet:create --symbol TSTNV [--name "Test NVIDIA xStock"] [--issuer xstocks|ondo]
 *                         [--decimals 8] [--to <address> ...] [--amount 25]
 *       Create a new test equity, configured like that issuer's real mints.
 *       Its issuer is already registered, so the app treats it as a stock at
 *       once. Optionally mints a starting balance to each --to.
 *
 *   bun run devnet:mint --to <address> [--to ...] [--symbol TSTx ...] [--amount 25] [--sol 0.5]
 *       Mint test equities into a wallet (all of them unless --symbol, which
 *       also takes a mint address, picks some) and optionally send it SOL for fees.
 *
 *   bun run devnet:dividend [--symbol TSTx] [--change 0.35] [--days 7]
 *       Schedule the next dividend, so the dashboard's calendar has one to show.
 *
 *   bun run devnet:seed [--to <address> ...]
 *       Register the test issuers and create TSTx and TSTon, once. Needs the
 *       program admin keypair; safe to run again.
 *
 * All of them use the Solana CLI's RPC URL and keypair unless --rpc / --keypair
 * say otherwise. See devnet/devnet.ts for where the issuer keys live.
 */
import { parseArgs } from "node:util";
import { isAddress, type Address } from "@solana/kit";
import { findIssuerPda, fetchAllMaybeIssuerRegistry } from "@historiah/heirloom-stocks";

import {
  createDevnetClient,
  createTestEquity,
  DEFAULT_AMOUNT,
  findTestEquities,
  fundWithSol,
  loadIssuerKeys,
  mintTestStock,
  pickEquity,
  scheduleTestDividend,
  seedDevnet,
  solanaCliConfig,
  type TestEquity,
} from "../devnet/devnet";
import type { IssuerStyle } from "../localnet/localnet";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    rpc: { type: "string" },
    keypair: { type: "string" },
    to: { type: "string", multiple: true, default: [] },
    owner: { type: "string" },
    symbol: { type: "string", multiple: true, default: [] },
    name: { type: "string" },
    issuer: { type: "string", default: "xstocks" },
    decimals: { type: "string" },
    amount: { type: "string" },
    sol: { type: "string" },
    change: { type: "string", default: "0.35" },
    days: { type: "string", default: "7" },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const explorer = (kind: "address" | "tx", id: string) =>
  `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;

const asAddress = (value: string, flag: string) =>
  isAddress(value) ? (value as Address) : fail(`${flag} ${value} is not a Solana address`);

const recipients = values.to.map((to) => asAddress(to, "--to"));
const amount = values.amount === undefined ? DEFAULT_AMOUNT : Number(values.amount);
if (!(amount > 0)) fail("--amount must be a positive number");

const config = await solanaCliConfig({ rpcUrl: values.rpc, keypairPath: values.keypair });
const client = await createDevnetClient(config);
console.log(
  `RPC ${config.rpcUrl.replace(/api-key=[^&]+/, "api-key=…")}, payer ${client.payer.address}\n`,
);

async function mintInto(
  to: Address[],
  equities: TestEquity[],
  issuers: Awaited<ReturnType<typeof loadIssuerKeys>>,
) {
  for (const address of to) {
    for (const equity of equities) {
      const signature = await mintTestStock(client, issuers, equity, address, amount);
      console.log(
        `minted ${amount} ${equity.symbol} to ${address}\n  ${explorer("tx", signature)}`,
      );
    }
    if (values.sol) {
      const signature = await fundWithSol(client, address, Number(values.sol));
      console.log(`sent ${values.sol} SOL to ${address}\n  ${explorer("tx", signature)}`);
    }
  }
}

function selected(equities: TestEquity[], fallback: TestEquity[]): TestEquity[] {
  if (values.symbol.length === 0) return fallback;
  return values.symbol.map(
    (query) =>
      pickEquity(equities, query) ??
      fail(
        `No test equity ${query}. On devnet: ${equities.map((e) => e.symbol).join(", ") || "none"}`,
      ),
  );
}

switch (positionals[0]) {
  case "list": {
    const issuers = await loadIssuerKeys();
    const equities = await findTestEquities(client, issuers);
    const owner = values.owner ? asAddress(values.owner, "--owner") : null;
    const registries = await Promise.all(
      (Object.keys(issuers) as IssuerStyle[]).map(
        async (style) =>
          [style, (await findIssuerPda({ mintAuthority: issuers[style].address }))[0]] as const,
      ),
    );
    const registered = await fetchAllMaybeIssuerRegistry(
      client.rpc,
      registries.map(([, registry]) => registry),
    );
    for (const [i, [style, registry]] of registries.entries()) {
      console.log(
        `issuer ${style} ${issuers[style].address}: ${registered[i]!.exists ? "registered" : "NOT registered"}\n  ${explorer("address", registry)}`,
      );
    }
    console.log();

    for (const equity of equities) {
      const { value: supply } = await client.rpc.getTokenSupply(equity.mint).send();
      let held = "";
      if (owner) {
        const { value } = await client.rpc
          .getTokenAccountsByOwner(owner, { mint: equity.mint }, { encoding: "jsonParsed" })
          .send();
        const balance = value.reduce(
          (sum, { account }) => sum + Number(account.data.parsed.info.tokenAmount.uiAmountString),
          0,
        );
        held = `, held ${balance}`;
      }
      console.log(
        `${equity.symbol.padEnd(8)} ${equity.name} (${equity.issuer}), supply ${supply.uiAmountString}${held}\n  ${explorer("address", equity.mint)}`,
      );
    }
    if (equities.length === 0) console.log("No test equities yet. Run devnet:seed.");
    break;
  }

  case "create": {
    const symbol = values.symbol[0] ?? fail("create needs --symbol");
    if (values.symbol.length > 1) fail("create makes one equity; pass one --symbol");
    if (!/^[A-Za-z0-9.]{1,10}$/.test(symbol)) fail("--symbol must be 1-10 letters, digits or dots");
    const style = values.issuer as IssuerStyle;
    if (style !== "xstocks" && style !== "ondo") fail("--issuer must be xstocks or ondo");
    const decimals =
      values.decimals === undefined ? (style === "xstocks" ? 8 : 9) : Number(values.decimals);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) fail("--decimals must be 0-9");

    const issuers = await loadIssuerKeys();
    const existing = await findTestEquities(client, issuers);
    const taken = pickEquity(existing, symbol);
    if (taken) fail(`${taken.symbol} already exists: ${taken.mint}`);

    const equity = await createTestEquity(client, issuers, style, {
      symbol,
      name: values.name ?? `Test ${symbol}`,
      decimals,
    });
    console.log(
      `created ${equity.symbol} (${equity.name}), issued by ${style}\n  ${explorer("address", equity.mint)}`,
    );
    await mintInto(recipients, [equity], issuers);
    break;
  }

  case "mint": {
    if (recipients.length === 0) fail("mint needs at least one --to <address>");
    const issuers = await loadIssuerKeys();
    const equities = await findTestEquities(client, issuers);
    if (equities.length === 0) fail("No test equities on devnet yet. Run devnet:seed first.");
    await mintInto(recipients, selected(equities, equities), issuers);
    break;
  }

  case "dividend": {
    const issuers = await loadIssuerKeys();
    const equities = await findTestEquities(client, issuers);
    const tstx = pickEquity(equities, "TSTx");
    const [equity] = selected(equities, tstx ? [tstx] : []);
    if (!equity) fail("No TSTx on devnet. Run devnet:seed, or pass --symbol.");
    const signature = await scheduleTestDividend(
      client,
      issuers,
      equity,
      Number(values.change) / 100,
      Number(values.days),
    );
    console.log(
      `scheduled +${values.change}% on ${equity.symbol} in ${values.days} days\n  ${explorer("tx", signature)}`,
    );
    break;
  }

  case "seed": {
    const equities = await seedDevnet(client);
    console.log();
    for (const equity of equities) {
      console.log(`${equity.symbol.padEnd(8)} ${explorer("address", equity.mint)}`);
    }
    const seeded = equities.filter((e) => e.symbol === "TSTx" || e.symbol === "TSTon");
    await mintInto(recipients, selected(equities, seeded), await loadIssuerKeys());
    break;
  }

  default:
    fail(
      "usage: devnet.ts list|create|mint|dividend|seed [options]. See the comment at the top of the file.",
    );
}
