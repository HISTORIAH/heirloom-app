import { expect, test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import {
  fetchToken,
  getFreezeAccountInstruction,
  getPauseInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
  type ExtensionArgs,
} from "@solana-program/token-2022";

import {
  ataFor,
  calculateFee,
  createCoveredEquity,
  createTestClient,
  DEFAULT_GRACE,
  DEFAULT_INTERVAL,
  expectStocksError,
  forcePermanentDelegate,
  fundTreasury,
  generateKeyPairSignerWithSol,
  initBackupPlan,
  initVaultPlan,
  vaultAddAsset,
  vaultClaim,
  vaultDeposit,
  vaultWithdraw,
  warpSeconds,
  type LiteSvmClient,
} from "./setup";
import {
  EXIT_FEE_BPS,
  fetchCoveredAsset,
  fetchStockPlan,
  findCoveredAssetPda,
  RECOVERY_FEE_BPS,
} from "../src/main";
import {
  HEIRLOOM_STOCKS_ERROR__ACCOUNT_FROZEN,
  HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED,
  HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE,
  HEIRLOOM_STOCKS_ERROR__PERMANENT_DELEGATE_ADDED,
  HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED,
  HEIRLOOM_STOCKS_ERROR__WRONG_PLAN_MODE,
  HEIRLOOM_STOCKS_ERROR__ZERO_AMOUNT,
} from "../src/generated/errors";

/** A vault plan holding `deposited` of one equity. */
async function fundedVault(
  client: LiteSvmClient,
  options: {
    deposited?: bigint;
    minted?: bigint;
    extensions?: ExtensionArgs[];
    withFreezeAuthority?: boolean;
  } = {},
) {
  const { deposited = 400_000_000n, minted = 1_000_000_000n } = options;

  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  await fundTreasury(client);

  const { ix: initIx, plan } = await initVaultPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const freezeAuthority = options.withFreezeAuthority
    ? await generateKeyPairSignerWithSol(client)
    : undefined;

  const equity = await createCoveredEquity(client, {
    owner: owner.address,
    amount: minted,
    extensions: options.extensions,
    ...(freezeAuthority ? { freezeAuthority: freezeAuthority.address } : {}),
  });

  const {
    ix: addIx,
    vaultAta,
    coveredAsset,
  } = await vaultAddAsset({
    client,
    owner,
    mint: equity.mint,
    ownerTokenAccount: equity.ownerAta,
    issuer: equity.issuer,
    amount: deposited,
  });
  await client.sendTransaction(addIx);

  return {
    owner,
    destination,
    plan,
    vaultAta,
    coveredAsset,
    deposited,
    minted,
    freezeAuthority,
    ...equity,
  };
}

function warpPastDeadline(client: LiteSvmClient) {
  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE);
}

// ---------------------------------------------------------------------------
// Custody
// ---------------------------------------------------------------------------

test("adding an asset escrows it in a plan-owned vault account", async () => {
  const client = await createTestClient();
  const { plan, vaultAta, ownerAta, deposited, minted } = await fundedVault(client);

  const vaultAcc = await fetchToken(client.rpc, vaultAta);
  expect(vaultAcc.data.amount).toBe(deposited);

  // Unlike backup mode, the tokens actually move and the plan PDA owns them.
  expect(vaultAcc.data.owner).toBe(plan);
  expect((await fetchToken(client.rpc, ownerAta)).data.amount).toBe(minted - deposited);
  expect((await fetchStockPlan(client.rpc, plan)).data.coveredAssets).toBe(1);
});

test("the owner can top up an existing vault asset", async () => {
  const client = await createTestClient();
  const { owner, mint, ownerAta, vaultAta, deposited } = await fundedVault(client);

  const { ix } = await vaultDeposit({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    amount: 100_000_000n,
  });
  await client.sendTransaction(ix);

  expect((await fetchToken(client.rpc, vaultAta)).data.amount).toBe(deposited + 100_000_000n);
});

