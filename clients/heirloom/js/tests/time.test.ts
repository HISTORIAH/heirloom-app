import { expect, test } from "bun:test";
import {
  accountExists,
  createTestClient,
  expectHeirloomError,
  fundTreasury,
  generateKeyPairSignerWithSol,
  genClaimIx,
  genInitSolEstateIx,
  genUpdateFieldsIx,
  type LiteSvmClient,
} from "./setup";
import { fetchEstate } from "../src/generated";
import { HEIRLOOM_ERROR__NOT_YET_CLAIMABLE } from "../src/generated/errors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Warp forward by N seconds (each slot = 350ms).
//
// litesvm's `warpToSlot` only bumps `clock.slot` — it does NOT advance
// `clock.unixTimestamp`, which is what the program actually reads via
// `Clock::get()?.unix_timestamp`. So we have to set the clock directly.
// We also have to expire the blockhash: otherwise two transactions built
// from the same instructions before/after a warp hash identically and the
// second send is rejected as "already processed" instead of being replayed
// against the warped clock.
function warpSeconds(client: LiteSvmClient, seconds: bigint) {
  const slots = (seconds * 1000n) / 350n;
  const clock = client.svm.getClock();

  clock.slot += slots;
  clock.unixTimestamp += seconds;
  client.svm.setClock(clock);
  client.svm.expireBlockhash();
}

// ---------------------------------------------------------------------------
// Claim timing tests
// ---------------------------------------------------------------------------

test("claim succeeds after heartbeat interval + grace period", async () => {
  const client = await createTestClient();
  await fundTreasury(client);

  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const {
    ix: initIx,
    estate,
    vault,
  } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 3_600n,
    gracePeriod: 600n,
    pauseDuration: 0n,
  });
  await client.sendTransaction(initIx);

  const estateBefore = await fetchEstate(client.rpc, estate);
  const claimableAt = estateBefore.data.lastHeartbeat + 3_600n + 600n;

  // Warp exactly to claimable time (heartbeat + grace)
  warpSeconds(client, 4_200n);

  const { ix: claimIx } = await genClaimIx({
    client,
    authority: authority.address,
    heir,
  });
  await client.sendTransaction(claimIx);

  // SOL is the estate's only claimable asset, so a successful claim drops
  // claimableAssets to 0 and the program closes the estate/vault accounts.
  expect(await accountExists(client, estate)).toBe(false);
});

test("claim fails before grace period ends", async () => {
  const client = await createTestClient();
  await fundTreasury(client);

  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 3_600n,
    gracePeriod: 600n,
    pauseDuration: 0n,
  });
  await client.sendTransaction(initIx);

  const estateBefore = await fetchEstate(client.rpc, estate);
  const graceDeadline = estateBefore.data.lastHeartbeat + 3_600n;

  // Warp into grace period but before claimable (300s into grace)
  warpSeconds(client, 3_900n);

  const { ix: claimIx } = await genClaimIx({
    client,
    authority: authority.address,
    heir,
  });

  await expectHeirloomError(client.sendTransaction(claimIx), HEIRLOOM_ERROR__NOT_YET_CLAIMABLE);
});

test("claim fails before heartbeat interval ends", async () => {
  const client = await createTestClient();
  await fundTreasury(client);

  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 3_600n,
    gracePeriod: 600n,
    pauseDuration: 0n,
  });
  await client.sendTransaction(initIx);

  const estateBefore = await fetchEstate(client.rpc, estate);

  // Warp barely past lastHeartbeat but before grace deadline
  warpSeconds(client, 100n);

  const { ix: claimIx } = await genClaimIx({
    client,
    authority: authority.address,
    heir,
  });

  await expectHeirloomError(client.sendTransaction(claimIx), HEIRLOOM_ERROR__NOT_YET_CLAIMABLE);
});

// ---------------------------------------------------------------------------
// Heartbeat / updateField timing tests
// ---------------------------------------------------------------------------

test("heartbeat via updateField resets claim timer", async () => {
  const client = await createTestClient();
  await fundTreasury(client);

  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 3_600n,
    gracePeriod: 600n,
    pauseDuration: 0n,
  });
  await client.sendTransaction(initIx);

  const estateBefore = await fetchEstate(client.rpc, estate);
  const originalClaimableAt = estateBefore.data.lastHeartbeat + 3_600n + 600n;

  // Warp close to original claimable time
  warpSeconds(client, 3_600n + 600n - 100n);

  // Send heartbeat (empty updateField bumps lastHeartbeat)
  const { ix: heartbeatIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
  });
  await client.sendTransaction(heartbeatIx);

  const estateAfterHeartbeat = await fetchEstate(client.rpc, estate);
  const newClaimableAt = estateAfterHeartbeat.data.lastHeartbeat + 3_600n + 600n;

  // Warp past original claimable but before new claimable. This has to be
  // computed relative to the current clock rather than as a flat "+4200"
  // offset — the earlier warp already used up most of that budget, so
  // adding another full 4200s here would blow past newClaimableAt too and
  // make the "should still fail" claim below succeed instead.
  const clockAfterHeartbeat = client.svm.getClock().unixTimestamp;
  warpSeconds(client, originalClaimableAt + 50n - clockAfterHeartbeat);
  expect(client.svm.getClock().unixTimestamp).toBeLessThan(newClaimableAt);

  // Should still fail because heartbeat reset the timer
  const { ix: claimIx } = await genClaimIx({
    client,
    authority: authority.address,
    heir,
  });

  await expectHeirloomError(client.sendTransaction(claimIx), HEIRLOOM_ERROR__NOT_YET_CLAIMABLE);

  // Now warp past the NEW claimable time
  warpSeconds(client, 4_200n);
  await client.sendTransaction(claimIx);

  // SOL is the estate's only claimable asset, so a successful claim drops
  // claimableAssets to 0 and the program closes the estate/vault accounts.
  expect(await accountExists(client, estate)).toBe(false);
});

