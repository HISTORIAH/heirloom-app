/**
 * The app, end to end, in a real browser against a local validator.
 *
 * Starts a validator with the stocks program and two issuers' equities, serves
 * the app from the Vite dev server with the development burner wallet enabled,
 * and drives Chrome through the flows the pages exist for: backing up a stock,
 * repairing an eviction, recovering from the destination wallet, and vaulting
 * and claiming an inheritance. Each wallet gets its own browser context.
 *
 *   bun run test:e2e
 *
 * Needs the Solana CLI, a built program (`programs/heirloom-stocks/build.sh`),
 * and Google Chrome (or `CHROME_PATH`).
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  createKeyPairSignerFromPrivateKeyBytes,
  getBase58Decoder,
  lamports,
  type KeyPairSigner,
} from "@solana/kit";
import {
  fetchToken,
  getApproveCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import { chromium, type Browser, type Page } from "playwright-core";

import { buildUpdatePlanIx, getAtaAddress } from "../src/lib/stocks";
import {
  createEquities,
  createLocalClient,
  generateIssuers,
  issuerGenesis,
  mintTo,
  startValidator,
  type LocalClient,
  type LocalEquity,
  type LocalIssuers,
  type Validator,
} from "../localnet/localnet";

const STOCKS_DIR = path.resolve(import.meta.dir, "..");
const SCREENSHOTS = path.join(STOCKS_DIR, "e2e", "screenshots");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

let validator: Validator;
let client: LocalClient;
let issuers: LocalIssuers;
let xstock: LocalEquity;
let ondo: LocalEquity;
let vite: ChildProcess;
let appUrl: string;
let browser: Browser;

interface BurnerWallet {
  seed: string;
  signer: KeyPairSigner;
}

async function burner(sol = 20n): Promise<BurnerWallet> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const signer = await createKeyPairSignerFromPrivateKeyBytes(bytes);
  await client.airdrop(signer.address, lamports(sol * 1_000_000_000n));
  return { seed: getBase58Decoder().decode(bytes), signer };
}

async function startVite(rpcUrl: string, wsUrl: string): Promise<string> {
  const port = 40_000 + Math.floor(Math.random() * 10_000);
  vite = spawn(
    path.join(STOCKS_DIR, "node_modules", ".bin", "vite"),
    ["--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    {
      cwd: STOCKS_DIR,
      stdio: "ignore",
      env: {
        ...process.env,
        VITE_SOLANA_RPC_ENDPOINT: rpcUrl,
        VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT: wsUrl,
        VITE_DEV_BURNER_WALLET: "true",
      },
    },
  );
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return url;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("vite did not start");
}

beforeAll(async () => {
  issuers = await generateIssuers();
  validator = await startValidator({ accounts: await issuerGenesis(issuers) });
  client = await createLocalClient(validator);
  ({ xstock, ondo } = await createEquities(client, issuers));
  appUrl = await startVite(validator.rpcUrl, validator.wsUrl);
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  await mkdir(SCREENSHOTS, { recursive: true });
}, 180_000);

afterAll(async () => {
  await browser?.close();
  vite?.kill("SIGTERM");
  await validator?.stop();
});

/** A page signed in with `wallet`, in a browser context of its own. */
async function openAs(wallet: BurnerWallet, route: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error("[page error]", error.message));
  await page.goto(`${appUrl}${route}?burner=${wallet.seed}`);
  await page.getByRole("button", { name: "Connect Wallet" }).last().click();
  await page.getByRole("button", { name: /Heirloom Burner/ }).click();
  await expect(
    page.getByRole("button", {
      name: `${wallet.signer.address.slice(0, 6)}...${wallet.signer.address.slice(-4)}`,
    }),
  ).toBeDefined();
  return page;
}

async function toast(page: Page, title: string) {
  await page.getByText(title, { exact: true }).first().waitFor({ timeout: 60_000 });
}