test("a zero-amount deposit is rejected", async () => {
  const client = await createTestClient();
  const { owner, mint, ownerAta } = await fundedVault(client);

  const { ix } = await vaultDeposit({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    amount: 0n,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__ZERO_AMOUNT);
});

test("a backup-mode plan cannot be used to add a vault asset", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  // The mode is part of the plan's seeds, so one owner can hold both kinds at
  // once. That makes the handler's own mode check the thing standing between a
  // vault deposit and a plan that was never meant to custody anything.
  const { ix: initIx, plan: backupPlan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const equity = await createCoveredEquity(client, { owner: owner.address });
  const [coveredAsset] = await findCoveredAssetPda({ plan: backupPlan, mint: equity.mint });

  const ix = await client.heirloomStocks.instructions.vaultAddAsset({
    owner,
    mint: equity.mint,
    ownerTokenAccount: equity.ownerAta,
    vaultTokenAccount: await ataFor(backupPlan, equity.mint),
    plan: backupPlan,
    issuer: equity.issuer,
    coveredAsset,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount: 1_000n,
  });

  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__WRONG_PLAN_MODE);
});

// ---------------------------------------------------------------------------
// Owner exit
// ---------------------------------------------------------------------------

test("the owner can withdraw at any time, net of the exit fee", async () => {
  const client = await createTestClient();
  const { owner, mint, ownerAta, vaultAta, deposited, minted } = await fundedVault(client);

  const amount = 100_000_000n;
  const { ix, treasuryTokenAccount } = await vaultWithdraw({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    amount,
  });
  await client.sendTransaction(ix);

  const fee = calculateFee(amount, BigInt(EXIT_FEE_BPS));

  expect((await fetchToken(client.rpc, vaultAta)).data.amount).toBe(deposited - amount);
  expect((await fetchToken(client.rpc, ownerAta)).data.amount).toBe(
    minted - deposited + (amount - fee),
  );
  expect((await fetchToken(client.rpc, treasuryTokenAccount)).data.amount).toBe(fee);
});

test("draining the vault closes the vault account and the asset record", async () => {
  const client = await createTestClient();
  const { owner, mint, ownerAta, vaultAta, coveredAsset, plan, deposited } =
    await fundedVault(client);

  const { ix } = await vaultWithdraw({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    amount: deposited,
  });
  await client.sendTransaction(ix);

  for (const account of [vaultAta, coveredAsset]) {
    expect(
      (await client.rpc.getAccountInfo(account, { commitment: "confirmed" }).send()).value,
    ).toBeNull();
  }
  expect((await fetchStockPlan(client.rpc, plan)).data.coveredAssets).toBe(0);
});

// ---------------------------------------------------------------------------
// Inheritance
// ---------------------------------------------------------------------------

test("the destination cannot claim before the plan has lapsed", async () => {
  const client = await createTestClient();
  const { owner, destination, mint } = await fundedVault(client);

  const { ix } = await vaultClaim({ client, owner: owner.address, destination, mint });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE);
});

test("the destination can claim once the plan has lapsed", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, plan, vaultAta, coveredAsset, deposited } =
    await fundedVault(client);

  warpPastDeadline(client);

  const { ix, destinationTokenAccount, treasuryTokenAccount } = await vaultClaim({
    client,
    owner: owner.address,
    destination,
    mint,
  });
  await client.sendTransaction(ix);

  const fee = calculateFee(deposited, BigInt(RECOVERY_FEE_BPS));

  expect((await fetchToken(client.rpc, destinationTokenAccount)).data.amount).toBe(deposited - fee);
  expect((await fetchToken(client.rpc, treasuryTokenAccount)).data.amount).toBe(fee);

  // Vault drained, so the token account, record, and plan are all reclaimed.
  for (const account of [vaultAta, coveredAsset, plan]) {
    expect(
      (await client.rpc.getAccountInfo(account, { commitment: "confirmed" }).send()).value,
    ).toBeNull();
  }
});

