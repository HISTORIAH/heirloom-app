import { expect, test } from "bun:test";
import {
  createTestClient,
  expectHeirloomError,
  generateKeyPairSignerWithSol,
  genInitSolEstateIx,
  genDelegateDeferIx,
} from "./setup";
import { fetchEstate } from "../src/generated";
import {
  HEIRLOOM_ERROR__ALREADY_DEFERRED,
  HEIRLOOM_ERROR__DEFER_WINDOW_EXPIRED,
  HEIRLOOM_ERROR__UNAUTHORIZED,
} from "../src/generated/errors";

test("it defers an estate within the defer window", async () => {
  const client = await createTestClient();
  const [authority, heir, delegate] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 7_200n,
    delegate: delegate.address,
  });
  await client.sendTransaction(initIx);

  // Verify estate starts with the correct delegate and not paused
  const estateBefore = await fetchEstate(client.rpc, estate);
  expect(estateBefore.data.delegate).toEqual({ __option: "Some", value: delegate.address });
  expect(estateBefore.data.pausedUntil).toBe(0n);

  // Now defer the estate
  const { ix: deferIx } = await genDelegateDeferIx({
    client,
    delegate,
    authority: authority.address,
    heir: heir.address,
  });
  await client.sendTransaction(deferIx);

  // Verify estate is now paused
  const estateAfter = await fetchEstate(client.rpc, estate);
  expect(estateAfter.data.pausedUntil).toBeGreaterThan(0n);
});

test("it rejects defer from an unauthorized delegate", async () => {
  const client = await createTestClient();
  const [authority, heir, delegate, unauthorizedDelegate] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 7_200n,
    delegate: delegate.address,
  });
  await client.sendTransaction(initIx);

  // Try to defer with unauthorized delegate
  const { ix: deferIx } = await genDelegateDeferIx({
    client,
    delegate: unauthorizedDelegate,
    authority: authority.address,
    heir: heir.address,
  });

  await expectHeirloomError(client.sendTransaction(deferIx), HEIRLOOM_ERROR__UNAUTHORIZED);

  // Estate should still be unpaused
  const estateAfter = await fetchEstate(client.rpc, estate);
  expect(estateAfter.data.pausedUntil).toBe(0n);
});

test("it rejects defer when estate is already deferred", async () => {
  const client = await createTestClient();
  const [authority, heir, delegate] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 7_200n,
    delegate: delegate.address,
  });
  await client.sendTransaction(initIx);

  // First defer succeeds
  const { ix: deferIx1 } = await genDelegateDeferIx({
    client,
    delegate,
    authority: authority.address,
    heir: heir.address,
  });
  await client.sendTransaction(deferIx1);

  const estateAfterFirst = await fetchEstate(client.rpc, estate);
  expect(estateAfterFirst.data.pausedUntil).toBeGreaterThan(0n);

  // Expire blockhash so the next transaction is not a duplicate
  client.svm.expireBlockhash();

  // Second defer should fail with AlreadyDeferred
  const { ix: deferIx2 } = await genDelegateDeferIx({
    client,
    delegate,
    authority: authority.address,
    heir: heir.address,
  });

  await expectHeirloomError(client.sendTransaction(deferIx2), HEIRLOOM_ERROR__ALREADY_DEFERRED);
});

test("it rejects defer when the defer window has expired", async () => {
  const client = await createTestClient();
  const [authority, heir, delegate] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  // Set heartbeatInterval = 0 and gracePeriod = 0 so claimable_at = last_heartbeat + 0 + 0 = last_heartbeat
  // Since last_heartbeat is set to `now` at initialization, and time has passed,
  // now >= claimable_at, so the defer window is expired
  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 7_200n,
    delegate: delegate.address,
  });
  await client.sendTransaction(initIx);

  // Try to defer — should fail because defer window has expired
  const { ix: deferIx } = await genDelegateDeferIx({
    client,
    delegate,
    authority: authority.address,
    heir: heir.address,
  });

  await expectHeirloomError(client.sendTransaction(deferIx), HEIRLOOM_ERROR__DEFER_WINDOW_EXPIRED);

  // Estate should still be unpaused
  const estateAfter = await fetchEstate(client.rpc, estate);
  expect(estateAfter.data.pausedUntil).toBe(0n);
});
