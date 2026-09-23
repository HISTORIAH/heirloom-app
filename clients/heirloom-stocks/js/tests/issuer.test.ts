import { expect, test } from "bun:test";
import {
  createNoopSigner,
  generateKeyPairSigner,
  type Address,
  type ReadonlyUint8Array,
} from "@solana/kit";
import { fetchToken } from "@solana-program/token-2022";

import {
  calculateFee,
  coverAsset,
  createEquityMint,
  createTestClient,
  DEFAULT_GRACE,
  DEFAULT_INTERVAL,
  expectStocksError,
  fundTreasury,
  generateKeyPairSignerWithSol,
  initBackupPlan,
  recover,
  sendAsAdmin,
  warpSeconds,
  type LiteSvmClient,
} from "./setup";
import {
  ADMIN_ADDRESS,
  fetchIssuerRegistry,
  fetchStockPlan,
  findIssuerPda,
  RECOVERY_FEE_BPS,
} from "../src/main";
import {
  HEIRLOOM_STOCKS_ERROR__ISSUER_NOT_SUPPORTED,
  HEIRLOOM_STOCKS_ERROR__LABEL_TOO_LONG,
  HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED,
} from "../src/generated/errors";

// Every other suite forges registry entries with `seedIssuer`. These tests go
// through the real admin instructions instead.

async function registerIssuer(
  client: LiteSvmClient,
  mintAuthority: Address,
  options: { label?: string; riskTier?: number } = {},
) {
  const ix = await client.heirloomStocks.instructions.registerIssuer({
    admin: createNoopSigner(ADMIN_ADDRESS),
    mintAuthority,
    label: options.label ?? "xstocks",
    riskTier: options.riskTier ?? 2,
  });
  await sendAsAdmin(client, ix);

  const [issuer] = await findIssuerPda({ mintAuthority });
  return issuer;
}

async function updateIssuer(
  client: LiteSvmClient,
  mintAuthority: Address,
  changes: { enabled?: boolean; riskTier?: number },
) {
  const ix = await client.heirloomStocks.instructions.updateIssuer({
    admin: createNoopSigner(ADMIN_ADDRESS),
    mintAuthority,
    enabled: changes.enabled ?? null,
    riskTier: changes.riskTier ?? null,
  });
  await sendAsAdmin(client, ix);
}

function decodeLabel(label: ReadonlyUint8Array): string {
  return new TextDecoder().decode(Uint8Array.from(label)).replace(/\0+$/, "");
}

// ---------------------------------------------------------------------------
// Curation
// ---------------------------------------------------------------------------

test("the admin can register an issuer by its mint authority", async () => {
  const client = await createTestClient();
  const mintAuthority = await generateKeyPairSigner();

  const issuer = await registerIssuer(client, mintAuthority.address, {
    label: "xstocks",
    riskTier: 3,
  });

  const { data } = await fetchIssuerRegistry(client.rpc, issuer);
  expect(data.version).toBe(1);
  expect(data.mintAuthority).toBe(mintAuthority.address);
  expect(decodeLabel(data.label)).toBe("xstocks");
  expect(data.riskTier).toBe(3);
  expect(data.enabled).toBe(true);
});

test("a label longer than 16 bytes is rejected", async () => {
  const client = await createTestClient();
  const mintAuthority = await generateKeyPairSigner();

  // The label is stored in a fixed 16-byte field.
  await expectStocksError(
    registerIssuer(client, mintAuthority.address, { label: "backed-finance-xstocks" }),
    HEIRLOOM_STOCKS_ERROR__LABEL_TOO_LONG,
  );
});

test("only the admin can register or update an issuer", async () => {
  const client = await createTestClient();
  const [mintAuthority, stranger] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const registerIx = await client.heirloomStocks.instructions.registerIssuer({
    admin: stranger,
    mintAuthority: mintAuthority.address,
    label: "rogue",
    riskTier: 0,
  });
  await expectStocksError(client.sendTransaction(registerIx), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);

  await registerIssuer(client, mintAuthority.address);

  // Re-enabling or re-tiering is as sensitive as registering: either one decides
  // which assets owners are allowed to cover.
  const updateIx = await client.heirloomStocks.instructions.updateIssuer({
    admin: stranger,
    mintAuthority: mintAuthority.address,
    enabled: false,
    riskTier: null,
  });
  await expectStocksError(client.sendTransaction(updateIx), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);
});

test("one registry entry admits every mint its authority signs for", async () => {
  const client = await createTestClient();
  const [owner, destination, mintAuthority] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  // Issuers sign their whole catalogue with one mint authority, which is what
  // lets a handful of entries gate well over a thousand assets.
  const issuer = await registerIssuer(client, mintAuthority.address);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  for (let i = 0; i < 2; i++) {
    const { mint, ownerAta } = await createEquityMint(client, {
      mintAuthority,
      owner: owner.address,
    });
    const { ix } = await coverAsset({ client, owner, mint, ownerTokenAccount: ownerAta, issuer });
    await client.sendTransaction(ix);
  }

  expect((await fetchStockPlan(client.rpc, plan)).data.coveredAssets).toBe(2);
});

// ---------------------------------------------------------------------------
// Suspension
// ---------------------------------------------------------------------------

test("suspending an issuer blocks new coverage but never strands what is already covered", async () => {
  const client = await createTestClient();
  const [owner, destination, mintAuthority] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  await fundTreasury(client);

  const issuer = await registerIssuer(client, mintAuthority.address, { riskTier: 1 });

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const covered = await createEquityMint(client, { mintAuthority, owner: owner.address });
  const { ix: coverIx } = await coverAsset({
    client,
    owner,
    mint: covered.mint,
    ownerTokenAccount: covered.ownerAta,
    issuer,
  });
  await client.sendTransaction(coverIx);

  await updateIssuer(client, mintAuthority.address, { enabled: false, riskTier: 4 });

  const { data } = await fetchIssuerRegistry(client.rpc, issuer);
  expect(data.enabled).toBe(false);
  expect(data.riskTier).toBe(4);

  const uncovered = await createEquityMint(client, { mintAuthority, owner: owner.address });
  const { ix: newCoverIx } = await coverAsset({
    client,
    owner,
    mint: uncovered.mint,
    ownerTokenAccount: uncovered.ownerAta,
    issuer,
  });
  await expectStocksError(
    client.sendTransaction(newCoverIx),
    HEIRLOOM_STOCKS_ERROR__ISSUER_NOT_SUPPORTED,
  );

  // Pulling coverage out from under an owner would be the opposite of what the
  // program promises, so the asset covered before the suspension still recovers.
  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE);

  const { ix, destinationTokenAccount } = await recover({
    client,
    owner: owner.address,
    destination,
    mint: covered.mint,
    ownerTokenAccount: covered.ownerAta,
  });
  await client.sendTransaction(ix);

  expect((await fetchToken(client.rpc, destinationTokenAccount)).data.amount).toBe(
    covered.amount - calculateFee(covered.amount, BigInt(RECOVERY_FEE_BPS)),
  );
});