async function shoot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`), fullPage: true });
}

/** Shortens a plan's timing through the owner's own key, so it lapses within seconds. */
async function lapse(owner: KeyPairSigner, mode: "backup" | "vault") {
  await client.sendTransaction(
    await buildUpdatePlanIx(owner, mode, { checkinIntervalSecs: 1n, gracePeriodSecs: 1n }),
  );
  await new Promise((r) => setTimeout(r, 3_000));
}

let owner: BurnerWallet;
let recovery: BurnerWallet;

test("an owner creates a backup plan, covers a stock, and sees it on the dashboard", async () => {
  owner = await burner();
  recovery = await burner();
  await mintTo(client, issuers.xstocks, xstock, owner.signer.address, 25n * 10n ** 8n);
  await mintTo(client, issuers.ondo, ondo, owner.signer.address, 40n * 10n ** 9n);

  const page = await openAs(owner, "/");
  await page.getByText("TSTx", { exact: true }).first().waitFor();
  await page.getByText("Test Apple xStock · xstocks").waitFor();
  await shoot(page, "01-portfolio");

  await page.getByRole("link", { name: "Protect" }).first().click();
  await page.getByLabel("Recovery wallet address").fill(recovery.signer.address);
  await page.getByRole("button", { name: "Create backup plan" }).click();
  await toast(page, "Backup plan created");

  await page.getByRole("heading", { name: "Choose what it covers" }).waitFor();
  await page.getByRole("checkbox", { name: "TSTx" }).check();
  await page.getByRole("button", { name: "Cover 1 holding" }).click();
  await toast(page, "Coverage added");
  await page.getByRole("heading", { name: "Covered" }).waitFor();
  await shoot(page, "02-protect");

  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await page.getByRole("heading", { name: "Coverage health" }).waitFor();
  await page.getByText("+0.35% on", { exact: false }).waitFor();
  await expect(await page.getByText("Covered", { exact: true }).count()).toBeGreaterThan(0);
  await shoot(page, "03-dashboard");
  await page.context().close();
}, 180_000);

test("a silent eviction shows up on the dashboard and is repaired with one approval", async () => {
  const ownerAta = await getAtaAddress(
    owner.signer.address,
    xstock.mint,
    TOKEN_2022_PROGRAM_ADDRESS,
  );
  const dex = await burner(1n);
  await client.sendTransaction(
    getApproveCheckedInstruction(
      {
        source: ownerAta,
        mint: xstock.mint,
        delegate: dex.signer.address,
        owner: owner.signer,
        amount: 1n,
        decimals: xstock.decimals,
      },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  const page = await openAs(owner, "/dashboard");
  await page
    .getByRole("heading", { name: "Coverage lost on 1 holding" })
    .waitFor({ timeout: 60_000 });
  await shoot(page, "04-evicted");

  await page.getByRole("button", { name: "Re-approve" }).click();
  await toast(page, "Coverage restored");
  await page
    .getByRole("heading", { name: "Coverage lost on 1 holding" })
    .waitFor({ state: "detached" });

  const account = await fetchToken(client.rpc, ownerAta);
  expect(account.data.delegate).toMatchObject({ __option: "Some" });
  await page.context().close();
}, 180_000);

test("the recovery wallet recovers the covered stock once the plan lapses", async () => {
  await lapse(owner.signer, "backup");

  const page = await openAs(recovery, "/recover");
  await page.getByRole("heading", { name: /Backup plan of/ }).waitFor({ timeout: 60_000 });
  await page.getByText("You receive these assets").waitFor();
  await shoot(page, "05-recover");

  await page.getByRole("button", { name: "Recover", exact: true }).click();
  await toast(page, "Recovered");

  const destinationAta = await getAtaAddress(
    recovery.signer.address,
    xstock.mint,
    TOKEN_2022_PROGRAM_ADDRESS,
  );
  const moved = 25n * 10n ** 8n;
  const fee = (moved * 75n + 9_999n) / 10_000n;
  expect((await fetchToken(client.rpc, destinationAta)).data.amount).toBe(moved - fee);
  await page.context().close();
}, 180_000);

test("an owner vaults a stock and the heir claims it once the plan lapses", async () => {
  const heir = await burner();

  const page = await openAs(owner, "/inherit");
  await page.getByLabel("Heir wallet address").fill(heir.signer.address);
  await page.getByRole("button", { name: "Create vault" }).click();
  await toast(page, "Vault created");

  await page.getByRole("heading", { name: "Add to the vault" }).waitFor();
  const stock = page.getByLabel("Stock");
  const option = await stock.locator("option", { hasText: "TSTon" }).getAttribute("value");
  await stock.selectOption(option!);
  await page.getByRole("button", { name: "Max" }).click();
  await page.getByRole("button", { name: "Add to vault" }).click();
  await toast(page, "Added to the vault");
  await page.getByRole("button", { name: "Withdraw" }).waitFor();
  await shoot(page, "06-inherit");
  await page.context().close();

  await lapse(owner.signer, "vault");

  const heirPage = await openAs(heir, "/recover");
  await heirPage.getByRole("heading", { name: /Vault of/ }).waitFor({ timeout: 60_000 });
  await heirPage.getByRole("button", { name: "Claim", exact: true }).click();
  await toast(heirPage, "Claimed");
  await shoot(heirPage, "07-claimed");

  const heirAta = await getAtaAddress(heir.signer.address, ondo.mint, TOKEN_2022_PROGRAM_ADDRESS);
  const vaulted = 40n * 10n ** 9n;
  const fee = (vaulted * 75n + 9_999n) / 10_000n;
  expect((await fetchToken(client.rpc, heirAta)).data.amount).toBe(vaulted - fee);
  await heirPage.context().close();
}, 180_000);
