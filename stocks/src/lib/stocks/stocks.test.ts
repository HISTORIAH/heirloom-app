import { expect, test } from "bun:test";
import type { Address } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  fetchToken,
  getApproveCheckedInstruction,
  getCloseAccountInstruction,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import {
  EXIT_FEE_BPS,
  fetchCoveredAsset,
  fetchMaybeStockPlan,
  fetchStockPlan,
  RECOVERY_FEE_BPS,
} from "@historiah/heirloom-stocks";

// The program's own litesvm harness: a client with the built program loaded,
// plus helpers for minting equities and moving the clock. It is reused rather
// than rebuilt here, because the only question this file asks is whether the
// builders below produce instructions the program accepts. Like the client's
// tests, it needs `programs/heirloom-stocks/build.sh` to have run.
import {
  calculateFee,
  createCoveredEquity,
  createTestClient,
  DEFAULT_GRACE,
  DEFAULT_INTERVAL,
  DEFAULT_PAUSE,
  fundTreasury,
  generateKeyPairSignerWithSol,
  warpSeconds,
  type LiteSvmClient,
} from "../../../../clients/heirloom-stocks/js/tests/setup";

import {
  buildCheckInIx,
  buildClosePlanIx,
  buildCoverAssetIx,
  buildGuardianDeferIx,
  buildInitializePlanIx,
  buildReapproveIxs,
  buildRecoverIx,
  buildUncoverAssetIx,
  buildUpdatePlanIx,
  buildVaultAddAssetIx,
  buildVaultClaimIx,
  buildVaultDepositIx,
  buildVaultWithdrawIx,
  fetchStockAsset,
  getAtaAddress,
  getCoveredAssetAddress,
  getPlanAddress,
  type PlanMode,
} from ".";

const TIMING = {
  checkinIntervalSecs: DEFAULT_INTERVAL,
  gracePeriodSecs: DEFAULT_GRACE,
  pauseDurationSecs: DEFAULT_PAUSE,
};

async function accountExists(client: LiteSvmClient, account: Address) {
  return (
    (await client.rpc.getAccountInfo(account, { commitment: "confirmed" }).send()).value !== null
  );
}

/** An owner with a plan in `mode` and one equity, read back as a `StockAsset`. */
async function ownerWithEquity(
  client: LiteSvmClient,
  mode: PlanMode,
  options: { tokenProgram?: Address } = {},
) {
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  await fundTreasury(client);

  await client.sendTransaction(
    await buildInitializePlanIx(owner, mode, { destination: destination.address, ...TIMING }),
  );

  const equity = await createCoveredEquity(client, {
    owner: owner.address,
    tokenProgram: options.tokenProgram,
  });
  const asset = await fetchStockAsset(client.rpc, equity.mint);

  return { owner, destination, equity, asset, plan: await getPlanAddress(owner.address, mode) };
}

// ---------------------------------------------------------------------------
// Mint reads
// ---------------------------------------------------------------------------

