import { expect, test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";

import {
  ANCHOR_ERROR__CONSTRAINT_DUPLICATE_MUTABLE_ACCOUNT,
  checkIn,
  closePlan,
  coverAsset,
  createCoveredEquity,
  createTestClient,
  currentTimestamp,
  DEFAULT_GRACE,
  DEFAULT_INTERVAL,
  DEFAULT_PAUSE,
  expectStocksError,
  expireBlockhash,
  generateKeyPairSignerWithSol,
  guardianDefer,
  initBackupPlan,
  initVaultPlan,
  MAX_INTERVAL_SECONDS,
  recover,
  warpSeconds,
} from "./setup";
import { fetchStockPlan } from "../src/main";
import {
  HEIRLOOM_STOCKS_ERROR__ALREADY_DEFERRED,
  HEIRLOOM_STOCKS_ERROR__DEFER_WINDOW_EXPIRED,
  HEIRLOOM_STOCKS_ERROR__INTERVAL_NEGATIVE,
  HEIRLOOM_STOCKS_ERROR__INTERVAL_TOO_LONG,
  HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE,
  HEIRLOOM_STOCKS_ERROR__PLAN_NOT_EMPTY,
  HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED,
} from "../src/generated/errors";

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

test("a backup plan and a vault plan can coexist for the same owner", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: backupIx, plan: backupPlan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  const { ix: vaultIx, plan: vaultPlan } = await initVaultPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction([backupIx, vaultIx]);

  // The mode byte is part of the seeds, so the two plans are distinct accounts.
  expect(backupPlan).not.toBe(vaultPlan);
  expect((await fetchStockPlan(client.rpc, backupPlan)).data.mode).toBe(0);
  expect((await fetchStockPlan(client.rpc, vaultPlan)).data.mode).toBe(1);
});

test("a plan records its configuration and starts the clock", async () => {
  const client = await createTestClient();
  const [owner, destination, hotWallet, guardian] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  const { ix, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    checkinSigner: hotWallet.address,
    guardian: guardian.address,
  });
  await client.sendTransaction(ix);

  const { data } = await fetchStockPlan(client.rpc, plan);
  expect(data.version).toBe(1);
  expect(data.owner).toBe(owner.address);
  expect(data.destination).toBe(destination.address);
  expect(data.checkinIntervalSecs).toBe(DEFAULT_INTERVAL);
  expect(data.gracePeriodSecs).toBe(DEFAULT_GRACE);
  expect(data.pauseDurationSecs).toBe(DEFAULT_PAUSE);
  expect(data.checkinSigner).toEqual({ __option: "Some", value: hotWallet.address });
  expect(data.guardian).toEqual({ __option: "Some", value: guardian.address });
  expect(data.coveredAssets).toBe(0);
  expect(data.lastCheckinTs).toBe(currentTimestamp(client));
  expect(data.pausedUntil).toBe(0n);
});

test("the destination cannot be the owner", async () => {
  const client = await createTestClient();
  const owner = await generateKeyPairSignerWithSol(client);

  // Otherwise the plan would be a no-op that still charged a recovery fee.
  //
  // The program carries its own `DestinationIsOwner` guard, but it never fires for
  // this input: the owner is a mutable signer and the destination is readonly, so
  // Anchor rejects the duplicate account (2040) during validation, before any
  // handler code runs. Asserting the real code keeps the test honest about which
  // layer is doing the work.
  const { ix } = await initBackupPlan({ client, owner, destination: owner.address });
  await expectStocksError(
    client.sendTransaction(ix),
    ANCHOR_ERROR__CONSTRAINT_DUPLICATE_MUTABLE_ACCOUNT,
  );

  // Nor can a live plan be retargeted at the owner afterwards.
  const destination = await generateKeyPairSigner();
  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const updateIx = await client.heirloomStocks.instructions.updatePlan({
    owner,
    plan,
    newDestination: owner.address,
    checkinIntervalSecs: null,
    gracePeriodSecs: null,
    pauseDurationSecs: null,
    clearCheckinSigner: false,
    clearGuardian: false,
  });
  await expectStocksError(
    client.sendTransaction(updateIx),
    ANCHOR_ERROR__CONSTRAINT_DUPLICATE_MUTABLE_ACCOUNT,
  );
});

test("intervals must be non-negative and within the cap", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: negativeIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    checkinIntervalSecs: -1n,
  });
  await expectStocksError(
    client.sendTransaction(negativeIx),
    HEIRLOOM_STOCKS_ERROR__INTERVAL_NEGATIVE,
  );

  const { ix: tooLongIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    gracePeriodSecs: BigInt(MAX_INTERVAL_SECONDS) + 1n,
  });
  await expectStocksError(
    client.sendTransaction(tooLongIx),
    HEIRLOOM_STOCKS_ERROR__INTERVAL_TOO_LONG,
  );
});

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