test("hbSigner heartbeat extends timer but cannot change config", async () => {
  const client = await createTestClient();
  await fundTreasury(client);

  const [authority, heir, hbSigner] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 3_600n,
    gracePeriod: 600n,
    pauseDuration: 0n,
    hbSigner: hbSigner.address,
  });
  await client.sendTransaction(initIx);

  const estateBefore = await fetchEstate(client.rpc, estate);
  const originalClaimableAt = estateBefore.data.lastHeartbeat + 3_600n + 600n;

  // Warp close to claimable
  warpSeconds(client, 3_600n + 600n - 100n);

  // hbSigner sends heartbeat and also tries to change config — the program
  // should bump lastHeartbeat but silently ignore the config fields since
  // only the authority (not hbSigner) is allowed to change them.
  const { ix: heartbeatIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    signer: hbSigner,
    gracePeriod: 9_999n,
    heartbeatInterval: 9_999n,
  });
  await client.sendTransaction(heartbeatIx);

  const estateAfterHeartbeat = await fetchEstate(client.rpc, estate);
  expect(estateAfterHeartbeat.data.lastHeartbeat).toBeGreaterThan(estateBefore.data.lastHeartbeat);
  expect(estateAfterHeartbeat.data.gracePeriod).toBe(600n);
  expect(estateAfterHeartbeat.data.heartbeatInterval).toBe(3_600n);

  const newClaimableAt = estateAfterHeartbeat.data.lastHeartbeat + 3_600n + 600n;

  // Warp past original claimable but still short of the heartbeat-reset
  // claimable time — same relative-offset pitfall as the plain-authority
  // heartbeat test above.
  const clockAfterHeartbeat = client.svm.getClock().unixTimestamp;
  warpSeconds(client, originalClaimableAt + 50n - clockAfterHeartbeat);
  expect(client.svm.getClock().unixTimestamp).toBeLessThan(newClaimableAt);

  // Claim should fail because heartbeat reset timer
  const { ix: claimIx } = await genClaimIx({
    client,
    authority: authority.address,
    heir,
  });

  await expectHeirloomError(client.sendTransaction(claimIx), HEIRLOOM_ERROR__NOT_YET_CLAIMABLE);
});

test("updateField with config changes still bumps heartbeat", async () => {
  const client = await createTestClient();
  await fundTreasury(client);

  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 3_600n,
    gracePeriod: 600n,
    pauseDuration: 0n,
  });
  await client.sendTransaction(initIx);

  const estateBefore = await fetchEstate(client.rpc, estate);
  const originalLastHeartbeat = estateBefore.data.lastHeartbeat;

  // Warp forward a bit
  warpSeconds(client, 500n);

  // Update fields with config change — should also bump heartbeat
  const { ix: updateIx } = await genUpdateFieldsIx({
    client,
    authority,
    heir: heir.address,
    gracePeriod: 1_200n,
  });
  await client.sendTransaction(updateIx);

  const estateAfter = await fetchEstate(client.rpc, estate);
  expect(estateAfter.data.lastHeartbeat).toBeGreaterThan(originalLastHeartbeat);
  expect(estateAfter.data.gracePeriod).toBe(1_200n);
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test("claim immediately after initialization with zero intervals", async () => {
  const client = await createTestClient();
  await fundTreasury(client);

  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });
  await client.sendTransaction(initIx);

  // Should be claimable immediately — no warp needed
  const { ix: claimIx } = await genClaimIx({
    client,
    authority: authority.address,
    heir,
  });
  await client.sendTransaction(claimIx);

  // SOL is the only claimable asset, so the successful claim closes the estate.
  expect(await accountExists(client, estate)).toBe(false);
});

test("multiple heartbeats push claim time back repeatedly", async () => {
  const client = await createTestClient();
  await fundTreasury(client);

  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 1_000n,
    gracePeriod: 100n,
    pauseDuration: 0n,
  });
  await client.sendTransaction(initIx);

  // Send 3 heartbeats in sequence, each pushing back claim time
  for (let i = 0; i < 3; i++) {
    const before = await fetchEstate(client.rpc, estate);
    const claimableAt = before.data.lastHeartbeat + 1_000n + 100n;

    // Warp close to claimable
    warpSeconds(client, 1_000n + 100n - 50n);

    const { ix: heartbeatIx } = await genUpdateFieldsIx({
      client,
      authority,
      heir: heir.address,
    });
    await client.sendTransaction(heartbeatIx);

    const after = await fetchEstate(client.rpc, estate);
    expect(after.data.lastHeartbeat).toBeGreaterThan(before.data.lastHeartbeat);
  }

  // Final claim should work after the last heartbeat's timer
  warpSeconds(client, 1_000n + 100n);

  const { ix: claimIx } = await genClaimIx({
    client,
    authority: authority.address,
    heir,
  });
  await client.sendTransaction(claimIx);

  // SOL is the only claimable asset, so the successful claim closes the estate.
  expect(await accountExists(client, estate)).toBe(false);
});