test("a mint's token program is read from the chain, never assumed", async () => {
  const client = await createTestClient();
  const owner = await generateKeyPairSignerWithSol(client);

  const modern = await createCoveredEquity(client, { owner: owner.address });
  const classic = await createCoveredEquity(client, {
    owner: owner.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  expect(await fetchStockAsset(client.rpc, modern.mint)).toEqual({
    mint: modern.mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    decimals: modern.decimals,
    mintAuthority: modern.mintAuthority.address,
  });
  expect((await fetchStockAsset(client.rpc, classic.mint)).tokenProgram).toBe(
    TOKEN_PROGRAM_ADDRESS,
  );
});

// ---------------------------------------------------------------------------
// Backup mode
// ---------------------------------------------------------------------------

test("backup: cover, check in, and recover through the builders", async () => {
  const client = await createTestClient();
  const { owner, destination, equity, asset, plan } = await ownerWithEquity(client, "backup");

  await client.sendTransaction(
    await buildCoverAssetIx(owner, { ...asset, mintAuthority: asset.mintAuthority! }, 10_000),
  );

  const record = await fetchCoveredAsset(
    client.rpc,
    await getCoveredAssetAddress(plan, asset.mint),
  );
  expect(record.data.sourceTokenAccount).toBe(equity.ownerAta);

  warpSeconds(client, 1_000n);
  await client.sendTransaction(
    await buildCheckInIx(owner, { owner: owner.address, mode: "backup" }),
  );
  expect((await fetchStockPlan(client.rpc, plan)).data.lastCheckinTs).toBe(
    client.svm.getClock().unixTimestamp,
  );

  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE);
  await client.sendTransaction(
    await buildRecoverIx(destination, {
      owner: owner.address,
      asset,
      sourceTokenAccount: record.data.sourceTokenAccount,
    }),
  );

  const destinationAta = await getAtaAddress(destination.address, asset.mint, asset.tokenProgram);
  expect((await fetchToken(client.rpc, destinationAta)).data.amount).toBe(
    equity.amount - calculateFee(equity.amount, BigInt(RECOVERY_FEE_BPS)),
  );
  expect(await fetchMaybeStockPlan(client.rpc, plan)).toMatchObject({ exists: false });
});

test("backup: a classic SPL Token holding goes through the same builders", async () => {
  const client = await createTestClient();
  const { owner, destination, equity, asset } = await ownerWithEquity(client, "backup", {
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  await client.sendTransaction(
    await buildCoverAssetIx(owner, { ...asset, mintAuthority: asset.mintAuthority! }, 10_000),
  );

  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE);
  await client.sendTransaction(
    await buildRecoverIx(destination, {
      owner: owner.address,
      asset,
      sourceTokenAccount: equity.ownerAta,
    }),
  );

  expect(
    await accountExists(
      client,
      await getAtaAddress(destination.address, asset.mint, TOKEN_PROGRAM_ADDRESS),
    ),
  ).toBe(true);
});

test("backup: settings, a guardian's defer, uncovering, and closing", async () => {
  const client = await createTestClient();
  const { owner, equity, asset, plan } = await ownerWithEquity(client, "backup");
  const guardian = await generateKeyPairSignerWithSol(client);

  await client.sendTransaction(
    await buildUpdatePlanIx(owner, "backup", { guardian: guardian.address }),
  );
  await client.sendTransaction(
    await buildGuardianDeferIx(guardian, { owner: owner.address, mode: "backup" }),
  );
  expect((await fetchStockPlan(client.rpc, plan)).data.pausedUntil).toBeGreaterThan(0n);

  await client.sendTransaction(
    await buildCoverAssetIx(owner, { ...asset, mintAuthority: asset.mintAuthority! }, 5_000),
  );
  await client.sendTransaction(await buildUncoverAssetIx(owner, asset, equity.ownerAta));
  await client.sendTransaction(await buildClosePlanIx(owner, "backup"));

  expect(await accountExists(client, plan)).toBe(false);
});

test("backup: an evicted holding is re-approved in one transaction and recovers again", async () => {
  const client = await createTestClient();
  const { owner, destination, equity, asset, plan } = await ownerWithEquity(client, "backup");
  const coverable = { ...asset, mintAuthority: asset.mintAuthority! };

  await client.sendTransaction(await buildCoverAssetIx(owner, coverable, 7_500));

  // Approving anything else silently replaces the plan as delegate.
  const dex = await generateKeyPairSignerWithSol(client);
  await client.sendTransaction(
    getApproveCheckedInstruction(
      {
        source: equity.ownerAta,
        mint: asset.mint,
        delegate: dex.address,
        owner,
        amount: 1n,
        decimals: asset.decimals,
      },
      { programAddress: asset.tokenProgram },
    ),
  );
  expect((await fetchToken(client.rpc, equity.ownerAta)).data.delegate).toEqual({
    __option: "Some",
    value: dex.address,
  });

  // Closing the old record and initialising its replacement at the same address
  // has to work inside one transaction.
  await client.sendTransaction(
    await buildReapproveIxs(owner, coverable, {
      sourceTokenAccount: equity.ownerAta,
      allocationBps: 7_500,
    }),
  );
  expect((await fetchToken(client.rpc, equity.ownerAta)).data.delegate).toEqual({
    __option: "Some",
    value: plan,
  });

  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE);
  await client.sendTransaction(
    await buildRecoverIx(destination, {
      owner: owner.address,
      asset,
      sourceTokenAccount: equity.ownerAta,
    }),
  );

  const gross = (equity.amount * 7_500n) / 10_000n;
  const destinationAta = await getAtaAddress(destination.address, asset.mint, asset.tokenProgram);
  expect((await fetchToken(client.rpc, destinationAta)).data.amount).toBe(
    gross - calculateFee(gross, BigInt(RECOVERY_FEE_BPS)),
  );
});

test("backup: a record whose account was closed is uncovered with no source", async () => {
  const client = await createTestClient();
  const { owner, equity, asset, plan } = await ownerWithEquity(client, "backup");

  await client.sendTransaction(
    await buildCoverAssetIx(owner, { ...asset, mintAuthority: asset.mintAuthority! }, 10_000),
  );

  // Sell everything, then close the emptied account to reclaim its rent.
  const buyer = await generateKeyPairSignerWithSol(client);
  const buyerAta = await getAtaAddress(buyer.address, asset.mint, asset.tokenProgram);
  await client.sendTransaction([
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: buyer,
      owner: buyer.address,
      mint: asset.mint,
      tokenProgram: asset.tokenProgram,
    }),
    getTransferCheckedInstruction(
      {
        source: equity.ownerAta,
        mint: asset.mint,
        destination: buyerAta,
        authority: owner,
        amount: equity.amount,
        decimals: asset.decimals,
      },
      { programAddress: asset.tokenProgram },
    ),
    getCloseAccountInstruction(
      { account: equity.ownerAta, destination: owner.address, owner },
      { programAddress: asset.tokenProgram },
    ),
  ]);

  await client.sendTransaction(await buildUncoverAssetIx(owner, asset, null));
  await client.sendTransaction(await buildClosePlanIx(owner, "backup"));
  expect(await accountExists(client, plan)).toBe(false);
});