test("a stranger cannot claim a lapsed vault", async () => {
  const client = await createTestClient();
  const { owner, mint } = await fundedVault(client);
  const stranger = await generateKeyPairSignerWithSol(client);

  warpPastDeadline(client);

  const { ix } = await vaultClaim({
    client,
    owner: owner.address,
    destination: stranger,
    mint,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);
});

test("a claim moves every deposit, top-ups included, and leaves nothing behind", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, ownerAta, vaultAta, coveredAsset, deposited } =
    await fundedVault(client);

  const topUp = 150_000_000n;
  const { ix: depositIx } = await vaultDeposit({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    amount: topUp,
  });
  await client.sendTransaction(depositIx);

  // A vault covers everything in it. Anything short of that would leave a
  // remainder in a plan-owned account that only the owner's key could reach,
  // and by the time the heir claims, that key is presumed gone.
  expect((await fetchCoveredAsset(client.rpc, coveredAsset)).data.allocationBps).toBe(10_000);

  warpPastDeadline(client);

  const { ix, destinationTokenAccount } = await vaultClaim({
    client,
    owner: owner.address,
    destination,
    mint,
  });
  await client.sendTransaction(ix);

  const gross = deposited + topUp;
  expect((await fetchToken(client.rpc, destinationTokenAccount)).data.amount).toBe(
    gross - calculateFee(gross, BigInt(RECOVERY_FEE_BPS)),
  );
  expect(
    (await client.rpc.getAccountInfo(vaultAta, { commitment: "confirmed" }).send()).value,
  ).toBeNull();
});

// ---------------------------------------------------------------------------
// Issuer actions taken after the assets were vaulted
// ---------------------------------------------------------------------------

test("while the issuer has the mint paused, neither a claim nor a withdrawal can move it", async () => {
  const client = await createTestClient();
  const pauseAuthority = await generateKeyPairSigner();

  const { owner, destination, mint, ownerAta } = await fundedVault(client, {
    extensions: [{ __kind: "PausableConfig", authority: pauseAuthority.address, paused: false }],
  });

  await client.sendTransaction(
    getPauseInstruction(
      { mint, authority: pauseAuthority },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  const { ix: withdrawIx } = await vaultWithdraw({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    amount: 1_000n,
  });
  await expectStocksError(client.sendTransaction(withdrawIx), HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED);

  warpPastDeadline(client);

  const { ix: claimIx } = await vaultClaim({ client, owner: owner.address, destination, mint });
  await expectStocksError(client.sendTransaction(claimIx), HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED);
});

test("a claim fails once the issuer freezes the vault account", async () => {
  const client = await createTestClient();
  const { owner, destination, mint, vaultAta, freezeAuthority } = await fundedVault(client, {
    withFreezeAuthority: true,
  });

  await client.sendTransaction(
    getFreezeAccountInstruction(
      { account: vaultAta, mint, owner: freezeAuthority! },
      { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
    ),
  );

  warpPastDeadline(client);

  const { ix } = await vaultClaim({ client, owner: owner.address, destination, mint });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__ACCOUNT_FROZEN);
});

test("a permanent delegate appearing stops the heir's claim but not the owner's exit", async () => {
  const client = await createTestClient();
  const clawbackAuthority = await generateKeyPairSigner();

  // The pausable config only puts the mint in the TLV layout that
  // `forcePermanentDelegate` appends to.
  const { owner, destination, mint, ownerAta, vaultAta, deposited } = await fundedVault(client, {
    extensions: [{ __kind: "PausableConfig", authority: clawbackAuthority.address, paused: false }],
  });

  await forcePermanentDelegate(client, mint, clawbackAuthority.address);

  warpPastDeadline(client);

  const { ix: claimIx } = await vaultClaim({ client, owner: owner.address, destination, mint });
  await expectStocksError(
    client.sendTransaction(claimIx),
    HEIRLOOM_STOCKS_ERROR__PERMANENT_DELEGATE_ADDED,
  );

  // Payouts to someone else refuse to proceed on shifted custody assumptions, but
  // an owner must never be trapped by a change the issuer made.
  const { ix: withdrawIx } = await vaultWithdraw({
    client,
    owner,
    mint,
    ownerTokenAccount: ownerAta,
    amount: deposited,
  });
  await client.sendTransaction(withdrawIx);

  expect(
    (await client.rpc.getAccountInfo(vaultAta, { commitment: "confirmed" }).send()).value,
  ).toBeNull();
});