test("a delegated hot wallet can check in but nobody else can", async () => {
  const client = await createTestClient();
  const [owner, destination, hotWallet, stranger] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    checkinSigner: hotWallet.address,
  });
  await client.sendTransaction(initIx);

  warpSeconds(client, 1_000n);
  const { ix: hotIx } = await checkIn({ client, owner: owner.address, signer: hotWallet });
  await client.sendTransaction(hotIx);
  expect((await fetchStockPlan(client.rpc, plan)).data.lastCheckinTs).toBe(
    currentTimestamp(client),
  );

  const { ix: strangerIx } = await checkIn({ client, owner: owner.address, signer: stranger });
  await expectStocksError(client.sendTransaction(strangerIx), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);
});

test("a check-in clears a guardian's deferral", async () => {
  const client = await createTestClient();
  const [owner, destination, guardian] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    guardian: guardian.address,
  });
  await client.sendTransaction(initIx);

  const { ix: deferIx } = await guardianDefer({ client, owner: owner.address, guardian });
  await client.sendTransaction(deferIx);
  expect((await fetchStockPlan(client.rpc, plan)).data.pausedUntil).toBeGreaterThan(0n);

  // The owner is demonstrably back, so the guardian's extension has served its
  // purpose and should not keep the deadline pushed out.
  const { ix: checkInIx } = await checkIn({ client, owner: owner.address, signer: owner });
  await client.sendTransaction(checkInIx);
  expect((await fetchStockPlan(client.rpc, plan)).data.pausedUntil).toBe(0n);
});

// ---------------------------------------------------------------------------
// Guardian deferral
// ---------------------------------------------------------------------------

test("a guardian can push the deadline out once, and only once", async () => {
  const client = await createTestClient();
  const [owner, destination, guardian] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    guardian: guardian.address,
  });
  await client.sendTransaction(initIx);

  const { ix: deferIx } = await guardianDefer({ client, owner: owner.address, guardian });
  await client.sendTransaction(deferIx);

  expect((await fetchStockPlan(client.rpc, plan)).data.pausedUntil).toBe(
    currentTimestamp(client) + DEFAULT_PAUSE,
  );

  expireBlockhash(client);
  const { ix: secondDeferIx } = await guardianDefer({ client, owner: owner.address, guardian });
  await expectStocksError(
    client.sendTransaction(secondDeferIx),
    HEIRLOOM_STOCKS_ERROR__ALREADY_DEFERRED,
  );
});

test("a guardian cannot defer once the window has closed", async () => {
  const client = await createTestClient();
  const [owner, destination, guardian] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    guardian: guardian.address,
  });
  await client.sendTransaction(initIx);

  // Past the deadline the destination's claim takes precedence and cannot be
  // blocked by a guardian.
  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE);

  const { ix } = await guardianDefer({ client, owner: owner.address, guardian });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__DEFER_WINDOW_EXPIRED);
});

test("a deferral holds off a recovery that would otherwise be due", async () => {
  const client = await createTestClient();
  const [owner, destination, guardian] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    guardian: guardian.address,
  });
  await client.sendTransaction(initIx);

  const equity = await createCoveredEquity(client, { owner: owner.address });
  const { ix: coverIx } = await coverAsset({
    client,
    owner,
    mint: equity.mint,
    ownerTokenAccount: equity.ownerAta,
    issuer: equity.issuer,
  });
  await client.sendTransaction(coverIx);

  warpSeconds(client, DEFAULT_INTERVAL + DEFAULT_GRACE - 10n);
  const { ix: deferIx } = await guardianDefer({ client, owner: owner.address, guardian });
  await client.sendTransaction(deferIx);

  // Past the original deadline, but inside the deferral.
  warpSeconds(client, 100n);

  const { ix } = await recover({
    client,
    owner: owner.address,
    destination,
    mint: equity.mint,
    ownerTokenAccount: equity.ownerAta,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE);
});

test("only the nominated guardian can defer", async () => {
  const client = await createTestClient();
  const [owner, destination, guardian, stranger] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    guardian: guardian.address,
  });
  await client.sendTransaction(initIx);

  const { ix } = await guardianDefer({ client, owner: owner.address, guardian: stranger });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);
});