// ---------------------------------------------------------------------------
// Vault mode
// ---------------------------------------------------------------------------

test("vault: add, top up, withdraw, and claim through the builders", async () => {
  const client = await createTestClient();
  const { owner, destination, asset, plan } = await ownerWithEquity(client, "vault");

  await client.sendTransaction(
    await buildVaultAddAssetIx(
      owner,
      { ...asset, mintAuthority: asset.mintAuthority! },
      400_000_000n,
    ),
  );
  await client.sendTransaction(await buildVaultDepositIx(owner, asset, 100_000_000n));

  const withdrawn = 50_000_000n;
  await client.sendTransaction(await buildVaultWithdrawIx(owner, asset, withdrawn));

  const ownerAta = await getAtaAddress(owner.address, asset.mint, asset.tokenProgram);
  const minted = 1_000_000_000n;
  expect((await fetchToken(client.rpc, ownerAta)).data.amount).toBe(
    minted - 500_000_000n + (withdrawn - calculateFee(withdrawn, BigInt(EXIT_FEE_BPS))),
  );

  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE);
  await client.sendTransaction(
    await buildVaultClaimIx(destination, { owner: owner.address, asset }),
  );

  const vaulted = 500_000_000n - withdrawn;
  const destinationAta = await getAtaAddress(destination.address, asset.mint, asset.tokenProgram);
  expect((await fetchToken(client.rpc, destinationAta)).data.amount).toBe(
    vaulted - calculateFee(vaulted, BigInt(RECOVERY_FEE_BPS)),
  );
  expect(await accountExists(client, plan)).toBe(false);
});