test("a plan with no guardian cannot be deferred at all", async () => {
  const client = await createTestClient();
  const [owner, destination, wouldBeGuardian] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const { ix } = await guardianDefer({
    client,
    owner: owner.address,
    guardian: wouldBeGuardian,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);
});

// ---------------------------------------------------------------------------
// Configuration changes
// ---------------------------------------------------------------------------

test("the owner can retarget the destination and rotate delegates", async () => {
  const client = await createTestClient();
  const [owner, destination, newDestination, newGuardian] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  await client.sendTransaction(
    await client.heirloomStocks.instructions.updatePlan({
      owner,
      plan,
      newDestination: newDestination.address,
      newGuardian: newGuardian.address,
      checkinIntervalSecs: 90n * 86_400n,
      gracePeriodSecs: null,
      pauseDurationSecs: null,
      clearCheckinSigner: false,
      clearGuardian: false,
    }),
  );

  const { data } = await fetchStockPlan(client.rpc, plan);
  expect(data.destination).toBe(newDestination.address);
  expect(data.guardian).toEqual({ __option: "Some", value: newGuardian.address });
  expect(data.checkinIntervalSecs).toBe(90n * 86_400n);
  // Untouched fields keep their values.
  expect(data.gracePeriodSecs).toBe(DEFAULT_GRACE);
});

test("updating settings is not a check-in", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const originalCheckin = (await fetchStockPlan(client.rpc, plan)).data.lastCheckinTs;
  warpSeconds(client, 5_000n);

  // Timing and settings are separate instructions so lengthening an interval is
  // never mistaken for proof of life.
  await client.sendTransaction(
    await client.heirloomStocks.instructions.updatePlan({
      owner,
      plan,
      checkinIntervalSecs: null,
      gracePeriodSecs: 14n * 86_400n,
      pauseDurationSecs: null,
      clearCheckinSigner: false,
      clearGuardian: false,
    }),
  );

  expect((await fetchStockPlan(client.rpc, plan)).data.lastCheckinTs).toBe(originalCheckin);
});

test("a guardian can be removed outright", async () => {
  const client = await createTestClient();
  const [owner, destination, guardian] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
    guardian: guardian.address,
  });
  await client.sendTransaction(initIx);

  await client.sendTransaction(
    await client.heirloomStocks.instructions.updatePlan({
      owner,
      plan,
      checkinIntervalSecs: null,
      gracePeriodSecs: null,
      pauseDurationSecs: null,
      clearCheckinSigner: false,
      clearGuardian: true,
    }),
  );

  expect((await fetchStockPlan(client.rpc, plan)).data.guardian).toEqual({ __option: "None" });

  const { ix } = await guardianDefer({ client, owner: owner.address, guardian });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);
});

test("only the owner can change plan settings", async () => {
  const client = await createTestClient();
  const [owner, destination, stranger] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const ix = await client.heirloomStocks.instructions.updatePlan({
    owner: stranger,
    plan,
    checkinIntervalSecs: 1n,
    gracePeriodSecs: null,
    pauseDurationSecs: null,
    clearCheckinSigner: false,
    clearGuardian: false,
  });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED);
});

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

test("an empty plan can be closed and its rent refunded", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx, plan } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const balanceBefore = (await client.rpc.getBalance(owner.address).send()).value;
  const rent = (await client.rpc.getBalance(plan).send()).value;

  const { ix } = await closePlan({ client, owner });
  await client.sendTransaction(ix);

  expect(
    (await client.rpc.getAccountInfo(plan, { commitment: "confirmed" }).send()).value,
  ).toBeNull();
  expect((await client.rpc.getBalance(owner.address).send()).value).toBeGreaterThan(balanceBefore);
  expect(rent).toBeGreaterThan(0n);
});

test("a plan with assets still covered cannot be closed", async () => {
  const client = await createTestClient();
  const [owner, destination] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSigner(),
  ]);

  const { ix: initIx } = await initBackupPlan({
    client,
    owner,
    destination: destination.address,
  });
  await client.sendTransaction(initIx);

  const equity = await createCoveredEquity(client, { owner: owner.address });
  const { ix: coverIx } = await coverAsset({
    client,
    owner,
    mint: equity.mint,
    ownerTokenAccount: equity.ownerAta,
    issuer: equity.issuer,
  });
  await client.sendTransaction(coverIx);

  // Closing now would leave the token account with a delegate whose authorising
  // account no longer exists, so the allowance could never be revoked.
  const { ix } = await closePlan({ client, owner });
  await expectStocksError(client.sendTransaction(ix), HEIRLOOM_STOCKS_ERROR__PLAN_NOT_EMPTY);
});
